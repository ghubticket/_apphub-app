/*
 * CLI: ts-node src/scripts/scanTicket.ts --qr <QR_STRING> [--token <JWT>] [--email <email> --password <pass>] [--baseUrl <http://localhost:3001>]
 * - Verifica o QR seguro no endpoint /api/tickets/scan (requer role ADMIN ou QRCODE)
 * - Se ainda não usado, chama /api/tickets/:code/validate para marcar como USADO
 */

import 'dotenv/config'
import axios from 'axios'

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

async function main() {
  const { qr, token, email, password, baseUrl } = parseArgs()
  if (!qr) {
    console.error('Uso: ts-node src/scripts/scanTicket.ts --qr <QR_STRING> [--token <JWT>] [--email <email> --password <pass>] [--baseUrl <url>]')
    process.exit(1)
  }

  const apiBase = (baseUrl as string) || process.env.BACKEND_URL || 'http://localhost:3001'

  let jwt = token as string | undefined
  if (!jwt && email && password) {
    try {
      let login
      try {
        login = await axios.post(`${apiBase}/auth/login`, { email, password })
      } catch (e) {
        login = await axios.post(`${apiBase}/api/auth/login`, { email, password })
      }
      jwt = login.data?.data?.accessToken || login.data?.accessToken || login.data?.token
      if (!jwt) {
        console.error('Resposta do login:', JSON.stringify(login.data, null, 2))
        throw new Error('Token não retornado pelo login. Verifique a resposta acima.')
      }
    } catch (e: any) {
      console.error('Falha no login:', e?.response?.data || e?.message || e)
      process.exit(1)
    }
  }

  if (!jwt) {
    console.error('É necessário informar --token <JWT> ou --email/--password para autenticar')
    process.exit(1)
  }

  try {
    console.log('🔎 Lendo QR...')
    const scan = await axios.post<ScanResponse>(
      `${apiBase}/api/tickets/scan`,
      { qr },
      { headers: { Authorization: `Bearer ${jwt}` } }
    )

    if (!scan.data?.success || !scan.data?.data) {
      console.error('Falha ao validar QR:', scan.data)
      process.exit(1)
    }

    const ticket = (scan.data.data as any).ticket
    console.log('✅ QR válido para o ticket:', ticket.code)
    console.log('   Status atual:', ticket.status)

    if (ticket.status === 'used') {
      console.log('⚠️  O ticket já foi utilizado.')
      console.log('   usedAt:', ticket?.usedAt, 'usedBy:', ticket?.usedBy)
      return
    }

    console.log('➡️  Marcando ticket como USADO...')
    const validate = await axios.post(
      `${apiBase}/api/tickets/code/${encodeURIComponent(ticket.code)}/validate`,
      {},
      { headers: { Authorization: `Bearer ${jwt}` } }
    )

    console.log('🎉 Resultado:', validate.data)
  } catch (e: any) {
    console.error('Erro ao processar:', e?.response?.data || e?.message || e)
    process.exit(1)
  }
}

main()


