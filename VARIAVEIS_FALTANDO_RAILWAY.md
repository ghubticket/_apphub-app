# 🔐 Variáveis Faltando no Railway

> **Status:** Backend funcionando ✅  
> **Última atualização:** 19/11/2025

---

## 📋 Variáveis Já Configuradas

Você já tem estas 3 variáveis no Railway:

1. ✅ `MONGODB_URI` - MongoDB Atlas connection string
2. ✅ `NODE_ENV` - Ambiente (deve ser `production`)
3. ✅ `PORT` - Porta do servidor (Railway injeta automaticamente)

---

## 🚨 Variáveis Obrigatórias (Críticas)

**Sem essas, o servidor pode não funcionar corretamente:**

### 1. JWT Authentication (Autenticação)

```bash
JWT_SECRET=<gerar_com_openssl_rand_-base64_32>
JWT_REFRESH_SECRET=<gerar_com_openssl_rand_-base64_32>
JWT_EXPIRES_IN=7d
```

**Como gerar:**
```powershell
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
```

**Por que precisa:** Autenticação de usuários, tokens JWT, sessões.

---

### 2. QR Code Security (Segurança dos QR Codes)

```bash
QR_SECRET=<gerar_com_openssl_rand_-hex_32>
QR_HMAC_SECRET=<gerar_com_openssl_rand_-hex_32>
```

**Como gerar:**
```powershell
openssl rand -hex 32  # QR_SECRET
openssl rand -hex 32  # QR_HMAC_SECRET
```

**Por que precisa:** Geração e validação segura de QR codes dos ingressos.

---

### 3. Encryption Key (Criptografia de Dados Sensíveis)

```bash
ENCRYPTION_KEY=<gerar_com_openssl_rand_-hex_32>
```

**Como gerar:**
```powershell
openssl rand -hex 32
```

**Por que precisa:** Criptografia de CPF, telefone e outros dados sensíveis.

---

### 4. Security Settings (Configurações de Segurança)

```bash
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Por que precisa:** Hash de senhas e rate limiting da API.

---

## ⚠️ Variáveis para Funcionalidades (Opcionais por enquanto)

**Sem essas, as funcionalidades não funcionarão, mas o servidor inicia:**

### 5. Mercado Pago (Pagamentos)

```bash
MP_ACCESS_TOKEN=TEST-seu-access-token-aqui
MP_PUBLIC_KEY=TEST-seu-public-key-aqui
```

**Onde obter:** https://www.mercadopago.com.br/developers  
**Por que precisa:** Processamento de pagamentos PIX e cartão.

---

### 6. Resend (Emails)

```bash
RESEND_API_KEY=re_sua_api_key_aqui
RESEND_FROM_EMAIL=EventHub <onboarding@resend.dev>
```

**Onde obter:** https://resend.com  
**Por que precisa:** Envio de emails (confirmação de pedidos, QR codes, etc).

---

### 7. Cloudinary (Upload de Imagens)

```bash
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

**Onde obter:** https://cloudinary.com  
**Por que precisa:** Upload e armazenamento de imagens de eventos.

---

## 🌐 Variáveis de URLs (Quando Frontends Estiverem Prontos)

**Adicione quando fizer deploy dos frontends:**

```bash
FRONTEND_URL=https://seu-frontend.vercel.app
BACKEND_URL=https://apphub-app-production.up.railway.app
QR_SCANNER_URL=https://seu-scanner.vercel.app
DASHBOARD_URL=https://seu-dashboard.vercel.app
```

**Por que precisa:** CORS, links em emails, redirecionamentos.

---

## 📊 Resumo - O Que Adicionar Agora

### Prioridade 1 (Críticas - Adicionar Agora):

1. `JWT_SECRET` ⚠️
2. `JWT_REFRESH_SECRET` ⚠️
3. `QR_SECRET` ⚠️
4. `QR_HMAC_SECRET` ⚠️
5. `ENCRYPTION_KEY` ⚠️
6. `BCRYPT_ROUNDS=12`
7. `RATE_LIMIT_WINDOW_MS=900000`
8. `RATE_LIMIT_MAX_REQUESTS=100`
9. `JWT_EXPIRES_IN=7d`

### Prioridade 2 (Funcionalidades - Adicionar Depois):

10. `MP_ACCESS_TOKEN` (quando precisar de pagamentos)
11. `MP_PUBLIC_KEY` (quando precisar de pagamentos)
12. `RESEND_API_KEY` (quando precisar de emails)
13. `RESEND_FROM_EMAIL` (quando precisar de emails)
14. `CLOUDINARY_CLOUD_NAME` (quando precisar de uploads)
15. `CLOUDINARY_API_KEY` (quando precisar de uploads)
16. `CLOUDINARY_API_SECRET` (quando precisar de uploads)

### Prioridade 3 (URLs - Quando Frontends Estiverem Prontos):

17. `FRONTEND_URL`
18. `QR_SCANNER_URL`
19. `DASHBOARD_URL`

---

## 🎯 Passo a Passo para Adicionar

### 1. Gerar os Secrets

Execute no terminal:

```powershell
# JWT Secrets
openssl rand -base64 32
openssl rand -base64 32

# QR Secrets
openssl rand -hex 32
openssl rand -hex 32

# Encryption Key
openssl rand -hex 32
```

**Salve todos os valores gerados!**

### 2. Adicionar no Railway

1. No Railway: **Settings** → **Variables**
2. Clique em **"+ New Variable"**
3. Adicione cada variável:
   - **Nome:** `JWT_SECRET`
   - **Valor:** `<valor_gerado>`
   - Clique em **Add**
4. Repita para todas as variáveis da Prioridade 1

### 3. Redeploy

Após adicionar todas as variáveis:

1. **Deployments** → 3 pontinhos → **Redeploy**
2. Aguarde o deploy completar
3. Verifique se está funcionando

---

## ✅ Checklist

- [ ] `JWT_SECRET` adicionado
- [ ] `JWT_REFRESH_SECRET` adicionado
- [ ] `QR_SECRET` adicionado
- [ ] `QR_HMAC_SECRET` adicionado
- [ ] `ENCRYPTION_KEY` adicionado
- [ ] `BCRYPT_ROUNDS=12` adicionado
- [ ] `RATE_LIMIT_WINDOW_MS=900000` adicionado
- [ ] `RATE_LIMIT_MAX_REQUESTS=100` adicionado
- [ ] `JWT_EXPIRES_IN=7d` adicionado
- [ ] Redeploy feito
- [ ] Servidor funcionando

---

## 🔍 Como Verificar se Está Funcionando

Após adicionar as variáveis e fazer redeploy:

1. **Teste a API:**
   ```bash
   curl https://apphub-app-production.up.railway.app/health
   ```

2. **Verifique os logs no Railway:**
   - Deployments → último deploy → Logs
   - Não deve ter erros relacionados a variáveis faltando

3. **Teste autenticação:**
   - Tente fazer login via API
   - Se funcionar, as variáveis JWT estão corretas

---

## 📝 Notas

- **Secrets:** Nunca compartilhe os valores gerados. Eles são únicos e críticos para segurança.
- **Mercado Pago:** Use credenciais de **TESTE** (`TEST-*`) para desenvolvimento.
- **Resend:** Use `onboarding@resend.dev` para testes (não precisa verificar domínio).
- **URLs:** Adicione apenas quando os frontends estiverem deployados.

---

**Pronto!** 🎉 Agora você sabe exatamente o que falta configurar no Railway!

