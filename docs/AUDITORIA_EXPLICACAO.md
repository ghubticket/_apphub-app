# 📋 Sistema de Auditoria - Explicação e Visualização

## O que é Auditoria?

**Auditoria** é o registro de **todas as ações importantes** que acontecem no sistema. É como um "log de segurança" que responde:

- **Quem** fez a ação?
- **O que** foi feito?
- **Quando** foi feito?
- **Onde** foi feito (IP, dispositivo)?
- **O que mudou** (valores antigos vs novos)?

### Por que é importante?

1. **Segurança**: Rastrear ações suspeitas ou não autorizadas
2. **Compliance**: Atender requisitos legais (LGPD, por exemplo)
3. **Debugging**: Entender o que aconteceu quando algo deu errado
4. **Transparência**: Mostrar histórico completo de mudanças
5. **Responsabilidade**: Saber quem fez cada ação

---

## Como Funciona no Sistema

### 1. **Modelo de Dados** (`AuditLog`)

Cada registro de auditoria contém:

```typescript
{
  entityType: 'Order' | 'Ticket' | 'Event' | 'User' | 'TicketType',
  entityId: ObjectId,           // ID do recurso alterado
  action: 'create' | 'update' | 'delete' | 'status_change' | 'payment_update' | 'cancel' | 'refund',
  performedBy: ObjectId,         // Usuário que fez a ação (null = sistema)
  performedByRole: 'ADMIN' | 'CLIENTE' | 'QRCODE' | 'SYSTEM',
  changes: [                     // O que mudou
    {
      field: 'status',
      oldValue: 'pending',
      newValue: 'paid'
    }
  ],
  metadata: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    reason: 'Pagamento aprovado',
    paymentId: '123456789'
  },
  createdAt: Date
}
```

### 2. **Exemplo de Uso**

Quando um pedido é criado:

```typescript
// No ordersController.ts
logAudit({
  entityType: 'Order',
  entityId: String(order._id),
  action: 'create',
  performedBy: auditContext.performedBy,      // ID do usuário
  performedByRole: auditContext.performedByRole, // 'CLIENTE'
  changes: [
    {
      field: 'status',
      oldValue: null,
      newValue: 'pending'
    },
    {
      field: 'totalAmount',
      oldValue: null,
      newValue: 150.00
    }
  ],
  metadata: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    orderNumber: 'ABC1234567'
  }
});
```

Quando um pedido é cancelado:

```typescript
logAudit({
  entityType: 'Order',
  entityId: String(order._id),
  action: 'cancel',
  performedBy: auditContext.performedBy,
  performedByRole: auditContext.performedByRole,
  changes: [
    {
      field: 'status',
      oldValue: 'pending',
      newValue: 'cancelled'
    }
  ],
  metadata: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    reason: 'Cliente solicitou cancelamento'
  }
});
```

---

## Como Visualizar os Logs de Auditoria

### Opção 1: Via API (Endpoint que vamos criar)

**GET** `/api/audit-logs`

**Query Parameters:**
- `entityType`: Filtrar por tipo (Order, Ticket, Event, User, TicketType)
- `entityId`: Filtrar por ID específico
- `action`: Filtrar por ação (create, update, cancel, etc.)
- `performedBy`: Filtrar por usuário que fez a ação
- `startDate`: Data inicial (ISO 8601)
- `endDate`: Data final (ISO 8601)
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 20, máximo: 100)

**Exemplo de Resposta:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "entityType": "Order",
        "entityId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "action": "create",
        "performedBy": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
          "name": "João Silva",
          "email": "joao@example.com"
        },
        "performedByRole": "CLIENTE",
        "changes": [
          {
            "field": "status",
            "oldValue": null,
            "newValue": "pending"
          }
        ],
        "metadata": {
          "ipAddress": "192.168.1.1",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
          "orderNumber": "ABC1234567"
        },
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Opção 2: Via Dashboard (Interface Visual)

Criar uma página no dashboard administrativo com:

- **Tabela de logs** com filtros
- **Gráficos** de ações por período
- **Busca** por usuário, entidade, ação
- **Exportação** para CSV/Excel
- **Detalhes** ao clicar em um log

---

## Status Atual da Implementação

### ✅ Já Implementado

- [x] Modelo `AuditLog` criado
- [x] Serviço `auditService.ts` com funções helper
- [x] Auditoria em `createOrder` (ordersController.ts)
- [x] Auditoria em `cancelOrder` (ordersController.ts)

### ⚠️ Falta Implementar

- [ ] Endpoint para visualizar logs (`GET /api/audit-logs`)
- [ ] Auditoria em `paymentController.ts`:
  - Criação de pagamento
  - Atualização de status via webhook
- [ ] Auditoria em `eventsController.ts`:
  - Criação/edição de eventos
  - Distribuição de VIPs
- [ ] Auditoria em `usersController.ts`:
  - Marcar/desmarcar suspeito
  - Adicionar/remover blacklist
  - Mudanças de role
- [ ] Página no dashboard para visualizar logs

---

## Exemplos de Casos de Uso

### 1. Investigar Fraude

**Cenário:** Cliente reclama que não fez um pedido

**Solução:** Consultar logs de auditoria do pedido
```json
GET /api/audit-logs?entityType=Order&entityId=65a1b2c3d4e5f6g7h8i9j0k2
```

**Resultado:** Ver quem criou o pedido, de qual IP, em qual dispositivo, etc.

### 2. Rastrear Mudanças de Status

**Cenário:** Pedido mudou de status mas não sabemos por quê

**Solução:** Consultar histórico de mudanças
```json
GET /api/audit-logs?entityType=Order&entityId=65a1b2c3d4e5f6g7h8i9j0k2&action=status_change
```

**Resultado:** Ver todas as mudanças de status, quem fez, quando, e por quê.

### 3. Auditoria de Ações de Admin

**Cenário:** Verificar todas as ações de um administrador

**Solução:** Filtrar por usuário e role
```json
GET /api/audit-logs?performedBy=65a1b2c3d4e5f6g7h8i9j0k3&performedByRole=ADMIN
```

**Resultado:** Lista completa de ações do admin no período.

### 4. Compliance (LGPD)

**Cenário:** Cliente solicita acesso aos seus dados (LGPD)

**Solução:** Consultar todos os logs relacionados ao usuário
```json
GET /api/audit-logs?performedBy=65a1b2c3d4e5f6g7h8i9j0k3
```

**Resultado:** Histórico completo de ações do usuário.

---

## Próximos Passos

1. **Criar endpoint** `/api/audit-logs` para visualizar logs
2. **Adicionar auditoria** nos controllers faltantes
3. **Criar página no dashboard** para visualização visual
4. **Adicionar filtros avançados** (busca por texto, exportação, etc.)

---

**Última atualização:** Janeiro 2025
