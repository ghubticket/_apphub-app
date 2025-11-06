# Arquitetura Recomendada - EventHub

## Stack Sugerida para MVP

### Backend
```typescript
Framework: Node.js + Express + TypeScript
Database: MongoDB Atlas (M0 free tier para começar)
Cache: Node-cache (em memória) → Redis depois
Auth: Passport.js + JWT
Pagamento: Mercado Pago SDK (Orders API - online)
Email: Resend (free 100/dia)
Upload: Cloudinary (free tier)
Deploy: Railway / Render
```

### Frontend
```typescript
Framework: Next.js 14 (App Router)
UI: Tailwind + Shadcn/ui
Forms: React Hook Form + Zod
State: Zustand (mais simples que Redux)
Deploy: Vercel (free)
```

### DevOps (Simplificado)
```
CI/CD: GitHub Actions
Monitoramento: Sentry (free tier)
Logs: Railway/Render built-in
Backup: MongoDB Atlas automático
```

---

## Estrutura do Projeto

```
eventhub/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── mercadopago.ts
│   │   │   └── email.ts
│   │   │
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Event.ts
│   │   │   ├── Ticket.ts
│   │   │   └── Order.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── events.controller.ts
│   │   │   ├── tickets.controller.ts
│   │   │   ├── orders.controller.ts
│   │   │   └── validation.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── payment.service.ts      # Mercado Pago Orders API
│   │   │   ├── qrcode.service.ts       # Geração/validação
│   │   │   ├── email.service.ts        # Resend
│   │   │   └── upload.service.ts       # Cloudinary
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── events.routes.ts
│   │   │   ├── tickets.routes.ts
│   │   │   ├── orders.routes.ts
│   │   │   └── validation.routes.ts
│   │   │
│   │   └── utils/
│   │       ├── validators.ts
│   │       ├── errors.ts
│   │       └── helpers.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── eventos/[id]/
│   │   │   │   └── page.tsx          # Detalhe evento
│   │   │   └── checkout/
│   │   │       └── page.tsx          # Compra
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   │   ├── eventos/          # CRUD eventos
│   │   │   │   ├── ingressos/        # Gestão ingressos
│   │   │   │   ├── vendas/           # Relatórios
│   │   │   │   └── usuarios/         # Gestão usuários
│   │   │   │
│   │   │   └── leitor/
│   │   │       └── page.tsx          # QR Code reader
│   │   │
│   │   └── api/                      # Next.js API routes (opcional)
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn components
│   │   ├── forms/
│   │   ├── dashboard/
│   │   └── qr-reader/
│   │
│   ├── lib/
│   │   ├── api.ts                    # Axios client
│   │   └── utils.ts
│   │
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml
│       └── deploy-frontend.yml
│
└── README.md
```

---

## Modelos de Dados

