# 🏢 Plano de Arquitetura Multi-Tenant SaaS

## 📋 Visão Geral

Transformar o sistema atual em uma plataforma SaaS multi-tenant onde:
- **Vicente** = Plataforma base (orquestrador)
- **Clientes** = Organizações independentes (guilherme.com.br, jose.com.br, etc.)
- Cada cliente tem seus próprios: eventos, pedidos, tickets, usuários admin, configurações

---

## 🎯 Objetivos

1. ✅ Isolamento completo de dados por tenant
2. ✅ Performance otimizada (caching, índices)
3. ✅ Escalabilidade horizontal
4. ✅ Facilidade de manutenção
5. ✅ Migração gradual sem downtime

---

## 🏗️ Estratégias de Multi-Tenancy

### Opção 1: **Row-Level Security (Recomendada para MongoDB)**
**Como funciona:**
- Todos os tenants compartilham o mesmo banco de dados
- Cada documento tem um campo `tenantId` ou `organizationId`
- Middleware adiciona filtro automático em todas as queries

**Vantagens:**
- ✅ Fácil implementação
- ✅ Manutenção simples (um banco)
- ✅ Backup/restore único
- ✅ Performance boa com índices corretos
- ✅ Ideal para Railway (um banco MongoDB)

**Desvantagens:**
- ⚠️ Requer disciplina no código (sempre filtrar por tenant)
- ⚠️ Backup parcial por tenant é mais complexo

**Performance:**
- Índices compostos: `{ tenantId: 1, _id: 1 }`
- Cache por tenant no Redis (opcional)

---

### Opção 2: **Database per Tenant**
**Como funciona:**
- Cada tenant tem seu próprio banco de dados
- Conexão dinâmica baseada no tenant

**Vantagens:**
- ✅ Isolamento total
- ✅ Backup individual fácil
- ✅ Escalabilidade por tenant

**Desvantagens:**
- ❌ Complexidade alta (múltiplas conexões)
- ❌ Custo maior (múltiplos bancos)
- ❌ Migrações complexas
- ❌ Não ideal para Railway (limite de conexões)

---

### Opção 3: **Schema per Tenant (MongoDB Collections)**
**Como funciona:**
- Cada tenant tem collections separadas: `events_tenant1`, `orders_tenant1`

**Vantagens:**
- ✅ Isolamento de dados
- ✅ Queries mais simples

**Desvantagens:**
- ❌ Migrações complexas
- ❌ Queries cross-tenant difíceis
- ❌ Manutenção complexa

---

## ✅ **RECOMENDAÇÃO: Opção 1 - Row-Level Security**

**Motivos:**
1. Melhor custo-benefício
2. Performance adequada com índices
3. Facilita analytics cross-tenant (opcional)
4. Ideal para Railway (um banco MongoDB)
5. Migração mais simples

---

## 🏛️ Arquitetura Proposta

### 1. **Modelo de Dados**

#### **Novo Modelo: Organization (Tenant)**
```typescript
interface IOrganization {
  _id: ObjectId
  name: string                    // "Guilherme Eventos"
  slug: string                    // "guilherme" (único)
  domain: string                  // "guilherme.com.br"
  subdomain?: string              // "guilherme" (opcional)
  customDomain?: string           // "guilherme.com.br"
  status: 'active' | 'suspended' | 'trial'
  plan: 'free' | 'basic' | 'premium' | 'enterprise'
  settings: {
    platformFeePercentage: number
    currency: string
    timezone: string
    language: string
    logo?: string
    primaryColor?: string
    // ... outras configurações
  }
  owner: ObjectId                 // User que criou/é dono
  admins: ObjectId[]             // Usuários admin desta org
  createdAt: Date
  updatedAt: Date
}
```

#### **Modificações nos Modelos Existentes**

Todos os modelos precisam de `organizationId`:

```typescript
// Event.ts
interface IEvent {
  // ... campos existentes
  organizationId: ObjectId        // NOVO - referência à Organization
  organizer: ObjectId             // Mantém (pode ser de qualquer org)
  // ...
}

// Order.ts
interface IOrder {
  // ... campos existentes
  organizationId: ObjectId        // NOVO
  // ...
}

// User.ts
interface IUser {
  // ... campos existentes
  organizationId?: ObjectId       // NOVO - opcional (usuários globais)
  organizations: ObjectId[]      // NOVO - múltiplas orgs (se permitido)
  // ...
}
```

---

### 2. **Identificação do Tenant**

#### **Estratégia 1: Subdomain (Recomendada)**
```
guilherme.vicente.app → tenant: "guilherme"
jose.vicente.app → tenant: "jose"
```

#### **Estratégia 2: Custom Domain**
```
guilherme.com.br → tenant: "guilherme" (via DNS/banco)
jose.com.br → tenant: "jose"
```

#### **Estratégia 3: Header/Query Parameter**
```
api.vicente.app?tenant=guilherme
api.vicente.app (Header: X-Tenant-ID: guilherme)
```

