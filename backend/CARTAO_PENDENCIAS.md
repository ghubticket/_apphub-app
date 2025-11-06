# 💳 Pagamento com Cartão - O que falta implementar

## ✅ O que JÁ está implementado (Backend)

### Backend Completo ✅
1. ✅ **Endpoint**: `POST /api/payments/:orderId/card`
2. ✅ **Service**: `createCardPayment` em `paymentService.ts`
3. ✅ **Controller**: `createCardPayment` em `paymentController.ts`
4. ✅ **Suporte a tokenização**: Recebe token do frontend
5. ✅ **Parcelas**: Suporte a `installments` (1-12)
6. ✅ **3D Secure**: Suporte automático via Orders API
7. ✅ **Mapeamento de status**: `paymentStatusMapper` completo
8. ✅ **Webhook**: Notificações de pagamento funcionando
9. ✅ **Email**: Envio de emails (pendente/confirmado/recusado)
10. ✅ **Validações**: Validação de dados, estoque, pedido
11. ✅ **Additional Info**: Dados completos para melhorar taxa de aprovação
12. ✅ **Device ID**: Rastreamento de segurança

### Documentação ✅
- ✅ Swagger documentado
- ✅ Rota protegida com autenticação e rate limiting

---

## ❌ O que FALTA implementar (Frontend)

### 1. Integração com MercadoPago.js SDK ❌
- [ ] Instalar SDK: `@mercadopago/sdk-react` ou `mercadopago.js`
- [ ] Configurar Public Key do Mercado Pago
- [ ] Inicializar SDK no frontend
- [ ] Criar componente de formulário de cartão

### 2. Formulário de Cartão de Crédito ❌
- [ ] Campos do formulário:
  - [ ] Número do cartão (com máscara e validação)
  - [ ] Nome no cartão
  - [ ] Data de validade (MM/AA)
  - [ ] CVV (3-4 dígitos)
  - [ ] CPF do portador (se necessário)
- [ ] Validação em tempo real
- [ ] Identificação automática da bandeira (Visa, Master, etc.)
- [ ] Máscaras e formatação automática

### 3. Tokenização do Cartão ❌
- [ ] Integrar com MercadoPago.js para gerar token
- [ ] Tokenizar dados do cartão antes de enviar ao backend
- [ ] Tratamento de erros na tokenização
- [ ] Feedback visual durante tokenização

### 4. Seleção de Parcelas ❌
- [ ] Buscar opções de parcelas da API do Mercado Pago
- [ ] Dropdown/Select de parcelas
- [ ] Exibir valor de cada parcela
- [ ] Calcular juros (se houver)
- [ ] Mostrar total com juros

### 5. Tratamento de 3D Secure (3DS) ❌
- [ ] Detectar quando 3DS é necessário
- [ ] Exibir modal/iframe para autenticação 3DS
- [ ] Processar resposta do 3DS
- [ ] Continuar fluxo após autenticação

### 6. Página de Checkout Integrada ❌
- [ ] Criar página de checkout para pedidos
- [ ] Integrar com fluxo de criação de pedido
- [ ] Exibir resumo do pedido (evento, ingressos, valor)
- [ ] Seleção de método de pagamento (PIX ou Cartão)
- [ ] Formulário de cartão (quando selecionado)
- [ ] Botão "Finalizar Pagamento"

### 7. Feedback Visual ❌
- [ ] Loading durante processamento
- [ ] Mensagens de sucesso/erro
- [ ] Redirecionamento após pagamento aprovado
- [ ] Exibição de status do pagamento
- [ ] Tratamento de pagamento pendente (3DS)

### 8. Tratamento de Erros ❌
- [ ] Mensagens de erro amigáveis
- [ ] Tratamento de cartão recusado
- [ ] Tratamento de dados inválidos
- [ ] Retry em caso de falha temporária
- [ ] Logs de erros para debug

### 9. Testes ❌
- [ ] Testes end-to-end do fluxo completo
- [ ] Testes com cartões de teste do Mercado Pago
- [ ] Testes de diferentes bandeiras
- [ ] Testes de parcelas
- [ ] Testes de 3DS

---

## 📋 Checklist de Implementação

### Fase 1: Setup Básico
- [ ] Instalar MercadoPago.js SDK no frontend
- [ ] Configurar variável de ambiente `NEXT_PUBLIC_MP_PUBLIC_KEY`
- [ ] Criar hook/service para integração com Mercado Pago
- [ ] Criar tipos TypeScript para dados de cartão

### Fase 2: Formulário de Cartão
- [ ] Criar componente `CardForm.tsx`
- [ ] Implementar campos com validação
- [ ] Adicionar máscaras e formatação
- [ ] Identificação automática de bandeira
- [ ] Validação em tempo real

### Fase 3: Tokenização
- [ ] Integrar tokenização com MercadoPago.js
- [ ] Tratamento de erros na tokenização
- [ ] Feedback visual durante processo

### Fase 4: Parcelas
- [ ] Criar endpoint/service para buscar opções de parcelas
- [ ] Criar componente `InstallmentsSelect.tsx`
- [ ] Exibir valores e juros
- [ ] Integrar com formulário

### Fase 5: Checkout
- [ ] Criar página `/checkout/:orderId`
- [ ] Integrar formulário de cartão
- [ ] Integrar seleção de parcelas
- [ ] Exibir resumo do pedido
- [ ] Botão de finalizar pagamento

### Fase 6: Processamento
- [ ] Integrar com endpoint `POST /api/payments/:orderId/card`
- [ ] Tratamento de resposta (sucesso/erro/pendente)
- [ ] Redirecionamento após sucesso
- [ ] Tratamento de 3DS

### Fase 7: Polimento
- [ ] Melhorar UX/UI
- [ ] Adicionar animações
- [ ] Melhorar mensagens de erro
- [ ] Adicionar logs para debug
- [ ] Testes completos

---

## 🔗 Recursos Úteis

### Documentação Mercado Pago
- [Checkout Transparente - Cartões](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-integration/cards)
- [MercadoPago.js SDK](https://www.mercadopago.com.br/developers/pt/docs/sdks-library/client-side/sdk-js)
- [3D Secure](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-management/improve-payment-approval/3d-secure)
- [Parcelas](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-integration/installments)

### Cartões de Teste
- [Cartões de Teste Sandbox](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/testing/test-cards)

---

## 📝 Notas Importantes

1. **Public Key**: Necessário configurar `NEXT_PUBLIC_MP_PUBLIC_KEY` no frontend
2. **Tokenização**: Dados do cartão NUNCA devem ser enviados diretamente ao backend
3. **3DS**: Pode ser automático ou requerer interação do usuário
4. **Parcelas**: Valores e juros variam por bandeira e valor
5. **Sandbox**: Usar cartões de teste durante desenvolvimento

---

## 🎯 Prioridade

**ALTA** - Necessário para MVP completo de pagamentos

**Estimativa**: 2-3 semanas de desenvolvimento frontend

