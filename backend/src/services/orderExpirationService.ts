import { Order, Ticket } from '../models'

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15)
const BATCH_LIMIT = 100

export async function expirePendingOrders(now = new Date()): Promise<{ checked: number; expired: number }> {
  const cutoff = new Date(now.getTime() - DEFAULT_TIMEOUT_MINUTES * 60 * 1000)

  // Buscar pedidos pendentes mais antigos que o cutoff
  const pending = await Order.find({
    status: 'pending',
    deletedAt: null,
    createdAt: { $lte: cutoff }
  })
    .select('_id status createdAt')
    .limit(BATCH_LIMIT)

  let expired = 0

  for (const order of pending) {
    try {
      order.status = 'cancelled'
      ;(order as any).cancelledAt = now
      await order.save()

      await Ticket.updateMany({ order: order._id, deletedAt: null }, {
        $set: { status: 'cancelled', isActive: false, qrCode: '' }
      })

      expired++
    } catch (e) {
      // Log e continua
      console.error('Erro ao expirar pedido', String(order._id), e)
    }
  }

  return { checked: pending.length, expired }
}

export function startOrderExpirationScheduler() {
  const intervalMs = Number(process.env.ORDER_EXPIRATION_CHECK_INTERVAL_MS || 60_000)
  console.log(`🕒 Order expiration scheduler ativo (timeout=${DEFAULT_TIMEOUT_MINUTES}m, interval=${intervalMs}ms)`) 
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


