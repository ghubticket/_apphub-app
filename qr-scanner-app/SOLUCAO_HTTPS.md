# 🔒 Solução: Acesso à Câmera via HTTPS

## Problema

Navegadores modernos bloqueiam acesso à câmera quando:
- ❌ Acessando via IP HTTP (ex: `http://192.168.18.157:5174`)
- ✅ Acessando via localhost HTTP (ex: `http://localhost:5174`)
- ✅ Acessando via HTTPS (ex: `https://seudominio.com`)

## Soluções

### Opção 1: ngrok (Mais Fácil) ⭐

**ngrok** cria um túnel HTTPS gratuito para seu servidor local.

#### Instalação:

1. **Baixe o ngrok:**
   - Acesse: https://ngrok.com/download
   - Ou via npm: `npm install -g ngrok`

2. **Crie uma conta gratuita:**
   - Acesse: https://dashboard.ngrok.com/signup
   - Copie seu authtoken

3. **Configure o ngrok:**
   ```bash
   ngrok config add-authtoken SEU_AUTH_TOKEN
   ```

#### Uso:

1. **Inicie o PWA:**
   ```bash
   cd qr-scanner-app
   npm run dev
   ```

2. **Em outro terminal, inicie o ngrok:**
   ```bash
   ngrok http 5174
   ```

3. **Você verá algo como:**
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:5174
   ```

4. **Acesse no celular:**
   ```
   https://abc123.ngrok-free.app
   ```

**Vantagens:**
- ✅ Gratuito
- ✅ HTTPS automático
- ✅ Funciona em qualquer rede
- ✅ Fácil de usar

**Desvantagens:**
- ⚠️ URL muda a cada reinício (plano gratuito)
- ⚠️ Pode ter limite de requisições

---

### Opção 2: Cloudflare Tunnel (cloudflared) ⭐⭐

**Cloudflare Tunnel** é gratuito e mais estável que ngrok.

#### Instalação:

1. **Baixe o cloudflared:**
   - Windows: https://github.com/cloudflare/cloudflared/releases
   - Ou via chocolatey: `choco install cloudflared`

2. **Execute:**
   ```bash
   cloudflared tunnel --url http://localhost:5174
   ```

3. **Você verá uma URL HTTPS:**
   ```
   https://random-subdomain.trycloudflare.com
   ```

4. **Acesse no celular usando essa URL**

**Vantagens:**
- ✅ Gratuito
- ✅ Sem limite de requisições
- ✅ Mais estável que ngrok

---

### Opção 3: Configurar HTTPS Local (Avançado)

Para uma solução permanente, você pode configurar HTTPS local usando certificados auto-assinados.

#### Usando mkcert (Recomendado):

1. **Instale o mkcert:**
   ```bash
   # Windows (via chocolatey)
   choco install mkcert
   
   # Ou baixe de: https://github.com/FiloSottile/mkcert/releases
   ```

2. **Crie certificado local:**
   ```bash
   mkcert -install
   mkcert localhost 192.168.18.157
   ```

3. **Configure o Vite para usar HTTPS:**
   - Edite `vite.config.ts`:
   ```typescript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   import { VitePWA } from 'vite-plugin-pwa'
   import fs from 'fs'

   export default defineConfig({
     plugins: [react(), VitePWA({...})],
     server: {
       https: {
         key: fs.readFileSync('./localhost+2-key.pem'),
         cert: fs.readFileSync('./localhost+2.pem'),
       },
       port: 5174,
       host: true
     }
   })
   ```

4. **Acesse:**
   ```
   https://192.168.18.157:5174
   ```

**Vantagens:**
- ✅ URL fixa
- ✅ Sem dependências externas
- ✅ Funciona offline

**Desvantagens:**
- ⚠️ Mais complexo de configurar
- ⚠️ Precisa aceitar certificado no celular

---

## 🚀 Solução Rápida Recomendada

**Para desenvolvimento rápido, use Cloudflare Tunnel:**

```bash
# Terminal 1: Inicie o PWA
cd qr-scanner-app
npm run dev

# Terminal 2: Inicie o túnel
cloudflared tunnel --url http://localhost:5174
```

Copie a URL HTTPS gerada e acesse no celular!

---

## 📝 Nota sobre Produção

Em produção, você sempre terá HTTPS (via seu domínio com SSL), então esse problema não ocorrerá.

