# Configuração do Logger com Datadog

Este projeto usa **Winston** como logger estruturado com integração opcional ao **Datadog** para monitoramento em produção.

## Instalação

As dependências já estão no `package.json`. Para instalar:

```bash
npm install
```

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu `.env`:

```env
# Logger
LOG_LEVEL=info                    # debug, info, warn, error (padrão: info em produção, debug em dev)

# Datadog (opcional - apenas para produção)
DD_API_KEY=seu_api_key_aqui       # API Key do Datadog
DD_SITE=datadoghq.com             # Site do Datadog (padrão: datadoghq.com)
DD_SERVICE=eventhub-backend       # Nome do serviço (padrão: eventhub-backend)
DD_HOSTNAME=meu-servidor          # Hostname (opcional, usa hostname do sistema se não definido)
DD_VERSION=1.0.0                  # Versão da aplicação (opcional)

# Logs em arquivo (opcional)
LOG_FILE_PATH=/var/log/eventhub/app.log  # Caminho para arquivo de log (apenas produção)
```

### Obter API Key do Datadog

1. Acesse [Datadog](https://app.datadoghq.com)
2. Vá em **Organization Settings** > **API Keys**
3. Crie uma nova API Key ou use uma existente
4. Copie a key e adicione ao `.env` como `DD_API_KEY`

## Uso

### Importar o Logger

```typescript
import logger from '@/utils/logger';
// ou
import { log } from '@/utils/logger';
```

### Exemplos de Uso

```typescript
// Log simples
logger.info('Aplicação iniciada');
logger.error('Erro ao conectar ao banco');
logger.warn('Aviso: configuração não encontrada');
logger.debug('Debug: processando requisição');

// Log com metadata
logger.info('Pedido criado', {
  orderId: '123',
  customerId: '456',
  amount: 100.00,
});

logger.error('Erro ao processar pagamento', {
  orderId: '123',
  error: error.message,
  stack: error.stack,
});

// Logger com contexto (para módulos específicos)
import { createLogger } from '@/utils/logger';
const paymentLogger = createLogger('payment');
paymentLogger.info('Pagamento processado', { paymentId: '789' });
```

### Níveis de Log

- **error**: Erros críticos que precisam atenção imediata
- **warn**: Avisos sobre situações que podem causar problemas
- **info**: Informações gerais sobre o funcionamento da aplicação
- **debug**: Informações detalhadas para debugging (apenas em desenvolvimento)
- **verbose**: Informações muito detalhadas (raramente usado)

## Substituir console.log

Para substituir todos os `console.log/error/warn` por `logger`:

```bash
node scripts/replace-console-logs.js
```

⚠️ **IMPORTANTE**: Revise as mudanças manualmente! Alguns logs podem precisar de ajustes.

## Estrutura dos Logs

Os logs são estruturados em JSON e incluem:

- `timestamp`: Data e hora do log
- `level`: Nível do log (error, warn, info, debug)
- `message`: Mensagem do log
- `service`: Nome do serviço (eventhub-backend)
- `env`: Ambiente (development, production)
- `version`: Versão da aplicação
- `context`: Contexto adicional (se usar `createLogger`)
- Metadata customizada passada no segundo parâmetro

## Datadog

### O que é enviado ao Datadog?

- Apenas logs de nível `info` e acima (error, warn, info)
- Logs estruturados em JSON
- Tags automáticas: `env:production`, `version:1.0.0`
- Hostname do servidor
- Service name para agrupamento

### Visualizar Logs no Datadog

1. Acesse [Datadog Logs](https://app.datadoghq.com/logs)
2. Filtre por `service:eventhub-backend`
3. Use tags para filtrar: `env:production`, `version:1.0.0`

### Alertas no Datadog

Configure alertas para:
- Erros críticos (`level:error`)
- Taxa de erros alta
- Logs de segurança suspeitos

## Desenvolvimento vs Produção

### Desenvolvimento
- Logs coloridos no console
- Nível padrão: `debug`
- Datadog desabilitado (a menos que `DD_API_KEY` esteja configurado)

### Produção
- Logs estruturados em JSON
- Nível padrão: `info`
- Datadog habilitado se `DD_API_KEY` estiver configurado
- Logs em arquivo se `LOG_FILE_PATH` estiver configurado

## Troubleshooting

### Datadog não está recebendo logs

1. Verifique se `DD_API_KEY` está configurado
2. Verifique se `NODE_ENV=production`
3. Verifique se o pacote `datadog-winston` está instalado
4. Verifique a conectividade de rede com o Datadog

### Logs muito verbosos

Ajuste `LOG_LEVEL` no `.env`:
- `error`: Apenas erros
- `warn`: Erros e avisos
- `info`: Erros, avisos e informações (recomendado para produção)
- `debug`: Todos os logs (apenas desenvolvimento)

## Alternativas ao Datadog

Se não quiser usar Datadog, o logger ainda funciona normalmente:
- Logs no console
- Logs em arquivo (se configurado)
- Estrutura JSON para parsing

Outras opções de integração:
- **Sentry**: Já configurado no projeto para erros
- **CloudWatch**: Para AWS
- **Loggly**: Alternativa ao Datadog
- **Elasticsearch**: Para análise avançada