### User
```typescript
interface User {
  _id: ObjectId;
  email: string;
  password: string; // bcrypt hash
  name: string;
  cpf?: string; // Para compradores
  role: 'master' | 'admin' | 'financeiro' | 'leitor' | 'customer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Event
```typescript
interface Event {
  _id: ObjectId;
  title: string;
  description: string;
  image: string; // Cloudinary URL
  slug: string; // URL amigável
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  date: Date;
  endDate?: Date;
  status: 'draft' | 'published' | 'cancelled' | 'finished';
  settings: {
    maxAttendees: number;
    allowSameCPF: boolean;
    maxTicketsPerCPF: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Ticket (tipo de ingresso)
```typescript
interface TicketType {
  _id: ObjectId;
  eventId: ObjectId;
  name: string; // "Pista", "VIP", "Meia-entrada"
  description?: string;
  price: number;
  quantity: number; // Estoque total
  sold: number; // Vendidos
  maxPerPurchase: number; // Limite por compra
  salesStart: Date;
  salesEnd: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Order (pedido/compra)
```typescript
interface Order {
  _id: ObjectId;
  orderNumber: string; // "EH-2024-001234"
  eventId: ObjectId;
  userId: ObjectId; // Comprador
  
  buyer: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
  
  items: {
    ticketTypeId: ObjectId;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  
  total: number;
  
  payment: {
    method: 'pix' | 'credit_card' | 'boleto';
    status: 'pending' | 'approved' | 'rejected' | 'refunded';
    mercadoPagoId?: string;
    paidAt?: Date;
  };
  
  tickets: ObjectId[]; // Array de tickets gerados
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Ticket (ingresso individual)
```typescript
interface Ticket {
  _id: ObjectId;
  ticketNumber: string; // "EH-2024-001234-001"
  orderId: ObjectId;
  eventId: ObjectId;
  ticketTypeId: ObjectId;
  
  holder: {
    name: string;
    cpf: string;
  };
  
  qrCode: {
    data: string; // Encrypted payload
    hash: string; // HMAC SHA-256
    imageUrl?: string; // QR Code image URL
  };
  
  validation: {
    isValidated: boolean;
    validatedAt?: Date;
    validatedBy?: ObjectId; // User que validou
  };
  
  status: 'active' | 'used' | 'cancelled' | 'refunded';
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Fluxo de Compra

```
1. Cliente acessa /eventos/pagode-da-lua
   └── Vê detalhes, tipos de ingresso, preços

2. Seleciona ingressos (2x Pista, 1x VIP)
   └── Adiciona ao carrinho
   └── Vai para /checkout

3. Preenche dados
   ├── Nome, CPF, Email, Telefone
   ├── Valida CPF (limite por evento)
   └── Escolhe forma de pagamento

4. Backend processa
   ├── Valida estoque e regras (CPF/email/amount)
   ├── Cria Order (status: pending)
   ├── Chama Mercado Pago (Orders API - online) com idempotência
   └── Retorna dados de pagamento
       • PIX: `qrCode`, `qrCodeBase64`, `ticketUrl`, `expiresAt`
       • Cartão: status/processamento

5. Webhook Mercado Pago (Orders API - tipo "order")
   ├── Payment processed/approved
   ├── Atualiza Order (status interno: paid/cancelled)
   ├── Gera Tickets com QR Codes
   ├── Envia email com ingressos (PDF)
   └── Atualiza estoque

6. Cliente recebe email
   └── PDF com QR Codes individuais por ingresso
```

---

## Fluxo de Validação

```
1. Leitor acessa /leitor (autenticado)
   └── Câmera ativa, pronto para escanear

2. Escaneia QR Code
   └── Envia para backend: POST /api/validation/check

3. Backend valida
   ├── Decripta QR Code
   ├── Valida hash (HMAC)
   ├── Verifica se já foi usado
   ├── Verifica evento e data
   └── Retorna resultado

4. Frontend mostra
   ├── ✅ Verde: "Entrada liberada! João Silva - Pista"
   ├── ❌ Vermelho: "Ingresso já usado às 20:30"
   └── ⚠️ Amarelo: "QR Code inválido"

5. Se válido, backend
   ├── Marca ticket como usado
   ├── Registra timestamp e validador
   └── Incrementa contador de entradas
```

---

## APIs Críticas

### Mercado Pago (Orders API - online)
```typescript
// Criação de Order (PIX ou Cartão) é realizada pelo backend via SDK
// Parâmetros principais:
//  - type: 'online'
//  - processing_mode: 'automatic'
//  - total_amount, external_reference
//  - payer (no nível raiz)
//  - transactions.payments: [{ method: 'pix' | 'credit_card', ... }]
// Headers: Authorization: Bearer <token>, X-Idempotency-Key

// Webhook de Order (MP → Backend)
POST /api/webhooks/mercadopago
{
  "type": "order",
  "data": { "id": "ORD01..." }
}
```

### Resend (Email)
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'EventHub <ingressos@eventhub.com>',
  to: buyer.email,
  subject: `Seu ingresso para ${event.title}`,
  html: ticketEmailTemplate,
  attachments: [
    {
      filename: 'ingresso.pdf',
      content: pdfBuffer
    }
  ]
});
```

---

## Segurança do QR Code

```typescript
import crypto from 'crypto';

// Geração
function generateSecureQR(ticketId: string, eventId: string): string {
  const payload = {
    tid: ticketId,
    eid: eventId,
    ts: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex')
  };
  
  const message = JSON.stringify(payload);
  const hash = crypto
    .createHmac('sha256', process.env.QR_SECRET!)
    .update(message)
    .digest('hex');
  
  const qrData = {
    ...payload,
    sig: hash
  };
  
  return Buffer.from(JSON.stringify(qrData)).toString('base64url');
}

// Validação
function validateQR(qrCode: string): boolean {
  const decoded = JSON.parse(
    Buffer.from(qrCode, 'base64url').toString()
  );
  
  const { sig, ...payload } = decoded;
  
  const expectedHash = crypto
    .createHmac('sha256', process.env.QR_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return sig === expectedHash;
}
```

---

## Variáveis de Ambiente

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventhub

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxx
MP_PUBLIC_KEY=APP_USR-xxx
MP_WEBHOOK_SECRET=xxx
# Sandbox: usar emails *@testuser.com em dev

# Email
RESEND_API_KEY=re_xxx

# Upload
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# QR Code
QR_SECRET=your-qr-encryption-key-change-this

# URLs
FRONTEND_URL=https://eventhub.com
BACKEND_URL=https://api.eventhub.com

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Deploy

### Backend (Railway)
```bash
# 1. Push to GitHub
git push origin main

# 2. Connect no Railway
# 3. Add MongoDB Atlas connection string
# 4. Deploy automático a cada push
```

### Frontend (Vercel)
```bash
# 1. Push to GitHub
git push origin main

# 2. Import project no Vercel
# 3. Add env vars
# 4. Deploy automático
```

---

## Monitoramento Básico

```typescript
// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
```

---

## Redundância e Disponibilidade (CRÍTICO)

> **⚠️ IMPLEMENTAR NO MVP**
> 
> Sistema multi-camada para garantir que clientes SEMPRE consigam acessar seus ingressos,
> mesmo se o servidor principal cair no dia do evento.

### Problema

```
Cenário de Pesadelo:
├── Dia do evento (20h)
├── Servidor AWS/Backend CAI ❌
├── Site fora do ar ❌
├── 1500 clientes tentando acessar ingresso
├── Clientes não conseguem baixar QR Code
└── PÂNICO TOTAL 😱
```

### Solução: 5 Camadas de Acesso ao Ingresso

```
Cliente pode acessar ingresso via:

1️⃣ Email (PDF anexo)              ← Mais confiável
2️⃣ WhatsApp (link + imagem)       ← Backup
3️⃣ CDN/S3 (link direto)          ← Independente do backend
4️⃣ Site (com cache agressivo)     ← Se estiver no ar
5️⃣ PWA offline (cache local)      ← Para quem já acessou

= Cliente TEM ingresso, mesmo servidor caindo!
```

---

### 1️⃣ Email com PDF (MAIS IMPORTANTE)

```typescript
/**
 * Envia email IMEDIATAMENTE após pagamento aprovado
 * 
 * ✅ Inbox do cliente = backup permanente
 * ✅ Funciona mesmo com servidor fora
 * ✅ Cliente pode imprimir/salvar
 */

// services/ticket-pdf.service.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface TicketPDFData {
  orderNumber: string;
  event: {
    title: string;
    date: Date;
    location: string;
  };
  tickets: Array<{
    ticketNumber: string;
    holder: string;
    type: string;
    qrCode: string;
  }>;
}

async function generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Header
    doc.fontSize(24).text(data.event.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Data: ${formatDate(data.event.date)}`, { align: 'center' });
    doc.text(`Local: ${data.event.location}`, { align: 'center' });
    doc.moveDown(2);
    
    // Para cada ingresso
    for (const ticket of data.tickets) {
      // QR Code (grande)
      const qrCodeImage = await QRCode.toBuffer(ticket.qrCode, {
        width: 300,
        margin: 1
      });
      
      doc.image(qrCodeImage, {
        fit: [250, 250],
        align: 'center'
      });
      
      doc.moveDown();
      
      // Informações do ingresso
      doc.fontSize(14).text(`Ingresso: ${ticket.type}`, { align: 'center' });
      doc.fontSize(12).text(`Nome: ${ticket.holder}`, { align: 'center' });
      doc.fontSize(10).text(`Código: ${ticket.ticketNumber}`, { align: 'center' });
      
      // Instruções
      doc.moveDown();
      doc.fontSize(8).fillColor('gray');
      doc.text('Apresente este QR Code na entrada do evento', { align: 'center' });
      doc.text('Pode ser no celular ou impresso', { align: 'center' });
      
      // Linha divisória (se não for o último)
      if (data.tickets.indexOf(ticket) < data.tickets.length - 1) {
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(2);
      }
    }
    
    doc.end();
  });
}

