# Premissas do Projeto - EventHub

> **Última atualização:** 21 de Outubro de 2025
> 
> Documento com todas as premissas, decisões e diretrizes do sistema de venda de ingressos para eventos de pagode.

---

## 🎯 Visão Geral

### O Que É
Sistema completo de venda de ingressos e controle de acesso para eventos de pagode, com validação por QR Code.

### Objetivo Principal
**Eliminar taxas da Ingresse** (~25% por venda) e ter controle total sobre vendas, dados de clientes e experiência do usuário.

### ROI Esperado
```
Com Ingresse:
├── Evento 500 pessoas × R$ 50 = R$ 25.000
├── Taxa Ingresse (25%) = R$ 6.250 por evento
└── 12 eventos/ano = R$ 75.000 em taxas 💸

Com Sistema Próprio:
├── Hospedagem: ~R$ 200/mês = R$ 2.400/ano
├── Gateway (4%): ~R$ 1.000 por evento = R$ 12.000/ano
├── Infraestrutura: ~R$ 175/ano
└── Total: ~R$ 14.600/ano

ECONOMIA: ~R$ 60.000/ano ✅
ROI: 3 meses
```

---

## 📊 Contexto de Negócio

### Perfil da Empresa
- **Ramo:** Eventos de pagode
- **Frequência:** 12 eventos por ano
- **Porte:** 500 a 1500 pessoas por evento
- **Local típico:** Estacionamento do Canindé (São Paulo)
- **Equipe tech:** Em formação

### Problema Atual
- ✅ Já vende pela Ingresse
- ❌ Taxas muito altas (20-30%)
- ❌ Sem controle sobre dados dos clientes
- ❌ Sem flexibilidade para customizar experiência
- ❌ Dependência de plataforma terceira

### Solução Proposta
Sistema próprio de ponta a ponta:
- Portal de venda de ingressos
- Pagamento via Mercado Pago (Pix, cartão, boleto)
- QR Code seguro e único por ingresso
- App de validação para leitores
- Dashboard administrativo completo

---

## 🎨 Premissas de Produto

### Fluxo do Cliente (Comprador)
1. Acessa site público
2. Vê evento com fotos, descrição, local, data
3. Escolhe tipo de ingresso (Pista, VIP, Meia)
4. Preenche dados (nome, CPF, email, telefone)
5. Paga via Mercado Pago (Pix/Cartão/Boleto)
6. **Recebe ingresso IMEDIATAMENTE:**
   - PDF por email
   - Link para CDN
   - WhatsApp (opcional)
7. Apresenta QR Code na entrada

### Fluxo do Validador (Portão)
1. Acessa app de leitura (PWA)
2. Escaneia QR Code do cliente
3. Sistema valida:
   - Hash do QR Code (anti-fraude)
   - Se já foi usado
   - Se é do evento correto
4. Mostra resultado:
   - ✅ Verde: "Entrada liberada! Nome - Tipo"
   - ❌ Vermelho: "Já usado às 20:30"
   - ⚠️ Amarelo: "QR Code inválido"

### Fluxo Administrativo
1. Master cria evento (título, descrição, foto, local, data)
2. Configura tipos de ingresso (nome, preço, quantidade)
3. Define limites (máx. por CPF, período de venda)
4. Publica evento
5. Acompanha vendas em tempo real
6. Fecha vendas 2h antes do evento
7. Acompanha entradas durante evento
8. Analisa relatórios pós-evento

---

## 🏗️ Premissas Técnicas

### Stack Escolhida

**Backend:**
```
Node.js + TypeScript + Express
MongoDB Atlas (free tier → pago depois)
JWT para autenticação
Mercado Pago SDK para pagamentos
Resend para emails
Cloudinary para uploads
Deploy: Railway ou Render
```

**Frontend:**
```
Next.js 14 (App Router)
TypeScript
Tailwind CSS + Shadcn/ui
React Hook Form + Zod (validação)
Deploy: Vercel
```

**Infraestrutura:**
```
CDN: Cloudflare R2 ou S3 + CloudFront
Email: Resend (free tier: 3k/mês)
WhatsApp: Twilio (opcional)
Monitoramento: Sentry (free tier)
```

### Por Que Essas Tecnologias?

**MongoDB (NoSQL) vs PostgreSQL (SQL):**
- ✅ Mais flexível para evolução do schema
- ✅ Equipe mais familiarizada com JavaScript/JSON
- ✅ Atlas tem free tier generoso
- ✅ Performance adequada para o volume

**Next.js vs React puro:**
- ✅ SEO otimizado (importante para eventos públicos)
- ✅ Server-Side Rendering
- ✅ API Routes (pode substituir backend se precisar)
- ✅ Deploy fácil na Vercel

**Railway/Render vs AWS:**
- ✅ Mais simples de configurar
- ✅ Deploy automático via Git
- ✅ Preço previsível
- ✅ Sem surpresas na conta
- ❌ AWS: complexo demais para começar

**Mercado Pago vs Stripe:**
- ✅ Melhor para Brasil (Pix nativo)
- ✅ Documentação em português
- ✅ Suporte local
- ✅ Taxa competitiva (~4%)
- ❌ Stripe: precisa empresa no exterior

---

## 🔐 Premissas de Segurança

> **Princípio:** Segurança em camadas (Defense in Depth)

### 1. Senhas e Autenticação

#### Requisitos de Senha
```typescript
Regras obrigatórias:
├── Mínimo: 8 caracteres
├── Máximo: 128 caracteres (não limitar a 12!)
├── Deve conter:
│   ├── Pelo menos 1 letra maiúscula
│   ├── Pelo menos 1 letra minúscula
│   ├── Pelo menos 1 número
│   └── Pelo menos 1 caractere especial (!@#$%^&*)
│
└── Senhas PROIBIDAS:
    ├── Senhas comuns (top 10k rockyou.txt)
    ├── Email do usuário
    ├── Nome do site (eventhub, pagode, etc)
    └── Sequências (123456, abcdef, qwerty)

Armazenamento:
├── Bcrypt com 12 rounds (custo adequado)
├── Salt automático (bcrypt já faz)
└── NUNCA armazenar em plain text
```

**Por que NÃO limitar a 12 caracteres?**
- ❌ Limitar senha é má prática (OWASP)
- ✅ Geradores de senha fazem senhas longas (30-50 chars)
- ✅ Passphrases são mais seguras e fáceis de lembrar
- ✅ Bcrypt aceita até 72 bytes sem problema

#### Login e Rate Limiting
```typescript
Proteções no Login:
├── Rate limiting por IP:
│   └── Máx 5 tentativas / 15 minutos
│
├── Rate limiting por email:
│   └── Máx 3 tentativas / 15 minutos
│   └── Após 3 falhas: Captcha obrigatório
│   └── Após 5 falhas: Bloqueia por 1 hora
│
├── Rate limiting global:
│   └── Máx 100 tentativas / 15 min (proteção DDoS)
│
├── Resposta padronizada:
│   └── "Email ou senha incorretos" (não dizer qual)
│   └── Mesmo tempo de resposta (evitar timing attack)
│
└── Logs de tentativas:
    ├── IP, timestamp, user-agent
    ├── Alertar após 10 falhas no mesmo IP
    └── Alertar após 3 IPs diferentes no mesmo email
```

