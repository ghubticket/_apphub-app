# EventHub - Sistema de Venda de Ingressos para Eventos de Pagode

> Plataforma completa de venda de ingressos e controle de acesso com QR Code para eventos de pagode. Sistema próprio que elimina taxas de plataformas externas (~25%) e oferece controle total sobre vendas e dados dos clientes.

---
## 📋 Documentação do Projeto

**⚠️ IMPORTANTE:** Este projeto segue as especificações do arquivo **[PREMISSAS.md](./PREMISSAS.md)** que contém:
- ✅ Todas as decisões técnicas e de negócio
- ✅ Stack completa e justificativas
- ✅ Roadmap detalhado (MVP → Fase 4)
- ✅ Custos estimados por fase
- ✅ Segurança (OWASP, LGPD, PCI-DSS)
- ✅ O que fazer e o que **NÃO** fazer no MVP
- ✅ Observabilidade e monitoramento

**Ordem de leitura recomendada:**
1. **README.md** (este arquivo) - Visão geral e quick start
2. **PREMISSAS.md** - A BÍBLIA do projeto (leitura obrigatória!)
3. **ARCHITECTURE.md** - Detalhes técnicos de implementação

---

  
## 🎯 Por Que Este Projeto Existe?

### O Problema
Atualmente usamos a **Ingresse** para vender ingressos, mas:
- ❌ **Taxas altíssimas**: 20-30% por venda (R$ 75.000/ano em 12 eventos)
- ❌ **Sem controle**: Dependência total de plataforma terceira
- ❌ **Sem dados**: Não temos acesso aos dados dos clientes
- ❌ **Inflexível**: Impossível customizar a experiência

### A Solução
Sistema próprio de ponta a ponta que oferece:
- ✅ **Economia massiva**: ~R$ 60.000/ano (ROI em 3 meses)
- ✅ **Controle total**: Sistema, dados, experiência, tudo nosso
- ✅ **Flexibilidade**: Customizamos o que precisamos
- ✅ **Gateway direto**: Mercado Pago (~4% vs 25% da Ingresse)

### Perfil dos Eventos
- **Tipo**: Eventos de pagode
- **Frequência**: 12 eventos por ano
- **Porte**: 500 a 1500 pessoas por evento
- **Local típico**: Estacionamento do Canindé (São Paulo)

### 💰 ROI e Economia
```
Com Ingresse (atual):
├── Evento 500 pessoas × R$ 50 = R$ 25.000
├── Taxa Ingresse (25%) = R$ 6.250 por evento
└── 12 eventos/ano = R$ 75.000 em taxas 💸

Com Sistema Próprio:
├── Hospedagem: ~R$ 200/mês = R$ 2.400/ano
├── Gateway Mercado Pago (4%): ~R$ 12.000/ano
├── Infraestrutura/Serviços: ~R$ 175/ano
└── Total: ~R$ 14.600/ano

ECONOMIA: ~R$ 60.000/ano ✅
ROI: 3 meses (payback)
```
---


## 🎯 Visão Geral do Sistema

**EventHub** é uma plataforma completa que cobre todo o ciclo:
- **Portal público** de venda de ingressos online
- **Pagamento integrado** via Mercado Pago (Pix, cartão, boleto)
- **QR Codes seguros** gerados automaticamente
- **Entrega multi-canal** (Email PDF, WhatsApp, CDN)
- **Sistema de validação** em tempo real no portão
- **Dashboard administrativo** para gestão completa
- **Relatórios financeiros** e analytics

### 🚀 Funcionalidades Principais

**Para Clientes:**
- 🎫 Compra de ingressos simples e rápida
- 💳 Pagamento via Pix, cartão ou boleto
- 📧 Recebe QR Code por email (PDF anexo)
- 📱 Acesso ao ingresso por múltiplos canais
- ✅ Entrada facilitada com QR Code

