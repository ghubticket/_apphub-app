# Configuração Datadog para Vercel - Guia Completo

## ✅ Você já fez deploy - Agora vamos configurar os logs!

### 1. Verificar Variáveis de Ambiente na Vercel

Certifique-se de que estas variáveis estão configuradas na Vercel:

**Vercel Dashboard → Seu Projeto → Settings → Environment Variables**

```env
DD_API_KEY=sua_api_key_aqui
DD_SERVICE=eventhub-backend
DD_ENV=production
DD_SITE=us5.datadoghq.com
LOG_LEVEL=info
```

### 2. Como os Logs Chegam ao Datadog

Para Vercel (serverless), os logs são enviados via **HTTP API** do Datadog, não via Agent.

O logger Winston que configuramos já está preparado, mas precisamos garantir que está enviando corretamente.

### 3. Verificar se Logs Estão Sendo Enviados

#### Opção A: Via Logger Winston (Recomendado)

O logger já está configurado. Verifique se está funcionando:

1. **Verifique se o logger está sendo usado:**
   - Procure por `import logger from '@/utils/logger'` nos arquivos
   - Substitua `console.log` por `logger.info`

2. **Teste um log:**
   ```typescript
   logger.info('Test log from Vercel', {
     service: 'eventhub-backend',
     env: 'production'
   });
   ```

#### Opção B: Enviar Logs Diretamente via HTTP (Alternativa)

Se o Winston não estiver funcionando, podemos enviar logs diretamente:

```typescript
// backend/src/utils/datadogLogger.ts
import axios from 'axios';

const DD_API_KEY = process.env.DD_API_KEY;
const DD_SITE = process.env.DD_SITE || 'us5.datadoghq.com';
const DD_SERVICE = process.env.DD_SERVICE || 'eventhub-backend';

export async function sendLogToDatadog(level: string, message: string, metadata?: any) {
  if (!DD_API_KEY) {
    console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    return;
  }

  try {
    const log = {
      ddsource: 'nodejs',
      ddtags: `env:${process.env.NODE_ENV || 'production'},service:${DD_SERVICE}`,
      hostname: process.env.VERCEL ? 'vercel' : 'local',
      service: DD_SERVICE,
      status: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
      message: message,
      ...metadata,
      timestamp: Date.now(),
    };

    await axios.post(
      `https://http-intake.logs.${DD_SITE}/api/v2/logs`,
      log,
      {
        headers: {
          'DD-API-KEY': DD_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Fallback para console se falhar
    console.error('Erro ao enviar log ao Datadog:', error);
  }
}
```

### 4. Verificar Logs no Datadog

1. Acesse: https://us5.datadoghq.com/logs
2. Filtre por: `service:eventhub-backend`
3. Você deve ver os logs aparecendo

### 5. Troubleshooting

#### Logs não aparecem?

**Verifique:**
- ✅ `DD_API_KEY` está configurado na Vercel?
- ✅ `DD_SERVICE` está configurado?
- ✅ `DD_SITE=us5.datadoghq.com` está configurado?
- ✅ Fez deploy após adicionar as variáveis?
- ✅ Os logs estão sendo gerados? (verifique console da Vercel)

**Teste rápido:**
```typescript
// Adicione isso temporariamente no server.ts
logger.info('🔍 Test log - Datadog connection', {
  timestamp: new Date().toISOString(),
  service: 'eventhub-backend',
  test: true
});
```

#### Ver logs na Vercel primeiro:

1. Vercel Dashboard → Seu Projeto → Functions
2. Veja os logs em tempo real
3. Se aparecerem lá, estão sendo gerados corretamente

### 6. Configuração Completa do Logger

O logger atual já está configurado, mas vamos garantir que funciona na Vercel:

```typescript
// backend/src/utils/logger.ts
// Já está configurado, mas verifique se DD_API_KEY está sendo lido
```

### 7. Próximos Passos

1. ✅ Configure variáveis de ambiente na Vercel
2. ✅ Faça um novo deploy
3. ✅ Gere alguns logs (faça uma requisição à API)
4. ✅ Verifique no Datadog: https://us5.datadoghq.com/logs
5. ✅ Filtre por: `service:eventhub-backend`

### 8. Query Úteis no Datadog

```
# Todos os logs do seu serviço
service:eventhub-backend

# Apenas erros
service:eventhub-backend status:error

# Logs de uma rota específica
service:eventhub-backend @http.url_details.path:"/api/orders"

# Logs das últimas 15 minutos
service:eventhub-backend @timestamp:>now-15m
```

## Checklist Final

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy feito após configurar variáveis
- [ ] Logger sendo usado no código (substituir console.log)
- [ ] Logs aparecendo no Datadog
- [ ] Alertas configurados (opcional)

## Precisa de Ajuda?

Se os logs não aparecerem:
1. Verifique os logs da Vercel primeiro
2. Teste com um log simples
3. Verifique se a API key está correta
4. Aguarde alguns minutos (pode haver delay)

