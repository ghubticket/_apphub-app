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

Crie um arquivo `.env` na raiz:

```env
VITE_API_URL=http://localhost:3000/api
```

Para produção, use a URL do backend em produção.

