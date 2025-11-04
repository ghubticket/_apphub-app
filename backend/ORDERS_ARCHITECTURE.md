# Arquitetura de Pedidos e Ingressos

## 📋 Resumo

Implementação completa do fluxo de pedidos com suporte para ingressos VIP (sem pagamento) e preparação para integração futura de gateway de pagamento.

## 🎯 Funcionalidades Implementadas

### 1. **Criação de Pedidos (`POST /api/orders`)**
- ✅ Cria pedido com ingressos
- ✅ **Ingressos VIP**: Status automático `paid`, `paymentMethod = 'vip_free'`, tickets `confirmed`
- ✅ **Outros ingressos**: Status `pending`, aguarda pagamento (será integrado depois)
- ✅ Gera QR Code automaticamente para cada ingresso
- ✅ Atualiza `soldQuantity` do `TicketType`
- ✅ Valida disponibilidade usando serviço de reservas
- ✅ Valida limite por compra (`maxPerPurchase`)

### 2. **Listagem de Pedidos (`GET /api/orders`)**
- ✅ Lista pedidos do usuário autenticado
- ✅ Popula dados de evento, tickets e cliente

### 3. **Buscar Pedido (`GET /api/orders/:id`)**
- ✅ Busca pedido por ID
- ✅ Verifica permissão (admin ou dono do pedido)
- ✅ Retorna dados completos com tickets e QR codes

### 4. **Validação de QR Code (`GET /api/tickets/code/:code`)**
- ✅ Busca ingresso por código (12 caracteres)
- ✅ Retorna dados do ingresso, evento e pedido
- ✅ Público (não requer autenticação)

### 5. **Validar Ingresso (`POST /api/tickets/code/:code/validate`)**
- ✅ Marca ingresso como `used`
- ✅ Apenas usuários com role `QRCODE` ou `ADMIN` podem validar
- ✅ Verifica se ingresso está confirmado e pedido está pago
- ✅ Registra quem validou e quando

### 6. **Listar Meus Ingressos (`GET /api/tickets/my`)**
- ✅ Lista ingressos do usuário autenticado
- ✅ Inclui QR codes e dados do evento

## 🏗️ Arquitetura

### **Modelos Atualizados**

#### `Order`
- ✅ Adicionado `paymentMethod?: 'vip_free'` (opcional para VIP)
- ✅ Status: `'pending' | 'paid' | 'cancelled' | 'refunded'`
- ✅ Campo `paidAt` para registrar quando foi pago

#### `Ticket`
- ✅ Adicionado `ticketType` (referência ao tipo de ingresso)
- ✅ Campo `qrCode` (base64) gerado automaticamente
- ✅ Status: `'pending' | 'confirmed' | 'used' | 'cancelled' | 'refunded'`
- ✅ Campos `usedAt`, `usedBy`, `validatedAt` para auditoria

### **Serviços**

#### `qrCodeService.ts`
- ✅ `generateQRCode(ticketCode: string)`: Gera QR code em base64
- ✅ Usa biblioteca `qrcode` com alta correção de erro
- ✅ Tamanho: 256x256px

### **Controllers**

#### `ordersController.ts`
- ✅ `createOrder`: Cria pedido com lógica VIP automática
- ✅ `listMyOrders`: Lista pedidos do usuário
- ✅ `getOrderById`: Busca pedido específico

#### `ticketsController.ts`
- ✅ `getTicketByCode`: Busca por código (público)
- ✅ `validateTicket`: Valida ingresso (apenas QRCODE/ADMIN)
- ✅ `listMyTickets`: Lista ingressos do usuário
- ✅ `listEventTickets`: Lista ingressos de evento (apenas ADMIN)

### **Rotas**

```
POST   /api/orders              - Criar pedido (autenticado)
GET    /api/orders               - Listar meus pedidos (autenticado)
GET    /api/orders/:id           - Buscar pedido (autenticado)

GET    /api/tickets/my           - Listar meus ingressos (autenticado)
GET    /api/tickets/code/:code   - Buscar por código (público)
POST   /api/tickets/code/:code/validate - Validar ingresso (QRCODE/ADMIN)
GET    /api/tickets/event/:eventId - Listar ingressos de evento (ADMIN)
```

