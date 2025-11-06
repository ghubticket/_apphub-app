import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import mongoose from 'mongoose';
import { Order, Ticket, TicketType, Event, User, PromoterCode } from '../models';
import { generateQRCode } from '../services/qrCodeService';
import * as reservationService from '../services/reservationService';

/**
 * Normaliza CPF removendo formatação (pontos e traços)
 */
const normalizeCPF = (cpf: string | undefined): string | null => {
    if (!cpf) return null;
    return cpf.replace(/\D/g, '');
};

/**
 * Normaliza Email para lowercase e trim
 */
const normalizeEmail = (email: string | undefined): string | null => {
    if (!email) return null;
    return email.trim().toLowerCase();
};

/**
 * Conta quantos ingressos um CPF/Email já comprou para um tipo específico
 * Considera apenas pedidos pagos (status = 'paid')
 */
const countPurchasedTicketsByCPFOrEmail = async (
    eventId: string,
    ticketTypeId: string,
    cpf?: string,
    email?: string
): Promise<number> => {
    const normalizedCPF = normalizeCPF(cpf);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedCPF && !normalizedEmail) {
        return 0;
    }

    // Construir filtros para buscar pedidos pagos do evento
    const orderFilters: any = {
        event: eventId,
        status: 'paid',
        deletedAt: null,
    };

    // Adicionar filtro por CPF ou Email
    if (normalizedCPF && normalizedEmail) {
        // Se ambos estão presentes, usar OR
        orderFilters.$or = [
            { 'customerData.cpf': { $regex: normalizedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') } },
            { 'customerData.email': normalizedEmail }
        ];
    } else if (normalizedCPF) {
        // Buscar por CPF (normalizado, mas comparar com formato do DB)
        // CPF no DB está no formato 000.000.000-00, então precisamos buscar de forma flexível
        const cpfFormatted = normalizedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        orderFilters['customerData.cpf'] = cpfFormatted;
    } else if (normalizedEmail) {
        orderFilters['customerData.email'] = normalizedEmail;
    }

    // Buscar pedidos pagos que correspondem ao CPF/Email
    const orders = await Order.find(orderFilters)
        .select('totalTickets customerData')
        .lean();

    // Agora verificar se os tickets desses pedidos são do tipo correto
    let totalPurchased = 0;
    for (const order of orders) {
        // Buscar tickets do pedido que são do tipo específico
        const tickets = await Ticket.countDocuments({
            order: order._id,
            ticketType: ticketTypeId,
            deletedAt: null,
        });
        
        totalPurchased += tickets;
    }

    return totalPurchased;
};

interface CreateOrderRequest {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    promoterCode?: string; // Código de promotor (opcional)
    customerData?: {
        name?: string;
        email?: string;
        phone?: string;
        cpf?: string;
    };
}

/**
 * Cria um novo pedido com ingressos
 * Para ingressos VIP: status = 'paid', paymentMethod = 'vip_free', tickets = 'confirmed'
 * Para outros: status = 'pending', aguarda pagamento
 */
export const createOrder = async (req: Request, res: Response) => {
    let session: mongoose.ClientSession | null = null;
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id; // Do middleware authenticate
        const { eventId, ticketTypeId, quantity, promoterCode, customerData } = req.body as CreateOrderRequest;

        // Validações básicas
        if (!eventId || !ticketTypeId || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: ['eventId, ticketTypeId e quantity são obrigatórios']
            });
        }

        if (quantity > 10) { // Limite razoável por pedido
            return res.status(400).json({
                success: false,
                message: 'Quantidade inválida',
                errors: ['Máximo de 10 ingressos por pedido']
            });
        }

        // Buscar evento e tipo de ingresso
        const event = await Event.findOne({ _id: eventId, deletedAt: null, isActive: true });
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado ou inativo'
            });
        }

        const ticketType = await TicketType.findOne({ _id: ticketTypeId, deletedAt: null, isActive: true });
        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado ou inativo'
            });
        }

        // Verificar se o tipo de ingresso pertence ao evento
        if (String(ticketType.event) !== String(eventId)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de ingresso não pertence a este evento'
            });
        }

        // Verificar disponibilidade usando o serviço de reservas
        const availableQuantity = await reservationService.getAvailableQuantity(eventId, ticketTypeId);
        if (availableQuantity < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade insuficiente',
                errors: [`Apenas ${availableQuantity} ingressos disponíveis`]
            });
        }

        // Verificar limite por compra
        if (quantity > ticketType.maxPerPurchase) {
            return res.status(400).json({
                success: false,
                message: 'Limite excedido',
                errors: [`Máximo de ${ticketType.maxPerPurchase} ingressos por compra`]
            });
        }

        // Buscar dados do usuário (se autenticado)
        let user = null;
        if (userId) {
            user = await User.findOne({ _id: userId, deletedAt: null });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }
        }

        // Preparar CPF e Email para validação (prioridade: customerData > user > null)
        const cpfToValidate = customerData?.cpf || user?.cpf;
        const emailToValidate = customerData?.email || user?.email;

        // Verificar limite acumulado por CPF (se configurado)
        if (ticketType.maxPerCPF && cpfToValidate) {
            const purchasedByCPF = await countPurchasedTicketsByCPFOrEmail(
                eventId,
                ticketTypeId,
                cpfToValidate,
                undefined
            );
            const totalAfterPurchase = purchasedByCPF + quantity;
            
            if (totalAfterPurchase > ticketType.maxPerCPF) {
                const remaining = Math.max(0, ticketType.maxPerCPF - purchasedByCPF);
                return res.status(400).json({
                    success: false,
                    message: 'Limite acumulado por CPF excedido',
                    errors: [
                        `Este CPF já comprou ${purchasedByCPF} ingresso(s) deste tipo. ` +
                        `Limite máximo: ${ticketType.maxPerCPF}. ` +
                        `Você pode comprar no máximo mais ${remaining} ingresso(s).`
                    ]
                });
            }
        }

        // Verificar limite acumulado por Email (se configurado)
        if (ticketType.maxPerEmail && emailToValidate) {
            const purchasedByEmail = await countPurchasedTicketsByCPFOrEmail(
                eventId,
                ticketTypeId,
                undefined,
                emailToValidate
            );
            const totalAfterPurchase = purchasedByEmail + quantity;
            
            if (totalAfterPurchase > ticketType.maxPerEmail) {
                const remaining = Math.max(0, ticketType.maxPerEmail - purchasedByEmail);
                return res.status(400).json({
                    success: false,
                    message: 'Limite acumulado por Email excedido',
                    errors: [
                        `Este Email já comprou ${purchasedByEmail} ingresso(s) deste tipo. ` +
                        `Limite máximo: ${ticketType.maxPerEmail}. ` +
                        `Você pode comprar no máximo mais ${remaining} ingresso(s).`
                    ]
                });
            }
        }

        // Determinar se é VIP e calcular valores
        const isVIP = ticketType.isVIP;
        const ticketPrice = isVIP ? 0 : ticketType.price;
        const subtotal = ticketPrice * quantity; // Valor sem taxa
        
        // Validar e aplicar desconto de código de promotor (se fornecido e não for VIP)
        let discountAmount = 0;
        let usedPromoterCode: string | undefined = undefined;
        
        if (promoterCode && !isVIP) {
            const code = await PromoterCode.findOne({
                code: promoterCode.toUpperCase().trim(),
                isActive: true,
                deletedAt: null,
                events: eventId
            });
            
            if (code) {
                usedPromoterCode = code.code;
                
                // Calcular desconto
                if (code.discountType === 'percentage') {
                    discountAmount = subtotal * (code.discountValue / 100);
                } else {
                    // Desconto fixo (limitado ao subtotal)
                    discountAmount = Math.min(code.discountValue, subtotal);
                }
            }
        }
        
        // Calcular taxa da plataforma (percentual sobre subtotal - desconto)
        const platformFeePercentage = event.platformFeePercentage || 0;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const platformFee = isVIP ? 0 : (subtotalAfterDiscount * (platformFeePercentage / 100)); // VIP não paga taxa
        const totalAmount = subtotalAfterDiscount + platformFee; // Total: (subtotal - desconto) + taxa

        // Determinar status e método de pagamento
        let orderStatus: 'pending' | 'paid' = 'pending';
        let paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free' | undefined = undefined;
        let ticketStatus: 'pending' | 'confirmed' = 'pending';

        if (isVIP) {
            // VIP: pedido pago automaticamente, sem gateway
            orderStatus = 'paid';
            paymentMethod = 'vip_free';
            ticketStatus = 'confirmed';
        } else {
            // Outros: aguarda pagamento (será integrado depois)
            orderStatus = 'pending';
            ticketStatus = 'pending';
        }

        // Iniciar transação (atomicidade)
        session = await mongoose.startSession();
        session.startTransaction();
        try {
        // Criar pedido
        const order = new Order({
            customer: userId || null,
            event: eventId,
            tickets: [], // Será preenchido após criar os tickets
            subtotal: subtotal,
            discountAmount: discountAmount,
            platformFee: platformFee,
            totalAmount: totalAmount,
            promoterCode: usedPromoterCode,
            totalTickets: quantity,
            status: orderStatus,
            paymentMethod: paymentMethod,
            paidAt: isVIP ? new Date() : undefined,
            customerData: {
                name: customerData?.name || user?.name || 'Não informado',
                email: customerData?.email || user?.email || 'Não informado',
                phone: customerData?.phone || user?.phone,
                cpf: customerData?.cpf || user?.cpf,
            },
        });

        await order.save({ session });
        
        // Incrementar contador de uso do código de promotor (se usado)
        if (usedPromoterCode) {
            await PromoterCode.updateOne(
                { code: usedPromoterCode },
                { $inc: { currentUses: 1 } },
                { session }
            );
        }

        // Criar tickets
        const createdTickets: any[] = [];
        for (let i = 0; i < quantity; i++) {
            const ticket = new Ticket({
                event: eventId,
                ticketType: ticketTypeId,
                order: order._id,
                holder: userId || null,
                price: ticketPrice,
                status: ticketStatus,
                qrCode: '', // Será preenchido APENAS se o pedido estiver pago/VIP
            });

            // Salvar para gerar o código único (pre-save hook)
            await ticket.save({ session });

            // ⚠️ SEGURANÇA: Gerar QR Code APENAS se o pedido estiver PAID ou for VIP
            // QR codes só devem ser gerados para ingressos confirmados (pedidos pagos)
            if (orderStatus === 'paid' || isVIP) {
                const qrCode = await generateQRCode(ticket.code);
                ticket.qrCode = qrCode;
                await ticket.save({ session });
            } else {
                // Para pedidos pendentes, deixar qrCode vazio
                ticket.qrCode = '';
                await ticket.save({ session });
            }

            createdTickets.push(ticket);
        }

        // Atualizar pedido com os tickets
        order.tickets = createdTickets.map(t => t._id as mongoose.Types.ObjectId);
        await order.save({ session });

        // Atualizar quantidade vendida do tipo de ingresso
        ticketType.soldQuantity += quantity;
        await ticketType.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Popular dados para resposta
        const populatedOrder = await Order.findById(order._id)
            .populate('event', 'name date location')
            .populate('tickets', 'code qrCode status price')
            .populate('customer', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: isVIP ? 'Pedido VIP criado com sucesso' : 'Pedido criado com sucesso. Aguardando pagamento.',
            data: {
                order: populatedOrder,
                isVIP,
                requiresPayment: !isVIP,
            }
        });

    } catch (error: any) {
        // Rollback seguro caso a transação tenha falhado
        if (session) {
            try { await session.abortTransaction(); } catch {}
            try { session.endSession(); } catch {}
        }
        console.error('Erro ao criar pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido',
            errors: [error?.message || 'Erro desconhecido']
        });
    }
    } catch (outerError: any) {
        console.error('Erro ao criar pedido (pré-transação):', outerError);
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido',
            errors: [outerError?.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista pedidos do usuário autenticado com paginação
 */
export const listMyOrders = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?._id?.toString() || user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        const { page = 1, limit = 10, search = '', status } = req.query as any;

        // Construir filtros
        const filters: any = { 
            customer: userId,
            deletedAt: null 
        };
        if (status && ['pending','paid','cancelled','refunded'].includes(String(status))) {
            filters.status = String(status);
        }

        if (search) {
            filters.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'customerData.name': { $regex: search, $options: 'i' } },
                { 'customerData.email': { $regex: search, $options: 'i' } }
            ];
        }

        // Calcular paginação
        const skip = (Number(page) - 1) * Number(limit);

        // Buscar pedidos com paginação
        const orders = await Order.find(filters)
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price',
                match: { deletedAt: null }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Contar total de pedidos
        const total = await Order.countDocuments(filters);

        // Remover QR codes de pedidos pendentes (segurança)
        const ordersWithFilteredQR = orders.map(order => ({
            ...order,
            tickets: order.tickets.map((ticket: any) => ({
                ...ticket,
                qrCode: order.status === 'paid' ? ticket.qrCode : null // Só retorna QR code se pedido estiver pago
            }))
        }));

        res.json({
            success: true,
            data: {
                orders: ordersWithFilteredQR,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error: any) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista TODOS os pedidos (apenas ADMIN) com paginação
 */
export const listAllOrders = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search = '', status } = req.query as any;

        // Construir filtros
        const filters: any = { deletedAt: null };

        if (search) {
            filters.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'customerData.name': { $regex: search, $options: 'i' } },
                { 'customerData.email': { $regex: search, $options: 'i' } }
            ];
        }
        if (status && ['pending','paid','cancelled','refunded'].includes(String(status))) {
            filters.status = String(status);
        }

        // Calcular paginação
        const skip = (Number(page) - 1) * Number(limit);

        // Buscar pedidos com paginação
        const orders = await Order.find(filters)
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType',
                match: { deletedAt: null }
            })
            .populate('customer', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Contar total de pedidos
        const total = await Order.countDocuments(filters);

        // Remover QR codes de pedidos pendentes (segurança)
        const ordersWithFilteredQR = orders.map(order => ({
            ...order,
            tickets: order.tickets.map((ticket: any) => ({
                ...ticket,
                qrCode: order.status === 'paid' ? ticket.qrCode : null // Só retorna QR code se pedido estiver pago
            }))
        }));

        res.json({
            success: true,
            data: {
                orders: ordersWithFilteredQR,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error: any) {
        console.error('Erro ao listar todos os pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Busca um pedido por ID
 */
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        const order = await Order.findOne({ 
            _id: id,
            deletedAt: null 
        })
            .populate('event', 'name date location coverImage squareImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType usedAt usedBy',
                match: { deletedAt: null },
                populate: [
                    { path: 'usedBy', select: 'name email' },
                    { path: 'ticketType', select: 'name price isVIP' }
                ]
            })
            .populate('customer', 'name email')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        // Verificar se o usuário tem permissão (admin ou dono do pedido)
        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOwner = String(order.customer) === String(userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // Remover QR codes de pedidos pendentes (segurança)
        const orderWithFilteredQR = {
            ...order,
            tickets: order.tickets.map((ticket: any) => ({
                ...ticket,
                qrCode: order.status === 'paid' ? ticket.qrCode : null // Só retorna QR code se pedido estiver pago
            }))
        };

        res.json({
            success: true,
            data: orderWithFilteredQR
        });

    } catch (error: any) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedido',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Cancela um pedido pendente e libera recursos (tickets/reservas)
 * Regras:
 * - Somente ADMIN ou dono do pedido
 * - Somente pedidos 'pending' podem ser cancelados aqui
 * - Pedidos 'paid' devem seguir fluxo de reembolso (não tratado aqui)
 */
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUser = (req as any).user;
        const userId = authUser?._id?.toString() || authUser?.id;

        // Buscar pedido
        const order = await Order.findOne({ _id: id, deletedAt: null });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        // Permissões: admin ou dono do pedido
        const isAdmin = authUser?.role === 'ADMIN';
        const isOwner = String(order.customer) === String(userId);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        if (order.status === 'cancelled') {
            return res.json({ success: true, message: 'Pedido já está cancelado' });
        }
        if (order.status === 'paid') {
            return res.status(400).json({ success: false, message: 'Pedido pago não pode ser cancelado aqui. Use reembolso.' });
        }

        // Se houver pagamento, primeiro consultar status no MP para evitar falso positivo
        if (order.paymentId) {
            try {
                const payment = await (paymentService as any).getPaymentById(order.paymentId)
                const mpStatus: string = (payment?.status || '').toLowerCase()
                if (mpStatus === 'approved') {
                    return res.status(400).json({ success: false, message: 'Pedido já aprovado no Mercado Pago; não é possível cancelar.' })
                }
                // Só tentar cancelar se ainda pendente/acionável
                if (['pending', 'in_process', 'action_required'].includes(mpStatus)) {
                    await (paymentService as any).cancelPaymentById(order.paymentId);
                    order.paymentStatus = 'cancelled';
                    order.paymentStatusDetail = order.paymentStatusDetail || 'cancelled';
                    order.paymentMessage = 'Pagamento cancelado no Mercado Pago.';
                }
            } catch (e) {
                // Se não conseguir cancelar no MP, prosseguir com cancel local
                console.warn('Não foi possível cancelar no Mercado Pago:', e);
            }
        }

        // Buscar tickets para obter ticketType e quantidade
        const tickets = await Ticket.find({ order: order._id, deletedAt: null }).populate('ticketType');
        
        // Agrupar por ticketType para liberar estoque corretamente
        const ticketTypeCounts = new Map<string, number>();
        for (const ticket of tickets) {
            const ticketTypeId = String((ticket as any).ticketType?._id || (ticket as any).ticketType);
            if (ticketTypeId) {
                ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1);
            }
        }

        // Liberar estoque para cada ticketType
        for (const [ticketTypeId, quantity] of ticketTypeCounts.entries()) {
            const ticketType = await TicketType.findById(ticketTypeId);
            if (ticketType && quantity > 0) {
                ticketType.soldQuantity = Math.max(0, ticketType.soldQuantity - quantity);
                await ticketType.save();
            }
        }

        // Cancelar pedido
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();

        // Atualizar tickets vinculados: cancelar e desativar
        await Ticket.updateMany(
            { order: order._id, deletedAt: null },
            { $set: { status: 'cancelled', isActive: false, qrCode: '' } }
        );

        // Segurança extra: nunca retornar QR de pedidos não pagos
        const safeTickets = tickets.map(t => ({ ...t.toObject(), qrCode: null }));

        return res.json({
            success: true,
            message: 'Pedido cancelado com sucesso',
            data: {
                order: { ...order.toObject(), status: 'cancelled' },
                tickets: safeTickets,
            },
        });
    } catch (error: any) {
        console.error('Erro ao cancelar pedido:', error);
        return res.status(500).json({ success: false, message: 'Erro ao cancelar pedido', errors: [error.message || 'Erro desconhecido'] });
    }
};

/**
 * Confirma pagamento de um pedido e gera QR codes para os ingressos
 * Este endpoint será chamado após confirmação de pagamento do gateway
 */
export const confirmPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { paymentId, paymentStatus } = req.body;

        // Buscar pedido
        const order = await Order.findOne({ 
            _id: id,
            deletedAt: null 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        // Verificar se o pedido já está pago
        if (order.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Pedido já está pago'
            });
        }

        // Verificar se o pedido está pendente
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Pedido não pode ser confirmado',
                errors: [`Status atual: ${order.status}. Apenas pedidos pendentes podem ser confirmados.`]
            });
        }

        // Atualizar status do pedido para pago
        order.status = 'paid';
        order.paidAt = new Date();
        if (paymentId) order.paymentId = paymentId;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        await order.save();

        // Buscar todos os tickets do pedido
        const tickets = await Ticket.find({ 
            order: order._id,
            deletedAt: null 
        });

        // Gerar QR codes para todos os tickets pendentes
        for (const ticket of tickets) {
            if (ticket.status === 'pending' && !ticket.qrCode) {
                // Atualizar status do ticket para confirmado
                ticket.status = 'confirmed';
                
                // Gerar QR Code
                const qrCode = await generateQRCode(ticket.code);
                ticket.qrCode = qrCode;
                
                await ticket.save();
            }
        }

        // Popular dados para resposta
        const populatedOrder = await Order.findById(order._id)
            .populate('event', 'name date location coverImage')
            .populate('tickets', 'code qrCode status price ticketType')
            .populate('customer', 'name email')
            .lean();

        res.json({
            success: true,
            message: 'Pagamento confirmado e QR codes gerados com sucesso',
            data: populatedOrder
        });

    } catch (error: any) {
        console.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao confirmar pagamento',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Obter estatísticas financeiras (apenas ADMIN)
 * Retorna: total de vendas (subtotal, sem taxa) e total de taxas da plataforma
 */
export const getFinancialStats = async (req: Request, res: Response) => {
    try {
        // Buscar todos os pedidos pagos (excluindo VIPs)
        const paidOrders = await Order.find({
            status: 'paid',
            paymentMethod: { $ne: 'vip_free' },
            deletedAt: null,
        }).select('subtotal discountAmount platformFee').lean();

        // Calcular totais
        let totalSales = 0; // Total de vendas para repassar ao dono (subtotal - desconto, SEM taxa)
        let totalFees = 0; // Total de taxas da plataforma

        for (const order of paidOrders) {
            // Subtotal após desconto = subtotal original - desconto
            // Esse é o valor que deve ser repassado ao dono do evento
            const subtotalAfterDiscount = (order.subtotal || 0) - (order.discountAmount || 0);
            totalSales += subtotalAfterDiscount;
            totalFees += Number(order.platformFee || 0);
        }

        return res.json({
            success: true,
            data: {
                totalSales, // Valor total das vendas (sem taxa)
                totalFees, // Valor total das taxas (recebível da plataforma)
                totalRevenue: totalSales + totalFees, // Total geral (para referência)
            }
        });
    } catch (error: any) {
        console.error('Erro ao buscar estatísticas financeiras:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas financeiras',
            errors: [error.message]
        });
    }
};