#### Redefinição de Senha (Password Reset)
```typescript
Fluxo SEGURO (não revela se email existe):

1. Cliente solicita reset (POST /forgot-password)
   └── Sempre retorna: "Se o email existir, enviaremos instruções"
   └── NUNCA retorna: "Email não encontrado" ❌

2. Backend:
   ├── Busca email no banco
   │   ├── Se EXISTE: Envia email com token
   │   └── Se NÃO EXISTE: Não faz nada (silêncio)
   │
   ├── Token de reset:
   │   ├── Criptograficamente seguro (crypto.randomBytes)
   │   ├── Hash SHA-256 armazenado no banco
   │   ├── Expira em 1 hora
   │   └── Uso único (deletado após uso)
   │
   └── Email contém:
       ├── Link: /reset-password?token=XXXXX
       ├── Validade: 1 hora
       └── Aviso: "Não solicitou? Ignore este email"

3. Cliente clica no link:
   └── Backend valida token (hash match + não expirado)
   └── Se válido: Permite nova senha
   └── Se inválido/expirado: "Link inválido ou expirado"

4. Nova senha definida:
   ├── Valida requisitos de senha
   ├── Bcrypt hash
   ├── Deleta token de reset
   ├── Invalida todas sessões antigas (logout forçado)
   └── Envia email: "Sua senha foi alterada"

Proteções extras:
├── Rate limiting: Máx 3 solicitações / hora por IP
├── Rate limiting: Máx 2 solicitações / hora por email
├── Log de todas solicitações
└── Alerta se mesmo IP tenta múltiplos emails
```

#### Bloqueio de Conta
```typescript
Cenários de bloqueio automático:

1. Múltiplas tentativas de login:
   ├── 5 falhas = Bloqueio 15 min
   ├── 10 falhas = Bloqueio 1 hora
   ├── 20 falhas = Bloqueio 24 horas
   └── >20 falhas = Bloqueio permanente (análise manual)

2. Atividade suspeita:
   ├── Login de país diferente (alerta email)
   ├── Múltiplos IPs simultâneos
   └── User-agent incomum (bot)

3. Desbloqueio:
   ├── Automático após tempo
   ├── Via email (link de confirmação)
   └── Manual (suporte)
```

### 2. Proteção Contra Ataques

#### Rate Limiting (Express Rate Limit)
```typescript
// Níveis de proteção

Global (tudo):
├── 1000 requests / 15 min por IP
└── Protege contra DDoS básico

Auth endpoints (/login, /register):
├── 5 requests / 15 min por IP
├── 3 requests / 15 min por email
└── Header: "Retry-After: 900" (segundos)

Password reset:
├── 3 requests / hora por IP
├── 2 requests / hora por email
└── Proteção contra enumeração

Checkout (/orders):
├── 10 requests / 5 min por usuário
└── Proteção contra compras fraudulentas

API pública (/events):
├── 100 requests / 15 min por IP
└── Permite navegação normal

Validação de QR Code:
├── 60 requests / min por tablet
└── ~1 validação/seg (suficiente)
```

#### CAPTCHA (hCaptcha ou reCAPTCHA)
```typescript
Quando usar:

Obrigatório:
├── Após 3 tentativas de login falhas
├── Após 2 solicitações de reset de senha
├── Registro de nova conta (sempre)
└── Checkout (antes de pagar)

Não usar:
├── Login inicial (boa UX)
├── Endpoints internos (admin)
└── APIs autenticadas
```

#### Proteção Contra Bots
```typescript
Técnicas:

1. Honeypot (campo invisível):
   └── Campo escondido via CSS
   └── Se preenchido = bot
   └── Rejeita silenciosamente

2. Tempo de preenchimento:
   └── Formulário preenchido em <2 seg = suspeito
   └── Timestamp hidden field

3. User-Agent validation:
   └── Bloqueia user-agents conhecidos de bots
   └── Curl, wget, python-requests, etc

4. Fingerprinting (opcional):
   └── Canvas fingerprint
   └── Detecta automação
```

#### SQL/NoSQL Injection Prevention
```typescript
Mongoose (MongoDB):
├── ✅ Usa parameterized queries por padrão
├── ✅ Sanitiza inputs automaticamente
└── ⚠️ Cuidado com: $where, $regex sem escape

Regras:
├── NUNCA construir queries com string concat
├── SEMPRE usar Mongoose methods (find, findOne)
├── Validar e sanitizar input com Zod/Joi
└── Escapar regex: email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
```

#### XSS (Cross-Site Scripting) Prevention
```typescript
Proteções:

1. Frontend (React/Next.js):
   ├── ✅ React escapa por padrão
   ├── ❌ Evitar dangerouslySetInnerHTML
   └── ❌ Nunca usar eval()

2. Backend:
   ├── Sanitizar HTML com DOMPurify
   ├── Headers: Content-Security-Policy
   └── Headers: X-Content-Type-Options: nosniff

3. Cookies:
   ├── HttpOnly: true (não acessível via JS)
   ├── Secure: true (só HTTPS)
   ├── SameSite: 'strict' (CSRF protection)
   └── Expiração curta (7 dias)
```

#### CSRF (Cross-Site Request Forgery) Prevention
```typescript
Estratégias:

1. SameSite Cookies:
   └── SameSite: 'strict' (melhor proteção)

2. CSRF Tokens (csurf):
   └── Token único por sessão
   └── Validado em POST/PUT/DELETE

3. Double Submit Cookie:
   └── Token no cookie + header
   └── Backend compara ambos

4. Origin/Referer check:
   └── Valida Origin header
   └── Rejeita requests externos
```

### 3. Pagamentos e Dados Sensíveis

#### PCI-DSS Compliance
```typescript
REGRA DE OURO:
❌ NUNCA armazenar dados de cartão
❌ NUNCA tocar em CVV
❌ NUNCA guardar número completo

Correto (Mercado Pago):
├── Frontend coleta dados do cartão
├── Envia DIRETO para Mercado Pago (JS SDK)
├── Recebe token de pagamento
├── Envia token para seu backend
└── Backend processa com token

Seu backend NUNCA vê:
├── Número do cartão
├── CVV
├── Data de validade
└── Apenas: token + dados do pedido

O que PODE armazenar:
├── ✅ Nome do comprador
├── ✅ CPF
├── ✅ Email
├── ✅ Telefone
├── ✅ Últimos 4 dígitos (Mercado Pago retorna)
├── ✅ Bandeira (Visa, Master)
├── ✅ Status do pagamento
└── ✅ ID da transação no Mercado Pago
```

