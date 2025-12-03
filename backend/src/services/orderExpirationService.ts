import { Order, Ticket, TicketType } from '../models';
import * as paymentService from './paymentService';

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15);
const DEFAULT_TIMEOUT_MS = DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
const PIX_TIMEOUT_MINUTES = Math.max(30, Number(process.env.PIX_PAYMENT_TIMEOUT_MINUTES || 30));
const PIX_TIMEOUT_MS = PIX_TIMEOUT_MINUTES * 60 * 1000;
const BATCH_LIMIT = 100;
const CANCELABLE_STATUSES = [
    'pending',
    'in_process',
    'action_required',
    'authorized',
    'call_for_authorize',
];

async function cancelOrderLocally(
    order: any,
    timestamp: Date,
    paymentStatus: string = 'cancelled'
) {
    // CRÍTICO: Restaurar estoque APENAS dos tickets pending (não dos confirmados)
    // Buscar apenas tickets pending para liberar estoque
    const pendingTickets = await Ticket.find({
        order: order._id,
        deletedAt: null,
        status: 'pending', // APENAS tickets pending
    }).populate('ticketType');

    // Liberar estoque apenas dos tickets pending
    const ticketTypeCounts = new Map<string, number>();
    for (const ticket of pendingTickets) {
        const ticketTypeId = String((ticket as any).ticketType?._id || (ticket as any).ticketType);
        if (ticketTypeId) {
            ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1);
        }
    }
    for (const [ticketTypeId, quantity] of ticketTypeCounts.entries()) {
        const ticketType = await TicketType.findById(ticketTypeId);
        if (ticketType && quantity > 0) {
            ticketType.soldQuantity = Math.max(0, ticketType.soldQuantity - quantity);
            await ticketType.save();
        }
    }

    order.status = 'cancelled';
    order.paymentStatus = paymentStatus;
    order.paymentStatusDetail = paymentStatus;
    (order as any).cancelledAt = timestamp;
    await order.save();

    // CRÍTICO: Cancelar APENAS tickets pending (não cancelar tickets já confirmados/pagos)
    await Ticket.updateMany(
        {
            order: order._id,
            deletedAt: null,
            status: 'pending', // APENAS tickets pending - não mexer nos confirmados
        },
        { $set: { status: 'cancelled', isActive: false, qrCode: '' } }
    );
}

