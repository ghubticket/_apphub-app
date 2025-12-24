import { Request, Response } from 'express';
import TicketType from '../models/TicketType';
import Event from '../models/Event';
import { captureControllerError } from '../utils/sentryErrorHandler';

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
            maxPerCPF,
            maxPerEmail,
            salesStart,
            salesEnd,
            allowInstallments,
            minInstallments,
            maxInstallments,
            isTransport,
            departureLocationId,
            transportOptions,
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

        // Verificar se já existe um lote com o mesmo número para este tipo de ingresso no evento
        // Permite ter "Pista Lote 1" e "VIP Lote 1" no mesmo evento
        const existingLot = await TicketType.findOne({
            event: eventId,
            name: name.trim(),
            lotNumber,
            isActive: true,
        });

        if (existingLot) {
            return res.status(400).json({
                success: false,
                message: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                errors: {
                    lotNumber: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                    name: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                },
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
            maxPerCPF: maxPerCPF || null,
            maxPerEmail: maxPerEmail || null,
            soldQuantity: 0,
            salesStart: salesStart ? new Date(salesStart) : undefined,
            salesEnd: salesEnd ? new Date(salesEnd) : undefined,
            allowInstallments: !!allowInstallments,
            minInstallments: minInstallments ?? null,
            maxInstallments: maxInstallments ?? null,
            isTransport: isTransport || false,
            departureLocationId: departureLocationId || null,
            transportOptions: transportOptions && Array.isArray(transportOptions) && transportOptions.length > 0 
                ? transportOptions.map((opt: any) => ({
                    date: opt.date?.trim() || '',
                    attraction: opt.attraction?.trim() || '',
                    departureLocations: Array.isArray(opt.departureLocations) 
                        ? opt.departureLocations.filter((loc: string) => loc?.trim()).map((loc: string) => loc.trim())
                        : [],
                })).filter((opt: any) => opt.date && opt.attraction && opt.departureLocations.length > 0)
                : undefined,
        });

        await ticketType.save();

        res.status(201).json({
            success: true,
            message: 'Tipo de ingresso criado com sucesso',
            data: ticketType,
        });
    } catch (error: any) {
        console.error('Erro ao criar tipo de ingresso:', error);

        // Extrair erros de validação do Mongoose
        const validationErrors: Record<string, string> = {};
        if (error.errors) {
            Object.keys(error.errors).forEach((key) => {
                validationErrors[key] = error.errors[key].message;
            });
        }

        // Se for erro de validação do Mongoose, retornar mensagens específicas
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(validationErrors).join(', ');
            return res.status(400).json({
                success: false,
                message: errorMessages || 'Erro de validação ao criar tipo de ingresso',
                errors: validationErrors,
            });
        }

        // Se for erro de índice duplicado (event + name + lotNumber)
        if (error.code === 11000) {
            const keyPattern = error.keyPattern || {};
            const keyValue = error.keyValue || {};

            // Se for o índice único composto (event + name + lotNumber)
            if (keyPattern.event && keyPattern.name && keyPattern.lotNumber) {
                const lotNumber = keyValue.lotNumber;
                const name = keyValue.name;
                return res.status(400).json({
                    success: false,
                    message: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                    errors: {
                        lotNumber: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                        name: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                    },
                });
            }

            // Para outros índices únicos
            const field = Object.keys(keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: error.message || 'Já existe um registro com esses dados',
                errors: { [field]: 'Este valor já está em uso' },
            });
        }

        // Se chegou aqui, é um erro inesperado - enviar ao Sentry
        captureControllerError(error, req, {
            controller: 'ticketTypesController',
            action: 'createTicketType',
            statusCode: 500,
            extra: {
                eventId: req.params?.eventId,
            },
        });

        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao criar tipo de ingresso',
            errors: validationErrors,
        });
    }
};

