# Fluxo de Reserva de Ingressos - Documentação

## 📋 Cenários de Negócio

### Cenário 1: Usuário cria pedido e tenta pagar
1. ✅ Usuário adiciona item ao carrinho
2. ✅ Vai para checkout → **PEDIDO CRIADO** → `soldQuantity += quantity` (RESERVA IMEDIATA)
3. ✅ Tenta pagar → falha → `soldQuantity -= quantity` (DEVOLVE AO ESTOQUE)
4. ✅ Tenta novamente → **REUTILIZA MESMO PEDIDO** → não incrementa soldQuantity (já reservado)

### Cenário 2: Usuário cria pedido, volta para home, volta ao carrinho
1. ✅ Usuário adiciona item → vai para checkout → **PEDIDO CRIADO** → `soldQuantity += quantity`
2. ❌ Volta para home → **PEDIDO FICA PENDENTE** (ingressos reservados)
3. ❌ Volta ao carrinho → **CRIA NOVO PEDIDO** → `soldQuantity += quantity` NOVAMENTE
4. ❌ **PROBLEMA**: Dois pedidos com ingressos reservados!

### Cenário 3: F5 / Internet cai
1. ✅ Usuário cria pedido → `soldQuantity += quantity`
2. ❌ F5 / Internet cai → **PEDIDO FICA NO SESSIONSTORAGE**
3. ❌ Recarrega página → **CRIA NOVO PEDIDO** → `soldQuantity += quantity` NOVAMENTE
4. ❌ **PROBLEMA**: Dois pedidos com ingressos reservados!

## 🔴 Problemas Identificados

1. **Pedidos abandonados**: Ingressos ficam reservados indefinidamente
2. **Duplicação de reservas**: Múltiplos pedidos podem reservar os mesmos ingressos
3. **Sem expiração**: Pedidos pendentes nunca expiram automaticamente
4. **Sem limpeza**: Pedidos antigos não são cancelados quando criamos novos

## ✅ Soluções Implementadas

### 1. Cancelar pedidos anteriores ao criar novo
- Quando criar novo pedido, cancelar pedidos pendentes anteriores do mesmo usuário/evento/ticketType
- Devolver ingressos ao estoque automaticamente

### 2. Reutilizar pedido quando possível
- Se pedido pendente existe e não excedeu tentativas, reutilizar
- Não incrementar soldQuantity novamente (já está reservado)

### 3. Expirar pedidos abandonados (TODO)
- Criar job/cron para expirar pedidos pendentes após 15 minutos
- Devolver ingressos ao estoque automaticamente

### 4. Limpar sessionStorage ao criar novo pedido
- Limpar pedido antigo do sessionStorage quando criar novo
- Evitar conflitos entre pedidos

## 📊 Fluxo Correto (Após Correções)

### Quando criar pedido:
1. Verificar se existe pedido pendente reutilizável
2. Se sim → reutilizar (não incrementar soldQuantity)
3. Se não → criar novo pedido → cancelar pedidos anteriores → incrementar soldQuantity

### Quando pagamento falha:
1. Devolver ingressos ao estoque (`soldQuantity -= quantity`)
2. Incrementar tentativas (`cardAttempts++`)
3. Manter pedido para possível reutilização

### Quando pagamento aprovado:
1. Confirmar ingressos (status = 'confirmed')
2. Gerar QR codes
3. Manter soldQuantity (não devolver)

### Quando expirar pedido (TODO):
1. Cancelar pedido pendente após 15 minutos
2. Devolver ingressos ao estoque
3. Marcar pedido como 'cancelled'

