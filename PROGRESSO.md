# 📊 Progresso do Projeto - EventHub

> **Última atualização:** Janeiro 2025  
> Este documento resume o que foi implementado e o que ainda precisa ser feito.
> 
> **Últimas atualizações:**
> - ✅ Sistema de identificação de quem passou primeiro na validação (prevenção de burlas)
> - ✅ Campo `usedByHolderId` no Ticket para rastrear quem estava presente na validação

---

## ✅ O QUE JÁ FOI IMPLEMENTADO

### 🎫 Sistema de Pedidos (Orders)

#### Backend
- ✅ **Criação de pedidos** (`POST /api/orders`)
  - Suporte para ingressos VIP (gratuitos, status automático `paid`)
  - Suporte para ingressos normais (status `pending`, aguarda pagamento)
  - Geração automática de QR Codes para cada ingresso
  - Atualização de estoque (`soldQuantity` do `TicketType`)
  - Validação de disponibilidade e limites por compra
  - Cálculo correto de taxas (exceto para VIPs)

- ✅ **Listagem de pedidos**
  - `GET /api/orders` - Lista pedidos do usuário autenticado (paginado)
  - `GET /api/orders/all` - Lista todos os pedidos (apenas ADMIN, paginado)
  - Filtros por status (`pending`, `paid`, `cancelled`, `refunded`)
  - Busca por texto (número do pedido, nome do cliente, evento)
  - Popula dados de evento, tickets e cliente

- ✅ **Buscar pedido específico** (`GET /api/orders/:id`)
  - Verifica permissão (admin ou dono do pedido)
  - Retorna dados completos com tickets e QR codes

- ✅ **Cancelamento de pedidos** (`POST /api/orders/:id/cancel`)
  - Permite cancelar pedidos pendentes
  - Cancela todos os tickets associados
  - Libera estoque automaticamente
  - Apenas dono ou admin pode cancelar

#### Frontend
- ✅ **Lista de pedidos** (`/apps/orders/list`)
  - Tabela com paginação e filtros
  - Filtro por status (Todos, Pendente, Pago, Cancelado, Reembolsado)
  - Busca por texto
  - Modal com detalhes do pedido e tickets
  - Exibição de QR Codes
  - Coluna "Tipo" para identificar VIP/Normal
  - Status "VIP" para pedidos com `paymentMethod: 'vip_free'`

- ✅ **Cards de estatísticas** (`OrderListCards`)
  - **Pedidos** (valor total: pendentes + confirmados)
  - **Vendas Totais** (confirmados, excluindo VIPs)
  - **Pedidos Cancelados** (valor total)
  - **Ingressos Vendidos** (não-VIP, apenas confirmados)
  - **VIPs Distribuídos** (quantidade de VIPs confirmados)
  - Gráficos de barras por dia
  - Comparação com semana anterior (percentuais baseados em valores monetários)
  - ⚠️ **Pedidos Pendentes** - OCULTO TEMPORARIAMENTE

### 💳 Pagamentos (Mercado Pago - Orders API)

#### Backend
- ✅ Migração do fluxo para o modelo mais recente do Mercado Pago (Orders API)
- ✅ PIX via Orders API
  - Criação de transação com `type: 'online'` e `processing_mode: 'automatic'`
  - Headers: `Authorization` (Bearer) e `X-Idempotency-Key`
  - Payer no nível raiz conforme spec da Orders API
  - Extração correta do QR Code a partir de `payment_method.qr_code` e `qr_code_base64`
  - `ticket_url` exposto para fallback de pagamento no MP
  - Expiração do PIX configurada no MP via `expiration_time` (ISO-8601). Default: `PT15M` (ENV `MP_PIX_EXPIRATION_ISO`)
  - UI/Backend passam a usar exclusivamente o `date_of_expiration` devolvido pelo MP como fonte de verdade (evita falsos positivos)
- ✅ Mapeamento completo de status (transação e order) com `paymentStatusMapper`
  - Mensagens amigáveis para usuário e admin
  - `internalStatus` padronizado (pending, paid, cancelled, refunded, processing, failed)
  - Cores e flags (`requiresAction`, `canRetry`)
