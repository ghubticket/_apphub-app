# 🎯 Sentry - Explicação Simples

## ✅ SIM, VAI APARECER NO SENTRY:

### 1. **Erro do Backend (Código)**
✅ **SIM, aparece!**

**Exemplos:**
- Bug no código que você escreveu
- Erro de lógica (ex: dividir por zero)
- Esqueceu de tratar um erro
- Erro ao processar dados

**Cenário Real:**
```
Usuário tenta criar um pedido
→ Backend tenta processar
→ Dá erro no código
→ ✅ APARECE NO SENTRY
```

---

### 2. **Erro de API (API Caiu)**
✅ **SIM, aparece!**

**Exemplos:**
- API não consegue responder
- Erro 500 (Internal Server Error)
- Servidor travou
- Erro ao processar requisição

**Cenário Real:**
```
Usuário faz uma requisição
→ API tenta responder
→ Dá erro interno (500)
→ ✅ APARECE NO SENTRY
```

**Nota:** Se a API cair completamente (servidor offline), o Sentry captura o erro ANTES de cair, se possível.

---

### 3. **Erro de Banco de Dados**
✅ **SIM, aparece!**

**Exemplos:**
- MongoDB caiu/offline
- Erro de conexão
- Timeout ao conectar
- Erro ao salvar dados
- Erro ao buscar dados

**Cenário Real:**
```
Usuário tenta criar pedido
→ Backend tenta salvar no MongoDB
→ MongoDB está offline
→ ✅ APARECE NO SENTRY
   - Erro: "MongoError: connection failed"
   - Controller: ordersController
   - Action: createOrder
```

---

### 4. **Servidor que Caiu**
✅ **SIM, aparece!**

**Exemplos:**
- Erro ao iniciar servidor
- Erro ao conectar banco na inicialização
- Servidor crashou
- Out of memory

**Cenário Real:**
```
Servidor tenta iniciar
→ Tenta conectar ao MongoDB
→ MongoDB está offline
→ ✅ APARECE NO SENTRY (antes de crashar)
   - Erro: "database_connection_failed"
   - Level: "fatal"
```

---

## ❌ NÃO VAI APARECER (Filtrado):

### Erros do Usuário (Esperados)
❌ **NÃO aparece** - São erros normais, não são bugs

**Exemplos:**
- Usuário digitou email inválido (400)
- Usuário não está logado (401)
- Usuário sem permissão (403)
- Página não encontrada (404)
- Email já existe (409)

**Por quê?** Esses são erros esperados. O usuário fez algo errado, não o sistema.

---

## 📊 Resumo Visual

```
┌─────────────────────────────────────┐
│  ERRO DO BACKEND (Código)          │
│  ✅ APARECE NO SENTRY               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ERRO DE API (500)                  │
│  ✅ APARECE NO SENTRY               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ERRO DE BANCO DE DADOS             │
│  ✅ APARECE NO SENTRY               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  SERVIDOR QUE CAIU                  │
│  ✅ APARECE NO SENTRY               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ERRO DO USUÁRIO (400, 404, etc)   │
│  ❌ NÃO APARECE (filtrado)          │
└─────────────────────────────────────┘
```

---

## 🎯 Exemplos Práticos

### Exemplo 1: Banco de Dados Caiu
```
1. Usuário tenta criar pedido
2. Backend tenta salvar no MongoDB
3. MongoDB está offline
4. ✅ ERRO APARECE NO SENTRY
   - Título: "MongoError: connection failed"
   - Controller: ordersController
   - Action: createOrder
   - Contexto: userId, eventId
```

### Exemplo 2: Bug no Código
```
1. Usuário acessa /api/events
2. Código tenta processar
3. Erro: "Cannot read property 'name' of undefined"
4. ✅ ERRO APARECE NO SENTRY
   - Stack trace completo
   - Linha do código com erro
   - Contexto da requisição
```

### Exemplo 3: API Caiu
```
1. Servidor tenta iniciar
2. Erro ao conectar banco
3. Servidor não inicia
4. ✅ ERRO APARECE NO SENTRY
   - Level: "fatal"
   - Erro: "database_connection_failed"
   - Antes do servidor crashar
```

---

## 🔍 Onde Ver os Erros?

1. Acesse: https://app-hub-xu.sentry.io/issues/
2. Você verá uma lista de todos os erros
3. Clique em um erro para ver:
   - Stack trace completo
   - Quando aconteceu
   - Quantas vezes aconteceu
   - Usuários afetados
   - Contexto completo

---

## ✅ Conclusão

**SIM, você verá:**
- ✅ Erros do backend
- ✅ Erros de API
- ✅ Erros de banco de dados
- ✅ Servidor que caiu

**NÃO, você NÃO verá:**
- ❌ Erros do usuário (400, 404, etc)

**Tudo está configurado e funcionando!** 🎉

