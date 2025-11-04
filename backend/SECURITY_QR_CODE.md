# 🔐 Segurança de QR Codes - Documentação

## ✅ Como Funciona Atualmente

### **1. Cada Ingresso = Código Único**

Quando você compra **5 ingressos**, o sistema:
- ✅ Gera **5 códigos únicos** diferentes (12 caracteres cada)
- ✅ Gera **5 QR codes diferentes** (cada um contém seu código único)
- ✅ Cada ingresso é um documento separado no banco

**Exemplo:**
```
Ingresso 1: Código = "ABC123XYZ456" → QR Code 1
Ingresso 2: Código = "DEF789GHI012" → QR Code 2
Ingresso 3: Código = "JKL345MNO678" → QR Code 3
Ingresso 4: Código = "PQR901STU234" → QR Code 4
Ingresso 5: Código = "VWX567YZA890" → QR Code 5
```

### **2. Proteção Contra Reutilização**

**✅ Status do Ingresso:**
- `pending` → Ingresso criado, aguardando pagamento
- `confirmed` → Ingresso confirmado, pronto para uso
- `used` → **Ingresso já foi validado/usado** ❌
- `cancelled` → Ingresso cancelado
- `refunded` → Ingresso reembolsado

**✅ Validação:**
Quando alguém tenta validar um QR code:
1. Sistema busca o ingresso pelo código
2. **Verifica se já foi usado** (`status === 'used'`)
3. Se já foi usado → **Bloqueia** e retorna erro
4. Se não foi usado → Marca como `used` e registra quem validou

**Exemplo de Fluxo:**
```
1. Pessoa A escaneia QR Code → ✅ Validado → status = 'used'
2. Pessoa B tenta escanear o MESMO QR Code → ❌ Erro: "Ingresso já utilizado"
```

### **3. Auditoria Completa**

Cada validação registra:
- ✅ `usedAt`: Data/hora da validação
- ✅ `usedBy`: Quem validou (usuário QRCODE)
- ✅ `validatedAt`: Timestamp da validação

## ⚠️ Vulnerabilidade Potencial: Race Condition

### **Problema:**
Se **duas pessoas** tentarem validar o **mesmo QR code simultaneamente**:
1. Ambas passam pela verificação `if (ticket.status === 'used')`
2. Ambas veem que o status ainda é `confirmed`
3. Ambas podem marcar como `used`

**Cenário:**
```
Tempo 0ms: Pessoa A lê → status = 'confirmed' ✅
Tempo 1ms: Pessoa B lê → status = 'confirmed' ✅ (Ainda não foi atualizado!)
Tempo 2ms: Pessoa A salva → status = 'used'
Tempo 3ms: Pessoa B salva → status = 'used' (SOBRESCREVE!)
```

### **Solução:**
Usar **transação atômica** do MongoDB para garantir que apenas uma validação seja aceita.

## 🛡️ Melhorias de Segurança Recomendadas

### **1. Transação Atômica (CRÍTICO)**
- Usar `findOneAndUpdate` com operação atômica
- Garantir que apenas uma validação seja aceita por vez

### **2. Validação Adicional**
- Verificar se o evento ainda está ativo
- Verificar se o evento não passou da data
- Verificar se o tipo de ingresso ainda está ativo

### **3. Logs de Segurança**
- Registrar todas as tentativas de validação (sucesso e falha)
- Alertar em caso de múltiplas tentativas do mesmo código

### **4. Rate Limiting**
- Limitar número de validações por minuto por usuário QRCODE
- Prevenir ataques de força bruta

---

## 📝 Resumo para o Usuário

**✅ SIM, está seguro:**
- Cada ingresso tem código único
- Uma vez validado, não pode ser usado novamente
- Sistema registra quem validou e quando

**⚠️ Melhoria Necessária:**
- Proteção contra validação simultânea (race condition)
- Implementar transação atômica