- ✅ Logs detalhados e diagnósticos
  - Validação de `MP_ACCESS_TOKEN` com mensagens claras
  - Logs de payloads/respostas do MP (em ambiente dev)
  - Tratativa de sandbox: email forçado para `*@testuser.com` em dev
- ✅ Endpoints atualizados
  - `POST /api/payments/:orderId/pix`
  - `GET /api/payments/:paymentId/status`
  - `GET /api/orders/:orderId/payment/status`
- ✅ Webhook ajustado para notificações do tipo `order` (Orders API)
  - Idempotência persistente (DB + fila + retry) e assinatura HMAC obrigatória em produção (`MP_WEBHOOK_SECRET`)
  - Atualização de pedido e tickets conforme status do pagamento/ordem

- ✅ Cancelamento sem falso positivo
  - Ao cancelar pedido pendente, consultamos status no MP
    - Se `approved/paid` → bloqueia cancelamento
    - Se `pending/in_process/action_required` → cancela no MP e só depois marca localmente
  - Serviço de expiração consulta `date_of_expiration` no MP; se expirado e pendente, cancela no MP e depois local

#### Frontend
- Exposição de campos essenciais para UI: `qrCode`, `qrCodeBase64`, `ticketUrl`, `expiresAt`, `statusInfo`
- Tela de detalhes do pedido
  - Ícone e label do método de pagamento (PIX, Cartão)
  - Status padronizado com chip (PENDENTE, CONFIRMADO, CANCELADO, REEMBOLSADO)
  - "Detalhes do pagamento" com `paymentMessage`, `paymentAdminMessage`, `paymentStatusDetail` e erros do gateway
  - Se VIP, oculta o card de resumo financeiro
  - Ingressos mostram status padronizado e, quando `used`, exibem data e validador (usedAt/usedBy)

- Lista de pedidos
  - Ações no padrão do template (menu com “Ver detalhes”)
  - Coluna "Tipo" removida (mostrada no detalhe)

### 🎁 Sistema de Distribuição de VIPs

#### Backend
- ✅ **Distribuir cortesia** (`POST /api/events/:id/vip/distribute`)
  - Apenas ADMIN pode distribuir
  - Valida se usuário existe e está ativo
  - Valida estoque disponível
  - Se usuário já tem pedido para o evento, adiciona VIPs ao pedido existente (sem alterar status original)
  - Se não tem pedido, cria novo pedido VIP com status `paid` e `paymentMethod: 'vip_free'`
  - Gera QR Codes automaticamente para todos os VIPs
  - Atualiza estoque (`soldQuantity`)

#### Frontend
- ✅ **Botão "Distribuir Cortesia"** na página do evento (apenas ADMIN)
- ✅ **Modal de distribuição** com:
  - Campo de email (valida se usuário existe, mostra nome)
  - Campo de quantidade (máx. 2 caracteres, 1-99, respeita estoque)
  - Seletor de tipo VIP (se houver múltiplos tipos VIP)
  - Diálogo de confirmação antes de enviar
  - Exibição de erros dentro do modal (sem `alert()`)
  - Atualização automática de estatísticas após distribuição

### 📊 Estatísticas de Eventos

#### Backend
- ✅ **Estatísticas de ingressos** (`GET /api/events/:id/ticket-stats`)
  - **Ingressos Vendidos** (excluindo VIPs)
  - **VIPs Distribuídos** (contagem separada)
  - **Capacidade Total** (soma de todos os tipos)
  - **Disponível** (capacidade - vendidos - VIPs)
  - **Pendentes** (tickets com status `pending`)
  - **Cancelados** (tickets cancelados)
  - Contagem em tempo real via `Ticket` model (não depende de `soldQuantity`)

#### Frontend
- ✅ **Boxes de estatísticas** na página do evento (`/apps/events/view/[id]`)
  - Ingressos Vendidos
  - VIPs Distribuídos
  - Capacidade Total (removido conforme solicitado)
  - Disponíveis
  - Pendentes
  - Cancelados
  - Todos os dados são buscados da API e atualizados em tempo real

### 🔒 Guardrails de Segurança e Validação

