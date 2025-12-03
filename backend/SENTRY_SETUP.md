# Configuração do Sentry - Monitoramento de Erros

Este projeto usa **Sentry** para monitoramento de erros e performance da API backend.

## O que o Sentry Monitora

✅ **Erros e Exceções**
- Erros não tratados (uncaught exceptions)
- Promises rejeitadas (unhandled rejections)
- Erros em rotas da API
- Stack traces completos

✅ **Performance da API**
- Tempo de resposta das rotas
- Transações HTTP
- Queries lentas (se configurado)

✅ **Contexto de Erros**
- Informações da requisição (headers, query, body)
- Dados do usuário (se autenticado)
- Ambiente (development/production)
- IP do cliente

## Configuração

### Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# Sentry
SENTRY_DSN=https://seu-dsn@sentry.io/projeto-id
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% das transações (opcional, padrão: 0.1)
NODE_ENV=production  # ou development
```

### Obter DSN do Sentry

1. Acesse [Sentry.io](https://sentry.io)
2. Crie um projeto (ou use um existente)
3. Selecione **Node.js** como plataforma
4. Copie o **DSN** fornecido
5. Adicione ao `.env` como `SENTRY_DSN`

## Como Funciona

### Captura Automática

O Sentry captura automaticamente:
- Erros não tratados em rotas Express
- Erros lançados com `throw new Error()`
- Promises rejeitadas
- Erros de middleware

**Exemplo:**
```typescript
// Este erro será capturado automaticamente pelo Sentry
app.get('/api/test', (req, res) => {
  throw new Error('Erro de teste');
});
```

### Captura Manual

Para adicionar contexto ou capturar erros manualmente:

```typescript
import * as Sentry from '@sentry/node';

try {
  await processPayment(order);
} catch (error) {
  // Adicionar contexto antes de capturar
  Sentry.setContext('payment', {
    orderId: order.id,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
  });
  
  // Capturar erro manualmente
  Sentry.captureException(error, {
    tags: {
      payment: 'failed',
      orderId: order.id,
    },
    level: 'error',
  });
  
  throw error; // Re-lançar se necessário
}
```

### Adicionar Contexto do Usuário

```typescript
import * as Sentry from '@sentry/node';

// Quando usuário faz login
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Quando usuário faz logout
Sentry.setUser(null);
```

## Filtros Configurados

O Sentry está configurado para **NÃO** enviar:

- ❌ Erros de rate limiting (não são erros reais)
- ❌ Erros 404 (não são críticos)
- ❌ Erros de conexão temporários (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
- ❌ Erros HTTP 4xx (client errors)

Isso garante que apenas **erros críticos** sejam reportados, evitando spam.

## Visualizar Erros no Sentry

1. Acesse [Sentry Dashboard](https://sentry.io)
2. Selecione seu projeto
3. Vá em **Issues** para ver erros
4. Vá em **Performance** para ver métricas de performance

## Alertas

Configure alertas no Sentry para receber notificações quando:
- Novos erros ocorrem
- Taxa de erro aumenta
- Performance degrada

**Configuração:**
1. Sentry Dashboard → **Alerts**
2. Criar nova regra de alerta
3. Escolher condições (ex: "novo erro" ou "taxa de erro > 5%")
4. Configurar notificações (email, Slack, etc.)

## Boas Práticas

### ✅ Fazer

- Usar Sentry apenas para erros críticos
- Adicionar contexto relevante aos erros
- Configurar alertas para erros importantes
- Revisar e resolver issues regularmente

### ❌ Evitar

- Capturar erros esperados (ex: validação de input)
- Enviar dados sensíveis (senhas, tokens)
- Capturar erros de rate limiting
- Capturar erros 4xx (client errors)

## Integração com Logger

O logger Winston continua funcionando normalmente para logs locais. O Sentry complementa o logger focando apenas em **erros críticos**.

```typescript
import logger from './utils/logger';
import * as Sentry from '@sentry/node';

try {
  await processOrder(order);
  logger.info('Order processed', { orderId: order.id });
} catch (error) {
  // Log local
  logger.error('Failed to process order', { 
    orderId: order.id, 
    error: error.message 
  });
  
  // Enviar ao Sentry (apenas erros críticos)
  Sentry.captureException(error, {
    tags: { orderId: order.id },
  });
  
  throw error;
}
```

## Troubleshooting

### Sentry não está capturando erros?

1. Verifique se `SENTRY_DSN` está configurado
2. Verifique se o erro não está sendo filtrado
3. Verifique logs do console para erros de conexão
4. Teste com `Sentry.captureMessage('Test')` para verificar conexão

### Muitos erros sendo reportados?

- Ajuste os filtros em `server.ts` (função `beforeSend`)
- Adicione mais erros à lista `ignoreErrors`
- Ajuste `shouldHandleError` para filtrar mais tipos

## Recursos

- [Documentação Sentry Node.js](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Sentry Dashboard](https://sentry.io)
- [Guia de Boas Práticas](https://docs.sentry.io/product/best-practices/)

