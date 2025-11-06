import { Order, Ticket, TicketType } from '../models'
import * as paymentService from './paymentService'

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15)
const BATCH_LIMIT = 100

export async function expirePendingOrders(now = new Date()): Promise<{ checked: number; expired: number }> {
  const cutoff = new Date(now.getTime() - DEFAULT_TIMEOUT_MINUTES * 60 * 1000)

  const pending = await Order.find({ status: 'pending', deletedAt: null })
    .select('_id status createdAt paymentId paymentStatus')
    .limit(BATCH_LIMIT)

  let expired = 0

  for (const order of pending) {
    try {
      if (!order.paymentId) {
        if (order.createdAt <= cutoff) {
          // Liberar estoque antes de cancelar
          const tickets = await Ticket.find({ order: order._id, deletedAt: null }).populate('ticketType')
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

          order.status = 'cancelled'
          ;(order as any).cancelledAt = now
          await order.save()
          await Ticket.updateMany({ order: order._id, deletedAt: null }, { $set: { status: 'cancelled', isActive: false, qrCode: '' } })
          expired++
        }
        continue
      }

      const payment = await (paymentService as any).getPaymentById(order.paymentId)
      const mpStatus: string = (payment?.status || '').toLowerCase()
      const exp = payment?.date_of_expiration ? new Date(payment.date_of_expiration) : null

      if (mpStatus === 'approved') {
        order.status = 'paid'
        ;(order as any).paidAt = payment?.date_approved ? new Date(payment.date_approved) : now
        await order.save()
        continue
      }

      const isExpired = exp ? now >= exp : order.createdAt <= cutoff
      if (isExpired && ['pending', 'in_process', 'action_required'].includes(mpStatus)) {
        try { await (paymentService as any).cancelPaymentById(order.paymentId) } catch {}
        
        // Liberar estoque antes de cancelar
        const tickets = await Ticket.find({ order: order._id, deletedAt: null }).populate('ticketType')
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

        order.status = 'cancelled'
        order.paymentStatus = 'cancelled' as any
        ;(order as any).cancelledAt = now
        await order.save()
        await Ticket.updateMany({ order: order._id, deletedAt: null }, { $set: { status: 'cancelled', isActive: false, qrCode: '' } })
        expired++
      }
    } catch (e) {
      console.error('Erro ao expirar/cancelar pedido', String(order._id), e)
    }
  }

  return { checked: pending.length, expired }
}

export function startOrderExpirationScheduler() {
  const intervalMs = Number(process.env.ORDER_EXPIRATION_CHECK_INTERVAL_MS || 60_000)
  console.log(`🕒 Order expiration scheduler ativo (timeout=${DEFAULT_TIMEOUT_MINUTES}m, interval=${intervalMs}ms, fonte=MP date_of_expiration p/ PIX)`) 
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


