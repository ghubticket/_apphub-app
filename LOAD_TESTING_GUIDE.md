# 🚀 Guia de Testes de Carga - Railway & Vercel

## 📊 Ferramentas Recomendadas

### 1. **k6 (Recomendado) - Gratuito e Poderoso**
- ✅ Open source e gratuito
- ✅ Scripts em JavaScript
- ✅ Excelente para APIs
- ✅ Suporta até milhões de usuários virtuais

### 2. **Locust - Python**
- ✅ Gratuito e open source
- ✅ Interface web para monitoramento
- ✅ Fácil de usar

### 3. **Artillery - Node.js**
- ✅ Gratuito
- ✅ Fácil integração com projetos Node.js
- ✅ Boa documentação

### 4. **Serviços Online (Pagos mas Fáceis)**
- **Loader.io** - Testes simples via interface web
- **k6 Cloud** - Versão cloud do k6
- **BlazeMeter** - Testes avançados (pago)

## 🎯 Limites Conhecidos

### **Vercel (Hobby/Pro)**
- **Hobby**: 100GB bandwidth/mês, 100 execuções serverless/hora
- **Pro**: Bandwidth ilimitado, execuções serverless escaláveis
- **Limite de tempo**: 10s (Hobby) / 60s (Pro) por função serverless
- **Concorrência**: Escala automaticamente, mas pode ter throttling

### **Railway**
- **Hobby**: $5/mês - 1 serviço, 512MB RAM, 1GB storage
- **Pro**: $20/mês - 5 serviços, 8GB RAM, 100GB storage
- **CPU**: Compartilhado, pode throttling sob carga
- **Escalabilidade**: Manual (precisa configurar)

## 🛠️ Setup Rápido com k6

### Instalação

```bash
# Windows (via Chocolatey)
choco install k6

# Ou baixar direto: https://k6.io/docs/getting-started/installation/
```

### Script Básico de Teste

Crie `load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');

// Configuração do teste
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up: 0 a 10 usuários em 30s
    { duration: '1m', target: 10 },     // Mantém 10 usuários por 1min
    { duration: '30s', target: 50 },    // Ramp-up: 10 a 50 usuários em 30s
    { duration: '1m', target: 50 },    // Mantém 50 usuários por 1min
    { duration: '30s', target: 100 },   // Ramp-up: 50 a 100 usuários em 30s
    { duration: '2m', target: 100 },    // Mantém 100 usuários por 2min
    { duration: '30s', target: 0 },     // Ramp-down: 100 a 0 usuários em 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requisições devem ser < 2s
    http_req_failed: ['rate<0.01'],     // Taxa de erro < 1%
    errors: ['rate<0.01'],
  },
};

// Variáveis de ambiente
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:5000';

// Função de teste
export default function () {
  // Simular usuário fazendo login
  const loginRes = http.post(`${API_URL}/auth/login`, JSON.stringify({
    email: `test${Math.floor(Math.random() * 1000)}@test.com`,
    password: 'test123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status 200 ou 401': (r) => r.status === 200 || r.status === 401,
  });

  if (loginSuccess && loginRes.status === 200) {
    const token = loginRes.json('token');
    
    // Fazer requisição autenticada
    const ordersRes = http.get(`${API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    check(ordersRes, {
      'orders status 200': (r) => r.status === 200,
      'orders response time < 2s': (r) => r.timings.duration < 2000,
    });
  }

  errorRate.add(loginRes.status >= 400 || (loginRes.status === 200 && !loginSuccess));

  sleep(1); // Pausa de 1s entre requisições
}
```

### Executar Teste

```bash
# Teste básico
k6 run load-test.js

# Com variáveis de ambiente
k6 run --env BASE_URL=https://seu-app.vercel.app --env API_URL=https://seu-backend.railway.app load-test.js