**Para Organizadores:**
- 📊 Dashboard com controle total
- 👥 Sistema de roles (Master, Admin, Financeiro, Leitor)
- 🎪 Gestão completa de eventos e ingressos
- 💰 Controle de vendas e relatórios financeiros
- 📈 Analytics em tempo real

**Para Validadores (Portão):**
- 📱 App de leitura de QR Code
- ⚡ Validação em <2 segundos
- ✅ Feedback visual claro (verde/vermelho/amarelo)
- 🔒 Anti-fraude: QR Code uso único
- 📊 Dashboard simples de acompanhamento


---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica (Baseada nas Premissas do Projeto)

**Backend:**
- **Node.js** + **TypeScript** + **Express.js**
- **MongoDB Atlas** (cloud, free tier M0 → M10 depois)
- **Mongoose** (ODM)
- **JWT** para autenticação (Passport.js)
- **Swagger/OpenAPI** para documentação da API
- **node-cache** (cache em memória → Redis na Fase 2)
- **Mercado Pago SDK** para pagamentos
- **Resend** para envio de emails
- **Cloudinary** para upload de imagens
- **Helmet** para segurança
- **express-rate-limit** para proteção

**Frontend:**
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **Shadcn/ui**
- **React Hook Form** + **Zod** (validação)
- **Zustand** para state management
- **Axios** para chamadas API

**Infraestrutura & Deploy:**
- **Backend**: Railway ou Render (deploy direto do Git)
- **Frontend**: Vercel (deploy automático)
- **Banco**: MongoDB Atlas (gerenciado, backup automático)
- **CDN**: Cloudflare R2 ou AWS S3 (para PDFs e imagens)
- **Email**: Resend (free tier: 3k/mês)
- **Monitoramento**: Sentry (free tier: 5k eventos/mês)

### Diagrama da Arquitetura (MVP Simplificado)

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare                         │
│              (CDN + DDoS Protection)                 │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌────────────────┐       ┌────────────────┐
│   Frontend     │       │   Backend API  │
│   (Next.js)    │◄─────►│   (Node.js)    │
│   Vercel       │       │   Railway      │
│                │       │                │
│ • Landing      │       │ • Auth (JWT)   │
│ • Dashboard    │       │ • CRUD Events  │
│ • Checkout     │       │ • Mercado Pago │
│ • QR Reader    │       │ • QR Codes     │
└────────────────┘       │ • Validation   │
                         └───────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ MongoDB  │  │ Resend   │  │Cloudinary│
            │  Atlas   │  │ (Email)  │  │ (Upload) │
            │          │  │          │  │          │
            │ • Users  │  │ • PDFs   │  │ • Images │
            │ • Events │  │ • Alerts │  │ • QRs    │
            │ • Orders │  └──────────┘  └──────────┘
            │ • Tickets│
            └──────────┘

Fase 2: Adicionar Redis para cache
Fase 3: Sistema offline nos tablets
```
---

## 🔐 Sistema de Segurança
### Autenticação e Autorização
O sistema possui 4 níveis de acesso:
- **Master**: Acesso total ao sistema
- **Admin**: Gestão de eventos e ingressos
- **Financeiro**: Visualização de relatórios e vendas
- **Leitor**: Apenas validação de QR Codes no portão

Cada role possui permissões específicas sobre recursos (eventos, ingressos, usuários, relatórios).

### Proteções Implementadas
- **HTTPS obrigatório** com certificados SSL
- **HttpOnly cookies** para tokens
- **CSRF protection** com tokens únicos
- **Rate limiting** por IP e usuário
- **SQL/NoSQL injection** protection
- **XSS protection** com sanitização
- **CORS** configurado adequadamente
  

### QR Code Security

Cada QR Code contém:
- ID do ingresso e evento
- Hash criptográfico HMAC SHA-256 para validação
- Timestamp de geração
- Status de uso (válido apenas 1 vez)
- Data de expiração (opcional)

O sistema garante que:
- ✅ QR Codes não podem ser falsificados (validação de hash)
- ✅ Cada QR Code só funciona uma única vez
- ✅ Validação em tempo real com feedback instantâneo
- ✅ Logs completos de todas as validações

---

## 📊 Fluxo do Sistema

### 1. Dashboard Administrativo

**Login e Controle de Acesso:**

```
Usuário Master → Acesso total