// Enviar email
async function sendTicketEmail(order: Order, tickets: Ticket[]) {
  const pdfBuffer = await generateTicketPDF({
    orderNumber: order.orderNumber,
    event: {
      title: order.event.title,
      date: order.event.date,
      location: order.event.location.name
    },
    tickets: tickets.map(t => ({
      ticketNumber: t.ticketNumber,
      holder: t.holder.name,
      type: t.ticketType.name,
      qrCode: t.qrCode.data
    }))
  });
  
  await resend.emails.send({
    from: 'EventHub <ingressos@eventhub.com>',
    to: order.buyer.email,
    subject: `✅ Seus ingressos - ${order.event.title}`,
    html: `
      <h1>Ingressos confirmados!</h1>
      <p>Olá ${order.buyer.name},</p>
      <p>Seus ingressos para <strong>${order.event.title}</strong> estão confirmados!</p>
      
      <h2>Informações do Evento</h2>
      <ul>
        <li><strong>Data:</strong> ${formatDate(order.event.date)}</li>
        <li><strong>Local:</strong> ${order.event.location.name}</li>
        <li><strong>Endereço:</strong> ${order.event.location.address}</li>
      </ul>
      
      <h2>Seus Ingressos</h2>
      <p>Você comprou ${tickets.length} ingresso(s). Segue em anexo o PDF com os QR Codes.</p>
      
      <h3>⚠️ IMPORTANTE:</h3>
      <ul>
        <li>✅ Guarde este email - ele é seu comprovante</li>
        <li>✅ Pode apresentar no celular ou impresso</li>
        <li>✅ Um QR Code por pessoa na entrada</li>
        <li>❌ Não compartilhe o QR Code (uso único)</li>
      </ul>
      
      <p><strong>Links alternativos para baixar:</strong></p>
      <ul>
        <li><a href="https://cdn.eventhub.com/tickets/${order._id}.pdf">Download PDF</a></li>
        <li><a href="https://eventhub.com/meu-ingresso/${order._id}">Ver no site</a></li>
      </ul>
      
      <p>Nos vemos lá! 🎉</p>
    `,
    attachments: [
      {
        filename: `ingressos-${order.orderNumber}.pdf`,
        content: pdfBuffer
      }
    ]
  });
  
  console.log(`✅ Email enviado para ${order.buyer.email}`);
}
```

---

### 2️⃣ WhatsApp com Link Direto (Backup)

```typescript
/**
 * Envia WhatsApp após pagamento
 * 
 * ✅ Link direto para CDN (não depende do backend)
 * ✅ QR Code como imagem
 * ✅ Alternativa se email não chegar
 */

// services/whatsapp.service.ts
import Twilio from 'twilio';

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendTicketWhatsApp(order: Order, tickets: Ticket[]) {
  // Upload QR Code para CDN
  const cdnUrls = await Promise.all(
    tickets.map(async ticket => {
      // Gera imagem do QR Code
      const qrImage = await QRCode.toBuffer(ticket.qrCode.data, {
        width: 500
      });
      
      // Upload para S3/Cloudflare R2
      const url = await uploadToCDN(qrImage, `qr-${ticket._id}.png`);
      
      return {
        ticketNumber: ticket.ticketNumber,
        holder: ticket.holder.name,
        type: ticket.ticketType.name,
        qrUrl: url
      };
    })
  );
  
  // Link para página com todos os ingressos
  const ticketPageUrl = `https://cdn.eventhub.com/t/${order._id}`;
  
  const message = `
🎉 *Ingressos Confirmados!*

Olá ${order.buyer.name}!

Seus ingressos para *${order.event.title}* estão confirmados!

📅 *Data:* ${formatDate(order.event.date)}
📍 *Local:* ${order.event.location.name}

🎫 *${tickets.length} ingresso(s) comprado(s)*

*Seus ingressos:*
${cdnUrls.map((t, i) => `
${i + 1}. ${t.holder} - ${t.type}
   ${t.qrUrl}
`).join('\n')}

*Link completo:*
${ticketPageUrl}

⚠️ *IMPORTANTE:*
✅ Salve esta mensagem
✅ Apresente o QR Code na entrada
✅ Um QR por pessoa
❌ Não compartilhe (uso único)

Nos vemos lá! 🎉
  `.trim();
  
  await twilioClient.messages.create({
    from: 'whatsapp:+14155238886', // Twilio Sandbox
    to: `whatsapp:+55${order.buyer.phone}`,
    body: message
  });
  
  console.log(`✅ WhatsApp enviado para ${order.buyer.phone}`);
}
```

---

### 3️⃣ CDN para Servir Ingressos (Independente do Backend)

```typescript
/**
 * Gera página HTML estática com ingressos
 * Upload para CDN (S3 + CloudFront ou Cloudflare R2)
 * 
 * ✅ Funciona mesmo com backend fora
 * ✅ Alta disponibilidade (CDN global)
 * ✅ Acesso via link direto
 */

