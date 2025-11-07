# 📱 EventHub - App Validador de QR Codes

App PWA para validação de QR codes de ingressos.

## 🚀 Tecnologias

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **html5-qrcode** (scanner de QR codes)
- **Zustand** (gerenciamento de estado)
- **Axios** (cliente HTTP)
- **PWA** (Service Worker para offline)

## 📦 Instalação

```bash
npm install
```

## 🏃 Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5174

## 📱 Testar no Celular

Veja o guia completo em [TESTE_NO_CELULAR.md](./TESTE_NO_CELULAR.md)

**⚠️ IMPORTANTE:** Para a câmera funcionar no celular, você precisa usar HTTPS. Veja [SOLUCAO_HTTPS.md](./SOLUCAO_HTTPS.md)

**Solução rápida (Cloudflare Tunnel):**
1. Inicie o app: `npm run dev`
2. Em outro terminal: `cloudflared tunnel --url http://localhost:5174`
3. Acesse a URL HTTPS gerada no celular

## 🏗️ Build

```bash
npm run build
```

## 📱 Funcionalidades

- ✅ Scanner de QR Code (câmera)
- ✅ Validação em tempo real
- ✅ Feedback visual (verde/vermelho/amarelo)
- ✅ Busca manual por código/CPF
- ✅ Histórico de validações
- ✅ Modo offline (fase futura)

## 🔧 Configuração

### Desenvolvimento Local

Crie um arquivo `.env` na raiz:

```env
VITE_API_URL=http://localhost:3001/api
```

### Teste no Celular

```env
VITE_API_URL=http://<SEU_IP>:3001/api
```

Use `npm run get-ip` para descobrir seu IP automaticamente.

**⚠️ IMPORTANTE:** Certifique-se de que o backend está rodando na porta 3001 antes de usar o app.

Para iniciar o backend:
```bash
cd backend
npm run dev
```

### Produção

```env
VITE_API_URL=https://api.eventhub.com/api
```

## 🔑 Credenciais de Teste

**Usuário QRCODE:**
- Email: `qrcode@eventhub.com`
- Senha: `QRCode123!`
