import { Order, Ticket, TicketType } from '../models'
import * as paymentService from './paymentService'

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15)
const DEFAULT_TIMEOUT_MS = DEFAULT_TIMEOUT_MINUTES * 60 * 1000
const PIX_TIMEOUT_MINUTES = Math.max(30, Number(process.env.PIX_PAYMENT_TIMEOUT_MINUTES || 30))
const PIX_TIMEOUT_MS = PIX_TIMEOUT_MINUTES * 60 * 1000
const BATCH_LIMIT = 100
const CANCELABLE_STATUSES = ['pending', 'in_process', 'action_required', 'authorized', 'call_for_authorize']

async function restoreTicketInventory(orderId: string) {
    const tickets = await Ticket.find({ order: orderId, deletedAt: null }).populate('ticketType')
    const ticketTypeCounts = new Map<string, number>()
    for (const ticket of tickets) {
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
}

async function cancelOrderLocally(order: any, timestamp: Date, paymentStatus: string = 'cancelled') {
    await restoreTicketInventory(String(order._id))
    order.status = 'cancelled'
    order.paymentStatus = paymentStatus
    order.paymentStatusDetail = paymentStatus
    ;(order as any).cancelledAt = timestamp
    await order.save()
    await Ticket.updateMany(
        { order: order._id, deletedAt: null },
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

            try {
                paymentInfo = await paymentService.getPaymentById(order.paymentId)
                mpStatus = (paymentInfo?.status || '').toLowerCase()
                mpExpiration = paymentInfo?.date_of_expiration ? new Date(paymentInfo.date_of_expiration) : null
            } catch (mpError: any) {
                const errorMessage = String(mpError?.message || mpError || '')
                if (!errorMessage.toLowerCase().includes('resource not found')) {
                    throw mpError
                }
            }

            if ((!mpStatus || !mpExpiration) && (order as any).paymentOrderId) {
                try {
                    const mpOrder = await paymentService.getOrderById((order as any).paymentOrderId)
                    const mpPayment = mpOrder?.transactions?.payments?.[0]
                    if (mpPayment) {
                        if (!mpStatus) {
                            mpStatus = (mpPayment.status || mpOrder?.status || '').toLowerCase()
                        }
                        if (!mpExpiration && mpPayment.date_of_expiration) {
                            mpExpiration = new Date(mpPayment.date_of_expiration)
                        }
                    } else if (!mpStatus && mpOrder?.status) {
                        mpStatus = String(mpOrder.status).toLowerCase()
                    }
                } catch (mpOrderError) {
                    console.warn('[order-expiration] Falha ao consultar order no Mercado Pago', String(order._id), mpOrderError)
                }
            }

            if (mpStatus === 'approved') {
                order.status = 'paid'
                order.paymentStatus = 'approved'
                ;(order as any).paidAt = paymentInfo?.date_approved ? new Date(paymentInfo.date_approved) : now
                await order.save()
                continue
            }

            const mpExpired = mpExpiration ? now >= mpExpiration : false
            const shouldExpire = reachedLocalDeadline || mpExpired

            if (!shouldExpire) {
                continue
            }

            const effectiveStatus = mpStatus || 'pending'

            if (['cancelled', 'rejected', 'expired'].includes(effectiveStatus)) {
                await cancelOrderLocally(order, now, effectiveStatus)
                expired++
                continue
            }

            if (CANCELABLE_STATUSES.includes(effectiveStatus)) {
                if (isPixOrder && (order as any).paymentOrderId) {
                    try {
                        await paymentService.cancelOrderById((order as any).paymentOrderId)
                    } catch (cancelError) {
                        console.warn('[order-expiration] Falha ao cancelar order no Mercado Pago', String(order._id), cancelError)
                    }
                } else {
                    try {
                        await paymentService.cancelPaymentById(order.paymentId)
                    } catch (cancelError) {
                        console.warn('[order-expiration] Falha ao cancelar pagamento no Mercado Pago', String(order._id), cancelError)
                    }
                }
                await cancelOrderLocally(order, now)
                expired++
                continue
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