├── Gerenciar usuários e permissões
├── Criar/editar eventos
├── Configurar ingressos
└── Relatórios e analytics

Admin → Gestão de eventos
├── Criar/editar eventos
├── Gerenciar ingressos
└── Visualizar relatórios

Financeiro → Controle financeiro
├── Relatórios de vendas
├── Controle de pagamentos
└── Analytics financeiros

Leitor → Apenas visualização
└── Dashboard de monitoramento

```
### 2. Gestão de Eventos

**Criação de Evento:**
- Upload de foto/logo
- Descrição detalhada
- Local e endereço
- Data e horário
- Configurações de acesso

**Gestão de Ingressos:**
- Tipos de ingresso (Normal, VIP, Meia-entrada)
- Preços e quantidades
- Limite por CPF
- Período de venda
- Configurações especiais

### 3. Fluxo de Compra (Futuro)

```

Cliente → Seleciona evento → Escolhe ingressos →
Preenche dados → Pagamento → Geração QR Code →
Confirmação por email

```

### 4. Sistema de Validação

  

**QR Code Reader:**
- Scanner em tempo real
- Validação de hash
- Verificação de expiração
- Controle de uso único
- Log de acessos

---

## 🗄️ Estrutura do Banco de Dados

### Collections MongoDB

O banco de dados MongoDB organiza as informações em 4 coleções principais:

**Users (Usuários):**
- Dados de autenticação (email, senha hasheada)
- Roles e permissões
- Perfil e informações pessoais
- Status de ativação

**Events (Eventos):**
- Informações do evento (título, descrição, imagem)
- Local e data
- Status (rascunho, publicado, cancelado)
- Configurações (limite de pessoas, etc)
- Tipos de ingresso vinculados

**Tickets (Tipos de Ingresso):**
- Nome e descrição (Pista, VIP, Meia-entrada)
- Preço e quantidade disponível
- Quantidade vendida
- Configurações (limite por CPF, VIP, etc)

**Orders (Pedidos):**
- Dados do comprador
- Ingressos comprados e quantidades
- Valor total
- Status do pagamento (pendente, aprovado, cancelado)
- QR Codes gerados
- Histórico de timestamps

Todas as coleções possuem campos de auditoria (`createdAt`, `updatedAt`) e relacionamentos via ObjectId do MongoDB.

---
  

## 🚀 Scripts e Comandos

### Desenvolvimento Local

**Backend:**
```bash
cd backend
npm install
npm run dev          # Inicia servidor em modo dev (nodemon)
npm run build        # Build TypeScript
npm run start        # Inicia em produção
npm run lint         # ESLint
npm run test         # Jest tests
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev          # Inicia Next.js dev server
npm run build        # Build para produção
npm run start        # Serve build de produção
npm run lint         # ESLint
```

### Deploy em Produção

**Backend (Railway/Render):**
1. Conecta repositório GitHub
2. Seleciona branch `main`
3. Railway/Render detecta `package.json` automaticamente
4. Configura variáveis de ambiente
5. Deploy automático a cada push

**Frontend (Vercel):**
1. Importa projeto do GitHub
2. Detecta Next.js automaticamente
3. Configura variáveis de ambiente
4. Deploy automático a cada push na `main`

**Banco de Dados (MongoDB Atlas):**
- Backup automático configurado
- Retenção: 7 dias (free tier) ou mais (pago)

---

## 📁 Estrutura do Projeto (Simplificada para MVP)

```
eventhub/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Configurações (DB, Mercado Pago, etc)
│   │   ├── controllers/    # Lógica de controle
│   │   ├── middleware/     # Auth, rate limit, etc
│   │   ├── models/         # Schemas Mongoose
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Lógica de negócio
│   │   │   ├── payment.service.ts     # Mercado Pago
│   │   │   ├── qrcode.service.ts      # Geração/validação QR
│   │   │   ├── email.service.ts       # Resend
│   │   │   ├── upload.service.ts      # Cloudinary
│   │   │   └── pdf.service.ts         # Geração de PDFs
│   │   └── utils/          # Helpers e utilidades
│   ├── tests/              # Testes
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # Frontend Next.js
│   ├── app/
│   │   ├── (public)/      # Páginas públicas
│   │   │   ├── page.tsx            # Landing
│   │   │   ├── eventos/[id]/       # Detalhe evento
│   │   │   └── checkout/           # Compra
│   │   ├── (dashboard)/   # Área administrativa
│   │   │   ├── eventos/            # CRUD eventos
│   │   │   ├── ingressos/          # Gestão ingressos
│   │   │   ├── vendas/             # Relatórios
│   │   │   └── usuarios/           # Gestão usuários
│   │   └── (leitor)/      # App de validação
│   │       └── page.tsx            # QR Reader
│   ├── components/
│   │   ├── ui/            # Shadcn components
│   │   ├── forms/         # Formulários
│   │   └── qr-reader/     # Scanner QR
│   ├── lib/
│   │   ├── api.ts         # Cliente Axios
│   │   └── utils.ts       # Helpers
│   ├── .env.example
│   ├── package.json
│   └── next.config.js
│
├── .github/
│   └── workflows/         # CI/CD (opcional Fase 2)
├── .gitignore
├── README.md
├── PREMISSAS.md          # Este documento é a BÍBLIA do projeto
└── ARCHITECTURE.md       # Detalhes técnicos