#### Dados Pessoais (LGPD)
```typescript
Obrigações:

1. Criptografia em trânsito:
   └── HTTPS obrigatório (TLS 1.2+)

2. Criptografia em repouso (dados sensíveis):
   ├── CPF: Criptografado (AES-256)
   ├── Telefone: Criptografado
   └── Email: Plain text (precisa buscar)

3. Logs:
   ├── NÃO logar: senhas, tokens, cartões
   ├── Logar: IPs, ações, timestamps
   └── Retenção: 90 dias

4. Direitos do usuário:
   ├── Ver dados: GET /me
   ├── Corrigir dados: PUT /me
   ├── Deletar conta: DELETE /me (soft delete)
   └── Exportar dados: GET /me/export (JSON)

5. Consentimento:
   ├── Checkbox "Aceito termos" no cadastro
   ├── Checkbox "Aceito receber emails"
   └── Pode revogar a qualquer momento
```

### 4. QR Code Security

#### Geração Segura
```typescript
Payload do QR Code:
{
  tid: "ticket_id",           // ID do ingresso
  eid: "event_id",            // ID do evento
  ts: 1698000000000,          // Timestamp geração
  nonce: "a1b2c3d4e5f6",     // Random único
  sig: "hmac_sha256_hash"     // Assinatura HMAC
}

Processo:
├── 1. Gera payload (tid, eid, ts, nonce)
├── 2. Calcula HMAC-SHA256 do payload
├── 3. Adiciona signature ao payload
├── 4. Codifica em Base64URL
└── 5. Gera QR Code da string

Segurança:
├── ✅ Assinatura verifica autenticidade
├── ✅ Nonce previne replay attack
├── ✅ Timestamp pode validar expiração
├── ✅ Sem secret key, impossível falsificar
└── ✅ Mesmo QR só funciona 1 vez
```

#### Validação Segura
```typescript
Backend valida:

1. Decodifica Base64URL
2. Extrai signature do payload
3. Recalcula HMAC-SHA256
4. Compara signatures (timing-safe)
   └── Se diferente: REJEITA ❌

5. Verifica timestamp (opcional):
   └── Se >24h: REJEITA ❌

6. Busca ticket no banco:
   └── Se não existe: REJEITA ❌

7. Verifica se já foi usado:
   └── Se validation.isValidated = true: REJEITA ❌

8. Verifica evento:
   └── Se eventId não bate: REJEITA ❌

9. ✅ VÁLIDO:
   ├── Marca ticket como usado
   ├── Registra timestamp
   ├── Registra validador
   └── Log da ação
```

### 5. Proteções de Infraestrutura

#### Headers de Segurança (Helmet.js)
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.eventhub.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.mercadopago.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true
}));
```

#### CORS Configurado
```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL, // https://eventhub.com
  credentials: true, // Permite cookies
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

#### Secrets e Environment Variables
```typescript
NUNCA commitar:
├── .env (adicionar no .gitignore)
├── Chaves API
├── Secrets de JWT
├── Senhas de banco
└── Tokens de serviços

Usar:
├── .env.example (template sem valores)
├── Railway/Render variables (produção)
└── Secrets diferentes dev/staging/prod

Rotação de secrets:
├── JWT secret: Trocar a cada 90 dias
├── QR secret: Trocar a cada 6 meses
└── API keys: Trocar se comprometidas
```

### 6. Monitoramento e Alertas

#### Logs de Segurança
```typescript
Logar SEMPRE:
├── Login (sucesso e falha)
├── Logout
├── Criação de conta
├── Mudança de senha
├── Reset de senha (solicitação e conclusão)
├── Tentativas bloqueadas (rate limit)
├── Validação de QR Code (sucesso e falha)
├── Criação de pedido
├── Webhook recebido (Mercado Pago)
└── Erros 500 (com stack trace)

NÃO logar:
├── ❌ Senhas (nem hashs)
├── ❌ Tokens JWT completos
├── ❌ Dados de cartão
└── ❌ PII desnecessário

Formato do log:
{
  timestamp: "2024-10-21T10:30:00Z",
  level: "warn",
  event: "login_failed",
  ip: "192.168.1.100",
  email: "user@example.com",
  reason: "invalid_password",
  userAgent: "Mozilla/5.0..."
}
```

#### Alertas Automáticos
```typescript
Alertar OPS quando:
├── >10 falhas de login no mesmo IP (5 min)
├── >5 solicitações de reset para emails diferentes (mesmo IP)
├── >3 pedidos com mesmo CPF (suspeita fraude)
├── Webhook do Mercado Pago falha 3x seguidas
├── Taxa de erro >5% em qualquer endpoint
├── Uso de CPU/memória >80%
└── Banco de dados inacessível

Canal de alertas:
├── Discord webhook (notificação imediata)
├── Email (alertas críticos)
└── Sentry (erros de código)
```

#### Análise de Segurança
```typescript
Ferramentas:

1. Sentry (erros em produção):
   └── Free tier: 5k eventos/mês

2. OWASP ZAP (scan de vulnerabilidades):
   └── Rodar antes de cada deploy

3. npm audit (vulnerabilidades em deps):
   └── Rodar semanalmente
   └── Fix automático quando possível

4. Snyk (monitoramento contínuo):
   └── Integra com GitHub
   └── Alerta vulnerabilidades em deps

5. Lighthouse (Chrome DevTools):
   └── Auditoria de segurança frontend
```

### 7. Checklist de Segurança

#### Antes do MVP
```typescript
Backend:
├── [ ] Senhas com bcrypt (12 rounds)
├── [ ] Validação de senha forte (min 8 chars)
├── [ ] Rate limiting em auth endpoints
├── [ ] CORS configurado corretamente
├── [ ] Helmet.js instalado
├── [ ] HTTPS forçado em produção
├── [ ] Environment variables seguras
├── [ ] .env no .gitignore
├── [ ] Logs de ações sensíveis
└── [ ] QR Code com HMAC SHA-256

Frontend:
├── [ ] Não armazena dados de cartão
├── [ ] Mercado Pago SDK para pagamentos
├── [ ] Tokens em HttpOnly cookies
├── [ ] Input sanitization (Zod)
├── [ ] CAPTCHA no registro
└── [ ] HTTPS em produção

Infraestrutura:
├── [ ] MongoDB com autenticação
├── [ ] Usuário do banco com permissões mínimas
├── [ ] Backup automático habilitado
├── [ ] Sentry configurado
└── [ ] Monitoramento de uptime
```

#### Antes de Produção
```typescript
Testes:
├── [ ] Tentar login com senha errada (>5x)
├── [ ] Tentar SQL injection em forms
├── [ ] Tentar XSS em campos de texto
├── [ ] Validar rate limiting funcionando
├── [ ] Testar reset de senha completo
├── [ ] Tentar usar QR Code 2x
├── [ ] Validar HTTPS forçado
└── [ ] Rodar OWASP ZAP scan

Revisão:
├── [ ] Nenhum secret commitado
├── [ ] npm audit sem vulnerabilidades HIGH
├── [ ] Documentação de segurança
└── [ ] Plano de resposta a incidentes
```

