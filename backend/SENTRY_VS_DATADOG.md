# Sentry vs Datadog: Comparação e Uso Conjunto

## Visão Geral

### Sentry
**Foco**: Rastreamento de erros e exceções
- Detecta e reporta erros em tempo real
- Stack traces detalhados
- Contexto do erro (usuário, request, ambiente)
- Alertas quando erros ocorrem
- **Gratuito até 5.000 eventos/mês**

### Datadog
**Foco**: Observabilidade completa (logs, métricas, traces, APM)
- Logs estruturados e pesquisáveis
- Métricas de performance (CPU, memória, latência)
- Distributed tracing (APM)
- Dashboards e visualizações
- **Pago** (mas tem trial gratuito)

## Comparação Detalhada

| Característica | Sentry | Datadog |
|---------------|--------|---------|
| **Propósito Principal** | Rastreamento de erros | Observabilidade completa |
| **Logs** | ❌ Não (apenas erros) | ✅ Sim (logs estruturados) |
| **Métricas** | ❌ Limitado | ✅ Sim (CPU, memória, latência) |
| **APM/Tracing** | ⚠️ Básico | ✅ Avançado |
| **Alertas** | ✅ Sim (erros) | ✅ Sim (múltiplos tipos) |
| **Dashboards** | ⚠️ Básico | ✅ Avançado |
| **Preço** | Gratuito (5k eventos/mês) | Pago (trial gratuito) |
| **Melhor Para** | Detectar e debugar erros | Monitoramento completo |

## Quando Usar Cada Um

### Use Sentry Para:
✅ **Erros e Exceções**
- Capturar erros não tratados
- Stack traces detalhados
- Contexto do erro (usuário, request)
- Alertas imediatos quando algo quebra

**Exemplo de uso:**
```typescript
try {
  await processPayment(order);
} catch (error) {
  Sentry.captureException(error, {
    tags: { payment: 'failed' },
    extra: { orderId: order.id }
  });
  throw error;
}
```

### Use Datadog Para:
✅ **Monitoramento Geral**
- Logs estruturados de toda aplicação
- Métricas de performance
- Análise de tráfego e uso
- Correlação entre logs, métricas e traces

**Exemplo de uso:**
```typescript
logger.info('Payment processed', {
  orderId: order.id,
  amount: order.amount,
  method: order.paymentMethod,
  duration: 150 // ms
});
```

## Como Eles Se Complementam

### Cenário Ideal: Usar Ambos

```
┌─────────────────────────────────────────┐
│         Sua Aplicação Node.js            │
└─────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌──────────┐         ┌──────────┐
    │  Sentry   │         │ Datadog  │
    └──────────┘         └──────────┘
           │                    │
           ▼                    ▼
    Erros Críticos      Logs + Métricas
    Stack Traces        Performance
    Alertas Imediatos   Análise Geral
```

### Fluxo de Trabalho Recomendado

1. **Sentry**: Captura erros críticos e envia alertas imediatos
   - "Erro ao processar pagamento"
   - "Falha na conexão com banco"
   - "Exceção não tratada"

2. **Datadog**: Monitora operação normal e performance
   - Logs de todas as operações
   - Métricas de latência
   - Análise de padrões

3. **Correlação**: Quando Sentry detecta erro, use Datadog para contexto
   - Ver logs antes do erro
   - Analisar métricas no momento do erro
   - Entender o que causou o problema

## Configuração no Projeto

### Sentry (Já Configurado)

```typescript
// backend/src/server.ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
    });
}
```

**Variáveis de ambiente:**
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Datadog (Novo)

```typescript
// backend/src/utils/logger.ts
import logger from '@/utils/logger';

logger.info('Payment processed', { orderId: '123' });
```

**Variáveis de ambiente:**
```env
DD_API_KEY=seu_api_key
DD_SERVICE=eventhub-backend
DD_ENV=production
```

## Exemplos Práticos

### Cenário 1: Erro em Pagamento

