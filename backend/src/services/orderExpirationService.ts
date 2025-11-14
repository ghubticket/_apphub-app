import { Order, Ticket, TicketType } from '../models'
import * as paymentService from './paymentService'

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15)
const DEFAULT_TIMEOUT_MS = DEFAULT_TIMEOUT_MINUTES * 60 * 1000
const PIX_TIMEOUT_MINUTES = Math.max(30, Number(process.env.PIX_PAYMENT_TIMEOUT_MINUTES || 30))
const PIX_TIMEOUT_MS = PIX_TIMEOUT_MINUTES * 60 * 1000
const BATCH_LIMIT = 100
const CANCELABLE_STATUSES = ['pending', 'in_process', 'action_required', 'authorized', 'call_for_authorize']

async function cancelOrderLocally(order: any, timestamp: Date, paymentStatus: string = 'cancelled') {
    // CRÍTICO: Restaurar estoque APENAS dos tickets pending (não dos confirmados)
    // Buscar apenas tickets pending para liberar estoque
    const pendingTickets = await Ticket.find({ 
        order: order._id, 
        deletedAt: null,
        status: 'pending' // APENAS tickets pending
    }).populate('ticketType')
    
    // Liberar estoque apenas dos tickets pending
    const ticketTypeCounts = new Map<string, number>()
    for (const ticket of pendingTickets) {
        const ticketTypeId = String((ticket as any).ticketType?._id || (ticket as any).ticketType)
        if (ticketTypeId) {
            ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1)
        }
    }
    for (const [ticketTypeId, quantity] of ticketTypeCounts.entries()) {
        const ticketType = await TicketType.findById(ticketTypeId)
        if (ticketType && quantity > 0) {
            ticketType.soldQuantity = Math.max(0, ticketType.soldQuantity - quantity)
            await ticketType.save()
        }
    }
    
    order.status = 'cancelled'
    order.paymentStatus = paymentStatus
    order.paymentStatusDetail = paymentStatus
    ;(order as any).cancelledAt = timestamp
    await order.save()
    
    // CRÍTICO: Cancelar APENAS tickets pending (não cancelar tickets já confirmados/pagos)
    await Ticket.updateMany(
        { 
            order: order._id, 
            deletedAt: null,
            status: 'pending' // APENAS tickets pending - não mexer nos confirmados
        },
        { $set: { status: 'cancelled', isActive: false, qrCode: '' } },
    )
}

