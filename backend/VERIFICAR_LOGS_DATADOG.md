# Verificar se Logs Estão Chegando no Datadog

## 🎯 Objetivo
Verificar se os logs estão sendo enviados corretamente ao Datadog, mesmo sem conseguir acessar a interface.

## ✅ Passo 1: Verificar Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas na **Vercel**:

**Vercel Dashboard → Seu Projeto → Settings → Environment Variables**

```env
DD_API_KEY=sua_api_key_aqui
DD_SERVICE=eventhub-backend
DD_ENV=production
DD_SITE=us5.datadoghq.com
LOG_LEVEL=info
```

## ✅ Passo 2: Chamar Endpoint de Teste

Chame o endpoint de teste:
```
GET https://api.ghubtech.com.br/api/health/test-logs
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Logs de teste enviados ao Datadog!",
  "timestamp": "...",
  "instructions": {...}
}
```

## ✅ Passo 3: Verificar Logs na Vercel

Antes de verificar no Datadog, veja se os logs estão sendo gerados:

1. **Vercel Dashboard → Seu Projeto → Functions**
2. Veja os logs em tempo real
3. Procure por mensagens como:
   - "🔍 Test log - Datadog connection"
   - "⚠️ Test warning log"
   - "❌ Test error log"

Se aparecerem na Vercel, estão sendo gerados corretamente!

## ✅ Passo 4: Acessar Logs no Datadog (Contornar Onboarding)

### Método 1: URL com Query (Mais Confiável)
```
https://us5.datadoghq.com/logs?query=service%3Aeventhub-backend
```

### Método 2: Explorer Direto
```
https://us5.datadoghq.com/logs/explorer
```

### Método 3: Live Tail
```
https://us5.datadoghq.com/logs/live-tail
```

### Método 4: Via API do Datadog (Verificar Programaticamente)

Você pode verificar se os logs estão chegando via API:

```bash
curl -X GET "https://api.us5.datadoghq.com/api/v2/logs/events" \
  -H "DD-API-KEY: sua_api_key" \
  -H "DD-APPLICATION-KEY: sua_app_key" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "query": "service:eventhub-backend",
      "from": "now-15m"
    }
  }'
```

## 🔍 Troubleshooting

### Se os logs não aparecerem:

1. **Verifique se o logger está sendo usado:**
   - Procure por `import logger` nos arquivos
   - Verifique se não está usando `console.log` ainda

2. **Verifique se o pacote está instalado:**
   ```bash
   npm list datadog-winston
   ```

3. **Teste localmente primeiro:**
   ```bash
   # Configure no .env local
   DD_API_KEY=sua_api_key
   DD_SERVICE=eventhub-backend
   DD_ENV=development
   DD_SITE=us5.datadoghq.com
   
   # Rode o servidor
   npm run dev
   
   # Chame o endpoint
   curl http://localhost:3001/api/health/test-logs
   ```

4. **Verifique logs da Vercel:**
   - Vercel Dashboard → Functions
   - Veja se há erros relacionados ao Datadog

5. **Aguarde alguns minutos:**
   - Logs podem levar 1-2 minutos para aparecer
   - Especialmente na primeira vez

## 📊 Queries Úteis (Quando Conseguir Acessar)

### Ver todos os logs:
```
service:eventhub-backend
```

### Ver apenas logs de teste:
```
service:eventhub-backend test:true
```

### Ver apenas erros:
```
service:eventhub-backend status:error
```

### Ver logs das últimas 15 minutos:
```
service:eventhub-backend @timestamp:>now-15m
```

## 🎯 Checklist Final

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy feito após configurar variáveis
- [ ] Endpoint de teste chamado: `/api/health/test-logs`
- [ ] Logs aparecem na Vercel (Functions)
- [ ] Tentou acessar via URL direta: `https://us5.datadoghq.com/logs/explorer`
- [ ] Aguardou 1-2 minutos após chamar endpoint
- [ ] Logs aparecem no Datadog

## 💡 Dica Extra

Se ainda não conseguir acessar a interface, você pode:
1. Usar a **API do Datadog** para verificar logs programaticamente
2. Verificar os **logs da Vercel** primeiro (confirma que estão sendo gerados)
3. Aguardar alguns minutos e tentar novamente

