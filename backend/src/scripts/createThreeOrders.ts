/**
 * Cria 3 pedidos para testes usando dados já existentes:
 * 1) VIP (confirmado automaticamente, vip_free, QR code gerado)
 * 2) Pendente (sem QR)
 * 3) Cancelado (criado como pendente e imediatamente cancelado)
 *
 * Execução:
 *   npx ts-node src/scripts/createThreeOrders.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Event, TicketType, Order, Ticket, User } from '../models'
import { generateQRCode } from '../services/qrCodeService'

dotenv.config()

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub'
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Conectado ao MongoDB')

  try {
    // Buscar um evento existente
    const event = await Event.findOne({ deletedAt: null, isActive: true }).sort({ createdAt: -1 })
    if (!event) throw new Error('Nenhum evento ativo encontrado. Cadastre um evento primeiro.')

    // Buscar tipos de ingresso do evento
    let vipType = await TicketType.findOne({ event: event._id, isVIP: true, deletedAt: null, isActive: true })
    let normalType = await TicketType.findOne({ event: event._id, isVIP: false, deletedAt: null, isActive: true })
    if (!vipType) {
      vipType = new TicketType({
        name: 'VIP - Automático',
        description: 'Criado automaticamente pelo script',
        event: event._id,
        price: 0,
        isVIP: true,
        lotNumber: 1,
        maxQuantity: 100,
        maxPerPurchase: 5,
        soldQuantity: 0,
        isActive: true,
      })
      await vipType.save()
      console.log('ℹ️  Tipo VIP criado automaticamente')
    }
    if (!normalType) {
      normalType = new TicketType({
        name: 'Pista - Automático',
        description: 'Criado automaticamente pelo script',
        event: event._id,
        price: 50,
        isVIP: false,
        lotNumber: 1,
        maxQuantity: 200,
        maxPerPurchase: 10,
        soldQuantity: 0,
        isActive: true,
      })
      await normalType.save()
      console.log('ℹ️  Tipo normal criado automaticamente')
    }

    // Buscar 3 usuários existentes (CLIENTE preferencialmente)
    const users = await User.find({ deletedAt: null, isActive: true }).limit(10)
    if (users.length < 1) throw new Error('Nenhum usuário ativo encontrado.')
    const clients = users.filter(u => u.role === 'CLIENTE')
    const [u1, u2, u3] = (clients.length >= 3 ? clients : users).slice(0, 3)
    if (!u1 || !u2 || !u3) throw new Error('Não há pelo menos 3 usuários disponíveis.')

    const ordersOut: any[] = []

    // Helper para gerar orderNumber temporário (hook garante unicidade)
    const genOrderNumber = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let s = ''
      for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
      return s
    }

    // 1) VIP (confirmado)
    {
      const quantity = 1
      const ticketPrice = 0
      const totalAmount = 0

      const order = new Order({
        customer: u1._id,
        event: event._id,
        tickets: [],
        totalAmount,
        totalTickets: quantity,
        status: 'paid',
        paymentMethod: 'vip_free',
        paidAt: new Date(),
        customerData: { name: u1.name, email: u1.email, phone: u1.phone, cpf: u1.cpf },
        isActive: true,
        orderNumber: genOrderNumber(),
      })
      await order.save()

      const ticket = new Ticket({
        event: event._id,
        ticketType: vipType._id,
        order: order._id,
        holder: u1._id,
        price: ticketPrice,
        status: 'confirmed',
        code: genOrderNumber() + 'AA',
        qrCode: '',
        isActive: true,
      })
      await ticket.save()
      ticket.qrCode = await generateQRCode(ticket.code)
      await ticket.save()

      order.tickets = [ticket._id as any]
      await order.save()
      ordersOut.push({ kind: 'VIP', order })
    }

    // 2) Pendente
    {
      const quantity = 2
      const ticketPrice = normalType.price
      const fee = event.ticketFee || 0
      const totalAmount = ticketPrice * quantity + fee * quantity

      const order = new Order({
        customer: u2._id,
        event: event._id,
        tickets: [],
        totalAmount,
        totalTickets: quantity,
        status: 'pending',
        customerData: { name: u2.name, email: u2.email, phone: u2.phone, cpf: u2.cpf },
        isActive: true,
        orderNumber: genOrderNumber(),
      })
      await order.save()

      const tickets = [] as any[]
      for (let i = 0; i < quantity; i++) {
        const t = new Ticket({
          event: event._id,
          ticketType: normalType._id,
          order: order._id,
          holder: u2._id,
          price: ticketPrice,
          status: 'pending',
          code: genOrderNumber() + 'BB',
          qrCode: '',
          isActive: true,
        })
        await t.save()
        tickets.push(t)
      }
      order.tickets = tickets.map(t => t._id as any)
      await order.save()
      ordersOut.push({ kind: 'PENDING', order })
    }

    // 3) Cancelado
    {
      const quantity = 1
      const ticketPrice = normalType.price
      const fee = event.ticketFee || 0
      const totalAmount = ticketPrice * quantity + fee * quantity

      const order = new Order({
        customer: u3._id,
        event: event._id,
        tickets: [],
        totalAmount,
        totalTickets: quantity,
        status: 'pending',
        customerData: { name: u3.name, email: u3.email, phone: u3.phone, cpf: u3.cpf },
        isActive: true,
        orderNumber: genOrderNumber(),
      })
      await order.save()

      const t = new Ticket({
        event: event._id,
        ticketType: normalType._id,
        order: order._id,
        holder: u3._id,
        price: ticketPrice,
        status: 'pending',
        code: genOrderNumber() + 'CC',
        qrCode: '',
        isActive: true,
      })
      await t.save()
      order.tickets = [t._id as any]
      await order.save()

      // Cancelar imediatamente (usa regras do modelo: pending -> cancelled permitido)
      order.status = 'cancelled'
      ;(order as any).cancelledAt = new Date()
      await order.save()
      t.status = 'cancelled'
      t.isActive = false
      t.qrCode = ''
      await t.save()

      ordersOut.push({ kind: 'CANCELLED', order })
    }

    console.log('\n✅ Pedidos criados:')
    ordersOut.forEach(({ kind, order }) => {
      console.log(` - ${kind}: #${order.orderNumber} (${order.status}) total=${order.totalAmount}`)
    })
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(async (e) => {
  console.error('❌ Erro no script:', e)
  await mongoose.disconnect()
  process.exit(1)
})


