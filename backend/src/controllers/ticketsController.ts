import { Request, Response } from 'express';
import { Ticket, TicketType, Event, Order, User } from '../models';

/**
 * Busca um ticket por código (para validação de QR code)
 */
export const getTicketByCode = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        if (!code || code.length !== 12) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido',
                errors: ['Código deve ter 12 caracteres']
            });
        }

        const ticket = await Ticket.findOne({ 
            code: code.toUpperCase(),
            deletedAt: null 
        })
            .populate('event', 'name date location')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .populate('holder', 'name email')
            .lean();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ingresso não encontrado'
            });
        }

        res.json({
            success: true,
            data: ticket
        });

    } catch (error: any) {
        console.error('Erro ao buscar ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ingresso',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Valida um ingresso (marca como usado)
 * Apenas usuários com role QRCODE podem validar
 */
export const validateTicket = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const validatorId = (req as any).user?._id?.toString() || (req as any).user?.id;
        const validatorRole = (req as any).user?.role;

        // Verificar permissão (apenas QRCODE ou ADMIN)
        if (validatorRole !== 'QRCODE' && validatorRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas usuários QRCODE podem validar ingressos']
            });
        }

        if (!code || code.length !== 12) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido',
                errors: ['Código deve ter 12 caracteres']
            });
        }

        const ticket = await Ticket.findOne({ 
            code: code.toUpperCase(),
            deletedAt: null 
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ingresso não encontrado'
            });
        }

        // Verificar se o ingresso está confirmado
        if (ticket.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Ingresso não confirmado',
                errors: [`Status atual: ${ticket.status}. Apenas ingressos confirmados podem ser validados.`]
            });
        }

        // Verificar se o pedido está pago
        const order = await Order.findById(ticket.order);
        if (!order || order.status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Pedido não pago',
                errors: ['Ingresso não pode ser validado pois o pedido não está pago']
            });
        }

        // Verificar se o evento ainda está ativo
        const event = await Event.findById(ticket.event);
        if (!event || !event.isActive || event.deletedAt) {
            return res.status(400).json({
                success: false,
                message: 'Evento não disponível',
                errors: ['Evento não está ativo ou foi cancelado']
            });
        }

        // ⚠️ PROTEÇÃO CONTRA RACE CONDITION: Usar operação atômica
        // Tenta atualizar APENAS se o status ainda for 'confirmed'
        // Isso garante que apenas uma validação seja aceita
        const updatedTicket = await Ticket.findOneAndUpdate(
            {
                _id: ticket._id,
                code: code.toUpperCase(),
                status: 'confirmed', // Só atualiza se ainda estiver 'confirmed'
                deletedAt: null
            },
            {
                $set: {
                    status: 'used',
                    usedAt: new Date(),
                    usedBy: validatorId,
                    validatedAt: new Date()
                }
            },
            {
                new: true, // Retorna o documento atualizado
                runValidators: true
            }
        );

        // Se não encontrou o ticket ou não conseguiu atualizar, significa que já foi usado
        if (!updatedTicket) {
            // Buscar novamente para pegar os dados atualizados
            const currentTicket = await Ticket.findById(ticket._id);
            
            if (currentTicket?.status === 'used') {
                return res.status(400).json({
                    success: false,
                    message: 'Ingresso já utilizado',
                    errors: [
                        `Ingresso usado em: ${currentTicket.usedAt?.toLocaleString('pt-BR')}`,
                        `Validado por: ${currentTicket.usedBy ? 'Usuário QRCODE' : 'Sistema'}`
                    ]
                });
            }

            return res.status(409).json({
                success: false,
                message: 'Conflito na validação',
                errors: ['Ingresso foi validado por outro usuário simultaneamente. Tente novamente.']
            });
        }

        // Popular dados para resposta (usar o ticket atualizado)
        const populatedTicket = await Ticket.findById(updatedTicket._id)
            .populate('event', 'name date location')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber')
            .populate('holder', 'name email')
            .populate('usedBy', 'name email')
            .lean();

        res.json({
            success: true,
            message: 'Ingresso validado com sucesso',
            data: populatedTicket
        });

    } catch (error: any) {
        console.error('Erro ao validar ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar ingresso',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista ingressos do usuário autenticado
 */
export const listMyTickets = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        const tickets = await Ticket.find({ 
            holder: userId,
            deletedAt: null 
        })
            .populate('event', 'name date location coverImage')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: tickets
        });

    } catch (error: any) {
        console.error('Erro ao listar ingressos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar ingressos',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista ingressos de um evento (apenas ADMIN)
 */
export const listEventTickets = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const userRole = (req as any).user?.role;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas ADMIN pode listar ingressos de eventos']
            });
        }

        const tickets = await Ticket.find({ 
            event: eventId,
            deletedAt: null 
        })
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .populate('holder', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: tickets
        });

    } catch (error: any) {
        console.error('Erro ao listar ingressos do evento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar ingressos do evento',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

