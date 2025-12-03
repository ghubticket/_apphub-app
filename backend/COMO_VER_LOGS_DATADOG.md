# Como Ver Logs no Datadog - Guia Rápido

## 🚫 Problema: Clicar em "Logs" leva para o Onboarding

Isso acontece porque o Datadog redireciona para onboarding quando não detecta logs ainda. Vamos resolver isso!

## ✅ Solução: Pular Onboarding e Ver Logs

### Opção 1: URL Direta com Query (Funciona!)
Acesse diretamente com query string:
```
https://us5.datadoghq.com/logs?query=service%3Aeventhub-backend
```

Ou tente:
```
https://us5.datadoghq.com/logs/explorer
```

### Opção 2: Via Menu Lateral (Truque)
1. No menu lateral, clique em **"Logs"**
2. Quando aparecer o onboarding, procure por um link **"Skip"** ou **"Skip onboarding"** (geralmente no canto superior direito)
3. Ou tente clicar em **"Explorer"** ou **"Live Tail"** no submenu de Logs

### Opção 3: Forçar Acesso (URL Completa)
Tente estas URLs na ordem:
1. `https://us5.datadoghq.com/logs/explorer`
2. `https://us5.datadoghq.com/logs/live-tail`
3. `https://us5.datadoghq.com/logs?query=*`

### Opção 2: Via Menu Lateral
1. No menu lateral esquerdo, procure por **"Logs"**
2. Clique em **"Explorer"** (não em "Logs" que leva ao onboarding)
3. Ou clique em **"Live Tail"** para ver logs em tempo real

## 🧪 Teste: Endpoint de Logs

Criei um endpoint de teste para gerar logs:

### Chamar o Endpoint:
```
GET https://sua-api.vercel.app/api/health/test-logs
```

Ou localmente:
```
GET http://localhost:3001/api/health/test-logs
```

### O que o Endpoint Faz:
- ✅ Gera 4 logs de teste (info, warn, error, complex)
- ✅ Todos com tag `test:true` para fácil filtro
- ✅ Retorna instruções de como ver no Datadog

## 📊 Como Ver os Logs no Datadog

### Passo 1: Acesse os Logs
1. Vá para: https://us5.datadoghq.com/logs
2. Se aparecer onboarding, clique em **"Explorer"** no menu lateral

### Passo 2: Filtre os Logs
Na barra de busca, digite:
```
service:eventhub-backend
```

Ou para ver apenas os logs de teste:
```
service:eventhub-backend test:true
```

### Passo 3: Verifique os Logs
Você deve ver:
- 🔍 Test log - Datadog connection (info)
- ⚠️ Test warning log (warn)
- ❌ Test error log (error)
- 📊 Test log with complex metadata (info)

## 🔍 Queries Úteis no Datadog

### Ver todos os logs do serviço:
```
service:eventhub-backend
```

### Ver apenas erros:
```
service:eventhub-backend status:error
```

### Ver logs de teste:
```
service:eventhub-backend test:true
```

### Ver logs das últimas 15 minutos:
```
service:eventhub-backend @timestamp:>now-15m
```

### Ver logs de uma rota específica:
```
service:eventhub-backend @http.url_details.path:"/api/orders"
```

## 🎯 Checklist de Verificação

- [ ] Variáveis de ambiente configuradas na Vercel:
  - `DD_API_KEY`
  - `DD_SERVICE=eventhub-backend`
  - `DD_ENV=production`
  - `DD_SITE=us5.datadoghq.com`
- [ ] Deploy feito após configurar variáveis
- [ ] Endpoint de teste chamado: `/api/health/test-logs`
- [ ] Logs aparecem no Datadog (aguarde 1-2 minutos)

## ⚠️ Se os Logs Não Aparecerem

### 1. Verifique as Variáveis de Ambiente
- Vercel Dashboard → Seu Projeto → Settings → Environment Variables
- Certifique-se de que todas estão configuradas

### 2. Verifique os Logs da Vercel
- Vercel Dashboard → Seu Projeto → Functions
- Veja se há erros ou avisos

### 3. Teste Localmente Primeiro
```bash
# Configure no .env local
DD_API_KEY=sua_api_key
DD_SERVICE=eventhub-backend
DD_ENV=development
DD_SITE=us5.datadoghq.com

# Rode o servidor
npm run dev

# Chame o endpoint de teste
curl http://localhost:3001/api/health/test-logs
```

### 4. Verifique se o Logger Está Funcionando
Adicione temporariamente no `server.ts`:
```typescript
logger.info('🔍 Test log - Server started', {
  timestamp: new Date().toISOString(),
  service: 'eventhub-backend',
});
```

## 📱 Acesso Rápido

**URL Direta para Logs:**
https://us5.datadoghq.com/logs

**Filtro Rápido:**
```
service:eventhub-backend
```

**Endpoint de Teste:**
```
GET /api/health/test-logs
```

## 🎉 Próximos Passos

1. ✅ Chame o endpoint de teste
2. ✅ Acesse https://us5.datadoghq.com/logs
3. ✅ Filtre por `service:eventhub-backend`
4. ✅ Configure alertas (opcional)
5. ✅ Substitua `console.log` por `logger` no código

