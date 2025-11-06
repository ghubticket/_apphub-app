# 📧 Sistema de Emails - Implementação Completa

## ✅ Emails Implementados

### 1. **Boas-vindas** (`welcome.html`)
- **Quando**: Quando um novo usuário cria conta
- **Endpoint**: `POST /api/auth/register`
- **Arquivo**: `backend/src/controllers/authController.ts` (linha ~52)
- **Função**: `sendWelcomeEmail()`
- **Status**: ✅ Implementado

### 2. **Cortesia** (`courtesy-ticket.html`)
- **Quando**: Quando uma cortesia VIP é criada ou distribuída
- **Endpoints**: 
  - `POST /api/orders` (quando `isVIP = true`)
  - `POST /api/events/:id/vip/distribute`
- **Arquivos**: 
  - `backend/src/controllers/ordersController.ts` (linha ~376)
  - `backend/src/controllers/eventsController.ts` (linha ~458)
- **Função**: `sendCourtesyTicketEmail()`
- **Inclui**: PDF com QR codes + QR codes inline no email
- **Status**: ✅ Implementado

### 3. **Pagamento Pendente** (`payment-pending.html`)
- **Quando**: Quando um pagamento PIX ou Cartão é criado (mas ainda não aprovado)
- **Endpoints**:
  - `POST /api/payments/:orderId/pix`
  - `POST /api/payments/:orderId/card`
- **Arquivo**: `backend/src/controllers/paymentController.ts`
  - `createPixPayment()` (linha ~157)
  - `createCardPayment()` (linha ~402)
- **Função**: `sendPaymentPendingEmail()`
- **Inclui**: QR Code PIX (se PIX), código PIX para copiar, link de pagamento
- **Status**: ✅ Implementado

### 4. **Pagamento Confirmado** (`payment-confirmed.html`)
- **Quando**: Quando pagamento é aprovado (via webhook)
- **Endpoint**: `POST /api/payments/webhook` (quando `status = 'paid'`)
- **Arquivo**: `backend/src/controllers/paymentController.ts` (linha ~419)
- **Função**: `sendPaymentApprovedEmail()` → `sendTicketConfirmationEmail()`
- **Inclui**: PDF com QR codes + QR codes inline no email
- **Status**: ✅ Implementado
- **Nota**: Usa `sendTicketConfirmationEmail` que já inclui os ingressos

### 5. **Pagamento Recusado** (`payment-rejected.html`)
- **Quando**: Quando pagamento é recusado ou falha (via webhook)
- **Endpoint**: `POST /api/payments/webhook` (quando `status = 'failed'`)
- **Arquivo**: `backend/src/controllers/paymentController.ts` (linha ~506)
- **Função**: `sendPaymentRejectedEmailHelper()` → `sendPaymentRejectedEmail()`
- **Status**: ✅ Implementado

### 6. **Pedido Cancelado** (`order-cancelled.html`)
- **Quando**: Quando um pedido é cancelado manualmente
- **Endpoint**: `DELETE /api/orders/:id`
- **Arquivo**: `backend/src/controllers/ordersController.ts` (linha ~717)
- **Função**: `sendOrderCancelledEmail()`
- **Status**: ✅ Implementado

### 7. **Redefinição de Senha** (`password-reset.html`)
- **Quando**: Quando usuário solicita redefinição de senha
- **Endpoint**: ⚠️ **Ainda não implementado** (endpoint de redefinição de senha)
- **Função**: `sendPasswordResetEmail()`
- **Status**: ⚠️ Template criado, aguardando endpoint

## 📋 Resumo por Fluxo

### Fluxo de Compra Normal (Não-VIP)
1. ✅ **Criar pedido** → Nenhum email (pedido ainda não tem pagamento)
2. ✅ **Criar pagamento PIX/Cartão** → Email de **Pagamento Pendente**
3. ✅ **Webhook: Pagamento Aprovado** → Email de **Confirmação com PDF + QR codes**
4. ✅ **Webhook: Pagamento Recusado** → Email de **Pagamento Recusado**
5. ✅ **Cancelar pedido** → Email de **Pedido Cancelado**

### Fluxo de Cortesia (VIP)
1. ✅ **Criar pedido VIP** → Email de **Cortesia com PDF + QR codes**
2. ✅ **Distribuir VIP (admin)** → Email de **Cortesia com PDF + QR codes**

### Fluxo de Cadastro
1. ✅ **Registrar usuário** → Email de **Boas-vindas**

## 🔍 Verificações Realizadas

- ✅ Todos os templates criados
- ✅ Todas as funções de envio implementadas
- ✅ Integração nos endpoints corretos
- ✅ PDF com QR codes sendo gerado e anexado
- ✅ QR codes inline no corpo do email
- ✅ Logs de debug para troubleshooting
- ✅ Tratamento de erros (não bloqueia operações principais)
- ✅ Validação de email válido antes de enviar

## ⚠️ Pendências

1. **Redefinição de Senha**: Template criado, mas endpoint ainda não existe
   - Quando implementar o endpoint, usar `sendPasswordResetEmail()`

## 📝 Notas Importantes

- Todos os emails são enviados de forma **não-bloqueante** (try/catch)
- Se o email falhar, a operação principal (criar pedido, pagamento, etc.) continua normalmente
- Logs detalhados para debug em caso de problemas
- Emails usam `customerData.email` como prioridade, depois `customer.email`
- Validação para não enviar se email for "Não informado" ou vazio