## 🔄 Fluxo VIP (Sem Pagamento)

1. **Usuário faz login** → Obtém token JWT
2. **Cria pedido** com ingresso VIP:
   ```json
   POST /api/orders
   {
     "eventId": "...",
     "ticketTypeId": "...",
     "quantity": 2
   }
   ```
3. **Backend detecta VIP**:
   - ✅ `ticketType.isVIP === true`
   - ✅ `order.status = 'paid'`
   - ✅ `order.paymentMethod = 'vip_free'`
   - ✅ `order.paidAt = new Date()`
   - ✅ `ticket.status = 'confirmed'`
   - ✅ Gera QR Code automaticamente
4. **Resposta**:
   ```json
   {
     "success": true,
     "message": "Pedido VIP criado com sucesso",
     "data": {
       "order": { ... },
       "isVIP": true,
       "requiresPayment": false
     }
   }
   ```
5. **QR Code pronto** para validação!

## 🔄 Fluxo Não-VIP (Aguardando Pagamento)

1. **Usuário cria pedido** com ingresso pago
2. **Backend cria pedido**:
   - ✅ `order.status = 'pending'`
   - ✅ `ticket.status = 'pending'`
   - ✅ QR Code gerado, mas ingresso ainda não confirmado
3. **Resposta**:
   ```json
   {
     "success": true,
     "message": "Pedido criado com sucesso. Aguardando pagamento.",
     "data": {
       "order": { ... },
       "isVIP": false,
       "requiresPayment": true
     }
   }
   ```
4. **Futuro**: Integrar gateway de pagamento
   - Quando pagamento confirmado → `order.status = 'paid'`, `ticket.status = 'confirmed'`
   - QR Code fica válido para validação

## 🔐 Segurança

- ✅ Autenticação JWT obrigatória para criar/listar pedidos
- ✅ Validação de disponibilidade antes de criar pedido
- ✅ Validação de limite por compra
- ✅ Apenas QRCODE/ADMIN podem validar ingressos
- ✅ Verificação de status antes de validar
- ✅ Soft delete implementado (não remove fisicamente)

## 📝 Preparação para Gateway de Pagamento

### **Estrutura Pronta**

1. **Campo `paymentMethod`** já suporta:
   - `'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free'`

2. **Campos para integração**:
   - `paymentId?: string` - ID do pagamento no gateway
   - `paymentStatus?: string` - Status do pagamento
   - `paidAt?: Date` - Data do pagamento

3. **Quando integrar**:
   - Criar webhook para receber confirmação do gateway
   - Atualizar `order.status = 'paid'` e `ticket.status = 'confirmed'`
   - Manter QR Code já gerado (não precisa regenerar)

## 🧪 Testando o Fluxo VIP

### 1. Criar um tipo de ingresso VIP
```bash
POST /api/events/:eventId/ticket-types
{
  "name": "VIP",
  "isVIP": true,
  "price": 0,
  "maxQuantity": 100,
  "maxPerPurchase": 5,
  "lotNumber": 1
}
```

### 2. Criar pedido (com usuário autenticado)
```bash
POST /api/orders
Authorization: Bearer <token>
{
  "eventId": "...",
  "ticketTypeId": "...",
  "quantity": 2
}
```

### 3. Verificar QR Code
```bash
GET /api/tickets/code/<CODE>
```

### 4. Validar ingresso (com role QRCODE)
```bash
POST /api/tickets/code/<CODE>/validate
Authorization: Bearer <token_qrcode>
```

## 🎉 Próximos Passos

1. ✅ Backend completo para VIP
2. ⏳ Integrar frontend para criar pedidos
3. ⏳ Criar página de "Meus Ingressos" no frontend
4. ⏳ Criar app/scanner de QR Code (para role QRCODE)
5. ⏳ Integrar gateway de pagamento (Mercado Pago, Stripe, etc.)

## 📚 Documentação Swagger

Todas as rotas estão documentadas no Swagger:
- Acesse: `http://localhost:3001/api-docs`
- Tags: `Orders` e `Tickets`

