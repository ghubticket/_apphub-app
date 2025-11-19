# 🚀 Próximos Passos Após Build no Railway

> **Status:** Build passou! ✅  
> **Próximo:** Configurar variáveis de ambiente e conectar serviços

---

## 📍 1. Obter URL da API do Railway

Após o deploy bem-sucedido:

1. **No dashboard do Railway**, vá em **Settings** → **Domains**
2. Você verá uma URL como: `https://seu-app.up.railway.app`
3. **Copie essa URL** - essa é sua URL da API!

**Exemplo:**
```
https://_apphub-app-production.up.railway.app
```

**Teste se está funcionando:**
```bash
curl https://sua-url.up.railway.app/health
```

Deve retornar: `{"status":"ok"}`

---

## 🗄️ 2. Configurar MongoDB Atlas

### Passo 1: Criar Conta e Cluster

1. Acesse: https://www.mongodb.com/cloud/atlas
2. Crie uma conta (grátis)
3. Crie um novo **Cluster** (Free Tier M0 é suficiente para DEV)
4. Escolha região próxima (ex: `São Paulo`)

### Passo 2: Criar Usuário do Banco

1. No menu lateral: **Database Access** → **Add New Database User**
2. **Username:** `eventhub-admin` (ou outro nome)
3. **Password:** Gere uma senha forte (salve em lugar seguro!)
4. **Database User Privileges:** `Atlas Admin` (ou `Read and write to any database`)
5. Clique em **Add User**

### Passo 3: Liberar IPs (Network Access)

1. No menu lateral: **Network Access** → **Add IP Address**
2. Para DEV, adicione: `0.0.0.0/0` (permite de qualquer lugar)
3. Clique em **Confirm**

⚠️ **Atenção:** `0.0.0.0/0` é apenas para DEV. Em produção, use IPs específicos.

### Passo 4: Obter Connection String

1. No menu lateral: **Database** → **Connect**
2. Escolha: **Connect your application**
3. **Driver:** `Node.js`
4. **Version:** `5.5 or later`
5. **Copie a connection string** que aparece:

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. **Substitua:**
   - `<username>` pelo usuário que você criou (ex: `eventhub-admin`)
   - `<password>` pela senha que você criou
   - Adicione o nome do database no final: `/eventhub`

**Resultado final:**
```
mongodb+srv://eventhub-admin:SUA_SENHA@cluster0.xxxxx.mongodb.net/eventhub?retryWrites=true&w=majority
```

---

## 🔐 3. Gerar Secrets Necessários

Execute no terminal (PowerShell ou Git Bash):

```powershell
# JWT Secret (para autenticação)
openssl rand -base64 32

# JWT Refresh Secret
openssl rand -base64 32

# QR Secret (64 caracteres hex)
openssl rand -hex 32

# QR HMAC Secret (64 caracteres hex)
openssl rand -hex 32

# Encryption Key (64 caracteres hex)
openssl rand -hex 32
```

**Salve todos os valores gerados!** Você vai precisar deles.

---

## ⚙️ 4. Configurar Variáveis de Ambiente no Railway

1. No dashboard do Railway, vá em **Settings** → **Variables**
2. Clique em **+ New Variable**
3. Adicione cada variável abaixo:

### Variáveis Obrigatórias (Críticas)

```bash
# Node Environment
NODE_ENV=production

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://eventhub-admin:SUA_SENHA@cluster0.xxxxx.mongodb.net/eventhub?retryWrites=true&w=majority

# JWT Authentication (use os valores gerados)
JWT_SECRET=<valor_gerado_com_openssl_rand_-base64_32>
JWT_REFRESH_SECRET=<valor_gerado_com_openssl_rand_-base64_32>
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# QR Code Security (use os valores gerados)
QR_SECRET=<valor_gerado_com_openssl_rand_-hex_32>
QR_HMAC_SECRET=<valor_gerado_com_openssl_rand_-hex_32>

# Encryption Key (use o valor gerado)
ENCRYPTION_KEY=<valor_gerado_com_openssl_rand_-hex_32>
```

### Variáveis de Serviços Externos

```bash
# Mercado Pago (TESTE - obter em: https://www.mercadopago.com.br/developers)
MP_ACCESS_TOKEN=TEST-seu-access-token-aqui
MP_PUBLIC_KEY=TEST-seu-public-key-aqui

# Email (Resend - obter em: https://resend.com)
RESEND_API_KEY=re_sua_api_key_aqui
RESEND_FROM_EMAIL=EventHub <onboarding@resend.dev>

# Upload (Cloudinary - obter em: https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

### Variáveis de URLs

```bash
# URLs (substitua pelas URLs reais dos seus frontends)
FRONTEND_URL=https://seu-frontend.vercel.app
BACKEND_URL=https://sua-url.up.railway.app
QR_SCANNER_URL=https://seu-scanner.vercel.app
DASHBOARD_URL=https://seu-dashboard.vercel.app
```

### Variáveis Opcionais

```bash
# Monitoramento (Sentry - opcional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1

