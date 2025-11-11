import { Request, Response } from 'express';
import { WebhookEvent, Order, Ticket, Event, User } from '../models';
import { enqueueOrGet } from '../services/webhookProcessorService';
import crypto from 'crypto';
import * as paymentService from '../services/paymentService';
import { mapPaymentMethod } from '../services/paymentService';
import { getPaymentStatusInfo, mapPaymentStatus } from '../utils/paymentStatusMapper';
import { 
    sendTicketConfirmationEmail, 
    sendPaymentRejectedEmail,
    sendPaymentConfirmedEmail,
    sendPaymentPendingEmail
} from '../services/emailTemplates';
import { generateTicketPDF } from '../services/pdfService';

/**
 * Valida e busca um pedido com verificações de segurança
 */
const validateAndGetOrder = async (orderId: string, userId: string, req: Request) => {
    const order = await Order.findOne({ _id: orderId, deletedAt: null })
        .populate('event', 'name description')
        .populate('tickets', 'ticketType')
        .populate('customer', 'name email phone cpf');

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
        (customerEmail && requestUserEmail && customerEmail.toLowerCase() === requestUserEmail.toLowerCase());

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
            const existingPayment = await paymentService.getPaymentById(order.paymentId) as any;
            if (existingPayment.payment_method_id === 'pix' && existingPayment.date_of_expiration) {
                const isExpired = paymentService.isPixPaymentExpired(existingPayment.date_of_expiration);
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
        const tickets = await Ticket.find({ _id: { $in: order.tickets } })
            .populate('ticketType', 'name price');

        const description = tickets
            .map(t => `${(t as any).ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`)
            .join(', ') || `Pedido ${order.orderNumber}`;

        // Preparar items para additional_info (melhora taxa de aprovação)
        const items = tickets.map(ticket => ({
            title: `${(ticket as any).ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`,
            description: `Ingresso para ${(order as any).event?.name || 'Evento'}`,
            quantity: 1,
            unit_price: (ticket as any).ticketType?.price || 0,
            category: 'tickets' // Categoria para eventos/ingressos
        }));

        // Obter Device ID do header (X-meli-session-id) ou do body
        const deviceId = (req.headers['x-meli-session-id'] as string) || req.body.deviceId;
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'DeviceId é obrigatório para criar pagamento',
                errors: ['Envie X-meli-session-id no header ou deviceId no body']
            });
        }

        // Mock de email para sandbox (apenas em desenvolvimento)
        // Em sandbox, o email deve terminar com @testuser.com
        let customerEmail = order.customerData.email;
        if (process.env.NODE_ENV !== 'production' && !customerEmail.endsWith('@testuser.com')) {
            // Extrair o nome do email original (antes do @) e adicionar @testuser.com
            const emailName = customerEmail.split('@')[0] || 'test';
            customerEmail = `${emailName}@testuser.com`;
            console.log(`🔧 MOCK: Email alterado de "${order.customerData.email}" para "${customerEmail}" (sandbox)`);
        }

        // Criar pagamento PIX
        const pixPayment = await paymentService.createPixPayment({
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            customerData: {
                name: order.customerData.name,
                email: customerEmail, // Email mockado para sandbox
                cpf: order.customerData.cpf || '',
                phone: order.customerData.phone
                // Endereço pode ser adicionado se disponível no Order
            },
            description,
            items
        }, deviceId);

        // Obter informações completas do status
        const statusInfo = getPaymentStatusInfo(pixPayment.status, pixPayment.statusDetail || '');

        // Atualizar pedido com informações completas do pagamento (Orders API)
        // Salvar orderId do Mercado Pago se disponível
        if (pixPayment.orderId) {
            order.paymentOrderId = pixPayment.orderId;
        }
        order.paymentId = pixPayment.paymentId;
        order.paymentStatus = pixPayment.status;
        order.paymentStatusDetail = pixPayment.statusDetail;
        order.paymentMessage = statusInfo.userMessage;
        order.paymentAdminMessage = statusInfo.adminMessage;
        order.paymentMethod = 'pix';

        // Atualizar status interno se necessário
        if (statusInfo.internalStatus === 'paid') {
            order.status = 'paid';
            order.paidAt = new Date();
        }

        await order.save();

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
                        minute: '2-digit'
                    });

                    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
                    await sendPaymentPendingEmail(
                        customerEmail,
                        {
                            customerName: customerName || 'Cliente',
                            orderNumber: order.orderNumber,
                            eventName: event.name,
                            eventDate,
                            eventLocation: event.location,
                            totalAmount: `R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`,
                            paymentMethod: 'PIX',
                            expirationMinutes: pixPayment.expirationMinutes || 15,
                            pixQrCode: pixPayment.qrCodeBase64 ? `data:image/png;base64,${pixPayment.qrCodeBase64}` : pixPayment.qrCode,
                            pixCode: pixPayment.ticketUrl, // Código PIX para copiar e colar
                            paymentLink: `${dashboardUrl}/orders/${order._id}`
                        }
                    );

                    console.log(`✅ Email de pagamento pendente (PIX) enviado para ${customerEmail}`);
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
            expiresAt: pixPayment.expiresAt
        });

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
                    internalStatus: statusInfo.internalStatus
                }
            }
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
                details: error.errors[0]?.details || error.errors.map((e: any) => e.message || e.code)
            };
            errorMessage = error.errors[0]?.message || errorMessage;
        } else if (error.response?.data?.errors) {
            errorDetails = {
                code: error.response.data.errors[0]?.code,
                message: error.response.data.errors[0]?.message,
                details: error.response.data.errors[0]?.details || error.response.data.errors.map((e: any) => e.message || e.code)
            };
            errorMessage = error.response.data.errors[0]?.message || errorMessage;
        }
        
        return res.status(400).json({
            success: false,
            message: errorMessage,
            errors: errorDetails ? [errorDetails.message] : [errorMessage],
            errorDetails: errorDetails // Incluir detalhes completos do erro
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
    try {
        const { orderId } = req.params;
        const { token, installments, paymentMethodId, issuerId } = req.body;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        // Validações básicas
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token do cartão é obrigatório',
                errors: ['Token é obrigatório']
            });
        }

        if (!paymentMethodId) {
            return res.status(400).json({
                success: false,
                message: 'Método de pagamento é obrigatório',
                errors: ['paymentMethodId é obrigatório']
            });
        }

        // Validar e buscar pedido
        const order = await validateAndGetOrder(orderId, userId, req);

        // Buscar tickets para descrição e items
        const tickets = await Ticket.find({ _id: { $in: order.tickets } })
            .populate('ticketType', 'name price');

        const description = tickets
            .map(t => `${(t as any).ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`)
            .join(', ') || `Pedido ${order.orderNumber}`;

        // Preparar items para additional_info (melhora taxa de aprovação)
        const items = tickets.map(ticket => ({
            title: `${(ticket as any).ticketType?.name || 'Ingresso'} - ${(order as any).event?.name || 'Evento'}`,
            description: `Ingresso para ${(order as any).event?.name || 'Evento'}`,
            quantity: 1,
            unit_price: (ticket as any).ticketType?.price || 0,
            category: 'tickets' // Categoria para eventos/ingressos
        }));

        // Obter Device ID do header (X-meli-session-id) ou do body
        const deviceId = (req.headers['x-meli-session-id'] as string) || req.body.deviceId;
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'DeviceId é obrigatório para criar pagamento',
                errors: ['Envie X-meli-session-id no header ou deviceId no body']
            });
        }

        // Mock de email para sandbox (apenas em desenvolvimento)
        // Em sandbox, o email deve terminar com @testuser.com
        let customerEmail = order.customerData.email;
        if (process.env.NODE_ENV !== 'production' && !customerEmail.endsWith('@testuser.com')) {
            // Extrair o nome do email original (antes do @) e adicionar @testuser.com
            const emailName = customerEmail.split('@')[0] || 'test';
            customerEmail = `${emailName}@testuser.com`;
            console.log(`🔧 MOCK: Email alterado de "${order.customerData.email}" para "${customerEmail}" (sandbox)`);
        }

        // Criar pagamento com cartão
        const cardPayment = await paymentService.createCardPayment({
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
                phone: order.customerData.phone
                // Endereço pode ser adicionado se disponível no Order
            },
            items
        }, deviceId);

        // Obter informações completas do status
        const statusInfo = getPaymentStatusInfo(cardPayment.status, cardPayment.statusDetail || '');
        const paymentStatus = statusInfo.internalStatus;
        const paymentMethod = mapPaymentMethod(
            cardPayment.paymentTypeId || 'credit_card',
            cardPayment.paymentMethodId
        );

        // Atualizar pedido com informações completas
        order.paymentId = cardPayment.paymentId;
        order.paymentStatus = cardPayment.status;
        order.paymentStatusDetail = cardPayment.statusDetail;
        order.paymentMessage = statusInfo.userMessage;
        order.paymentAdminMessage = statusInfo.adminMessage;
        order.paymentMethod = paymentMethod;

        // Se pagamento aprovado, atualizar status e tickets
        if (paymentStatus === 'paid') {
            order.status = 'paid';
            order.paidAt = cardPayment.dateApproved ? new Date(cardPayment.dateApproved) : new Date();

            // Confirmar tickets
            await Ticket.updateMany(
                { _id: { $in: order.tickets } },
                {
                    $set: {
                        status: 'confirmed',
                        confirmedAt: new Date()
                    }
                }
            );
        }

        await order.save();

        // Enviar email de pagamento pendente se não foi aprovado imediatamente
        // (Se foi aprovado, o webhook enviará o email de confirmação)
        if (paymentStatus !== 'paid') {
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
                            minute: '2-digit'
                        });

                        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
                        await sendPaymentPendingEmail(
                            customerEmail,
                            {
                                customerName: customerName || 'Cliente',
                                orderNumber: order.orderNumber,
                                eventName: event.name,
                                eventDate,
                                eventLocation: event.location,
                                totalAmount: `R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`,
                                paymentMethod: paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito',
                                expirationMinutes: 15, // Cartão geralmente processa rápido, mas mantemos 15min como padrão
                                paymentLink: `${dashboardUrl}/orders/${order._id}`
                            }
                        );

                        console.log(`✅ Email de pagamento pendente (Cartão) enviado para ${customerEmail}`);
                    }
                }
            } catch (emailError) {
                console.error('Erro ao enviar email de pagamento pendente (Cartão):', emailError);
                // Não falhar a criação do pagamento se o email falhar
            }
        }

        // Log detalhado
        console.log(`💳 Pedido ${order.orderNumber} - Cartão processado:`, {
            paymentId: cardPayment.paymentId,
            status: cardPayment.status,
            statusDetail: cardPayment.statusDetail,
            userMessage: statusInfo.userMessage,
            requiresAction: statusInfo.requiresAction,
            canRetry: statusInfo.canRetry
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
                    internalStatus: statusInfo.internalStatus
                },
                // Se precisar de 3D Secure, retornar informações
                threeDSInfo: cardPayment.threeDSInfo
            }
        });
    } catch (error: any) {
        console.error('Erro ao criar pagamento com cartão:', error);
        
        // Extrair informações detalhadas do erro do Mercado Pago
        let errorDetails: any = null;
        let errorMessage = error.message || 'Erro ao processar pagamento com cartão';
        
        // Se o erro tem informações estruturadas do Mercado Pago
        if (error.errors && Array.isArray(error.errors)) {
            errorDetails = {
                code: error.errors[0]?.code,
                message: error.errors[0]?.message,
                details: error.errors[0]?.details || error.errors.map((e: any) => e.message || e.code)
            };
            errorMessage = error.errors[0]?.message || errorMessage;
        } else if (error.response?.data?.errors) {
            errorDetails = {
                code: error.response.data.errors[0]?.code,
                message: error.response.data.errors[0]?.message,
                details: error.response.data.errors[0]?.details || error.response.data.errors.map((e: any) => e.message || e.code)
            };
            errorMessage = error.response.data.errors[0]?.message || errorMessage;
        }
        
        return res.status(400).json({
            success: false,
            message: errorMessage,
            errors: errorDetails ? [errorDetails.message] : [errorMessage],
            errorDetails: errorDetails // Incluir detalhes completos do erro
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
        const ticketsWithQR = tickets.filter(t => t.qrCode);

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
                address: event.address
            },
            orderNumber: populatedOrder.orderNumber,
            customerName: customer.name,
            tickets: ticketsWithQR.map(t => ({
                code: t.code,
                qrCode: t.qrCode,
                ticketType: (t.ticketType as any)?.name || 'Ingresso',
                holderName: (t.holder as any)?.name || customer.name
            }))
        });

        // Formatar data do evento
        const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Preparar QR codes para exibição no email
        const qrCodesForEmail = ticketsWithQR.map(t => ({
            code: t.code,
            qrCode: t.qrCode, // Já está em base64 data URL
            holderName: (t.holder as any)?.name || customer.name
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
                qrCodes: qrCodesForEmail
            },
            [{
                filename: `ingressos-${populatedOrder.orderNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
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
            minute: '2-digit'
        });

        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
        await sendPaymentRejectedEmail(
            customer.email,
            {
                customerName: customer.name,
                orderNumber: populatedOrder.orderNumber,
                eventName: event.name,
                eventDate,
                eventLocation: event.location,
                totalAmount: `R$ ${populatedOrder.totalAmount.toFixed(2).replace('.', ',')}`,
                paymentMethod: populatedOrder.paymentMethod || 'Não informado',
                rejectionReason: rejectionReason || populatedOrder.paymentMessage || 'Pagamento recusado',
                retryLink: `${dashboardUrl}/orders/${populatedOrder._id}`
            }
        );

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

        // Assinatura obrigatória em produção
        const secret = process.env.MP_WEBHOOK_SECRET?.trim();
        const sigHeader = (req.headers['x-signature'] as string) || (req.headers['x-hub-signature-256'] as string);
        if ((process.env.NODE_ENV || 'development') === 'production') {
            if (!secret) return res.status(500).send('Webhook secret not configured');
            if (!sigHeader) return res.status(401).send('Missing signature');
        }
        let signatureValid = false;
        if (secret && sigHeader) {
            const expected = crypto
                .createHmac('sha256', secret)
                .update((req as any).rawBody || Buffer.from(JSON.stringify(req.body)))
                .digest('hex');
            const provided = sigHeader.replace(/^sha256=/i, '').trim();
            try {
                signatureValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
            } catch {
                signatureValid = false;
            }
            if ((process.env.NODE_ENV || 'development') === 'production' && !signatureValid) {
                return res.status(401).send('Invalid signature');
            }
        }

        // Idempotência persistente (DB) + enfileiramento
        const eventId = `${type}:${data?.id || 'unknown'}`;
        const queued = await enqueueOrGet(eventId, type, req.body, req.headers as any, sigHeader, !!signatureValid);
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
                const orderInfo = await paymentService.getOrderById(mpOrderId) as any;
                
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
                order.paymentId = paymentInfo.id;
                order.paymentStatus = paymentInfo.status;
                order.paymentStatusDetail = paymentInfo.status_detail;
                order.paymentMessage = statusInfo.userMessage;
                order.paymentAdminMessage = statusInfo.adminMessage;
                
                // Mapear status interno para status do Order
                if (paymentStatus === 'paid') {
                    order.status = 'paid';
                } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
                    order.status = 'cancelled';
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
                    order.paidAt = paymentInfo.date_approved ? new Date(paymentInfo.date_approved) : new Date();

                    // Atualizar status dos tickets para 'confirmed' e gerar QR codes se necessário
                    const tickets = await Ticket.find({ _id: { $in: order.tickets }, deletedAt: null });
                    for (const ticket of tickets) {
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

                    // Enviar email de confirmação com PDF
                    await sendPaymentApprovedEmail(order);
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
                    canRetry: statusInfo.canRetry
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
            const paymentInfo = await paymentService.getPaymentById(paymentId) as any;

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
            if (paymentStatus === 'paid') {
                order.status = 'paid';
            } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
                order.status = 'cancelled';
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
                order.paidAt = paymentInfo.date_approved ? new Date(paymentInfo.date_approved) : new Date();

                // Atualizar status dos tickets para 'confirmed' e gerar QR codes se necessário
                const tickets = await Ticket.find({ _id: { $in: order.tickets }, deletedAt: null });
                for (const ticket of tickets) {
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

                // Enviar email de confirmação com PDF
                await sendPaymentApprovedEmail(order);
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
                errorDescription: paymentInfo.error_description
            });
            // Marcar como processado
            await WebhookEvent.updateOne({ eventId }, { status: 'processed', processedAt: new Date(), attempts: (queued.attempts || 0) });
        }
    } catch (error: any) {
        console.error('Erro ao processar webhook:', error);
        // Marcar falha e agendar retry
        try {
            const { type, data } = req.body;
            const eventId = `${type}:${data?.id || 'unknown'}`;
            await WebhookEvent.updateOne(
                { eventId },
                { $set: { status: 'failed', lastError: error?.message || 'unknown' }, $inc: { attempts: 1 } },
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

        const paymentInfo = await paymentService.getPaymentById(paymentId) as any;

        if (!paymentInfo) {
            return res.status(404).json({
                success: false,
                message: 'Pagamento não encontrado'
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
                dateCreated: paymentInfo.date_created,
                // Para PIX, verificar expiração
                isExpired: paymentInfo.payment_method_id === 'pix' && paymentInfo.date_of_expiration
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
                    internalStatus: statusInfo.internalStatus
                },
                // Informações de erro se houver
                error: paymentInfo.error_code ? {
                    code: paymentInfo.error_code,
                    description: paymentInfo.error_description,
                    message: paymentInfo.message
                } : null
            }
        });
    } catch (error: any) {
        console.error('Erro ao buscar status do pagamento:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar status do pagamento',
            errors: [error.message || 'Erro desconhecido']
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
                message: 'Pedido não encontrado'
            });
        }

        // Verificar permissão
        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOwner = String(order.customer) === String(userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar este pedido'
            });
        }

        // Se não tem paymentId, retornar status do pedido
        if (!order.paymentId) {
            return res.json({
                success: true,
                data: {
                    orderStatus: order.status,
                    paymentStatus: null,
                    paymentId: null
                }
            });
        }

        // Buscar status do pagamento no Mercado Pago
        try {
            const paymentInfo = await paymentService.getPaymentById(order.paymentId) as any;

            // Obter informações completas do status
            const statusInfo = getPaymentStatusInfo(
                paymentInfo.status,
                paymentInfo.status_detail || ''
            );

            // Atualizar pedido com informações mais recentes se necessário
            if (order.paymentStatus !== paymentInfo.status || order.paymentStatusDetail !== paymentInfo.status_detail) {
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
                    isExpired: paymentInfo.payment_method_id === 'pix' && paymentInfo.date_of_expiration
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
                        internalStatus: statusInfo.internalStatus
                    },
                    // Informações de erro se houver
                    error: paymentInfo.error_code || order.paymentErrorCode ? {
                        code: paymentInfo.error_code || order.paymentErrorCode,
                        description: paymentInfo.error_description || order.paymentErrorDescription,
                        message: paymentInfo.message
                    } : null
                }
            });
        } catch (error: any) {
            // Se não conseguir buscar no MP, retornar status do pedido (com informações salvas)
            const savedStatusInfo = order.paymentStatus && order.paymentStatusDetail
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
                    statusInfo: savedStatusInfo ? {
                        userMessage: order.paymentMessage || savedStatusInfo.userMessage,
                        adminMessage: order.paymentAdminMessage || savedStatusInfo.adminMessage,
                        color: savedStatusInfo.color,
                        requiresAction: savedStatusInfo.requiresAction,
                        canRetry: savedStatusInfo.canRetry,
                        internalStatus: savedStatusInfo.internalStatus
                    } : null,
                    // Informações de erro se houver
                    error: order.paymentErrorCode ? {
                        code: order.paymentErrorCode,
                        description: order.paymentErrorDescription
                    } : null,
                    note: 'Não foi possível buscar status atualizado do Mercado Pago. Exibindo informações salvas.'
                }
            });
        }
    } catch (error: any) {
        console.error('Erro ao buscar status do pagamento do pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar status do pagamento',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};
