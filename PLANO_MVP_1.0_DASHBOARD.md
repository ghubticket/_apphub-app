# 📋 PLANO MVP 1.0 - DASHBOARD ADMIN

## 🎯 Status Atual
- ✅ Dashboard funcional com autenticação
- ✅ Integração com backend (HTTPS + certificados)
- ✅ Sistema de roles (ADMIN, QRCODE, CLIENTE)
- ✅ Guards de rota implementados
- ⚠️ Template comercial com muitos componentes não utilizados

---

## 🔒 SEGURANÇA - Checklist de Implementação

### ✅ JÁ IMPLEMENTADO

#### 1. Autenticação
- ✅ NextAuth.js configurado
- ✅ JWT com tokens de acesso e refresh
- ✅ Sessões gerenciadas (30 dias)
- ✅ Logout implementado

#### 2. Autorização
- ✅ Sistema de roles (ADMIN, QRCODE, CLIENTE)
- ✅ Route Guards (`AuthGuard`, `RouteGuard`, `RoleGuard`)
- ✅ Permissões por recurso e ação
- ✅ Verificação de permissões client-side

#### 3. Validação de Inputs
- ✅ Validação com Valibot em formulários
- ✅ Schemas de validação (promoters, events, tickets)
- ✅ Sanitização de CPF, WhatsApp, Email
- ✅ Validação de uploads (tamanho, tipo)

#### 4. Comunicação Segura
- ✅ HTTPS configurado (certificado autoassinado para dev)
- ✅ NODE_TLS_REJECT_UNAUTHORIZED=0 para desenvolvimento
- ✅ API_URL apontando para backend HTTPS

### ⚠️ NECESSÁRIO IMPLEMENTAR

#### 1. **Rate Limiting no Dashboard** (CRÍTICO)
**Status:** ❌ Não implementado  
**Impacto:** Alto - Previne ataques de força bruta no login  
**Ação:** 
- Implementar rate limiting no login (já existe no backend)
- Adicionar mensagem de bloqueio temporário
- **Arquivo:** `dashboard/src/views/Login.tsx` já tem `useRateLimit` ✅

#### 2. **CSRF Protection** (IMPORTANTE)
**Status:** ⚠️ Parcial - NextAuth tem proteção nativa  
**Impacto:** Médio  
**Ação:**
- Validar se CSRF está ativo no NextAuth
- Adicionar tokens CSRF em formulários POST/PUT/DELETE customizados
- **Próximo passo:** Verificar `next-auth` CSRF config

#### 3. **XSS Protection** (CRÍTICO)
**Status:** ⚠️ Parcial - React tem proteção básica  
**Impacto:** Alto  
**Ação:**
- ✅ TipTap editor já sanitiza HTML
- ❌ Adicionar DOMPurify para sanitizar HTML renderizado
- ❌ Validar outputs do editor antes de salvar
- **Próximo passo:** Instalar e configurar `isomorphic-dompurify`

#### 4. **SQL Injection** (CRÍTICO)
**Status:** ✅ Protegido - Backend usa Mongoose (NoSQL)  
**Impacto:** N/A (MongoDB)  
**Ação:** Nenhuma necessária

#### 5. **Content Security Policy (CSP)** (IMPORTANTE)
**Status:** ❌ Não configurado  
**Impacto:** Médio  
**Ação:**
- Adicionar headers CSP no `next.config.ts`
- Permitir apenas recursos confiáveis
- **Próximo passo:** Configurar CSP headers

#### 6. **Sanitização de Dados Sensíveis nos Logs** (IMPORTANTE)
**Status:** ⚠️ Logs expostos em desenvolvimento  
**Impacto:** Médio  
**Ação:**
- Remover `console.log` de credenciais (auth.ts linha 35-47)
- Adicionar logger estruturado
- **Próximo passo:** Substituir console.log por logger

#### 7. **Variáveis de Ambiente** (CRÍTICO)
**Status:** ⚠️ Arquivo sem ponto (env.local ao invés de .env.local)  
**Impacto:** Alto - .env.local não é lido  
**Ação:**
- ✅ Renomear `env.local` para `.env.local` 
- ❌ Validar variáveis no startup
- ❌ Adicionar `.env.example` completo
- **Próximo passo:** Criar validação de env vars

#### 8. **Session Timeout** (IMPLEMENTADO)
**Status:** ✅ Implementado  
**Arquivo:** `dashboard/src/components/SessionTimeoutModal.tsx`  
**Ação:** Nenhuma necessária

