# Checklist para Ambiente DEV

> **Baseado em:** PREMISSAS.md  
> **Objetivo:** Checklist simples do que precisa antes de subir em DEV

---

## Obrigatório para Funcionar

### 1. Variáveis de Ambiente Críticas

Criar arquivo `backend/.env` com:

```env
# Banco de Dados
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventhub-dev

# JWT Authentication
JWT_SECRET=seu-secret-minimo-32-caracteres
JWT_REFRESH_SECRET=seu-refresh-secret-minimo-32-caracteres

# QR Code Security (64 caracteres hex)
QR_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
QR_HMAC_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Encryption Key (64 caracteres hex)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**Como gerar as chaves:**
```bash
# QR_SECRET e ENCRYPTION_KEY (32 bytes = 64 chars hex)
openssl rand -hex 32

# JWT_SECRET e JWT_REFRESH_SECRET (mínimo 32 caracteres)
openssl rand -base64 32
```

---

## Recomendado para Funcionar Completo

### 2. Mercado Pago (Sandbox)

```env
MP_ACCESS_TOKEN=TEST-seu-access-token
MP_PUBLIC_KEY=TEST-seu-public-key
MP_WEBHOOK_SECRET=seu-webhook-secret
```

**Onde obter:** https://www.mercadopago.com.br/developers

### 3. Email (Resend)

```env
RESEND_API_KEY=re_sua_api_key
RESEND_FROM_EMAIL=EventHub <onboarding@resend.dev>
```

**Onde obter:** https://resend.com

### 4. Upload (Cloudinary)

```env
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

**Onde obter:** https://cloudinary.com

---

## URLs (Opcional - padrões funcionam)

```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
QR_SCANNER_URL=http://localhost:5174
DASHBOARD_URL=http://localhost:3000
```

---

## Checklist Rápido

- [ ] `MONGODB_URI` configurado
- [ ] `JWT_SECRET` configurado (min 32 chars)
- [ ] `JWT_REFRESH_SECRET` configurado (min 32 chars)
- [ ] `QR_SECRET` configurado (64 chars hex)
- [ ] `ENCRYPTION_KEY` configurado (64 chars hex)
- [ ] `MP_ACCESS_TOKEN` configurado (opcional)
- [ ] `RESEND_API_KEY` configurado (opcional)
- [ ] `CLOUDINARY_CLOUD_NAME` configurado (opcional)

---

## Testar

```bash
cd backend
npm install
npm run dev
```

**Se tudo estiver OK:**
```
🚀  EventHub API está rodando!
📡  Porta: 3001
🌍  URL Local: http://localhost:3001
📚  Swagger: http://localhost:3001/api-docs
```

---

**Última atualização:** Janeiro 2025