#### Manutenção Contínua
```typescript
Semanal:
├── [ ] Revisar logs de segurança
├── [ ] Verificar alertas de rate limit
└── [ ] Checar erros no Sentry

Mensal:
├── [ ] npm audit e atualizar deps
├── [ ] Revisar usuários bloqueados
├── [ ] Analisar tentativas de fraude
└── [ ] Backup restore test

Trimestral:
├── [ ] Rotacionar JWT secret
├── [ ] Penetration test básico
├── [ ] Revisar permissões de usuários
└── [ ] Atualizar documentação
```

---

## 🎓 Referências de Segurança

### Standards e Guidelines
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **NIST Password Guidelines:** https://pages.nist.gov/800-63-3/
- **PCI-DSS:** https://www.pcisecuritystandards.org/
- **LGPD:** https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd

### Ferramentas Recomendadas
- **Helmet.js:** Headers de segurança
- **express-rate-limit:** Rate limiting
- **bcrypt:** Hash de senhas
- **jsonwebtoken:** JWT tokens
- **Zod/Joi:** Validação de input
- **DOMPurify:** Sanitização HTML
- **hCaptcha/reCAPTCHA:** Proteção contra bots

---

**Princípio final:** Segurança é processo contínuo, não produto final. Revisar e atualizar constantemente.

---

## 📊 Observabilidade e Monitoramento

> **"Se não consegue medir, não consegue melhorar"**
>
> Dashboard de sustentação para bugs, performance e saúde do sistema.

### Problema: Datadog é Caro

```
Datadog Pricing:
├── Infrastructure: $15/host/mês
├── APM: $31/host/mês
├── Logs: $0.10/GB ingerido
├── RUM: $15/10k sessões
└── Para 1 backend + 1000 eventos/dia = ~$100-200/mês 💸

Muito caro para MVP!
```

### Solução: Stack de Observabilidade Acessível

```
Stack Recomendada (MVP):
├── Sentry (erros/bugs): FREE até 5k eventos/mês
├── Better Stack (logs): FREE até 1GB/mês
├── Grafana Cloud (métricas): FREE até 10k séries
├── UptimeRobot (uptime): FREE até 50 monitores
└── Railway/Render Logs: Built-in FREE

Total MVP: $0/mês ✅

Stack Produção:
├── Sentry Pro: $26/mês (50k eventos)
├── Better Stack: $29/mês (10GB)
├── Grafana Cloud: $49/mês (upgrade se precisar)
└── PagerDuty: $21/mês (alertas)

Total Produção: ~$125/mês
Vs Datadog: ~$200+/mês
```

---

### 1. Rastreamento de Erros (Sentry)

#### O Que É
```
Sentry = Datadog para erros
├── Captura exceptions automática
├── Stack trace completo
├── Breadcrumbs (o que levou ao erro)
├── Release tracking
├── Performance monitoring
└── Dashboard de erros em tempo real
```

#### Setup (5 minutos)
```typescript
// backend/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_COMMIT_SHA, // Tracking de versão
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,
  
  // Integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Mongo(),
    new ProfilingIntegration(),
  ],
  
  // Não enviar dados sensíveis
  beforeSend(event, hint) {
    // Remove senhas, tokens, etc
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
});

// Middleware Express
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... suas rotas ...

// Error handler (sempre por último)
app.use(Sentry.Handlers.errorHandler());
```

#### Dashboard Automático
```
Sentry Dashboard mostra:
├── Erros por endpoint
├── Taxa de erro (%)
├── Erros novos vs recorrentes
├── Afetados (quantos usuários)
├── Stack trace + variáveis locais
├── Breadcrumbs (sequência de eventos)
└── Releases (qual versão tem mais erros)

Exemplo de alerta:
"🚨 Novo erro em /api/orders/checkout
 Afetando 15 usuários nos últimos 10 min
 TypeError: Cannot read property 'price' of undefined
 at OrderController.createOrder (line 234)"
```

---

### 2. Logs Centralizados (Better Stack / Logtail)

#### O Que É
```
Better Stack = Datadog Logs (mais barato)
├── Logs centralizados (todos servidores)
├── Busca rápida (Lucene query)
├── Alertas customizados
├── Retenção configurável
└── Live Tail (tail -f na nuvem)
```

#### Setup com Winston + Better Stack
```typescript
// backend/src/config/logger.ts
import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const logtail = new Logtail(process.env.LOGTAIL_TOKEN!);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'eventhub-api',
    environment: process.env.NODE_ENV,
    version: process.env.GIT_COMMIT_SHA,
  },
  transports: [
    // Console (desenvolvimento)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // Better Stack (produção)
    new LogtailTransport(logtail),
    
    // Arquivo local (backup)
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

// Helper para log estruturado
export function logAction(action: string, metadata: any) {
  logger.info(action, {
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}
```

#### Como Usar
```typescript
// Em qualquer lugar do código
import { logger, logAction } from '@/config/logger';

// Login
logAction('user_login', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

// Compra
logAction('order_created', {
  orderId: order.id,
  userId: user.id,
  total: order.total,
  items: order.items.length,
  paymentMethod: order.payment.method,
});

// Erro
logger.error('Payment webhook failed', {
  error: error.message,
  stack: error.stack,
  webhookId: webhook.id,
  mercadoPagoId: payment.id,
});

// Warning
logger.warn('High rate limit triggered', {
  ip: req.ip,
  endpoint: req.path,
  attempts: 5,
});
```

#### Queries no Better Stack
```
Exemplos de busca:

1. Todos erros do último dia:
   level:error timestamp:>now-24h

2. Falhas de pagamento:
   action:payment_webhook_failed timestamp:>now-1h

3. Logins suspeitos (>5 falhas):
   action:login_failed ip:"192.168.1.1" count:>5

4. Performance lenta (>2s):
   duration:>2000 endpoint:"/api/orders"

5. Erros de um usuário específico:
   userId:"user_123" level:error
```

---

### 3. Métricas e Dashboards (Grafana Cloud)

#### O Que É
```
Grafana Cloud = Visualização de métricas
├── CPU, Memória, Disco
├── Requests/segundo
├── Latência (p50, p95, p99)
├── Taxa de erro
├── Métricas customizadas
└── Alertas visuais
```

#### Setup com Prometheus + Grafana
```typescript
// backend/src/config/metrics.ts
import client from 'prom-client';

// Cria registro
const register = new client.Registry();

// Métricas padrão (CPU, memória, etc)
client.collectDefaultMetrics({ register });

// Métricas customizadas
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const ordersTotal = new client.Counter({
  name: 'orders_total',
  help: 'Total orders created',
  labelNames: ['payment_method', 'status'],
});

export const ticketsValidated = new client.Counter({
  name: 'tickets_validated_total',
  help: 'Total tickets validated',
  labelNames: ['event_id', 'validator'],
});

export const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(ordersTotal);
register.registerMetric(ticketsValidated);
register.registerMetric(activeUsers);

// Endpoint para Prometheus scraper
export function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}
```