#### 9. **Audit Log no Frontend** (OPCIONAL)
**Status:** ❌ Não implementado  
**Impacto:** Baixo - Backend já tem audit log  
**Ação:** Considerar para futuras versões

---

## 🧹 OTIMIZAÇÃO - Remoção de Código Não Utilizado

### 📊 Análise do Template

O dashboard usa o tema **Vuexy** (template comercial premium) que contém:

#### ✅ **Componentes USADOS (EventHub)**
```
dashboard/src/app/[lang]/(dashboard)/(private)/apps/
├── events/          ✅ Gestão de Eventos
├── promoters/       ✅ Códigos de Promoter
├── user/           ✅ Gestão de Usuários
└── admin-dashboard/ ✅ Dashboard Admin
```

#### ❌ **Componentes NÃO USADOS (Template)**
```
dashboard/src/views/
├── dashboards/
│   ├── analytics/   ❌ Dashboard Analytics (template)
│   ├── ecommerce/   ❌ Dashboard E-commerce (template)
│   ├── academy/     ❌ Dashboard Academy (template)
│   └── logistics/   ❌ Dashboard Logistics (template)
├── apps/
│   ├── academy/     ❌ App Academy
│   ├── calendar/    ❌ Calendário
│   ├── chat/        ❌ Chat
│   ├── email/       ❌ Email client
│   ├── ecommerce/   ❌ E-commerce
│   ├── invoice/     ❌ Invoices
│   ├── kanban/      ❌ Kanban board
│   └── logistics/   ❌ Logistics
├── charts/          ❌ Exemplos de gráficos
├── forms/           ❌ Exemplos de formulários
└── pages/
    ├── faq/         ❌ FAQ
    ├── pricing/     ❌ Pricing
    └── misc/        ❌ Páginas diversas
```

#### 📦 **Dependências Não Utilizadas (Potencial)**
```json
"@fullcalendar/*"      ❌ Calendário (não usado)
"@formkit/drag-and-drop" ⚠️ Usado no Kanban (não usado)
"apexcharts"           ⚠️ Usado em gráficos (verificar uso real)
"recharts"             ⚠️ Usado em gráficos (verificar uso real)
```

### 🎯 **Estratégia de Otimização**

#### **OPÇÃO 1: Manter Template Completo (RECOMENDADO para MVP 1.0)**
**Vantagens:**
- ✅ Acesso rápido a componentes para novas features
- ✅ Exemplos prontos para referência
- ✅ Menos risco de quebrar algo
- ✅ Fácil adicionar dashboards/features no futuro

**Desvantagens:**
- ❌ Bundle maior (~300-500KB extras)
- ❌ node_modules maior

**Ação:**
- Manter código do template
- Documentar componentes não utilizados
- Criar `.templateignore` para build de produção

#### **OPÇÃO 2: Remoção Gradual (RECOMENDADO pós-MVP)**
**Fases:**
1. **Fase 1 (Pós-MVP 1.0):** Remover páginas não usadas
2. **Fase 2:** Remover componentes grandes (calendar, kanban, email)
3. **Fase 3:** Tree-shaking automático no build
4. **Fase 4:** Remover dependências não utilizadas

**Ganho estimado:**
- Bundle: -30% a -40%
- node_modules: -100MB a -200MB
- Tempo de build: -20%

#### **OPÇÃO 3: Remoção Imediata (NÃO RECOMENDADO)**
**Risco:** Alto de quebrar dependências  
**Tempo:** 8-12h de trabalho  
**Benefício:** Imediato mas arriscado

---

## 🚀 PLANO DE AÇÃO - MVP 1.0

### **PRIORIDADE ALTA** (Antes de DEV)

1. **✅ Renomear env.local para .env.local**
   - Status: ✅ CONCLUÍDO
   - Tempo: 1min

2. **✅ Remover Logs Sensíveis**
   - Arquivo: `dashboard/src/libs/auth.ts`
   - Status: ✅ CONCLUÍDO
   - **Ação:** Console.log de credenciais removidos

3. **✅ Configurar CSP Headers**
   - Arquivo: `dashboard/next.config.ts`
   - Status: ✅ CONCLUÍDO
   - **Ação:** Content-Security-Policy, HSTS, X-Frame-Options configurados

4. **✅ Adicionar DOMPurify para XSS**
   - Pacote: `isomorphic-dompurify`
   - Status: ✅ CONCLUÍDO
   - **Ação:** Utility criado (`src/utils/sanitize.ts`) e integrado no editor de eventos

5. **✅ Validar Variáveis de Ambiente**
   - Status: ✅ CONCLUÍDO
   - **Ação:** Script de validação criado (`src/utils/validateEnv.ts`) e integrado no startup