// services/cdn-ticket-page.service.ts

async function generateStaticTicketPage(order: Order, tickets: Ticket[]): Promise<string> {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seus Ingressos - ${order.event.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 20px 20px 0 0;
      text-align: center;
    }
    .header h1 {
      color: #1a202c;
      margin-bottom: 10px;
    }
    .header p {
      color: #718096;
    }
    .ticket {
      background: white;
      padding: 30px;
      margin-top: 2px;
    }
    .ticket:last-child {
      border-radius: 0 0 20px 20px;
    }
    .qr-code {
      text-align: center;
      margin: 20px 0;
    }
    .qr-code img {
      max-width: 300px;
      width: 100%;
      height: auto;
    }
    .info {
      text-align: center;
      margin: 15px 0;
    }
    .info-label {
      color: #718096;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-value {
      color: #1a202c;
      font-size: 18px;
      font-weight: bold;
      margin-top: 5px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .warning h3 {
      color: #92400e;
      margin-bottom: 10px;
    }
    .warning ul {
      list-style: none;
      color: #92400e;
    }
    .warning li {
      margin: 5px 0;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 10px;
      margin: 10px 5px;
      font-weight: bold;
    }
    @media print {
      body { background: white; }
      .button { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${order.event.title}</h1>
      <p>${formatDate(order.event.date)}</p>
      <p>${order.event.location.name}</p>
    </div>
    
    ${tickets.map((ticket, index) => `
      <div class="ticket">
        <div class="info">
          <div class="info-label">Ingresso ${index + 1} de ${tickets.length}</div>
          <div class="info-value">${ticket.ticketType.name}</div>
        </div>
        
        <div class="qr-code">
          <img src="${ticket.qrCode.imageUrl}" alt="QR Code" />
        </div>
        
        <div class="info">
          <div class="info-label">Nome</div>
          <div class="info-value">${ticket.holder.name}</div>
        </div>
        
        <div class="info">
          <div class="info-label">Código</div>
          <div class="info-value">${ticket.ticketNumber}</div>
        </div>
      </div>
    `).join('')}
    
    <div class="ticket">
      <div class="warning">
        <h3>⚠️ Importante</h3>
        <ul>
          <li>✅ Apresente este QR Code na entrada</li>
          <li>✅ Pode ser no celular ou impresso</li>
          <li>✅ Um QR Code por pessoa</li>
          <li>❌ Não compartilhe (uso único)</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="#" class="button" onclick="window.print(); return false;">
          🖨️ Imprimir
        </a>
        <a href="${order.pdfUrl}" class="button" download>
          📄 Baixar PDF
        </a>
      </div>
    </div>
  </div>
  
  <script>
    // Adiciona ao cache do navegador
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
    
    // Salva offline
    if ('caches' in window) {
      caches.open('tickets-v1').then(cache => {
        cache.add(location.pathname);
      });
    }
  </script>
</body>
</html>
  `;
  
  return html;
}

// Upload para CDN
async function uploadTicketPageToCDN(order: Order, tickets: Ticket[]) {
  const html = await generateStaticTicketPage(order, tickets);
  
  // Upload para S3
  const s3Key = `tickets/${order._id}.html`;
  await s3.upload({
    Bucket: 'eventhub-tickets',
    Key: s3Key,
    Body: html,
    ContentType: 'text/html',
    CacheControl: 'public, max-age=31536000', // Cache 1 ano
    ACL: 'public-read'
  }).promise();
  
  // URL da CDN
  const cdnUrl = `https://cdn.eventhub.com/tickets/${order._id}.html`;
  
  // Também faz upload do PDF
  const pdfBuffer = await generateTicketPDF({...});
  await s3.upload({
    Bucket: 'eventhub-tickets',
    Key: `tickets/${order._id}.pdf`,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    CacheControl: 'public, max-age=31536000',
    ACL: 'public-read'
  }).promise();
  
  // Salva URLs no banco (para referência)
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        cdnUrls: {
          html: cdnUrl,
          pdf: `https://cdn.eventhub.com/tickets/${order._id}.pdf`
        }
      }
    }
  );
  
  console.log(`✅ Página estática publicada: ${cdnUrl}`);
  
  return cdnUrl;
}
```

---

### 4️⃣ PWA com Cache Offline

```typescript
/**
 * Service Worker para cachear ingressos
 * Cliente acessa uma vez → Fica salvo offline
 */

// public/sw.js
const CACHE_NAME = 'eventhub-tickets-v1';

// Instala service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});

