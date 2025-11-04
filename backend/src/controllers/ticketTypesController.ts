import { Request, Response } from 'express';
import TicketType from '../models/TicketType';
import Event from '../models/Event';

// Criar tipo de ingresso
export const createTicketType = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const {
            name,
            description,
            price,
            isVIP,
            lotNumber,
            maxQuantity,
            maxPerPurchase,
            salesStart,
            salesEnd,
        } = req.body;

        // Verificar se o evento existe
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
            });
        }

        // Se for VIP, garantir que preço seja 0
        const finalPrice = isVIP ? 0 : price;

        // Verificar se já existe um lote com o mesmo número para este evento
        const existingLot = await TicketType.findOne({
            event: eventId,
            lotNumber,
            isActive: true,
        });

        if (existingLot) {
            return res.status(400).json({
                success: false,
                message: `Já existe um lote ${lotNumber} para este evento`,
            });
        }

        // Criar tipo de ingresso
        const ticketType = new TicketType({
            name,
            description,
            event: eventId,
            price: finalPrice,
            isVIP: isVIP || false,
            lotNumber,
            maxQuantity,
            maxPerPurchase,
            soldQuantity: 0,
            salesStart: salesStart ? new Date(salesStart) : undefined,
            salesEnd: salesEnd ? new Date(salesEnd) : undefined,
        });

        await ticketType.save();

        res.status(201).json({
            success: true,
            message: 'Tipo de ingresso criado com sucesso',
            data: ticketType,
        });
    } catch (error: any) {
        console.error('Erro ao criar tipo de ingresso:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Erro ao criar tipo de ingresso',
            errors: error.errors || {},
        });
    }
};

// Listar tipos de ingresso por evento
export const listTicketTypes = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { includeInactive } = req.query;

        const filter: any = { event: eventId };
        if (includeInactive !== 'true') {
            filter.isActive = true;
        }

        const ticketTypes = await TicketType.find(filter)
            .sort({ lotNumber: 1 })
            .populate('event', 'name date');

        res.status(200).json({
            success: true,
            data: ticketTypes,
        });
    } catch (error: any) {
        console.error('Erro ao listar tipos de ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar tipos de ingresso',
        });
    }
};

// Obter tipo de ingresso por ID
export const getTicketType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const ticketType = await TicketType.findById(id).populate('event', 'name date');

        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }

        res.status(200).json({
            success: true,
            data: ticketType,
        });
    } catch (error: any) {
        console.error('Erro ao obter tipo de ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter tipo de ingresso',
        });
    }
};

// Atualizar tipo de ingresso
export const updateTicketType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            price,
            isVIP,
            lotNumber,
            maxQuantity,
            maxPerPurchase,
            salesStart,
            salesEnd,
        } = req.body;

        const ticketType = await TicketType.findById(id);

        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }

        // Se estiver mudando o número do lote, verificar se já existe
        if (lotNumber && lotNumber !== ticketType.lotNumber) {
            const existingLot = await TicketType.findOne({
                event: ticketType.event,
                lotNumber,
                _id: { $ne: id },
                isActive: true,
            });

            if (existingLot) {
                return res.status(400).json({
                    success: false,
                    message: `Já existe um lote ${lotNumber} para este evento`,
                });
            }
        }

        // Se for VIP, garantir que preço seja 0
        const finalPrice = isVIP !== undefined ? (isVIP ? 0 : price) : (ticketType.isVIP ? 0 : price);

        // Atualizar campos
        if (name !== undefined) ticketType.name = name;
        if (description !== undefined) ticketType.description = description;
        if (price !== undefined || isVIP !== undefined) ticketType.price = finalPrice;
        if (isVIP !== undefined) ticketType.isVIP = isVIP;
        if (lotNumber !== undefined) ticketType.lotNumber = lotNumber;
        if (maxQuantity !== undefined) ticketType.maxQuantity = maxQuantity;
        if (maxPerPurchase !== undefined) ticketType.maxPerPurchase = maxPerPurchase;
        if (salesStart !== undefined) ticketType.salesStart = salesStart ? new Date(salesStart) : undefined;
        if (salesEnd !== undefined) ticketType.salesEnd = salesEnd ? new Date(salesEnd) : undefined;

        await ticketType.save();

        res.status(200).json({
            success: true,
            message: 'Tipo de ingresso atualizado com sucesso',
            data: ticketType,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar tipo de ingresso:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Erro ao atualizar tipo de ingresso',
            errors: error.errors || {},
        });
    }
};

// Deletar tipo de ingresso (soft delete)
export const deleteTicketType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const ticketType = await TicketType.findById(id);

        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }

        // Verificar se há ingressos vendidos
        // TODO: Implementar verificação quando o modelo Ticket estiver completo
        // const soldTickets = await Ticket.countDocuments({ ticketType: id, status: { $ne: 'cancelled' } });
        // if (soldTickets > 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Não é possível deletar tipo de ingresso com ingressos vendidos',
        //     });
        // }

        // Soft delete
        ticketType.isActive = false;
        await ticketType.save();

        res.status(200).json({
            success: true,
            message: 'Tipo de ingresso deletado com sucesso',
        });
    } catch (error: any) {
        console.error('Erro ao deletar tipo de ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar tipo de ingresso',
        });
    }
};

// Atualizar status do tipo de ingresso
export const updateTicketTypeStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const ticketType = await TicketType.findById(id);

        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }

        ticketType.isActive = isActive !== undefined ? isActive : !ticketType.isActive;
        await ticketType.save();

        res.status(200).json({
            success: true,
            message: 'Status do tipo de ingresso atualizado com sucesso',
            data: ticketType,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar status do tipo de ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status do tipo de ingresso',
        });
    }
};

