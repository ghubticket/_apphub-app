# Plano de Implementação - Timeout de Pedidos Pendentes

## 📋 Regras de Negócio

### 1. Timer de 12 minutos no Checkout
- ✅ Quando usuário entra no checkout → **Inicia timer de 12 minutos**
- ✅ Pedido fica como `pending` durante esses 12 minutos
- ✅ Ingressos saem do estoque (`soldQuantity += quantity`)
- ✅ Timer visível para o usuário (countdown)

### 2. Cancelamento Automático
- ✅ **F5 (recarregar página)** → Cancelar pedido pendente → Devolver ingressos
- ✅ **Voltar para Home** → Cancelar pedido pendente → Devolver ingressos
- ✅ **Navegar para outra página** → Cancelar pedido pendente → Devolver ingressos
- ✅ **Qualquer ação fora do checkout** → Cancelar pedido pendente → Devolver ingressos

### 3. Modal de Aviso
- ✅ Antes de cancelar → Mostrar modal avisando:
  - "Seu pedido será cancelado e os ingressos voltarão ao estoque"
  - "Deseja continuar?"
  - Botões: "Cancelar pedido" / "Voltar ao checkout"

### 4. PIX com Tempo Limitado
- ✅ Se mudar para PIX durante checkout:
  - **Opção A**: Código PIX disponível pelo **resto do timer** (ex: se faltam 8min, PIX expira em 8min)
  - **Opção B**: Código PIX disponível por **+30 minutos** a partir do momento de gerar
  - **Decisão**: Vamos com **Opção B** (+30min) - mais simples e previsível

### 5. Overlay Apenas para Sucesso
- ✅ **Pagamento aprovado** → Overlay verde com mensagem de sucesso
- ❌ **Pagamento recusado** → Mensagem inline (sem overlay)
- ❌ **Erros** → Mensagem inline (sem overlay)

### 6. Limite de Tentativas
- ✅ Se recusar **mais de 3 vezes** → Cancelar pedido → Devolver ingressos
- ✅ Usuário precisa criar novo pedido

## 🎯 Implementação por Partes

### Parte 1: Timer de 12 minutos no Frontend ✅
- [x] Criar hook `useCheckoutTimer`
- [x] Iniciar timer quando entrar no checkout
- [x] Mostrar countdown visível para usuário
- [x] Cancelar pedido quando timer chegar a 0

### Parte 2: Cancelamento ao Sair do Checkout ✅
- [x] Detectar quando usuário sai do checkout (F5, navegação, etc)
- [x] Mostrar modal de confirmação antes de cancelar
- [x] Cancelar pedido no backend
- [x] Devolver ingressos ao estoque

### Parte 3: PIX com Tempo Limitado ⏳
- [ ] Ao gerar PIX, calcular expiração baseado em:
  - Tempo restante do timer OU
  - +30 minutos a partir de agora
- [ ] Atualizar `date_of_expiration` do PIX no Mercado Pago
- [ ] Mostrar countdown do PIX na tela

### Parte 4: Remover Overlay de Erro ✅
- [x] Manter overlay apenas para sucesso
- [x] Mostrar erros como mensagem inline
- [x] Usar componente de mensagem de erro simples

### Parte 5: Job/Cron para Limpeza (Opcional) ⏳
- [ ] Criar job que roda a cada 5 minutos
- [ ] Buscar pedidos `pending` com mais de 12 minutos
- [ ] Cancelar automaticamente
- [ ] Devolver ingressos ao estoque
- **Nota**: Pode não ser necessário se frontend gerencia bem

## 🔄 Fluxo Completo

### Cenário 1: Usuário completa pagamento em tempo
1. Entra no checkout → Timer inicia (12min)
2. Preenche dados → Timer continua
3. Paga com cartão → **Pagamento aprovado** → Overlay verde → Timer para
4. ✅ Sucesso!

### Cenário 2: Usuário sai do checkout
1. Entra no checkout → Timer inicia (12min)
2. Tenta voltar para home → **Modal aparece**
3. Usuário confirma → Pedido cancelado → Ingressos devolvidos
4. ✅ Limpo!

### Cenário 3: Timer expira
1. Entra no checkout → Timer inicia (12min)
2. Usuário demora muito → Timer chega a 0
3. **Pedido cancelado automaticamente** → Ingressos devolvidos
4. ✅ Limpo!

### Cenário 4: Muda para PIX durante checkout
1. Entra no checkout → Timer inicia (12min)
2. Restam 8 minutos → Muda para PIX
3. **PIX gerado com expiração de +30min** (não usa resto do timer)
4. Timer do checkout continua (mas não cancela se PIX está ativo)
5. ✅ PIX disponível por 30min!

### Cenário 5: Pagamento recusado 3 vezes
1. Entra no checkout → Timer inicia (12min)
2. Tenta pagar → Recusado (tentativa 1)
3. Tenta pagar → Recusado (tentativa 2)
4. Tenta pagar → Recusado (tentativa 3)
5. **Pedido cancelado** → Ingressos devolvidos
6. ✅ Limpo!

## 📝 Decisões Técnicas

### Timer no Frontend ou Backend?
- **Frontend**: Mais responsivo, atualiza em tempo real
- **Backend**: Mais confiável, não depende de cliente
- **Decisão**: **Ambos** - Frontend para UX, Backend para segurança

### Como detectar saída do checkout?
- `beforeunload` event (F5, fechar aba)
- `useEffect` cleanup (componente desmonta)
- Router events (navegação)
- **Decisão**: Usar todos para garantir

### PIX expira quando?
- **Decisão**: +30 minutos a partir da geração (não usa resto do timer)
- Mais simples e previsível para usuário

### Job/Cron necessário?
- **Decisão**: Sim, como backup de segurança
- Roda a cada 5 minutos
- Limpa pedidos pendentes com mais de 12 minutos