# Teste mais agressivo (aumentar target)
k6 run --env BASE_URL=https://seu-app.vercel.app load-test.js
```

## 🧪 Teste Específico para Seu Projeto

### Teste de Endpoints Críticos

Crie `app-load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderCreationTime = new Trend('order_creation_time');
const pixGenerationTime = new Trend('pix_generation_time');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // 20 usuários simultâneos
    { duration: '2m', target: 50 },  // 50 usuários simultâneos
    { duration: '2m', target: 100 }, // 100 usuários simultâneos
    { duration: '1m', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://seu-app.vercel.app';
const API_URL = __ENV.API_URL || 'https://seu-backend.railway.app';

export default function () {
  // 1. Testar criação de pedido
  const orderPayload = JSON.stringify({
    eventId: 'test-event-id',
    ticketTypeId: 'test-ticket-type-id',
    quantity: 1,
  });

  const orderRes = http.post(`${API_URL}/orders`, orderPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const orderSuccess = check(orderRes, {
    'order created': (r) => r.status === 200 || r.status === 201,
  });

  orderCreationTime.add(orderRes.timings.duration);
  errorRate.add(!orderSuccess);

  if (orderSuccess && orderRes.status < 300) {
    const orderId = orderRes.json('data._id') || orderRes.json('_id');
    
    sleep(1);

    // 2. Testar geração de PIX
    const pixPayload = JSON.stringify({
      deviceId: 'test-device-id',
    });

    const pixStart = Date.now();
    const pixRes = http.post(`${API_URL}/payments/${orderId}/pix`, pixPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const pixDuration = Date.now() - pixStart;

    const pixSuccess = check(pixRes, {
      'pix generated': (r) => r.status === 200 || r.status === 201,
    });

    pixGenerationTime.add(pixDuration);
    errorRate.add(!pixSuccess);
  }

  sleep(2);
}
```

## 📈 Monitoramento Durante Testes

### Railway
1. Acesse o dashboard do Railway
2. Monitore:
   - **CPU Usage**
   - **Memory Usage**
   - **Network I/O**
   - **Logs** (para erros)

### Vercel
1. Acesse o dashboard do Vercel
2. Monitore:
   - **Function Invocations**
   - **Function Duration**
   - **Bandwidth**
   - **Logs** (para erros)

## 🎯 Cenários de Teste Recomendados

### 1. **Teste de Carga Normal**
- 10-50 usuários simultâneos
- Duração: 5-10 minutos
- Objetivo: Verificar comportamento normal

### 2. **Teste de Stress**
- 100-500 usuários simultâneos
- Duração: 10-15 minutos
- Objetivo: Encontrar limites

### 3. **Teste de Pico**
- 500-1000 usuários simultâneos
- Duração: 5 minutos
- Objetivo: Testar recuperação após pico

### 4. **Teste de Endurance**
- 50-100 usuários simultâneos
- Duração: 30-60 minutos
- Objetivo: Verificar vazamento de memória

## ⚠️ Sinais de Problema

### Railway
- CPU > 80% constante
- Memory > 90%
- Timeouts frequentes
- Erros 503 (Service Unavailable)

### Vercel
- Function timeouts (> 10s Hobby, > 60s Pro)
- Erros 502/503
- Bandwidth excedido
- Function invocations limitadas

## 🔧 Otimizações Baseadas nos Testes

### Se Railway estiver lento:
1. Aumentar recursos (upgrade de plano)
2. Otimizar queries de banco
3. Adicionar cache (Redis)
4. Implementar rate limiting

### Se Vercel estiver lento:
1. Otimizar Server Actions
2. Adicionar cache (Next.js Cache)
3. Usar Edge Functions quando possível
4. Considerar upgrade para Pro

## 📊 Exemplo de Resultado

```
✓ login status 200 ou 401
✓ orders status 200
✓ orders response time < 2s

checks.........................: 100.00% ✓ 2000      ✗ 0
data_received..................: 2.5 MB  42 kB/s
data_sent......................: 1.2 MB  20 kB/s
http_req_duration..............: avg=450ms  min=120ms  med=380ms  max=2500ms  p(95)=1200ms
http_req_failed................: 0.00%  ✓ 0         ✗ 0
iterations.....................: 1000    16.67/s
vus............................: 50      min=0       max=50
```

## 🚀 Próximos Passos

1. **Instalar k6**: `choco install k6` (Windows)
2. **Criar script de teste** baseado no exemplo acima
3. **Executar teste gradual**: Começar com 10 usuários, aumentar gradualmente
4. **Monitorar dashboards**: Railway e Vercel durante os testes
5. **Analisar resultados**: Identificar gargalos e otimizar

## 📚 Recursos Adicionais

- **k6 Docs**: https://k6.io/docs/
- **Locust Docs**: https://docs.locust.io/
- **Artillery Docs**: https://www.artillery.io/docs
- **Railway Limits**: https://docs.railway.app/reference/limits
- **Vercel Limits**: https://vercel.com/docs/concepts/limits

