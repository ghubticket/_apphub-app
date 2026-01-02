# 📊 Como Visualizar Logs de Auditoria

## Endpoint Criado

**GET** `/api/audit-logs`

**Acesso:** Apenas usuários com role `ADMIN`

---

## Exemplos de Uso

### 1. Listar Todos os Logs (Últimos 20)

```bash
GET /api/audit-logs
Authorization: Bearer {seu-token-admin}
```

**Resposta:**
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
          "userAgent": "Mozilla/5.0...",
          "orderNumber": "ABC1234567"
        },
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 2. Filtrar por Tipo de Entidade

**Ver apenas logs de pedidos:**
```bash
GET /api/audit-logs?entityType=Order
```

**Ver apenas logs de eventos:**
```bash
GET /api/audit-logs?entityType=Event
```

---

### 3. Filtrar por Ação

**Ver apenas criações:**
```bash
GET /api/audit-logs?action=create
```

**Ver apenas cancelamentos:**
```bash
GET /api/audit-logs?action=cancel
```

**Ver apenas mudanças de status:**
```bash
GET /api/audit-logs?action=status_change
```

---

### 4. Filtrar por Usuário

**Ver todas as ações de um usuário específico:**
```bash
GET /api/audit-logs?performedBy=65a1b2c3d4e5f6g7h8i9j0k3
```

**Ver apenas ações de administradores:**
```bash
GET /api/audit-logs?performedByRole=ADMIN
```

---

### 5. Filtrar por Período

**Ver logs do último dia:**
```bash
GET /api/audit-logs?startDate=2025-01-15T00:00:00Z&endDate=2025-01-15T23:59:59Z
```

**Ver logs da última semana:**
```bash
GET /api/audit-logs?startDate=2025-01-08T00:00:00Z&endDate=2025-01-15T23:59:59Z
```

---

### 6. Ver Histórico de uma Entidade Específica

**Ver todos os logs de um pedido:**
```bash
GET /api/audit-logs/entity/Order/65a1b2c3d4e5f6g7h8i9j0k2
```

**Ver todos os logs de um evento:**
```bash
GET /api/audit-logs/entity/Event/65a1b2c3d4e5f6g7h8i9j0k4
```

---

### 7. Buscar um Log Específico

```bash
GET /api/audit-logs/65a1b2c3d4e5f6g7h8i9j0k1
```

---

### 8. Paginação

**Página 2 com 50 itens:**
```bash
GET /api/audit-logs?page=2&limit=50
```

---

### 9. Filtros Combinados

**Ver cancelamentos de pedidos feitos por admins na última semana:**
```bash
GET /api/audit-logs?entityType=Order&action=cancel&performedByRole=ADMIN&startDate=2025-01-08T00:00:00Z&endDate=2025-01-15T23:59:59Z
```

---

## Parâmetros Disponíveis

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `entityType` | string | Tipo da entidade | `Order`, `Ticket`, `Event`, `User`, `TicketType` |
| `entityId` | string | ID da entidade | `65a1b2c3d4e5f6g7h8i9j0k2` |
| `action` | string | Tipo de ação | `create`, `update`, `cancel`, `refund`, etc. |
| `performedBy` | string | ID do usuário | `65a1b2c3d4e5f6g7h8i9j0k3` |
| `performedByRole` | string | Role do usuário | `ADMIN`, `CLIENTE`, `QRCODE`, `SYSTEM` |
| `startDate` | ISO 8601 | Data inicial | `2025-01-15T00:00:00Z` |
| `endDate` | ISO 8601 | Data final | `2025-01-15T23:59:59Z` |
| `page` | number | Página (padrão: 1) | `1`, `2`, `3` |
| `limit` | number | Itens por página (padrão: 20, máx: 100) | `20`, `50`, `100` |

---

## Casos de Uso Práticos

### 🔍 Investigar Fraude

**Cenário:** Cliente reclama que não fez um pedido

```bash
# Ver todos os logs do pedido suspeito
GET /api/audit-logs/entity/Order/65a1b2c3d4e5f6g7h8i9j0k2
```

**Resultado:** Ver quem criou, de qual IP, em qual dispositivo, etc.

---

### 📊 Rastrear Mudanças de Status

**Cenário:** Pedido mudou de status mas não sabemos por quê

```bash
# Ver histórico de mudanças do pedido
GET /api/audit-logs/entity/Order/65a1b2c3d4e5f6g7h8i9j0k2?action=status_change
```

**Resultado:** Ver todas as mudanças de status, quem fez, quando, e por quê.

---

### 👤 Auditoria de Ações de Admin

**Cenário:** Verificar todas as ações de um administrador

```bash
# Ver ações do admin
GET /api/audit-logs?performedBy=65a1b2c3d4e5f6g7h8i9j0k3&performedByRole=ADMIN
```

**Resultado:** Lista completa de ações do admin.

---

### 📅 Compliance (LGPD)

**Cenário:** Cliente solicita acesso aos seus dados

```bash
# Ver todos os logs relacionados ao usuário
GET /api/audit-logs?performedBy=65a1b2c3d4e5f6g7h8i9j0k3
```

**Resultado:** Histórico completo de ações do usuário.

---

## Próximos Passos

1. ✅ **Endpoint criado** - `/api/audit-logs`
2. ⏳ **Adicionar auditoria** nos controllers faltantes
3. ⏳ **Criar página no dashboard** para visualização visual
4. ⏳ **Adicionar exportação** para CSV/Excel

---

**Última atualização:** Janeiro 2025
