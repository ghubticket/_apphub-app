# Plano de Implementação - Sistema de Reservas

## Objetivo
Criar pedidos SOMENTE quando pagos (cartão) ou quando gerar PIX. Usar reservas para "segurar" estoque enquanto usuário está no checkout.

## Mudanças Necessárias

### 1. Estrutura de Reserva
- Adicionar estado `reservation` para armazenar dados da reserva
- Criar função `ensureReservation()` para criar/validar reserva
- Criar função `cancelReservation()` para cancelar reserva
- Usar `sessionId` (deviceId) para identificar reservas

### 2. Remover AutoCreateOrder
- Remover completamente o `useEffect` que cria pedidos automaticamente (linhas 1896-1994)
- Substituir por criação de reserva quando entrar no checkout

### 3. Criar Reserva ao Entrar no Checkout
- Quando `isCheckoutReady` e há itens no carrinho, criar reserva
- Não precisa preencher dados do cliente para criar reserva
- Reserva tem timer de 15 minutos

### 4. Cartão - Criar Pedido SOMENTE Após Pagamento Confirmado
- Modificar `handleCardPayment`:
  - REMOVER: `ensureOrder()` antes de processar pagamento (linha 1536)
  - CRIAR pedido SOMENTE quando `internalStatus === 'paid'` (linha 1599)
  - Pedido criado como PAID diretamente

### 5. PIX - Criar Pedido SOMENTE Após Gerar QR Code
- Modificar `handlePixPayment`:
  - Manter criação de pedido após gerar QR code (linha 1818)
  - Pedido criado como PENDING (já está correto)

### 6. Timer Baseado em Reserva
- Modificar `useCheckoutTimer` para usar `reservation.expiresAt` ao invés de `order.createdAt`
- Timer mostra tempo restante da reserva

### 7. Cancelar Reserva ao Sair
- Modificar `cleanupCheckout` para cancelar reserva quando sair
- NÃO cancelar reserva quando for F5 (atualizar página)
- Usar flag para detectar se é F5 ou navegação

### 8. Restaurar Reserva no F5
- Criar `useEffect` para restaurar reserva quando carregar página
- Se houver reserva ativa, restaurar estado do checkout

## Fluxo Final

### Cartão:
1. Usuário entra no checkout → Cria RESERVA
2. Usuário preenche dados → Reserva continua ativa
3. Usuário clica em pagar → Processa pagamento SEM criar pedido
4. Pagamento aprovado → Cria pedido PAID + Cancela reserva
5. Pagamento recusado → Mantém reserva, permite tentar novamente (até 3x)

### PIX:
1. Usuário entra no checkout → Cria RESERVA
2. Usuário preenche dados → Reserva continua ativa
3. Usuário escolhe PIX → Cria pedido PENDING + Cancela reserva
4. QR Code gerado → Usuário paga

### Sair do Checkout:
- Se sair (exceto F5) → Cancela reserva, volta estoque
- Se F5 → Mantém reserva, restaura checkout

### Timer:
- Timer mostra tempo restante da RESERVA (15 minutos)
- Se expirar → Cancela reserva, volta estoque

## Endpoints Backend Necessários

- `POST /reservations` - Criar reserva
- `GET /reservations/:id` - Validar reserva
- `DELETE /reservations/:id` - Cancelar reserva
- `DELETE /reservations/session/:sessionId` - Cancelar todas reservas da sessão

## Arquivos a Modificar

1. `frontend/app/checkout/page.tsx` - Lógica principal
2. `frontend/app/checkout/hooks/useCheckoutTimer.ts` - Timer baseado em reserva
3. `frontend/app/checkout/utils/storageHelpers.ts` - Adicionar helpers para reserva (se necessário)

