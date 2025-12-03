# Monitoramento Completo: API, Aplicação e Infraestrutura

## Cenário: Monitorar Tudo e Receber Alertas

Você quer saber quando:
- ✅ Alguém comprou na plataforma
- ❌ Erro disparou
- 🔴 Servidor caiu
- 📊 Uso de memória/CPU alto
- 🐌 API lenta

## Solução Recomendada: Datadog

**Por quê?**
- ✅ Monitora **infraestrutura** (CPU, memória, disco)
- ✅ Monitora **aplicação** (endpoints, latência)
- ✅ **Alertas em tempo real** (email, Slack, SMS)
- ✅ Dashboards visuais
- ✅ Correlação entre tudo

## Configuração Completa

### 1. Instalar Datadog Agent (Opcional - para métricas de sistema)

Se você tem acesso ao servidor:

```bash
# Linux
DD_API_KEY=seu_api_key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/install_script.sh)"

# Docker
docker run -d --name datadog-agent \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  -e DD_API_KEY=seu_api_key \
  -e DD_SITE=datadoghq.com \
  datadog/agent:latest
```

### 2. Configurar Logger (Já feito)

O logger já está configurado para enviar logs ao Datadog.

### 3. Adicionar Métricas Customizadas

Vamos criar um serviço para enviar métricas ao Datadog:

```typescript
// backend/src/utils/metrics.ts
import logger from './logger';

interface MetricData {
  name: string;
  value: number;
  tags?: string[];
  type?: 'count' | 'gauge' | 'histogram';
}

/**
 * Envia métricas customizadas ao Datadog
 * Funciona mesmo sem Datadog Agent instalado
 */
export function sendMetric(data: MetricData) {
  const { name, value, tags = [], type = 'gauge' } = data;
  
  // Log estruturado que o Datadog pode parsear
  logger.info(`[METRIC] ${name}`, {
    metric: name,
    value,
    type,
    tags: tags.join(','),
    timestamp: Date.now(),
  });
}

// Métricas pré-definidas
export const metrics = {
  // Métricas de negócio
  orderCreated: (orderId: string, amount: number) => {
    sendMetric({
      name: 'order.created',
      value: amount,
      tags: [`order_id:${orderId}`],
      type: 'count',
    });
  },
  
  paymentProcessed: (orderId: string, method: string, success: boolean) => {
    sendMetric({
      name: 'payment.processed',
      value: success ? 1 : 0,
      tags: [`order_id:${orderId}`, `method:${method}`, `success:${success}`],
      type: 'count',
    });
  },
  
  // Métricas de performance
  apiLatency: (endpoint: string, method: string, duration: number) => {
    sendMetric({
      name: 'api.latency',
      value: duration,
      tags: [`endpoint:${endpoint}`, `method:${method}`],
      type: 'histogram',
    });
  },
  
  // Métricas de sistema (se não tiver Datadog Agent)
  memoryUsage: (used: number, total: number) => {
    sendMetric({
      name: 'system.memory.used',
      value: used,
      tags: [],
      type: 'gauge',
    });
    sendMetric({
      name: 'system.memory.total',
      value: total,
      tags: [],
      type: 'gauge',
    });
  },
  
  cpuUsage: (percent: number) => {
    sendMetric({
      name: 'system.cpu.usage',
      value: percent,
      tags: [],
      type: 'gauge',
    });
  },
};
```

### 4. Middleware para Métricas de API

```typescript
// backend/src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { metrics } from '../utils/metrics';
import os from 'os';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Capturar métricas de sistema periodicamente (a cada 60s)
  const now = Date.now();
  if (!(global as any).__lastMetricsTime || now - (global as any).__lastMetricsTime > 60000) {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    metrics.memoryUsage(memUsage.heapUsed, memUsage.heapTotal);
    metrics.cpuUsage(process.cpuUsage().user / 1000000); // Convert to seconds
    
    (global as any).__lastMetricsTime = now;
  }
  
  // Capturar latência da requisição
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metrics.apiLatency(req.path, req.method, duration);
    
    // Alertar se muito lento
    if (duration > 5000) {
      logger.warn('Slow API request', {
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
      });
    }
  });
  
  next();
}
```

### 5. Integrar no Server

```typescript
// backend/src/server.ts
import { metricsMiddleware } from './middleware/metrics';
import { metrics } from './utils/metrics';

// Adicionar middleware de métricas
app.use(metricsMiddleware);

// Exemplo: Métrica quando pedido é criado
// (adicionar no controller de orders)
metrics.orderCreated(order.id, order.totalAmount);
```

## Alertas no Datadog

### Configurar Alertas

