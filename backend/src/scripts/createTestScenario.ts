/**
 * Script para criar cenário de teste financeiro
 * 
 * Cria:
 * 1. Um evento com 10% de taxa da plataforma
 * 2. Ingresso de R$ 150,00
 * 3. Código de promotor com 10% de desconto
 * 4. Pedido 1: SEM código e SEM desconto (pedido normal)
 * 5. Pedido 2: SEM código e SEM desconto (outro pedido normal)
 * 6. Pedido 3: COM código de promotor (com desconto)
 * 
 * Execução:
 *   npm run create-test-scenario
 *   ou
 *   npx ts-node src/scripts/createTestScenario.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { Event, TicketType, Order, Ticket, User, PromoterCode } from '../models'
import { generateQRCode } from '../services/qrCodeService'

dotenv.config()

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub'
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Conectado ao MongoDB')

  try {
    console.log('\n🎯 Criando cenário de teste financeiro...\n')

    // ============================================
    // 0. BUSCAR OU CRIAR ADMIN/ORGANIZADOR
    // ============================================
    console.log('👤 0. Buscando organizador...')
    let organizer = await User.findOne({ role: 'ADMIN', deletedAt: null })
    
    if (!organizer) {
      // Buscar qualquer usuário ativo
      organizer = await User.findOne({ deletedAt: null, isActive: true })
      
      if (!organizer) {
        // Criar admin se não houver nenhum usuário
        console.log('   💡 Criando usuário admin...')
        const hashedPassword = await bcrypt.hash('123456', 10)
        organizer = new User({
          name: 'Admin Teste',
          email: 'admin@teste.com',
          password: hashedPassword,
          role: 'ADMIN',
          phone: '(11) 99999-9999',
          cpf: '000.000.000-00',
          isActive: true,
        })
        await organizer.save()
      }
    }
    
    console.log(`   ✅ Organizador: ${organizer.name} (${organizer.email})`)

    // ============================================
    // 1. CRIAR EVENTO COM 10% DE TAXA
    // ============================================
    console.log('\n📅 1. Criando evento com 10% de taxa...')
    const event = new Event({
      name: 'Show de Teste - Cenário Financeiro',
      description: 'Evento criado automaticamente para testes do cálculo financeiro',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
      time: '20:00',
      location: 'Arena de Testes',
      address: 'Rua de Teste, 123 - Centro',
      city: 'São Paulo',
      state: 'SP',
      price: 150, // Preço base (obrigatório)
      capacity: 300, // Capacidade total (obrigatório)
      soldTickets: 0,
      platformFeePercentage: 10, // 10% de taxa
      organizer: organizer._id, // Organizador (obrigatório)
      tags: [],
      status: 'published',
      isActive: true,
    })
    await event.save()
    console.log(`   ✅ Evento criado: ${event.name} (Taxa: ${event.platformFeePercentage}%)`)

    // ============================================
    // 2. CRIAR INGRESSO DE R$ 150,00
    // ============================================
    console.log('\n🎫 2. Criando ingresso de R$ 150,00...')
    const ticketType = new TicketType({
      name: 'Pista - Teste',
      description: 'Ingresso de teste',
      event: event._id,
      price: 150,
      isVIP: false,
      lotNumber: 1,
      maxQuantity: 200,
      maxPerPurchase: 10,
      soldQuantity: 0,
      isActive: true,
    })
    await ticketType.save()
    console.log(`   ✅ Ingresso criado: ${ticketType.name} - R$ ${ticketType.price.toFixed(2)}`)

    // ============================================
    // 3. BUSCAR OU CRIAR USUÁRIOS
    // ============================================
    console.log('\n👥 3. Buscando/criando usuários...')
    let users = await User.find({ deletedAt: null, isActive: true, role: 'CLIENTE' }).limit(3)
    
    // Se não houver usuários suficientes, criar alguns
    if (users.length < 3) {
      console.log('   💡 Criando usuários de teste...')
      for (let i = users.length; i < 3; i++) {
        const hashedPassword = await bcrypt.hash('123456', 10)
        const user = new User({
          name: `Usuário Teste ${i + 1}`,
          email: `teste${i + 1}@exemplo.com`,
          password: hashedPassword,
          role: 'CLIENTE',
          phone: `(11) 9999${String(i).padStart(4, '0')}`,
          cpf: `000.000.00${String(i).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
          isActive: true,
        })
        await user.save()
        users.push(user)
      }
    }
    
    console.log(`   ✅ ${users.length} usuário(s) disponível(is)`)

    // ============================================
    // 4. BUSCAR OU CRIAR CÓDIGO DE PROMOTOR COM 10% DE DESCONTO
    // ============================================
    console.log('\n🎟️  4. Buscando/criando código de promotor com 10% de desconto...')
    let adminUser = await User.findOne({ role: 'ADMIN', deletedAt: null })
    
    if (!adminUser) {
      adminUser = organizer
    }

    // Buscar código existente
    let promoterCode = await PromoterCode.findOne({ 
      code: 'TESTE123',
      deletedAt: null 
    })

    if (promoterCode) {
      console.log(`   ✅ Código encontrado: ${promoterCode.code} (${promoterCode.discountValue}% desconto)`)
      // Garantir que o evento está associado ao código
      if (!promoterCode.events.includes(event._id as any)) {
        promoterCode.events.push(event._id as any)
        await promoterCode.save()
      }
    } else {
      // Criar novo código
      promoterCode = new PromoterCode({
        code: 'TESTE123',
        name: 'Promotor de Teste',
        cpf: '111.222.333-44',
        email: 'promotor@teste.com',
        whatsapp: '(11) 99999-9999',
        discountType: 'percentage',
        discountValue: 10, // 10% de desconto
        currentUses: 0,
        isActive: true,
        events: [event._id],
        createdBy: adminUser._id,
      })
      await promoterCode.save()
      console.log(`   ✅ Código criado: ${promoterCode.code} (${promoterCode.discountValue}% desconto)`)
    }

    // ============================================
    // FUNÇÃO AUXILIAR: Gerar orderNumber
    // ============================================
    const genOrderNumber = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let s = ''
      for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
      return s
    }

    // ============================================
    // 5. CRIAR PEDIDO 1: SEM CÓDIGO E SEM DESCONTO
    // ============================================
    console.log('\n💰 5. Criando pedido 1: SEM código e SEM desconto...')
    const user1 = users[0]
    const quantity1 = 1
    
    // Calcular valores (sem desconto):
    // 1. Subtotal: R$ 150,00
    // 2. Taxa (10% sobre R$ 150,00): R$ 15,00
    // 3. Total: R$ 165,00
    const subtotal1 = ticketType.price * quantity1 // R$ 150,00
    const platformFee1 = subtotal1 * (event.platformFeePercentage / 100) // R$ 15,00 (10% sobre R$ 150)
    const totalAmount1 = subtotal1 + platformFee1 // R$ 165,00

    const order1 = new Order({
      customer: user1._id,
      event: event._id,
      tickets: [],
      subtotal: subtotal1,
      discountAmount: 0,
      platformFee: platformFee1,
      totalAmount: totalAmount1,
      totalTickets: quantity1,
      status: 'paid',
      paymentMethod: 'pix',
      paidAt: new Date(),
      customerData: {
        name: user1.name || 'Não informado',
        email: user1.email || 'Não informado',
        phone: user1.phone,
        cpf: user1.cpf,
      },
      isActive: true,
      orderNumber: genOrderNumber(),
    })
    await order1.save()

    // Criar tickets
    const tickets1: any[] = []
    for (let i = 0; i < quantity1; i++) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let ticketCode = ''
      for (let j = 0; j < 12; j++) {
        ticketCode += chars[Math.floor(Math.random() * chars.length)]
      }
      const qrCodeData = JSON.stringify({
        ticketId: ticketCode,
        orderNumber: order1.orderNumber,
        eventId: String(event._id),
        ticketTypeId: String(ticketType._id),
      })
      const qrCode = await generateQRCode(qrCodeData)

      const ticket = new Ticket({
        event: event._id,
        order: order1._id,
        ticketType: ticketType._id,
        holder: user1._id,
        code: ticketCode,
        qrCode: qrCode,
        price: ticketType.price,
        status: 'confirmed',
        isActive: true,
      })
      await ticket.save()
      tickets1.push(ticket)
    }
    order1.tickets = tickets1.map(t => t._id)
    await order1.save()
    ticketType.soldQuantity = (ticketType.soldQuantity || 0) + quantity1
    await ticketType.save()
    console.log(`   ✅ Pedido 1 criado: ${order1.orderNumber} - R$ ${totalAmount1.toFixed(2)} (SEM código, SEM desconto)`)

    // ============================================
    // 6. CRIAR PEDIDO 2: SEM CÓDIGO E SEM DESCONTO
    // ============================================
    console.log('\n💰 6. Criando pedido 2: SEM código e SEM desconto...')
    const user2 = users[1] || users[0]
    const quantity2 = 1
    
    const subtotal2 = ticketType.price * quantity2 // R$ 150,00
    const platformFee2 = subtotal2 * (event.platformFeePercentage / 100) // R$ 15,00
    const totalAmount2 = subtotal2 + platformFee2 // R$ 165,00

    const order2 = new Order({
      customer: user2._id,
      event: event._id,
      tickets: [],
      subtotal: subtotal2,
      discountAmount: 0,
      platformFee: platformFee2,
      totalAmount: totalAmount2,
      totalTickets: quantity2,
      status: 'paid',
      paymentMethod: 'pix',
      paidAt: new Date(),
      customerData: {
        name: user2.name || 'Não informado',
        email: user2.email || 'Não informado',
        phone: user2.phone,
        cpf: user2.cpf,
      },
      isActive: true,
      orderNumber: genOrderNumber(),
    })
    await order2.save()

    // Criar tickets
    const tickets2: any[] = []
    for (let i = 0; i < quantity2; i++) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let ticketCode = ''
      for (let j = 0; j < 12; j++) {
        ticketCode += chars[Math.floor(Math.random() * chars.length)]
      }
      const qrCodeData = JSON.stringify({
        ticketId: ticketCode,
        orderNumber: order2.orderNumber,
        eventId: String(event._id),
        ticketTypeId: String(ticketType._id),
      })
      const qrCode = await generateQRCode(qrCodeData)

      const ticket = new Ticket({
        event: event._id,
        order: order2._id,
        ticketType: ticketType._id,
        holder: user2._id,
        code: ticketCode,
        qrCode: qrCode,
        price: ticketType.price,
        status: 'confirmed',
        isActive: true,
      })
      await ticket.save()
      tickets2.push(ticket)
    }
    order2.tickets = tickets2.map(t => t._id)
    await order2.save()
    ticketType.soldQuantity = (ticketType.soldQuantity || 0) + quantity2
    await ticketType.save()
    console.log(`   ✅ Pedido 2 criado: ${order2.orderNumber} - R$ ${totalAmount2.toFixed(2)} (SEM código, SEM desconto)`)

    // ============================================
    // 7. CRIAR PEDIDO 3: COM CÓDIGO DE PROMOTOR (COM DESCONTO)
    // ============================================
    console.log('\n💰 7. Criando pedido 3: COM código de promotor (COM desconto)...')
    const user3 = users[2] || users[0]
    const quantity3 = 1
    
    // Calcular valores seguindo a regra de negócio:
    // 1. Subtotal: R$ 150,00
    // 2. Desconto (10%): R$ 15,00
    // 3. Subtotal após desconto: R$ 135,00
    // 4. Taxa (10% sobre R$ 135,00): R$ 13,50
    // 5. Total: R$ 148,50
    const subtotal3 = ticketType.price * quantity3 // R$ 150,00
    const discountAmount3 = subtotal3 * (promoterCode.discountValue / 100) // R$ 15,00 (10%)
    const subtotalAfterDiscount3 = subtotal3 - discountAmount3 // R$ 135,00
    const platformFee3 = subtotalAfterDiscount3 * (event.platformFeePercentage / 100) // R$ 13,50 (10% sobre R$ 135)
    const totalAmount3 = subtotalAfterDiscount3 + platformFee3 // R$ 148,50

    const order3 = new Order({
      customer: user3._id,
      event: event._id,
      tickets: [],
      subtotal: subtotal3,
      discountAmount: discountAmount3,
      platformFee: platformFee3,
      totalAmount: totalAmount3,
      promoterCode: promoterCode.code,
      totalTickets: quantity3,
      status: 'paid',
      paymentMethod: 'pix',
      paidAt: new Date(),
      customerData: {
        name: user3.name || 'Não informado',
        email: user3.email || 'Não informado',
        phone: user3.phone,
        cpf: user3.cpf,
      },
      isActive: true,
      orderNumber: genOrderNumber(),
    })
    await order3.save()

    // Criar tickets
    const tickets3: any[] = []
    for (let i = 0; i < quantity3; i++) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let ticketCode = ''
      for (let j = 0; j < 12; j++) {
        ticketCode += chars[Math.floor(Math.random() * chars.length)]
      }
      const qrCodeData = JSON.stringify({
        ticketId: ticketCode,
        orderNumber: order3.orderNumber,
        eventId: String(event._id),
        ticketTypeId: String(ticketType._id),
      })
      const qrCode = await generateQRCode(qrCodeData)

      const ticket = new Ticket({
        event: event._id,
        order: order3._id,
        ticketType: ticketType._id,
        holder: user3._id,
        code: ticketCode,
        qrCode: qrCode,
        price: ticketType.price,
        status: 'confirmed',
        isActive: true,
      })
      await ticket.save()
      tickets3.push(ticket)
    }
    order3.tickets = tickets3.map(t => t._id)
    await order3.save()
    ticketType.soldQuantity = (ticketType.soldQuantity || 0) + quantity3
    await ticketType.save()
    promoterCode.currentUses = (promoterCode.currentUses || 0) + quantity3
    await promoterCode.save()
    console.log(`   ✅ Pedido 3 criado: ${order3.orderNumber} - R$ ${totalAmount3.toFixed(2)} (COM código ${promoterCode.code}, COM desconto)`)

    // ============================================
    // RESUMO FINAL
    // ============================================
    console.log('\n' + '='.repeat(60))
    console.log('✅ CENÁRIO DE TESTE CRIADO COM SUCESSO!')
    console.log('='.repeat(60))
    console.log('\n📊 Resumo:')
    console.log(`   📅 Evento: ${event.name}`)
    console.log(`   💰 Taxa da Plataforma: ${event.platformFeePercentage}%`)
    console.log(`   🎫 Ingresso: R$ ${ticketType.price.toFixed(2)}`)
    console.log(`   🎟️  Código Promotor: ${promoterCode.code} (${promoterCode.discountValue}% desconto)`)
    console.log(`\n📦 Pedidos criados:`)
    console.log(`\n   1️⃣  Pedido SEM código e SEM desconto:`)
    console.log(`      Número: ${order1.orderNumber}`)
    console.log(`      Subtotal: R$ ${subtotal1.toFixed(2)}`)
    console.log(`      Taxa (${event.platformFeePercentage}%): R$ ${platformFee1.toFixed(2)}`)
    console.log(`      Total: R$ ${totalAmount1.toFixed(2)}`)
    console.log(`\n   2️⃣  Pedido SEM código e SEM desconto:`)
    console.log(`      Número: ${order2.orderNumber}`)
    console.log(`      Subtotal: R$ ${subtotal2.toFixed(2)}`)
    console.log(`      Taxa (${event.platformFeePercentage}%): R$ ${platformFee2.toFixed(2)}`)
    console.log(`      Total: R$ ${totalAmount2.toFixed(2)}`)
    console.log(`\n   3️⃣  Pedido COM código (COM desconto):`)
    console.log(`      Número: ${order3.orderNumber}`)
    console.log(`      Código: ${promoterCode.code}`)
    console.log(`      Subtotal: R$ ${subtotal3.toFixed(2)}`)
    console.log(`      Desconto (${promoterCode.discountValue}%): -R$ ${discountAmount3.toFixed(2)}`)
    console.log(`      Subtotal após desconto: R$ ${subtotalAfterDiscount3.toFixed(2)}`)
    console.log(`      Taxa (${event.platformFeePercentage}% sobre R$ ${subtotalAfterDiscount3.toFixed(2)}): R$ ${platformFee3.toFixed(2)}`)
    console.log(`      Total: R$ ${totalAmount3.toFixed(2)}`)
    console.log(`\n📈 Repasse Financeiro Total:`)
    const totalSales = (subtotal1 - 0) + (subtotal2 - 0) + (subtotal3 - discountAmount3)
    const totalFees = platformFee1 + platformFee2 + platformFee3
    console.log(`   Para o dono do evento: R$ ${totalSales.toFixed(2)}`)
    console.log(`   Plataforma recebe: R$ ${totalFees.toFixed(2)}`)
    console.log('\n🎉 Pronto para testes!')

  } catch (error: any) {
    console.error('\n❌ Erro ao criar cenário:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Desconectado do MongoDB')
  }
}

main()