#### Backend
- ✅ **Transições de status** (Model `Order`)
  - Regras implementadas:
    - `pending` → `paid` ou `cancelled` ✅
    - `paid` → `refunded` ✅
    - `cancelled` → ❌ (não pode voltar)
    - `refunded` → ❌ (não pode voltar)
  - Hooks `pre('save')` e `pre('findOneAndUpdate')` impedem transições inválidas

- ✅ **Geração de QR Codes**
  - QR Codes só são gerados para pedidos `paid` ou VIPs
  - Tickets cancelados têm QR Code removido

- ✅ **Liberação de estoque**
  - Ao cancelar pedido, tickets são marcados como `cancelled` e `isActive: false`
  - Estoque é liberado automaticamente

- ✅ **Validação de campos**
  - Endereço do evento: min 5, max 300 caracteres (frontend e backend)
  - Quantidade de VIPs: max 2 caracteres, 1-99, respeita estoque
  - Email: validação de existência de usuário antes de distribuir VIP

#### Frontend
- ✅ **Validação de formulários**
### 🔭 Observabilidade e Proteções

- ✅ Logging estruturado por requisição (`requestId`, status, duração, IP, user-agent)
- ✅ Lockout progressivo no login (5 falhas/15min → bloqueio por 15min)
- ✅ CORS restrito por domínio em produção
- ✅ Sanitização de inputs em rotas de Eventos (XSS básico)
- ✅ Uploads com Cache-Control forte e proteção simples de hotlink (produção)
- ✅ Sentry/APM opcional habilitado via `SENTRY_DSN` e `SENTRY_TRACES_SAMPLE_RATE`

  - Endereço: contador de caracteres (0/300), validação min/max
  - Quantidade VIP: input numérico limitado a 2 caracteres, validação de estoque

### ⏰ Expiração Automática de Pedidos

- ✅ **Serviço de expiração** (`orderExpirationService.ts`)
  - Job automático que verifica pedidos pendentes
  - Fonte de verdade para PIX: `date_of_expiration` do MP (quando disponível)
  - Configurável via variáveis de ambiente:
    - `ORDER_PAYMENT_TIMEOUT_MINUTES` (fallback local, default: 15 minutos)
    - `ORDER_EXPIRATION_ENABLED` (default: `true`)
    - `ORDER_EXPIRATION_CHECK_INTERVAL_MS` (default: 60 segundos)
  - Ao expirar: consulta status no MP, cancela no MP e só então cancela local (evita falso positivo)
  - Libera estoque automaticamente
  - Integrado no `server.ts` com `setInterval`

### 🧹 Limpeza e Organização

- ✅ Remoção de scripts legados e utilitários não usados
  - Removidos: `backend/src/scripts/createTestScenario.ts`, `backend/src/scripts/testPayment.ts`, `backend/resetUsers.js`
  - `backend/package.json`: comandos de scripts de teste/seed limpos
- ✅ Remoção de documentação antiga/desatualizada para reduzir ruído
  - Guias antigos de integração/diagnóstico substituídos por logs e Swagger

### 📝 Documentação

- ✅ Swagger atualizado
  - Endpoints DELETE agora documentam explicitamente "soft delete"
  - Endpoints de Pagamento (Orders API) documentados

### 🐛 Correções e Ajustes

- ✅ Correção de estrutura de resposta da API (paginação padronizada)
- ✅ Correção de sincronização de dados no frontend (`useOrders` hook)
- ✅ Correção de contagem de ingressos vendidos (excluindo VIPs)
- ✅ Correção de reconciliação de estoque (`soldQuantity` em tempo real)
- ✅ Correção de geração de `orderNumber` para pedidos VIP
- ✅ Correção de geração de `code` de tickets (movido para `pre('validate')`)
- ✅ Remoção de `alert()` e substituição por diálogos MUI estilizados

---

## 🚧 O QUE AINDA PRECISA SER FEITO

### 🎫 Sistema de Códigos de Promotor/Afiliado

