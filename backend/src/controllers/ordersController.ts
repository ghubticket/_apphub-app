import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order, Ticket, TicketType, Event, User } from '../models';
import { generateQRCode } from '../services/qrCodeService';
import * as reservationService from '../services/reservationService';

interface CreateOrderRequest {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
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
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id; // Do middleware authenticate
        const { eventId, ticketTypeId, quantity, customerData } = req.body as CreateOrderRequest;

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

        // Determinar se é VIP e calcular valores
        const isVIP = ticketType.isVIP;
        const ticketPrice = isVIP ? 0 : ticketType.price;
        const totalAmount = ticketPrice * quantity;
        const eventTicketFee = event.ticketFee || 0;
        const totalWithFee = totalAmount + (eventTicketFee * quantity);

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

        // Criar pedido
        const order = new Order({
            customer: userId || null,
            event: eventId,
            tickets: [], // Será preenchido após criar os tickets
            totalAmount: totalWithFee,
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

        await order.save();

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
                qrCode: '', // Será preenchido após gerar o código
            });

            // Salvar para gerar o código único (pre-save hook)
            await ticket.save();

            // Gerar QR Code com o código real do ticket
            const qrCode = await generateQRCode(ticket.code);
            ticket.qrCode = qrCode;
            await ticket.save();

            createdTickets.push(ticket);
        }

        // Atualizar pedido com os tickets
        order.tickets = createdTickets.map(t => t._id as mongoose.Types.ObjectId);
        await order.save();

        // Atualizar quantidade vendida do tipo de ingresso
        ticketType.soldQuantity += quantity;
        await ticketType.save();

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
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista pedidos do usuário autenticado
 */
export const listMyOrders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        const orders = await Order.find({ 
            customer: userId,
            deletedAt: null 
        })
            .populate('event', 'name date location coverImage')
            .populate('tickets', 'code status price')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: orders
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
 * Lista TODOS os pedidos (apenas ADMIN)
 */
export const listAllOrders = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find({ 
            deletedAt: null 
        })
            .populate('event', 'name date location coverImage')
            .populate('tickets', 'code qrCode status price ticketType')
            .populate('customer', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: orders
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
            .populate('tickets', 'code qrCode status price ticketType')
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

        res.json({
            success: true,
            data: order
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