export async function expirePendingOrders(
    now = new Date()
): Promise<{ checked: number; expired: number }> {
    // REFATORADO: Usar expiresAt do pedido ao invés de calcular baseado em createdAt
    const pending = await Order.find({
        status: 'pending',
        deletedAt: null,
        expiresAt: { $lte: now }, // Apenas pedidos que já expiraram
    })
        .select(
            '_id status createdAt expiresAt paymentId paymentOrderId paymentMethod paymentStatus paymentStatusDetail'
        )
        .limit(BATCH_LIMIT);

    let expired = 0;

    // OTIMIZADO: Paralelizar queries ao Mercado Pago ao invés de sequencial
    const orderPromises = pending.map(async (order): Promise<boolean> => {
        try {
            const isPixOrder = (order as any).paymentMethod === 'pix';
            const orderExpiresAt = (order as any).expiresAt as Date | undefined;

            // Se não tem expiresAt, usar lógica antiga como fallback (compatibilidade)
            if (!orderExpiresAt) {
                const timeoutMs = isPixOrder ? PIX_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
                const localDeadline = new Date(order.createdAt.getTime() + timeoutMs);
                if (now < localDeadline) {
                    return false; // Ainda não expirou
                }
            } else {
                // Usar expiresAt do pedido (nova lógica)
                if (now < orderExpiresAt) {
                    return false; // Ainda não expirou
                }
            }

            // Pedido expirado (sem paymentId = nunca tentou pagar)
            if (!order.paymentId) {
                await cancelOrderLocally(order, now);
                return true; // Expirou
            }

            let paymentInfo: any = null;
            let mpStatus: string | null = null;
            let mpExpiration: Date | null = null;

            // Para PIX, SEMPRE tentar Orders API primeiro (PIX usa Orders API, não Payment API)
            if (isPixOrder && (order as any).paymentOrderId) {
                try {
                    const mpOrder = await paymentService.getOrderById(
                        (order as any).paymentOrderId
                    );
                    const mpPayment = mpOrder?.transactions?.payments?.[0];
                    if (mpPayment) {
                        paymentInfo = mpPayment;
                        mpStatus = (mpPayment.status || mpOrder?.status || '').toLowerCase();
                        if (mpPayment.date_of_expiration) {
                            mpExpiration = new Date(mpPayment.date_of_expiration);
                        }

                        // Status obtido da Order API
                    } else if (mpOrder?.status) {
                        mpStatus = String(mpOrder.status).toLowerCase();
                    }
                } catch (mpOrderError) {
                    // Falha ao consultar order no Mercado Pago - ignorar
                }
            }

            // Se não conseguiu via Orders API (ou não é PIX), tentar Payment API
            if ((!mpStatus || !mpExpiration) && order.paymentId && !isPixOrder) {
                try {
                    paymentInfo = await paymentService.getPaymentById(order.paymentId);
                    if (paymentInfo) {
                        mpStatus = (paymentInfo?.status || '').toLowerCase();
                        mpExpiration = paymentInfo?.date_of_expiration
                            ? new Date(paymentInfo.date_of_expiration)
                            : null;
                    }
                } catch (paymentError) {
                    // Payment API pode falhar, ignorar silenciosamente
                }
            }

            // Status final verificado

            if (mpStatus === 'approved') {
                order.status = 'paid';
                order.paymentStatus = 'approved';
                (order as any).paidAt = paymentInfo?.date_approved
                    ? new Date(paymentInfo.date_approved)
                    : now;
                await order.save();
                return false; // Não expirou, foi pago
            }

            // Para PIX, SEMPRE usar apenas o date_of_expiration do Mercado Pago
            // Não usar deadline local para evitar cancelamento prematuro
            const mpExpired = mpExpiration ? now >= mpExpiration : false;
            let shouldExpire: boolean;

            if (isPixOrder) {
                // Proteção: não cancelar pedidos PIX recém-criados (menos de 2 minutos)
                const orderAgeMs = now.getTime() - order.createdAt.getTime();
                const minAgeMs = 2 * 60 * 1000; // 2 minutos
                if (orderAgeMs < minAgeMs) {
                    // Pedido muito novo, não cancelar ainda
                    return false; // Pedido muito novo, não expirou ainda
                }

                // Para PIX: só cancelar se o MP expirou OU se não conseguimos obter a data de expiração e já passou muito tempo (fallback de segurança)
                if (mpExpiration) {
                    // Temos a data de expiração do MP - usar apenas ela
                    const timeUntilExpiration = mpExpiration.getTime() - now.getTime();

                    shouldExpire = mpExpired;

                    // Se ainda não expirou, não cancelar
                    if (!shouldExpire) {
                        return false;
                    }
                } else {
                    // Não conseguimos obter a data de expiração do MP
                    // NÃO cancelar pedidos PIX sem date_of_expiration - aguardar webhook ou próxima verificação
                    return false; // Não cancelar se não temos a data de expiração
                }
            } else {
                // Para outros métodos de pagamento (cartão): usar expiresAt do pedido ou MP expiration
                // Se tem expiresAt do pedido, verificar se expirou
                const orderExpired = orderExpiresAt ? now >= orderExpiresAt : false;
                shouldExpire = orderExpired || mpExpired;
            }

            if (!shouldExpire) {
                return false;
            }

            const effectiveStatus = mpStatus || 'pending';

            // REGRA: Se o MP já cancelou, SEMPRE seguir o MP (100% alinhamento)
            // A data de expiração é apenas para cancelamento automático quando expirar
            if (isPixOrder) {
                // Se o MP já cancelou, seguir o MP independente da data de expiração
                if (['cancelled', 'rejected', 'expired'].includes(effectiveStatus)) {
                    await cancelOrderLocally(order, now, effectiveStatus);
                    return true; // Expirou
                }

                // Se ainda não cancelou no MP, verificar se expirou para cancelar automaticamente
                if (mpExpiration && now >= mpExpiration) {
                    // Expirou, cancelar no MP e localmente
                    if (CANCELABLE_STATUSES.includes(effectiveStatus)) {
                        if ((order as any).paymentOrderId) {
                            try {
                                await paymentService.cancelOrderById((order as any).paymentOrderId);
                            } catch (cancelError) {
                                // Erro ao cancelar no MP - continuar
                            }
                        } else if (order.paymentId) {
                            try {
                                await paymentService.cancelPaymentById(order.paymentId);
                            } catch (cancelError) {
                                // Erro ao cancelar pagamento no MP - continuar
                            }
                        }
                        await cancelOrderLocally(order, now);
                        return true; // Expirou
                    }
                } else if (mpExpiration && now < mpExpiration) {
                    // Ainda não expirou, não cancelar
                    return false;
                } else {
                    // Sem data de expiração, não cancelar (aguardar webhook ou próxima verificação)
                    return false;
                }
            } else {
                // Para outros métodos de pagamento (cartão, etc): REGRA - MP é a fonte de verdade única
                // Se o MP já cancelou, seguir o MP imediatamente
                if (['cancelled', 'rejected', 'expired'].includes(effectiveStatus)) {
                    await cancelOrderLocally(order, now, effectiveStatus);
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(
                            `[order-expiration] Cartão pedido ${String(order._id)}: MP cancelou (status: ${effectiveStatus}). Seguindo MP e cancelando.`
                        );
                    }
                    return true; // Expirou
                }

                // Se ainda não cancelou no MP, verificar se expirou para cancelar automaticamente
                if (CANCELABLE_STATUSES.includes(effectiveStatus)) {
                    // Para cartão, usar expiresAt do pedido ou MP expiration
                    const orderExpired = orderExpiresAt ? now >= orderExpiresAt : false;
                    if (orderExpired || mpExpired) {
                        try {
                            await paymentService.cancelPaymentById(order.paymentId);
                        } catch (cancelError) {
                            // Erro ao cancelar pagamento no MP - continuar
                        }
                        await cancelOrderLocally(order, now);
                        return true; // Expirou
                    }
                }
            }

            return false; // Não expirou
        } catch (error) {
            return false; // Em caso de erro, não contar como expirado
        }
    });

    // Executar todas as promises em paralelo
    const results = await Promise.all(orderPromises);
    expired = results.filter((r) => r === true).length;

    return { checked: pending.length, expired };
}

export function startOrderExpirationScheduler() {
    const intervalMs = Number(process.env.ORDER_EXPIRATION_CHECK_INTERVAL_MS || 60_000);
    setInterval(async () => {
        try {
            await expirePendingOrders();
        } catch (e) {
            // Erro no scheduler - ignorar silenciosamente
        }
    }, intervalMs);
}