export async function expirePendingOrders(now = new Date()): Promise<{ checked: number; expired: number }> {
    const pending = await Order.find({ status: 'pending', deletedAt: null })
        .select('_id status createdAt paymentId paymentOrderId paymentMethod paymentStatus paymentStatusDetail')
        .limit(BATCH_LIMIT)

    let expired = 0

    for (const order of pending) {
        try {
            const isPixOrder = (order as any).paymentMethod === 'pix'
            const timeoutMs = isPixOrder ? PIX_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
            const localDeadline = new Date(order.createdAt.getTime() + timeoutMs)
            const reachedLocalDeadline = now >= localDeadline

            if (!order.paymentId) {
                if (reachedLocalDeadline) {
                    await cancelOrderLocally(order, now)
                    expired++
                }
                continue
            }

            let paymentInfo: any = null
            let mpStatus: string | null = null
            let mpExpiration: Date | null = null

            // Para PIX, SEMPRE tentar Orders API primeiro (PIX usa Orders API, não Payment API)
            if (isPixOrder && (order as any).paymentOrderId) {
                try {
                    const mpOrder = await paymentService.getOrderById((order as any).paymentOrderId)
                    const mpPayment = mpOrder?.transactions?.payments?.[0]
                    if (mpPayment) {
                        paymentInfo = mpPayment
                        mpStatus = (mpPayment.status || mpOrder?.status || '').toLowerCase()
                        if (mpPayment.date_of_expiration) {
                            mpExpiration = new Date(mpPayment.date_of_expiration)
                        }
                        
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`[order-expiration] PIX pedido ${String(order._id)}: obtido da Order API - status=${mpStatus}, date_of_expiration=${mpExpiration?.toISOString() || 'null'}`)
                        }
                    } else if (mpOrder?.status) {
                        mpStatus = String(mpOrder.status).toLowerCase()
                    }
                } catch (mpOrderError) {
                    console.warn('[order-expiration] Falha ao consultar order no Mercado Pago', String(order._id), mpOrderError)
                }
            }
            
            // Se não conseguiu via Orders API (ou não é PIX), tentar Payment API
            if ((!mpStatus || !mpExpiration) && order.paymentId && !isPixOrder) {
                try {
                    paymentInfo = await paymentService.getPaymentById(order.paymentId)
                    if (paymentInfo) {
                        mpStatus = (paymentInfo?.status || '').toLowerCase()
                        mpExpiration = paymentInfo?.date_of_expiration ? new Date(paymentInfo.date_of_expiration) : null
                    }
                } catch (paymentError) {
                    // Payment API pode falhar, ignorar silenciosamente
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug('[order-expiration] Falha ao buscar payment no MP:', String(order._id), paymentError)
                    }
                }
            }
            
            // Log final para debug
            if (isPixOrder && process.env.NODE_ENV !== 'production') {
                console.log(`[order-expiration] PIX pedido ${String(order._id)} - Status final: mpStatus=${mpStatus || 'null'}, mpExpiration=${mpExpiration?.toISOString() || 'null'}, paymentId=${order.paymentId || 'null'}, paymentOrderId=${(order as any).paymentOrderId || 'null'}`)
            }

            if (mpStatus === 'approved') {
                order.status = 'paid'
                order.paymentStatus = 'approved'
                ;(order as any).paidAt = paymentInfo?.date_approved ? new Date(paymentInfo.date_approved) : now
                await order.save()
                continue
            }

            // Para PIX, SEMPRE usar apenas o date_of_expiration do Mercado Pago
            // Não usar deadline local para evitar cancelamento prematuro
            const mpExpired = mpExpiration ? now >= mpExpiration : false
            let shouldExpire: boolean
            
            if (isPixOrder) {
                // Proteção: não cancelar pedidos PIX recém-criados (menos de 2 minutos)
                const orderAgeMs = now.getTime() - order.createdAt.getTime()
                const minAgeMs = 2 * 60 * 1000 // 2 minutos
                if (orderAgeMs < minAgeMs) {
                    // Pedido muito novo, não cancelar ainda
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[order-expiration] PIX muito novo (${Math.round(orderAgeMs / 1000)}s), ignorando verificação de expiração para pedido ${String(order._id)}`)
                    }
                    continue
                }
                
                // Para PIX: só cancelar se o MP expirou OU se não conseguimos obter a data de expiração e já passou muito tempo (fallback de segurança)
                if (mpExpiration) {
                    // Temos a data de expiração do MP - usar apenas ela
                    const timeUntilExpiration = mpExpiration.getTime() - now.getTime()
                    const minutesUntilExpiration = Math.round(timeUntilExpiration / (60 * 1000))
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[order-expiration] PIX pedido ${String(order._id)}: expira em ${minutesUntilExpiration} minutos (${mpExpiration.toISOString()})`)
                    }
                    
                    shouldExpire = mpExpired
                    
                    // Se ainda não expirou, não cancelar
                    if (!shouldExpire) {
                        continue
                    }
                } else {
                    // Não conseguimos obter a data de expiração do MP
                    // NÃO cancelar pedidos PIX sem date_of_expiration - aguardar webhook ou próxima verificação
                    // O Mercado Pago deve sempre retornar date_of_expiration para PIX
                    console.warn(`[order-expiration] ⚠️ PIX sem date_of_expiration do MP para pedido ${String(order._id)}. NÃO cancelando - aguardando próxima verificação ou webhook. Status: ${mpStatus || 'unknown'}, PaymentId: ${order.paymentId || 'none'}, OrderId: ${(order as any).paymentOrderId || 'none'}`)
                    continue // Não cancelar se não temos a data de expiração
                }
            } else {
                // Para outros métodos de pagamento: usar deadline local ou MP expiration
                shouldExpire = reachedLocalDeadline || mpExpired
            }

            if (!shouldExpire) {
                continue
            }

            const effectiveStatus = mpStatus || 'pending'

            // REGRA: Se o MP já cancelou, SEMPRE seguir o MP (100% alinhamento)
            // A data de expiração é apenas para cancelamento automático quando expirar
            if (isPixOrder) {
                // Se o MP já cancelou, seguir o MP independente da data de expiração
                if (['cancelled', 'rejected', 'expired'].includes(effectiveStatus)) {
                    await cancelOrderLocally(order, now, effectiveStatus)
                    expired++
                    if (process.env.NODE_ENV !== 'production') {
                        const mpExpiration = paymentInfo?.date_of_expiration ? new Date(paymentInfo.date_of_expiration) : null;
                        if (mpExpiration && now < mpExpiration) {
                            console.log(`[order-expiration] PIX pedido ${String(order._id)}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min). Seguindo MP e cancelando.`);
                        } else {
                            console.log(`[order-expiration] PIX pedido ${String(order._id)}: MP cancelou (status: ${effectiveStatus}). Seguindo MP e cancelando.`);
                        }
                    }
                    continue
                }
                
                // Se ainda não cancelou no MP, verificar se expirou para cancelar automaticamente
                if (mpExpiration && now >= mpExpiration) {
                    // Expirou, cancelar no MP e localmente
                    if (CANCELABLE_STATUSES.includes(effectiveStatus)) {
                        if ((order as any).paymentOrderId) {
                            try {
                                await paymentService.cancelOrderById((order as any).paymentOrderId)
                            } catch (cancelError) {
                                console.warn('[order-expiration] Falha ao cancelar order no Mercado Pago', String(order._id), cancelError)
                            }
                        } else if (order.paymentId) {
                            try {
                                await paymentService.cancelPaymentById(order.paymentId)
                            } catch (cancelError) {
                                console.warn('[order-expiration] Falha ao cancelar pagamento no Mercado Pago', String(order._id), cancelError)
                            }
                        }
                        await cancelOrderLocally(order, now)
                        expired++
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`[order-expiration] PIX pedido ${String(order._id)}: expirou (${mpExpiration.toISOString()}). Cancelando automaticamente.`);
                        }
                        continue
                    }
                } else if (mpExpiration && now < mpExpiration) {
                    // Ainda não expirou, não cancelar
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[order-expiration] PIX pedido ${String(order._id)}: ainda não expirou (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min). Mantendo como pending.`);
                    }
                    continue
                } else {
                    // Sem data de expiração, não cancelar (aguardar webhook ou próxima verificação)
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn(`[order-expiration] PIX pedido ${String(order._id)}: sem date_of_expiration. Mantendo como pending.`);
                    }
                    continue
                }
            } else {
                // Para outros métodos de pagamento (cartão, etc): REGRA - MP é a fonte de verdade única
                // Se o MP já cancelou, seguir o MP imediatamente
                if (['cancelled', 'rejected', 'expired'].includes(effectiveStatus)) {
                    await cancelOrderLocally(order, now, effectiveStatus)
                    expired++
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[order-expiration] Cartão pedido ${String(order._id)}: MP cancelou (status: ${effectiveStatus}). Seguindo MP e cancelando.`);
                    }
                    continue
                }

                // Se ainda não cancelou no MP, verificar se expirou para cancelar automaticamente
                if (CANCELABLE_STATUSES.includes(effectiveStatus)) {
                    // Para cartão, usar deadline local ou MP expiration
                    if (reachedLocalDeadline || mpExpired) {
                        try {
                            await paymentService.cancelPaymentById(order.paymentId)
                        } catch (cancelError) {
                            console.warn('[order-expiration] Falha ao cancelar pagamento no Mercado Pago', String(order._id), cancelError)
                        }
                        await cancelOrderLocally(order, now)
                        expired++
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`[order-expiration] Cartão pedido ${String(order._id)}: expirou. Cancelando automaticamente.`);
                        }
                        continue
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao expirar/cancelar pedido', String(order._id), error)
        }
    }

    return { checked: pending.length, expired }
}

export function startOrderExpirationScheduler() {
    const intervalMs = Number(process.env.ORDER_EXPIRATION_CHECK_INTERVAL_MS || 60_000)
    console.log(
        `🕒 Order expiration scheduler ativo (timeout padrão=${DEFAULT_TIMEOUT_MINUTES}m, timeout PIX=${PIX_TIMEOUT_MINUTES}m, interval=${intervalMs}ms)`,
    )
    setInterval(async () => {
        try {
            const result = await expirePendingOrders()
            if (result.expired > 0) {
                console.log(`⏰ Expirados ${result.expired} pedido(s) pendente(s) nesta verificação`)
            }
        } catch (e) {
            console.error('Erro no scheduler de expiração de pedidos', e)
        }
    }, intervalMs)
}


