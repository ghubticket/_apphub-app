# ⚡ Quick Start - EventHub Backend

## 🚀 3 Comandos para Começar

```bash
# 1. Instalar
npm install

# 2. Configurar (crie o .env baseado no env.example)
cp env.example .env
# Edite o .env e adicione suas credenciais

# 3. Rodar
npm run dev
```

Acesse: **http://localhost:3001** ✅

---

## 📋 Checklist Mínimo

- [ ] Node.js 18+ instalado
- [ ] `npm install` executado
- [ ] Arquivo `.env` criado
- [ ] `MONGODB_URI` configurado no `.env`
- [ ] `JWT_SECRET` configurado no `.env`
- [ ] `npm run dev` rodando
- [ ] http://localhost:3001 responde

---

## 🔧 Variáveis Essenciais (.env)

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=seu-secret-aqui-min-32-chars
MONGODB_URI=mongodb+srv://...
```

> 💡 Veja `INSTALL.md` para instruções detalhadas!

---

## 📚 Documentação

- **README.md** - Documentação completa
- **INSTALL.md** - Guia de instalação passo a passo
- **env.example** - Template de variáveis de ambiente

---

## 🆘 Problema?

**Erro ao instalar:**
```bash
npm install
```

**Porta em uso:**
Mude `PORT=3002` no `.env`

**MongoDB não conecta:**
Verifique a connection string no `.env`

---

**🎯 Próximo passo:** Configurar autenticação (login)

