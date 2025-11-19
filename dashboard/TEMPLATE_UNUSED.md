# 📦 Componentes do Template Não Utilizados

Este documento lista todos os componentes do tema **Vuexy** que não estão sendo utilizados no EventHub.

## 🎯 Objetivo

Manter registro dos componentes não utilizados para:
- Facilitar remoção gradual no futuro
- Servir como referência para desenvolvimento
- Identificar oportunidades de otimização

---

## ❌ DASHBOARDS NÃO UTILIZADOS

### `/src/views/dashboards/`

| Componente | Status | Uso no EventHub | Ação Futura |
|-----------|--------|-----------------|-------------|
| `analytics/` | ❌ Não usado | Template demo | Remover Fase 1 |
| `ecommerce/` | ❌ Não usado | Template demo | Remover Fase 1 |
| `academy/` | ❌ Não usado | Template demo | Remover Fase 1 |
| `logistics/` | ❌ Não usado | Template demo | Remover Fase 1 |
| `crm/` | ✅ **USADO** | Dashboard principal | **MANTER** |

**Tamanho estimado:** ~150KB  
**Benefício de remoção:** Redução de ~15-20% do bundle

---

## ❌ APPS NÃO UTILIZADOS

### `/src/views/apps/`

| Componente | Status | Dependências | Tamanho Est. | Ação |
|-----------|--------|--------------|--------------|------|
| `academy/` | ❌ Não usado | - | ~30KB | Remover Fase 2 |
| `calendar/` | ❌ Não usado | `@fullcalendar/*` | ~80KB | Remover Fase 2 |
| `chat/` | ❌ Não usado | - | ~40KB | Remover Fase 2 |
| `email/` | ❌ Não usado | - | ~60KB | Remover Fase 2 |
| `ecommerce/` | ❌ Não usado | - | ~70KB | Remover Fase 2 |
| `invoice/` | ❌ Não usado | - | ~50KB | Remover Fase 2 |
| `kanban/` | ❌ Não usado | `@formkit/drag-and-drop` | ~45KB | Remover Fase 2 |
| `logistics/` | ❌ Não usado | - | ~55KB | Remover Fase 2 |
| **`user/`** | ✅ **USADO** | - | - | **MANTER** |
| **`promoters/`** | ✅ **USADO** | - | - | **MANTER** |
| **`events/`** | ✅ **USADO** | - | - | **MANTER** |
| **`admin-dashboard/`** | ✅ **USADO** | - | - | **MANTER** |

**Tamanho total não usado:** ~430KB  
**Benefício de remoção:** Redução de ~40-50% do bundle de apps

---

## ❌ PÁGINAS NÃO UTILIZADAS

### `/src/views/pages/`

| Página | Status | Uso | Ação |
|--------|--------|-----|------|
| `faq/` | ❌ Não usado | Template | Remover Fase 1 |
| `pricing/` | ❌ Não usado | Template | Remover Fase 1 |
| `user-profile/` | ❌ Não usado | Template | Considerar uso futuro |
| `account-settings/` | ✅ **USADO** | Settings do usuário | **MANTER** |
| `misc/coming-soon` | ❌ Não usado | Template | Remover Fase 1 |
| `misc/under-maintenance` | ❌ Não usado | Template | Remover Fase 1 |
| `misc/404-not-found` | ⚠️ Usado parcial | Error page | Manter por enquanto |
| `misc/401-not-authorized` | ⚠️ Usado parcial | Auth error | Manter por enquanto |

---

## ❌ COMPONENTES DE EXEMPLO

### `/src/views/forms/`

| Componente | Status | Notas |
|-----------|--------|-------|
| Todos os exemplos | ❌ Não usado | Apenas demos |

**Ação:** Remover Fase 3 (após validar que não há referências)

### `/src/views/charts/`

| Componente | Status | Dependência | Notas |
|-----------|--------|-------------|-------|
| Todos os exemplos | ❌ Não usado | `apexcharts`, `recharts` | Verificar se gráficos são usados no CRM |

**Ação:** Verificar uso real de gráficos antes de remover

### `/src/views/react-table/`

| Componente | Status | Notas |
|-----------|--------|-------|
| Exemplos de tabelas | ❌ Não usado | Apenas demos |

**Ação:** Remover Fase 3 (tabelas reais estão em `apps/`)

---

## 📦 DEPENDÊNCIAS NÃO UTILIZADAS

### Candidatas para Remoção (Verificar antes)

| Pacote | Tamanho | Usado Por | Verificação Necessária |
|--------|---------|-----------|------------------------|
| `@fullcalendar/*` | ~150KB | Calendar app | ❌ Não usado → Remover |
| `@formkit/drag-and-drop` | ~20KB | Kanban board | ❌ Não usado → Remover |
| `apexcharts` | ~500KB | Charts | ⚠️ Verificar se CRM usa |
| `recharts` | ~350KB | Charts | ⚠️ Verificar se CRM usa |
| `emoji-mart` | ~100KB | Chat/Email | ❌ Não usado → Remover |