#### Middleware de Métricas
```typescript
// backend/src/middleware/metrics.middleware.ts
import { httpRequestDuration, httpRequestTotal } from '@/config/metrics';

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });
  
  next();
}

// Usar em app.ts
app.use(metricsMiddleware);
```

#### Dashboard no Grafana
```
Painéis recomendados:

1. Overview:
   ├── Requests/segundo (gráfico tempo real)
   ├── Taxa de erro (gauge)
   ├── Latência média (gráfico linha)
   └── CPU e Memória (gráfico área)

2. Endpoints:
   ├── Top 10 endpoints mais lentos
   ├── Top 10 endpoints com mais erros
   └── Distribuição de latência (p50, p95, p99)

3. Negócio:
   ├── Vendas/hora (gráfico)
   ├── Tickets validados/minuto
   ├── Receita acumulada (counter)
   └── Usuários ativos (gauge)

4. Erros:
   ├── Taxa de erro por endpoint
   ├── Erros 500 vs 400
   └── Alertas ativos
```

---

### 4. Uptime Monitoring (UptimeRobot)

#### O Que É
```
UptimeRobot = Monitoring simples e eficaz
├── Ping a cada 5 min (free tier)
├── Alerta se site cair (email, SMS, Slack)
├── Status page público
├── 99.9% uptime SLA
└── Histórico de 60 dias
```

#### Setup (3 minutos)
```
1. Criar conta em uptimerobot.com

2. Adicionar monitores:
   ├── Backend API: https://api.eventhub.com/health
   ├── Frontend: https://eventhub.com
   ├── Admin: https://eventhub.com/admin
   └── Validador: https://eventhub.com/leitor

3. Configurar alertas:
   ├── Email: ops@eventhub.com
   ├── Discord: webhook URL
   └── SMS: +55 11 99999-9999 (emergência)

4. Status page:
   └── https://status.eventhub.com (público)
```

#### Health Check Endpoint
```typescript
// backend/src/routes/health.routes.ts
import mongoose from 'mongoose';

export async function healthCheck(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.GIT_COMMIT_SHA,
    checks: {
      database: 'checking',
      redis: 'checking',
    },
  };
  
  // Check MongoDB
  try {
    const dbState = mongoose.connection.readyState;
    health.checks.database = dbState === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }
  
  // Check Redis (se usar)
  try {
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
}

// Rota
app.get('/health', healthCheck);
```

---

### 5. APM (Application Performance Monitoring)

#### O Que É
```
APM = Rastreamento de performance
├── Tempo de cada query no banco
├── Tempo de chamadas externas (Mercado Pago)
├── Gargalos no código
├── N+1 queries
└── Memória leaks
```

#### Opções

**1. Sentry Performance (Recomendado para MVP)**
```typescript
// Já configurado no Sentry.init()
tracesSampleRate: 0.1 // 10% das requests

// Instrumentação automática para:
├── HTTP requests
├── MongoDB queries
├── Express routes
└── Chamadas externas (axios)

// Ver no Sentry Dashboard:
├── Transaction overview
├── Slow queries
├── External calls
└── Frontend + Backend correlation
```

**2. OpenTelemetry + Grafana Tempo (Avançado)**
```typescript
// Para quando escalar (Fase 3)
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  serviceName: 'eventhub-api',
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new MongoDBInstrumentation(),
  ],
});

sdk.start();
```

---

### 6. Alertas Inteligentes

#### Configuração de Alertas
```typescript
// Estratégia de alertas por severidade

CRÍTICO (PagerDuty + SMS + Discord):
├── API fora do ar (>5 min)
├── Banco de dados inacessível
├── Taxa de erro >10% (>100 erros/5min)
├── Webhook Mercado Pago falhando
└── Disco >90% cheio

ALTO (Discord + Email):
├── Taxa de erro >5%
├── Latência p95 >2s
├── Memória >80%
├── >20 falhas de login mesmo IP
└── Evento começou mas validação não funciona

MÉDIO (Email):
├── Taxa de erro >2%
├── Latência p95 >1s
├── CPU >70%
└── Backup falhou

BAIXO (Log):
├── Taxa de erro >1%
├── Rate limit atingido
└── Certificado SSL expira em 30 dias
```

#### Exemplo: Discord Webhook
```typescript
// backend/src/services/alert.service.ts
import axios from 'axios';

export async function sendDiscordAlert(severity: string, message: string, metadata?: any) {
  const colors = {
    critical: 15158332, // Vermelho
    high: 15105570,     // Laranja
    medium: 15844367,   // Amarelo
    low: 3447003,       // Azul
  };
  
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL!, {
      embeds: [{
        title: `🚨 ${severity.toUpperCase()} Alert`,
        description: message,
        color: colors[severity] || colors.medium,
        fields: metadata ? Object.entries(metadata).map(([key, value]) => ({
          name: key,
          value: String(value),
          inline: true,
        })) : [],
        timestamp: new Date().toISOString(),
      }],
    });
  } catch (error) {
    logger.error('Failed to send Discord alert', { error });
  }
}

// Usar
sendDiscordAlert('critical', 'API está fora do ar!', {
  endpoint: '/health',
  status: 503,
  duration: '5 minutos',
});
```

---

### 7. Dashboard de Sustentação

#### Telas Recomendadas

**1. Dashboard Principal (Grafana)**
```
┌────────────────────────────────────────────┐
│  EventHub - Operations Dashboard          │
├────────────────────────────────────────────┤
│                                            │
│  🟢 Status: Healthy                        │
│  ⏱️  Uptime: 99.95% (30 dias)              │
│  📊 Requests/seg: 15                       │
│  ⚡ Latência média: 145ms                  │
│                                            │
├────────────────────────────────────────────┤
│  Últimas 24 horas:                         │
│                                            │
│  ✅ Vendas: 234 ingressos                  │
│  💰 Receita: R$ 11.700                     │
│  🎫 Validações: 1.450 tickets              │
│  ❌ Erros: 3 (0.02%)                       │
│                                            │
├────────────────────────────────────────────┤
│  [Gráfico Requests/tempo]                 │
│  [Gráfico Latência]                       │
│  [Gráfico Taxa de Erro]                   │
│  [Gráfico CPU/Memória]                    │
│                                            │
└────────────────────────────────────────────┘
```

**2. Sentry - Erros em Produção**
```
Filtros rápidos:
├── Novos erros (hoje)
├── Erros recorrentes
├── Afetando >10 usuários
├── Por endpoint
└── Por release

Para cada erro:
├── Stack trace completo
├── Variáveis locais
├── Breadcrumbs (últimas 10 ações)
├── User context (id, email, IP)
├── Release/commit
└── Link para GitHub (se integrado)
```

**3. Better Stack - Busca de Logs**
```
Queries salvas:
├── "Falhas de login (1h)"
├── "Pedidos criados (hoje)"
├── "Webhooks falhando"
├── "Erros 500"
└── "Performance >2s"

Live Tail:
└── Logs em tempo real (tail -f na nuvem)
```