#### Prioridade: ALTA (Novo)
- [ ] Modelo `PromoterCode` no backend
- [ ] CRUD de códigos (admin)
- [ ] Associação código ↔ evento (N:N)
- [ ] Validação de código no checkout
- [ ] Aplicação de desconto (percentual ou fixo)
- [ ] Registro de código no pedido
- [ ] Estatísticas de vendas por código
- [ ] Tela de gerenciamento de códigos
- [ ] Integração no portal público (checkout)

📄 **Documento completo**: `FEATURE_PROMOTER_CODES.md`

### 💳 Integração com Gateway de Pagamento

#### Prioridade: ALTA

#### Backend ✅ COMPLETO
- ✅ **Cartão via Orders API** (Backend completo)
  - ✅ Endpoint `POST /api/payments/:orderId/card`
  - ✅ Tokenização (recebe token do frontend)
  - ✅ Parcelas (suporte a 1-12 parcelas)
  - ✅ 3D Secure (automático via Orders API)
  - ✅ Mapeamento completo de status
  - ✅ Webhook para notificações
  - ✅ Email de pagamento (pendente/confirmado/recusado)
  - ✅ Validações e tratamento de erros
  - ✅ Additional info para melhorar taxa de aprovação

- ✅ **PIX via Orders API** (Completo)
  - ✅ Criação de transação
  - ✅ QR Code e código PIX
  - ✅ Expiração configurável
  - ✅ Webhook e emails

- ✅ **Webhook** (Completo)
  - ✅ Idempotência persistente
  - ✅ Assinatura HMAC
  - ✅ Atualização de pedido e tickets
  - ✅ Envio de emails automático

#### Frontend ❌ PENDENTE
- [ ] **Cartão de Crédito/Débito** (Frontend)
  - [ ] Integração com MercadoPago.js SDK
  - [ ] Formulário de cartão (número, nome, validade, CVV)
  - [ ] Tokenização do cartão no frontend
  - [ ] Seleção de parcelas (com valores e juros)
  - [ ] Tratamento de 3D Secure (modal/iframe)
  - [ ] Página de checkout integrada
  - [ ] Feedback visual (loading, sucesso, erro)
  - [ ] Tratamento de erros amigável

- [ ] **Boleto** (se aplicável ao MVP)
  - [ ] Frontend para exibir código de barras
  - [ ] Download de PDF do boleto

📄 **Documento detalhado**: `backend/CARTAO_PENDENCIAS.md`

### 📧 Sistema de Notificações

#### Prioridade: ALTA
- ✅ **Sistema de Email com Resend**
  - ✅ Integração com Resend API
  - ✅ Templates HTML responsivos com base template
  - ✅ Geração de PDF com QR Codes usando `pdfkit`
  - ✅ QR Codes inline no email (base64 data URLs)
  - ✅ Templates implementados:
    - ✅ Confirmação de ingresso (com QR codes e PDF)
    - ✅ Pagamento pendente (com QR code PIX)
    - ✅ Pagamento confirmado
    - ✅ Pagamento recusado
    - ✅ Pedido cancelado
    - ✅ Email de boas-vindas (registro)
    - ✅ Email de cortesia (VIP)
    - ✅ Redefinição de senha (template pronto, aguardando endpoint)
  - ✅ Integração nos fluxos:
    - ✅ Registro de usuário (welcome email)
    - ✅ Criação de pedido PIX/Cartão (payment pending)
    - ✅ Aprovação de pagamento via webhook (ticket confirmation)
    - ✅ Recusa de pagamento via webhook (payment rejected)
    - ✅ Cancelamento de pedido (order cancelled)
    - ✅ Distribuição de VIP (courtesy ticket)
  - ✅ Variáveis de ambiente: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - ✅ Scripts de teste: `test-email`, `test-email-template`

- [ ] WhatsApp (opcional, fase 2)
  - [ ] Envio de link para ingressos
  - [ ] QR Code como imagem
  - [ ] Integração com Twilio (ou similar)

### 📱 Portal Público de Compra

#### Prioridade: ALTA
- [ ] Landing page pública
  - [ ] Lista de eventos disponíveis
  - [ ] Detalhes do evento (fotos, descrição, local, data)

- [ ] Página de compra
  - [ ] Seleção de tipo de ingresso
  - [ ] Formulário de dados do comprador
  - [ ] Integração com gateway de pagamento
  - [ ] Confirmação de compra

