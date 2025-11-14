# Resumo da Implementação - Sistema de Reservas

## ✅ Implementado

### 1. Estrutura de Reserva
- ✅ Tipo `Reservation` adicionado em `types.ts`
- ✅ Estado `reservation` adicionado no componente
- ✅ Funções `ensureReservation()` e `cancelReservation()` criadas

### 2. Criação Automática de Reserva
- ✅ Removido `AutoCreateOrder` (criação automática de pedidos)
- ✅ Substituído por criação automática de reserva ao entrar no checkout
- ✅ Reserva criada quando `isCheckoutReady` e há itens no carrinho
- ✅ **NÃO precisa preencher dados do cliente** para criar reserva

### 3. Criação de Pedidos
- ✅ **Cartão**: Pedido criado SOMENTE quando usuário tenta pagar (não automaticamente)
  - Criado como PENDING temporariamente
  - Se pagamento aprovado → Backend atualiza para PAID automaticamente
  - Se pagamento recusado → Mantém PENDING, permite tentar novamente (até 3x)
  - Reserva cancelada após criar pedido

- ✅ **PIX**: Pedido criado SOMENTE quando usuário escolhe PIX e QR code é gerado
  - Criado como PENDING
  - Reserva cancelada após criar pedido

### 4. Timer Baseado em Reserva
- ✅ Timer mostra tempo restante da **reserva** (15 minutos)
- ✅ Timer calculado baseado em `reservation.expiresAt`
- ✅ Timer aparece quando há reserva ativa (não quando há pedido)
- ✅ Se timer expira → Cancela reserva automaticamente (volta estoque)

### 5. Cancelamento de Reserva
- ✅ Cancelada quando usuário sai do checkout (exceto F5)
- ✅ Cancelada quando timer expira
- ✅ Cancelada após criar pedido (cartão ou PIX)
- ✅ Cancelada quando usuário confirma saída no modal

### 6. Restauração de Reserva (F5)
- ✅ Reserva restaurada quando usuário dá F5
- ✅ Busca reservas ativas da sessão via `/reservations/my`
- ✅ Encontra reserva que corresponde ao item do carrinho
- ✅ Restaura estado do checkout com reserva ativa

### 7. Modal de Confirmação
- ✅ Modal aparece quando há reserva ativa OU pedido pendente
- ✅ Ao confirmar saída → Cancela pedido E reserva
- ✅ Mensagem atualizada para mencionar reserva quando aplicável

## 🔄 Fluxo Final

### Cartão:
1. Usuário entra no checkout → **Cria RESERVA** (15 min)
2. Usuário preenche dados → Reserva continua ativa
3. Usuário clica em pagar → **Cria pedido PENDING** + Cancela reserva
4. Processa pagamento → Se aprovado → **Pedido atualizado para PAID** pelo backend
5. Se recusado → Mantém pedido PENDING, permite tentar novamente (até 3x)

### PIX:
1. Usuário entra no checkout → **Cria RESERVA** (15 min)
2. Usuário preenche dados → Reserva continua ativa
3. Usuário escolhe PIX → **Cria pedido PENDING** + Cancela reserva
4. QR Code gerado → Usuário paga → Backend atualiza pedido para PAID quando pagamento confirmado

### Sair do Checkout:
- Se sair (exceto F5) → **Cancela reserva** → Volta estoque
- Se F5 → **Mantém reserva** → Restaura checkout

### Timer:
- Timer mostra tempo restante da **RESERVA** (15 minutos)
- Se expirar → **Cancela reserva** → Volta estoque

## 📝 Endpoints Backend Utilizados

- `POST /reservations` - Criar reserva
- `GET /reservations/my` - Listar reservas ativas da sessão
- `DELETE /reservations/:id` - Cancelar reserva
- `POST /orders` - Criar pedido (somente quando pagar)
- `POST /payments/:orderId/card` - Processar pagamento cartão
- `POST /payments/:orderId/pix` - Gerar pagamento PIX

## 🧪 Plano de Testes

