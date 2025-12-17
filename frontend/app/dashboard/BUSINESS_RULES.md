# 📋 Regras de Negócio - Pedidos Parcelados

## 🎯 Exibição de Pedidos Cancelados

### Regra Principal

**Pedidos parcelados cancelados só aparecem se houver atividade do usuário.**

### ✅ Mostrar Quando Cancelado

```
Entrada PAGA + 2+ parcelas atrasadas = CANCELADO
└─ ✅ MOSTRAR na lista
   └─ Motivo: Usuário começou a pagar, tem histórico
```

### ❌ NÃO Mostrar Quando Cancelado

```
Entrada NÃO PAGA (expirou 30min) = CANCELADO
└─ ❌ NÃO MOSTRAR na lista
   └─ Motivo: Usuário nem começou, não há atividade
```

## 🔍 Lógica Implementada

```typescript
.filter((order) => {
    if (order.status === 'cancelled') {
        // Verificar se a entrada foi paga
        const entryParcel = order.parcels.find(p => p.sequence === 0);
        const entryWasPaid = entryParcel?.status === 'paid';
        
        // Só mostrar se entrada foi paga
        return entryWasPaid;
    }
    
    // Mostrar todos os outros status
    return true;
});
```

## 📊 Cenários de Exibição

### Cenário 1: Entrada Não Paga (Expirou)
```
Status: cancelled
Entrada: pending (expirou 30min)
Parcelas: todas pending

RESULTADO: ❌ NÃO MOSTRAR
MOTIVO: Usuário abandonou antes de pagar
```

### Cenário 2: Entrada Paga + 2 Parcelas Atrasadas
```
Status: cancelled
Entrada: paid ✅
Parcela 1: overdue
Parcela 2: overdue
Parcelas 3-9: pending

RESULTADO: ✅ MOSTRAR
MOTIVO: Usuário pagou entrada, tem histórico
```

### Cenário 3: Entrada Paga + 1 Parcela Atrasada
```
Status: active (ainda não cancelou)
Entrada: paid ✅
Parcela 1: overdue
Parcelas 2-9: pending

RESULTADO: ✅ MOSTRAR
MOTIVO: Pedido ativo com alerta
```

### Cenário 4: Aguardando Entrada
```
Status: pending_entry
Entrada: payment_generated (PIX gerado)
Parcelas: pending

RESULTADO: ✅ MOSTRAR
MOTIVO: Pedido ativo aguardando pagamento
```

### Cenário 5: Todas Pagas
```
Status: completed
Entrada: paid ✅
Parcelas 1-9: paid ✅

RESULTADO: ✅ MOSTRAR
MOTIVO: Pedido completo com ingressos
```

## 🎨 Visual por Status

| Status | Entrada | Mostrar? | Badge | Cor |
|--------|---------|----------|-------|-----|
| `pending_entry` | Pendente | ✅ | Aguardando Entrada | 🟡 Amber |
| `active` | Paga | ✅ | Ativo | 🔵 Sky |
| `completed` | Paga | ✅ | Concluído | 🟢 Green |
| `cancelled` + entrada paga | Paga | ✅ | Cancelado | 🔴 Red |
| `cancelled` + entrada NÃO paga | Pendente | ❌ | - | - |

## 🎯 UX Reasoning

### Por Que Ocultar Cancelados Sem Atividade?

1. ✅ **Reduz poluição visual** - Menos itens desnecessários
2. ✅ **Foco no importante** - Apenas pedidos com ação do usuário
3. ✅ **Histórico relevante** - Mostra apenas o que importa
4. ✅ **Menos confusão** - Usuário vê apenas pedidos que iniciou

### Por Que Mostrar Cancelados Com Atividade?

1. ✅ **Transparência** - Usuário vê o que aconteceu
2. ✅ **Histórico completo** - Registra tentativas de pagamento
3. ✅ **Auditoria** - Usuário sabe por que foi cancelado
4. ✅ **Aprendizado** - Evita cometer mesmo erro

## 📝 Exemplo Prático

```
CENÁRIO: Usuário cria 3 pedidos parcelados

Pedido A:
├─ Cria pedido parcelado
├─ NÃO paga entrada
└─ Sistema cancela após 30min
    └─ ❌ NÃO APARECE na lista (sem atividade)

Pedido B:
├─ Cria pedido parcelado
├─ Paga entrada ✅
├─ Paga 2 parcelas ✅
├─ Deixa 2 parcelas atrasarem
└─ Sistema cancela automaticamente
    └─ ✅ APARECE na lista (teve atividade)
    └─ Badge: CANCELADO (vermelho)
    └─ Mensagem: "Cancelado por atraso de 2+ parcelas"

Pedido C:
├─ Cria pedido parcelado
├─ Paga entrada ✅
├─ Paga todas as parcelas ✅
└─ Sistema libera ingressos
    └─ ✅ APARECE na lista
    └─ Badge: CONCLUÍDO (verde)
    └─ [Ver Ingressos]
```

## 🚀 Benefícios

- ✅ **Lista mais limpa** - Apenas pedidos relevantes
- ✅ **UX melhor** - Menos confusão
- ✅ **Performance** - Menos itens para renderizar
- ✅ **Histórico útil** - Apenas o que importa

---

**Regra de negócio implementada com sucesso! 🎉**