- [ ] Área do cliente
  - [ ] Lista de ingressos comprados
  - [ ] Download de QR Codes
  - [ ] Reenvio de email

### 🔍 Sistema de Validação de QR Codes

#### Backend
- ✅ **QR Codes Seguros** (AES-256-GCM + HMAC-SHA256)
  - Criptografia AES-256-GCM com IV único
  - Assinatura HMAC-SHA256 para integridade
  - Timestamp e nonce único para cada QR code
  - Expiração configurável (default: 7 dias)
  - Variáveis de ambiente: `QR_SECRET` e `QR_HMAC_SECRET` (32 bytes cada)

- ✅ **Proteção Anti-Replay**
  - Modelo `QrNonce` para registrar nonces únicos
  - Prevenção de reutilização do mesmo QR code
  - Detecção de replay em tempo real

- ✅ **Endpoints de Validação**
  - `GET /api/tickets/code/:code` - Buscar ingresso por código (público)
  - `POST /api/tickets/code/:code/validate` - Validar ingresso (apenas QRCODE)
    - Aceita parâmetro opcional `holderId` no body para identificar quem está presente
    - Se não informado, assume que foi o holder do ticket
  - `POST /api/tickets/scan` - Ler QR seguro e retornar dados (apenas QRCODE)
  - `GET /api/tickets/event/:eventId` - Listar ingressos de evento (ADMIN)
  - ⚠️ **Apenas role QRCODE pode validar** (Admin não valida para não bagunçar)

- ✅ **Proteção contra Race Condition**
  - Operação atômica: só atualiza se status ainda for `confirmed`
  - Garante que apenas uma validação seja aceita simultaneamente

- ✅ **Identificação de Quem Passou Primeiro** 🆕
  - Campo `usedByHolderId` no modelo `Ticket` registra qual holder estava presente na validação
  - Permite identificar exatamente quem passou primeiro quando há tentativa de burla
  - Quando alguém tenta usar QR já usado, sistema retorna:
    - Nome de quem passou primeiro
    - ID de quem passou primeiro
    - Data/hora da primeira validação
    - Flag `isDifferentPerson` indicando se é pessoa diferente
  - Mensagens de erro detalhadas com informações completas

- ✅ **Sistema de Detecção de Tentativas Suspeitas**
  - Modelo `ValidationAttempt` para rastrear todas as tentativas
  - Detecção automática de padrões suspeitos:
    - Múltiplas tentativas de usar QR já utilizado (3+ em 24h → marca como suspeito)
    - Mesmo QR code usado em múltiplos eventos diferentes (2+ eventos → marca como suspeito)
    - Holder original tentando reutilizar QR já usado por outra pessoa → marca como suspeito automaticamente
  - Flags no modelo `User`:
    - `isSuspicious` - Flag manual de usuário suspeito
    - `suspiciousActivityCount` - Contador de tentativas suspeitas
    - `suspiciousReason` - Motivo da marcação (inclui nome de quem passou primeiro)
    - `isBlacklisted` - Flag de blacklist
    - `blacklistReason` - Motivo do bloqueio
  - Endpoints de gerenciamento:
    - `PATCH /api/users/:userId/suspicious` - Marcar/desmarcar como suspeito
    - `PATCH /api/users/:userId/blacklist` - Adicionar/remover da blacklist
  - Proteção: usuários na blacklist não podem validar ingressos

#### Frontend
- ✅ **Filtros de Segurança na Lista de Usuários**
  - Filtro "Suspeitos" (Todos, Suspeitos, Não Suspeitos)
  - Filtro "Blacklist" (Todos, Bloqueados, Não Bloqueados)
  - Filtros sempre visíveis, mesmo quando não há resultados
  - Mensagem específica: "Não foram encontrados resultados para esse filtro"

- ✅ **Coluna de Segurança na Tabela**
  - Badge "BLOQUEADO" (vermelho) para usuários na blacklist
  - Badge "SUSPEITO (X)" (amarelo) com contador de tentativas
  - Badge "OK" (verde) para usuários limpos

