/*
 * Regenera QR codes seguros para tickets existentes.
 * Uso:
 *   ts-node src/scripts/regenerateTicketQrs.ts [--orderId <ID>] [--onlyVip true] [--baseUrl <http://localhost:3001>]
 * Observações:
 *   - Gera QR apenas para tickets com status 'confirmed' ou pedidos VIP ('vip_free').
 *   - Requer QR_SECRET e QR_HMAC_SECRET válidos (32 bytes) em .env.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { Order, Ticket } from '../models'
import { generateQRCode } from '../services/qrCodeService'

function args() {
  const out: Record<string, string | undefined> = {}
  const a = process.argv.slice(2)
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const k = a[i].slice(2)
      const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : 'true'
      out[k] = v
    }
  }
  return out
}

async function main() {
  const { orderId, onlyVip } = args()

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub'
  await mongoose.connect(mongoUri)
  console.log('✅ Mongo conectado')

  const query: any = { deletedAt: null }
  if (orderId) query._id = orderId

  const orders = await Order.find(query).select('_id paymentMethod status orderNumber').lean()
  console.log(`📦 Pedidos encontrados: ${orders.length}`)

  let regen = 0
  for (const ord of orders) {
    const isVip = ord.paymentMethod === 'vip_free'
    if (onlyVip === 'true' && !isVip) continue

    const tickets = await Ticket.find({ order: ord._id, deletedAt: null }).lean()
    for (const t of tickets) {
      // Só gerar para confirmados (pagos) ou VIP
      if (!isVip && t.status !== 'confirmed') continue

      try {
        const qr = await generateQRCode(t.code)
        await Ticket.updateOne({ _id: t._id }, { $set: { qrCode: qr } })
        regen++
        console.log(`   ✅ Ticket ${t.code}: QR regenerado`)
      } catch (e: any) {
        console.error(`   ❌ Ticket ${t.code}: erro ao gerar QR ->`, e?.message || e)
      }
    }
  }

  console.log(`\n🎯 QRs regenerados: ${regen}`)
  await mongoose.disconnect()
}

main().catch(e => {
  console.error('Erro fatal:', e)
  process.exit(1)
})


