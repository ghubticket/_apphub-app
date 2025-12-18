# 📋 Revisão de Regras de Negócio - Pedidos Parcelados

## ✅ Regra 1: Compra só efetiva quando paga entrada
**Status:** ⚠️ PRECISA AJUSTE

**Regra:** Se não pagar a entrada, não efetiva o pedido e não exibe na tela.

**Implementação Atual:**
- Usa `isEntryPixExpired` que verifica 30min desde criação do pedido
- Deveria verificar se passou do `dueDate` da entrada

**Correção Necessária:**
- Alterar para verificar `dueDate` da entrada em vez de 30min desde criação
- Só ocultar/cancelar se `dueDate < now` E entrada não foi paga

---

## ✅ Regra 2: Badge de atraso
**Status:** ✅ CORRETO

**Regra:** Quando passa da data de vencimento (ex: vence dia 18, chegou dia 19), ativa badge de atraso.

**Implementação Atual:**
- Marca como `overdue` quando `dueDate < now`
- ✅ Está correto

---

## ❌ Regra 3: Cancelamento após 60 dias
**Status:** ❌ PROBLEMA CRÍTICO

**Regra:** Atrasou 2 parcelas por 60 dias, cancela o PEDIDO. Não tem devolução do que foi pago.

**Implementação Atual:**
- Cancela imediatamente quando 2 parcelas estão `overdue`
- ❌ Não verifica se passou 60 dias desde que ficaram overdue

**Correção Necessária:**
- Adicionar campo `overdueAt` no modelo Parcel
- Só cancelar se: 2+ parcelas estão overdue E passou 60 dias desde `overdueAt`

---

## ✅ Regra 4: 100% pago
**Status:** ✅ CORRETO

**Regra:** Pagou 100% das parcelas, ativa o pedido 100% e disponibiliza o ticket. Pode pagar todos os PIX no mesmo dia.

**Implementação Atual:**
- Só cria tickets quando `remaining === 0` (todas parcelas pagas)
- ✅ Está correto

---

## ⚠️ Regra 5: PIX gerado antes do vencimento
**Status:** ⚠️ PRECISA AJUSTE

**Regra:** Se gerar PIX antes do vencimento e não pagar em 30min, não cancela nada. Só cancela após data de vencimento.

**Implementação Atual:**
- Para parcelas futuras: ✅ Correto - marca como overdue apenas quando `dueDate < now`
- Para entrada: ❌ Está cancelando pelos 30min do PIX, não pelo dueDate

**Correção Necessária:**
- Entrada também deve usar `dueDate` em vez de 30min
- Só cancelar entrada se `dueDate < now` E não foi paga

---

## 📝 Resumo de Correções Necessárias

1. **Regra 1 e 5:** Usar `dueDate` da entrada em vez de 30min desde criação
2. **Regra 3:** Adicionar verificação de 60 dias desde que ficou overdue antes de cancelar

