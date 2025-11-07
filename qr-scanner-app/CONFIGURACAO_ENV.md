# 🔧 Configuração do arquivo .env

## ✅ Configuração CORRETA

O arquivo `.env` na pasta `qr-scanner-app` deve conter:

```env
VITE_API_URL=http://192.168.18.157:3001/api
```

**Por quê?**
- O backend tem as rotas montadas em `/api/auth`, `/api/tickets`, etc.
- O código do PWA faz requisições como `api.post('/auth/login')`
- O axios combina: `baseURL` + `endpoint` = URL final
- Resultado: `http://192.168.18.157:3001/api` + `/auth/login` = `http://192.168.18.157:3001/api/auth/login` ✅

## ❌ Configurações INCORRETAS

### 1. Com endpoint completo:
```env
VITE_API_URL=http://192.168.18.157:3001/api/auth/login
```
**Problema:** Resultaria em `http://192.168.18.157:3001/api/auth/login/auth/login` ❌

### 2. Sem o `/api`:
```env
VITE_API_URL=http://192.168.18.157:3001
```
**Problema:** Resultaria em `http://192.168.18.157:3001/auth/login` ❌ (rota não existe)

## 📝 Exemplo Completo

**Arquivo `.env` em `qr-scanner-app/.env`:**
```env
# Para teste no celular (substitua pelo IP do seu computador)
VITE_API_URL=http://192.168.18.157:3001/api
```

**Depois de criar/editar o `.env`:**
1. Pare o servidor do PWA (Ctrl+C)
2. Reinicie: `npm run dev`
3. Teste no celular: `http://192.168.18.157:5174`

## 🔍 Como Verificar

1. Abra o PWA no navegador (ou celular)
2. Abra as Ferramentas do Desenvolvedor (F12)
3. Vá para a aba "Network" (Rede)
4. Tente fazer login
5. Veja a requisição `POST /auth/login`
6. A URL completa deve ser: `http://192.168.18.157:3001/api/auth/login`

