import { Request, Response } from 'express';
import { WebhookEvent, Order, Ticket, Event, User, Parcel } from '../models';
import { enqueueOrGet } from '../services/webhookProcessorService';
import crypto from 'crypto';
import * as paymentService from '../services/paymentService';
import { syncParcelFromMercadoPago } from '../services/parcelledOrderService';
// REFATORADO: Removido import de reservationService - pedidos não usam mais reservas separadas
import { mapPaymentMethod } from '../services/paymentService';
import { getPaymentStatusInfo, mapPaymentStatus } from '../utils/paymentStatusMapper';
import {
    sendTicketConfirmationEmail,
    sendPaymentRejectedEmail,
    sendPaymentConfirmedEmail,
    sendPaymentPendingEmail,
} from '../services/emailTemplates';
import { generateTicketPDF } from '../services/pdfService';
import { captureControllerError } from '../utils/sentryErrorHandler';

const MAX_CARD_PAYMENT_ATTEMPTS = Number(process.env.PAYMENT_MAX_CARD_ATTEMPTS || 3);

/**
 * Valida e busca um pedido com verificações de segurança
 */
const validateAndGetOrder = async (orderId: string, userId: string, req: Request) => {
    // OTIMIZAÇÃO: Usar .select() para limitar campos e .lean() para objetos simples
    // CRÍTICO: Incluir totalAmount no select - necessário para criar pagamento
    const order = await Order.findOne({ _id: orderId, deletedAt: null })
        .select(
            'status paymentId paymentStatus customer customerData event tickets orderNumber totalAmount'
        )
        .populate('event', 'name description')
        .populate('tickets', 'ticketType')
        .populate('customer', 'name email phone cpf')
        .lean();

    if (!order) {
        throw new Error('Pedido não encontrado');
    }

    // Verificar permissão
    const isAdmin = (req as any).user?.role === 'ADMIN';
    const customerId =
        order.customer && (order.customer as any)._id
            ? (order.customer as any)._id.toString()
            : order.customer
              ? order.customer.toString()
              : null;
    const customerEmail =
        order.customer && (order.customer as any).email
            ? (order.customer as any).email
            : order.customerData?.email;
    const requestUserEmail = (req as any).user?.email;
    const isOwner =
        (customerId && customerId === String(userId)) ||
        (customerEmail &&
            requestUserEmail &&
            customerEmail.toLowerCase() === requestUserEmail.toLowerCase());

    if (!isAdmin && !isOwner) {
        throw new Error('Você não tem permissão para acessar este pedido');
    }

    // Verificar status do pedido
    if (order.status === 'paid') {
        throw new Error('Pedido já está pago');
    }

    if (order.status === 'cancelled') {
        throw new Error('Pedido cancelado não pode ser pago');
    }

    // Verificar se já existe um pagamento em andamento
    if (order.paymentId && order.status === 'pending') {
        // Verificar se o pagamento PIX expirou
        try {
            const existingPayment = (await paymentService.getPaymentById(order.paymentId)) as any;
            if (existingPayment.payment_method_id === 'pix' && existingPayment.date_of_expiration) {
                const isExpired = paymentService.isPixPaymentExpired(
                    existingPayment.date_of_expiration
                );
                if (isExpired && existingPayment.status !== 'approved') {
                    // Permitir criar novo pagamento se o anterior expirou
                    order.paymentId = undefined;
                    order.paymentStatus = undefined;
                }
            }
        } catch (error) {
            // Se não conseguir buscar, permitir criar novo pagamento
        }
    }

    return order;
};

/**
 * Cria um pagamento PIX para um pedido (Checkout Transparente)
 * POST /api/payments/:orderId/pix
 */
