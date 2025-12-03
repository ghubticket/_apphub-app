# 🧪 Teste do Sentry na API Online

## 🌐 URL da API Online

**Base URL:** `https://api.ghubtech.com.br/api`

## 🎯 Rota de Teste do Sentry

### URL Completa:
```
https://api.ghubtech.com.br/api/health/test-sentry
```

## 📋 Como Testar

### Opção 1: Navegador
1. Abra o navegador
2. Acesse: `https://api.ghubtech.com.br/api/health/test-sentry`
3. Você verá uma resposta de erro (isso é esperado)
4. Aguarde 10-15 segundos
5. Acesse: https://app-hub-xu.sentry.io/issues/
6. O erro deve aparecer na lista!

### Opção 2: cURL (Terminal)
```bash
curl https://api.ghubtech.com.br/api/health/test-sentry
```

### Opção 3: Postman/Insomnia
- **Method:** GET
- **URL:** `https://api.ghubtech.com.br/api/health/test-sentry`
- **Headers:** (nenhum necessário)

## ✅ O Que Esperar

### Resposta da API:
```json
{
  "success": false,
  "message": "Erro de teste do Sentry capturado",
  "error": "Este erro foi enviado ao Sentry para teste"
}
```

### No Sentry (após 10-15 segundos):
1. Acesse: https://app-hub-xu.sentry.io/issues/
2. Você verá um novo issue:
   - **Title:** "Teste de erro do Sentry - Esta é uma rota de teste"
   - **Type:** Error
   - **Status:** Unresolved
   - **Tags:** test: true, route: /api/health/test-sentry

## 🔍 Verificação

### Se o erro NÃO aparecer no Sentry:

1. **Verificar se `SENTRY_DSN` está configurado no servidor online:**
   - Acesse o painel de deploy (Railway, Vercel, etc)
   - Verifique se a variável `SENTRY_DSN` está configurada
   - Deve ser: `https://dd82899ba9edab693e5305fe19ccc392@o4510471117537280.ingest.us.sentry.io/4510471128023040`

2. **Verificar logs do servidor:**
   - Veja se há erros relacionados ao Sentry
   - O servidor deve estar rodando normalmente

3. **Aguardar mais tempo:**
   - Às vezes leva até 30 segundos para aparecer
   - Recarregue a página do Sentry

## 🚨 Importante

⚠️ **Esta rota é apenas para TESTE!**

Em produção, você deve:
- Remover esta rota, OU
- Proteger com autenticação, OU
- Adicionar verificação de ambiente:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    // rota de teste
  }
  ```

## 📝 Outras Rotas de Health Check

- `https://api.ghubtech.com.br/api/health` - Health check geral
- `https://api.ghubtech.com.br/api/health/simple` - Health check simples
- `https://api.ghubtech.com.br/api/health/db` - Health check do banco