- [ ] App de validação (PWA) - **PENDENTE**
  - [ ] Scanner de QR Code
  - [ ] Validação em tempo real
  - [ ] Feedback visual (verde/vermelho/amarelo)
  - [ ] Histórico de validações

### 📊 Dashboard Administrativo (Melhorias)

#### Frontend
- ✅ **Gestão de Usuários**
  - Lista de usuários com paginação e filtros
  - Filtros: Role, Status, Suspeitos, Blacklist
  - Busca por nome/email
  - Coluna de segurança (BLOQUEADO/SUSPEITO/OK)
  - Atualização de status (ativo/inativo)
  - Visualização de detalhes do usuário

- ✅ **Detalhes do Pedido**
  - Informações completas do pedido
  - Método de pagamento com ícone (PIX/Cartão)
  - Status padronizado (CONFIRMADO, PENDENTE, CANCELADO, REEMBOLSADO)
  - Detalhes do pagamento (mensagens, erros, status_detail)
  - Lista de ingressos com status e uso (USADO/NÃO UTILIZADO)
  - Informação de QR usado (data e validador)
  - Botão WhatsApp para contato
  - Resumo financeiro (oculto para VIPs)

- [ ] Relatórios avançados
  - [ ] Vendas por período (gráficos)
  - [ ] Comparação entre eventos
  - [ ] Exportação de dados (CSV, Excel)
  - [ ] Relatório de tentativas suspeitas

- [ ] Gestão de eventos
  - [ ] Fechamento automático de vendas (X horas antes do evento)
  - [ ] Publicação/despublicação em massa
  - [ ] Botão "Cadastrar Evento" quando lista está vazia

- [ ] Gestão de usuários (melhorias)
  - [ ] Ações no menu para marcar/desmarcar suspeito e blacklist
  - [ ] Visualização de tentativas suspeitas por usuário
  - [ ] Criação em massa
  - [ ] Importação via CSV

### 🌐 Sistema Offline (Fase Futura)

#### Prioridade: BAIXA (após MVP)
- [ ] Geração de snapshot de evento
  - [ ] Exportar todos os tickets válidos
  - [ ] Upload para CDN (S3, R2, Drive)

- [ ] App de validação offline
  - [ ] Cache local (IndexedDB)
  - [ ] Sincronização P2P entre tablets
  - [ ] Modo 100% offline

- [ ] Sincronização pós-evento
  - [ ] Envio de validações offline para backend
  - [ ] Resolução de conflitos

### 🔐 Segurança e Performance

#### Backend
- ✅ **Rate Limiting**
  - Global: 100 req/min por IP
  - Auth: 5 req/15min por IP+email (lockout progressivo)
  - Sensitive: 10 req/15min por IP
  - Payment: 20 req/15min por IP
  - Order creation: 20 req/15min por IP
  - Configuração de `trust proxy` para identificar IPs corretamente

- ✅ **Proteção de QR Codes**
  - Criptografia AES-256-GCM
  - Assinatura HMAC-SHA256
  - Anti-replay via nonce persistente
  - Expiração configurável

- ✅ **Sistema de Blacklist e Detecção de Suspeitos**
  - Rastreamento de todas as tentativas de validação
  - Detecção automática de padrões suspeitos
  - Identificação de quem passou primeiro em caso de tentativa de burla
  - Blacklist automática (usuários bloqueados não podem validar)
  - Endpoints para gerenciamento manual

- ✅ **Logging e Observabilidade**
  - Logging estruturado por requisição (`requestId`, status, duração, IP, user-agent)
  - Integração opcional com Sentry/APM (`SENTRY_DSN`)
  - Logs detalhados de pagamentos e validações

- ✅ **Proteções Adicionais**
  - Lockout progressivo no login (5 falhas/15min → bloqueio por 15min)
  - CORS restrito por domínio em produção
  - Sanitização de inputs (XSS básico)
  - Uploads com Cache-Control forte e proteção de hotlink
  - HSTS e redirecionamento HTTP → HTTPS em produção

- [ ] Criptografia em repouso
  - [ ] Criptografar dados sensíveis (CPF, telefone) em repouso
  - [ ] HTTPS obrigatório (verificar no deploy)