export const createPixPayment = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        // NOVO: Se orderId começa com "fake-", criar pedido real primeiro
        let order: any;
        let createdOrderId: string | null = null;

        if (orderId.startsWith('fake-')) {
            // Pedido fake - criar pedido real no backend
            const { cartItems, customerData, promoterCode } = req.body;

            if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do carrinho são obrigatórios para criar pedido',
                    errors: ['cartItems é obrigatório'],
                });
            }

            if (!customerData || !customerData.name || !customerData.email) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do cliente são obrigatórios',
                    errors: ['customerData.name e customerData.email são obrigatórios'],
                });
            }

            // Usar o primeiro item do carrinho para criar o pedido
            const firstItem = cartItems[0];
            if (!firstItem.eventId || !firstItem.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do carrinho inválidos',
                    errors: ['eventId e id são obrigatórios'],
                });
            }

            // Extrair transportOption do metadata dos cartItems (se houver)
            let transportOptionMetadata: any = null;
            for (const item of cartItems) {
                if (item.metadata?.transportOption) {
                    try {
                        const transportOption = typeof item.metadata.transportOption === 'string'
                            ? JSON.parse(item.metadata.transportOption)
                            : item.metadata.transportOption;
                        
                        if (transportOption.date && transportOption.attraction && transportOption.departureLocation) {
                            transportOptionMetadata = transportOption;
                            break; // Pegar o primeiro transportOption encontrado
                        }
                    } catch (e) {
                        // Ignorar erro de parsing
                    }
                }
            }

            // Criar pedido real chamando o endpoint /orders internamente
            // Usar a mesma lógica do createOrder mas de forma simplificada
            try {
                const createOrderReq = {
                    ...req,
                    body: {
                        eventId: firstItem.eventId,
                        ticketTypeId: firstItem.id,
                        quantity: firstItem.quantity,
                        customerData: {
                            name: customerData.name,
                            email: customerData.email,
                            cpf: customerData.cpf || undefined,
                            phone: customerData.phone || undefined,
                        },
                        ...(promoterCode
                            ? { promoterCode: promoterCode.toUpperCase().trim() }
                            : {}),
                        allowReuse: false, // CRÍTICO: Não reutilizar pedidos existentes ao criar a partir de pedido fake
                        // Passar transportOption para ser salvo no metadata do Order
                        transportOption: transportOptionMetadata,
                    },
                    // Garantir que socket existe para evitar erro de remoteAddress
                    socket: req.socket || { remoteAddress: req.ip || 'unknown' },
                    ip:
                        req.ip ||
                        req.socket?.remoteAddress ||
                        req.headers['x-forwarded-for'] ||
                        'unknown',
                    // Adicionar método get() para compatibilidade com Express Request
                    get: (name: string) => {
                        if (name === 'user-agent') {
                            return req.get('user-agent') || req.headers['user-agent'] || 'unknown';
                        }
                        return req.get(name) || req.headers[name.toLowerCase()] || undefined;
                    },
                } as Request;

                // Importar createOrder dinamicamente
                const { createOrder } = await import('./ordersController');

                // Criar resposta mock para capturar o resultado
                let orderResponseData: any = null;
                let orderResponseStatus = 500;

                const mockRes = {
                    status: (code: number) => {
                        orderResponseStatus = code;
                        return {
                            json: (data: any) => {
                                orderResponseData = data;
                                return mockRes;
                            },
                        };
                    },
                } as Response;

                await createOrder(createOrderReq, mockRes);
                // Aceitar tanto 200 (ingressos adicionados) quanto 201 (novo pedido criado)
                if (
                    (orderResponseStatus !== 200 && orderResponseStatus !== 201) ||
                    !orderResponseData?.success
                ) {
                    return res.status(orderResponseStatus || 500).json({
                        success: false,
                        message: orderResponseData?.message || 'Erro ao criar pedido',
                        errors: orderResponseData?.errors || ['Erro desconhecido'],
                    });
                }

                // Obter pedido criado
                const createdOrder = orderResponseData.data.order;
                createdOrderId = createdOrder._id;

                // Se há transportOption, atualizar o metadata do Order
                if (transportOptionMetadata) {
                    await Order.findByIdAndUpdate(createdOrderId, {
                        $set: { 'metadata.transportOption': transportOptionMetadata }
                    });
                }

                order = await Order.findById(createdOrderId)
                    .select(
                        'status paymentId paymentStatus customer customerData event tickets orderNumber totalAmount expiresAt metadata'
                    )
                    .populate('event', 'name description')
                    .populate('tickets', 'ticketType')
                    .populate('customer', 'name email phone cpf')
                    .lean();

                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: 'Pedido criado mas não encontrado',
                        errors: ['Erro ao buscar pedido criado'],
                    });
                }
            } catch (createError: any) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao criar pedido real',
                    errors: [createError?.message || 'Erro desconhecido'],
                });
            }
        } else {
            // Pedido real - validar e buscar normalmente
            order = await validateAndGetOrder(orderId, userId, req);
        }

        // Buscar tickets para descrição e items
        // OTIMIZAÇÃO: Usar .select() e .lean() para melhor performance
        const tickets = await Ticket.find({ _id: { $in: order.tickets } })
            .select('ticketType')
            .populate('ticketType', 'name price')
            .lean();

        const description =
            tickets
                .map(
                    (t) =>
                        `${(t as any).ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`
                )
                .join(', ') || `Pedido ${order.orderNumber}`;

        // Preparar items para additional_info (melhora taxa de aprovação)
        // Inclui todos os campos recomendados pelo Mercado Pago: id, title, description,
        // quantity, unit_price, category_id.
        const items = tickets.map((ticket) => {
            const ticketType: any = (ticket as any).ticketType;
            const ticketTypeId = ticketType?._id || ticketType;
            const title = `${ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`;
            return {
                id: ticketTypeId ? String(ticketTypeId) : undefined,
                title,
                description: `Ingresso para ${(order as any).event?.name || 'Evento'}`,
                quantity: 1,
                unit_price: ticketType?.price || 0,
                category: 'tickets', // compatibilidade interna
                category_id: 'tickets', // recomendado pelo MP
            };
        });

        // Obter Device ID do header (X-meli-session-id) ou do body
        const deviceId = (req.headers['x-meli-session-id'] as string) || req.body.deviceId;
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'DeviceId é obrigatório para criar pagamento',
                errors: ['Envie X-meli-session-id no header ou deviceId no body'],
            });
        }

        // Mock de email para sandbox
        // CRÍTICO: Verificar se estamos usando sandbox pelo access token (começa com "TEST-")
        // Não apenas pelo NODE_ENV, pois em produção na Vercel ainda pode ser sandbox
        // ⚙️ CONTROLADO POR FLAG: MP_EMAIL_MOCK_ENABLED (default: true)
        let customerEmail = order.customerData.email;
        const isSandbox =
            process.env.MP_ACCESS_TOKEN?.startsWith('TEST-') ||
            process.env.NODE_ENV !== 'production';
        const emailMockEnabled =
            (process.env.MP_EMAIL_MOCK_ENABLED || 'true').toLowerCase() === 'true';

        if (isSandbox && emailMockEnabled && !customerEmail.endsWith('@testuser.com')) {
            // Extrair o nome do email original (antes do @) e adicionar @testuser.com
            const emailName = customerEmail.split('@')[0] || 'test';
            customerEmail = `${emailName}@testuser.com`;
        }

        // Montar endereço de cobrança opcional (não persistido em banco)
        const billingAddressFromBody = (req.body && (req.body.billingAddress || req.body.billing_address)) || null;
        const billingAddress =
            billingAddressFromBody || {
                street_name: req.body?.billingStreet,
                street_number: req.body?.billingNumber,
                zip_code: req.body?.billingZip,
                city: req.body?.billingCity,
                state: req.body?.billingState,
            };

        // Criar pagamento PIX
        const pixPayment = await paymentService.createPixPayment(
            {
                orderId: String(order._id),
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                customerData: {
                    name: order.customerData.name,
                    email: customerEmail, // Email mockado para sandbox
                    cpf: order.customerData.cpf || '',
                    phone: order.customerData.phone,
                    address: billingAddress,
                },
                description,
                items,
            },
            deviceId
        );

        // Obter informações completas do status
        const statusInfo = getPaymentStatusInfo(pixPayment.status, pixPayment.statusDetail || '');

        // Atualizar pedido com informações completas do pagamento (Orders API)
        // CRÍTICO: order vem de .lean(), então não tem método .save()
        // Preparar objeto de atualização com todos os campos necessários

        // Para PIX recém-criado: sempre começar como 'pending' a menos que seja realmente 'paid'
        // Isso evita que pedidos sejam marcados como 'cancelled' prematuramente
        const isPaid = statusInfo.internalStatus === 'paid';

        // REFATORADO: Ajustar expiresAt do pedido quando criar PIX
        // Se faltar pouco tempo no expiresAt do pedido, estender para +30min a partir de agora
        const PIX_TIMEOUT_MINUTES = 30;
        const PIX_TIMEOUT_MS = PIX_TIMEOUT_MINUTES * 60 * 1000;
        const now = new Date();
        let finalExpiresAt: Date | undefined = undefined;

        if (!isPaid && pixPayment.expiresAt) {
            const pixExpiresAt = new Date(pixPayment.expiresAt);
            const orderExpiresAt = (order as any).expiresAt as Date | undefined;

            // Se o pedido tem expiresAt e falta menos de 30min, estender para +30min a partir de agora
            if (orderExpiresAt) {
                const timeRemaining = orderExpiresAt.getTime() - now.getTime();
                if (timeRemaining < PIX_TIMEOUT_MS) {
                    // Estender expiresAt do pedido para +30min a partir de agora
                    finalExpiresAt = new Date(now.getTime() + PIX_TIMEOUT_MS);
                } else {
                    // Usar o expiresAt do PIX (que pode ser maior que o do pedido)
                    finalExpiresAt = pixExpiresAt > orderExpiresAt ? pixExpiresAt : orderExpiresAt;
                }
            } else {
                // Pedido não tem expiresAt, usar o do PIX
                finalExpiresAt = pixExpiresAt;
            }
        }

        // Preparar objeto de atualização
        const updateData: any = {
            paymentId: pixPayment.paymentId,
            paymentStatus: pixPayment.status,
            paymentStatusDetail: pixPayment.statusDetail,
            paymentMessage: statusInfo.userMessage,
            paymentAdminMessage: statusInfo.adminMessage,
            paymentMethod: 'pix',
            isActive: true,
        };

        // Adicionar paymentOrderId se disponível
        if (pixPayment.orderId) {
            updateData.paymentOrderId = pixPayment.orderId;
        }

        // Adicionar status e paidAt se pago
        if (isPaid) {
            updateData.status = 'paid';
            updateData.paidAt = new Date();
        } else {
            updateData.status = 'pending';
        }

        // Adicionar expiresAt se calculado
        if (finalExpiresAt) {
            updateData.expiresAt = finalExpiresAt;
        }

        // Atualizar pedido usando findByIdAndUpdate (order vem de .lean())
        await Order.findByIdAndUpdate(order._id, updateData, { new: true });

        // REFATORADO: Não criar reservas separadas - o pedido PENDING já funciona como reserva
        // O pedido já tem expiresAt ajustado acima e bloqueia estoque (soldQuantity++)
        // Removida toda lógica de criação/atualização de reservas vinculadas a pedidos

        // Enviar email de pagamento pendente (não bloquear resposta se falhar)
        try {
            const populatedOrder = await Order.findById(order._id)
                .populate('event', 'name date location address')
                .populate('customer', 'name email')
                .lean();

            if (populatedOrder) {
                const event = populatedOrder.event as any;
                const customerData = populatedOrder.customerData as any;
                const customer = populatedOrder.customer as any;

                const customerEmail = customerData?.email || customer?.email;
                const customerName = customerData?.name || customer?.name;

                if (customerEmail && customerEmail !== 'Não informado') {
                    const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    });

                    const frontendUrl =
                        process.env.FRONTEND_URL ||
                        process.env.DASHBOARD_URL ||
                        'http://localhost:3000';
                    await sendPaymentPendingEmail(customerEmail, {
                        customerName: customerName || 'Cliente',
                        orderNumber: order.orderNumber,
                        eventName: event.name,
                        eventDate,
                        eventLocation: event.location,
                        totalAmount: `R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`,
                        paymentMethod: 'PIX',
                        expirationMinutes: pixPayment.expirationMinutes || 15,
                        // QR code em imagem (base64 se disponível)
                        pixQrCode: pixPayment.qrCodeBase64
                            ? `data:image/png;base64,${pixPayment.qrCodeBase64}`
                            : pixPayment.qrCode,
                        // Código PIX para copiar/colar deve ser o qrCode "bruto", não o ticket_url
                        pixCode: pixPayment.qrCode || pixPayment.ticketUrl || null,
                        paymentLink: `${frontendUrl}/dashboard`,
                    });
                }
            }
        } catch (emailError) {
            // Não falhar a criação do pagamento se o email falhar
        }

        // Buscar pedido atualizado para retornar na resposta
        const updatedOrder = await Order.findById(order._id)
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price',
                match: { deletedAt: null },
            })
            .lean();

        return res.json({
            success: true,
            data: {
                paymentId: pixPayment.paymentId,
                qrCode: pixPayment.qrCode,
                qrCodeBase64: pixPayment.qrCodeBase64,
                ticketUrl: pixPayment.ticketUrl,
                expiresAt: pixPayment.expiresAt,
                expirationMinutes: pixPayment.expirationMinutes,
                status: pixPayment.status,
                statusDetail: pixPayment.statusDetail,
                // Informações completas do status
                statusInfo: {
                    userMessage: statusInfo.userMessage,
                    adminMessage: statusInfo.adminMessage,
                    color: statusInfo.color,
                    requiresAction: statusInfo.requiresAction,
                    canRetry: statusInfo.canRetry,
                    internalStatus: statusInfo.internalStatus,
                },
                // CRÍTICO: Retornar pedido atualizado para que apareça na lista de pedidos
                order: updatedOrder
                    ? {
                          ...updatedOrder,
                          tickets: (updatedOrder.tickets || []).map((ticket: any) => ({
                              ...ticket,
                              qrCode: updatedOrder.status === 'paid' ? ticket.qrCode : null, // Só retorna QR code se pedido estiver pago
                          })),
                      }
                    : null,
                // NOVO: Retornar orderId real se foi criado a partir de pedido fake
                createdOrderId: createdOrderId || undefined,
                // REFATORADO: Não retornar reserva - o pedido já contém todas as informações necessárias (expiresAt)
            },
        });
    } catch (error: any) {
        // Capturar erro no Sentry
        captureControllerError(error, req, {
            controller: 'paymentController',
            action: 'createPixPayment',
            statusCode: 500,
            extra: {
                orderId: req.params?.orderId,
            },
        });

        // Extrair informações detalhadas do erro do Mercado Pago
        let errorDetails: any = null;
        let errorMessage = error.message || 'Erro ao criar pagamento PIX';

        // Se o erro tem informações estruturadas do Mercado Pago
        if (error.errors && Array.isArray(error.errors)) {
            errorDetails = {
                code: error.errors[0]?.code,
                message: error.errors[0]?.message,
                details:
                    error.errors[0]?.details || error.errors.map((e: any) => e.message || e.code),
            };
            errorMessage = error.errors[0]?.message || errorMessage;
        } else if (error.response?.data?.errors) {
            errorDetails = {
                code: error.response.data.errors[0]?.code,
                message: error.response.data.errors[0]?.message,
                details:
                    error.response.data.errors[0]?.details ||
                    error.response.data.errors.map((e: any) => e.message || e.code),
            };
            errorMessage = error.response.data.errors[0]?.message || errorMessage;
        }

        return res.status(400).json({
            success: false,
            message: errorMessage,
            errors: errorDetails ? [errorDetails.message] : [errorMessage],
            errorDetails: errorDetails, // Incluir detalhes completos do erro
        });
    }
};

