# 📋 Fluxo de Pedido Parcelado - Confirmação

## ✅ Regra Confirmada: Entrada é Pré-Reserva

### 1. **Criação do Pedido (Pré-Reserva)**
- Status inicial: `pending_entry`
- Entrada criada: `sequence: 0` com status `pending` ou `payment_generated`
- **NÃO exibe na tela se:**
  - Entrada não foi paga E passou do `dueDate`
  - Pedido foi cancelado E entrada não foi paga

### 2. **Pagamento da Entrada (Efetivação)**
- Quando entrada é paga (`sequence: 0` → `status: 'paid'`):
  - ✅ Status muda de `pending_entry` → `active`
  - ✅ Pedido é **EFETIVADO** (pré-reserva confirmada)
  - ✅ Demais parcelas ficam disponíveis para pagamento
  - ✅ Pedido aparece no dashboard

### 3. **Pagamento das Parcelas**
- Usuário pode pagar parcelas conforme vencimento
- Status permanece `active` enquanto houver parcelas pendentes
- Parcelas podem ser pagas em qualquer ordem (até todas no mesmo dia)

### 4. **Conclusão (100% Pago)**
- Quando **TODAS** as parcelas estão pagas (`remaining === 0`):
  - ✅ Status muda de `active` → `completed`
  - ✅ Order vinculado é criado
  - ✅ Tickets são gerados com QR codes
  - ✅ Botão "Visualizar Ingressos" aparece

## 📊 Resumo dos Status

| Status | Significado | O que acontece |
|--------|-------------|----------------|
| `pending_entry` | Pré-reserva aguardando entrada | Não efetivado ainda |
| `active` | Entrada paga, parcelas em andamento | Pedido efetivado, aguardando parcelas |
| `completed` | Todas parcelas pagas | Tickets disponíveis |
| `cancelled` | Cancelado | Só aparece se entrada foi paga |

## ✅ Confirmação

**Está correto!** A entrada é uma pré-reserva que só efetiva o pedido quando paga, e só conclui quando todas as parcelas são pagas.

