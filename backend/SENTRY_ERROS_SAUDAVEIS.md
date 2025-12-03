# Como Manter Erros Saudáveis no Sentry

## 📊 Resumo da Implementação

Criamos um sistema centralizado para capturar erros no Sentry de forma inteligente, diferenciando entre:

### ✅ Erros que APARECEM no Sentry (Erros do Servidor)
- **Erros 500** - Erros internos do servidor
- **Erros de banco de dados** - Falhas de conexão, queries, etc
- **Erros de integração** - Mercado Pago, email, etc
- **Erros inesperados** - Qualquer erro não tratado

### ❌ Erros que NÃO aparecem (Erros do Usuário)
- **Erros 400** - Validação de dados (email inválido, campos obrigatórios)
- **Erros 401** - Não autenticado
- **Erros 403** - Sem permissão
- **Erros 404** - Recurso não encontrado
- **Erros 409** - Conflito (email já existe, etc)
- **Erros de validação Mongoose** - Schema validation
- **Rate limiting** - Muitas requisições

## 🎯 Como Funciona

### Utilitário Centralizado

Criamos `backend/src/utils/sentryErrorHandler.ts` que:

1. **Diferencia automaticamente** erros esperados vs inesperados
2. **Adiciona contexto** útil (usuário, requisição, etc)
3. **Filtra dados sensíveis** (não envia senhas, tokens, etc)
4. **Adiciona tags** para facilitar busca no Sentry

### Uso nos Controllers

```typescript
import { captureControllerError } from '../utils/sentryErrorHandler';

// Em um catch block:
catch (error: any) {
    console.error('Erro ao criar pedido:', error);
    
    // Captura automaticamente no Sentry (se for erro inesperado)
    captureControllerError(error, req, {
        controller: 'ordersController',
        action: 'createOrder',
        statusCode: 500,
        extra: {
            eventId: req.body?.eventId,
            ticketTypeId: req.body?.ticketTypeId,
        },
    });
    
    return res.status(500).json({
        success: false,
        message: 'Erro ao criar pedido',
    });
}
```

## 📋 Status dos Controllers

### ✅ Atualizados
- `authController.ts` - Registro e login
- `ordersController.ts` - Criação de pedidos
- `paymentController.ts` - Pagamentos PIX e cartão

### ⏳ Pendentes (mas funcionando com captura automática)
- `ticketsController.ts`
- `ticketTypesController.ts`
- `eventsController.ts`
- `usersController.ts`
- `promoterCodesController.ts`
- `newsletterController.ts`
- `catalogController.ts`

**Nota:** Mesmo os controllers pendentes capturam erros automaticamente via `Sentry.Handlers.errorHandler()` no `server.ts`. A atualização manual adiciona mais contexto.

## 🔍 O que Aparece no Sentry

### Contexto Automático
- **Usuário:** ID, email, role (se autenticado)
- **Requisição:** Método, path, IP, User-Agent
- **Tags:** Controller, action, status code
- **Extra:** Dados relevantes (sem informações sensíveis)

### Exemplo de Erro no Sentry

```
Erro: Database connection failed
Tags:
  - controller: ordersController
  - action: createOrder
  - statusCode: 500
  - errorType: MongoError

Extra:
  - userId: "507f1f77bcf86cd799439011"
  - userEmail: "user@example.com"
  - eventId: "507f1f77bcf86cd799439012"
  - request:
      method: "POST"
      path: "/api/orders"
      ip: "192.168.1.1"
```

## 🛡️ Proteções Implementadas

### 1. Filtro de Erros Esperados
Não envia erros de validação, 404, etc ao Sentry.

### 2. Proteção de Dados Sensíveis
- Não envia senhas
- Não envia tokens completos
- Não envia dados de cartão
- Limita informações do body

### 3. Rate Limiting
O Sentry tem rate limiting próprio, mas nossos filtros reduzem spam.

## 📈 Monitoramento

### No Sentry Dashboard

1. **Issues** - Veja todos os erros
2. **Performance** - Veja transações lentas
3. **Logs** - Veja logs estruturados (warn/error)

### Alertas Recomendados

Configure alertas para:
- **Novos erros** - Quando um novo tipo de erro aparece
- **Taxa de erro alta** - Quando > 5% das requisições falham
- **Erros críticos** - Erros em pagamentos, criação de pedidos

## 🎓 Boas Práticas

### ✅ Fazer
- Usar `captureControllerError` em todos os controllers
- Adicionar contexto relevante no `extra`
- Revisar erros regularmente no Sentry
- Resolver issues antigas

### ❌ Evitar
- Capturar erros esperados manualmente
- Enviar dados sensíveis no `extra`
- Ignorar erros recorrentes
- Deixar issues sem resolver

## 🔧 Troubleshooting

### Erros não aparecem no Sentry?

1. Verifique se `SENTRY_DSN` está configurado
2. Verifique se o erro não está sendo filtrado (é esperado?)
3. Verifique logs do console para erros de conexão

### Muitos erros aparecendo?

1. Ajuste filtros em `sentryErrorHandler.ts`
2. Adicione mais erros à lista `EXPECTED_ERROR_CODES`
3. Revise se algum erro esperado está sendo capturado

## 📚 Recursos

- [Sentry Dashboard](https://app-hub-xu.sentry.io)
- [Documentação Sentry](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Guia de Boas Práticas](https://docs.sentry.io/product/best-practices/)