# SSL (desabilitado no Railway - ele já fornece HTTPS)
SSL_ENABLED=false
```

---

## 🔄 5. Reiniciar o Serviço

Após adicionar todas as variáveis:

1. No Railway, vá em **Deployments**
2. Clique nos **3 pontinhos** (...) no último deploy
3. Selecione **Redeploy**
4. Aguarde o deploy completar

---

## ✅ 6. Verificar se Está Funcionando

### Teste 1: Health Check

```bash
curl https://sua-url.up.railway.app/health
```

**Esperado:**
```json
{"status":"ok"}
```

### Teste 2: Swagger Docs

Abra no navegador:
```
https://sua-url.up.railway.app/api-docs
```

Deve abrir a documentação da API.

### Teste 3: Verificar Logs

No Railway:
1. Vá em **Deployments** → clique no último deploy
2. Aba **Logs**
3. Procure por:
   - ✅ `MongoDB conectado com sucesso!`
   - ✅ `EventHub API está rodando`
   - ❌ Se houver erros, verifique as variáveis de ambiente

---

## 🎯 7. Próximos Passos

### A. Criar Usuário Admin

Após o backend estar rodando, você precisa criar um usuário admin. Você pode:

**Opção 1: Via Script Local (Recomendado)**
```bash
cd backend
# Configure o .env local com a MONGODB_URI do Atlas
npm run create-admin -- --email admin@eventhub.com --password "SuaSenhaForte123!" --name "Admin Master"
```

**Opção 2: Via MongoDB Compass**
- Conecte ao MongoDB Atlas
- Crie manualmente um usuário na collection `users` com `role: 'admin'`

### B. Configurar Frontends

Agora você precisa configurar os frontends (Vercel) para apontar para a API:

**Frontend Público:**
```bash
NEXT_PUBLIC_API_URL=https://sua-url.up.railway.app/api
NEXT_PUBLIC_BACKEND_URL=https://sua-url.up.railway.app
```

**Dashboard Admin:**
```bash
API_URL=https://sua-url.up.railway.app/api
NEXT_PUBLIC_API_URL=https://sua-url.up.railway.app/api
```

**QR Scanner:**
```bash
VITE_API_URL=https://sua-url.up.railway.app/api
```

### C. Configurar Webhook do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em **Webhooks**
3. Adicione URL:
   ```
   https://sua-url.up.railway.app/api/webhooks/mercadopago
   ```
4. Eventos: `payment`, `merchant_order`

---

## 📋 Checklist Rápido

- [ ] URL da API copiada do Railway
- [ ] MongoDB Atlas criado e configurado
- [ ] Connection String obtida e testada
- [ ] Secrets gerados (JWT, QR, Encryption)
- [ ] Variáveis de ambiente adicionadas no Railway
- [ ] Serviço reiniciado no Railway
- [ ] Health check funcionando (`/health`)
- [ ] Swagger docs acessível (`/api-docs`)
- [ ] Logs mostram "MongoDB conectado"
- [ ] Usuário admin criado
- [ ] Frontends configurados com URL da API

---

## 🆘 Problemas Comuns

### ❌ "MongoDB não conecta"

**Solução:**
- Verifique se o IP está liberado no MongoDB Atlas (0.0.0.0/0 para DEV)
- Verifique se usuário e senha estão corretos na connection string
- Verifique se o nome do database está na URL (`/eventhub`)

### ❌ "MP_ACCESS_TOKEN não está configurado"

**Solução:**
- Adicione `MP_ACCESS_TOKEN` nas variáveis de ambiente do Railway
- Use credenciais de TESTE: `TEST-...`
- Reinicie o serviço após adicionar

### ❌ "Health check retorna erro"

**Solução:**
- Verifique os logs no Railway
- Verifique se todas as variáveis obrigatórias estão configuradas
- Verifique se o MongoDB está conectado

---

## 📞 URLs Importantes

- **Railway Dashboard:** https://railway.app
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **Mercado Pago Developers:** https://www.mercadopago.com.br/developers
- **Resend:** https://resend.com
- **Cloudinary:** https://cloudinary.com

---

**Pronto!** 🎉 Agora seu backend está rodando no Railway e conectado ao MongoDB Atlas!