**Implementação:**
```typescript
// middleware/tenantResolver.ts
export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Tentar subdomain
  const hostname = req.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // 2. Tentar custom domain
  const org = await Organization.findOne({
    $or: [
      { subdomain: subdomain },
      { customDomain: hostname }
    ],
    status: 'active'
  })
  
  if (!org) {
    return res.status(404).json({ error: 'Tenant não encontrado' })
  }
  
  // Adicionar ao request
  (req as any).tenant = org
  (req as any).tenantId = org._id
  
  next()
}
```

---

### 3. **Middleware de Isolamento**

```typescript
// middleware/tenantIsolation.ts
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = (req as any).tenantId
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant não identificado' })
  }
  
  // Adicionar helper para queries
  (req as any).addTenantFilter = (query: any) => {
    return { ...query, organizationId: tenantId }
  }
  
  next()
}
```

**Uso nos Controllers:**
```typescript
// Antes
const events = await Event.find({ isActive: true })

// Depois
const events = await Event.find({
  ...req.addTenantFilter({}),
  isActive: true
})
```

---

### 4. **Estrutura de Pastas**

```
backend/
├── src/
│   ├── models/
│   │   ├── Organization.ts          # NOVO
│   │   ├── Event.ts                # MODIFICADO (add organizationId)
│   │   ├── Order.ts                # MODIFICADO
│   │   └── ...
│   ├── middleware/
│   │   ├── tenantResolver.ts       # NOVO - identifica tenant
│   │   ├── tenantIsolation.ts     # NOVO - força isolamento
│   │   └── ...
│   ├── services/
│   │   ├── organizationService.ts  # NOVO
│   │   └── ...
│   └── controllers/
│       ├── organizationsController.ts  # NOVO
│       └── ...
```

---

## 📊 Índices MongoDB (Performance)

```typescript
// Event.ts
eventSchema.index({ organizationId: 1, isActive: 1 })
eventSchema.index({ organizationId: 1, date: 1 })
eventSchema.index({ organizationId: 1, status: 1 })

// Order.ts
orderSchema.index({ organizationId: 1, status: 1 })
orderSchema.index({ organizationId: 1, createdAt: -1 })
orderSchema.index({ organizationId: 1, customer: 1 })

// User.ts
userSchema.index({ organizationId: 1, email: 1 })
userSchema.index({ organizationId: 1, role: 1 })

// Ticket.ts
ticketSchema.index({ organizationId: 1, status: 1 })
ticketSchema.index({ organizationId: 1, order: 1 })
```

---

## 🔄 Migração de Dados

### Fase 1: Preparação (Sem Downtime)
1. Criar modelo `Organization`
2. Criar organização padrão "Vicente" (tenant principal)
3. Adicionar campo `organizationId` aos modelos (opcional inicialmente)
4. Criar índices

### Fase 2: Migração Gradual
1. Script para popular `organizationId` em documentos existentes
2. Atualizar código para sempre incluir `organizationId` em queries
3. Validar isolamento

### Fase 3: Ativação
1. Ativar middleware de tenant
2. Testar com novo tenant
3. Migrar dados existentes para tenant "vicente"

**Script de Migração:**
```typescript
// scripts/migrateToMultiTenant.ts
async function migrateToMultiTenant() {
  // 1. Criar organização padrão
  const defaultOrg = await Organization.create({
    name: 'Vicente',
    slug: 'vicente',
    domain: 'vicente.app',
    status: 'active',
    plan: 'enterprise'
  })
  
  // 2. Atualizar todos os documentos
  await Event.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrg._id } }
  )
  
  await Order.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrg._id } }
  )
  
  // ... outros modelos
}
```

---

## 🚀 Implementação Passo a Passo

### **Etapa 1: Modelo Organization** (1-2 dias)
- [ ] Criar modelo `Organization`
- [ ] Criar controller e rotas
- [ ] Testes unitários

### **Etapa 2: Middleware de Tenant** (2-3 dias)
- [ ] `tenantResolver.ts` - identificar tenant
- [ ] `tenantIsolation.ts` - forçar isolamento
- [ ] Integrar no `server.ts`
- [ ] Testes de isolamento

### **Etapa 3: Modificar Modelos** (3-5 dias)
- [ ] Adicionar `organizationId` em todos os modelos
- [ ] Criar índices compostos
- [ ] Atualizar interfaces TypeScript
- [ ] Migração de dados existentes

### **Etapa 4: Atualizar Controllers** (5-7 dias)
- [ ] Atualizar todas as queries para incluir `organizationId`
- [ ] Validar permissões (usuário pertence à org?)
- [ ] Testes de integração

### **Etapa 5: Frontend Multi-Tenant** (3-5 dias)
- [ ] Detectar subdomain/custom domain
- [ ] Passar `tenantId` nas requisições
- [ ] Configurações por tenant (cores, logo, etc.)

### **Etapa 6: Dashboard Admin Global** (2-3 dias)
- [ ] Página de gerenciamento de organizações
- [ ] Criar/editar/suspender tenants
- [ ] Analytics global (opcional)

### **Etapa 7: Testes e Deploy** (3-5 dias)
- [ ] Testes end-to-end
- [ ] Performance testing
- [ ] Deploy gradual
- [ ] Monitoramento

