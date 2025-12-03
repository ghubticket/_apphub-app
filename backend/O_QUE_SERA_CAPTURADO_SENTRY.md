# ✅ O Que Será Capturado no Sentry

## 🎯 Resposta Direta

**SIM, você conseguirá ver TODOS os erros importantes:**

✅ **Erros de Desenvolvimento** - Sim, todos  
✅ **Erros de API** - Sim, todos os erros 500  
✅ **Erros de Banco de Dados** - Sim, todos  
✅ **Servidor que Caiu** - Sim, erros de inicialização e crashes  

## 📊 Detalhamento Completo

### ✅ SERÁ CAPTURADO (Você Verá no Sentry)

#### 1. Erros de Desenvolvimento
- ✅ Bugs no código
- ✅ Erros de lógica
- ✅ Erros de tipo (TypeScript)
- ✅ Erros em funções assíncronas não tratadas
- ✅ Promises rejeitadas não tratadas
- ✅ Exceções não capturadas

**Exemplo:**
```typescript
// Se você esquecer de tratar um erro:
app.get('/test', async (req, res) => {
  const data = await someFunction(); // Se der erro aqui
  res.json(data); // Erro será capturado automaticamente
});
```

#### 2. Erros de API
- ✅ Erros 500 (Internal Server Error)
- ✅ Erros em rotas da API
- ✅ Erros em controllers
- ✅ Erros em middlewares
- ✅ Erros de validação de negócio (não validação de input)

**Exemplo:**
```typescript
// Erro ao criar pedido
catch (error) {
  captureControllerError(error, req, { ... }); // ✅ Aparece no Sentry
}
```

#### 3. Erros de Banco de Dados
- ✅ Falha de conexão ao MongoDB
- ✅ Erros de query (syntax, timeout)
- ✅ Erros de transação
- ✅ Banco de dados offline
- ✅ Timeout de conexão
- ✅ Erros de índice
- ✅ Erros de constraint

**Exemplo:**
```typescript
// Se o MongoDB cair:
await Order.create({ ... }); // ✅ Erro será capturado
```

#### 4. Servidor que Caiu
- ✅ Erro ao iniciar servidor
- ✅ Erro ao conectar ao banco na inicialização
- ✅ Crashes não tratados
- ✅ Erros fatais que derrubam o servidor
- ✅ Out of memory
- ✅ Erros de configuração

**Exemplo:**
```typescript
// Se o servidor não conseguir iniciar:
await connectDatabase(); // ✅ Erro será capturado antes de crashar
```

#### 5. Erros de Integração
- ✅ Erros do Mercado Pago
- ✅ Erros de envio de email
- ✅ Erros de serviços externos
- ✅ Timeout de APIs externas

### ❌ NÃO SERÁ CAPTURADO (Filtrado Automaticamente)

#### Erros do Usuário (Esperados)
- ❌ Erros 400 (validação de input)
- ❌ Erros 401 (não autenticado)
- ❌ Erros 403 (sem permissão)
- ❌ Erros 404 (recurso não encontrado)
- ❌ Erros 409 (conflito - email já existe)
- ❌ Rate limiting (muitas requisições)

**Por quê?** Esses são erros esperados, não são bugs. O usuário fez algo errado, não o sistema.

## 🔍 Como Funciona

### Camada 1: Captura Automática
```typescript
// instrument.ts
Sentry.onUncaughtExceptionIntegration() // Captura crashes
Sentry.onUnhandledRejectionIntegration() // Captura promises rejeitadas
Sentry.Handlers.errorHandler() // Captura erros não tratados nas rotas
```

### Camada 2: Captura Manual
```typescript
// Controllers
captureControllerError(error, req, { ... }); // Erros tratados com contexto
```

### Camada 3: Captura de Inicialização
```typescript
// database.ts e server.ts
Sentry.captureException(error, { level: 'fatal' }); // Erros que impedem o servidor de iniciar
```

## 📈 Exemplos Práticos

### Cenário 1: Usuário tenta criar pedido e banco cai
```
1. Usuário clica em "Finalizar Pedido"
2. Backend tenta salvar no MongoDB
3. MongoDB está offline
4. ✅ ERRO CAPTURADO NO SENTRY
   - Controller: ordersController
   - Action: createOrder
   - Erro: MongoError: connection failed
   - Contexto: userId, eventId, ticketTypeId
```

### Cenário 2: Bug no código
```typescript
// Você esqueceu de tratar um erro:
app.get('/api/events', async (req, res) => {
  const events = await Event.find().populate('invalidField'); // Erro aqui
  res.json(events);
});
```
```
✅ ERRO CAPTURADO NO SENTRY
- Rota: /api/events
- Erro: TypeError: Cannot read property...
- Stack trace completo
```

### Cenário 3: Servidor não inicia
```
1. Servidor tenta conectar ao MongoDB
2. MongoDB não está acessível
3. ✅ ERRO CAPTURADO NO SENTRY (antes de crashar)
   - Component: database
   - Action: connectDatabase
   - Level: fatal
   - Erro: MongoError: connection timeout
```

### Cenário 4: Integração falha
```typescript
// Mercado Pago retorna erro inesperado
await paymentService.createPayment(order);
```
```
✅ ERRO CAPTURADO NO SENTRY
- Controller: paymentController
- Action: createCardPayment
- Erro: MercadoPago API error
- Contexto: orderId, error details
```

## 🎯 O Que Você Verá no Sentry

Para cada erro, você verá:

1. **Stack Trace Completo** - Onde o erro aconteceu
2. **Contexto do Usuário** - Quem estava usando (se autenticado)
3. **Contexto da Requisição** - Qual rota, método, IP
4. **Tags** - Controller, action, status code
5. **Extra** - Dados relevantes (orderId, eventId, etc)
6. **Timeline** - Quando aconteceu
7. **Frequência** - Quantas vezes aconteceu

## 🚨 Alertas Recomendados

Configure alertas no Sentry para:

1. **Novos Erros** - Quando um novo tipo de erro aparece
2. **Erros Fatais** - Quando o servidor não consegue iniciar
3. **Taxa de Erro Alta** - Quando > 5% das requisições falham
4. **Erros Críticos** - Erros em pagamentos, criação de pedidos

## ✅ Conclusão

**SIM, você conseguirá ver TODOS os erros importantes:**

- ✅ Erros de desenvolvimento → Capturados automaticamente
- ✅ Erros de API → Capturados em todos os controllers
- ✅ Erros de banco → Capturados com contexto completo
- ✅ Servidor que caiu → Capturado antes de crashar

**O que NÃO aparece:**
- ❌ Erros do usuário (validação, 404, etc) - Filtrados automaticamente

**Resultado:** Sentry limpo, focado apenas em problemas reais que precisam ser corrigidos! 🎯

