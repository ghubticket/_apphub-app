# 🚀 Checklist de Deploy para DEV - EventHub

> **Data:** 19/11/2025  
> **Ambiente:** Desenvolvimento (DEV)  
> **Estrutura:** Monorepo com 1 Backend + 3 Frontends

---

## 📁 Estrutura do Projeto

```
_apphub-back/
├── backend/              # API Node.js + Express + MongoDB
├── frontend/             # Portal Público (Next.js) - Compra de ingressos
├── dashboard/            # Dashboard Admin (Next.js + MUI)
├── qr-scanner-app/       # PWA de Validação (React + Vite)
└── certificates/         # Certificados SSL (desenvolvimento)
```

---

## 🎯 O Que Será Deployado

### ✅ Backend (API)
- **Stack:** Node.js + Express + TypeScript + MongoDB
- **Porta:** 3443 (HTTPS) ou 3001 (HTTP)
- **Funcionalidades:**
  - Autenticação (JWT + Sessions)
  - Sistema de pedidos e ingressos
  - Pagamento (Mercado Pago - PIX + Cartão)
  - QR Codes seguros
  - Sistema de validação
  - Emails (Resend)
  - Uploads (Cloudinary)

### ✅ Frontend Público (Portal de Compra)
- **Stack:** Next.js 14 + Tailwind + SASS
- **Porta:** 3000
- **Funcionalidades:**
  - Landing page
  - Lista de eventos
  - Checkout (PIX + Cartão)
  - Área do cliente (/dashboard)
  - Códigos de promotor

### ✅ Dashboard Admin
- **Stack:** Next.js + MUI (Template Vuexy)
- **Porta:** 3000 (diferente em dev)
- **Funcionalidades:**
  - Gestão de eventos
  - Gestão de pedidos
  - Distribuição de VIPs
  - Códigos de promoter
  - Usuários e segurança
  - Relatórios

### ✅ QR Scanner App (PWA)
- **Stack:** React + Vite + Bootstrap 5
- **Porta:** 5174
- **Funcionalidades:**
  - Leitura de QR Codes
  - Validação offline-first
  - Histórico persistente
  - Detecção de fraudes

---

## 🔧 Pré-Requisitos

### Serviços Externos Necessários

#### 1. MongoDB Atlas (Banco de Dados)
- [ ] Conta criada em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Cluster criado (Free Tier é suficiente para DEV)
- [ ] Usuário e senha configurados
- [ ] IP liberado (0.0.0.0/0 para DEV)
- [ ] Connection String copiada

**Formato da Connection String:**
```
mongodb+srv://username:password@cluster.mongodb.net/eventhub?retryWrites=true&w=majority
```