**4. UptimeRobot - Status**
```
Status Page:
├── API: 🟢 Online (99.95%)
├── Frontend: 🟢 Online (99.99%)
├── Admin: 🟢 Online (99.98%)
└── Validador: 🟢 Online (99.97%)

Histórico:
└── Últimos 30 dias: 99.95% uptime
```

---

### 8. Comparação de Ferramentas

#### Opções de Observabilidade

| Ferramenta | Caso de Uso | Free Tier | Preço Pago | Recomendação |
|------------|-------------|-----------|------------|--------------|
| **Sentry** | Erros/APM | 5k eventos/mês | $26/mês (50k) | ⭐⭐⭐⭐⭐ MVP |
| **Better Stack** | Logs | 1GB/mês | $29/mês (10GB) | ⭐⭐⭐⭐⭐ MVP |
| **Grafana Cloud** | Métricas/Dashboards | 10k séries | $49/mês | ⭐⭐⭐⭐ MVP |
| **UptimeRobot** | Uptime | 50 monitores | $7/mês (ilimitado) | ⭐⭐⭐⭐⭐ MVP |
| **Railway Logs** | Logs básicos | Incluído | - | ⭐⭐⭐ MVP |
| **Datadog** | Tudo-em-um | Trial 14 dias | $100-200+/mês | ⭐⭐ Fase 3 |
| **New Relic** | APM completo | 100GB/mês | $99+/mês | ⭐⭐⭐ Fase 2 |
| **LogRocket** | Session replay | 1k sessões | $99/mês | ⭐⭐ Frontend |
| **PagerDuty** | Alertas/On-call | Trial 14 dias | $21/mês | ⭐⭐⭐ Produção |

#### Stack Recomendada por Fase

```typescript
MVP (Mês 1-3):
├── Sentry (free): Erros
├── Better Stack (free): Logs
├── Railway Logs: Backup
├── UptimeRobot (free): Uptime
└── Discord: Alertas
CUSTO: $0/mês ✅

Produção (Mês 4-12):
├── Sentry Pro: $26/mês
├── Better Stack: $29/mês
├── Grafana Cloud: $0 ou $49/mês
├── PagerDuty: $21/mês
└── UptimeRobot: $7/mês
CUSTO: ~$83-132/mês ✅

Escala (Ano 2+):
├── Considerar Datadog all-in-one
├── Ou continuar com stack atual
└── Se >10k eventos/dia: Avaliar custo-benefício
```

---

### 9. Setup Rápido (30 minutos)

#### Checklist de Implementação

```typescript
Backend:

[x] 1. Instalar dependências
npm install @sentry/node @logtail/node @logtail/winston prom-client

[x] 2. Configurar Sentry
- Criar conta em sentry.io
- Criar projeto Node.js
- Copiar DSN
- Adicionar em .env: SENTRY_DSN=xxx
- Configurar em src/config/sentry.ts

[x] 3. Configurar Better Stack
- Criar conta em betterstack.com
- Criar source (Node.js)
- Copiar token
- Adicionar em .env: LOGTAIL_TOKEN=xxx
- Configurar Winston logger

[x] 4. Configurar Métricas
- Adicionar src/config/metrics.ts
- Adicionar middleware de métricas
- Expor endpoint /metrics
- Configurar Grafana Cloud para scraping

[x] 5. Health Check
- Criar endpoint /health
- Adicionar checks de MongoDB, Redis
- Configurar UptimeRobot

[x] 6. Alertas Discord
- Criar webhook no Discord
- Adicionar em .env: DISCORD_WEBHOOK_URL=xxx
- Implementar alert.service.ts

Frontend:

[x] 1. Sentry Browser
npm install @sentry/nextjs

[x] 2. Configurar
- Adicionar sentry.client.config.ts
- Adicionar sentry.server.config.ts
- Rastreamento de erros React
- Session replay (opcional)
```

---

### 10. Exemplo: Dashboards Prontos

#### Grafana Dashboard JSON
```json
{
  "dashboard": {
    "title": "EventHub - Operations",
    "panels": [
      {
        "title": "Requests/segundo",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Latência (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, http_request_duration_ms)"
        }]
      },
      {
        "title": "Taxa de Erro",
        "targets": [{
          "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Vendas/hora",
        "targets": [{
          "expr": "rate(orders_total[1h])"
        }]
      }
    ]
  }
}
```

---

### 11. Custo Total de Observabilidade

```
MVP (Free Tier):
├── Sentry: $0 (5k eventos)
├── Better Stack: $0 (1GB logs)
├── Grafana Cloud: $0 (10k séries)
├── UptimeRobot: $0 (50 monitores)
└── Discord: $0
TOTAL: $0/mês 🎉

Produção (Após 3 eventos):
├── Sentry Pro: $26/mês
├── Better Stack: $29/mês
├── Grafana Cloud: $49/mês
├── UptimeRobot: $7/mês
└── PagerDuty: $21/mês
TOTAL: $132/mês

Vs. Datadog:
├── Datadog Full Stack: $200-400/mês
└── Economia: $68-268/mês ✅
```

---

### 12. Checklist de Monitoramento

```typescript
Antes do MVP:
├── [ ] Sentry configurado (backend + frontend)
├── [ ] Logger estruturado (Winston)
├── [ ] Health check endpoint
├── [ ] UptimeRobot monitorando
└── [ ] Discord webhook para alertas

Antes de Produção:
├── [ ] Better Stack ingerindo logs
├── [ ] Grafana dashboard básico
├── [ ] Métricas de negócio (vendas, validações)
├── [ ] Alertas configurados (crítico, alto, médio)
└── [ ] Runbook de incidentes documentado

Pós-Produção:
├── [ ] Revisar erros diariamente (Sentry)
├── [ ] Analisar performance semanalmente
├── [ ] Ajustar alertas (reduzir ruído)
└── [ ] Dashboards para stakeholders
```

---

## 🎯 Resumo

**Para ter um "Datadog de pobre" completo:**

```
Stack MVP (FREE):
├── 🐛 Sentry → Bugs e erros
├── 📝 Better Stack → Logs centralizados
├── 📊 Grafana Cloud → Dashboards
├── ⏰ UptimeRobot → Monitoramento uptime
└── 💬 Discord → Alertas

Features:
✅ Rastreamento de erros com stack trace
✅ Logs centralizados com busca
✅ Métricas customizadas
✅ Dashboards visuais
✅ Alertas em tempo real
✅ APM básico (performance)
✅ Uptime monitoring
✅ TUDO GRÁTIS para começar!

Quando precisar de Datadog?
└── Quando tiver >$10k MRR e precisar de:
    ├── Correlação automática entre tudo
    ├── Machine learning em anomalias
    ├── Suporte enterprise
    └── Compliance/Auditoria complexa
```

**Agora você tem observabilidade enterprise por $0!** 🚀

---

## 📦 Premissas de Disponibilidade

### Cenário Crítico
**"E se o servidor cair no dia do evento?"**

### Solução Multi-Camada