6. **✅ Documentar Componentes Não Utilizados**
   - Status: ✅ CONCLUÍDO
   - **Ação:** `TEMPLATE_UNUSED.md` criado com análise completa

### **PRIORIDADE MÉDIA** (Pós-Deploy DEV)

7. **❌ Implementar Logger Estruturado**
   - Pacote: `winston` ou `pino`
   - Tempo: 2h
   - **Ação:** Substituir console.log

8. **❌ Adicionar Testes E2E Básicos**
   - Ferramenta: Playwright ou Cypress
   - Tempo: 4h
   - **Ação:** Testes de login, criação de evento

9. **❌ Otimizar Bundle (Tree-shaking)**
   - Tempo: 2h
   - **Ação:** Configurar next.config para remover código morto

### **PRIORIDADE BAIXA** (Futuro)

10. **❌ Remover Componentes Não Utilizados**
    - Tempo: 8-12h
    - **Ação:** Seguir OPÇÃO 2 (Remoção Gradual)

11. **❌ Implementar Monitoramento**
    - Ferramenta: Sentry (já configurado no backend)
    - Tempo: 1h

12. **❌ Adicionar Testes Unitários**
    - Ferramenta: Jest + React Testing Library
    - Tempo: 6-8h

---

## 📝 CHECKLIST FINAL ANTES DE DEPLOY DEV

### Segurança
- [ ] `.env.local` criado e configurado
- [ ] Logs sensíveis removidos
- [ ] CSP headers configurados
- [ ] DOMPurify instalado e configurado
- [ ] Variáveis de ambiente validadas
- [ ] HTTPS funcionando corretamente
- [ ] Rate limiting testado

### Funcionalidades
- [ ] Login/Logout funcionando
- [ ] Criação de eventos testada
- [ ] Gestão de usuários funcionando
- [ ] Códigos de promoter testados
- [ ] Permissões por role validadas

### Performance
- [ ] Build de produção testado
- [ ] Bundle size verificado (target: <500KB)
- [ ] Lighthouse score > 80

### Documentação
- [ ] README.md atualizado
- [ ] Variáveis de ambiente documentadas
- [ ] Componentes não utilizados documentados

---

## 📊 ESTIMATIVA DE TEMPO

| Tarefa | Prioridade | Tempo | Status |
|--------|-----------|-------|--------|
| Renomear .env | Alta | 1min | ✅ |
| Remover logs sensíveis | Alta | 15min | ✅ |
| CSP headers | Alta | 30min | ✅ |
| DOMPurify | Alta | 1h | ✅ |
| Validar env vars | Alta | 30min | ✅ |
| Documentar unused | Alta | 1h | ✅ |
| **TOTAL PRIORIDADE ALTA** | | **3h 16min** | **✅ COMPLETO** |
| Logger estruturado | Média | 2h | ❌ |
| Testes E2E | Média | 4h | ❌ |
| Otimizar bundle | Média | 2h | ❌ |
| **TOTAL PRIORIDADE MÉDIA** | | **8h** | |

**Tempo total para MVP 1.0 pronto para DEV: ~3-4 horas**

---

## 🎯 RECOMENDAÇÃO FINAL

### Para MVP 1.0:
1. **FAZER AGORA (3-4h):**
   - Remover logs sensíveis
   - Configurar CSP
   - Adicionar DOMPurify
   - Validar env vars
   - Documentar componentes não usados

2. **NÃO FAZER AGORA:**
   - Remover componentes do template (manter para referência)
   - Remover dependências (pode quebrar)
   - Testes extensivos (fazer pós-deploy)

3. **ESTRATÉGIA DE OTIMIZAÇÃO:**
   - Manter template completo no MVP 1.0
   - Remover gradualmente após validar MVP em produção
   - Usar tree-shaking automático do Next.js para build

### Próximos Passos:
```bash
# 1. Implementar segurança (3-4h)
# 2. Testar localmente
# 3. Deploy para DEV
# 4. Validar em DEV
# 5. Planejar remoção gradual de componentes
```

---

## 📌 OBSERVAÇÕES

- ✅ O dashboard já está bem seguro (autenticação, autorização, validação)
- ⚠️ Principais gaps: CSP, DOMPurify, logs sensíveis
- 💡 Template comercial é útil - não remover antes do MVP validado
- 🎯 Foco: Segurança > Performance para MVP 1.0
- 📈 Performance pode ser otimizada gradualmente

---

**Criado:** 19/11/2025  
**Versão:** 1.0  
**Status:** Em Progresso