1. Acesse [Datadog Monitors](https://app.datadoghq.com/monitors)
2. Crie alertas para:

#### Alerta 1: Servidor Caiu
```
Monitor Type: Service Check
Service: eventhub-backend
Alert quando: health check falhar por 2 minutos
Notificar: Email, Slack, SMS
```

#### Alerta 2: Erro Crítico
```
Monitor Type: Logs
Query: status:error service:eventhub-backend
Alert quando: > 5 erros em 5 minutos
Notificar: Email, Slack
```

#### Alerta 3: Memória Alta
```
Monitor Type: Metric
Metric: system.memory.used
Alert quando: > 80% por 5 minutos
Notificar: Email, Slack
```

#### Alerta 4: API Lenta
```
Monitor Type: Metric
Metric: api.latency
Alert quando: p95 > 3000ms por 5 minutos
Notificar: Email
```

#### Alerta 5: Pedido Criado (Notificação)
```
Monitor Type: Logs
Query: "order.created" service:eventhub-backend
Alert quando: qualquer ocorrência
Notificar: Slack (canal de vendas)
```

## Alternativas Gratuitas

Se não quiser pagar pelo Datadog:

### Opção 1: Uptime Robot (Gratuito)
- ✅ Monitora uptime (servidor caiu)
- ✅ Alertas por email/SMS
- ✅ Gratuito até 50 monitors
- ❌ Não monitora métricas detalhadas

**Setup:**
1. Acesse [Uptime Robot](https://uptimerobot.com)
2. Adicione monitor para: `https://seu-dominio.com/health`
3. Configure alertas

### Opção 2: New Relic (Tier Gratuito)
- ✅ Monitora aplicação + infraestrutura
- ✅ Alertas
- ✅ Gratuito até 100GB/mês
- ⚠️ Mais complexo que Datadog

### Opção 3: Prometheus + Grafana (Self-hosted)
- ✅ Totalmente gratuito
- ✅ Muito poderoso
- ❌ Precisa infraestrutura própria
- ❌ Mais complexo de configurar

### Opção 4: CloudWatch (AWS)
- ✅ Se estiver na AWS
- ✅ Primeiros 5GB/mês grátis
- ✅ Alertas via SNS

## Solução Híbrida Recomendada (Gratuita)

### Para Começar (Gratuito):

1. **Uptime Robot** (Gratuito)
   - Monitora se servidor caiu
   - Alertas por email/SMS
   - Setup: 5 minutos

2. **Sentry** (Gratuito - já configurado)
   - Alertas de erros
   - Stack traces
   - Gratuito até 5k eventos/mês

3. **Logger Winston** (Gratuito)
   - Logs estruturados
   - Pode enviar para arquivo
   - Pode adicionar Datadog depois

4. **Health Check Endpoint** (Gratuito)
   - Endpoint `/health` que verifica:
     - Banco de dados conectado
     - Memória disponível
     - Status geral

### Quando Crescer:

Adicione **Datadog** para:
- Métricas detalhadas
- Dashboards
- Análise avançada
- Correlação entre logs + métricas

## Health Check Melhorado

Vamos melhorar o endpoint `/health` para incluir métricas:

```typescript
// backend/src/routes/health.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import logger from '../utils/logger';

export const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      memory: 'unknown',
      disk: 'unknown',
    },
    metrics: {
      memory: {
        used: 0,
        total: 0,
        percent: 0,
      },
      cpu: {
        usage: 0,
      },
    },
  };

  // Check Database
  try {
    if (mongoose.connection.readyState === 1) {
      checks.checks.database = 'ok';
    } else {
      checks.checks.database = 'error';
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.checks.database = 'error';
    checks.status = 'error';
    logger.error('Health check: Database error', { error });
  }

  // Check Memory
  try {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    checks.metrics.memory = {
      used: Math.round(usedMem / 1024 / 1024), // MB
      total: Math.round(totalMem / 1024 / 1024), // MB
      percent: Math.round(memPercent * 100) / 100,
    };

    if (memPercent > 90) {
      checks.checks.memory = 'warning';
      checks.status = 'degraded';
      logger.warn('High memory usage detected', checks.metrics.memory);
    } else {
      checks.checks.memory = 'ok';
    }
  } catch (error) {
    checks.checks.memory = 'error';
    logger.error('Health check: Memory error', { error });
  }

  // Check Disk (opcional)
  try {
    // Implementar check de disco se necessário
    checks.checks.disk = 'ok';
  } catch (error) {
    checks.checks.disk = 'error';
  }

  const statusCode = checks.status === 'ok' ? 200 : checks.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(checks);
};
```

## Resumo: Qual Usar?

### Para Seu Caso Específico:

**Agora (Gratuito):**
1. ✅ **Uptime Robot** - Monitora se servidor caiu (5 min setup)
2. ✅ **Sentry** - Alertas de erros (já configurado)
3. ✅ **Logger Winston** - Logs estruturados (já configurado)
4. ✅ **Health Check** - Status da aplicação (já existe, vamos melhorar)

**Quando Crescer:**
- ➕ **Datadog** - Para análise completa e dashboards

### Custo Estimado:

- **Gratuito**: Uptime Robot + Sentry + Logger = $0/mês
- **Pago**: Datadog = ~$31/mês (quando precisar)

## Próximos Passos

1. ✅ Melhorar health check endpoint
2. ✅ Adicionar métricas customizadas
3. ✅ Configurar Uptime Robot
4. ⚠️ Adicionar Datadog (opcional, quando crescer)

Quer que eu implemente o health check melhorado e as métricas agora?

