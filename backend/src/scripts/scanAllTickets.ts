/*
 * CLI: ts-node src/scripts/scanAllTickets.ts [--orderId <ID>] [--email <email> --password <pass>] [--baseUrl <http://localhost:3001>]
 * - Busca todos os pedidos (ou um pedido específico) e seus tickets
 * - Para cada ticket com QR code, valida e marca como USADO se ainda não estiver
 */

import 'dotenv/config'
import axios from 'axios'
import mongoose from 'mongoose'
import Jimp from 'jimp'
import jsQR from 'jsqr'
import { Order } from '../models'
import { Ticket } from '../models'

type ScanResponse = {
  success: boolean
  data?: { ticket: any; ts: number }
  message?: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  const res: Record<string, string | undefined> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '')
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
      res[key] = val
    }
  }
  return res
}

async function getAuthToken(email?: string, password?: string, baseUrl?: string): Promise<string> {
  const apiBase = baseUrl || process.env.BACKEND_URL || 'http://localhost:3001'
  
  if (!email || !password) {
    throw new Error('É necessário informar --email e --password para autenticar')
  }

  try {
    // Tentar nas duas convenções de rota: /auth/login e /api/auth/login
    let login
    try {
      login = await axios.post(`${apiBase}/auth/login`, { email, password })
    } catch (e) {
      login = await axios.post(`${apiBase}/api/auth/login`, { email, password })
    }
    const jwt = login.data?.data?.accessToken || login.data?.accessToken || login.data?.token
    if (!jwt) {
      console.error('Resposta do login:', JSON.stringify(login.data, null, 2))
      throw new Error('Token não retornado pelo login. Verifique a resposta acima.')
    }
    return jwt
  } catch (e: any) {
    throw new Error(`Falha no login: ${e?.response?.data?.message || e?.message || e}`)
  }
}

async function extractPayloadFromQRImage(qrBase64: string): Promise<string | null> {
  try {
    // Se já é payload direto (começa com QR1.), retorna direto
    if (qrBase64.startsWith('QR1.')) {
      return qrBase64
    }
    
    // Se é Data URL (data:image/...), extrair apenas o base64
    let base64Data = qrBase64
    if (qrBase64.startsWith('data:')) {
      const commaIdx = qrBase64.indexOf(',')
      if (commaIdx === -1) return null
      base64Data = qrBase64.substring(commaIdx + 1)
    }
    
    // Decodificar imagem
    const imageBuffer = Buffer.from(base64Data, 'base64')
    const image = await Jimp.read(imageBuffer)
    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height
    }
    
    // Decodificar QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (!code) return null
    
    return code.data
  } catch (e) {
    console.error('   ⚠️  Erro ao extrair payload da imagem QR:', e)
    return null
  }
}

async function scanAndValidateQR(qr: string, jwt: string, baseUrl: string): Promise<{ success: boolean; ticketCode?: string; alreadyUsed?: boolean }> {
  try {
    // Extrair payload se for imagem
    const payload = await extractPayloadFromQRImage(qr)
    if (!payload) {
      console.error('   ❌ Não foi possível extrair payload do QR')
      return { success: false }
    }
    
    const scan = await axios.post<ScanResponse>(
      `${baseUrl}/api/tickets/scan`,
      { qr: payload },
      { headers: { Authorization: `Bearer ${jwt}` } }
    )

    if (!scan.data?.success || !scan.data?.data) {
      return { success: false }
    }

    const ticket = (scan.data.data as any).ticket
    if (ticket.status === 'used') {
      return { success: true, ticketCode: ticket.code, alreadyUsed: true }
    }

    await axios.post(
      `${baseUrl}/api/tickets/code/${encodeURIComponent(ticket.code)}/validate`,
      {},
      { headers: { Authorization: `Bearer ${jwt}` } }
    )

    return { success: true, ticketCode: ticket.code, alreadyUsed: false }
  } catch (e: any) {
    console.error(`   ❌ Erro: ${e?.response?.data?.message || e?.message || e}`)
    return { success: false }
  }
}

async function main() {
  const { orderId, email, password, baseUrl } = parseArgs()
  const apiBase = baseUrl || process.env.BACKEND_URL || 'http://localhost:3001'

  // Conectar ao MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub'
  await mongoose.connect(mongoUri)
  console.log('✅ Conectado ao MongoDB')

  // Buscar pedidos
  const query: any = { deletedAt: null }
  if (orderId) {
    query._id = orderId
  }

  const orders = await Order.find(query)
    .populate('tickets')
    .lean()

  if (orders.length === 0) {
    console.log('ℹ️  Nenhum pedido encontrado')
    await mongoose.disconnect()
    return
  }

  console.log(`📦 Encontrados ${orders.length} pedido(s)`)

  // Autenticar
  let jwt: string
  try {
    jwt = await getAuthToken(email as string, password as string, apiBase)
    console.log('✅ Autenticado')
  } catch (e: any) {
    console.error('❌', e.message)
    await mongoose.disconnect()
    process.exit(1)
  }

  let totalTickets = 0
  let scanned = 0
  let validated = 0
  let alreadyUsed = 0
  let errors = 0

  for (const order of orders) {
    console.log(`\n📋 Pedido: ${(order as any).orderNumber || order._id}`)
    
    const tickets = await Ticket.find({ order: order._id, deletedAt: null }).lean()
    if (tickets.length === 0) {
      console.log('   ⚠️  Sem tickets')
      continue
    }

    console.log(`   🎫 ${tickets.length} ticket(s) encontrado(s)`)

    for (const ticket of tickets) {
      totalTickets++
      const qr = (ticket as any).qrCode
      if (!qr) {
        console.log(`   ⚠️  Ticket ${(ticket as any).code}: sem QR code`)
        continue
      }

      const status = (ticket as any).status
      console.log(`   🔍 Ticket ${(ticket as any).code} (status: ${status})...`)

      const result = await scanAndValidateQR(qr, jwt, apiBase)
      scanned++

      if (!result.success) {
        errors++
        continue
      }

      if (result.alreadyUsed) {
        alreadyUsed++
        console.log(`      ✅ Já estava USADO`)
      } else {
        validated++
        console.log(`      ✅ Marcado como USADO`)
      }

      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   Total de tickets: ${totalTickets}`)
  console.log(`   Escaneados: ${scanned}`)
  console.log(`   Validados (marcados como USADO): ${validated}`)
  console.log(`   Já estavam USADOS: ${alreadyUsed}`)
  console.log(`   Erros: ${errors}`)

  await mongoose.disconnect()
  console.log('\n✅ Concluído')
}

main().catch(e => {
  console.error('Erro fatal:', e)
  process.exit(1)
})