Nota: Sem Docker, sem monorepo complexo - simplicidade máxima no MVP!
```

---

## 📚 API Documentation com Swagger

### O Que é Swagger?
Swagger é uma ferramenta que gera documentação interativa da API automaticamente. Você pode **testar todos os endpoints diretamente no navegador**, sem precisar do Postman!

### Como Usar

**1. Acessar a documentação:**
```
http://localhost:3001/api-docs
```

**2. Testar um endpoint (exemplo: Login):**
1. Acesse http://localhost:3001/api-docs
2. Procure por `POST /api/auth/login`
3. Clique em "Try it out"
4. Preencha o JSON:
   ```json
   {
     "email": "admin@eventhub.com",
     "password": "SuaSenha123!"
   }
   ```
5. Clique em "Execute"
6. Veja a resposta com o token JWT!

**3. Usar o token em endpoints protegidos:**
1. Copie o token da resposta do login
2. Clique no botão "Authorize" (🔒 no topo da página)
3. Cole o token: `Bearer seu-token-aqui`
4. Agora você pode testar endpoints protegidos!

### Setup no Backend

**Instalar dependências:**
```bash
npm install swagger-ui-express swagger-jsdoc @types/swagger-ui-express @types/swagger-jsdoc
```

**Configurar Swagger (backend/src/config/swagger.ts):**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EventHub API',
      version: '1.0.0',
      description: 'API REST para gestão de eventos e venda de ingressos',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Desenvolvimento',
      },
      {
        url: 'https://api.eventhub.com',
        description: 'Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no login',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'], // Documentação inline nas rotas
};

export const swaggerSpec = swaggerJsdoc(options);
```

**Adicionar no servidor (backend/src/server.ts):**
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Rota da documentação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'EventHub API Docs',
  customCss: '.swagger-ui .topbar { display: none }', // Remove barra do Swagger
}));
```

### Exemplo: Documentar Endpoint de Login

**No arquivo de rotas (backend/src/routes/auth.routes.ts):**
```typescript
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login do usuário
 *     description: Autentica o usuário e retorna token JWT
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@eventhub.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SenhaSegura123!
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [master, admin, financeiro, leitor]
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email ou senha incorretos
 */
