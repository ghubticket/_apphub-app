# ✅ Checklist - Deploy para Dev

## 📋 Antes do Deploy

### ✅ Código
- [x] Todos os controllers atualizados com captura de erros
- [x] Sem erros de lint
- [x] Sentry configurado corretamente
- [x] Dependências atualizadas (`@sentry/node` v8+)

### ⚠️ Variáveis de Ambiente

**IMPORTANTE:** Configure no ambiente de dev:

```env
# Sentry (OBRIGATÓRIO para captura de erros)
SENTRY_DSN=https://dd82899ba9edab693e5305fe19ccc392@o4510471117537280.ingest.us.sentry.io/4510471128023040

# Ambiente
NODE_ENV=development  # ou production, dependendo do seu ambiente dev

# Opcional
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% das transações (padrão)
```

### 📦 Build

```bash
cd backend
npm install  # Instalar @sentry/node v8+
npm run build  # Compilar TypeScript
```

## 🚀 Deploy

1. **Commit das mudanças:**
   ```bash
   git add .
   git commit -m "feat: migração Datadog → Sentry + captura de erros padronizada"
   git push
   ```

2. **Deploy no ambiente dev**

3. **Verificar variáveis de ambiente:**
   - `SENTRY_DSN` está configurado?
   - `NODE_ENV` está correto?

## ✅ Após o Deploy

### 1. Verificar se o servidor iniciou
- Logs devem mostrar que o servidor está rodando
- Sem erros de inicialização

### 2. Testar captura de erros
- Acesse uma rota que cause erro (ex: `/api/test-error`)
- Verifique no Sentry: https://app-hub-xu.sentry.io → **Issues**
- Deve aparecer o erro em alguns segundos

### 3. Monitorar
- Acesse o Sentry Dashboard
- Veja se erros estão sendo capturados
- Configure alertas se necessário

## 🎯 O Que Esperar

### ✅ Funcionando Corretamente
- Servidor inicia sem erros
- Erros aparecem no Sentry
- Logs locais continuam funcionando
- Performance monitoring ativo (10% das transações)

### ⚠️ Se Algo Der Errado

**Servidor não inicia:**
- Verifique se `SENTRY_DSN` está configurado
- Verifique logs de erro
- O servidor funciona mesmo sem Sentry (só não captura erros)

**Erros não aparecem no Sentry:**
- Verifique se `SENTRY_DSN` está correto
- Verifique se o erro não está sendo filtrado (é esperado?)
- Teste com rota `/debug-sentry` (se criada)

## 📚 Documentação

- `SENTRY_SETUP.md` - Configuração completa
- `O_QUE_SERA_CAPTURADO_SENTRY.md` - O que será capturado
- `REVISAO_SENTRY_COMPLETA.md` - Status da revisão

## 🎉 Pronto!

Tudo configurado e testado. Pode fazer deploy! 🚀

