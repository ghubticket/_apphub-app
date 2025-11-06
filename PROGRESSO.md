# 📊 Progresso do Projeto - EventHub

> **Última atualização:** Novembro 2025  
> Este documento resume o que foi implementado e o que ainda precisa ser feito.

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
  - Expiração configurável e retornada em `expiresAt`/`expirationMinutes`
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

#### Frontend (integração planejada)
- Exposição de campos essenciais para UI: `qrCode`, `qrCodeBase64`, `ticketUrl`, `expiresAt`, `statusInfo`

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
  - Endereço: contador de caracteres (0/300), validação min/max
  - Quantidade VIP: input numérico limitado a 2 caracteres, validação de estoque

### ⏰ Expiração Automática de Pedidos

- ✅ **Serviço de expiração** (`orderExpirationService.ts`)
  - Job automático que verifica pedidos pendentes expirados
  - Configurável via variáveis de ambiente:
    - `ORDER_PAYMENT_TIMEOUT_MINUTES` (default: 15 minutos)
    - `ORDER_EXPIRATION_ENABLED` (default: `true`)
    - `ORDER_EXPIRATION_CHECK_INTERVAL_MS` (default: 60 segundos)
  - Cancela pedidos pendentes após timeout
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
- [ ] Cartão via Orders API (tokenização, parcelas, 3DS quando aplicável)
- [ ] Boleto (se aplicável ao MVP)
- [ ] Webhook: finalizar mapeamentos e persistência ampliada de erros/detalhes
- [ ] Atualizar status do pedido no webhook quando aprovado
- [ ] Enviar email com ingressos após pagamento aprovado

#### Endpoints pendentes/complementares:
- `POST /api/payments/:orderId/card` - Criar pagamento por cartão
- `POST /api/webhooks/mercadopago` - Receber notificações (Orders API)
- `GET /api/orders/:id/payment/status` - Verificar status do pagamento

### 📧 Sistema de Notificações

#### Prioridade: ALTA
- [ ] Email com ingressos
  - [ ] Template de email HTML
  - [ ] PDF com QR Codes (usando `pdfkit` ou similar)
  - [ ] Upload de PDF para CDN
  - [ ] Integração com Resend (ou serviço similar)

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

#### Prioridade: ALTA
- [ ] App de validação (PWA)
  - [ ] Scanner de QR Code
  - [ ] Validação em tempo real
  - [ ] Feedback visual (verde/vermelho/amarelo)
  - [ ] Histórico de validações

- [ ] Endpoints de validação
  - [ ] `GET /api/tickets/code/:code` - Buscar ingresso por código (público)
  - [ ] `POST /api/tickets/code/:code/validate` - Validar ingresso (apenas QRCODE/ADMIN)
  - [ ] `GET /api/tickets/event/:eventId` - Listar ingressos de evento (ADMIN)

- [ ] Proteção anti-fraude
  - [ ] Hash HMAC SHA-256 no QR Code
  - [ ] Validação de hash antes de marcar como usado
  - [ ] Prevenção de reutilização

### 📊 Dashboard Administrativo (Melhorias)

#### Prioridade: MÉDIA
- [ ] Relatórios avançados
  - [ ] Vendas por período (gráficos)
  - [ ] Comparação entre eventos
  - [ ] Exportação de dados (CSV, Excel)

- [ ] Gestão de eventos
  - [ ] Fechamento automático de vendas (X horas antes do evento)
  - [ ] Publicação/despublicação em massa

- [ ] Gestão de usuários
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

#### Prioridade: MÉDIA
- [ ] Rate limiting
  - [ ] ✅ Já implementado básico, revisar limites
  - [ ] Aplicar em endpoints críticos (validação, compra)

- [ ] Criptografia
  - [ ] Criptografar dados sensíveis (CPF, telefone) em repouso
  - [ ] HTTPS obrigatório (verificar no deploy)

- [ ] Monitoramento
  - [ ] Integração com Sentry
  - [ ] Logs estruturados
  - [ ] Alertas para operações críticas

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
- ⏳ **EM ANDAMENTO:** Integração com gateway de pagamento (PIX via Orders API funcional; cartão pendente)
- ⏳ **PRÓXIMO:** Sistema de notificações (email)

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

**Status Geral:** ~60% do MVP completo ✅  
**Próxima milestone:** Finalizar pagamentos (cartão + webhook) + Email