#### 2. Mercado Pago (Pagamentos)
- [ ] Conta criada em [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [ ] Credenciais de TESTE obtidas:
  - [ ] `TEST-*` Access Token
  - [ ] `TEST-*` Public Key
- [ ] Webhook configurado (depois do deploy)

**Link:** https://www.mercadopago.com.br/developers/panel/app

#### 3. Resend (Emails)
- [ ] Conta criada em [Resend](https://resend.com)
- [ ] API Key gerada
- [ ] Domínio verificado OU usar email de teste: `onboarding@resend.dev`

**Limite Free:** 3.000 emails/mês

#### 4. Cloudinary (Upload de Imagens)
- [ ] Conta criada em [Cloudinary](https://cloudinary.com)
- [ ] Credenciais obtidas:
  - [ ] Cloud Name
  - [ ] API Key
  - [ ] API Secret

**Limite Free:** 25 GB de armazenamento

#### 5. Plataforma de Deploy

**✅ DECISÃO: Vercel (Frontends) + Railway (Backend)**

**Vercel** (Frontends - Next.js)
- [ ] Conta criada em [Vercel](https://vercel.com)
- [ ] Free tier: Deploy ilimitado
- [ ] Deploy automático via GitHub
- [ ] Otimizado para Next.js
- [ ] **Vai hospedar:**
  - Frontend Público (Portal de compra)
  - Dashboard Admin
  - QR Scanner App (SPA)

**Railway** (Backend - Node.js)
- [ ] Conta criada em [Railway](https://railway.app)
- [ ] $5 de crédito grátis/mês
- [ ] Deploy automático via GitHub
- [ ] **Vai hospedar:**
  - API Backend (Express + MongoDB)

---

## 📝 Configuração - Backend

### 1. Variáveis de Ambiente (`.env`)

Criar arquivo `backend/.env`:

```bash
# Node Environment
NODE_ENV=development
PORT=3001
HTTPS_PORT=3443

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventhub?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=<gerar_com_openssl_rand_-base64_32>
JWT_REFRESH_SECRET=<gerar_com_openssl_rand_-base64_32>
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# QR Code Security (gerar com openssl rand -hex 32)
QR_SECRET=<gerar_64_caracteres_hex>
QR_HMAC_SECRET=<gerar_64_caracteres_hex>

# Encryption Key (gerar com openssl rand -hex 32)
ENCRYPTION_KEY=<gerar_64_caracteres_hex>

# Mercado Pago (TESTE)
MP_ACCESS_TOKEN=TEST-your-access-token-aqui
MP_PUBLIC_KEY=TEST-your-public-key-aqui

# Email (Resend)
RESEND_API_KEY=re_sua_api_key_aqui
RESEND_FROM_EMAIL=EventHub <onboarding@resend.dev>

# Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
QR_SCANNER_URL=http://localhost:5174
DASHBOARD_URL=http://localhost:3000

# Monitoramento (opcional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1

# SSL (desenvolvimento)
SSL_ENABLED=false
```

### 2. Gerar Secrets

```bash
# JWT Secret
openssl rand -base64 32

# QR Secrets (64 chars hex)
openssl rand -hex 32

# Encryption Key (64 chars hex)
openssl rand -hex 32
```

### 3. Criar Usuário Admin

```bash
cd backend
npm run create-admin -- --email admin@eventhub.com --password "SuaSenhaForte123!" --name "Admin Master"
```

---

## 📝 Configuração - Frontend Público

### Variáveis de Ambiente (`.env.local`)

Criar arquivo `frontend/.env.local`:

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Mercado Pago (Público)
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-your-public-key-aqui

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 Configuração - Dashboard Admin

### Variáveis de Ambiente (`.env.local`)

Criar arquivo `dashboard/.env.local`:

```bash
# App
BASEPATH=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NextAuth
NEXTAUTH_BASEPATH=/api/auth
NEXTAUTH_URL=http://localhost:3000/api/auth
NEXTAUTH_SECRET=<gerar_com_openssl_rand_-base64_32>

# API
API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# OAuth (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Mapbox (opcional)
MAPBOX_ACCESS_TOKEN=
```

**Importante:** Gerar novo `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## 📝 Configuração - QR Scanner App

### Variáveis de Ambiente (`.env`)

Criar arquivo `qr-scanner-app/.env`:

```bash
# API Backend
VITE_API_URL=http://localhost:3001/api
```

---

## 🚀 Deploy Local (Desenvolvimento)

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Criar .env (conforme acima)
cp env.example .env
# Editar .env com suas credenciais

# Iniciar servidor
npm run dev

# Verificar: http://localhost:3001/health
```

### 2. Frontend Público

```bash
cd frontend

# Instalar dependências
npm install

# Criar .env.local
# (conforme acima)

# Iniciar servidor
npm run dev

# Acessar: http://localhost:3000
```

### 3. Dashboard Admin

```bash
cd dashboard

# Instalar dependências
npm install

# Renomear env.local para .env.local
mv env.local .env.local

# Editar .env.local com suas credenciais

# Iniciar servidor
npm run dev

# Acessar: http://localhost:3000 (porta diferente do frontend)
```

### 4. QR Scanner App

```bash
cd qr-scanner-app

# Instalar dependências
npm install

# Criar .env
# (conforme acima)

# Iniciar servidor
npm run dev

# Acessar: http://localhost:5174
```

---

## 🔍 Testes Básicos

### Backend API

```bash
# Health check
curl http://localhost:3001/health

# Swagger docs
Abrir: http://localhost:3001/api-docs
```

### Frontend Público

- [ ] Landing page carrega
- [ ] Lista de eventos funciona
- [ ] Checkout abre (sem criar pedido ainda)

### Dashboard Admin

- [ ] Login funciona (admin@eventhub.com)
- [ ] Lista de eventos carrega
- [ ] Dashboard CRM abre

### QR Scanner

- [ ] Login funciona
- [ ] Câmera solicita permissão
- [ ] Scanner abre

---

## 🚀 Deploy em Servidor (DEV)

### 1. Backend (Railway)

**Passo a passo:**

1. **Acessar [Railway](https://railway.app) e fazer login**

2. **Criar novo projeto:**
   - New Project → Deploy from GitHub repo
   - Selecionar repositório `_apphub-back`
   - **Root Directory:** `backend`

3. **Configurar variáveis de ambiente:**
   - Settings → Variables
   - Adicionar todas as variáveis do `.env`:
     ```
     NODE_ENV=production
     PORT=$PORT (Railway injeta automaticamente)
     MONGODB_URI=mongodb+srv://...
     JWT_SECRET=...
     MP_ACCESS_TOKEN=...
     RESEND_API_KEY=...
     CLOUDINARY_CLOUD_NAME=...
     (etc - todas as variáveis do checklist)
     ```

4. **Deploy:**
   - Railway faz deploy automático
   - URL gerada: `https://seu-app.up.railway.app`

5. **Configurar domínio (opcional):**
   - Settings → Domains → Add Custom Domain

**Custo:** $5/mês de crédito grátis (suficiente para DEV)

---

### 2. Frontend Público (Vercel)

**Passo a passo:**

1. **Acessar [Vercel](https://vercel.com) e fazer login**

2. **Import Project:**
   - Add New → Project
   - Import Git Repository
   - Selecionar `_apphub-back`

3. **Configurar projeto:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. **Configurar variáveis de ambiente:**
   - Environment Variables (tab)
   - Adicionar:
     ```
     NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app/api
     NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-...
     NEXT_PUBLIC_APP_URL=https://seu-frontend.vercel.app
     ```

5. **Deploy:**
   - Vercel faz deploy automático
   - URL gerada: `https://seu-frontend.vercel.app`

**Custo:** Grátis (Free tier)

---

### 3. Dashboard Admin (Vercel)

**Passo a passo:**

1. **No Vercel, criar novo projeto**

2. **Import Project:**
   - Mesmos passos do Frontend Público
   - **Root Directory:** `dashboard`

3. **Configurar variáveis de ambiente:**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://seu-dashboard.vercel.app
   
   NEXTAUTH_BASEPATH=/api/auth
   NEXTAUTH_URL=https://seu-dashboard.vercel.app/api/auth
   NEXTAUTH_SECRET=<gerar_novo>
   
   API_URL=https://seu-backend.up.railway.app/api
   NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app/api
   ```

4. **Deploy:**
   - URL gerada: `https://seu-dashboard.vercel.app`

**Custo:** Grátis (Free tier)

---

### 4. QR Scanner App (Vercel)

**Passo a passo:**

1. **No Vercel, criar novo projeto**

2. **Import Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `qr-scanner-app`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Configurar variáveis de ambiente:**
   ```
   VITE_API_URL=https://seu-backend.up.railway.app/api
   ```

4. **Deploy:**
   - URL gerada: `https://seu-scanner.vercel.app`

**Importante:** PWA precisa de HTTPS para câmera funcionar (Vercel já fornece)

**Custo:** Grátis (Free tier)

---

## 📋 Checklist de Deploy DEV

### Pré-Deploy

- [ ] MongoDB Atlas configurado e rodando
- [ ] Mercado Pago credenciais de TESTE obtidas
- [ ] Resend API Key obtida
- [ ] Cloudinary configurado
- [ ] Secrets gerados (JWT, QR, Encryption)
- [ ] Usuário admin criado localmente

### Backend

- [ ] `.env` criado e configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor rodando localmente (`npm run dev`)
- [ ] Health check funcionando
- [ ] Swagger docs acessível
- [ ] MongoDB conectado (verificar logs)
- [ ] Deploy em Railway/Render (se aplicável)

### Frontend Público

- [ ] `.env.local` criado
- [ ] Dependências instaladas
- [ ] Rodando localmente (`npm run dev`)
- [ ] Landing page carrega
- [ ] API conectada (verificar network)
- [ ] Deploy em Vercel (se aplicável)

### Dashboard Admin

- [ ] `.env.local` criado (renomeado de `env.local`)
- [ ] `NEXTAUTH_SECRET` gerado
- [ ] Dependências instaladas
- [ ] Rodando localmente
- [ ] Login funciona
- [ ] API conectada
- [ ] Deploy em Vercel (se aplicável)

### QR Scanner App

- [ ] `.env` criado
- [ ] Dependências instaladas
- [ ] Rodando localmente
- [ ] Câmera funciona (HTTPS necessário)
- [ ] API conectada
- [ ] Deploy em Vercel/Netlify

### Testes Integrados

- [ ] Criar evento no dashboard
- [ ] Visualizar evento no frontend público
- [ ] Simular compra (PIX teste)
- [ ] Validar QR code no scanner
- [ ] Verificar emails enviados (Resend)
- [ ] Testar distribuição de VIP
- [ ] Verificar webhooks do Mercado Pago

---

## 🔗 URLs Esperadas (Exemplo DEV)

### Vercel (Frontends - Grátis)
```
Frontend Público:   https://eventhub.vercel.app
Dashboard Admin:    https://eventhub-admin.vercel.app
QR Scanner:         https://eventhub-scanner.vercel.app
```

### Railway (Backend - $5/mês)
```
Backend API:        https://eventhub-api.up.railway.app
Swagger:            https://eventhub-api.up.railway.app/api-docs
Health Check:       https://eventhub-api.up.railway.app/health
```

**Custo Total DEV:** ~$5/mês (apenas Railway)  
**Custo Total PROD:** ~$20-30/mês (Railway + upgrade se necessário)

---

## ⚠️ Problemas Comuns

### Backend não conecta ao MongoDB

**Solução:**
- Verificar connection string no `.env`
- Verificar se IP está liberado no MongoDB Atlas (0.0.0.0/0 para DEV)
- Verificar usuário e senha

### Mercado Pago retorna erro

**Solução:**
- Verificar se está usando credenciais de TESTE (TEST-*)
- Verificar se `MP_ACCESS_TOKEN` e `MP_PUBLIC_KEY` estão corretos
- Testar com usuário de teste: `test_user_XXXXXXXX@testuser.com`

### CORS Error no Frontend

**Solução:**
- Verificar `FRONTEND_URL` no backend `.env`
- Verificar CORS no `server.ts` (deve incluir URL do frontend)

### Emails não são enviados

**Solução:**
- Verificar `RESEND_API_KEY`
- Verificar `RESEND_FROM_EMAIL`
- Usar `onboarding@resend.dev` para testes
- Verificar logs do Resend (dashboard.resend.com)

### Dashboard não faz login

**Solução:**
- Verificar `NEXTAUTH_SECRET` está definido
- Verificar `API_URL` aponta para backend correto
- Verificar se usuário admin foi criado
- Limpar cache: `rm -rf .next` e reiniciar

---

## 📊 Status do Projeto (Conforme PROGRESSO.md)

- ✅ Backend: ~95% completo
- ✅ Sistema de pedidos e pagamentos (PIX + Cartão)
- ✅ QR Codes seguros e validação
- ✅ Dashboard admin funcional
- ✅ PWA de validação completo
- ⚠️ Frontend público: ~70% (landing + checkout funcionais)
- ⚠️ Falta: Endpoint de redefinição de senha no backend

---

## 🎯 Próximos Passos Após Deploy DEV

1. **Testar fluxo completo:**
   - Criar evento
   - Comprar ingresso (PIX teste)
   - Validar QR code

2. **Configurar Webhook do Mercado Pago:**
   - URL: `https://seu-backend.up.railway.app/api/webhooks/mercadopago`
   - Eventos: `payment`, `merchant_order`

3. **Testar emails:**
   - Verificar recebimento de emails
   - Verificar QR codes nos PDFs

4. **Ajustes finais:**
   - Melhorar mensagens de erro
   - Ajustar timeouts
   - Otimizar performance

---

## 📝 Comandos Úteis

### Gerar Secrets

```bash
# JWT Secret / NEXTAUTH_SECRET
openssl rand -base64 32

# QR Secret / HMAC Secret / Encryption Key
openssl rand -hex 32
```

### Verificar Logs

```bash
# Backend local
npm run dev

# Railway logs
railway logs

# Vercel logs
vercel logs <deployment-url>
```

### Reset Database (DEV)

```bash
# Conectar ao MongoDB e dropar database
mongo <connection-string>
use eventhub
db.dropDatabase()
```

---

**Criado:** 19/11/2025  
**Versão:** 1.0 DEV  
**Status:** Pronto para Deploy

**Próximo:** Implementar este checklist passo a passo! 🚀



SUBIR no REPO do FRONT
NEXTAUTH_SECRET=<gerar_um_secret_com_openssl_rand_-base64_32>
NEXTAUTH_URL=https://app-dash-bpard.vercel.app/api/auth
API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=https://app-dash-bpard.vercel.app