import TicketReservation, { ITicketReservation } from '../models/TicketReservation';
import TicketType from '../models/TicketType';
import Event from '../models/Event';

export interface CreateReservationParams {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    sessionId: string;
    userId?: string;
    reservationDurationMinutes?: number; // Padrão: 15 minutos
}

export interface ReservationResult {
    success: boolean;
    reservation?: ITicketReservation;
    availableQuantity: number;
    reservedQuantity: number;
    message?: string;
}

/**
 * Criar uma reserva temporária de ingressos
 */
export const createReservation = async (
    params: CreateReservationParams
): Promise<ReservationResult> => {
    try {
        const {
            eventId,
            ticketTypeId,
            quantity,
            sessionId,
            userId,
            reservationDurationMinutes = 15,
        } = params;

        // Verificar se o evento existe
        const event = await Event.findById(eventId);
        if (!event || !event.isActive) {
            return {
                success: false,
                availableQuantity: 0,
                reservedQuantity: 0,
                message: 'Evento não encontrado ou inativo',
            };
        }

        // Verificar se o tipo de ingresso existe
        const ticketType = await TicketType.findById(ticketTypeId);
        if (!ticketType || !ticketType.isActive) {
            return {
                success: false,
                availableQuantity: 0,
                reservedQuantity: 0,
                message: 'Tipo de ingresso não encontrado ou inativo',
            };
        }

        // Verificar se está em período de venda
        if (!ticketType.isOnSale) {
            return {
                success: false,
                availableQuantity: ticketType.availableQuantity,
                reservedQuantity: 0,
                message: 'Tipo de ingresso não está em período de venda',
            };
        }

        // Verificar limite por compra
        if (quantity > ticketType.maxPerPurchase) {
            return {
                success: false,
                availableQuantity: ticketType.availableQuantity,
                reservedQuantity: 0,
                message: `Limite máximo por compra é de ${ticketType.maxPerPurchase} ingressos`,
            };
        }

        // Calcular quantidade total reservada (incluindo outras reservas ativas)
        const activeReservations = await TicketReservation.find({
            event: eventId,
            ticketType: ticketTypeId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });
        const totalReserved = activeReservations.reduce((total, reservation) => {
            return total + reservation.quantity;
        }, 0);

        // Verificar se há estoque disponível (considerando reservas)
        const availableQuantity = Math.max(
            0,
            ticketType.maxQuantity - ticketType.soldQuantity - totalReserved
        );

        if (quantity > availableQuantity) {
            return {
                success: false,
                availableQuantity,
                reservedQuantity: totalReserved,
                message: `Apenas ${availableQuantity} ingressos disponíveis`,
            };
        }

        // Verificar se o usuário já tem reserva ativa para este tipo de ingresso
        const existingReservation = await TicketReservation.findOne({
            event: eventId,
            ticketType: ticketTypeId,
            sessionId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });

        if (existingReservation) {
            // Atualizar reserva existente
            existingReservation.quantity = quantity;
            existingReservation.expiresAt = new Date(
                Date.now() + reservationDurationMinutes * 60 * 1000
            );
            if (userId) {
                existingReservation.reservedBy = userId as any;
            }
            await existingReservation.save();

            return {
                success: true,
                reservation: existingReservation,
                availableQuantity: availableQuantity - quantity,
                reservedQuantity: totalReserved + quantity - existingReservation.quantity,
            };
        }

        // Criar nova reserva
        const expiresAt = new Date(Date.now() + reservationDurationMinutes * 60 * 1000);
        const reservation = new TicketReservation({
            event: eventId,
            ticketType: ticketTypeId,
            quantity,
            sessionId,
            reservedBy: userId,
            expiresAt,
            isActive: true,
        });

        await reservation.save();

        return {
            success: true,
            reservation,
            availableQuantity: availableQuantity - quantity,
            reservedQuantity: totalReserved + quantity,
        };
    } catch (error: any) {
        console.error('Erro ao criar reserva:', error);
        return {
            success: false,
            availableQuantity: 0,
            reservedQuantity: 0,
            message: error.message || 'Erro ao criar reserva',
        };
    }
};

/**
 * Liberar uma reserva (quando a compra é cancelada ou concluída)
 */
export const releaseReservation = async (
    reservationId: string
): Promise<{ success: boolean; message?: string }> => {
    try {
        const reservation = await TicketReservation.findById(reservationId);

        if (!reservation) {
            return {
                success: false,
                message: 'Reserva não encontrada',
            };
        }

        reservation.isActive = false;
        await reservation.save();

        return {
            success: true,
        };
    } catch (error: any) {
        console.error('Erro ao liberar reserva:', error);
        return {
            success: false,
            message: error.message || 'Erro ao liberar reserva',
        };
    }
};

/**
 * Liberar todas as reservas de uma sessão
 */
export const releaseSessionReservations = async (
    sessionId: string
): Promise<{ success: boolean; releasedCount: number }> => {
    try {
        const result = await TicketReservation.updateMany(
            {
                sessionId,
                isActive: true,
            },
            {
                $set: { isActive: false },
            }
        );

        return {
            success: true,
            releasedCount: result.modifiedCount,
        };
    } catch (error: any) {
        console.error('Erro ao liberar reservas da sessão:', error);
        return {
            success: false,
            releasedCount: 0,
        };
    }
};

/**
 * Verificar se uma reserva ainda é válida
 */
export const validateReservation = async (
    reservationId: string
): Promise<{ valid: boolean; reservation?: ITicketReservation; message?: string }> => {
    try {
        const reservation = await TicketReservation.findById(reservationId);

        if (!reservation) {
            return {
                valid: false,
                message: 'Reserva não encontrada',
            };
        }

        if (!reservation.isActive) {
            return {
                valid: false,
                reservation,
                message: 'Reserva já foi liberada',
            };
        }

        if (reservation.isExpired) {
            return {
                valid: false,
                reservation,
                message: 'Reserva expirada',
            };
        }

        return {
            valid: true,
            reservation,
        };
    } catch (error: any) {
        console.error('Erro ao validar reserva:', error);
        return {
            valid: false,
            message: error.message || 'Erro ao validar reserva',
        };
    }
};

/**
 * Obter quantidade disponível considerando reservas ativas
 */
export const getAvailableQuantity = async (
    eventId: string,
    ticketTypeId: string
): Promise<number> => {
    try {
        const ticketType = await TicketType.findById(ticketTypeId);

        if (!ticketType || !ticketType.isActive) {
            return 0;
        }

        const activeReservations = await TicketReservation.find({
            event: eventId,
            ticketType: ticketTypeId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });
        const totalReserved = activeReservations.reduce((total, reservation) => {
            return total + reservation.quantity;
        }, 0);

        return Math.max(0, ticketType.maxQuantity - ticketType.soldQuantity - totalReserved);
    } catch (error: any) {
        console.error('Erro ao obter quantidade disponível:', error);
        return 0;
    }
};

/**
 * Limpar reservas expiradas (pode ser chamado por um job agendado)
 */
export const cleanExpiredReservations = async (): Promise<{
    success: boolean;
    cleanedCount: number;
}> => {
    try {
        const result = await TicketReservation.updateMany(
            {
                expiresAt: { $lt: new Date() },
                isActive: true,
            },
            {
                $set: { isActive: false },
            }
        );

        return {
            success: true,
            cleanedCount: result.modifiedCount || 0,
        };
    } catch (error: any) {
        console.error('Erro ao limpar reservas expiradas:', error);
        return {
            success: false,
            cleanedCount: 0,
        };
    }
};