router.post('/login', authController.login);
```

### Endpoints Principais para Documentar no MVP

**Autenticação:**
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário logado

**Eventos:**
- `GET /api/events` - Listar eventos
- `GET /api/events/:id` - Detalhes do evento
- `POST /api/events` - Criar evento (admin)
- `PUT /api/events/:id` - Editar evento (admin)
- `DELETE /api/events/:id` - Deletar evento (admin)

**Ingressos:**
- `GET /api/events/:eventId/tickets` - Listar tipos de ingresso
- `POST /api/events/:eventId/tickets` - Criar tipo de ingresso (admin)

**Pedidos:**
- `POST /api/orders` - Criar pedido (comprar ingresso)
- `GET /api/orders/:id` - Detalhes do pedido
- `GET /api/orders/my-orders` - Meus pedidos

**Validação:**
- `POST /api/validation/check` - Validar QR Code

### Vantagens do Swagger vs Postman

**Swagger:**
- ✅ Documentação sempre atualizada (vive no código)
- ✅ Interface web pronta
- ✅ Time frontend vê facilmente como usar a API
- ✅ Grátis e integrado

**Postman:**
- ✅ Mais features (testes automatizados, ambientes)
- ✅ Salva histórico de requests
- ❌ Collection separada do código (pode desatualizar)

**Recomendação:** Use **Swagger para documentação** + **Postman para testes complexos** (se precisar)

---

## 🔧 Configuração e Deploy

### Variáveis de Ambiente (Backend)

```env
# Node
NODE_ENV=development
PORT=3001

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventhub?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=seu-secret-super-seguro-change-this
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000    # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100

# QR Code Security
QR_SECRET=seu-qr-secret-super-seguro-change-this

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-seu-access-token
MP_PUBLIC_KEY=APP_USR-seu-public-key

# Email (Resend)
RESEND_API_KEY=re_seu_api_key

# Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# Monitoramento (Sentry - opcional)
SENTRY_DSN=https://seu-sentry-dsn
```

### Variáveis de Ambiente (Frontend)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Mercado Pago (público)
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-seu-public-key

# URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
---

## 📈 Performance e Escalabilidade

### Capacidade Esperada (MVP)
```
Evento típico:
├── 500-1500 pessoas
├── Venda: 2 semanas antes
├── Pico: Últimos 3 dias (~100 acessos simultâneos)
├── Validação: 2 horas de entrada (~12 leituras/min)
└── 5 portões com tablets

