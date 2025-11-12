# 🚀 Quick Start - HTTPS no Localhost

## ⚡ Setup Rápido (3 passos)

### 1️⃣ Instalar e Configurar mkcert

```powershell
# Execute como Administrador
.\setup-https.ps1
```

Ou manualmente:

```powershell
# Instalar mkcert
choco install mkcert

# Instalar CA local (como Administrador)
mkcert -install

# Gerar certificados
mkdir certificates
cd certificates
mkcert localhost 127.0.0.1 ::1
cd ..
```

### 2️⃣ Configurar Backend

Adicione ao `backend/.env`:

```env
SSL_ENABLED=true
SSL_CERT_PATH=./certificates/localhost+2.pem
SSL_KEY_PATH=./certificates/localhost+2-key.pem
HTTPS_PORT=3443
```

Instalar dependência:

```bash
cd backend
npm install
```

### 3️⃣ Configurar Frontend

Adicione ao `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=https://localhost:3443/api
```

---

## 🎯 Usar

### Backend com HTTPS:

```bash
cd backend
npm run dev:https
# Acesse: https://localhost:3443
```

### Frontend com HTTPS:

```bash
cd frontend
npm run dev:https
# Acesse: https://localhost:3000
```

### Backend com HTTP (fallback):

```bash
cd backend
npm run dev:http
# ou simplesmente
npm run dev
```

---

## ✅ Verificar

1. Abra `https://localhost:3443` no navegador
2. Deve aparecer o cadeado verde 🔒 (sem avisos)
3. Se aparecer aviso, execute: `mkcert -install` (como Administrador)

---

## 📚 Documentação Completa

Veja `HTTPS_LOCALHOST_SETUP.md` para mais detalhes.