- [ ] Backup e redundância
  - [ ] Backup automático do MongoDB
  - [ ] CDN para arquivos estáticos
  - [ ] Failover de servidores

### 📱 Mobile e PWA

#### Prioridade: MÉDIA
- [ ] PWA para portal público
  - [ ] Service Worker
  - [ ] Cache offline
  - [ ] Instalação no dispositivo

- [ ] App de validação mobile-first
  - [ ] Interface otimizada para tablets
  - [ ] Modo escuro/claro
  - [ ] Feedback sonoro na validação

### 🧪 Testes

#### Prioridade: MÉDIA
- [ ] Testes unitários (backend)
  - [ ] Testes de controllers
  - [ ] Testes de serviços
  - [ ] Testes de modelos

- [ ] Testes de integração
  - [ ] Fluxo completo de compra
  - [ ] Fluxo de validação
  - [ ] Fluxo de distribuição VIP

- [ ] Testes de carga
  - [ ] Simulação de picos de compra
  - [ ] Simulação de validações simultâneas
  - [ ] Otimização de queries

---

## 📈 Roadmap Sugerido

### Fase 1 - MVP (4-6 semanas) 🎯 ATUAL
- ✅ Sistema de pedidos completo
- ✅ Distribuição de VIPs
- ✅ Dashboard administrativo básico
- ✅ Estatísticas de eventos
- ✅ Sistema de validação de QR codes com segurança avançada
- ✅ Sistema de detecção de tentativas suspeitas e blacklist
- ✅ Identificação de quem passou primeiro na validação (prevenção de burlas) 🆕
- ✅ Integração com gateway de pagamento (PIX via Orders API funcional)
- ✅ Sistema de notificações (email com Resend) 🆕
- ⏳ **EM ANDAMENTO:** Cartão de crédito via Orders API

### Fase 2 - Portal Público (2-3 semanas)
- [ ] Landing page pública
- [ ] Página de compra
- [ ] Área do cliente
- [ ] Integração completa com pagamento

### Fase 3 - Validação (2-3 semanas)
- [ ] App de validação (PWA)
- [ ] Endpoints de validação
- [ ] Proteção anti-fraude
- [ ] Testes em evento real

### Fase 4 - Melhorias (contínuo)
- [ ] Relatórios avançados
- [ ] Otimizações de performance
- [ ] Sistema offline (opcional)
- [ ] Testes automatizados

---

## 🐛 Problemas Conhecidos / Pendências

### Menores
- [ ] Card "Pedidos Pendentes" oculto (pode ser reativado se necessário)
- [ ] Revisar limites de rate limiting para produção
- [ ] Adicionar mais testes automatizados

### Documentação
- [ ] Documentar variáveis de ambiente no README
- [ ] Criar guia de deploy
- [ ] Documentar API completa no Swagger

---

## 📝 Notas Importantes

1. **VIPs não contam como "Ingressos Vendidos"**: Implementado conforme solicitado. VIPs têm contagem separada ("VIPs Distribuídos").

2. **Pedidos pendentes não mudam de status ao receber VIP**: Se um usuário já tem um pedido pendente e recebe um VIP, o VIP é adicionado ao pedido, mas o status original é mantido.

3. **Expiração automática**: Pedidos pendentes são cancelados automaticamente após X minutos (configurável). O timeout padrão é 15 minutos.

4. **Soft delete**: Todos os endpoints de DELETE fazem soft delete (marcam `deletedAt`), não removem permanentemente.

5. **Estatísticas em tempo real**: As estatísticas de ingressos são calculadas em tempo real a partir do modelo `Ticket`, garantindo precisão mesmo se houver inconsistências no `soldQuantity` do `TicketType`.

---

## 🎯 Próximos Passos Imediatos

1. **Integração com Mercado Pago** (prioridade máxima)
2. **Sistema de email com PDF** (crítico para MVP)
3. **Portal público de compra** (necessário para vendas)
4. **App de validação** (necessário para eventos)

---

**Status Geral:** ~75% do MVP completo ✅  
**Próxima milestone:** Finalizar pagamentos (cartão) + App de validação + Portal público

