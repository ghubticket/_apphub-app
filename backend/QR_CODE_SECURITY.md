# 🔒 Segurança de QR Codes - Prevenção de Burla

## 🎯 Problema Identificado

**Cenário de risco:**
- João compra um ingresso
- João vende/transfere o ingresso para Cláudia (fora do sistema, sem transferência oficial)
- Cláudia valida primeiro → ✅ Funciona
- João tenta validar depois → ❌ Deve ser bloqueado e detectado como suspeito

## ✅ Proteções Implementadas

### 1. **Uso Único (One-Time Use)**
- Cada QR code só pode ser validado **UMA vez**
- Usa operação atômica (`findOneAndUpdate`) para prevenir race conditions
- Primeiro a validar ganha, segundo recebe erro

### 2. **Identificação de Quem Passou Primeiro** 🆕
- ✅ Campo `usedByHolderId` no Ticket registra **qual holder estava presente** na validação
- ✅ Se não informado, assume que foi o holder do ticket
- ✅ Permite identificar exatamente **quem passou primeiro** quando há tentativa de burla
- ✅ API aceita parâmetro opcional `holderId` no body da validação

### 3. **Detecção de Tentativa de Reutilização**
Quando alguém tenta usar um QR code já usado:
- ✅ Sistema detecta e bloqueia
- ✅ Registra tentativa em `ValidationAttempt` com `reason: 'already_used'`
- ✅ Retorna informações detalhadas:
  - Data/hora da primeira validação
  - **Quem passou primeiro** (nome do holder que estava presente) 🆕
  - Quem validou (usuário QRCODE)
  - Se o holder original está tentando reutilizar
  - Se é uma pessoa diferente tentando usar

### 4. **Detecção de Burla (Holder Tentando Reutilizar)**
**Cenário crítico**: Se o **holder original** (João) tenta usar um QR já usado por outra pessoa:

```typescript
// Sistema detecta:
if (isHolderTryingToReuse) {
    // Marca holder como SUSPEITO automaticamente
    holderUser.isSuspicious = true;
    holderUser.suspiciousReason = "Tentativa de reutilizar QR code já validado...";
}
```

**O que acontece:**
- ⚠️ Holder é marcado como `isSuspicious = true`
- 📝 Motivo registrado: "Tentativa de reutilizar QR code já validado"
- 📊 Aparece na lista de usuários suspeitos no dashboard
- 🔍 Admin pode investigar e bloquear se necessário

### 5. **Registro Completo de Tentativas**
Todas as tentativas são registradas em `ValidationAttempt`:
- ✅ Código do ingresso
- ✅ Quem tentou validar (validatorId)
- ✅ Dono do ingresso (holderId)
- ✅ IP e User Agent
- ✅ Sucesso/Falha
- ✅ Motivo da falha (`already_used`, `replay_detected`, etc.)

### 6. **Anti-Replay (Nonce)**
- Cada QR code tem um nonce único
- Nonce é registrado no banco quando usado
- Tentativa de reutilizar o mesmo nonce é detectada como replay
- Previne uso de screenshots/fotos do QR code

## 🔍 Como Funciona na Prática

### Cenário 1: Uso Normal ✅
1. Cláudia compra ingresso
2. Cláudia valida na entrada
3. ✅ Status muda para `used`
4. ✅ `usedAt` e `usedBy` são registrados

### Cenário 2: Tentativa de Burla ❌
1. João compra ingresso (holder = João)
2. João vende para Cláudia (fora do sistema)
3. Cláudia valida primeiro → ✅ Funciona
   - `usedByHolderId = Cláudia` (registrado quem passou)
4. João tenta validar depois:
   - ❌ Sistema detecta: `status = 'used'`
   - ✅ Sistema identifica: `usedByHolderId = Cláudia` (quem passou primeiro)
   - ⚠️ Sistema detecta: `holder = João` (tentando reutilizar)
   - 🚨 João é marcado como **SUSPEITO**
   - 📝 Motivo: "QR foi usado por Cláudia em [data/hora]"
   - 📊 Admin vê na lista de usuários suspeitos

### Cenário 3: Tentativa de Uso Duplo (Mesma Pessoa) ❌
1. João valida ingresso → ✅ Funciona
2. João tenta validar novamente (mesmo QR):
   - ❌ Sistema detecta: `status = 'used'`
   - ⚠️ Sistema detecta: `holder = João` (tentando reutilizar)
   - 🚨 João é marcado como **SUSPEITO**

## 📊 Informações Retornadas ao Validar QR Já Usado

```json
{
  "success": false,
  "message": "Ingresso já utilizado",
  "errors": [
    "Este QR code já foi validado anteriormente.",
    "Primeira validação: 06/11/2025 14:30:00",
    "Quem passou primeiro: Cláudia",  // ← NOVO: Identifica quem passou!
    "Validado por: Usuário QRCODE",
    "⚠️ ATENÇÃO: Este ingresso pertence a você, mas foi usado por Cláudia."
  ],
  "data": {
    "alreadyUsed": true,
    "usedAt": "2025-11-06T14:30:00.000Z",
    "usedBy": "Nome do Validador",
    "firstPassedHolder": "Cláudia",  // ← NOVO: Quem passou primeiro
    "firstPassedHolderId": "user_id_claudia",  // ← NOVO: ID de quem passou
    "isHolderTryingToReuse": true,  // ← Indica burla!
    "isDifferentPerson": true,  // ← NOVO: Indica se é pessoa diferente
    "holder": "João"
  }
}
```

## 🛡️ Proteções Adicionais

### 1. **Blacklist de Usuários**
- Usuários marcados como `isBlacklisted = true` não podem validar ingressos
- Previne uso por pessoas bloqueadas

### 2. **Detecção de Padrões Suspeitos**
- Múltiplas tentativas de usar QRs já usados
- Mesmo QR usado em múltiplos eventos
- Usuário é marcado como suspeito automaticamente

### 3. **Logs Detalhados**
- Todas as tentativas são logadas
- IP, User Agent, timestamp registrados
- Facilita investigação de fraudes

## 🚀 Futuro: Transferência Oficial

Quando implementar transferência de ingressos:
- ✅ Atualizar `holder` do ticket
- ✅ Registrar transferência no histórico
- ✅ Permitir que novo holder valide
- ✅ Prevenir validação pelo holder antigo

## 📝 Resumo

**O sistema JÁ previne burlas:**
- ✅ QR code só pode ser usado UMA vez
- ✅ Primeiro a validar ganha
- ✅ Tentativas de reutilização são bloqueadas
- ✅ Holder tentando reutilizar é marcado como SUSPEITO
- ✅ Todas as tentativas são registradas para auditoria

**Não é possível:**
- ❌ Usar o mesmo QR code duas vezes
- ❌ João validar depois que Cláudia validou
- ❌ Usar screenshot/foto do QR code (anti-replay)

**O que acontece se tentar burlar:**
- 🚨 Usuário é marcado como SUSPEITO
- 📊 Aparece na lista de suspeitos no dashboard
- 🔍 Admin pode investigar e bloquear
- 📝 Histórico completo de tentativas disponível