/**
 * Cria um pagamento com cartão de crédito/débito (Checkout Transparente)
 * POST /api/payments/:orderId/card
 *
 * Body esperado:
 * {
 *   "token": "abc123...", // Token gerado pelo MercadoPago.js no frontend
 *   "installments": 1,
 *   "paymentMethodId": "visa",
 *   "issuerId": "123" // Opcional
 * }
 */
export const createCardPayment = async (req: Request, res: Response) => {
    let order: any = null;
    let currentAttempts = 0;
    let createdOrderId: string | null = null;

    try {
        const { orderId } = req.params;
        const { token, installments, paymentMethodId, issuerId, cardholder } = req.body;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        // Validações básicas
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token do cartão é obrigatório',
                errors: ['Token é obrigatório'],
            });
        }

        if (!paymentMethodId) {
            return res.status(400).json({
                success: false,
                message: 'Método de pagamento é obrigatório',
                errors: ['paymentMethodId é obrigatório'],
            });
        }

        // Capturar endereço de cobrança enviado pelo frontend (não persistido em banco)
        const billingAddressFromBody =
            (req.body && (req.body.billingAddress || req.body.billing_address)) || null;
        const billingAddress =
            billingAddressFromBody || {
                street_name: req.body?.billingStreet,
                street_number: req.body?.billingNumber,
                zip_code: req.body?.billingZip,
                city: req.body?.billingCity,
                state: req.body?.billingState,
            };

        // NOVO: Se orderId começa com "fake-", criar pedido real primeiro
        if (orderId.startsWith('fake-')) {
            // Pedido fake - criar pedido real no backend
            const { cartItems, customerData, promoterCode } = req.body;

            if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do carrinho são obrigatórios para criar pedido',
                    errors: ['cartItems é obrigatório'],
                });
            }

            if (!customerData || !customerData.name || !customerData.email) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do cliente são obrigatórios',
                    errors: ['customerData.name e customerData.email são obrigatórios'],
                });
            }

            // Usar o primeiro item do carrinho para criar o pedido
            const firstItem = cartItems[0];
            if (!firstItem.eventId || !firstItem.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do carrinho inválidos',
                    errors: ['eventId e id são obrigatórios'],
                });
            }

            // Extrair transportOption do metadata dos cartItems (se houver)
            let transportOptionMetadata: any = null;
            for (const item of cartItems) {
                if (item.metadata?.transportOption) {
                    try {
                        const transportOption = typeof item.metadata.transportOption === 'string'
                            ? JSON.parse(item.metadata.transportOption)
                            : item.metadata.transportOption;
                        
                        if (transportOption.date && transportOption.attraction && transportOption.departureLocation) {
                            transportOptionMetadata = transportOption;
                            break; // Pegar o primeiro transportOption encontrado
                        }
                    } catch (e) {
                        // Ignorar erro de parsing
                    }
                }
            }

            // Criar pedido real chamando o endpoint /orders internamente
            try {
                const createOrderReq = {
                    ...req,
                    body: {
                        eventId: firstItem.eventId,
                        ticketTypeId: firstItem.id,
                        quantity: firstItem.quantity,
                        customerData: {
                            name: customerData.name,
                            email: customerData.email,
                            cpf: customerData.cpf || undefined,
                            phone: customerData.phone || undefined,
                            // endereço de cobrança não é persistido em Order por padrão
                        },
                        ...(promoterCode
                            ? { promoterCode: promoterCode.toUpperCase().trim() }
                            : {}),
                        allowReuse: false, // CRÍTICO: Não reutilizar pedidos existentes ao criar a partir de pedido fake
                        // Passar transportOption para ser salvo no metadata do Order
                        transportOption: transportOptionMetadata,
                    },
                    // Garantir que socket existe para evitar erro de remoteAddress
                    socket: req.socket || { remoteAddress: req.ip || 'unknown' },
                    ip:
                        req.ip ||
                        req.socket?.remoteAddress ||
                        req.headers['x-forwarded-for'] ||
                        'unknown',
                    // Adicionar método get() para compatibilidade com Express Request
                    get: (name: string) => {
                        if (name === 'user-agent') {
                            return req.get('user-agent') || req.headers['user-agent'] || 'unknown';
                        }
                        return req.get(name) || req.headers[name.toLowerCase()] || undefined;
                    },
                } as Request;

                // Importar createOrder dinamicamente
                const { createOrder } = await import('./ordersController');

                // Criar resposta mock para capturar o resultado
                let orderResponseData: any = null;
                let orderResponseStatus = 500;

                const mockRes = {
                    status: (code: number) => {
                        orderResponseStatus = code;
                        return {
                            json: (data: any) => {
                                orderResponseData = data;
                                return mockRes;
                            },
                        };
                    },
                } as Response;

                await createOrder(createOrderReq, mockRes);
                // Aceitar tanto 200 (ingressos adicionados) quanto 201 (novo pedido criado)
                if (
                    (orderResponseStatus !== 200 && orderResponseStatus !== 201) ||
                    !orderResponseData?.success
                ) {
                    return res.status(orderResponseStatus || 500).json({
                        success: false,
                        message: orderResponseData?.message || 'Erro ao criar pedido',
                        errors: orderResponseData?.errors || ['Erro desconhecido'],
                    });
                }

                // Obter pedido criado
                const createdOrder = orderResponseData.data.order;
                createdOrderId = createdOrder._id;

                // Se há transportOption, atualizar o metadata do Order
                if (transportOptionMetadata) {
                    await Order.findByIdAndUpdate(createdOrderId, {
                        $set: { 'metadata.transportOption': transportOptionMetadata }
                    });
                }

                order = await Order.findById(createdOrderId)
                    .select(
                        'status paymentId paymentStatus customer customerData event tickets orderNumber totalAmount expiresAt cardAttempts metadata'
                    )
                    .populate('event', 'name description')
                    .populate('tickets', 'ticketType')
                    .populate('customer', 'name email phone cpf')
                    .lean();

                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: 'Pedido criado mas não encontrado',
                        errors: ['Erro ao buscar pedido criado'],
                    });
                }
            } catch (createError: any) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao criar pedido real',
                    errors: [createError?.message || 'Erro desconhecido'],
                });
            }
        } else {
            // Validar e buscar pedido
            // IMPORTANTE: precisamos de um documento Mongoose real (sem .lean())
            // para poder usar .save() com segurança neste fluxo.
            order = await validateAndGetOrder(orderId, userId, req);
        }

        // Buscar tickets para descrição e items
        // OTIMIZAÇÃO: Usar .select() e .lean() para melhor performance
        const tickets = await Ticket.find({ _id: { $in: order.tickets } })
            .select('ticketType')
            .populate('ticketType', 'name price')
            .lean();

        const description =
            tickets
                .map(
                    (t) =>
                        `${(t as any).ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`
                )
                .join(', ') || `Pedido ${order.orderNumber}`;

        // Preparar items para additional_info (melhora taxa de aprovação)
        const items = tickets.map((ticket) => {
            const ticketType: any = (ticket as any).ticketType;
            const ticketTypeId = ticketType?._id || ticketType;
            const title = `${ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`;
            return {
                id: ticketTypeId ? String(ticketTypeId) : undefined,
                title,
                description: `Ingresso para ${(order as any).event?.name || 'Evento'}`,
                quantity: 1,
                unit_price: ticketType?.price || 0,
                category: 'tickets',
                category_id: 'tickets',
            };
        });

        // Obter Device ID do header (X-meli-session-id) ou do body
        const deviceId = (req.headers['x-meli-session-id'] as string) || req.body.deviceId;
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'DeviceId é obrigatório para criar pagamento',
                errors: ['Envie X-meli-session-id no header ou deviceId no body'],
            });
        }

        // Mock de email para sandbox
        // CRÍTICO: Verificar se estamos usando sandbox por múltiplos métodos:
        // 1. Variável de ambiente MP_SANDBOX=true (forçar sandbox)
        // 2. Token começa com "TEST-" (token de teste do MP)
        // 3. NODE_ENV !== 'production' (ambiente de desenvolvimento)
        // ⚙️ CONTROLADO POR FLAG: MP_EMAIL_MOCK_ENABLED (default: true)
        let customerEmail = order.customerData.email;
        const forceSandbox = process.env.MP_SANDBOX === 'true' || process.env.MP_SANDBOX === '1';
        const isSandbox =
            forceSandbox ||
            process.env.MP_ACCESS_TOKEN?.startsWith('TEST-') ||
            process.env.NODE_ENV !== 'production';
        const emailMockEnabled =
            (process.env.MP_EMAIL_MOCK_ENABLED || 'true').toLowerCase() === 'true';

        if (isSandbox && emailMockEnabled && !customerEmail.endsWith('@testuser.com')) {
            // Extrair o nome do email original (antes do @) e adicionar @testuser.com
            const emailName = customerEmail.split('@')[0] || 'test';
            customerEmail = `${emailName}@testuser.com`;
        }

        // Normalizar cardholder para sandbox
        let normalizedCardholder = cardholder
            ? {
                  name: cardholder.name,
                  email: cardholder.email,
                  identification: cardholder.identification
                      ? {
                            type: cardholder.identification.type,
                            number: cardholder.identification.number,
                        }
                      : undefined,
              }
            : undefined;

        // Reutilizar isSandbox já declarado acima
        if (isSandbox && emailMockEnabled) {
            if (
                normalizedCardholder?.email &&
                !normalizedCardholder.email.endsWith('@testuser.com')
            ) {
                const emailName = normalizedCardholder.email.split('@')[0] || 'cardholder';
                normalizedCardholder = {
                    ...normalizedCardholder,
                    email: `${emailName}@testuser.com`,
                };
            }
        }

        // Verificar limite de tentativas de cartão
        // IMPORTANTE: Verificar ANTES de processar para evitar processar quando já excedeu
        currentAttempts = order.cardAttempts || 0;
        if (currentAttempts >= MAX_CARD_PAYMENT_ATTEMPTS) {
            order.status = 'failed';
            order.paymentStatus = 'failed';
            order.paymentStatusDetail = 'max_attempts';
            order.paymentMessage = 'Você excedeu o número máximo de tentativas para este pedido.';
            order.paymentAdminMessage = 'Limite de tentativas excedido (cartão).';
            order.isActive = false;
            await Order.findByIdAndUpdate(
                order._id,
                {
                    $set: {
                        status: order.status,
                        paymentStatus: order.paymentStatus,
                        paymentStatusDetail: order.paymentStatusDetail,
                        paymentMessage: order.paymentMessage,
                        paymentAdminMessage: order.paymentAdminMessage,
                        isActive: order.isActive,
                    },
                },
                { new: true }
            );

            // Devolver ingressos ao estoque quando limite de tentativas é excedido
            if (order.ticketType && order.totalTickets > 0) {
                const TicketType = require('../models/TicketType').default;
                const ticketType = await TicketType.findById(order.ticketType);
                if (ticketType) {
                    ticketType.soldQuantity = Math.max(
                        0,
                        (ticketType.soldQuantity || 0) - order.totalTickets
                    );
                    await ticketType.save();
                }
            }

            return res.status(429).json({
                success: false,
                message:
                    'Você excedeu o número máximo de tentativas para este pedido. Inicie um novo pedido para tentar novamente.',
                errors: [
                    'Você excedeu o número máximo de tentativas para este pedido. Inicie um novo pedido.',
                ],
                cardAttempts: order.cardAttempts,
                maxCardAttempts: MAX_CARD_PAYMENT_ATTEMPTS,
            });
        }

        // Criar pagamento com cartão
        const cardPayment: any = await paymentService.createCardPayment(
            {
                orderId: String(order._id),
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                token,
                description,
                installments: installments || 1,
                paymentMethodId,
                issuerId,
                cardholder: normalizedCardholder,
                items,
                customerData: {
                    name: order.customerData.name,
                    email: customerEmail, // Email mockado para sandbox
                    cpf: order.customerData.cpf || '',
                    phone: order.customerData.phone,
                    address: billingAddress,
                },
            },
            deviceId
        );

        // Obter informações completas do status
        const statusInfo = getPaymentStatusInfo(cardPayment.status, cardPayment.statusDetail || '');
        const paymentStatus = statusInfo.internalStatus;
        const paymentMethod = mapPaymentMethod(
            cardPayment.paymentTypeId || 'credit_card',
            cardPayment.paymentMethodId
        );

        // Atualizar pedido com informações completas
        // REGRA: MP é a fonte de verdade única - seguir o status do MP imediatamente
        const baseOrderUpdate: any = {
            paymentId: cardPayment.paymentId,
            paymentStatus: cardPayment.status,
            paymentStatusDetail: cardPayment.statusDetail,
            paymentMessage: statusInfo.userMessage,
            paymentAdminMessage: statusInfo.adminMessage,
            paymentMethod,
        };

        // Seguir o status do MP imediatamente (100% alinhamento)
        if (paymentStatus === 'paid') {
            Object.assign(baseOrderUpdate, {
                status: 'paid',
                paidAt: cardPayment.dateApproved ? new Date(cardPayment.dateApproved) : new Date(),
                isActive: true,
                cardAttempts: 0,
            });

            // CRÍTICO: Confirmar APENAS tickets deste pedido específico
            // NUNCA confirmar tickets de outros pedidos, mesmo que sejam do mesmo cliente
            // IMPORTANTE: NÃO usar .lean() aqui, pois precisamos das instâncias do Mongoose para chamar .save()
            const tickets = await Ticket.find({
                _id: { $in: order.tickets },
                order: order._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                deletedAt: null,
            }).select('_id code qrCode status ticketType holder price order');

            for (const ticket of tickets) {
                // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                if (String(ticket.order) !== String(order._id)) {continue;
                }

                if (ticket.status === 'pending') {
                    ticket.status = 'confirmed';
                    // Gerar QR code se ainda não tiver
                    if (!ticket.qrCode) {
                        const { generateQRCode } = await import('../services/qrCodeService');
                        ticket.qrCode = await generateQRCode(ticket.code);
                    }
                    await ticket.save();
                }
            }
        } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
            // Se o MP cancelou/falhou, seguir o MP imediatamente
            Object.assign(baseOrderUpdate, {
                status: 'cancelled',
                isActive: false,
            });
            // Incrementar tentativas apenas se falhou (não se foi cancelado manualmente)
            if (paymentStatus === 'failed') {
                const previousAttempts = order.cardAttempts || 0;
                const newAttempts = previousAttempts + 1;
                Object.assign(baseOrderUpdate, {
                    cardAttempts: newAttempts,
                });
            }
        } else {
            // processing, pending, etc - manter como pending
            Object.assign(baseOrderUpdate, {
                status: 'pending',
            });
        }

        await Order.findByIdAndUpdate(order._id, { $set: baseOrderUpdate }, { new: true });

        return res.json({
            success: true,
            data: {
                paymentId: cardPayment.paymentId,
                status: cardPayment.status,
                statusDetail: cardPayment.statusDetail,
                paymentMethod,
                transactionAmount: cardPayment.transactionAmount,
                installments: cardPayment.installments,
                dateApproved: cardPayment.dateApproved,
                // Informações completas do status
                statusInfo: {
                    userMessage: statusInfo.userMessage,
                    adminMessage: statusInfo.adminMessage,
                    color: statusInfo.color,
                    requiresAction: statusInfo.requiresAction,
                    canRetry: statusInfo.canRetry,
                    internalStatus: statusInfo.internalStatus,
                },
                // Se precisar de 3D Secure, retornar informações
                threeDSInfo: cardPayment.threeDSInfo,
                // NOVO: Retornar orderId real se foi criado a partir de pedido fake
                createdOrderId: createdOrderId || undefined,
            },
        });
    } catch (error: any) {
        // Capturar erro no Sentry
        captureControllerError(error, req, {
            controller: 'paymentController',
            action: 'createCardPayment',
            statusCode: 500,
            extra: {
                orderId: req.params?.orderId,
                hasToken: !!req.body?.token,
            },
        });

        // Extrair informações detalhadas do erro do Mercado Pago
        let errorDetails: any = null;
        let errorMessage = error.message || 'Erro ao processar pagamento com cartão';
        let messages: string[] = [];

        if (Array.isArray(error.mpErrors) && error.mpErrors.length > 0) {
            messages = error.mpErrors.map((msg: any) => String(msg));
            errorMessage = messages[0];
        }

        const responseData = error.response?.data;

        if (!messages.length && Array.isArray(responseData?.errors)) {
            messages = responseData.errors.map((msg: any) => String(msg)).filter(Boolean);
            if (messages.length) {
                errorMessage = messages[0];
            }
        }

        // Se o erro tem informações estruturadas do Mercado Pago
        if (error.errors && Array.isArray(error.errors)) {
            errorDetails = {
                code: error.errors[0]?.code,
                message: error.errors[0]?.message,
                details:
                    error.errors[0]?.details || error.errors.map((e: any) => e.message || e.code),
            };
            if (!messages.length) {
                errorMessage = error.errors[0]?.message || errorMessage;
                messages = error.errors.map((e: any) => e.message || e.code).filter(Boolean);
            }
        } else if (responseData?.errors) {
            errorDetails = {
                code: responseData.errors[0]?.code,
                message: responseData.errors[0]?.message,
                details:
                    responseData.errors[0]?.details ||
                    responseData.errors.map((e: any) => e.message || e.code),
            };
            if (!messages.length) {
                errorMessage = responseData.errors[0]?.message || errorMessage;
                messages = responseData.errors.map((e: any) => e.message || e.code).filter(Boolean);
            }
        } else if (responseData) {
            errorDetails = responseData;
        }

        const friendlyMessages: string[] = [];
        const appendFriendly = (msg: string) => {
            if (!msg) return;
            friendlyMessages.push(msg);
        };

        const interpretMessage = (msg: string) => {
            const normalized = msg.toLowerCase().trim();
            
            // Filtrar mensagens em inglês genéricas que não devem ser exibidas
            const englishGenericMessages = [
                'the following transactions failed',
                '^failed$',
                '^transaction failed$',
                '^payment failed$',
            ];
            
            for (const pattern of englishGenericMessages) {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(normalized)) {
                    return true; // Ignorar essa mensagem
                }
            }

            // Extrair status_detail de mensagens no formato "PAYMENT_ID: status_detail"
            // Exemplo: "PAY01KBK0TMEC6PVYX9RRH72F4VEM: high_risk"
            // O payment ID do MP geralmente começa com PAY e tem ~30 caracteres
            const paymentIdPattern = /^[a-z0-9]{15,}:\s*([a-z_0-9]+)$/i;
            const paymentIdMatch = normalized.match(paymentIdPattern);
            if (paymentIdMatch && paymentIdMatch[1]) {
                const statusDetail = paymentIdMatch[1].trim();
                // Usar o paymentStatusMapper para obter mensagem traduzida
                // Tentar primeiro com status "failed"
                let statusInfo = getPaymentStatusInfo('failed', statusDetail);
                // Se não encontrou ou é mensagem genérica, tentar com "rejected"
                if (!statusInfo || statusInfo.userMessage.includes('Status desconhecido') || statusInfo.userMessage.includes(statusDetail)) {
                    statusInfo = getPaymentStatusInfo('rejected', statusDetail);
                }
                
                // Se encontrou uma mensagem traduzida válida, usar ela
                if (statusInfo && statusInfo.userMessage && 
                    !statusInfo.userMessage.includes('Status desconhecido') &&
                    !statusInfo.userMessage.toLowerCase().includes(statusDetail.toLowerCase())) {
                    appendFriendly(statusInfo.userMessage);
                    return true;
                }
            }
            
            // Tentar extrair status_detail diretamente da string (caso o regex não tenha capturado)
            // Buscar por padrões conhecidos de status_detail na mensagem
            const directStatusMatch = normalized.match(/:\s*([a-z_0-9]+)$/i);
            if (directStatusMatch && directStatusMatch[1]) {
                const statusDetail = directStatusMatch[1].trim();
                if (statusDetail.length > 3 && statusDetail !== 'failed') { // Ignorar "failed" genérico
                    let statusInfo = getPaymentStatusInfo('failed', statusDetail);
                    if (!statusInfo || statusInfo.userMessage.includes('Status desconhecido')) {
                        statusInfo = getPaymentStatusInfo('rejected', statusDetail);
                    }
                    if (statusInfo && statusInfo.userMessage && 
                        !statusInfo.userMessage.includes('Status desconhecido') &&
                        !statusInfo.userMessage.toLowerCase().includes(statusDetail.toLowerCase())) {
                        appendFriendly(statusInfo.userMessage);
                        return true;
                    }
                }
            }

            // Tentar extrair status_detail de outras formas
            // Verificar se a mensagem contém algum status_detail conhecido
            const knownStatusDetails = [
                'high_risk', 'rejected_by_issuer', 'insufficient_amount', 
                'bad_filled_card_data', 'invalid_card_token', 'max_attempts_exceeded',
                'card_disabled', 'required_call_for_authorize', 'processing_error',
                'invalid_installments', 'pending_challenge', '3ds_challenge_expired',
                '3ds_challenge_failed', 'cc_rejected_high_risk', 'cc_rejected_insufficient_amount'
            ];
            
            for (const statusDetail of knownStatusDetails) {
                if (normalized.includes(statusDetail)) {
                    const statusInfo = getPaymentStatusInfo('failed', statusDetail);
                    appendFriendly(statusInfo.userMessage);
                    return true;
                }
            }

            // Casos específicos conhecidos
            if (normalized.includes('rejected_by_issuer')) {
                appendFriendly(
                    'Transação recusada pelo emissor do cartão. Entre em contato com o banco ou utilize outro cartão.'
                );
                return true;
            }
            if (normalized.includes('invalid_email_for_sandbox')) {
                appendFriendly(
                    'Em sandbox, utilize um e-mail terminando em @testuser.com para o titular do cartão.'
                );
                return true;
            }
            
            return false;
        };

        messages.forEach((msg) => {
            if (!interpretMessage(msg)) {
                // Se não foi interpretado, verificar se é uma mensagem que deve ser ignorada
                const normalized = msg.toLowerCase().trim();
                const shouldIgnore = [
                    'the following transactions failed',
                    'failed',
                    'transaction failed',
                    'payment failed',
                ].some(pattern => normalized === pattern);
                
                if (!shouldIgnore) {
                    // Tentar ver se contém algum padrão de payment ID que podemos ignorar
                    const isPaymentIdPattern = /^[a-z0-9]{20,}:/.test(normalized);
                    if (!isPaymentIdPattern) {
                        appendFriendly(msg);
                    }
                }
            }
        });

        const uniqueFriendly = Array.from(new Set(friendlyMessages));
        
        // Garantir que há pelo menos uma mensagem amigável em português
        if (uniqueFriendly.length === 0) {
            uniqueFriendly.push('Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.');
        }
        
        // Filtrar mensagens em inglês genéricas que possam ter passado
        const filteredFriendly = uniqueFriendly.filter(msg => {
            const normalized = msg.toLowerCase().trim();
            const englishPatterns = [
                'the following transactions failed',
                '^failed$',
                '^transaction failed$',
                '^payment failed$',
            ];
            return !englishPatterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(normalized);
            });
        });
        
        errorMessage = filteredFriendly[0] || uniqueFriendly[0] || 'Não foi possível processar o pagamento. Tente novamente.';

        if (!messages.length || messages.every(m => {
            const norm = String(m).toLowerCase().trim();
            return ['the following transactions failed', 'failed'].includes(norm);
        })) {
            messages = filteredFriendly.length > 0 ? filteredFriendly : uniqueFriendly;
        }

        // Variável para armazenar o número de tentativas atualizado para retornar no response
        let finalCardAttempts = currentAttempts;
        
        if (order) {
            try {
                const previousAttempts = order.cardAttempts || 0;
                const newAttempts = previousAttempts + 1;
                const maxAttempts = Number(process.env.PAYMENT_MAX_CARD_ATTEMPTS || 3);
                
                // CRÍTICO: Guardar o valor atualizado para retornar na resposta
                finalCardAttempts = newAttempts;

                const updateData: any = {
                    paymentStatus: 'failed',
                    paymentStatusDetail: 'rejected',
                    paymentMessage: errorMessage,
                    paymentAdminMessage: messages.join(', '),
                    cardAttempts: newAttempts,
                };

                // Marcar como failed apenas se esgotou tentativas, senão manter pending para reutilização
                if (newAttempts >= maxAttempts) {
                    updateData.status = 'failed';
                    updateData.isActive = false;
                    updateData.paymentStatusDetail = 'max_attempts';
                    updateData.paymentMessage = 'Você excedeu o número máximo de tentativas para este pedido.';
                    updateData.paymentAdminMessage = 'Limite de tentativas excedido (cartão).';
                } else {
                    // Manter pending para permitir nova tentativa
                    updateData.status = 'pending';
                    updateData.isActive = true;
                    // CRÍTICO: Manter expiresAt original, não renovar o tempo
                    // O tempo original deve ser preservado mesmo após falhas de pagamento
                }

                await Order.findByIdAndUpdate(order._id, { $set: updateData }, { new: true });

                // CRÍTICO: Devolver ingressos ao estoque APENAS quando esgotou tentativas
                // Se ainda há tentativas disponíveis, manter estoque reservado
                if (newAttempts >= maxAttempts && order.ticketType && order.totalTickets > 0) {
                    const TicketType = require('../models/TicketType').default;
                    const ticketType = await TicketType.findById(order.ticketType);
                    if (ticketType) {
                        ticketType.soldQuantity = Math.max(
                            0,
                            (ticketType.soldQuantity || 0) - order.totalTickets
                        );
                        await ticketType.save();
                    }
                }
            } catch (persistError) {
                // Se falhar ao atualizar, usar o valor que já tínhamos
            }
        }

        // Determinar status HTTP baseado em se esgotou tentativas
        // Se esgotou tentativas, retornar 429 (Too Many Requests) para indicar limite excedido
        const httpStatus = finalCardAttempts >= MAX_CARD_PAYMENT_ATTEMPTS ? 429 : 400;
        
        return res.status(httpStatus).json({
            success: false,
            message: finalCardAttempts >= MAX_CARD_PAYMENT_ATTEMPTS
                ? 'Você excedeu o número máximo de tentativas para este pedido. Inicie um novo pedido para tentar novamente.'
                : errorMessage,
            errors: finalCardAttempts >= MAX_CARD_PAYMENT_ATTEMPTS
                ? ['Você excedeu o número máximo de tentativas para este pedido. Inicie um novo pedido.']
                : uniqueFriendly,
            errorDetails: errorDetails, // Incluir detalhes completos do erro
            cardAttempts: finalCardAttempts, // Retornar o valor atualizado após incremento
            maxCardAttempts: MAX_CARD_PAYMENT_ATTEMPTS,
        });
    }
};