**Sentry captura:**
```typescript
try {
  await mercadoPago.createPayment(data);
} catch (error) {
  Sentry.captureException(error, {
    tags: { 
      service: 'payment',
      provider: 'mercadopago'
    },
    extra: {
      orderId: order.id,
      amount: order.amount
    }
  });
  logger.error('Payment creation failed', {
    orderId: order.id,
    error: error.message,
    provider: 'mercadopago'
  });
  throw error;
}
```

**Resultado:**
- **Sentry**: Alerta imediato + stack trace + contexto
- **Datadog**: Log estruturado para análise posterior

### Cenário 2: Performance Lenta

**Datadog monitora:**
```typescript
const startTime = Date.now();
await processOrder(order);
const duration = Date.now() - startTime;

logger.info('Order processed', {
  orderId: order.id,
  duration,
  itemsCount: order.items.length
});

// Se muito lento, alertar
if (duration > 5000) {
  logger.warn('Slow order processing', {
    orderId: order.id,
    duration,
    threshold: 5000
  });
}
```

**Resultado:**
- **Datadog**: Métrica de latência + alerta se configurado
- **Sentry**: Não captura (não é erro)

### Cenário 3: Erro Crítico com Contexto

**Ambos trabalham juntos:**
```typescript
try {
  await criticalOperation();
} catch (error) {
  // Sentry: Erro crítico com contexto
  Sentry.captureException(error, {
    level: 'fatal',
    tags: { critical: true },
    extra: { operation: 'criticalOperation' }
  });
  
  // Datadog: Log para análise
  logger.error('Critical operation failed', {
    error: error.message,
    stack: error.stack,
    operation: 'criticalOperation',
    timestamp: new Date().toISOString()
  });
  
  throw error;
}
```

## Custos

### Sentry
- **Free**: 5.000 eventos/mês
- **Team**: $26/mês (50k eventos)
- **Business**: $80/mês (500k eventos)

### Datadog
- **Free Trial**: 14 dias
- **Pro**: $31/host/mês (logs + métricas)
- **Enterprise**: $45/host/mês (tudo)

**Dica**: Para começar, use Sentry gratuito + Datadog trial.

## Recomendação para Este Projeto

### Fase 1: Início (Gratuito)
✅ **Sentry** (já configurado)
- Captura erros críticos
- Alertas imediatos
- Gratuito até 5k eventos/mês

✅ **Logger com Winston** (novo)
- Logs estruturados
- Sem custo adicional
- Pode adicionar Datadog depois

### Fase 2: Crescimento
✅ **Sentry** (mantém)
- Continua capturando erros

✅ **Datadog** (adiciona quando necessário)
- Quando precisar de análise avançada
- Quando quiser métricas de performance
- Quando quiser correlacionar logs + métricas

### Fase 3: Produção Avançada
✅ **Ambos**
- Sentry para erros críticos
- Datadog para observabilidade completa
- Correlação entre ambos

## Alternativas Gratuitas ao Datadog

Se não quiser pagar pelo Datadog:

1. **Grafana + Loki** (self-hosted)
   - Logs estruturados
   - Gratuito (mas precisa infraestrutura)

2. **Elasticsearch + Kibana** (self-hosted)
   - Logs + análise
   - Gratuito (mas precisa infraestrutura)

3. **CloudWatch** (AWS)
   - Se estiver na AWS
   - Primeiros 5GB/mês grátis

4. **Apenas Logger + Arquivo**
   - Logs em arquivo
   - Análise manual
   - Totalmente gratuito

## Resumo

| | Sentry | Datadog |
|---|---|---|
| **Use para** | Erros e exceções | Observabilidade completa |
| **Custo inicial** | Gratuito | Trial gratuito |
| **Melhor quando** | Precisa detectar erros rapidamente | Precisa monitorar tudo |
| **Recomendação** | ✅ Já configurado, mantenha | ⚠️ Adicione quando crescer |

**Conclusão**: Mantenha Sentry para erros e use o logger Winston (com Datadog opcional) para logs gerais. Eles se complementam perfeitamente!

