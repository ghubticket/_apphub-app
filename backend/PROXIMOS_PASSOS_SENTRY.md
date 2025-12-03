# Próximos Passos - Configuração do Sentry

## ✅ O que já está feito

- ✅ Código configurado (`instrument.ts` e `server.ts`)
- ✅ Dependências atualizadas no `package.json`
- ✅ Projeto criado no Sentry
- ✅ DSN obtido

## 📋 Passos para Finalizar

### 1. Instalar Dependências Atualizadas

Execute no terminal:

```bash
cd backend
npm install
```

Isso instalará a versão mais recente do `@sentry/node` (v8+).

### 2. Configurar Variável de Ambiente

Adicione o DSN do Sentry nas suas variáveis de ambiente:

**Arquivo `.env` (desenvolvimento local):**
```env
SENTRY_DSN=https://dd82899ba9edab693e5305fe19ccc392@o4510471117537280.ingest.us.sentry.io/4510471128023040
NODE_ENV=development
```

**Vercel/Railway/Produção:**
1. Acesse as configurações do seu projeto
2. Vá em **Environment Variables**
3. Adicione:
   - `SENTRY_DSN` = `https://dd82899ba9edab693e5305fe19ccc392@o4510471117537280.ingest.us.sentry.io/4510471128023040`
   - `NODE_ENV` = `production` (se ainda não tiver)

### 3. Testar a Configuração

#### Opção A: Rota de Teste Temporária

Adicione esta rota temporária no `server.ts` (após as outras rotas):

```typescript
// Rota de teste do Sentry (remover após testar)
app.get('/debug-sentry', (req: Request, res: Response) => {
    throw new Error('My first Sentry error!');
});
```

Depois:
1. Inicie o servidor: `npm run dev`
2. Acesse: `http://localhost:3001/debug-sentry`
3. Verifique no Sentry: vá em **Issues** → você deve ver o erro aparecer em alguns segundos
4. **Remova a rota de teste** após confirmar que funciona

#### Opção B: Teste com Erro Real

Simule um erro em uma rota existente (ex: criar um pedido sem dados válidos) e verifique se aparece no Sentry.

### 4. Verificar no Sentry Dashboard

1. Acesse: https://app-hub-xu.sentry.io
2. Vá em **Issues** (menu lateral)
3. Você deve ver os erros aparecendo em tempo real
4. Clique em um erro para ver:
   - Stack trace completo
   - Contexto da requisição (headers, query, body)
   - Informações do usuário (se autenticado)
   - Ambiente (development/production)

### 5. Configurar Alertas (Opcional)

Para receber notificações quando erros ocorrem:

1. No Sentry, vá em **Alerts** (menu lateral)
2. Clique em **Create Alert Rule**
3. Configure:
   - **When:** "A new issue is created"
   - **Send to:** Seu email ou Slack (se configurado)
4. Salve

### 6. Monitorar Performance (Opcional)

O Sentry já está configurado para monitorar performance (10% das transações).

Para ver métricas:
1. Vá em **Performance** (menu lateral)
2. Veja:
   - Tempo de resposta das rotas
   - Transações mais lentas
   - Queries de banco de dados (se configurado)

## 🔍 Verificações

### ✅ Checklist

- [ ] `npm install` executado com sucesso
- [ ] `SENTRY_DSN` configurado no `.env` (local) e nas variáveis de ambiente (produção)
- [ ] Servidor iniciado sem erros
- [ ] Rota de teste `/debug-sentry` funciona
- [ ] Erro aparece no Sentry Dashboard
- [ ] Rota de teste removida após confirmação

## 🐛 Troubleshooting

### Erro: "Sentry is not initialized"

**Solução:** Verifique se:
- `SENTRY_DSN` está configurado corretamente
- O arquivo `instrument.ts` está sendo importado no início do `server.ts`

### Erros não aparecem no Sentry

**Soluções:**
1. Verifique se `SENTRY_DSN` está configurado
2. Verifique se o erro não está sendo filtrado (rate limiting, 404, etc.)
3. Verifique os logs do console para erros de conexão
4. Teste com a rota `/debug-sentry`

### Muitos erros sendo reportados

**Solução:** Ajuste os filtros em `instrument.ts`:
- Adicione mais erros à lista `ignoreErrors`
- Ajuste a função `beforeSend` para filtrar mais tipos

## 📚 Recursos Úteis

- [Sentry Dashboard](https://app-hub-xu.sentry.io)
- [Documentação Sentry Node.js](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Guia de Boas Práticas](https://docs.sentry.io/product/best-practices/)

## 🎉 Pronto!

Após seguir estes passos, o Sentry estará totalmente configurado e monitorando seus erros automaticamente!

