/*
 * Script para diagnosticar problemas com QR_SECRET e QR_HMAC_SECRET
 */

import 'dotenv/config'
import crypto from 'crypto'

function checkSecret(name: string, value: string | undefined) {
  if (!value) {
    console.log(`❌ ${name}: NÃO DEFINIDO`)
    return false
  }

  const trimmed = value.trim()
  const len = trimmed.length
  
  console.log(`\n📋 ${name}:`)
  console.log(`   Tamanho: ${len} caracteres`)
  console.log(`   Primeiros 10: ${trimmed.substring(0, 10)}`)
  console.log(`   Últimos 10: ${trimmed.substring(len - 10)}`)
  console.log(`   Tem espaços? ${trimmed.includes(' ') ? 'SIM ❌' : 'NÃO ✅'}`)
  console.log(`   Tem quebras de linha? ${trimmed.includes('\n') || trimmed.includes('\r') ? 'SIM ❌' : 'NÃO ✅'}`)
  
  if (len === 64) {
    // Tentar como HEX
    try {
      const buf = Buffer.from(trimmed, 'hex')
      if (buf.length === 32) {
        console.log(`   ✅ Formato HEX válido (32 bytes)`)
        return true
      }
    } catch {}
  }
  
  if (len === 44 || len === 43 || len === 42) {
    // Tentar como Base64
    try {
      const buf = Buffer.from(trimmed, 'base64')
      if (buf.length === 32) {
        console.log(`   ✅ Formato Base64 válido (32 bytes)`)
        return true
      }
    } catch {}
  }
  
  console.log(`   ❌ Tamanho inválido! Deve ser 64 (HEX) ou 44 (Base64)`)
  return false
}

console.log('🔍 Verificando QR_SECRET e QR_HMAC_SECRET...\n')

const qrSecret = process.env.QR_SECRET
const qrHmacSecret = process.env.QR_HMAC_SECRET

const secretOk = checkSecret('QR_SECRET', qrSecret)
const hmacOk = checkSecret('QR_HMAC_SECRET', qrHmacSecret)

if (!secretOk || !hmacOk) {
  console.log('\n💡 Para gerar novos segredos válidos, execute:')
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  console.log('\n   Cole o resultado (64 caracteres) no .env:')
  console.log('   QR_SECRET=<resultado>')
  console.log('   QR_HMAC_SECRET=<outro_resultado_de_64_chars>')
  process.exit(1)
}

console.log('\n✅ Ambos os segredos estão válidos!')
console.log('\n💡 Próximos passos:')
console.log('   1. Reinicie o backend')
console.log('   2. Execute: npm run regen-qr -- --onlyVip true')
console.log('   3. Teste: npm run scan-all-tickets -- --email admin@... --password ...')