Stack aguenta tranquilo:
├── Railway/Render: ~1000 req/min ✅
├── MongoDB Atlas M0: ~100 conexões ✅
├── Vercel: Ilimitado ✅
└── Mercado Pago: Sem limite ✅
```

### Quando Escalar?
Sinais para fazer upgrade:
- [ ] Eventos com >2000 pessoas
- [ ] >100 eventos/ano
- [ ] Latência >2s nas validações
- [ ] MongoDB M0 no limite
- [ ] Múltiplos eventos simultâneos

**Upgrades sugeridos:**
- MongoDB Atlas M10 (~$57/mês)
- Railway Pro (~$20/mês)
- Redis para cache (~$10/mês)

### Estratégias de Cache (MVP Simplificado)
- **node-cache** (em memória) para dados frequentes
- **CDN** (Cloudflare R2) para PDFs e imagens
- **Database indexing** otimizado desde o início
- **Connection pooling** MongoDB nativo

### Monitoramento (MVP)
- **Sentry** (free tier) para erros e crashes
- **Logs estruturados** com Winston → Better Stack
- **Health check** endpoint para uptime monitoring
- **Alertas** via Discord/Email para falhas críticas

*Monitoramento avançado (Grafana, Prometheus) na Fase 3*

---

## 🛡️ Segurança Avançada
### QR Code Security - Como Funciona

**Geração do QR Code:**
1. Sistema cria um payload com ID do ingresso, evento, timestamp e nonce aleatório
2. Calcula um hash HMAC SHA-256 do payload usando chave secreta
3. Codifica tudo em Base64 para gerar o QR Code
4. Resultado: QR Code impossível de falsificar sem a chave secreta

**Validação no Portão:**
1. Scanner lê o QR Code e decodifica o payload
2. Recalcula o hash e compara com o hash do QR Code
3. Verifica se não expirou (se aplicável)
4. Consulta banco de dados se já foi usado
5. Se tudo OK: marca como usado e libera entrada
6. Se falhar: mostra erro específico (falsificado, já usado, expirado)

**Segurança Garantida:**
- ✅ Impossível falsificar (precisa da chave secreta)
- ✅ Impossível reusar (marcado como usado após primeira validação)
- ✅ Validação em <2 segundos
- ✅ Funciona offline (Fase 2)

---

## 🎯 Roadmap de Desenvolvimento

### Fase 1 - MVP (6-8 semanas) 🚀
**Objetivo:** Sistema funcional para primeiro evento real

**Backend:**
- [ ] Setup Node.js + TypeScript + Express
- [ ] MongoDB Atlas configurado
- [ ] Swagger/OpenAPI configurado (documentação da API)
- [ ] Sistema de autenticação JWT + roles
- [ ] CRUD completo de eventos e ingressos
- [ ] Integração Mercado Pago (Pix/Cartão)
- [ ] Webhooks de pagamento
- [ ] Geração de QR Code seguro (HMAC SHA-256)
- [ ] Geração de PDF com ingressos
- [ ] Envio de email via Resend
- [ ] API de validação de QR Code

**Frontend:**
- [ ] Setup Next.js 14 + Tailwind + Shadcn/ui
- [ ] Landing page pública
- [ ] Página de evento com detalhes
- [ ] Fluxo de checkout completo
- [ ] Dashboard administrativo (CRUD eventos)
- [ ] Gestão de ingressos e vendas
- [ ] App PWA de validação (QR reader)
- [ ] Página "Meu Ingresso"

**Infraestrutura:**
- [ ] Deploy backend (Railway/Render)
- [ ] Deploy frontend (Vercel)
- [ ] CDN para PDFs (Cloudflare R2/S3)
- [ ] Monitoramento básico (Sentry free)
- [ ] Backup automático MongoDB

**Meta:** Primeiro evento teste com 50-100 pessoas

---

### Fase 2 - Estabilização (2-3 semanas)
**Objetivo:** Sistema robusto para eventos de 500-1500 pessoas

- [ ] Sistema de entrega multi-canal (Email + WhatsApp + CDN)
- [ ] Redundância: CDN com páginas estáticas dos ingressos
- [ ] Sistema offline inicial (cache local)
- [ ] Otimizações de performance
- [ ] Testes de carga
- [ ] Analytics básico
- [ ] Relatórios financeiros

**Meta:** 3-5 eventos reais com feedback

---

### Fase 3 - Otimização (4-6 semanas)
**Objetivo:** Sistema escalável e automatizado

- [ ] Sistema offline completo com P2P sync
- [ ] Automação 2h antes do evento (contingência)
- [ ] Cupons de desconto
- [ ] Relatórios avançados e exportação
- [ ] Monitoramento avançado (Better Stack + Grafana)
- [ ] Dashboard de analytics para stakeholders
- [ ] Notificações WhatsApp automáticas

**Meta:** 12 eventos/ano rodando perfeitamente

---

### Fase 4 - Expansão (Futuro)
**Objetivo:** Crescimento e novas features

- [ ] App mobile nativo (iOS/Android)
- [ ] Sistema de promoters/afiliados
- [ ] Multi-organizadores
- [ ] API pública
- [ ] Possível white-label

**Meta:** Escalar para múltiplos organizadores

---

## 📈 Critérios de Sucesso

### MVP é Sucesso Se:
- ✅ Sistema vende ingresso de ponta a ponta
- ✅ Cliente recebe QR Code por email automaticamente
- ✅ Validador consegue ler e validar QR Code
- ✅ QR Code só funciona 1 vez (anti-fraude)
- ✅ Dashboard mostra vendas em tempo real
- ✅ Sistema aguenta 1 evento de 500 pessoas
- ✅ Zero reclamações críticas de clientes

### Sucesso do Negócio:
- ✅ Economia de >R$ 50.000 no primeiro ano
- ✅ 100% dos eventos usando sistema próprio
- ✅ Satisfação dos clientes >90%
- ✅ Sistema roda sem intervenção manual
- ✅ ROI confirmado em 3 meses


## 🌟 Diferenciais do Projeto

### Por Que Este Sistema é Melhor?

**1. Economia Massiva**
- Taxa Ingresse: 25% por venda
- Taxa Mercado Pago: 4% por venda
- **Economia anual: ~R$ 60.000** 💰

**2. Controle Total**
- ✅ Seus dados, suas regras
- ✅ Customização ilimitada
- ✅ Sem depender de terceiros
- ✅ Evolução no seu ritmo

**3. Experiência Otimizada**
- ⚡ Checkout rápido e simples
- 📱 QR Code multi-canal (Email, WhatsApp, CDN)
- 🔒 Segurança robusta (HMAC SHA-256)
- ✅ Cliente SEMPRE consegue ingresso (redundância)

**4. Gestão Profissional**
- 📊 Dashboard completo em tempo real
- 💰 Relatórios financeiros detalhados
- 👥 Sistema de roles e permissões
- 📈 Analytics de vendas e público

**5. Tecnologia Moderna**
- 🚀 Stack moderna e escalável
- ⚡ Performance otimizada
- 🛡️ Segurança em múltiplas camadas
- 🔄 Backup automático e redundância

**6. Independência**
- 🎯 Seu produto, sua marca
- 🔧 Controle sobre features
- 📊 Dados dos clientes são seus
- 💡 Inovação sem limites

---

## 💰 Custo Total de Operação

### MVP (Primeiros 3 Meses)
```
Backend (Railway/Render):      $0-10/mês
Frontend (Vercel):             $0/mês
MongoDB Atlas:                 $0/mês (free tier)
Email (Resend):                $0/mês (3k/mês)
CDN (Cloudflare R2):           ~$1/mês
Domínio:                       ~$1/mês
Monitoramento (Sentry):        $0/mês (free)