// Listar tipos de ingresso por evento
export const listTicketTypes = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { includeInactive } = req.query;

        const filter: any = {
            event: eventId,
            deletedAt: null, // Não mostrar tipos de ingresso deletados
        };
        if (includeInactive !== 'true') {
            filter.isActive = true;
        }

        const ticketTypes = await TicketType.find(filter)
            .select(
                'name description price isVIP lotNumber maxQuantity soldQuantity maxPerPurchase maxPerCPF maxPerEmail salesStart salesEnd isActive createdAt allowInstallments minInstallments maxInstallments isTransport departureLocationId transportOptions'
            )
            .sort({ lotNumber: 1 })
            .populate('event', 'name date')
            .lean();

        // Reconciliar soldQuantity com base em tickets CONFIRMADOS (evita divergência)
        const reconciled = await Promise.all(
            ticketTypes.map(async (tt: any) => {
                const confirmedCount = await (
                    await import('../models/Ticket')
                ).default.countDocuments({
                    ticketType: tt._id,
                    status: { $in: ['confirmed', 'used'] },
                    deletedAt: null,
                });
                // Como usamos .lean(), tt já é um objeto simples, não precisa de .toObject()
                return {
                    ...tt,
                    soldQuantity: confirmedCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: reconciled,
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

        const ticketType = await TicketType.findOne({
            _id: id,
            deletedAt: null, // Não mostrar tipos de ingresso deletados
        }).populate('event', 'name date');

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
            maxPerCPF,
            maxPerEmail,
            salesStart,
            salesEnd,
            allowInstallments,
            minInstallments,
            maxInstallments,
            isTransport,
            departureLocationId,
            transportOptions,
        } = req.body;

        const ticketType = await TicketType.findOne({
            _id: id,
            deletedAt: null, // Não atualizar tipos de ingresso deletados
        });

        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }

        // Se estiver mudando o número do lote ou o nome, verificar se já existe
        const finalName = name !== undefined ? name.trim() : ticketType.name;
        const finalLotNumber = lotNumber !== undefined ? lotNumber : ticketType.lotNumber;

        if (
            (lotNumber && lotNumber !== ticketType.lotNumber) ||
            (name && name.trim() !== ticketType.name)
        ) {
            const existingLot = await TicketType.findOne({
                event: ticketType.event,
                name: finalName,
                lotNumber: finalLotNumber,
                _id: { $ne: id },
                isActive: true,
            });

            if (existingLot) {
                return res.status(400).json({
                    success: false,
                    message: `Já existe um lote ${finalLotNumber} para o tipo de ingresso "${finalName}" neste evento`,
                    errors: {
                        lotNumber: `Já existe um lote ${finalLotNumber} para o tipo de ingresso "${finalName}" neste evento`,
                        name: `Já existe um lote ${finalLotNumber} para o tipo de ingresso "${finalName}" neste evento`,
                    },
                });
            }
        }

        // Se for VIP, garantir que preço seja 0
        const finalPrice = isVIP !== undefined ? (isVIP ? 0 : price) : ticketType.isVIP ? 0 : price;

        // Atualizar campos
        if (name !== undefined) ticketType.name = name;
        if (description !== undefined) ticketType.description = description;
        if (price !== undefined || isVIP !== undefined) ticketType.price = finalPrice;
        if (isVIP !== undefined) ticketType.isVIP = isVIP;
        if (lotNumber !== undefined) ticketType.lotNumber = lotNumber;
        if (maxQuantity !== undefined) ticketType.maxQuantity = maxQuantity;
        if (maxPerPurchase !== undefined) ticketType.maxPerPurchase = maxPerPurchase;
        if (maxPerCPF !== undefined) ticketType.maxPerCPF = maxPerCPF || null;
        if (maxPerEmail !== undefined) ticketType.maxPerEmail = maxPerEmail || null;
        if (salesStart !== undefined)
            ticketType.salesStart = salesStart ? new Date(salesStart) : undefined;
        if (salesEnd !== undefined) ticketType.salesEnd = salesEnd ? new Date(salesEnd) : undefined;
        if (allowInstallments !== undefined)
            ticketType.allowInstallments = !!allowInstallments;
        if (minInstallments !== undefined)
            ticketType.minInstallments = minInstallments ?? null;
        if (maxInstallments !== undefined)
            ticketType.maxInstallments = maxInstallments ?? null;
        if (isTransport !== undefined)
            ticketType.isTransport = isTransport || false;
        if (departureLocationId !== undefined)
            ticketType.departureLocationId = departureLocationId || null;
        if (transportOptions !== undefined) {
            if (transportOptions && Array.isArray(transportOptions) && transportOptions.length > 0) {
                ticketType.transportOptions = transportOptions.map((opt: any) => ({
                    date: opt.date?.trim() || '',
                    attraction: opt.attraction?.trim() || '',
                    departureLocations: Array.isArray(opt.departureLocations) 
                        ? opt.departureLocations.filter((loc: string) => loc?.trim()).map((loc: string) => loc.trim())
                        : [],
                })).filter((opt: any) => opt.date && opt.attraction && opt.departureLocations.length > 0);
            } else {
                ticketType.transportOptions = undefined;
            }
        }

        await ticketType.save();

        res.status(200).json({
            success: true,
            message: 'Tipo de ingresso atualizado com sucesso',
            data: ticketType,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar tipo de ingresso:', error);

        // Extrair erros de validação do Mongoose
        const validationErrors: Record<string, string> = {};
        if (error.errors) {
            Object.keys(error.errors).forEach((key) => {
                validationErrors[key] = error.errors[key].message;
            });
        }

        // Se for erro de validação do Mongoose, retornar mensagens específicas
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(validationErrors).join(', ');
            return res.status(400).json({
                success: false,
                message: errorMessages || 'Erro de validação ao atualizar tipo de ingresso',
                errors: validationErrors,
            });
        }

        // Se for erro de índice duplicado (event + name + lotNumber)
        if (error.code === 11000) {
            const keyPattern = error.keyPattern || {};
            const keyValue = error.keyValue || {};

            // Se for o índice único composto (event + name + lotNumber)
            if (keyPattern.event && keyPattern.name && keyPattern.lotNumber) {
                const lotNumber = keyValue.lotNumber;
                const name = keyValue.name;
                return res.status(400).json({
                    success: false,
                    message: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                    errors: {
                        lotNumber: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                        name: `Já existe um lote ${lotNumber} para o tipo de ingresso "${name}" neste evento`,
                    },
                });
            }

            // Para outros índices únicos
            const field = Object.keys(keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: error.message || 'Já existe um registro com esses dados',
                errors: { [field]: 'Este valor já está em uso' },
            });
        }

        res.status(400).json({
            success: false,
            message: error.message || 'Erro ao atualizar tipo de ingresso',
            errors: validationErrors,
        });
    }
};

// Deletar tipo de ingresso (soft delete)
export const deleteTicketType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const ticketType = await TicketType.findOne({
            _id: id,
            deletedAt: null, // Não atualizar tipos de ingresso deletados
        });

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

        // Soft delete: desativar e marcar data de exclusão
        ticketType.isActive = false;
        ticketType.deletedAt = new Date();
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

        const ticketType = await TicketType.findOne({
            _id: id,
            deletedAt: null, // Não atualizar tipos de ingresso deletados
        });

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

// Obter quantidade disponível de um tipo de ingresso
export const getAvailableQuantity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const ticketType = await TicketType.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!ticketType || !ticketType.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
                data: {
                    availableQuantity: 0,
                },
            });
        }

        // Pedidos PENDING já estão em soldQuantity, então availableQuantity já considera isso
        const availableQuantity = ticketType.availableQuantity;

        res.status(200).json({
            success: true,
            data: {
                availableQuantity,
                ticketTypeId: id,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter quantidade disponível',
        });
    }
};
