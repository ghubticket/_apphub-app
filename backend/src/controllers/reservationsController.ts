import { Request, Response } from 'express';
import * as reservationService from '../services/reservationService';
import TicketReservation from '../models/TicketReservation';

// Criar reserva temporária
export const createReservation = async (req: Request, res: Response) => {
    try {
        const { eventId, ticketTypeId, quantity } = req.body;
        // Obter sessionId do header ou gerar um novo
        const sessionId =
            (req.headers['x-session-id'] as string) || `session_${Date.now()}_${Math.random()}`;

        console.log('[createReservation] 📥 Requisição recebida:', {
            eventId,
            ticketTypeId,
            quantity,
            sessionId,
            userId: req.user?._id?.toString(),
            path: req.path,
            method: req.method,
        });

        if (!eventId || !ticketTypeId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'eventId, ticketTypeId e quantity são obrigatórios',
            });
        }

        const result = await reservationService.createReservation({
            eventId,
            ticketTypeId,
            quantity: Number(quantity),
            sessionId,
            userId: req.user?._id?.toString(),
            reservationDurationMinutes: 30, // 30 minutos para testes de cartão
        });

        // Verificar se é nova reserva ou atualização
        const isNewReservation =
            result.reservation &&
            new Date(result.reservation.createdAt).getTime() > Date.now() - 5000; // Criada nos últimos 5 segundos

        console.log('[createReservation] 📤 Resultado:', {
            success: result.success,
            reservationId: result.reservation?._id,
            isNewReservation,
            isUpdate: !isNewReservation && !!result.reservation,
            message: result.message,
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Erro ao criar reserva',
                data: {
                    availableQuantity: result.availableQuantity,
                    reservedQuantity: result.reservedQuantity,
                },
            });
        }

        res.status(201).json({
            success: true,
            message: 'Reserva criada com sucesso',
            data: {
                reservation: result.reservation,
                expiresAt: result.reservation?.expiresAt,
                timeRemaining: result.reservation?.timeRemaining,
                availableQuantity: result.availableQuantity,
                reservedQuantity: result.reservedQuantity,
            },
        });
    } catch (error: any) {
        console.error('Erro ao criar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao criar reserva',
        });
    }
};

// Validar reserva
export const validateReservation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await reservationService.validateReservation(id);

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Reserva inválida',
                data: {
                    reservation: result.reservation,
                },
            });
        }

        res.status(200).json({
            success: true,
            data: {
                reservation: result.reservation,
                expiresAt: result.reservation?.expiresAt,
                timeRemaining: result.reservation?.timeRemaining,
            },
        });
    } catch (error: any) {
        console.error('Erro ao validar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao validar reserva',
        });
    }
};

// Liberar reserva
export const releaseReservation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await reservationService.releaseReservation(id);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Erro ao liberar reserva',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reserva liberada com sucesso',
        });
    } catch (error: any) {
        console.error('Erro ao liberar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao liberar reserva',
        });
    }
};

// Liberar todas as reservas da sessão
export const releaseSessionReservations = async (req: Request, res: Response) => {
    try {
        const sessionId = req.headers['x-session-id'] as string;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID não fornecido',
            });
        }

        const result = await reservationService.releaseSessionReservations(sessionId);

        res.status(200).json({
            success: true,
            message: `${result.releasedCount} reserva(s) liberada(s) com sucesso`,
            data: {
                releasedCount: result.releasedCount,
            },
        });
    } catch (error: any) {
        console.error('Erro ao liberar reservas da sessão:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao liberar reservas',
        });
    }
};

// Obter quantidade disponível (considerando reservas)
export const getAvailableQuantity = async (req: Request, res: Response) => {
    try {
        const { eventId, ticketTypeId } = req.query;

        if (!eventId || !ticketTypeId) {
            return res.status(400).json({
                success: false,
                message: 'eventId e ticketTypeId são obrigatórios',
            });
        }

        const availableQuantity = await reservationService.getAvailableQuantity(
            eventId as string,
            ticketTypeId as string
        );

        res.status(200).json({
            success: true,
            data: {
                availableQuantity,
                eventId,
                ticketTypeId,
            },
        });
    } catch (error: any) {
        console.error('Erro ao obter quantidade disponível:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao obter quantidade disponível',
        });
    }
};

// Listar reservas ativas do usuário/sessão
export const listMyReservations = async (req: Request, res: Response) => {
    try {
        const sessionId = req.headers['x-session-id'] as string;
        const userId = req.user?._id?.toString();

        const filter: any = {
            isActive: true,
            expiresAt: { $gt: new Date() },
        };

        // Se há userId, buscar reservas do usuário OU da sessão (permite restaurar após F5)
        // Se não há userId mas há sessionId, buscar apenas por sessionId
        if (userId && sessionId) {
            // Buscar reservas do usuário OU da sessão (permite restaurar após F5 mesmo com sessionId diferente)
            filter.$or = [{ reservedBy: userId }, { sessionId }];
        } else if (userId) {
            // Apenas userId (sem sessionId)
            filter.reservedBy = userId;
        } else if (sessionId) {
            // Apenas sessionId (sem userId)
            filter.sessionId = sessionId;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Session ID ou autenticação necessária',
            });
        }

        const reservations = await TicketReservation.find(filter)
            .populate('event', 'name date location')
            .populate('ticketType', 'name price isVIP')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reservations,
        });
    } catch (error: any) {
        console.error('Erro ao listar reservas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao listar reservas',
        });
    }
};
