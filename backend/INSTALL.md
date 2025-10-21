# 🚀 Guia de Instalação - Backend EventHub

## ⚡ Instalação Rápida (5 minutos)

### Passo 1: Clonar e Entrar na Pasta
```bash
cd backend
```

### Passo 2: Instalar Dependências
```bash
npm install
```

> ⏱️ Isso vai levar 1-2 minutos...

### Passo 3: Configurar .env

**Copiar o arquivo de exemplo:**
```bash
cp env.example .env
```

**Editar `.env` com suas credenciais:**
```bash
# Use seu editor favorito
code .env     # VS Code
nano .env     # Terminal
vim .env      # Vim
```

**Configuração mínima para começar:**
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=mude-este-secret-para-algo-muito-seguro-min-32-chars
MONGODB_URI=mongodb+srv://...sua-connection-string-aqui...
```

> 💡 **Importante:** Você precisa criar um cluster no MongoDB Atlas primeiro!

### Passo 4: Rodar o Servidor
```bash
npm run dev
```

Você deve ver:
```
🚀 ========================================
🚀  EventHub API está rodando!
🚀 ========================================
📡  Porta: 3001
🌍  URL: http://localhost:3001
📚  Ambiente: development
🚀 ========================================
```

### Passo 5: Testar
Abra o navegador em: **http://localhost:3001**

Deve aparecer:
```json
{
  "success": true,
  "message": "EventHub API está rodando! 🎉"
}
```

✅ **Pronto! Backend está rodando!**

---

## 🗄️ Setup do MongoDB Atlas (Primeira Vez)

Se você ainda não tem o MongoDB Atlas configurado:

### 1. Criar Conta
- Acesse: https://www.mongodb.com/cloud/atlas/register
- Crie uma conta gratuita

### 2. Criar Cluster
1. Clique em "Build a Database"
2. Escolha **FREE** (M0)
3. Selecione região mais próxima (ex: São Paulo, Brazil)
4. Clique em "Create"

### 3. Criar Usuário do Banco
1. Username: `eventhub`
2. Password: **Gere uma senha forte** (salve ela!)
3. Clique em "Create User"

### 4. Permitir Acesso de Qualquer IP
1. Em "Network Access", clique em "Add IP Address"
2. Clique em "Allow Access from Anywhere" (0.0.0.0/0)
3. Clique em "Confirm"

> ⚠️ **Produção:** Configure IPs específicos depois!

### 5. Obter Connection String
1. Clique em "Connect" no seu cluster
2. Escolha "Connect your application"
3. Copie a connection string:
   ```
   mongodb+srv://eventhub:<password>@cluster0.xxxxx.mongodb.net/
   ```
4. Substitua `<password>` pela senha que você criou
5. Adicione o nome do banco no final: `...mongodb.net/eventhub`

### 6. Adicionar no .env
```env
MONGODB_URI=mongodb+srv://eventhub:SUA_SENHA@cluster0.xxxxx.mongodb.net/eventhub?retryWrites=true&w=majority
```

✅ **MongoDB Atlas configurado!**

---

## 🔑 Gerar Secrets Seguros

Para JWT_SECRET e QR_SECRET, use:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**OpenSSL:**
```bash
openssl rand -hex 32
```

**Online (use com cuidado):**
- https://randomkeygen.com/

Copie e cole no `.env`:
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
QR_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4
```

---

## ✅ Checklist Completo

### Antes de Começar
- [ ] Node.js 18+ instalado (`node -v`)
- [ ] npm instalado (`npm -v`)
- [ ] Git instalado (`git --version`)
- [ ] Conta no MongoDB Atlas criada

### Setup
- [ ] `npm install` executado com sucesso
- [ ] Arquivo `.env` criado
- [ ] MongoDB Atlas configurado
- [ ] Connection string no `.env`
- [ ] JWT_SECRET gerado
- [ ] `npm run dev` rodando

### Teste
- [ ] http://localhost:3001 responde
- [ ] http://localhost:3001/health retorna OK
- [ ] Console mostra mensagem de sucesso

---

## 🆘 Problemas?

### "npm: command not found"
**Instale o Node.js:**
- https://nodejs.org/ (versão LTS)

### "Cannot find module..."
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Port 3001 already in use"
**Opção 1:** Mate o processo na porta 3001
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

**Opção 2:** Use outra porta no `.env`
```env
PORT=3002
```

### MongoDB não conecta
- Verifique se a senha está correta
- Confirme que o IP 0.0.0.0/0 está liberado
- Teste a connection string no MongoDB Compass

### TypeScript errors
```bash
npm run build
```

---

## 🎯 Próximo Passo

Agora que o backend está rodando, o próximo passo é:

1. ✅ Configurar Swagger (documentação API)
2. ✅ Criar model de User
3. ✅ Implementar autenticação (login)

Quer ajuda com o próximo passo? É só avisar! 🚀

