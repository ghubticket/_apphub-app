# Script de Correção de Estoque

## Problema Identificado

Alguns tipos de ingresso têm `soldQuantity` maior que `maxQuantity`, causando:
- Exibição incorreta de "ESGOTADO" mesmo quando há estoque disponível
- Cálculo incorreto: `availableQuantity = maxQuantity - soldQuantity` resulta em valores negativos

### Exemplo do Problema:
```
Ingresso Normal:
- maxQuantity: 200
- soldQuantity: 9000  ❌ (INCORRETO - não pode ser maior que maxQuantity)
- availableQuantity: 200 - 9000 = -8800 → 0 (Math.max(0, ...))
```

## Solução

O script `fixTicketStock.ts` corrige automaticamente os valores de `soldQuantity` baseando-se no número real de tickets confirmados no banco de dados.

### Como Executar

1. **Certifique-se de estar no diretório do backend:**
```bash
cd _apphub-back/backend
```

2. **Execute o script:**
```bash
npx ts-node src/scripts/fixTicketStock.ts
```

Ou se estiver usando npm scripts:
```bash
npm run fix-stock
```

### O que o Script Faz

1. Busca todos os tipos de ingresso (`TicketType`) não deletados
2. Para cada tipo, verifica se `soldQuantity > maxQuantity`
3. Conta o número real de tickets confirmados (`status: 'confirmed'`)
4. Ajusta `soldQuantity` para o valor real, mas não permite exceder `maxQuantity`
5. Salva as correções no banco de dados

### Exemplo de Saída

```
✅ Conectado ao MongoDB
📋 Encontrados 5 tipos de ingresso

🔴 Problema encontrado:
   Tipo: Ingresso Normal (6915eb106591cf33f8f8cde6)
   Evento: 6915eb106591cf33f8f8cde3
   maxQuantity: 200
   soldQuantity atual: 9000
   Diferença: 8800
   Tickets confirmados reais: 150
   ✅ Corrigindo soldQuantity para: 150

✅ Correção concluída!
   Tipos corrigidos: 2
   Total de ingressos ajustados: 8800
```

## Prevenção

Para evitar que isso aconteça novamente:

1. **Sempre validar antes de incrementar `soldQuantity`:**
```typescript
if (ticketType.soldQuantity + quantity > ticketType.maxQuantity) {
    throw new Error('Estoque insuficiente');
}
```

2. **Usar transações ao criar pedidos** para garantir consistência

3. **Executar o script periodicamente** para verificar e corrigir inconsistências

## Notas Importantes

- ⚠️ O script **NÃO** deleta ou cancela tickets existentes
- ⚠️ O script apenas **ajusta** o valor de `soldQuantity` para refletir a realidade
- ✅ O script é **seguro** e pode ser executado múltiplas vezes
- ✅ O script usa contagem real de tickets confirmados como fonte da verdade