**Total estimado:** ~1.1MB (se todos forem removidos)

### Dependências MANTER

| Pacote | Motivo |
|--------|--------|
| `@mui/material` | Framework UI principal |
| `@tiptap/*` | Editor de texto (eventos) |
| `next-auth` | Autenticação |
| `valibot` | Validação de formulários |
| `@tanstack/react-table` | Tabelas (users, events) |

---

## 🗂️ ARQUIVOS ESTÁTICOS NÃO UTILIZADOS

### `/public/images/`

| Pasta | Tamanho Est. | Status | Ação |
|-------|-------------|--------|------|
| `apps/academy/` | ~200KB | ❌ Não usado | Remover Fase 2 |
| `apps/ecommerce/` | ~500KB | ❌ Não usado | Remover Fase 2 |
| `apps/kanban/` | ~50KB | ❌ Não usado | Remover Fase 2 |
| `apps/logistics/` | ~100KB | ❌ Não usado | Remover Fase 2 |
| `front-pages/` | ~400KB | ❌ Não usado | Remover Fase 1 |
| `logos/` | ~300KB | ⚠️ Verificar | Verificar uso |

**Total de imagens não usadas:** ~1.5MB

---

## 📊 RESUMO DE IMPACTO

### Remoção Imediata Segura (Fase 1)
- **Dashboards demo:** ~150KB
- **Páginas misc:** ~80KB
- **Front-pages images:** ~400KB
- **Total Fase 1:** ~630KB

### Remoção Após Validação (Fase 2)
- **Apps não usados:** ~430KB
- **Imagens de apps:** ~850KB
- **Dependencies:** ~270KB (@fullcalendar, @formkit)
- **Total Fase 2:** ~1.5MB

### Remoção com Cuidado (Fase 3)
- **Forms examples:** ~50KB
- **Charts examples:** ~40KB
- **React-table examples:** ~30KB
- **Dependencies (se não usadas):** ~850KB (apexcharts, recharts)
- **Total Fase 3:** ~970KB

### **GANHO TOTAL POTENCIAL: ~3.1MB** 📉

---

## 🎯 PLANO DE REMOÇÃO GRADUAL

### Fase 1: Seguro (Pós-MVP 1.0) ⏱️ 2h
1. Remover dashboards demo
2. Remover páginas misc não usadas
3. Remover imagens front-pages
4. **Ganho:** ~630KB

### Fase 2: Validado (Após 1 mês em produção) ⏱️ 4h
1. Remover apps não usados (calendar, chat, email, etc)
2. Remover imagens de apps
3. Remover @fullcalendar e @formkit
4. **Ganho:** ~1.5MB

### Fase 3: Otimização Final (Após 3 meses) ⏱️ 6h
1. Verificar uso real de apexcharts/recharts
2. Remover exemplos de forms/charts/tables
3. Remover dependências não utilizadas
4. **Ganho:** ~970MB

---

## ⚠️ AVISOS IMPORTANTES

### NÃO Remover Sem Verificar:
- ✅ `@mui/material` - Framework principal
- ✅ `@tiptap/*` - Editor de eventos
- ✅ `next-auth` - Autenticação
- ✅ `valibot` - Validação
- ✅ `@tanstack/react-table` - Tabelas

### Verificar Uso Antes de Remover:
- ⚠️ `apexcharts` - Pode estar em gráficos do CRM
- ⚠️ `recharts` - Pode estar em gráficos do CRM
- ⚠️ Imagens em `/public/logos/` - Verificar referências

### Tree-Shaking Automático:
- Next.js já faz tree-shaking no build
- Componentes não importados não vão para o bundle
- Remoção física é mais para organização do código

---

## 🔍 COMO VERIFICAR USO

### Buscar Importações
```bash
# Verificar se um componente é usado
grep -r "from '@/views/dashboards/analytics'" dashboard/src/

# Verificar imports de dependência
grep -r "from 'apexcharts'" dashboard/src/
```

### Analisar Bundle
```bash
# Build de produção
npm run build

# Verificar tamanho
# Next.js mostra análise de bundle após build
```

### Ferramenta Bundle Analyzer
```bash
# Instalar
npm install -D @next/bundle-analyzer

# Configurar em next.config.ts
# Rodar análise
ANALYZE=true npm run build
```

---

## 📝 NOTAS

- Este documento deve ser atualizado conforme componentes são removidos
- Sempre fazer backup antes de remover código
- Testar completamente após cada fase de remoção
- Monitorar bundle size no CI/CD

---

**Última atualização:** 19/11/2025  
**Versão:** 1.0  
**Status:** Documentação inicial completa