**Para Clientes Acessarem Ingresso:**
```
1. Email com PDF anexo (enviado na hora da compra)
   └── Cliente guarda no inbox = backup permanente

2. CDN com página estática
   └── https://cdn.eventhub.com/tickets/ORDER_ID
   └── 99.99% uptime (não depende do backend)

3. WhatsApp com link direto (opcional)
   └── QR Code como imagem

4. PWA com cache offline
   └── Se já acessou, fica salvo no navegador

5. SMS com link (backup extremo)
```

**Para Validadores Lerem QR Code:**
```
1. Sistema offline completo (Fase 2)
   ├── Cache local de todos os 1500 tickets
   ├── Validação sem internet
   ├── Sincronização P2P entre 5 tablets
   └── Sincroniza com backend depois

2. Modo híbrido (MVP)
   ├── Tenta validar online
   └── Se falhar, mostra erro amigável
```

**Automação 2h Antes do Evento:**
```
🤖 Robô executa automaticamente:
├── Gera páginas CDN de todos os ingressos
├── Re-envia emails com lembretes
├── Valida que tudo está acessível
├── Upload QR Codes para CDN
└── Alerta ops se algo falhar
```

### Garantia
> **Cliente SEMPRE consegue acessar ingresso, mesmo com servidor fora**

---

## 🎭 Premissas de Roles (Usuários)

### Master (Você)
- ✅ Acesso total ao sistema
- ✅ Criar/editar/deletar eventos
- ✅ Gerenciar ingressos
- ✅ Gerenciar outros usuários
- ✅ Visualizar relatórios financeiros
- ✅ Configurações do sistema

### Admin (Equipe de Gestão)
- ✅ Criar/editar eventos
- ✅ Gerenciar ingressos
- ✅ Visualizar vendas e relatórios
- ❌ Não pode gerenciar usuários
- ❌ Não pode deletar eventos

### Financeiro
- ✅ Visualizar relatórios de vendas
- ✅ Extrair dados financeiros
- ✅ Dashboard de analytics
- ❌ Não pode criar/editar eventos
- ❌ Não pode gerenciar ingressos

### Leitor (Validadores no Portão)
- ✅ App de leitura de QR Code
- ✅ Ver status da validação
- ✅ Dashboard simples (quantos entraram)
- ❌ Não acessa área administrativa
- ❌ Não vê dados financeiros

### Customer (Comprador)
- ✅ Comprar ingressos
- ✅ Visualizar pedidos
- ✅ Baixar ingressos
- ❌ Não acessa dashboard

---

## 📐 Premissas de Escalabilidade

### Números do Evento Típico
```
Evento médio:
├── 500-1500 pessoas
├── Venda: 2 semanas antes
├── Pico de compra: últimos 3 dias
├── Entrada: 2 horas (20h-22h)
└── Validação: 5 portões

Carga esperada:
├── Venda: ~100 acessos simultâneos (pico)
├── Validação: ~12 leituras/minuto (total)
└── Dashboard: ~5-10 usuários admin
```

### Capacidade da Stack
```
Railway/Render (plano básico):
└── Suporta ~1000 req/min ✅

MongoDB Atlas (M0 free):
└── Suporta ~100 conexões simultâneas ✅

Vercel (free tier):
└── Sem limite de pageviews ✅

Mercado Pago:
└── Sem limite de transações ✅

CONCLUSÃO: Stack aguenta tranquilo! 🚀
```

### Quando Escalar?
```
Sinais para upgrade:
├── [ ] Eventos com >2000 pessoas
├── [ ] >100 eventos/ano
├── [ ] Latência >2s nas validações
├── [ ] MongoDB M0 chegando no limite
└── [ ] Múltiplos eventos simultâneos

Upgrades sugeridos:
├── MongoDB Atlas M10 (~$57/mês)
├── Railway Pro (~$20/mês)
├── Redis para cache (~$10/mês)
└── CDN premium (se necessário)
```

---

## 🚫 O Que NÃO Fazer no MVP

### ❌ Não Implementar Agora

**Features complexas:**
- ❌ Sistema de revenda/transferência de ingressos
- ❌ Lista de espera (waitlist)
- ❌ Aprovação manual de ingressos
- ❌ App mobile nativo (usar PWA)
- ❌ Sistema de check-in antecipado
- ❌ Mesas/setores reservados
- ❌ Analytics avançado (heatmaps, funis complexos)
- ❌ Integração com CRM externo
- ❌ Sistema de afiliados/promoters

**Infraestrutura complexa:**
- ❌ Docker/Kubernetes no MVP
- ❌ Microserviços (monolito é suficiente)
- ❌ Redis (usar cache em memória)
- ❌ Load balancer (um servidor basta)
- ❌ Multi-region (Brasil é suficiente)
- ❌ CI/CD complexo (GitHub Actions simples)

**Otimizações prematuras:**
- ❌ GraphQL (REST é suficiente)
- ❌ WebSockets (polling resolve)
- ❌ Server-Side Rendering de tudo
- ❌ Lazy loading excessivo
- ❌ Compressão avançada de imagens

### ✅ Fazer Depois (Fase 2)

**Após 2-3 eventos:**
- [ ] Sistema offline completo (validação)
- [ ] WhatsApp para clientes
- [ ] Analytics mais detalhado
- [ ] Cupons de desconto
- [ ] Relatórios financeiros avançados
- [ ] Exportação de dados (CSV, Excel)

**Após 6-12 meses:**
- [ ] App mobile nativo
- [ ] Sistema de promoters
- [ ] Integração com CRM
- [ ] Multi-currency (se expandir)
- [ ] Suporte a múltiplos idiomas

---

## 📋 Escopo do MVP (6-8 Semanas)

### Semana 1-2: Setup + Backend Base
```
Backend:
├── [x] Setup projeto (Express + TypeScript)
├── [x] Conexão MongoDB Atlas
├── [x] Models (User, Event, Ticket, Order)
├── [x] Auth (JWT + bcrypt)
├── [x] Sistema de roles
└── [x] Rotas básicas (CRUD)

Infraestrutura:
├── [x] Repositório GitHub
├── [x] Deploy Railway/Render
├── [x] MongoDB Atlas configurado
└── [x] Variáveis de ambiente
```

### Semana 3-4: Pagamentos + QR Code
```
Backend:
├── [ ] Integração Mercado Pago
├── [ ] Webhook pagamentos
├── [ ] Geração de QR Code
├── [ ] Geração de PDF
├── [ ] Envio de email (Resend)
└── [ ] Upload para CDN (S3/R2)

Frontend (início):
├── [ ] Setup Next.js + Tailwind
├── [ ] Landing page básica
└── [ ] Componentes UI (Shadcn)
```

### Semana 5-6: Frontend + Validação
```
Frontend:
├── [ ] Página de evento
├── [ ] Checkout completo
├── [ ] Dashboard admin (CRUD eventos)
├── [ ] Dashboard admin (gerenciar ingressos)
├── [ ] App de validação (QR reader)
└── [ ] Página "Meu ingresso"

Backend:
├── [ ] Endpoint validação QR Code
├── [ ] Logs de validações
└── [ ] Relatórios básicos
```