### Teste 1: Criação de Reserva
1. Adicionar produto ao carrinho
2. Ir para checkout
3. **Verificar**: Reserva criada automaticamente (não precisa preencher dados)
4. **Verificar**: Timer aparece mostrando 15 minutos
5. **Verificar**: Log `[AutoCreateReservation] ✅ Reserva criada`

### Teste 2: F5 Mantém Reserva
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Dar F5
4. **Verificar**: Reserva restaurada
5. **Verificar**: Timer continua de onde parou
6. **Verificar**: Log `[RestoreReservation] ✅ RESERVA RESTAURADA APÓS F5`

### Teste 3: Sair Cancela Reserva
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Clicar em "Home" ou navegar para outra rota
4. **Verificar**: Modal aparece avisando sobre cancelamento
5. Confirmar saída
6. **Verificar**: Reserva cancelada
7. **Verificar**: Estoque voltou
8. **Verificar**: Log `[Navigation] 🗑️ Cancelando reserva ao sair`

### Teste 4: Cartão - Criar Pedido Somente Após Pagamento
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Preencher dados do cliente
4. Preencher dados do cartão
5. Clicar em pagar
6. **Verificar**: Pedido criado SOMENTE quando tenta pagar
7. **Verificar**: Reserva cancelada após criar pedido
8. Se pagamento aprovado → **Verificar**: Pedido atualizado para PAID
9. Se pagamento recusado → **Verificar**: Pedido mantém PENDING, permite nova tentativa

### Teste 5: PIX - Criar Pedido Somente Ao Gerar QR Code
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Preencher dados do cliente
4. Escolher PIX
5. Clicar em gerar PIX
6. **Verificar**: Pedido criado SOMENTE quando gera QR code
7. **Verificar**: Reserva cancelada após criar pedido
8. **Verificar**: Pedido criado como PENDING

### Teste 6: Timer Expira Reserva
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Aguardar 15 minutos (ou ajustar tempo no backend para teste)
4. **Verificar**: Timer expira
5. **Verificar**: Reserva cancelada automaticamente
6. **Verificar**: Estoque voltou
7. **Verificar**: Log `[Checkout] ⏰ Timer de reserva expirado - cancelando reserva`

### Teste 7: Cartão Recusado - Tentativas
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Tentar pagar com cartão recusado
4. **Verificar**: Permite tentar novamente (até 3x)
5. **Verificar**: Após 3 tentativas, pedido marcado como FAILED
6. **Verificar**: Estoque devolvido após 3 tentativas

### Teste 8: Múltiplos F5
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Dar F5 várias vezes
4. **Verificar**: Reserva mantida em todas as vezes
5. **Verificar**: Timer continua funcionando

### Teste 9: Não Criar 54 Pedidos
1. Adicionar produto ao carrinho
2. Ir para checkout
3. **Verificar**: NÃO cria pedido automaticamente
4. **Verificar**: Apenas cria reserva
5. Preencher dados e tentar pagar
6. **Verificar**: Cria APENAS 1 pedido quando tenta pagar

### Teste 10: Modal com Reserva
1. Adicionar produto ao carrinho
2. Ir para checkout (reserva criada)
3. Tentar sair do checkout
4. **Verificar**: Modal aparece avisando sobre cancelamento
5. **Verificar**: Mensagem menciona reserva/pedido

## ⚠️ Pontos de Atenção

1. **Backend precisa ter endpoints de reserva funcionando**:
   - `POST /reservations` - Criar reserva
   - `GET /reservations/my` - Listar reservas da sessão
   - `DELETE /reservations/:id` - Cancelar reserva

2. **SessionId**: Usa `deviceId` ou `MP_DEVICE_SESSION_ID` como sessionId para reservas

3. **Timer**: Reservas têm 15 minutos, pedidos têm 12 minutos (backend controla)

4. **Estoque**: Reserva "segura" estoque, pedido também "segura" estoque (mas pedido é criado só quando paga)

5. **Cartão recusado**: Permite até 3 tentativas, depois volta estoque