// Intercepta requests
self.addEventListener('fetch', (event) => {
  // Páginas de ingresso (/meu-ingresso/*)
  if (event.request.url.includes('/meu-ingresso/')) {
    event.respondWith(
      // Tenta buscar da rede
      fetch(event.request)
        .then((response) => {
          // Clona response
          const responseClone = response.clone();
          
          // Salva no cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        })
        .catch(() => {
          // Se falhar, busca do cache
          return caches.match(event.request);
        })
    );
  }
  
  // QR Code images
  if (event.request.url.includes('/qr/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
```

---

### 5️⃣ Infraestrutura Redundante

```yaml
# Arquitetura Multi-Region

┌─────────────────────────────────────────┐
│           CloudFlare (Global)           │
│     • DDoS Protection                   │
│     • CDN                               │
│     • Load Balancer                     │
└──────────┬──────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼────┐ ┌───▼─────┐
│ Region  │ │ Region  │
│ US-East │ │ SA-East │
│         │ │ (Brasil)│
│ Backend │ │ Backend │
│ Primary │ │ Backup  │
└────┬────┘ └───┬─────┘
     │          │
     └────┬─────┘
          │
    ┌─────▼──────┐
    │  MongoDB   │
    │   Atlas    │
    │ Multi-AZ   │
    └────────────┘

# Se um cair, outro assume automaticamente
```

```typescript
// config/database.ts - Conexão com failover

const mongoOptions = {
  // Connection string com múltiplas replicas
  uri: process.env.MONGODB_URI, // mongodb+srv://cluster0,cluster1,cluster2/...
  
  // Retry automaticamente
  retryWrites: true,
  retryReads: true,
  
  // Timeout rápido para failover
  serverSelectionTimeoutMS: 5000,
  
  // Pool de conexões
  maxPoolSize: 50,
  minPoolSize: 10
};
```

---

### 6️⃣ Sistema de Notificação em Cascata

```typescript
/**
 * Envia ingresso por TODOS os canais
 * Garante que cliente recebe de pelo menos 1 forma
 */

// services/ticket-delivery.service.ts

async function deliverTicketsToCustomer(order: Order, tickets: Ticket[]) {
  console.log(`📦 Entregando ${tickets.length} ingresso(s) para ${order.buyer.email}...`);
  
  const deliveryMethods = [];
  
  try {
    // 1. Email (CRÍTICO - sempre tentar primeiro)
    await sendTicketEmail(order, tickets);
    deliveryMethods.push('email');
    console.log('✅ Email enviado');
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
  
  try {
    // 2. Upload para CDN (página estática)
    const cdnUrl = await uploadTicketPageToCDN(order, tickets);
    deliveryMethods.push('cdn');
    console.log(`✅ CDN: ${cdnUrl}`);
  } catch (error) {
    console.error('❌ Erro no CDN:', error);
  }
  
  try {
    // 3. WhatsApp (se tiver número)
    if (order.buyer.phone) {
      await sendTicketWhatsApp(order, tickets);
      deliveryMethods.push('whatsapp');
      console.log('✅ WhatsApp enviado');
    }
  } catch (error) {
    console.error('❌ Erro no WhatsApp:', error);
  }
  
  try {
    // 4. SMS (backup do WhatsApp)
    if (order.buyer.phone) {
      await sendTicketSMS(order, `Seus ingressos: ${cdnUrl}`);
      deliveryMethods.push('sms');
      console.log('✅ SMS enviado');
    }
  } catch (error) {
    console.error('❌ Erro no SMS:', error);
  }
  
  // Registra métodos de entrega bem-sucedidos
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        'delivery.methods': deliveryMethods,
        'delivery.completedAt': new Date(),
        'delivery.success': deliveryMethods.length > 0
      }
    }
  );
  
  if (deliveryMethods.length === 0) {
    // CRÍTICO: Nenhum método funcionou!
    await alertOps(`FALHA na entrega de ingressos: Order ${order.orderNumber}`);
    throw new Error('Falha ao entregar ingressos');
  }
  
  console.log(`✅ Ingressos entregues via: ${deliveryMethods.join(', ')}`);
  
  return {
    success: true,
    methods: deliveryMethods
  };
}
```

---

## 🤖 Automação de Contingência

```typescript
/**
 * Sistema automático que executa 2h antes do evento
 * Garante que todos os ingressos estão acessíveis
 */

// jobs/pre-event-contingency.job.ts

import cron from 'node-cron';

// Agenda job para executar 2h antes de cada evento
async function schedulePreEventContingency() {
  // Busca eventos das próximas 24h
  const upcomingEvents = await Event.find({
    date: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    status: 'published'
  });
  
  for (const event of upcomingEvents) {
    const twoHoursBefore = new Date(event.date.getTime() - 2 * 60 * 60 * 1000);
    
    // Agenda execução
    scheduleAt(twoHoursBefore, async () => {
      await runPreEventContingency(event._id);
    });
  }
}

async function runPreEventContingency(eventId: string) {
  console.log(`🤖 Iniciando contingência automática para evento ${eventId}...`);
  
  const event = await Event.findById(eventId);
  const orders = await Order.find({
    eventId,
    'payment.status': 'approved'
  }).populate('tickets');
  
  console.log(`📊 ${orders.length} pedidos confirmados`);
  
  const tasks = [];
  
  for (const order of orders) {
    tasks.push((async () => {
      try {
        // 1. Gera página estática no CDN (se ainda não existe)
        if (!order.cdnUrls?.html) {
          const cdnUrl = await uploadTicketPageToCDN(order, order.tickets);
          console.log(`✅ CDN gerado: ${order.orderNumber}`);
        }
        
        // 2. Re-envia email (com link do CDN)
        await sendReminderEmail(order, order.tickets);
        console.log(`✅ Lembrete enviado: ${order.buyer.email}`);
        
        // 3. Upload QR Codes para CDN (imagens)
        for (const ticket of order.tickets) {
          if (!ticket.qrCode.cdnUrl) {
            const qrImage = await QRCode.toBuffer(ticket.qrCode.data);
            const cdnUrl = await uploadToCDN(qrImage, `qr-${ticket._id}.png`);
            
            await Ticket.updateOne(
              { _id: ticket._id },
              { $set: { 'qrCode.cdnUrl': cdnUrl } }
            );
          }
        }
        
        return { success: true, orderNumber: order.orderNumber };
        
      } catch (error) {
        console.error(`❌ Erro no pedido ${order.orderNumber}:`, error);
        return { success: false, orderNumber: order.orderNumber, error };
      }
    })());
  }
  
  // Executa em paralelo (lotes de 10)
  const results = [];
  for (let i = 0; i < tasks.length; i += 10) {
    const batch = tasks.slice(i, i + 10);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`
🤖 Contingência Automática Concluída
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Evento: ${event.title}
Total de pedidos: ${orders.length}
✅ Sucesso: ${successful}
❌ Falhas: ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // Se houver falhas, alerta ops
  if (failed > 0) {
    await alertOps(`⚠️ ${failed} pedidos falharam na contingência do evento ${event.title}`);
  }
  
  // Registra execução
  await Event.updateOne(
    { _id: eventId },
    {
      $set: {
        'contingency.executedAt': new Date(),
        'contingency.results': {
          total: orders.length,
          successful,
          failed
        }
      }
    }
  );
}

// Inicia agendamento
cron.schedule('*/15 * * * *', () => {
  // A cada 15 minutos, verifica eventos próximos
  schedulePreEventContingency();
});
```

---

## 📊 Resumo da Solução

```
Cliente sempre consegue ingresso via:

1️⃣ Email (PDF anexo)
   ├── Enviado imediatamente após pagamento
   ├── Guardado no inbox (backup permanente)
   └── Pode reenviar a qualquer momento

2️⃣ WhatsApp (link + imagem)
   ├── Link direto para CDN
   ├── QR Code como imagem
   └── Não depende do backend

3️⃣ CDN (página HTML estática)
   ├── https://cdn.eventhub.com/tickets/ORDER_ID
   ├── Hospedado em S3 + CloudFront
   ├── 99.99% de disponibilidade
   └── Funciona mesmo com backend fora

4️⃣ SMS (texto com link)
   ├── Backup se WhatsApp falhar
   └── Link para CDN

5️⃣ Site (com cache PWA)
   ├── /meu-ingresso/ORDER_ID
   ├── Service Worker cacheia offline
   └── Funciona mesmo sem internet (se já acessou)

🤖 Automação 2h antes:
   ├── Gera páginas CDN de todos os ingressos
   ├── Re-envia email de lembrete
   ├── Valida que tudo está acessível
   └── Alerta ops se houver falhas

= IMPOSSÍVEL cliente não conseguir ingresso!
```

---

## 💰 Custos Estimados

```
Email (Resend):
├── Free: 3.000/mês
├── Pro: $20/mês (50.000 emails)
└── Para 12 eventos/ano: FREE tier resolve ✅

WhatsApp (Twilio):
├── $0.005 por mensagem
├── 1500 clientes × 12 eventos = 18.000 mensagens/ano
└── Custo: ~$90/ano ✅

SMS (backup):
├── $0.01 por SMS
├── Usar só em emergências
└── Custo estimado: ~$50/ano

CDN (Cloudflare R2):
├── 10 GB storage: $0.15/mês
├── 1500 tickets × 500KB = 750MB por evento
├── 12 eventos = 9GB/ano
└── Custo: ~$15/ano ✅

Total: ~$175/ano para redundância total!
```

---

## ✅ Checklist de Implementação

```typescript
const DELIVERY_CHECKLIST = {
  mvp: [
    '[ ] Email com PDF (CRÍTICO)',
    '[ ] CDN para servir PDFs (S3 + CloudFront)',
    '[ ] Página HTML estática por pedido',
    '[ ] Link no email para CDN'
  ],
  
  fase2: [
    '[ ] WhatsApp com link + QR',
    '[ ] SMS como backup',
    '[ ] Service Worker (PWA offline)',
    '[ ] Job automático 2h antes'
  ],
  
  infra: [
    '[ ] Setup S3 bucket para tickets',
    '[ ] CloudFront distribution',
    '[ ] Cloudflare R2 (backup)',
    '[ ] MongoDB Atlas multi-region',
    '[ ] Monitoramento (Sentry + Uptime)',
    '[ ] Alertas ops (Discord/Slack)'
  ]
};
```

---

**RESPOSTA DIRETA:** Sim, podemos e DEVEMOS automatizar isso! O robô executa 2h antes e garante que TODOS os 1500 clientes conseguem acessar ingresso via email, WhatsApp, CDN e site - mesmo que o servidor caia! 🚀

## Sistema Offline (Fase Futura)

> **⚠️ IMPLEMENTAR DEPOIS DO MVP**
> 
> Sistema de validação offline com sincronização P2P entre tablets.
> Garante funcionamento mesmo se servidor cair completamente no dia do evento.

### Cenário de Uso

```
Evento: 1500 pessoas
Leitores: 5 tablets (1 por portão)
Problema: Servidor AWS/Backend cai no dia do evento
Solução: Sistema 100% offline com cache local
```

### Arquitetura Offline

```
ANTES DO EVENTO (2h antes):
┌──────────────┐
│   Backend    │
│              │
│ 1. Fecha     │
│    vendas    │
│              │
│ 2. Gera      │
│    snapshot  │
│    (1500     │
│    tickets)  │
│              │
│ 3. Upload    │
│    para:     │
│    • AWS S3  │
│    • R2      │
│    • Drive   │
└──────┬───────┘
       │
       │ Download
       ▼
┌──────────────┐
│  5 Tablets   │
│              │
│ • Cache      │
│   completo   │
│              │
│ • Modo       │
│   HYBRID     │
└──────────────┘

DURANTE O EVENTO:
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│Tablet 1 │  │Tablet 2 │  │Tablet 3 │  │Tablet 4 │  │Tablet 5 │
│Portão 1 │  │Portão 2 │  │Portão 3 │  │Portão 4 │  │Portão 5 │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │            │
     └────────────┴────────────┴────────────┴────────────┘
                          │
                  Rede WiFi Local
                  (sincronização P2P)
                  Funciona SEM internet
```

### Estrutura do Snapshot Offline

```typescript
interface OfflineSnapshot {
  metadata: {
    eventId: string;
    eventName: string;
    eventDate: Date;
    generatedAt: Date;
    version: number;
    totalTickets: number;
    hash: string; // SHA-256 para integridade
  };
  
  // TODOS os tickets válidos
  tickets: Array<{
    ticketId: string;
    ticketNumber: string;
    
    // QR Code completo (self-contained)
    qrCode: {
      data: string;
      hash: string;
      image: string; // Base64 da imagem
    };
    
    // Dados do comprador
    holder: {
      name: string;
      cpf: string;
      email: string;
    };
    
    // Tipo de ingresso
    ticketType: {
      name: string;
      price: number;
    };
    
    // Status do pagamento
    order: {
      orderNumber: string;
      paymentStatus: 'approved';
      paidAt: Date;
    };
  }>;
  
  // Validações (atualizadas durante evento)
  validations: Array<{
    ticketId: string;
    validatedAt: number;
    validatedBy: string; // tablet ID
    tabletName: string; // "Portão 1"
  }>;
}
```

### Sincronização P2P Entre Tablets

```typescript
/**
 * Sistema de sincronização peer-to-peer
 * 
 * - Cada tablet tem cache completo de 1500 tickets
 * - Quando valida, broadcast para outros tablets via WiFi local
 * - Impossível usar mesmo QR em 2 portões
 * - Funciona SEM internet
 * - Sincroniza com backend depois (quando voltar)
 */

class PeerSyncService {
  private tabletId: string;
  private validatedTickets: Set<string>;
  
  // Marca como validado e notifica outros tablets
  async validateTicket(ticketId: string) {
    // 1. Salva localmente (IndexedDB)
    await localDB.validations.add({
      ticketId,
      validatedAt: Date.now(),
      validatedBy: this.tabletId,
      tabletName: this.getTabletName()
    });
    
    // 2. Adiciona ao cache em memória
    this.validatedTickets.add(ticketId);
    
    // 3. Broadcast para outros tablets (via WiFi local)
    this.broadcastToNetwork({
      type: 'TICKET_VALIDATED',
      ticketId,
      validatedAt: Date.now(),
      validatedBy: this.tabletId
    });
    
    // 4. Tenta enviar para backend (se online)
    this.trySyncWithBackend({ ticketId }).catch(() => {
      // Ignora erro, sync depois
    });
  }
  
  // Verifica se ticket já foi usado (local ou outros tablets)
  async isTicketUsed(ticketId: string): Promise<boolean> {
    // Checa cache em memória (instantâneo)
    if (this.validatedTickets.has(ticketId)) {
      return true;
    }
    
    // Checa banco local (outros tablets notificaram)
    const validation = await localDB.validations
      .where('ticketId')
      .equals(ticketId)
      .first();
    
    return !!validation;
  }
}
```

### Validação Offline (Anti-Fraude)

```typescript
/**
 * Validação 100% offline com proteções:
 * - Verifica hash HMAC do QR
 * - Checa uso local
 * - Checa uso em outros tablets (P2P)
 * - Impossível usar QR falsificado
 * - Performance: ~15-35ms por validação
 */

async function validateQRCodeOffline(qrCode: string): Promise<ValidationResult> {
  // 1. Decodifica QR Code
  const payload = JSON.parse(Buffer.from(qrCode, 'base64url').toString());
  
  // 2. Busca ticket no cache local (IndexedDB)
  const ticket = await localDB.tickets.get(payload.tid);
  
  if (!ticket) {
    return { 
      valid: false, 
      reason: '❌ Ingresso não encontrado',
      mode: 'offline'
    };
  }
  
  // 3. Valida HASH do QR (anti-falsificação)
  const expectedHash = crypto
    .createHmac('sha256', QR_SECRET)
    .update(JSON.stringify({ tid: payload.tid, eid: payload.eid, ts: payload.ts, nonce: payload.nonce }))
    .digest('hex');
  
  if (payload.sig !== expectedHash) {
    return { 
      valid: false, 
      reason: '❌ QR Code inválido ou falsificado',
      mode: 'offline'
    };
  }
  
  // 4. Verifica se já foi usado (local ou outros tablets)
  const alreadyUsed = await peerSync.isTicketUsed(payload.tid);
  
  if (alreadyUsed) {
    const validation = await localDB.validations.where('ticketId').equals(payload.tid).first();
    return { 
      valid: false, 
      reason: `❌ Já validado em ${validation.tabletName} às ${formatTime(validation.validatedAt)}`,
      mode: 'offline'
    };
  }
  
  // 5. ✅ VÁLIDO! Marca como usado
  await peerSync.validateTicket(payload.tid);
  
  return { 
    valid: true, 
    ticket,
    mode: 'offline'
  };
}
```

### Armazenamento Local (IndexedDB)

```typescript
// Database schema para validador offline
import Dexie from 'dexie';

class ValidatorDB extends Dexie {
  tickets!: Table<CachedTicket>;
  validations!: Table<Validation>;
  
  constructor() {
    super('EventHubValidator');
    
    this.version(1).stores({
      // Cache de tickets
      tickets: 'ticketId, qrCodeHash, eventId',
      
      // Validações realizadas
      validations: 'ticketId, validatedAt, validatedBy, syncStatus'
    });
  }
}

export const db = new ValidatorDB();
```

### Checklist Pré-Evento

```typescript
const OFFLINE_PREP_CHECKLIST = {
  // 1 dia antes
  dayBefore: [
    '[ ] Gerar snapshot do evento',
    '[ ] Upload para 3 backups (S3, R2, Drive)',
    '[ ] Testar download do snapshot',
    '[ ] Verificar integridade (hash SHA-256)'
  ],
  
  // 2-3 horas antes
  hoursBeforeEvent: [
    '[ ] Fechar vendas de ingressos',
    '[ ] Baixar snapshot nos 5 tablets',
    '[ ] Configurar nome de cada tablet ("Portão 1", etc)',
    '[ ] Conectar tablets na mesma rede WiFi local',
    '[ ] Carregar tablets 100%',
    '[ ] Ter 2 tablets backup prontos'
  ],
  
  // 1 hora antes
  finalCheck: [
    '[ ] Testar validação offline em cada tablet',
    '[ ] Verificar sincronização P2P entre tablets',
    '[ ] Confirmar que todos têm 1500 tickets em cache',
    '[ ] Testar câmera de cada tablet',
    '[ ] Validar 1 ticket teste e confirmar sync'
  ],
  
  // Hardware
  hardware: [
    '[ ] 5 tablets principais (iPad/Android)',
    '[ ] 2 tablets backup',
    '[ ] 1 roteador WiFi (para rede local)',
    '[ ] Powerbanks para emergência',
    '[ ] Suportes/tripés para tablets'
  ]
};
```

### Performance Esperada

```
Validação Offline:
├── Busca IndexedDB: ~1-5ms
├── Validação hash: ~5-10ms
├── Check P2P: ~5-10ms
├── Update local: ~5-10ms
└── Total: ~15-35ms ✅

Vs. Validação Online:
├── Network latency: 100-500ms
├── Backend processing: 50-100ms
├── MongoDB query: 20-50ms
└── Total: ~170-650ms ❌

Ganho: 5x-20x mais rápido!

Capacidade:
├── 1 tablet: ~2-3 seg/pessoa (com feedback visual)
├── 5 tablets: 1500 pessoas em ~2 horas
└── Status: TRANQUILO ✅
```

### Tecnologias

```typescript
// Frontend/Validador
IndexedDB: Dexie.js          // Cache local
P2P Sync: BroadcastChannel   // Sincronização WiFi local
PWA: Service Worker          // App offline
Camera: html5-qrcode         // Scanner QR Code

// Backend (geração snapshot)
Compress: gzip               // Compressão snapshot
Upload: AWS SDK, R2, Drive   // Upload redundante
Hash: crypto (SHA-256)       // Integridade
```

### Custo Estimado (Armazenamento)

```
Snapshot de 1500 tickets:
├── JSON: ~2MB
├── Comprimido (gzip): ~500KB
└── Por tablet: ~500KB

5 tablets + 2 backup = 7 tablets
7 × 500KB = ~3.5MB total

Storage necessário por tablet: 50MB
├── Snapshot: 500KB
├── Validações: ~100KB
├── App cache: ~20MB
└── Margem: ~29MB

Hardware: Qualquer tablet moderno ✅
```

### Roadmap de Implementação (Fase Futura)

```
Fase MVP (atual):
├── Sistema online básico
├── Validação via API
└── Dependente de internet

Fase 2 (após 2-3 eventos):
├── Sistema de snapshot
├── Cache local (IndexedDB)
├── Modo hybrid (online + offline fallback)
└── Estimativa: +2 semanas

Fase 3 (após feedback):
├── Sincronização P2P entre tablets
├── Modo 100% offline
├── Redundância total
└── Estimativa: +2 semanas

Total: +4 semanas após MVP
```

---

## Próximos Passos

### Fase 1 - MVP (6-8 semanas)
1. ✅ Validar arquitetura com equipe
2. ✅ Criar conta Mercado Pago (sandbox para testes)
3. ✅ Setup MongoDB Atlas
4. ✅ Criar repo GitHub
5. ✅ Começar desenvolvimento backend
6. ✅ Começar desenvolvimento frontend em paralelo
7. ✅ Integração e testes
8. ✅ Deploy staging
9. ✅ Evento teste (interno)
10. ✅ Deploy produção

**Tempo estimado: 6-8 semanas**

### Fase 2 - Sistema Offline (Futuro)
- [ ] Implementar geração de snapshot
- [ ] Sistema de cache local (IndexedDB)
- [ ] Validação offline básica
- [ ] Modo hybrid (online + offline)
- [ ] Testes em evento real

**Tempo estimado: +2-4 semanas (após MVP)**

