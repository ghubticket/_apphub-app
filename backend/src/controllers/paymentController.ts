import { Request, Response } from 'express';
import { WebhookEvent, Order, Ticket, Event, User } from '../models';
import { enqueueOrGet } from '../services/webhookProcessorService';
import crypto from 'crypto';
import * as paymentService from '../services/paymentService';
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

const MAX_CARD_PAYMENT_ATTEMPTS = Number(process.env.PAYMENT_MAX_CARD_ATTEMPTS || 3);

/**
 * Valida e busca um pedido com verificações de segurança
 */
const validateAndGetOrder = async (orderId: string, userId: string, req: Request) => {
    // OTIMIZAÇÃO: Usar .select() para limitar campos e .lean() para objetos simples
    // CRÍTICO: Incluir totalAmount no select - necessário para criar pagamento
    const order = await Order.findOne({ _id: orderId, deletedAt: null })
        .select('status paymentId paymentStatus customer customerData event tickets orderNumber totalAmount')
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
            console.warn('Não foi possível verificar pagamento existente:', error);
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

        // Validar e buscar pedido
        const order = await validateAndGetOrder(orderId, userId, req);

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
            console.log(
                `🔧 MOCK: Email alterado de "${order.customerData.email}" para "${customerEmail}" (sandbox, MP_EMAIL_MOCK_ENABLED=true)`
            );
        }

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
                    // Endereço pode ser adicionado se disponível no Order
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
                    console.log(
                        `[createPixPayment] ⏰ Estendendo expiresAt do pedido ${order.orderNumber}: ${orderExpiresAt.toISOString()} → ${finalExpiresAt.toISOString()} (faltavam ${Math.round(timeRemaining / 60000)}min)`
                    );
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

                    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
                    await sendPaymentPendingEmail(customerEmail, {
                        customerName: customerName || 'Cliente',
                        orderNumber: order.orderNumber,
                        eventName: event.name,
                        eventDate,
                        eventLocation: event.location,
                        totalAmount: `R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`,
                        paymentMethod: 'PIX',
                        expirationMinutes: pixPayment.expirationMinutes || 15,
                        pixQrCode: pixPayment.qrCodeBase64
                            ? `data:image/png;base64,${pixPayment.qrCodeBase64}`
                            : pixPayment.qrCode,
                        pixCode: pixPayment.ticketUrl, // Código PIX para copiar e colar
                        paymentLink: `${dashboardUrl}/orders/${order._id}`,
                    });

                    console.log(
                        `✅ Email de pagamento pendente (PIX) enviado para ${customerEmail}`
                    );
                }
            }
        } catch (emailError) {
            console.error('Erro ao enviar email de pagamento pendente (PIX):', emailError);
            // Não falhar a criação do pagamento se o email falhar
        }

        // Log detalhado
        console.log(`📦 Pedido ${order.orderNumber} - PIX criado:`, {
            paymentId: pixPayment.paymentId,
            status: pixPayment.status,
            statusDetail: pixPayment.statusDetail,
            userMessage: statusInfo.userMessage,
            expiresAt: pixPayment.expiresAt,
        });

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
                // REFATORADO: Não retornar reserva - o pedido já contém todas as informações necessárias (expiresAt)
            },
        });
    } catch (error: any) {
        console.error('Erro ao criar pagamento PIX:', error);

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

        // Validar e buscar pedido
        // IMPORTANTE: precisamos de um documento Mongoose real (sem .lean())
        // para poder usar .save() com segurança neste fluxo.
        order = await validateAndGetOrder(orderId, userId, req);

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
            console.log(
                `🔧 MOCK: Email alterado de "${order.customerData.email}" para "${customerEmail}" (sandbox, MP_EMAIL_MOCK_ENABLED=true)`
            );
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
                console.log(
                    `🔧 MOCK: Email do titular alterado de "${cardholder?.email}" para "${normalizedCardholder.email}" (sandbox)`
                );
            }
        }

        // Verificar limite de tentativas de cartão
        // IMPORTANTE: Verificar ANTES de processar para evitar processar quando já excedeu
        currentAttempts = order.cardAttempts || 0;
        console.log(
            `🔍 [createCardPayment] Verificando tentativas: cardAttempts=${currentAttempts}, MAX=${MAX_CARD_PAYMENT_ATTEMPTS}, orderNumber=${order.orderNumber}`
        );

        if (currentAttempts >= MAX_CARD_PAYMENT_ATTEMPTS) {
            console.warn(
                `⚠️ [createCardPayment] Limite de tentativas excedido: cardAttempts=${currentAttempts}, MAX=${MAX_CARD_PAYMENT_ATTEMPTS}, orderNumber=${order.orderNumber}`
            );
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
                    console.log(
                        `🔄 [createCardPayment] Ingressos devolvidos ao estoque (limite excedido): ${order.totalTickets} tickets`
                    );
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
        const cardPayment = await paymentService.createCardPayment(
            {
                orderId: String(order._id),
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                token,
                description,
                installments: installments || 1,
                paymentMethodId,
                issuerId,
                customerData: {
                    name: order.customerData.name,
                    email: customerEmail, // Email mockado para sandbox
                    cpf: order.customerData.cpf || '',
                    phone: order.customerData.phone,
                    // Endereço pode ser adicionado se disponível no Order
                },
                cardholder: normalizedCardholder,
                items,
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
                paidAt: cardPayment.dateApproved
                    ? new Date(cardPayment.dateApproved)
                    : new Date(),
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

            console.log(
                `💳 [createCardPayment] Confirmando ${tickets.length} ticket(s) do pedido ${order.orderNumber} (${order._id})`
            );

            for (const ticket of tickets) {
                // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                if (String(ticket.order) !== String(order._id)) {
                    console.error(
                        `⚠️ [createCardPayment] ERRO CRÍTICO: Ticket ${ticket._id} não pertence ao pedido ${order._id}! Pulando...`
                    );
                    continue;
                }

                if (ticket.status === 'pending') {
                    ticket.status = 'confirmed';
                    // Gerar QR code se ainda não tiver
                    if (!ticket.qrCode) {
                        const { generateQRCode } = await import('../services/qrCodeService');
                        ticket.qrCode = await generateQRCode(ticket.code);
                    }
                    await ticket.save();
                    console.log(
                        `✅ [createCardPayment] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`
                    );
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
                console.log(
                        `📊 [createCardPayment] Tentativa falhou: cardAttempts ${previousAttempts} → ${newAttempts}, orderNumber=${order.orderNumber}`
                );
            }
        } else {
            // processing, pending, etc - manter como pending
            Object.assign(baseOrderUpdate, {
                status: 'pending',
            });
        }

        await Order.findByIdAndUpdate(order._id, { $set: baseOrderUpdate }, { new: true });

        // Log detalhado
        console.log(`💳 Pedido ${order.orderNumber} - Cartão processado:`, {
            paymentId: cardPayment.paymentId,
            status: cardPayment.status,
            statusDetail: cardPayment.statusDetail,
            userMessage: statusInfo.userMessage,
            requiresAction: statusInfo.requiresAction,
            canRetry: statusInfo.canRetry,
        });

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
            },
        });
    } catch (error: any) {
        console.error('Erro ao criar pagamento com cartão:', error);

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
            const normalized = msg.toLowerCase();
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
                appendFriendly(msg);
            }
        });

        const uniqueFriendly = Array.from(new Set(friendlyMessages));
        errorMessage = uniqueFriendly[0];

        if (!messages.length) {
            messages = uniqueFriendly;
        }

        if (order) {
            try {
                const previousAttempts = order.cardAttempts || 0;
                const newAttempts = previousAttempts + 1;
                const maxAttempts = Number(process.env.PAYMENT_MAX_CARD_ATTEMPTS || 3);

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
                    console.log(
                        `📊 [createCardPayment] Tentativas esgotadas: cardAttempts ${previousAttempts} → ${newAttempts}/${maxAttempts}, orderNumber=${order.orderNumber}`
                    );
                } else {
                    // Manter pending para permitir nova tentativa
                    updateData.status = 'pending';
                    updateData.isActive = true;
                    // CRÍTICO: Manter expiresAt original, não renovar o tempo
                    // O tempo original deve ser preservado mesmo após falhas de pagamento
                    console.log(
                        `📊 [createCardPayment] Tentativa ${newAttempts}/${maxAttempts} falhou, mantendo pedido pending (expiresAt original: ${order.expiresAt}), orderNumber=${order.orderNumber}`
                    );
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
                        console.log(
                            `🔄 [createCardPayment] Tentativas esgotadas - ingressos devolvidos ao estoque: ${order.totalTickets} tickets, soldQuantity: ${ticketType.soldQuantity}`
                        );
                    }
                } else if (newAttempts < maxAttempts) {
                    console.log(
                        `📦 [createCardPayment] Mantendo estoque reservado (${newAttempts}/${maxAttempts} tentativas)`
                    );
                }
            } catch (persistError) {
                console.error(
                    'Não foi possível atualizar o pedido após falha no cartão:',
                    persistError
                );
            }
        }

        return res.status(400).json({
            success: false,
            message: errorMessage,
            errors: uniqueFriendly,
            errorDetails: errorDetails, // Incluir detalhes completos do erro
            cardAttempts: order?.cardAttempts ?? currentAttempts,
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
            .populate('tickets.ticketType', 'name')
            .lean();

        if (!populatedOrder || !populatedOrder.customer) {
            console.error('Pedido ou cliente não encontrado para envio de email');
            return;
        }

        const event = populatedOrder.event as any;
        const customer = populatedOrder.customer as any;
        const tickets = populatedOrder.tickets as any[];

        // Filtrar apenas tickets com QR code (confirmados)
        const ticketsWithQR = tickets.filter((t) => t.qrCode);

        if (ticketsWithQR.length === 0) {
            console.warn('Nenhum ticket com QR code encontrado para envio');
            return;
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

        // Enviar email com PDF anexo e QR codes inline
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
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
                downloadLink: `${dashboardUrl}/orders/${populatedOrder._id}`,
                qrCodes: qrCodesForEmail,
            },
            [
                {
                    filename: `ingressos-${populatedOrder.orderNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ]
        );

        console.log(`✅ Email de confirmação com PDF enviado para ${customer.email}`);
    } catch (error) {
        console.error('Erro ao enviar email de confirmação:', error);
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

        if (!populatedOrder || !populatedOrder.customer) {
            console.error('Pedido ou cliente não encontrado para envio de email');
            return;
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

        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
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
            retryLink: `${dashboardUrl}/orders/${populatedOrder._id}`,
        });

        console.log(`✅ Email de pagamento recusado enviado para ${customer.email}`);
    } catch (error) {
        console.error('Erro ao enviar email de pagamento recusado:', error);
    }
}

/**
 * Webhook do Mercado Pago para receber notificações de pagamento
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const { type, data } = req.body;

        // Assinatura do webhook
        const secret = process.env.MP_WEBHOOK_SECRET?.trim();
        const sigHeader =
            (req.headers['x-signature'] as string) ||
            (req.headers['x-hub-signature-256'] as string);

        const isProd = (process.env.NODE_ENV || 'development') === 'production';
        const strictWebhook =
            (process.env.MP_WEBHOOK_STRICT || 'false').toLowerCase() === 'true';

        // Em modo estrito de produção exigimos secret + assinatura válida.
        // Em modo não estrito, apenas logamos problemas de assinatura mas continuamos o processamento
        if (isProd && strictWebhook) {
            if (!secret) return res.status(500).send('Webhook secret not configured');
            if (!sigHeader) return res.status(401).send('Missing signature');
        } else {
            if (!secret || !sigHeader) {
                console.warn(
                    '[Webhook] Assinatura ausente ou secret não configurado (modo não estrito).',
                );
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
                console.warn('[Webhook] Assinatura inválida (modo não estrito).');
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
        if (queued.status === 'processed') {
            return res.status(200).send('OK');
        }

        // Responder imediatamente ao Mercado Pago (200 OK)
        res.status(200).send('OK');

        // Processar notificação em background
        // Orders API pode enviar notificações de 'order' ou 'payment'
        if (type === 'order') {
            // Notificação de Order (Orders API)
            const mpOrderId = data.id;

            try {
                const orderInfo = (await paymentService.getOrderById(mpOrderId)) as any;

                if (!orderInfo) {
                    console.error('Order não encontrada:', mpOrderId);
                    return;
                }

                // Buscar pedido pelo external_reference
                const orderId = orderInfo.external_reference || orderInfo.metadata?.order_id;

                if (!orderId) {
                    console.error('Order ID não encontrado na order do MP:', mpOrderId);
                    return;
                }

                const order = await Order.findOne({ _id: orderId, deletedAt: null });

                if (!order) {
                    console.error('Pedido não encontrado:', orderId);
                    return;
                }

                // Processar primeira transação da order
                // Orders API retorna: orderInfo.transactions.payments[0]
                const paymentInfo = orderInfo.transactions?.payments?.[0];

                if (!paymentInfo) {
                    console.error('Nenhum pagamento encontrado na order:', mpOrderId);
                    return;
                }

                // Guardar status anterior para evitar disparar e-mail/aprovação duplicados
                const wasPaidBefore = order.status === 'paid';

                // Obter informações completas do status
                const statusInfo = getPaymentStatusInfo(
                    paymentInfo.status,
                    paymentInfo.status_detail || ''
                );
                const paymentStatus = statusInfo.internalStatus;
                // Orders API usa payment_method.{type,id} em vez de payment_type_id/payment_method_id
                const paymentTypeId =
                    paymentInfo.payment_type_id || paymentInfo.payment_method?.type;
                const paymentMethodId =
                    paymentInfo.payment_method_id || paymentInfo.payment_method?.id;
                const paymentMethod = mapPaymentMethod(paymentTypeId, paymentMethodId);

                // Atualizar pedido com informações completas
                order.paymentId = paymentInfo.id;
                order.paymentStatus = paymentInfo.status;
                order.paymentStatusDetail = paymentInfo.status_detail;
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
                            console.log(
                                `[webhook-order] PIX pedido ${order.orderNumber}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min). Seguindo MP e cancelando.`
                            );
                        } else {
                            console.log(
                                `[webhook-order] PIX pedido ${order.orderNumber}: MP cancelou (status: ${paymentInfo.status}). Seguindo MP e cancelando.`
                            );
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
                    order.paidAt = paymentInfo.date_approved
                        ? new Date(paymentInfo.date_approved)
                        : new Date();

                    // CRÍTICO: Confirmar APENAS tickets deste pedido específico
                    // NUNCA confirmar tickets de outros pedidos, mesmo que sejam do mesmo cliente
                    // OTIMIZAÇÃO: Usar .select() e .lean() para melhor performance
                    const tickets = await Ticket.find({
                        _id: { $in: order.tickets },
                        order: order._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                        deletedAt: null,
                    })
                        .select('_id code qrCode status ticketType holder price')
                        .lean();

                    console.log(
                        `🔔 [handleWebhook] Confirmando ${tickets.length} ticket(s) do pedido ${order.orderNumber} (${order._id})`
                    );

                    for (const ticket of tickets) {
                        // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                        if (String(ticket.order) !== String(order._id)) {
                            console.error(
                                `⚠️ [handleWebhook] ERRO CRÍTICO: Ticket ${ticket._id} não pertence ao pedido ${order._id}! Pulando...`
                            );
                            continue;
                        }

                        if (ticket.status === 'pending' && !ticket.qrCode) {
                            const { generateQRCode } = await import('../services/qrCodeService');
                            ticket.status = 'confirmed';
                            ticket.qrCode = await generateQRCode(ticket.code);
                            await ticket.save();
                            console.log(
                                `✅ [handleWebhook] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`
                            );
                        } else if (ticket.status === 'pending') {
                            ticket.status = 'confirmed';
                            await ticket.save();
                            console.log(
                                `✅ [handleWebhook] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`
                            );
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

                // Log detalhado
                console.log(`✅ Pedido ${order.orderNumber} atualizado via webhook (Order):`, {
                    orderId: mpOrderId,
                    paymentId: paymentInfo.id,
                    status: paymentInfo.status,
                    statusDetail: paymentInfo.status_detail,
                    internalStatus: paymentStatus,
                    userMessage: statusInfo.userMessage,
                    requiresAction: statusInfo.requiresAction,
                    canRetry: statusInfo.canRetry,
                });
            } catch (error: any) {
                console.error('Erro ao processar notificação de Order:', error);
            }
            return;
        }

        if (type === 'payment') {
            // Notificação de Payment (compatibilidade com Payment API ou webhooks antigos)
            const paymentId = data.id;

            // Buscar informações do pagamento
            const paymentInfo = (await paymentService.getPaymentById(paymentId)) as any;

            if (!paymentInfo) {
                console.error('Pagamento não encontrado:', paymentId);
                return;
            }

            // Buscar pedido pelo external_reference
            const orderId = paymentInfo.external_reference || paymentInfo.metadata?.order_id;

            if (!orderId) {
                console.error('Order ID não encontrado no pagamento:', paymentId);
                return;
            }

            const order = await Order.findOne({ _id: orderId, deletedAt: null });

            if (!order) {
                console.error('Pedido não encontrado:', orderId);
                return;
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
                        console.log(
                            `[webhook-payment] PIX pedido ${order.orderNumber}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min). Seguindo MP e cancelando.`
                        );
                    } else {
                        console.log(
                            `[webhook-payment] PIX pedido ${order.orderNumber}: MP cancelou (status: ${paymentInfo.status}). Seguindo MP e cancelando.`
                        );
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
                // OTIMIZAÇÃO: Usar .select() e .lean() para melhor performance
                const tickets = await Ticket.find({
                    _id: { $in: order.tickets },
                    order: order._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                    deletedAt: null,
                })
                    .select('_id code qrCode status ticketType holder price')
                    .lean();

                console.log(
                    `🔔 [handleWebhook-payment] Confirmando ${tickets.length} ticket(s) do pedido ${order.orderNumber} (${order._id})`
                );

                for (const ticket of tickets) {
                    // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                    if (String(ticket.order) !== String(order._id)) {
                        console.error(
                            `⚠️ [handleWebhook-payment] ERRO CRÍTICO: Ticket ${ticket._id} não pertence ao pedido ${order._id}! Pulando...`
                        );
                        continue;
                    }

                    if (ticket.status === 'pending' && !ticket.qrCode) {
                        const { generateQRCode } = await import('../services/qrCodeService');
                        ticket.status = 'confirmed';
                        ticket.qrCode = await generateQRCode(ticket.code);
                        await ticket.save();
                        console.log(
                            `✅ [handleWebhook-payment] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`
                        );
                    } else if (ticket.status === 'pending') {
                        ticket.status = 'confirmed';
                        await ticket.save();
                        console.log(
                            `✅ [handleWebhook-payment] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`
                        );
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

            // Log detalhado
            console.log(`✅ Pedido ${order.orderNumber} atualizado via webhook:`, {
                paymentId,
                status: paymentInfo.status,
                statusDetail: paymentInfo.status_detail,
                internalStatus: paymentStatus,
                userMessage: statusInfo.userMessage,
                requiresAction: statusInfo.requiresAction,
                canRetry: statusInfo.canRetry,
                errorCode: paymentInfo.error_code,
                errorDescription: paymentInfo.error_description,
            });
            // Marcar como processado
            await WebhookEvent.updateOne(
                { eventId },
                { status: 'processed', processedAt: new Date(), attempts: queued.attempts || 0 }
            );
        }
    } catch (error: any) {
        console.error('Erro ao processar webhook:', error);
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

        const paymentInfo = (await paymentService.getPaymentById(paymentId)) as any;

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
        console.error('Erro ao buscar status do pagamento:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar status do pagamento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * IMPORTS PRESUMIDOS (mantenha as mesmas do seu projeto):
 * - enqueueOrGet, WebhookEvent
 * - paymentService, Order, Ticket
 * - getPaymentStatusInfo, mapPaymentMethod
 * - sendPaymentApprovedEmail, sendPaymentRejectedEmailHelper
 *
 * Ajuste caminhos de import conforme necessário.
 */

export const handleWebhook = async (req: Request, res: Response) => {
    // Responder 200 rápido e processar em background sempre que possível
    // (mas só depois de enfileirar)
    try {
        // rawBody: middleware express.raw deve ter sido usado na rota
        const rawBodyBuffer: Buffer =
            (req as any).rawBody && Buffer.isBuffer((req as any).rawBody)
                ? (req as any).rawBody
                : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

        // Tentar parse seguro do body (alguns webhooks podem enviar formatos diferentes)
        let parsedBody: any;
        try {
            parsedBody = req.body && Object.keys(req.body).length ? req.body : JSON.parse(rawBodyBuffer.toString('utf8'));
        } catch {
            parsedBody = req.body || {};
        }

        // Extrair type e data com fallback para query params
        const type =
            parsedBody.type ||
            parsedBody.topic ||
            (req.query && (req.query.type as string)) ||
            undefined;
        const dataObj =
            parsedBody.data ||
            parsedBody.payload ||
            (req.query && (req.query.data || req.query['data.id'])) ||
            {};

        const dataId =
            (dataObj && (dataObj.id || dataObj?.payment_id || dataObj?.order_id)) ||
            parsedBody.id ||
            (req.query && (req.query.id || req.query['data.id'])) ||
            undefined;

        // Assinatura do webhook — aceitar vários nomes de header
        const secret = process.env.MP_WEBHOOK_SECRET?.trim();
        const sigHeader =
            (req.headers['x-signature'] as string) ||
            (req.headers['x-hub-signature-256'] as string) ||
            (req.headers['x-signature-sha256'] as string) ||
            (req.headers['x-signature-sha256-256'] as string) ||
            (req.headers['x_hub_signature'] as string) ||
            undefined;

        const isProd = (process.env.NODE_ENV || 'development') === 'production';
        const strictWebhook = (process.env.MP_WEBHOOK_STRICT || 'false').toLowerCase() === 'true';

        // Validar assinatura de forma segura e robusta
        let signatureValid = false;
        let signatureProvided = sigHeader || undefined;

        if (secret && sigHeader) {
            // Normalize provided signature: remover prefixos como "sha256=" e espaço
            const providedRaw = String(sigHeader).trim().replace(/^sha256=/i, '');

            // Calcular HMAC SHA256 sobre o raw body (utf8)
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(rawBodyBuffer);
            const expectedHex = hmac.digest('hex');
            const expectedBase64 = Buffer.from(expectedHex, 'hex').toString('base64');

            try {
                const providedBuf = Buffer.from(providedRaw);
                const expectedHexBuf = Buffer.from(expectedHex);
                const expectedBase64Buf = Buffer.from(expectedBase64);

                // timingSafeEqual requires same length; testar ambas representações
                if (providedBuf.length === expectedHexBuf.length) {
                    signatureValid = crypto.timingSafeEqual(providedBuf, expectedHexBuf);
                } else if (providedBuf.length === expectedBase64Buf.length) {
                    signatureValid = crypto.timingSafeEqual(providedBuf, expectedBase64Buf);
                } else {
                    // última tentativa: comparar stringmente (menos seguro, só para debug)
                    signatureValid = providedRaw === expectedHex || providedRaw === expectedBase64;
                }
            } catch {
                signatureValid = false;
            }
        } else {
            // sem secret ou sem header
            signatureValid = false;
        }

        // Regras de bloqueio: em produção + modo estrito, exigir secret + assinatura válida
        if (isProd && strictWebhook) {
            if (!secret) {
                console.error('[Webhook] MP_WEBHOOK_SECRET não configurado (modo estrito).');
                return res.status(500).send('Webhook secret not configured');
            }
            if (!signatureProvided) {
                console.error('[Webhook] Assinatura ausente (modo estrito).');
                return res.status(401).send('Missing signature');
            }
            if (!signatureValid) {
                console.error('[Webhook] Assinatura inválida (modo estrito).');
                return res.status(401).send('Invalid signature');
            }
        } else {
            if (!secret || !signatureProvided) {
                console.warn('[Webhook] Assinatura ausente ou secret não configurado (modo não estrito).');
            } else if (!signatureValid) {
                // Log detalhado em ambiente não-prod para debugging
                console.warn('[Webhook] Assinatura inválida (modo não estrito).');
                if (!isProd) {
                    console.warn('[Webhook] Raw body for debug:', rawBodyBuffer.toString('utf8').substring(0, 2000));
                }
            }
        }

        // Gerar eventId consistente
        const eventId = `${type || 'unknown'}:${dataId ?? Date.now()}`;

        // Enfileirar o evento (persistência e idempotência)
        const queued = await enqueueOrGet(
            eventId,
            type,
            parsedBody,
            req.headers as any,
            signatureProvided,
            !!signatureValid
        );

        // Se já foi processado, retorna OK
        if (queued && queued.status === 'processed') {
            return res.status(200).send('OK');
        }

        // Responder 200 rapidamente ao Mercado Pago
        res.status(200).send('OK');

        // --- processar em background (mantive sua lógica de Order / Payment) ---
        // Orders
        if (type === 'order') {
            const mpOrderId = dataId;
            try {
                const orderInfo = (await paymentService.getOrderById(mpOrderId)) as any;
                if (!orderInfo) {
                    console.error('Order não encontrada:', mpOrderId);
                    return;
                }

                const orderId = orderInfo.external_reference || orderInfo.metadata?.order_id;
                if (!orderId) {
                    console.error('Order ID não encontrado na order do MP:', mpOrderId);
                    return;
                }

                const order = await Order.findOne({ _id: orderId, deletedAt: null });
                if (!order) {
                    console.error('Pedido não encontrado:', orderId);
                    return;
                }

                const paymentInfo = orderInfo.transactions?.payments?.[0];
                if (!paymentInfo) {
                    console.error('Nenhum pagamento encontrado na order:', mpOrderId);
                    return;
                }

                const wasPaidBefore = order.status === 'paid';
                const statusInfo = getPaymentStatusInfo(paymentInfo.status, paymentInfo.status_detail || '');
                const paymentStatus = statusInfo.internalStatus;

                const paymentTypeId = paymentInfo.payment_type_id || paymentInfo.payment_method?.type;
                const paymentMethodId = paymentInfo.payment_method_id || paymentInfo.payment_method?.id;
                const paymentMethod = mapPaymentMethod(paymentTypeId, paymentMethodId);

                order.paymentId = paymentInfo.id;
                order.paymentStatus = paymentInfo.status;
                order.paymentStatusDetail = paymentInfo.status_detail;
                order.paymentMessage = statusInfo.userMessage;
                order.paymentAdminMessage = statusInfo.adminMessage;

                const isPixOrder = order.paymentMethod === 'pix' || paymentMethod === 'pix';

                if (paymentStatus === 'paid') {
                    order.status = 'paid';
                } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
                    order.status = 'cancelled';
                    if (isPixOrder && process.env.NODE_ENV !== 'production') {
                        const mpExpiration = paymentInfo.date_of_expiration ? new Date(paymentInfo.date_of_expiration) : null;
                        const now = new Date();
                        if (mpExpiration && now < mpExpiration) {
                            console.log(`[webhook-order] PIX pedido ${order.orderNumber}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min).`);
                        } else {
                            console.log(`[webhook-order] PIX pedido ${order.orderNumber}: MP cancelou (status: ${paymentInfo.status}).`);
                        }
                    }
                } else if (paymentStatus === 'refunded') {
                    order.status = 'refunded';
                } else {
                    order.status = 'pending';
                }

                order.paymentMethod = paymentMethod;

                if (paymentInfo.error_code) order.paymentErrorCode = paymentInfo.error_code;
                if (paymentInfo.error_description) order.paymentErrorDescription = paymentInfo.error_description;

                if (paymentStatus === 'paid') {
                    order.paidAt = paymentInfo.date_approved ? new Date(paymentInfo.date_approved) : new Date();

                    const tickets = await Ticket.find({
                        _id: { $in: order.tickets },
                        order: order._id,
                        deletedAt: null,
                    }).select('_id code qrCode status ticketType holder price');

                    console.log(`🔔 [handleWebhook] Confirmando ${tickets.length} ticket(s) do pedido ${order.orderNumber} (${order._id})`);

                    for (const ticket of tickets) {
                        if (String(ticket.order) !== String(order._id)) {
                            console.error(`⚠️ [handleWebhook] ERRO CRÍTICO: Ticket ${ticket._id} não pertence ao pedido ${order._id}! Pulando...`);
                            continue;
                        }

                        if (ticket.status === 'pending' && !ticket.qrCode) {
                            const { generateQRCode } = await import('../services/qrCodeService');
                            ticket.status = 'confirmed';
                            ticket.qrCode = await generateQRCode(ticket.code);
                            await ticket.save();
                            console.log(`✅ [handleWebhook] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`);
                        } else if (ticket.status === 'pending') {
                            ticket.status = 'confirmed';
                            await ticket.save();
                            console.log(`✅ [handleWebhook] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`);
                        }
                    }

                    if (!wasPaidBefore) {
                        await sendPaymentApprovedEmail(order);
                    }
                } else if (paymentStatus === 'failed') {
                    await sendPaymentRejectedEmailHelper(order, statusInfo.userMessage);
                }

                await order.save();

                console.log(`✅ Pedido ${order.orderNumber} atualizado via webhook (Order):`, {
                    orderId: mpOrderId,
                    paymentId: paymentInfo.id,
                    status: paymentInfo.status,
                    statusDetail: paymentInfo.status_detail,
                    internalStatus: paymentStatus,
                    userMessage: statusInfo.userMessage,
                    requiresAction: statusInfo.requiresAction,
                    canRetry: statusInfo.canRetry,
                });
            } catch (error: any) {
                console.error('Erro ao processar notificação de Order:', error);
            }
            return;
        }

        // Payments
        if (type === 'payment') {
            const paymentId = dataId;
            try {
                const paymentInfo = (await paymentService.getPaymentById(paymentId)) as any;
                if (!paymentInfo) {
                    console.error('Pagamento não encontrado:', paymentId);
                    return;
                }

                const orderId = paymentInfo.external_reference || paymentInfo.metadata?.order_id;
                if (!orderId) {
                    console.error('Order ID não encontrado no pagamento:', paymentId);
                    return;
                }

                const order = await Order.findOne({ _id: orderId, deletedAt: null });
                if (!order) {
                    console.error('Pedido não encontrado:', orderId);
                    return;
                }

                const wasPaidBefore = order.status === 'paid';
                const statusInfo = getPaymentStatusInfo(paymentInfo.status, paymentInfo.status_detail || '');
                const paymentStatus = statusInfo.internalStatus;
                const paymentMethod = mapPaymentMethod(paymentInfo.payment_type_id, paymentInfo.payment_method_id);

                order.paymentId = paymentId;
                order.paymentStatus = paymentInfo.status;
                order.paymentStatusDetail = paymentInfo.status_detail;
                order.paymentMessage = statusInfo.userMessage;
                order.paymentAdminMessage = statusInfo.adminMessage;

                const isPixOrder = order.paymentMethod === 'pix' || paymentMethod === 'pix';

                if (paymentStatus === 'paid') {
                    order.status = 'paid';
                } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
                    order.status = 'cancelled';
                    if (isPixOrder && process.env.NODE_ENV !== 'production') {
                        const mpExpiration = paymentInfo.date_of_expiration ? new Date(paymentInfo.date_of_expiration) : null;
                        const now = new Date();
                        if (mpExpiration && now < mpExpiration) {
                            console.log(`[webhook-payment] PIX pedido ${order.orderNumber}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min).`);
                        } else {
                            console.log(`[webhook-payment] PIX pedido ${order.orderNumber}: MP cancelou (status: ${paymentInfo.status}).`);
                        }
                    }
                } else if (paymentStatus === 'refunded') {
                    order.status = 'refunded';
                } else {
                    order.status = 'pending';
                }

                order.paymentMethod = paymentMethod;

                if (paymentInfo.error_code) order.paymentErrorCode = paymentInfo.error_code;
                if (paymentInfo.error_description) order.paymentErrorDescription = paymentInfo.error_description;

                if (paymentStatus === 'paid') {
                    order.paidAt = paymentInfo.date_approved ? new Date(paymentInfo.date_approved) : new Date();

                    const tickets = await Ticket.find({
                        _id: { $in: order.tickets },
                        order: order._id,
                        deletedAt: null,
                    }).select('_id code qrCode status ticketType holder price');

                    console.log(`🔔 [handleWebhook-payment] Confirmando ${tickets.length} ticket(s) do pedido ${order.orderNumber} (${order._id})`);

                    for (const ticket of tickets) {
                        if (String(ticket.order) !== String(order._id)) {
                            console.error(`⚠️ [handleWebhook-payment] ERRO CRÍTICO: Ticket ${ticket._id} não pertence ao pedido ${order._id}! Pulando...`);
                            continue;
                        }

                        if (ticket.status === 'pending' && !ticket.qrCode) {
                            const { generateQRCode } = await import('../services/qrCodeService');
                            ticket.status = 'confirmed';
                            ticket.qrCode = await generateQRCode(ticket.code);
                            await ticket.save();
                            console.log(`✅ [handleWebhook-payment] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`);
                        } else if (ticket.status === 'pending') {
                            ticket.status = 'confirmed';
                            await ticket.save();
                            console.log(`✅ [handleWebhook-payment] Ticket ${ticket._id} confirmado para pedido ${order.orderNumber}`);
                        }
                    }

                    if (!wasPaidBefore) {
                        await sendPaymentApprovedEmail(order);
                    }
                } else if (paymentStatus === 'failed') {
                    await sendPaymentRejectedEmailHelper(order, statusInfo.userMessage);
                }

                await order.save();

                console.log(`✅ Pedido ${order.orderNumber} atualizado via webhook:`, {
                    paymentId,
                    status: paymentInfo.status,
                    statusDetail: paymentInfo.status_detail,
                    internalStatus: paymentStatus,
                    userMessage: statusInfo.userMessage,
                    requiresAction: statusInfo.requiresAction,
                    canRetry: statusInfo.canRetry,
                    errorCode: paymentInfo.error_code,
                    errorDescription: paymentInfo.error_description,
                });

                // Marcar como processado no WebhookEvent (se enfileirado)
                try {
                    await WebhookEvent.updateOne(
                        { eventId },
                        { status: 'processed', processedAt: new Date(), attempts: queued?.attempts || 0 }
                    );
                } catch (err) {
                    console.warn('[Webhook] Falha ao marcar WebhookEvent como processed:', err);
                }
            } catch (error: any) {
                console.error('Erro ao processar webhook (payment):', error);
            }
        }
    } catch (error: any) {
        console.error('Erro ao processar webhook (geral):', error);

        // tentar marcar falha no WebhookEvent (se possível)
        try {
            const parsed = req.body || {};
            const type = parsed.type || parsed.topic;
            const data = parsed.data || {};
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
        // Não retornamos erro para o Mercado Pago porque já respondemos 200 OK anteriormente
    }
};