Total MVP: R$ 0-60/mês ✅
```

### Produção (Após MVP)
```
Backend:                       ~R$ 100/mês
MongoDB Atlas M10:             ~R$ 300/mês
Email (Resend Pro):            ~R$ 100/mês
CDN + Serviços:                ~R$ 50/mês
WhatsApp (opcional):           ~R$ 50/mês
Monitoramento:                 ~R$ 150/mês

Total Fixo: ~R$ 750/mês

Gateway (variável):
└── Mercado Pago 4% sobre vendas
    └── Ex: R$ 25k vendas = R$ 1k taxa

Total por Evento:
└── Fixo (R$ 60) + Gateway (R$ 1k)
└── ~R$ 1.060 vs R$ 6.250 da Ingresse
└── ECONOMIA: R$ 5.190 por evento! 💰
```

---

## 🚫 O Que NÃO Fazer no MVP

**⚠️ Importante para manter o foco e entregar rápido!**

### ❌ Features Complexas (deixar para depois)
- Sistema de revenda/transferência de ingressos
- Lista de espera (waitlist)
- Aprovação manual de ingressos
- App mobile nativo (usar PWA no MVP)
- Mesas/setores reservados
- Sistema de afiliados/promoters
- Analytics avançado (heatmaps, funis)

### ❌ Infraestrutura Complexa (KISS - Keep It Simple)
- Docker/Kubernetes (usar Railway/Render direto)
- Redis (usar cache em memória no MVP)
- Microserviços (monolito é suficiente)
- Load balancer (um servidor basta)
- Multi-region (Brasil é suficiente)
- CI/CD complexo (GitHub Actions simples depois)

### ❌ Otimizações Prematuras
- GraphQL (REST é suficiente e mais simples)
- WebSockets (polling resolve)
- Server-Side Rendering de tudo
- Lazy loading excessivo

### ✅ Foco do MVP
**Simplicidade e velocidade de entrega!**
- Sistema funcional de ponta a ponta
- Cliente compra, paga e recebe ingresso
- Validador lê QR Code e valida entrada
- Dashboard básico para gestão
- **Meta: Primeiro evento real em 8-10 semanas**

> 💡 **Regra de Ouro:** Se não é essencial para o primeiro evento funcionar, deixa pra depois!

---

## 🤝 Desenvolvimento

### Workflow de Trabalho
1. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
2. Desenvolva e teste localmente
3. Commit suas mudanças com mensagens descritivas
4. Push para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request para review

### Padrões de Código
- **TypeScript** em todo o projeto
- **ESLint** + **Prettier** configurados
- Testes para funcionalidades críticas (QR Code, pagamento)
- Commits seguem padrão [Conventional Commits](https://www.conventionalcommits.org/)

### Branches
- `main`: Produção (sempre estável)
- `develop`: Desenvolvimento (integração)
- `feature/*`: Features específicas
- `fix/*`: Correções de bugs

---

## 📄 Licença

Este é um projeto proprietário desenvolvido para eventos de pagode.

**© 2025 EventHub - Todos os direitos reservados.**

---
  
## 🔗 Links e Recursos

### Desenvolvimento
- **Backend API**: http://localhost:3001
- **Swagger (API Docs)**: http://localhost:3001/api-docs 📚
- **Frontend**: http://localhost:3000
- **Dashboard Admin**: http://localhost:3000/dashboard
- **QR Reader**: http://localhost:3000/leitor

### Documentação
- **PREMISSAS.md**: Documento principal do projeto (leitura obrigatória!)
- **ARCHITECTURE.md**: Detalhes técnicos de implementação
- **Swagger UI**: http://localhost:3001/api-docs - Teste todos os endpoints aqui!

### Serviços Externos
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Railway/Render**: Dashboard de deploy
- **Vercel**: Dashboard do frontend
- **Mercado Pago**: https://www.mercadopago.com.br/developers
- **Resend**: https://resend.com
- **Cloudinary**: https://cloudinary.com
- **Sentry**: https://sentry.io

---

## 📝 Princípios do Projeto

### 1. Simplicidade Primeiro
- MVP enxuto, evolução gradual
- Sem over-engineering
- Shipping > Perfeição

### 2. Cliente Sempre Consegue Ingresso
- Redundância em múltiplos canais (Email, WhatsApp, CDN)
- Sistema offline na Fase 2
- Zero dependência de servidor no dia do evento

### 3. Segurança Não É Negociável
- QR Code anti-fraude (HMAC SHA-256)
- Dados pessoais protegidos (LGPD)
- PCI-DSS compliance (nunca tocar em dados de cartão)

### 4. Custos Previsíveis
- Free tiers sempre que possível no MVP
- Escalabilidade gradual
- ROI em 3 meses

### 5. Independência Tecnológica
- Controle total do sistema
- Dados são nossos
- Evolução no nosso ritmo

---

## 🎓 Próximos Passos

### Setup Inicial
1. ✅ Ler **PREMISSAS.md** completamente (30-45 min)
2. ✅ Configurar ambiente de desenvolvimento
   - Node.js 18+ e npm
   - Git
   - VS Code (ou sua IDE favorita)
3. ✅ Criar contas nos serviços:
   - MongoDB Atlas (free tier)
   - Mercado Pago (conta de desenvolvedor)
   - Resend (free tier)
   - Cloudinary (free tier)
   - Railway ou Render (free tier)

### Desenvolvimento
4. ✅ Setup do repositório (backend + frontend)
5. ✅ Configurar Swagger para testar API
6. ✅ Começar Fase 1 - MVP (6-8 semanas)

### Testando a API
Depois de rodar o backend:
- Acesse http://localhost:3001/api-docs
- Teste o login e outros endpoints direto no navegador!
- Use o botão "Authorize" para adicionar o token JWT

---

**Desenvolvido com 🎵 para eventos de pagode | ROI em 3 meses | Economia de R$ 60k/ano**