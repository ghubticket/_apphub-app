# EventHub Backend API

Backend da plataforma EventHub - Sistema de venda de ingressos e controle de acesso com QR Code.

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `env.example` para `.env`:

```bash
cp env.example .env
```

Edite o arquivo `.env` e preencha com suas credenciais:

```env
# Essencial para começar
NODE_ENV=development
PORT=3001
JWT_SECRET=seu-secret-super-seguro-aqui
MONGODB_URI=sua-connection-string-do-mongodb-atlas
```

### 3. Rodar o Servidor

**Modo desenvolvimento (com hot reload):**
```bash
npm run dev
```

**Build para produção:**
```bash
npm run build
npm start
```

### 4. Testar

Acesse: http://localhost:3001

Você deve ver:
```json
{
  "success": true,
  "message": "EventHub API está rodando! 🎉",
  "version": "1.0.0"
}
```

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/         # Configurações (DB, Swagger, etc)
│   ├── controllers/    # Lógica de controle das rotas
│   ├── middleware/     # Middlewares (auth, validation, etc)
│   ├── models/         # Models do Mongoose
│   ├── routes/         # Definição das rotas
│   ├── services/       # Lógica de negócio
│   ├── utils/          # Funções utilitárias
│   └── server.ts       # Arquivo principal
├── tests/              # Testes
├── dist/               # Build (gerado automaticamente)
├── .env                # Variáveis de ambiente (NÃO COMMITAR!)
├── env.example         # Exemplo de variáveis
├── package.json
├── tsconfig.json
└── nodemon.json
```

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Roda em modo desenvolvimento com hot reload
npm run build        # Compila TypeScript para JavaScript
npm start            # Roda a versão compilada (produção)
npm run lint         # Verifica erros de lint
npm run lint:fix     # Corrige erros de lint automaticamente
npm run format       # Formata código com Prettier
```

## 🔧 Tecnologias

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **MongoDB** + **Mongoose** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Helmet** - Segurança HTTP
- **Rate Limit** - Proteção contra DDoS
- **Swagger** - Documentação da API (em breve)

## 📚 Próximos Passos

Depois que o servidor estiver rodando:

1. [ ] Conectar MongoDB Atlas
2. [ ] Configurar Swagger
3. [ ] Criar model de User
4. [ ] Implementar autenticação (login/registro)
5. [ ] Criar rotas de Events
6. [ ] Integrar Mercado Pago
7. [ ] Implementar QR Code

## 🔗 Links Úteis

- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Swagger** (em breve): http://localhost:3001/api-docs
- **Documentação completa**: Ver `README.md` na raiz do projeto

## 🆘 Problemas Comuns

### Erro: "Cannot find module 'express'"
```bash
npm install
```

### Erro: "Port 3001 already in use"
Mude a porta no arquivo `.env`:
```env
PORT=3002
```

### Erro de TypeScript
```bash
npm run build
```

## 📝 Convenções de Código

- **Arquivos**: camelCase para arquivos TS (ex: `userController.ts`)
- **Classes**: PascalCase (ex: `class UserService`)
- **Funções/variáveis**: camelCase (ex: `const getUserById`)
- **Constantes**: UPPER_SNAKE_CASE (ex: `const MAX_ATTEMPTS`)
- **Commits**: Conventional Commits (ex: `feat: add user login`)

## 🔐 Segurança

- ✅ Nunca commite o arquivo `.env`
- ✅ Use secrets fortes (mínimo 32 caracteres)
- ✅ Rate limiting está ativo por padrão
- ✅ Helmet protege contra vulnerabilidades comuns
- ✅ CORS configurado para aceitar apenas frontend

## 📄 Licença

Projeto proprietário - EventHub © 2025