### Semana 7-8: Testes + Ajustes
```
Testes:
├── [ ] Fluxo completo de compra
├── [ ] Validação de QR Code
├── [ ] Teste de carga (básico)
├── [ ] Teste em dispositivos móveis
└── [ ] Validar emails chegando

Ajustes:
├── [ ] Correção de bugs
├── [ ] Melhorias de UX
├── [ ] Documentação básica
└── [ ] Preparação evento teste

Deploy:
├── [ ] Backend em produção
├── [ ] Frontend em produção
├── [ ] DNS configurado
└── [ ] HTTPS ativo
```

### Semana 9: Evento Teste
```
Evento interno (50-100 pessoas):
├── [ ] Venda real de ingressos
├── [ ] Teste de pagamento
├── [ ] Teste de validação
├── [ ] Coletar feedback
└── [ ] Ajustes pós-evento
```

### Semana 10: Primeiro Evento Real
```
Evento público (500-1500 pessoas):
├── [ ] Monitoramento ativo
├── [ ] Suporte dedicado
├── [ ] Coleta de métricas
└── [ ] Análise pós-evento
```

---

## 💰 Custos Mensais Estimados

### MVP (Primeiros 3 Meses)
```
Backend (Railway/Render):
├── Free tier: $0/mês
└── Starter: $5-10/mês

Frontend (Vercel):
└── Free tier: $0/mês

MongoDB Atlas:
└── M0 (512MB): $0/mês

Email (Resend):
└── Free: 3.000/mês = $0

Cloudinary (uploads):
└── Free tier: $0

CDN (Cloudflare R2):
└── 10GB: ~$1/mês

Domínio:
└── .com: ~$12/ano = $1/mês

TOTAL MVP: ~$2-12/mês 🎉
```

### Produção (Após MVP)
```
Backend (Railway Pro):
└── $20/mês

Frontend (Vercel):
└── $0/mês (free é suficiente)

MongoDB Atlas M10:
└── $57/mês (só quando precisar)

Email (Resend Pro):
└── $20/mês (50k emails)

CDN:
└── $2/mês

Mercado Pago:
└── ~4% por transação

TOTAL: ~$100-150/mês

Por evento (1000 pessoas × R$ 50):
└── R$ 50.000 × 4% = R$ 2.000 em gateway
└── R$ 150 hospedagem
└── TOTAL: ~R$ 2.150/evento

VS Ingresse:
└── R$ 50.000 × 25% = R$ 12.500/evento

ECONOMIA: R$ 10.350 por evento! 💰
```

---

## 🎯 Critérios de Sucesso

### MVP é Sucesso Se:
- [ ] Sistema vende ingresso de ponta a ponta
- [ ] Cliente recebe QR Code por email
- [ ] Validador consegue ler QR Code
- [ ] QR Code só funciona 1 vez (anti-fraude)
- [ ] Dashboard mostra vendas em tempo real
- [ ] Sistema aguenta 1 evento de 500 pessoas
- [ ] Zero reclamações críticas de clientes

### Fase 2 é Sucesso Se:
- [ ] Sistema aguenta 1500 pessoas
- [ ] Sistema offline funciona (tablets)
- [ ] Cliente recebe ingresso por 3+ canais
- [ ] Robô 2h antes executa perfeitamente
- [ ] Zero downtime durante evento
- [ ] Validação <2s por pessoa

### Sucesso do Negócio:
- [ ] Economia de >R$ 50k no primeiro ano
- [ ] 100% dos eventos usando sistema próprio
- [ ] Satisfação dos clientes >90%
- [ ] Sistema roda sem intervenção manual

---

## 🚀 Roadmap de Evolução

### Fase 1: MVP (Meses 1-2)
```
✅ Sistema funcional básico
✅ Venda de ingressos
✅ Pagamento online
✅ QR Code + validação
✅ Dashboard admin
✅ 1 evento teste
```

### Fase 2: Estabilização (Meses 3-6)
```
□ Sistema offline completo
□ Redundância multi-camada
□ WhatsApp para clientes
□ Analytics melhorado
□ 3-5 eventos reais
□ Feedback e ajustes
```

### Fase 3: Otimização (Meses 7-12)
```
□ Performance otimizada
□ Relatórios avançados
□ Sistema de cupons
□ Exportação de dados
□ 12 eventos no ano
□ ROI comprovado
```

### Fase 4: Expansão (Ano 2)
```
□ App mobile nativo
□ Sistema de promoters
□ Múltiplos organizadores
□ API pública
□ Possível white-label
```

---

## 📞 Responsabilidades

### Dev Backend (Contratar)
- Setup da infraestrutura
- API REST completa
- Integração Mercado Pago
- Sistema de QR Code
- Webhooks e jobs
- Segurança e auth

### Dev Frontend (Você)
- Next.js setup
- Landing page
- Checkout
- Dashboard admin
- App de validação
- UX/UI

### Devops (Terceirizar ou Aprender)
- Deploy inicial
- CI/CD básico
- Monitoramento
- Backups
- Manutenção

---

## 🎓 Aprendizados Esperados

### Para Você (Frontend)
- Next.js App Router
- Integração com APIs REST
- QR Code scanner (html5-qrcode)
- PWA e Service Workers
- Deploy e CI/CD

### Para Equipe Backend
- Node.js + TypeScript em produção
- Integração com gateways de pagamento
- Webhooks e sistemas assíncronos
- Segurança de APIs
- Escalabilidade real

### Para Empresa
- Gestão de produto tech
- Decisões de arquitetura
- Trade-offs técnicos
- Custos de infraestrutura
- Independência tecnológica

---

## 🔗 Documentos Relacionados

- **[README.md](./README.md)** - Visão geral do projeto (original)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitetura técnica detalhada
- **[PREMISSAS.md](./PREMISSAS.md)** - Este documento

---

## 📝 Notas Finais

### Princípios do Projeto
1. **Simplicidade primeiro** - MVP enxuto, evolução gradual
2. **Cliente sempre consegue ingresso** - Redundância é crítica
3. **Segurança não é negociável** - QR Code anti-fraude
4. **Custos previsíveis** - Sem surpresas na conta
5. **Independência tecnológica** - Controle total do sistema

### Mentalidade
- ✅ Fazer funcionar → Fazer certo → Fazer rápido
- ✅ MVP perfeito não existe, shipping é o que importa
- ✅ Código limpo, mas não perfeccionismo paralisante
- ✅ Monitorar e iterar baseado em dados reais
- ✅ Documentar decisões para o futuro

### Próximos Passos
1. [ ] Validar premissas com equipe
2. [ ] Contratar dev backend (ou parceiro)
3. [ ] Setup inicial dos repos
4. [ ] Kick-off do desenvolvimento
5. [ ] Sprint 1 (semana 1-2)

---

**Última revisão:** 21 de Outubro de 2025  
**Próxima revisão:** Após primeiro evento real

