# 🚨 Questões Críticas de Segurança

**Data:** 2025-12-02  
**Prioridade:** 🔴 **CRÍTICA**

---

## ⚠️ Questões Críticas Identificadas

### 🔴 1. JWT Secret - CRÍTICO

**Risco:** Se o JWT_SECRET for fraco ou padrão, atacantes podem:
- Forjar tokens JWT
- Acessar qualquer conta
- Escalar privilégios (virar admin)
- Acessar dados sensíveis

**Status Atual:**
- ✅ Código usa `process.env.JWT_SECRET`
- ⚠️ **NÃO há validação se o secret é forte**
- ⚠️ **Se não configurado, pode usar valor padrão ou falhar silenciosamente**

**Impacto:** 🔴 **CRÍTICO** - Comprometimento total do sistema

**Ação Imediata:**
```bash
# Verificar se JWT_SECRET está configurado e é forte (32+ caracteres)
# No .env de produção:
JWT_SECRET=seu-secret-super-seguro-minimo-32-caracteres-change-this-now
JWT_REFRESH_SECRET=seu-refresh-secret-super-seguro-minimo-32-caracteres-change-this-now
```

**Recomendação:**
- ✅ Adicionar validação no startup do servidor
- ✅ Falhar se secret for fraco ou não configurado
- ✅ Gerar secret forte automaticamente em dev (com aviso)

---

### ✅ 2. Cookies - VERIFICADO E SEGURO

**Status Atual:**
- ✅ Cookies configurados corretamente em `backend/src/middleware/cookies.ts:73`
- ✅ `httpOnly: true` - Previne acesso via JavaScript
- ✅ `secure: process.env.NODE_ENV === 'production'` - HTTPS em produção
- ✅ `sameSite: 'strict'` - Proteção CSRF

**Impacto:** ✅ **SEGURO** - Configuração correta implementada

**Código Verificado:**
```typescript
// backend/src/middleware/cookies.ts:73
res.cookie('apphub_access_token', newAccessToken, {
    httpOnly: true,        // ✅ Configurado
    secure: process.env.NODE_ENV === 'production', // ✅ Configurado
    sameSite: 'strict',    // ✅ Configurado
    maxAge: 15 * 60 * 1000, // 15 minutos
    path: '/',
});
```

**Conclusão:** ✅ **Nenhuma ação necessária** - Cookies estão seguros

---

## 🟡 Questões Importantes (Não Críticas)

### 🟡 3. QR Code Expiração (7 dias)

**Risco:** QR codes válidos por 7 dias podem ser:
- Usados após evento cancelado
- Reutilizados se não houver validação adequada

**Status Atual:**
- ✅ Proteção contra replay implementada
- ⚠️ Expiração de 7 dias pode ser muito longa

**Impacto:** 🟡 **MÉDIO** - Não crítico, mas melhora segurança

**Recomendação:**
- Reduzir para 24-48h ou tornar configurável por evento
- **Não é crítico** - sistema já tem proteções

---

### 🟡 4. Token Storage (localStorage)

**Risco:** Tokens em localStorage são vulneráveis a XSS

**Status Atual:**
- ⚠️ Frontend usa localStorage/sessionStorage
- ✅ Backend também suporta cookies (mais seguro)

**Impacto:** 🟡 **MÉDIO** - Depende de proteção XSS (já implementada)

**Recomendação:**
- Considerar migrar para httpOnly cookies
- **Não é crítico** - XSS já está protegido

---

## ✅ Questões Não Críticas (Melhorias)

### 🟢 5. Rate Limit no Swagger

**Status:** Já tem autenticação básica ✅  
**Impacto:** 🟢 **BAIXO** - Melhoria incremental

### 🟢 6. Validação de Domínios de Email

**Status:** Opcional  
**Impacto:** 🟢 **BAIXO** - Melhoria de qualidade

### 🟢 7. Nonce Único por Validação

**Status:** Já tem nonce no QR code ✅  
**Impacto:** 🟢 **BAIXO** - Melhoria de rastreabilidade

---

## 📊 Resumo de Prioridades

| Prioridade | Item | Impacto | Ação |
|------------|------|---------|------|
| 🔴 **CRÍTICO** | JWT Secret | Alto | **VERIFICAR E VALIDAR** |
| ✅ **RESOLVIDO** | Cookies httpOnly/SameSite | - | ✅ Já configurado corretamente |
| 🟡 Importante | QR Code Expiração | Médio | Melhorar (opcional) |
| 🟡 Importante | Token Storage | Médio | Melhorar (opcional) |
| 🟢 Melhoria | Rate Limit Swagger | Baixo | Opcional |
| 🟢 Melhoria | Email Domain Validation | Baixo | Opcional |

---

## 🎯 Ações Imediatas Necessárias

### 1. ✅ Verificar JWT Secret (5 minutos) - **CRÍTICO**
```bash
# No servidor de produção, verificar:
echo $JWT_SECRET | wc -c  # Deve ser >= 32 caracteres
```

**Se for menor que 32 caracteres ou não configurado:**
- 🔴 **RISCO CRÍTICO** - Sistema vulnerável
- Gerar novo secret forte: `openssl rand -hex 32`
- Atualizar `.env` e reiniciar servidor

### 2. ✅ Cookies - Já Verificado
- ✅ Configuração correta implementada
- ✅ Nenhuma ação necessária

### 3. Adicionar Validação de JWT Secret no Startup (15 minutos) - **RECOMENDADO**
```typescript
// Adicionar em backend/src/server.ts ou config/database.ts
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET deve ter no mínimo 32 caracteres');
}
```

---

**Última atualização:** 2025-12-02  
**Status:** 🔴 **1 questão crítica identificada - ação imediata necessária**

### ✅ Resumo
- 🔴 **CRÍTICO:** JWT Secret - Verificar se está forte (32+ caracteres)
- ✅ **RESOLVIDO:** Cookies - Já configurados corretamente
- 🟡 **IMPORTANTE:** QR Code Expiração - Melhorar (opcional)
- 🟢 **MELHORIA:** Outras melhorias incrementais (opcional)