**Total estimado: 20-30 dias**

---

## 🔐 Segurança

### 1. **Isolamento de Dados**
- Middleware sempre valida `tenantId`
- Queries nunca retornam dados de outros tenants
- Validação em todas as rotas

### 2. **Permissões**
```typescript
// Usuário só pode acessar dados da sua organização
const user = await User.findById(userId)
if (user.organizationId.toString() !== req.tenantId.toString()) {
  throw new Error('Acesso negado')
}
```

### 3. **Rate Limiting por Tenant**
```typescript
// middleware/rateLimiting.ts
const tenantRateLimit = rateLimit({
  keyGenerator: (req) => `${req.tenantId}-${req.ip}`,
  windowMs: 15 * 60 * 1000,
  max: 100
})
```

---

## 📈 Performance e Escalabilidade

### 1. **Caching (Redis - Opcional)**
```typescript
// Cache por tenant
const cacheKey = `tenant:${tenantId}:events:${eventId}`
await redis.setex(cacheKey, 3600, JSON.stringify(event))
```

### 2. **Índices MongoDB**
- Sempre incluir `organizationId` em índices compostos
- Índices específicos por tenant (se necessário)

### 3. **Connection Pooling**
- Railway MongoDB já gerencia pooling
- Manter configuração atual

### 4. **CDN para Assets**
- Vercel já faz isso automaticamente
- Assets por tenant (se necessário)

---

## 🌐 Deploy (Vercel + Railway)

### **Backend (Railway)**
```env
# .env
MONGODB_URI=mongodb://... (mesmo banco, múltiplos tenants)
NODE_ENV=production
```

### **Frontend (Vercel)**
```env
# .env
NEXT_PUBLIC_API_URL=https://api.vicente.app
NEXT_PUBLIC_MULTI_TENANT=true
```

**Vercel Config:**
```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/:subdomain*",
      "destination": "/"
    }
  ]
}
```

### **Custom Domains**
1. Cliente configura DNS apontando para Vercel
2. Vercel valida domínio
3. Backend identifica tenant pelo domínio

---

## 💰 Modelo de Negócio

### **Planos Sugeridos**
- **Free**: 1 organização, 5 eventos/mês
- **Basic**: 1 organização, eventos ilimitados
- **Premium**: Múltiplas organizações, analytics avançado
- **Enterprise**: Custom domain, suporte prioritário

### **Billing**
- Integração com Stripe/PagSeguro
- Webhook para atualizar `plan` da organização
- Limites por plano

---

## 🧪 Testes

### **Testes de Isolamento**
```typescript
describe('Tenant Isolation', () => {
  it('should not return events from other tenants', async () => {
    const tenant1 = await createTenant('tenant1')
    const tenant2 = await createTenant('tenant2')
    
    await createEvent(tenant1._id, 'Event 1')
    await createEvent(tenant2._id, 'Event 2')
    
    const events = await getEvents(tenant1._id)
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('Event 1')
  })
})
```

---

## 📝 Checklist de Implementação

### **Backend**
- [ ] Modelo `Organization`
- [ ] Middleware `tenantResolver`
- [ ] Middleware `tenantIsolation`
- [ ] Adicionar `organizationId` em todos os modelos
- [ ] Criar índices compostos
- [ ] Atualizar todos os controllers
- [ ] Script de migração
- [ ] Testes de isolamento

### **Frontend**
- [ ] Detectar tenant (subdomain/domain)
- [ ] Passar tenant nas requisições
- [ ] Configurações por tenant (UI)
- [ ] Dashboard admin global

### **Infraestrutura**
- [ ] Configurar Vercel para subdomains
- [ ] Configurar custom domains
- [ ] Monitoramento por tenant
- [ ] Logs por tenant

---

## 🚨 Riscos e Mitigações

### **Risco 1: Vazamento de Dados entre Tenants**
**Mitigação:**
- Middleware obrigatório em todas as rotas
- Testes automatizados de isolamento
- Code review rigoroso

### **Risco 2: Performance Degradada**
**Mitigação:**
- Índices compostos otimizados
- Cache Redis (opcional)
- Monitoramento de queries lentas

### **Risco 3: Migração de Dados**
**Mitigação:**
- Script de migração testado
- Backup antes da migração
- Rollback plan

---

## 📚 Próximos Passos

1. **Revisar e aprovar este plano**
2. **Criar branch `feature/multi-tenant`**
3. **Implementar Etapa 1 (Modelo Organization)**
4. **Testar isolamento básico**
5. **Iterar e melhorar**

---

## 🔗 Referências

- [MongoDB Multi-Tenancy Patterns](https://www.mongodb.com/docs/manual/core/security-row-level-access/)
- [Next.js Multi-Tenancy](https://nextjs.org/docs/advanced-features/multi-zones)
- [Railway MongoDB](https://docs.railway.app/databases/mongodb)

---

**Criado em:** 2025-01-XX  
**Versão:** 1.0  
**Autor:** Sistema de Planejamento

