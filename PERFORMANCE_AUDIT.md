# 🔍 Auditoria de Performance - Backend e MongoDB

## ✅ Otimizações Já Implementadas

### 1. **Índices MongoDB** ✅
- **Order Model**: 15+ índices incluindo compostos
  - `orderNumber` (único)
  - `status + expiresAt` (composto)
  - `status + deletedAt + expiresAt` (composto)
  - `event + customer + status` (composto)
  - `customerData.cpfHash + event + status` (composto)
  - `customerData.email + event + status` (composto)
- **Ticket Model**: 6 índices
  - `code` (único)
  - `event`, `order`, `holder`, `status`, `isActive`
- **Event Model**: 6 índices incluindo text search
  - Text search em `name` e `description`
  - `date`, `status`, `organizer`, `city + state`
- **TicketType Model**: 5 índices
  - `event + name + lotNumber` (único composto)
  - `event + isActive + deletedAt` (composto)

### 2. **Connection Pooling** ✅
- Configurado em `backend/src/config/database.ts`:
  - `maxPoolSize: 10`
  - `serverSelectionTimeoutMS: 30000`
  - `socketTimeoutMS: 45000`
  - `connectTimeoutMS: 30000`
  - `bufferCommands: false`

### 3. **Uso de .lean()** ✅ (Parcial)
- Algumas queries já usam `.lean()`:
  - `Order.findById().populate().lean()` (linhas 234, 298, 839, 933)
  - Isso retorna objetos JavaScript simples, mais rápidos que documentos Mongoose

### 4. **Uso de .select()** ✅ (Parcial)
- Algumas queries já limitam campos:
  - `Order.findOne().select('_id').lean()` (ordersController.ts:26)
  - `TicketType.find().select('name description price...')` (ticketTypesController.ts:151)
  - `Event.find().select('name description date...')` (eventsController.ts:158)

### 5. **Paginação** ✅
- Implementada em:
  - `ordersController.ts`: `.skip(skip).limit(limit).sort({ createdAt: -1 })`
  - `eventsController.ts`: `.skip(skip).limit(limit).sort({ createdAt: -1 })`

### 6. **Índices para Soft Delete** ✅
- `deletedAt` indexado em todos os modelos principais
- Facilita queries que filtram documentos não deletados

---

## ⚠️ Oportunidades de Melhoria

### 1. **Queries sem .lean()** 🔴 CRÍTICO
**Problema**: Várias queries retornam documentos Mongoose completos quando poderiam retornar objetos simples.

**Localizações**:
- `paymentController.ts:23-26`: `validateAndGetOrder` - não usa `.lean()`
- `paymentController.ts:101-104`: `Ticket.find().populate()` - não usa `.lean()`
- `paymentController.ts:588-592`: `Ticket.find()` - não usa `.lean()`
- `paymentController.ts:1134-1138`: `Ticket.find()` - não usa `.lean()`

**Impacto**: Documentos Mongoose têm overhead de ~30-50% comparado a objetos simples.

**Solução**: Adicionar `.lean()` quando não precisar de métodos Mongoose.

### 2. **Queries sem .select()** 🟡 IMPORTANTE
**Problema**: Muitas queries retornam todos os campos quando apenas alguns são necessários.

**Localizações**:
- `paymentController.ts:23-26`: `validateAndGetOrder` popula campos desnecessários
  - Popula `customer` com `name email phone cpf` mas só usa `email` e `name`
  - Popula `tickets` com `ticketType` mas não limita campos do ticket
- `paymentController.ts:101-104`: `Ticket.find().populate()` não limita campos

**Impacto**: Transferência de dados desnecessários do MongoDB.

**Solução**: Usar `.select()` para limitar campos retornados.

### 3. **Queries N+1 Potenciais** 🟡 IMPORTANTE
**Problema**: Algumas queries podem causar múltiplas consultas ao banco.

**Localizações**:
- `paymentController.ts:101-104`: Busca tickets e depois popula `ticketType` individualmente
- `paymentController.ts:588-592`: Busca tickets sem populate, pode precisar buscar tipos depois

**Solução**: Usar `.populate()` com `.select()` ou usar `aggregate()` para joins eficientes.

### 4. **Falta de Cache** 🟡 IMPORTANTE
**Problema**: Não há cache implementado para dados frequentemente acessados.

**Oportunidades**:
- Cache de eventos publicados (TTL: 5-10 minutos)
- Cache de tipos de ingresso por evento (TTL: 1-2 minutos)
- Cache de configurações do sistema

**Solução**: Implementar cache em memória (Node-cache) ou Redis para produção.

### 5. **Connection Pooling Pode Ser Aumentado** 🟢 OPCIONAL
**Problema**: `maxPoolSize: 10` pode ser insuficiente para alta concorrência.

**Solução**: Aumentar para 20-50 dependendo do tráfego esperado.

### 6. **Falta de Rate Limiting** 🟡 IMPORTANTE
**Problema**: Não há rate limiting implementado para proteger a API.

**Solução**: Implementar `express-rate-limit` ou similar.

### 7. **Falta de Compressão de Respostas** 🟢 OPCIONAL
**Problema**: Respostas JSON não são comprimidas.

**Solução**: Adicionar `compression` middleware do Express.

### 8. **Queries sem Índices Compostos Otimizados** 🟢 OPCIONAL
**Problema**: Algumas queries frequentes podem se beneficiar de índices compostos adicionais.

**Sugestões**:
- `Ticket`: `{ order: 1, status: 1, deletedAt: 1 }` (composto)
- `Order`: `{ customer: 1, status: 1, deletedAt: 1 }` (composto)

---

## 📊 Priorização de Melhorias

### 🔴 **Alta Prioridade** (Impacto Alto, Esforço Baixo)
1. Adicionar `.lean()` em queries que não precisam de métodos Mongoose
2. Adicionar `.select()` para limitar campos retornados
3. Implementar rate limiting básico

### 🟡 **Média Prioridade** (Impacto Médio, Esforço Médio)
4. Implementar cache para dados frequentemente acessados
5. Otimizar queries N+1 com `.populate()` adequado
6. Adicionar índices compostos adicionais

### 🟢 **Baixa Prioridade** (Impacto Baixo, Esforço Variável)
7. Aumentar connection pool size
8. Adicionar compressão de respostas
9. Implementar query result caching avançado

---

## 🎯 Métricas Esperadas

Após implementar as melhorias de alta prioridade:
- **Redução de tempo de resposta**: 20-40% em queries de leitura
- **Redução de uso de memória**: 15-25% (com `.lean()`)
- **Redução de tráfego de rede**: 10-30% (com `.select()`)
- **Melhor proteção**: Rate limiting previne abusos

---

## 📝 Notas Finais

O código já tem uma base sólida de otimizações:
- ✅ Índices bem definidos
- ✅ Connection pooling configurado
- ✅ Paginação implementada
- ✅ Algum uso de `.lean()` e `.select()`

As principais oportunidades estão em:
- 🔴 Aplicar `.lean()` e `.select()` de forma mais consistente
- 🟡 Implementar cache para dados estáticos/frequentes
- 🟡 Adicionar rate limiting para proteção

