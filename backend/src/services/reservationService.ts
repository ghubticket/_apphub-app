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
    orderId?: string; // ID do pedido (opcional - para reservas vinculadas a pedidos PIX)
    expiresAt?: Date; // Data de expiração específica (opcional - se não fornecido, usa reservationDurationMinutes)
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
            reservationDurationMinutes = 30, // 30 minutos para testes de cartão
        } = params;

        // Verificar se o evento existe (não deletado)
        const event = await Event.findOne({
            _id: eventId,
            deletedAt: null,
        });
        if (!event || !event.isActive) {
            return {
                success: false,
                availableQuantity: 0,
                reservedQuantity: 0,
                message: 'Evento não encontrado ou inativo',
            };
        }

        // Verificar se o tipo de ingresso existe (não deletado)
        const ticketType = await TicketType.findOne({
            _id: ticketTypeId,
            deletedAt: null,
        });
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

        // CRÍTICO: Verificar se o usuário já tem reserva ATIVA para este tipo de ingresso
        // IMPORTANTE: NÃO reativar reservas canceladas - sempre criar nova
        // IMPORTANTE: Se há orderId nos parâmetros (vinculando a pedido PIX), SEMPRE criar nova reserva
        // IMPORTANTE: Se NÃO há orderId, NÃO considerar reservas vinculadas a PIX pendentes
        let existingReservation = null;

        // Se está vinculando a um pedido (ex: PIX), SEMPRE criar nova reserva (permite múltiplas reservas para mesmo pedido)
        if (!params.orderId) {
            // Buscar por sessionId PRIMEIRO (mais específico), mas EXCLUIR reservas vinculadas a PIX pendentes
            existingReservation = await TicketReservation.findOne({
                event: eventId,
                ticketType: ticketTypeId,
                sessionId,
                isActive: true, // APENAS reservas ativas
                expiresAt: { $gt: new Date() },
                // CRÍTICO: NÃO considerar reservas vinculadas a pedidos PIX pendentes
                // Se o usuário adicionar novo item ao carrinho, deve criar NOVA reserva
                $or: [{ orderId: { $exists: false } }, { orderId: null }],
            });
        }
        // Se params.orderId existe, não buscar reserva existente - sempre criar nova (permite múltiplas reservas para mesmo pedido)

        // Se não encontrou por sessionId, mas tem userId, buscar por userId também
        // (pode acontecer se sessionId mudou mas userId é o mesmo)
        // CRÍTICO: NÃO buscar reservas vinculadas a pedidos PIX pendentes
        if (!existingReservation && userId) {
            const reservationByUserId = await TicketReservation.findOne({
                event: eventId,
                ticketType: ticketTypeId,
                reservedBy: userId,
                isActive: true,
                expiresAt: { $gt: new Date() },
                // CRÍTICO: NÃO pegar reservas vinculadas a pedidos PIX pendentes
                // Essas devem ser mantidas até o PIX expirar
                // Se o usuário adicionar novo item ao carrinho, deve criar NOVA reserva
                $or: [{ orderId: { $exists: false } }, { orderId: null }],
            });

            if (reservationByUserId) {
                // CRÍTICO: Verificação extra - garantir que não está vinculada a PIX pendente
                // (mesmo que a query já exclua, pode haver race condition)
                if (!reservationByUserId.orderId) {
                    // Se encontrou por userId mas sessionId é diferente, atualizar sessionId
                    // Isso permite que a mesma reserva seja encontrada mesmo se sessionId mudou
                    reservationByUserId.sessionId = sessionId;
                    await reservationByUserId.save();
                    existingReservation = reservationByUserId;
                    console.log(
                        '[reservationService.createReservation] 🔄 Atualizado sessionId da reserva existente:',
                        {
                            reservationId: existingReservation._id,
                            oldSessionId: reservationByUserId.sessionId,
                            newSessionId: sessionId,
                        }
                    );
                } else {
                    console.log(
                        '[reservationService.createReservation] ⚠️ Reserva encontrada por userId está vinculada a pedido, ignorando:',
                        {
                            reservationId: reservationByUserId._id,
                            orderId: reservationByUserId.orderId,
                        }
                    );
                }
            }
        }

        console.log('[reservationService.createReservation] 🔍 Verificando reserva existente:', {
            eventId,
            ticketTypeId,
            sessionId,
            userId,
            foundExistingReservation: !!existingReservation,
            existingReservationId: existingReservation?._id,
            existingReservationIsActive: existingReservation?.isActive,
            existingReservationExpiresAt: existingReservation?.expiresAt,
            existingReservationOrderId: existingReservation?.orderId,
        });

        if (existingReservation) {
            console.log(
                '[reservationService.createReservation] ♻️ Atualizando reserva existente:',
                {
                    reservationId: existingReservation._id,
                    currentExpiresAt: existingReservation.expiresAt,
                    currentQuantity: existingReservation.quantity,
                    newQuantity: quantity,
                    hasOrderId: !!params.orderId,
                    hasExpiresAt: !!params.expiresAt,
                }
            );

            existingReservation.quantity = quantity;

            // CRÍTICO: Se há orderId nos parâmetros (ex: reserva vinculada a pedido PIX), atualizar
            // Isso permite que uma reserva existente seja vinculada a um pedido PIX
            if (params.orderId) {
                existingReservation.orderId = params.orderId as any;
                console.log(
                    '[reservationService.createReservation] 🔗 Vinculando reserva existente ao pedido:',
                    params.orderId
                );
            }

            // CRÍTICO: Se há expiresAt nos parâmetros (ex: para PIX), atualizar expiresAt
            // Isso permite que uma reserva existente seja atualizada com o tempo de expiração do PIX
            if (params.expiresAt) {
                existingReservation.expiresAt = params.expiresAt;
                console.log(
                    '[reservationService.createReservation] ⏰ Atualizando expiresAt da reserva existente para:',
                    params.expiresAt
                );
            } else {
                // Se não há expiresAt nos parâmetros, manter o expiresAt original (preservar tempo restante após F5)
                // Só atualizar expiresAt se a reserva já expirou (caso raro de race condition)
                const now = new Date();
                const shouldUpdateExpiresAt = existingReservation.expiresAt <= now;

                if (shouldUpdateExpiresAt) {
                    console.log(
                        '[reservationService.createReservation] ⚠️ Reserva expirada, atualizando expiresAt'
                    );
                    existingReservation.expiresAt = new Date(
                        Date.now() + reservationDurationMinutes * 60 * 1000
                    );
                } else {
                    console.log(
                        '[reservationService.createReservation] ✅ Mantendo expiresAt original:',
                        existingReservation.expiresAt
                    );
                }
            }

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

        console.log('[reservationService.createReservation] 🆕 Criando NOVA reserva');

        // CRÍTICO: Antes de criar nova reserva, cancelar outras reservas ativas do mesmo evento/ticketType/sessionId
        // REGRA IMPORTANTE: NUNCA cancelar reservas vinculadas a pedidos PIX pendentes
        // Reservas vinculadas a pedidos PIX pendentes só devem ser canceladas quando o pedido expirar ou for cancelado explicitamente
        // Isso evita criar múltiplas reservas quando o usuário adiciona itens ao carrinho
        // E garante que pedidos PIX pendentes não sejam afetados por novas reservas

        // Buscar todas as reservas ativas do mesmo evento/ticketType/sessionId
        // Usar populate para buscar dados do pedido vinculado
        const otherActiveReservations = await TicketReservation.find({
            event: eventId,
            ticketType: ticketTypeId,
            sessionId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        })
            .populate({
                path: 'orderId',
                select: 'status paymentMethod',
                model: 'Order',
            })
            .lean();

        // Importar Order para buscar dados quando populate não funcionar
        const Order = (await import('../models/Order')).default;

        if (otherActiveReservations.length > 0) {
            // Filtrar reservas que devem ser canceladas
            // REGRA: Cancelar apenas reservas NÃO vinculadas a pedidos PIX pendentes
            const reservationsToCancel = await Promise.all(
                otherActiveReservations.map(async (oldReservation: any) => {
                    const oldOrderId = oldReservation.orderId;

                    // Se a nova reserva tem orderId e é o mesmo da reserva antiga, não cancelar
                    if (params.orderId && oldOrderId) {
                        const oldOrderIdStr =
                            typeof oldOrderId === 'object' && oldOrderId._id
                                ? String(oldOrderId._id)
                                : String(oldOrderId);
                        if (oldOrderIdStr === String(params.orderId)) {
                            return { reservation: oldReservation, shouldCancel: false }; // Mesmo pedido, não cancelar
                        }
                    }

                    // CRÍTICO: Verificar se a reserva antiga está vinculada a um pedido PIX pendente
                    // Se estiver, NUNCA cancelar - deixar o pedido PIX pendente quieto
                    let isLinkedToPixPending = false;
                    if (oldOrderId) {
                        // Se o populate funcionou, oldOrderId será um objeto
                        if (typeof oldOrderId === 'object' && oldOrderId._id) {
                            isLinkedToPixPending =
                                oldOrderId.status === 'pending' &&
                                oldOrderId.paymentMethod === 'pix';
                        } else {
                            // Se populate não funcionou, buscar o pedido manualmente
                            try {
                                const order = await Order.findById(oldOrderId)
                                    .select('status paymentMethod')
                                    .lean();
                                isLinkedToPixPending = !!(
                                    order &&
                                    order.status === 'pending' &&
                                    order.paymentMethod === 'pix'
                                );
                            } catch (error) {
                                // Se não conseguir buscar, assumir que não é PIX pendente por segurança
                                console.warn(
                                    '[reservationService.createReservation] ⚠️ Erro ao buscar pedido vinculado:',
                                    error
                                );
                                isLinkedToPixPending = false;
                            }
                        }
                    }

                    // REGRA: NUNCA cancelar reservas vinculadas a pedidos PIX pendentes
                    // O pedido PIX pendente deve ficar intacto, independente de novas reservas
                    if (isLinkedToPixPending) {
                        console.log(
                            '[reservationService.createReservation] ✅ Mantendo reserva vinculada a PIX pendente (pedido não deve ser alterado):',
                            {
                                reservationId: oldReservation._id,
                                orderId:
                                    typeof oldOrderId === 'object' && oldOrderId._id
                                        ? String(oldOrderId._id)
                                        : String(oldOrderId),
                            }
                        );
                        return {
                            reservation: oldReservation,
                            shouldCancel: false,
                            wasLinkedToPix: true,
                        }; // NÃO cancelar
                    }

                    // Cancelar reservas não vinculadas a pedidos (reservas temporárias normais)
                    if (!oldOrderId) {
                        return {
                            reservation: oldReservation,
                            shouldCancel: true,
                            wasLinkedToPix: false,
                        }; // Cancelar reservas temporárias normais
                    }

                    // Cancelar outras reservas vinculadas a pedidos não-PIX ou pedidos não-pendentes
                    return {
                        reservation: oldReservation,
                        shouldCancel: true,
                        wasLinkedToPix: false,
                    };
                })
            );

            const reservationsToCancelFiltered = reservationsToCancel
                .filter((item: any) => item.shouldCancel)
                .map((item: any) => item.reservation);

            if (reservationsToCancelFiltered.length > 0) {
                console.log(
                    '[reservationService.createReservation] 🗑️ Cancelando reservas antigas antes de criar nova:',
                    {
                        count: reservationsToCancelFiltered.length,
                        reservationIds: reservationsToCancelFiltered.map((r: any) => r._id),
                        preservedPixReservations: reservationsToCancel.filter(
                            (item: any) => item.wasLinkedToPix && !item.shouldCancel
                        ).length,
                    }
                );

                // Cancelar reservas antigas (liberar estoque bloqueado)
                // CRÍTICO: Reservas não alteram soldQuantity, apenas bloqueiam estoque
                // Ao cancelar, o estoque é automaticamente liberado (não precisa ajustar soldQuantity)
                for (const oldReservation of reservationsToCancelFiltered) {
                    await TicketReservation.updateOne(
                        { _id: oldReservation._id },
                        { isActive: false }
                    );
                    console.log(
                        '[reservationService.createReservation] ✅ Reserva antiga cancelada:',
                        {
                            reservationId: oldReservation._id,
                            quantity: oldReservation.quantity,
                        }
                    );
                }
            } else {
                const preservedPixReservations = reservationsToCancel.filter(
                    (item: any) => item.wasLinkedToPix && !item.shouldCancel
                );
                if (preservedPixReservations.length > 0) {
                    console.log(
                        '[reservationService.createReservation] ✅ Nenhuma reserva cancelada - todas estão vinculadas a pedidos PIX pendentes:',
                        {
                            preservedCount: preservedPixReservations.length,
                        }
                    );
                }
            }
        }

        // Criar nova reserva
        // Se expiresAt foi fornecido (ex: para PIX), usar ele; caso contrário, calcular baseado em reservationDurationMinutes
        const expiresAt =
            params.expiresAt || new Date(Date.now() + reservationDurationMinutes * 60 * 1000);
        const reservation = new TicketReservation({
            event: eventId,
            ticketType: ticketTypeId,
            quantity,
            sessionId,
            reservedBy: userId,
            orderId: params.orderId,
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
 * CRÍTICO: NÃO cancela reservas vinculadas a pedidos PIX pendentes
 */
export const releaseReservation = async (
    reservationId: string
): Promise<{ success: boolean; message?: string }> => {
    try {
        const reservation = await TicketReservation.findById(reservationId).populate('orderId');

        if (!reservation) {
            return {
                success: false,
                message: 'Reserva não encontrada',
            };
        }

        // CRÍTICO: Verificar se a reserva está vinculada a um pedido PIX pendente
        if (reservation.orderId) {
            const { Order } = await import('../models');
            const order = await Order.findById(reservation.orderId);

            if (order && order.status === 'pending' && order.paymentMethod === 'pix') {
                console.log(
                    `[releaseReservation] ⚠️ Tentativa de cancelar reserva ${reservationId} vinculada a pedido PIX pendente ${order.orderNumber}, bloqueando cancelamento`
                );
                return {
                    success: false,
                    message: 'Não é possível cancelar reserva vinculada a pedido PIX pendente',
                };
            }
        }

        reservation.isActive = false;
        await reservation.save();

        console.log(`[releaseReservation] ✅ Reserva ${reservationId} cancelada com sucesso`);
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
 * CRÍTICO: NÃO cancela reservas vinculadas a pedidos PIX pendentes
 */
export const releaseSessionReservations = async (
    sessionId: string
): Promise<{ success: boolean; releasedCount: number }> => {
    try {
        const { Order } = await import('../models');

        // Buscar todas as reservas ativas da sessão
        const sessionReservations = await TicketReservation.find({
            sessionId,
            isActive: true,
        });

        let releasedCount = 0;
        const reservationsToCancel: string[] = [];
        const reservationsToKeep: string[] = [];

        // Verificar cada reserva da sessão
        for (const reservation of sessionReservations) {
            // Se a reserva está vinculada a um pedido, verificar se é PIX pendente
            if (reservation.orderId) {
                const order = await Order.findById(reservation.orderId);

                if (order && order.status === 'pending' && order.paymentMethod === 'pix') {
                    // CRÍTICO: Não cancelar reserva vinculada a pedido PIX pendente
                    const reservationId = String(reservation._id);
                    reservationsToKeep.push(reservationId);
                    console.log(
                        `[releaseSessionReservations] ⚠️ Mantendo reserva ${reservationId} da sessão ${sessionId} vinculada a pedido PIX pendente ${order.orderNumber}`
                    );
                    continue;
                }
            }

            // Reserva pode ser cancelada
            reservationsToCancel.push(String(reservation._id));
        }

        // Cancelar apenas as reservas que não estão vinculadas a pedidos PIX pendentes
        if (reservationsToCancel.length > 0) {
            const result = await TicketReservation.updateMany(
                {
                    _id: { $in: reservationsToCancel },
                    sessionId,
                    isActive: true,
                },
                {
                    $set: { isActive: false },
                }
            );

            releasedCount = result.modifiedCount || 0;
            console.log(
                `[releaseSessionReservations] ✅ ${releasedCount} reserva(s) da sessão ${sessionId} cancelada(s)`
            );
        }

        if (reservationsToKeep.length > 0) {
            console.log(
                `[releaseSessionReservations] ⚠️ ${reservationsToKeep.length} reserva(s) da sessão ${sessionId} mantida(s) por estarem vinculadas a pedidos PIX pendentes`
            );
        }

        return {
            success: true,
            releasedCount,
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
        const ticketType = await TicketType.findOne({
            _id: ticketTypeId,
            deletedAt: null, // Não considerar tipos de ingresso deletados
        });

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
 * CRÍTICO: NÃO cancela reservas vinculadas a pedidos PIX pendentes
 */
export const cleanExpiredReservations = async (): Promise<{
    success: boolean;
    cleanedCount: number;
}> => {
    try {
        const { Order } = await import('../models');

        // Buscar reservas expiradas que estão ativas
        const expiredReservations = await TicketReservation.find({
            expiresAt: { $lt: new Date() },
            isActive: true,
        });

        let cleanedCount = 0;
        const reservationsToCancel: string[] = [];
        const reservationsToKeep: string[] = [];

        // Verificar cada reserva expirada
        for (const reservation of expiredReservations) {
            // Se a reserva está vinculada a um pedido, verificar se é PIX pendente
            if (reservation.orderId) {
                const order = await Order.findById(reservation.orderId);

                if (order && order.status === 'pending' && order.paymentMethod === 'pix') {
                    // CRÍTICO: A reserva vinculada a pedido PIX tem expiresAt igual ao expiresAt do PIX
                    // Se a reserva expirou (expiresAt < now), significa que o PIX também expirou
                    // MAS: O pedido ainda está pendente (webhook ainda não cancelou)
                    // REGRA: Manter reserva ativa até que o pedido seja cancelado pelo webhook
                    // O webhook do Mercado Pago vai cancelar o pedido quando o PIX expirar,
                    // e quando o pedido for cancelado, a reserva será liberada automaticamente
                    // Portanto, não devemos cancelar a reserva aqui, apenas manter ativa até o webhook processar
                    const reservationId = String(reservation._id);
                    reservationsToKeep.push(reservationId);
                    console.log(
                        `[cleanExpiredReservations] ✅ Mantendo reserva ${reservationId} vinculada a pedido PIX pendente ${order.orderNumber} - aguardando cancelamento via webhook`
                    );
                    continue;
                }
            }

            // Reserva pode ser cancelada
            reservationsToCancel.push(String(reservation._id));
        }

        // Cancelar apenas as reservas que não estão vinculadas a pedidos PIX pendentes
        if (reservationsToCancel.length > 0) {
            const result = await TicketReservation.updateMany(
                {
                    _id: { $in: reservationsToCancel },
                    isActive: true,
                },
                {
                    $set: { isActive: false },
                }
            );

            cleanedCount = result.modifiedCount || 0;
            console.log(
                `[cleanExpiredReservations] ✅ ${cleanedCount} reserva(s) expirada(s) cancelada(s) automaticamente`
            );
        }

        if (reservationsToKeep.length > 0) {
            console.log(
                `[cleanExpiredReservations] ⚠️ ${reservationsToKeep.length} reserva(s) expirada(s) mantida(s) por estarem vinculadas a pedidos PIX pendentes`
            );
        }

        return {
            success: true,
            cleanedCount,
        };
    } catch (error: any) {
        console.error('Erro ao limpar reservas expiradas:', error);
        return {
            success: false,
            cleanedCount: 0,
        };
    }
};
