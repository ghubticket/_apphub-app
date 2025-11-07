# ⚙️ CONFIGURAÇÃO DO .env AGORA

## 📝 PASSO A PASSO

### 1️⃣ Criar arquivo `.env` na pasta `qr-scanner-app`

Crie um arquivo chamado `.env` (sem extensão) dentro da pasta `qr-scanner-app`.

### 2️⃣ Adicionar o conteúdo:

```env
VITE_API_URL=https://scope-titled-moisture-motor.trycloudflare.com/api
```

**⚠️ IMPORTANTE:** Use a URL do **túnel do backend** que você criou!

### 3️⃣ Reiniciar o servidor do PWA

**Pare o servidor** (Ctrl+C) e **inicie novamente**:

```bash
cd qr-scanner-app
npm run dev
```

---

## ✅ PRONTO!

Agora você pode acessar no celular:

**URL:** `https://faced-penny-hidden-rays.trycloudflare.com`

---

## 🔄 Se os túneis mudarem

Se você reiniciar os túneis e eles gerarem novas URLs, atualize o `.env` com a nova URL do backend e reinicie o PWA.

