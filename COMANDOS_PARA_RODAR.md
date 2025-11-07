# 🚀 COMANDOS PARA RODAR O SISTEMA COMPLETO

## 📋 RESUMO RÁPIDO

Você precisa rodar **3 coisas** em **3 terminais diferentes**:

1. **Backend** (porta 3001)
2. **PWA QR Scanner** (porta 5174)
3. **Túnel HTTPS** (para acessar no celular)

---

## 🖥️ TERMINAL 1: BACKEND

```bash
cd backend
npm start
```

**OU** (se quiser modo desenvolvimento com auto-reload):

```bash
cd backend
npm run dev
```

**O que faz:** Inicia o servidor backend na porta `3001`

**URL:** `http://localhost:3001`

**Swagger:** `http://localhost:3001/api-docs`

---

## 📱 TERMINAL 2: PWA QR SCANNER

```bash
cd qr-scanner-app
npm run dev
```

**O que faz:** Inicia o servidor de desenvolvimento do PWA na porta `5174`

**URL Local:** `http://localhost:5174`

**URL Rede:** `http://SEU_IP:5174` (use `npm run get-ip` para descobrir seu IP)

---

## 🌐 TERMINAL 3: TÚNEL HTTPS (PARA CELULAR)

### OPÇÃO A: Cloudflare Tunnel (RECOMENDADO - Grátis e Ilimitado)

```bash
cloudflared tunnel --url http://localhost:5174
```

**O que faz:** Cria um túnel HTTPS público para o PWA

**URL gerada:** Algo como `https://xxxxx.trycloudflare.com`

**Vantagens:**
- ✅ Grátis
- ✅ Ilimitado
- ✅ Pode ter múltiplos túneis simultâneos
- ✅ Não expira

**Instalação (se não tiver):**
- Windows: `winget install --id Cloudflare.cloudflared`
- Ou baixe em: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

---

### OPÇÃO B: ngrok (Alternativa)

```bash
ngrok http 5174
```

**O que faz:** Cria um túnel HTTPS público para o PWA

**URL gerada:** Algo como `https://xxxxx.ngrok-free.app`

**Vantagens:**
- ✅ Grátis (com limitações)
- ✅ Fácil de usar

**Desvantagens:**
- ❌ Apenas 1 túnel por vez (plano grátis)
- ❌ URLs mudam a cada reinício

**Instalação (se não tiver):**
- Windows: `winget install ngrok.ngrok`
- Ou baixe em: https://ngrok.com/download

---

## 🔧 CONFIGURAÇÃO DO .env (PWA)

**Arquivo:** `qr-scanner-app/.env`

**Conteúdo quando usar túnel HTTPS:**

```env
VITE_API_URL=https://SEU_TUNEL_BACKEND.trycloudflare.com/api
```

**OU** (se usar ngrok para o backend também):

```env
VITE_API_URL=https://SEU_TUNEL_BACKEND.ngrok-free.app/api
```

**⚠️ IMPORTANTE:**
- Se usar túnel HTTPS, **SEMPRE** configure `VITE_API_URL` com HTTPS
- Se usar IP local, pode deixar sem `.env` (usa padrão `http://localhost:3001/api`)

---

## 📝 SEQUÊNCIA COMPLETA DE INÍCIO

### 1️⃣ Iniciar Backend
```bash
cd backend
npm start
```
**Aguarde:** `Server running on port 3001`

---

### 2️⃣ Iniciar PWA
```bash
cd qr-scanner-app
npm run dev
```
**Aguarde:** `Local: http://localhost:5174/`

---

### 3️⃣ Iniciar Túnel HTTPS (Cloudflare)
```bash
cloudflared tunnel --url http://localhost:5174
```
**Copie a URL:** `https://xxxxx.trycloudflare.com`

---

### 4️⃣ Configurar .env do PWA (se usar túnel)

**Se você também criar um túnel para o backend:**

```bash
# Em outro terminal:
cd backend
cloudflared tunnel --url http://localhost:3001
```

**Depois, no arquivo `qr-scanner-app/.env`:**
```env
VITE_API_URL=https://SEU_TUNEL_BACKEND.trycloudflare.com/api
```

**⚠️ IMPORTANTE:** Reinicie o PWA (`npm run dev`) após mudar o `.env`!

---

## 🎯 ACESSO NO CELULAR

1. **Abra o navegador** no celular
2. **Digite a URL do túnel:** `https://xxxxx.trycloudflare.com`
3. **Permita acesso à câmera** quando solicitado
4. **Faça login** com usuário `QRCODE`

---

## 🔍 COMANDOS ÚTEIS

### Descobrir IP local:
```bash
cd qr-scanner-app
npm run get-ip
```

### Verificar se porta está em uso:
```bash
# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :5174

# Linux/Mac
lsof -i :3001
lsof -i :5174
```

### Parar processos:
- **Ctrl + C** em cada terminal
- Ou feche os terminais

---

## 🐛 TROUBLESHOOTING

### ❌ "Network Error" no login
- Verifique se o backend está rodando na porta 3001
- Verifique se o `.env` do PWA está correto
- Se usar túnel, certifique-se que o backend também tem túnel

### ❌ "Câmera não acessa"
- Use **HTTPS** (túnel) - câmera não funciona em HTTP no celular
- Verifique permissões do navegador
- Limpe cache do Safari/Chrome no celular

### ❌ "Blocked request" no Vite
- Já está configurado no `vite.config.ts` com `allowedHosts: true`
- Se ainda der erro, reinicie o servidor do PWA

---

## 📌 CHECKLIST RÁPIDO

- [ ] Backend rodando (`npm start` no terminal 1)
- [ ] PWA rodando (`npm run dev` no terminal 2)
- [ ] Túnel HTTPS rodando (`cloudflared tunnel` no terminal 3)
- [ ] `.env` configurado (se usar túnel para backend)
- [ ] URL do túnel copiada
- [ ] Acesso no celular via HTTPS
- [ ] Permissão de câmera concedida

---

## 🎉 PRONTO!

Agora você tem tudo rodando! 🚀

**URLs importantes:**
- Backend: `http://localhost:3001`
- PWA Local: `http://localhost:5174`
- PWA Celular: `https://xxxxx.trycloudflare.com`