/**
 * Função auxiliar para enviar email de confirmação com PDF quando pagamento é aprovado
 */
async function sendPaymentApprovedEmail(order: any) {
    try {
        // Popular dados necessários
        const populatedOrder = await Order.findById(order._id)
            .populate('event', 'name date location address')
            .populate('tickets', 'code qrCode ticketType holder')
            .populate('customer', 'name email')
            .populate('tickets.ticketType', 'name isTransport transportOptions')
            .lean();

        if (!populatedOrder || !populatedOrder.customer) {return;
        }

        const event = populatedOrder.event as any;
        const customer = populatedOrder.customer as any;
        const tickets = populatedOrder.tickets as any[];

        // Filtrar apenas tickets com QR code (confirmados)
        const ticketsWithQR = tickets.filter((t) => t.qrCode);

        if (ticketsWithQR.length === 0) {return;
        }

        // Verificar se há tickets de transporte e coletar informações
        const transportTickets = ticketsWithQR.filter((t) => {
            const ticketType = t.ticketType as any;
            return ticketType?.isTransport === true;
        });

        // Coletar informações de transporte dos tickets
        let transportInfo: Array<{
            date: string;
            attraction: string;
            departureLocation: string;
        }> = [];

        if (transportTickets.length > 0) {
            // Buscar informações de transporte
            // Primeiro, tentar buscar do metadata do Order (transportOption selecionado pelo usuário)
            const orderDoc = await Order.findById(order._id).select('metadata').lean();
            const orderMetadata = (orderDoc as any)?.metadata || {};
            
            let transportDataFromMetadata: { date: string; attraction: string; departureLocation: string } | null = null;
            
            if (orderMetadata.transportOption) {
                try {
                    const transportOption = typeof orderMetadata.transportOption === 'string'
                        ? JSON.parse(orderMetadata.transportOption)
                        : orderMetadata.transportOption;
                    
                    if (transportOption.date && transportOption.attraction && transportOption.departureLocation) {
                        transportDataFromMetadata = {
                            date: transportOption.date,
                            attraction: transportOption.attraction,
                            departureLocation: transportOption.departureLocation
                        };
                    }
                } catch (e) {
                    // Ignorar erro de parsing
                }
            }
            
            // Se encontrou no metadata, usar. Senão, buscar do ticketType (primeira opção disponível)
            if (transportDataFromMetadata) {
                transportInfo.push(transportDataFromMetadata);
            } else {
                for (const ticket of transportTickets) {
                    const ticketType = ticket.ticketType as any;
                    
                    // Buscar do ticketType (primeira opção disponível)
                    if (ticketType?.transportOptions && ticketType.transportOptions.length > 0) {
                        // Pegar a primeira opção disponível
                        const firstOption = ticketType.transportOptions[0];
                        if (firstOption && firstOption.date && firstOption.attraction) {
                            transportInfo.push({
                                date: firstOption.date || '',
                                attraction: firstOption.attraction || '',
                                departureLocation: firstOption.departureLocations?.[0] || 'A confirmar'
                            });
                        }
                    }
                }
            }
        }

        // Gerar PDF com QR codes
        const pdfBuffer = await generateTicketPDF({
            event: {
                name: event.name,
                date: event.date,
                location: event.location,
                address: event.address,
            },
            orderNumber: populatedOrder.orderNumber,
            customerName: customer.name,
            tickets: ticketsWithQR.map((t) => ({
                code: t.code,
                qrCode: t.qrCode,
                ticketType: (t.ticketType as any)?.name || 'Ingresso',
                holderName: (t.holder as any)?.name || customer.name,
            })),
            // Incluir informações de transporte se houver
            transportInfo: transportInfo.length > 0 ? transportInfo : undefined,
        });

        // Formatar data do evento
        const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        // Preparar QR codes para exibição no email
        const qrCodesForEmail = ticketsWithQR.map((t) => ({
            code: t.code,
            qrCode: t.qrCode, // Já está em base64 data URL
            holderName: (t.holder as any)?.name || customer.name,
        }));

        // Enviar email com PDF anexo
        const frontendUrl =
            process.env.FRONTEND_URL || process.env.DASHBOARD_URL || 'http://localhost:3000';
        await sendTicketConfirmationEmail(
            customer.email,
            {
                customerName: customer.name,
                orderNumber: populatedOrder.orderNumber,
                eventName: event.name,
                eventDate,
                eventLocation: event.location,
                eventAddress: event.address,
                totalTickets: ticketsWithQR.length,
                ticketType: ticketsWithQR[0]?.ticketType?.name || 'Ingresso',
                downloadLink: `${frontendUrl}/dashboard`,
                qrCodes: qrCodesForEmail,
                // Incluir informações de transporte se houver tickets de transporte
                transportInfo: transportInfo.length > 0 ? transportInfo : undefined,
            },
            [
                {
                    filename: `ingressos-${populatedOrder.orderNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ]
        );
    } catch (error) {
        // Não falhar o webhook se o email falhar
    }
}

/**
 * Função auxiliar para enviar email quando pagamento é recusado
 */
async function sendPaymentRejectedEmailHelper(order: any, rejectionReason?: string) {
    try {
        const populatedOrder = await Order.findById(order._id)
            .populate('event', 'name date location')
            .populate('customer', 'name email')
            .lean();

        if (!populatedOrder || !populatedOrder.customer) {return;
        }

        const event = populatedOrder.event as any;
        const customer = populatedOrder.customer as any;

        const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const frontendUrl = process.env.FRONTEND_URL || process.env.DASHBOARD_URL || 'http://localhost:3000';
        await sendPaymentRejectedEmail(customer.email, {
            customerName: customer.name,
            orderNumber: populatedOrder.orderNumber,
            eventName: event.name,
            eventDate,
            eventLocation: event.location,
            totalAmount: `R$ ${populatedOrder.totalAmount.toFixed(2).replace('.', ',')}`,
            paymentMethod: populatedOrder.paymentMethod || 'Não informado',
            rejectionReason:
                rejectionReason || populatedOrder.paymentMessage || 'Pagamento recusado',
            retryLink: `${frontendUrl}/dashboard`,
        });
    } catch (error) {
        // Erro ao enviar email - não bloquear
    }
}

/**
 * Webhook do Mercado Pago para receber notificações de pagamento
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const { type, data } = req.body;
        const action = (req.body as any).action; // Pode ser "order.processed", "order.updated", etc.

        // Assinatura do webhook
        const secret = process.env.MP_WEBHOOK_SECRET?.trim();
        const sigHeader =
            (req.headers['x-signature'] as string) ||
            (req.headers['x-hub-signature-256'] as string);

        const isProd = (process.env.NODE_ENV || 'development') === 'production';
        const strictWebhook = (process.env.MP_WEBHOOK_STRICT || 'false').toLowerCase() === 'true';

        // Em modo estrito de produção exigimos secret + assinatura válida.
        // Em modo não estrito, apenas logamos problemas de assinatura mas continuamos o processamento
        if (isProd && strictWebhook) {
            if (!secret) return res.status(500).send('Webhook secret not configured');
            if (!sigHeader) return res.status(401).send('Missing signature');
        } else {
            if (!secret || !sigHeader) {
                // Webhook sem secret/signature - continuar em modo não estrito
            }
        }
        let signatureValid = false;
        if (secret && sigHeader) {
            const expected = crypto
                .createHmac('sha256', secret)
                .update((req as any).rawBody || Buffer.from(JSON.stringify(req.body)))
                .digest('hex');
            const provided = sigHeader.replace(/^sha256=/i, '').trim();
            try {
                signatureValid = crypto.timingSafeEqual(
                    Buffer.from(expected),
                    Buffer.from(provided)
                );
            } catch {
                signatureValid = false;
            }
            if (isProd && strictWebhook && !signatureValid) {
                return res.status(401).send('Invalid signature');
            } else if (!signatureValid) {
                // Assinatura inválida - continuar em modo não estrito
            }
        }

        // Idempotência persistente (DB) + enfileiramento
        const eventId = `${type}:${data?.id || 'unknown'}`;
        const queued = await enqueueOrGet(
            eventId,
            type,
            req.body,
            req.headers as any,
            sigHeader,
            !!signatureValid
        );

        // CRÍTICO: Para webhooks de order.processed, sempre processar mesmo se já foi processado antes
        // Isso garante que pedidos que ainda não foram atualizados sejam atualizados
        const isOrderProcessed = type === 'order' && action === 'order.processed';
        const shouldProcessAnyway = isOrderProcessed && queued.status === 'processed';

        if (queued.status === 'processed' && !shouldProcessAnyway) {
            return res.status(200).send('OK');
        }

        // Responder imediatamente ao Mercado Pago (200 OK)
        res.status(200).send('OK');

        // Processar notificação em background
        // Orders API pode enviar notificações de 'order' ou 'payment'
        if (type === 'order') {
            // Notificação de Order (Orders API)
            const mpOrderId = data.id;
            const action = (req.body as any).action; // Pode ser "order.processed", "order.updated", etc.
            try {
                // CRÍTICO: Usar dados do webhook quando disponíveis (mais atualizados)
                // Se o webhook já enviou os dados do pagamento, usar diretamente
                // Caso contrário, buscar do MP (fallback)
                let paymentInfo = data.transactions?.payments?.[0];
                let orderInfo: any = null;

                if (paymentInfo) {
                    // Webhook já enviou os dados do pagamento - usar diretamente
                    // Criar um objeto orderInfo mínimo com os dados necessários
                    orderInfo = {
                        external_reference: data.external_reference,
                        metadata: { order_id: data.external_reference },
                        transactions: {
                            payments: [paymentInfo],
                        },
                    };
                } else {
                    // Fallback: buscar do MP se webhook não enviou dados completos
                    orderInfo = (await paymentService.getOrderById(mpOrderId)) as any;

                    if (!orderInfo) {return;
                    }

                    paymentInfo = orderInfo.transactions?.payments?.[0];
                }

                // CRÍTICO: Se paymentInfo ainda não existe, tentar usar dados do data diretamente
                // Isso pode acontecer quando o webhook envia status no nível do data, não no payment
                if (!paymentInfo && (data.status || data.status_detail)) {
                    // Criar um paymentInfo mínimo a partir dos dados do data
                    paymentInfo = {
                        id: data.transactions?.payments?.[0]?.id || `PAY${data.id}`,
                        status: data.status || data.transactions?.payments?.[0]?.status,
                        status_detail:
                            data.status_detail || data.transactions?.payments?.[0]?.status_detail,
                        payment_method: data.transactions?.payments?.[0]?.payment_method || {
                            id: 'pix',
                            type: 'bank_transfer',
                        },
                    };
                }

                // Buscar pedido pelo external_reference (para fluxo normal de pedidos)
                const orderId =
                    data.external_reference ||
                    orderInfo.external_reference ||
                    orderInfo.metadata?.order_id;

                if (!orderId) {return;
                }

                const order = await Order.findOne({ _id: orderId, deletedAt: null });

                if (!paymentInfo) {return;
                }

                // Obter informações completas do status (uma vez só) – antes de sincronizar/parar
                // CRÍTICO: Garantir que status_detail seja extraído corretamente
                const paymentStatusRaw = paymentInfo.status || data.status;
                const paymentStatusDetailRaw =
                    paymentInfo.status_detail || data.status_detail || '';
                const statusInfo = getPaymentStatusInfo(paymentStatusRaw, paymentStatusDetailRaw);
                const paymentStatus = statusInfo.internalStatus;

                // Sempre sincronizar com engine de parcelas (se aplicável)
                await syncParcelFromMercadoPago({
                    paymentId: paymentInfo.id,
                    status: paymentStatusRaw,
                    statusDetail: paymentStatusDetailRaw,
                    externalReference: orderId,
                    transactionAmount: paymentInfo.transaction_amount,
                });

                if (!order) {return;
                }

                // Guardar status anterior para evitar disparar e-mail/aprovação duplicados
                const wasPaidBefore = order.status === 'paid';

                // CRÍTICO: Se o pedido já está pago e o webhook está sendo reprocessado,
                // e o status do MP também é pago, não precisa fazer nada
                if (wasPaidBefore && action === 'order.processed') {
                    if (statusInfo.internalStatus === 'paid') {return;
                    }
                }

                // Orders API usa payment_method.{type,id} em vez de payment_type_id/payment_method_id
                const paymentTypeId =
                    paymentInfo.payment_type_id || paymentInfo.payment_method?.type;
                const paymentMethodId =
                    paymentInfo.payment_method_id || paymentInfo.payment_method?.id;
                const paymentMethod = mapPaymentMethod(paymentTypeId, paymentMethodId);

                // Atualizar pedido com informações completas
                // CRÍTICO: Usar os valores extraídos corretamente
                order.paymentId = paymentInfo.id;
                order.paymentStatus = paymentStatusRaw;
                order.paymentStatusDetail = paymentStatusDetailRaw;
                order.paymentMessage = statusInfo.userMessage;
                order.paymentAdminMessage = statusInfo.adminMessage;

                // Mapear status interno para status do Order
                // REGRA: Se o MP cancelou (via webhook), SEMPRE seguir o MP (100% alinhamento)
                // A data de expiração é apenas para cancelamento automático quando expirar
                const isPixOrder = order.paymentMethod === 'pix' || paymentMethod === 'pix';

                if (paymentStatus === 'paid') {
                    order.status = 'paid';

                    // REFATORADO: Não liberar reservas - pedidos não usam mais reservas separadas
                    // O pedido PENDING já funciona como reserva e quando pago, o estoque já está bloqueado corretamente
                } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
                    // Se o MP cancelou (via webhook), seguir o MP independente da data de expiração
                    // O MP pode cancelar por vários motivos (expiração, erro interno, cancelamento manual, etc)
                    order.status = 'cancelled';
                    if (isPixOrder && process.env.NODE_ENV !== 'production') {
                        const mpExpiration = paymentInfo.date_of_expiration
                            ? new Date(paymentInfo.date_of_expiration)
                            : null;
                        const now = new Date();
                        if (mpExpiration && now < mpExpiration) {
                            // MP cancelou antes da expiração
                        } else {
                            // MP cancelou
                        }
                    }
                } else if (paymentStatus === 'refunded') {
                    order.status = 'refunded';
                } else {
                    order.status = 'pending';
                }

                order.paymentMethod = paymentMethod;

                // Salvar informações de erro se houver
                if (paymentInfo.error_code) {
                    order.paymentErrorCode = paymentInfo.error_code;
                }
                if (paymentInfo.error_description) {
                    order.paymentErrorDescription = paymentInfo.error_description;
                }

                if (paymentStatus === 'paid') {
                    // Atualizar paidAt com a data de aprovação do pagamento ou data atual
                    order.paidAt = paymentInfo.date_approved
                        ? new Date(paymentInfo.date_approved)
                        : paymentInfo.date_created
                          ? new Date(paymentInfo.date_created)
                          : new Date();

                    // Atualizar paymentOrderId se disponível
                    if (mpOrderId && !order.paymentOrderId) {
                        order.paymentOrderId = mpOrderId;
                    }

                    // CRÍTICO: Confirmar APENAS tickets deste pedido específico
                    // NUNCA confirmar tickets de outros pedidos, mesmo que sejam do mesmo cliente
                    // IMPORTANTE: NÃO usar .lean() aqui, pois precisamos das instâncias do Mongoose para chamar .save()
                    // FALLBACK: Se order.tickets estiver vazio, buscar diretamente pelo order._id
                    let tickets;
                    if (order.tickets && order.tickets.length > 0) {
                        tickets = await Ticket.find({
                            _id: { $in: order.tickets },
                            order: order._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                            deletedAt: null,
                        }).select('_id code qrCode status ticketType holder price order');
                    } else {
                        // Fallback: buscar tickets diretamente pelo order._id
                        tickets = await Ticket.find({
                            order: order._id,
                            deletedAt: null,
                        }).select('_id code qrCode status ticketType holder price order');
                        
                        // Atualizar order.tickets se encontrou tickets
                        if (tickets.length > 0) {
                            order.tickets = tickets.map((t: any) => t._id);
                            await order.save();
                        }
                    }

                    for (const ticket of tickets) {
                        // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                        if (String(ticket.order) !== String(order._id)) {continue;
                        }

                        if (ticket.status === 'pending' && !ticket.qrCode) {
                            const { generateQRCode } = await import('../services/qrCodeService');
                            ticket.status = 'confirmed';
                            ticket.qrCode = await generateQRCode(ticket.code);
                            await ticket.save();
                        } else if (ticket.status === 'pending') {
                            ticket.status = 'confirmed';
                            await ticket.save();
                        }
                    }

                    // Enviar email de confirmação com PDF apenas na primeira transição para "paid"
                    if (!wasPaidBefore) {
                        await sendPaymentApprovedEmail(order);
                    }
                } else if (paymentStatus === 'failed') {
                    // Enviar email de pagamento recusado
                    await sendPaymentRejectedEmailHelper(order, statusInfo.userMessage);
                }

                await order.save();

                // Marcar webhook como processado
                try {
                    await WebhookEvent.updateOne(
                        { eventId },
                        {
                            status: 'processed',
                            processedAt: new Date(),
                            attempts: queued.attempts || 0,
                        }
                    );
                } catch (updateError) {
                    // Erro ao atualizar webhook - não bloquear
                }
            } catch (error: any) {
                // Marcar falha e agendar retry
                try {
                    await WebhookEvent.updateOne(
                        { eventId },
                        {
                            $set: { status: 'failed', lastError: error?.message || 'unknown' },
                            $inc: { attempts: 1 },
                        },
                        { upsert: false }
                    );
                } catch (updateError) {}
            }
            return;
        }

        if (type === 'payment') {
            // Notificação de Payment (compatibilidade com Payment API ou webhooks antigos)
            const paymentId = data.id;

            // Buscar informações do pagamento
            const paymentInfo = (await paymentService.getPaymentById(paymentId)) as any;

            if (!paymentInfo) {return;
            }

            // Sempre sincronizar com engine de parcelas (se aplicável)
            await syncParcelFromMercadoPago({
                paymentId: paymentInfo.id,
                status: paymentInfo.status,
                statusDetail: paymentInfo.status_detail,
                externalReference: paymentInfo.external_reference,
                transactionAmount: paymentInfo.transaction_amount,
            });

            // Buscar pedido pelo external_reference (fluxo normal)
            const orderId = paymentInfo.external_reference || paymentInfo.metadata?.order_id;

            if (!orderId) {return;
            }

            const order = await Order.findOne({ _id: orderId, deletedAt: null });

            if (!order) {return;
            }

            // Guardar status anterior para evitar disparar e-mail/aprovação duplicados
            const wasPaidBefore = order.status === 'paid';

            // Obter informações completas do status
            const statusInfo = getPaymentStatusInfo(
                paymentInfo.status,
                paymentInfo.status_detail || ''
            );
            const paymentStatus = statusInfo.internalStatus;
            const paymentMethod = mapPaymentMethod(
                paymentInfo.payment_type_id,
                paymentInfo.payment_method_id
            );

            // Atualizar pedido com informações completas
            order.paymentId = paymentId;
            order.paymentStatus = paymentInfo.status;
            order.paymentStatusDetail = paymentInfo.status_detail;
            order.paymentMessage = statusInfo.userMessage;
            order.paymentAdminMessage = statusInfo.adminMessage;

            // Mapear status interno para status do Order (que só aceita pending, paid, cancelled, refunded)
            // REGRA: Se o MP cancelou (via webhook), SEMPRE seguir o MP (100% alinhamento)
            // A data de expiração é apenas para cancelamento automático quando expirar
            const isPixOrder = order.paymentMethod === 'pix' || paymentMethod === 'pix';

            if (paymentStatus === 'paid') {
                order.status = 'paid';

                // REFATORADO: Não liberar reservas - pedidos não usam mais reservas separadas
                // O pedido PENDING já funciona como reserva e quando pago, o estoque já está bloqueado corretamente
            } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
                // Se o MP cancelou (via webhook), seguir o MP independente da data de expiração
                // O MP pode cancelar por vários motivos (expiração, erro interno, cancelamento manual, etc)
                order.status = 'cancelled';
                if (isPixOrder && process.env.NODE_ENV !== 'production') {
                    const mpExpiration = paymentInfo.date_of_expiration
                        ? new Date(paymentInfo.date_of_expiration)
                        : null;
                    const now = new Date();
                    if (mpExpiration && now < mpExpiration) {
                        // MP cancelou antes da expiração
                    } else {
                        // MP cancelou
                    }
                }
            } else if (paymentStatus === 'refunded') {
                order.status = 'refunded';
            } else {
                // processing ou pending mantém como pending
                order.status = 'pending';
            }

            order.paymentMethod = paymentMethod;

            // Salvar informações de erro se houver
            if (paymentInfo.error_code) {
                order.paymentErrorCode = paymentInfo.error_code;
            }
            if (paymentInfo.error_description) {
                order.paymentErrorDescription = paymentInfo.error_description;
            }

            if (paymentStatus === 'paid') {
                order.paidAt = paymentInfo.date_approved
                    ? new Date(paymentInfo.date_approved)
                    : new Date();

                // CRÍTICO: Confirmar APENAS tickets deste pedido específico
                // NUNCA confirmar tickets de outros pedidos, mesmo que sejam do mesmo cliente
                // IMPORTANTE: NÃO usar .lean() aqui, pois precisamos das instâncias do Mongoose para chamar .save()
                // FALLBACK: Se order.tickets estiver vazio, buscar diretamente pelo order._id
                let tickets;
                if (order.tickets && order.tickets.length > 0) {
                    tickets = await Ticket.find({
                        _id: { $in: order.tickets },
                        order: order._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                        deletedAt: null,
                    }).select('_id code qrCode status ticketType holder price order');
                } else {
                    // Fallback: buscar tickets diretamente pelo order._id
                    tickets = await Ticket.find({
                        order: order._id,
                        deletedAt: null,
                    }).select('_id code qrCode status ticketType holder price order');
                    
                    // Atualizar order.tickets se encontrou tickets
                    if (tickets.length > 0) {
                        order.tickets = tickets.map((t: any) => t._id);
                        await order.save();
                    }
                }

                for (const ticket of tickets) {
                    // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                    if (String(ticket.order) !== String(order._id)) {continue;
                    }

                    if (ticket.status === 'pending' && !ticket.qrCode) {
                        const { generateQRCode } = await import('../services/qrCodeService');
                        ticket.status = 'confirmed';
                        ticket.qrCode = await generateQRCode(ticket.code);
                        await ticket.save();
                    } else if (ticket.status === 'pending') {
                        ticket.status = 'confirmed';
                        await ticket.save();
                    }
                }

                // Enviar email de confirmação com PDF apenas na primeira transição para "paid"
                if (!wasPaidBefore) {
                    await sendPaymentApprovedEmail(order);
                }
            } else if (paymentStatus === 'failed') {
                // Enviar email de pagamento recusado
                await sendPaymentRejectedEmailHelper(order, statusInfo.userMessage);
            }

            await order.save();

            // Marcar como processado
            await WebhookEvent.updateOne(
                { eventId },
                { status: 'processed', processedAt: new Date(), attempts: queued.attempts || 0 }
            );
        }
    } catch (error: any) {
        // Marcar falha e agendar retry
        try {
            const { type, data } = req.body;
            const eventId = `${type}:${data?.id || 'unknown'}`;
            await WebhookEvent.updateOne(
                { eventId },
                {
                    $set: { status: 'failed', lastError: error?.message || 'unknown' },
                    $inc: { attempts: 1 },
                },
                { upsert: false }
            );
        } catch {}
        // Não retornar erro para o Mercado Pago (já respondemos 200)
    }
};

/**
 * Verifica status de um pagamento
 * GET /api/payments/:paymentId/status
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
    try {
        const { paymentId } = req.params;

        let paymentInfo: any = null;
        let isOrdersApi = false;

        // Primeiro, tentar buscar via Payment API
        try {
            paymentInfo = (await paymentService.getPaymentById(paymentId)) as any;
        } catch (paymentApiError: any) {
            // Se falhar, pode ser um pagamento criado via Orders API
            // Verificar se existe um Parcel com esse paymentId
            const parcel = await Parcel.findOne({ paymentId }).lean();
            
            if (parcel && parcel.paymentOrderId) {
                // É um pagamento de Orders API (parcelamento)
                isOrdersApi = true;
                
                // Buscar a order via Orders API usando o paymentOrderId salvo
                try {
                    const mpOrder = await paymentService.getOrderById(parcel.paymentOrderId);
                    
                    // Encontrar o payment dentro da order que corresponde ao paymentId
                    const payments = mpOrder?.transactions?.payments || [];
                    const matchingPayment = payments.find((p: any) => p.id === paymentId);
                    
                    if (matchingPayment) {
                        // Construir objeto similar ao Payment API para manter compatibilidade
                        paymentInfo = {
                            id: matchingPayment.id,
                            status: matchingPayment.status,
                            status_detail: matchingPayment.status_detail,
                            payment_type_id: 'bank_transfer',
                            payment_method_id: 'pix',
                            transaction_amount: matchingPayment.transaction_amount,
                            date_approved: matchingPayment.date_approved,
                            date_of_expiration: matchingPayment.date_of_expiration,
                        };
                    } else {
                        return res.status(404).json({
                            success: false,
                            message: 'Pagamento não encontrado na order',
                        });
                    }
                } catch (orderApiError: any) {
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao buscar status do pagamento',
                        errors: [orderApiError.message || 'Erro ao buscar order no Mercado Pago'],
                    });
                }
            } else {
                // Não é um parcelamento ou não tem paymentOrderId, retornar erro original
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar status do pagamento',
                    errors: [paymentApiError.message || 'Erro desconhecido'],
                });
            }
        }

        if (!paymentInfo) {
            return res.status(404).json({
                success: false,
                message: 'Pagamento não encontrado',
            });
        }

        // Obter informações completas do status
        const statusInfo = getPaymentStatusInfo(
            paymentInfo.status,
            paymentInfo.status_detail || ''
        );

        return res.json({
            success: true,
            data: {
                paymentId: paymentInfo.id,
                status: paymentInfo.status,
                statusDetail: paymentInfo.status_detail,
                paymentMethod: mapPaymentMethod(
                    paymentInfo.payment_type_id,
                    paymentInfo.payment_method_id
                ),
                transactionAmount: paymentInfo.transaction_amount,
                dateApproved: paymentInfo.date_approved,
                // Para PIX, verificar expiração
                isExpired:
                    paymentInfo.payment_method_id === 'pix' && paymentInfo.date_of_expiration
                        ? paymentService.isPixPaymentExpired(paymentInfo.date_of_expiration)
                        : false,
                expiresAt: paymentInfo.date_of_expiration,
                // Informações completas do status
                statusInfo: {
                    userMessage: statusInfo.userMessage,
                    adminMessage: statusInfo.adminMessage,
                    color: statusInfo.color,
                    requiresAction: statusInfo.requiresAction,
                    canRetry: statusInfo.canRetry,
                    internalStatus: statusInfo.internalStatus,
                },
                // Informações de erro se houver
                error: paymentInfo.error_code
                    ? {
                          code: paymentInfo.error_code,
                          description: paymentInfo.error_description,
                          message: paymentInfo.message,
                      }
                    : null,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar status do pagamento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Busca status de pagamento de um pedido
 * GET /api/payments/order/:orderId/status
 */
export const getOrderPaymentStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        const order = await Order.findOne({ _id: orderId, deletedAt: null });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado',
            });
        }

        // Verificar permissão
        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOwner = String(order.customer) === String(userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar este pedido',
            });
        }

        // Se não tem paymentId, retornar status do pedido
        if (!order.paymentId) {
            return res.json({
                success: true,
                data: {
                    orderStatus: order.status,
                    paymentStatus: null,
                    paymentId: null,
                },
            });
        }

        // Buscar status do pagamento no Mercado Pago
        try {
            const paymentInfo = (await paymentService.getPaymentById(order.paymentId)) as any;

            // Obter informações completas do status
            const statusInfo = getPaymentStatusInfo(
                paymentInfo.status,
                paymentInfo.status_detail || ''
            );

            // Atualizar pedido com informações mais recentes se necessário
            if (
                order.paymentStatus !== paymentInfo.status ||
                order.paymentStatusDetail !== paymentInfo.status_detail
            ) {
                order.paymentStatus = paymentInfo.status;
                order.paymentStatusDetail = paymentInfo.status_detail;
                order.paymentMessage = statusInfo.userMessage;
                order.paymentAdminMessage = statusInfo.adminMessage;

                if (paymentInfo.error_code) {
                    order.paymentErrorCode = paymentInfo.error_code;
                }
                if (paymentInfo.error_description) {
                    order.paymentErrorDescription = paymentInfo.error_description;
                }

                await order.save();
            }

            return res.json({
                success: true,
                data: {
                    orderStatus: order.status,
                    paymentStatus: paymentInfo.status,
                    statusDetail: paymentInfo.status_detail,
                    paymentMethod: mapPaymentMethod(
                        paymentInfo.payment_type_id,
                        paymentInfo.payment_method_id
                    ),
                    transactionAmount: paymentInfo.transaction_amount,
                    dateApproved: paymentInfo.date_approved,
                    // Para PIX, verificar expiração
                    isExpired:
                        paymentInfo.payment_method_id === 'pix' && paymentInfo.date_of_expiration
                            ? paymentService.isPixPaymentExpired(paymentInfo.date_of_expiration)
                            : false,
                    expiresAt: paymentInfo.date_of_expiration,
                    // Informações completas do status (do banco ou atualizadas)
                    statusInfo: {
                        userMessage: order.paymentMessage || statusInfo.userMessage,
                        adminMessage: order.paymentAdminMessage || statusInfo.adminMessage,
                        color: statusInfo.color,
                        requiresAction: statusInfo.requiresAction,
                        canRetry: statusInfo.canRetry,
                        internalStatus: statusInfo.internalStatus,
                    },
                    // Informações de erro se houver
                    error:
                        paymentInfo.error_code || order.paymentErrorCode
                            ? {
                                  code: paymentInfo.error_code || order.paymentErrorCode,
                                  description:
                                      paymentInfo.error_description ||
                                      order.paymentErrorDescription,
                                  message: paymentInfo.message,
                              }
                            : null,
                },
            });
        } catch (error: any) {
            // Se não conseguir buscar no MP, retornar status do pedido (com informações salvas)
            const savedStatusInfo =
                order.paymentStatus && order.paymentStatusDetail
                    ? getPaymentStatusInfo(order.paymentStatus, order.paymentStatusDetail)
                    : null;

            return res.json({
                success: true,
                data: {
                    orderStatus: order.status,
                    paymentStatus: order.paymentStatus || 'unknown',
                    statusDetail: order.paymentStatusDetail,
                    paymentId: order.paymentId,
                    // Informações salvas do status
                    statusInfo: savedStatusInfo
                        ? {
                              userMessage: order.paymentMessage || savedStatusInfo.userMessage,
                              adminMessage:
                                  order.paymentAdminMessage || savedStatusInfo.adminMessage,
                              color: savedStatusInfo.color,
                              requiresAction: savedStatusInfo.requiresAction,
                              canRetry: savedStatusInfo.canRetry,
                              internalStatus: savedStatusInfo.internalStatus,
                          }
                        : null,
                    // Informações de erro se houver
                    error: order.paymentErrorCode
                        ? {
                              code: order.paymentErrorCode,
                              description: order.paymentErrorDescription,
                          }
                        : null,
                    note: 'Não foi possível buscar status atualizado do Mercado Pago. Exibindo informações salvas.',
                },
            });
        }
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar status do pagamento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};
