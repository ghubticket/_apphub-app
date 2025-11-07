# 📱 Como Testar o App no Celular

## 🎯 Passo a Passo

### 1. Descobrir o IP do seu Computador

**Windows:**
```powershell
ipconfig
```
Procure por "Endereço IPv4" na seção do seu adaptador Wi-Fi/Ethernet. Exemplo: `192.168.18.157`

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# ou
ip a | grep "inet "
```

### 2. Configurar o Backend para Aceitar Conexões Externas

O backend já está configurado para aceitar conexões externas. Certifique-se de que está rodando:

```bash
cd backend
npm run dev
```

O backend deve estar acessível em `http://<SEU_IP>:3001`

### 3. Configurar o PWA para Usar o IP do Computador

Crie ou edite o arquivo `.env` na pasta `qr-scanner-app`:

```env
VITE_API_URL=http://<SEU_IP>:3001/api
```

**⚠️ IMPORTANTE:** Use apenas a **BASE URL** (`/api`), **NÃO** coloque o endpoint completo!

**✅ CORRETO:**
```env
VITE_API_URL=http://192.168.18.157:3001/api
```

**❌ ERRADO (não faça isso):**
```env
VITE_API_URL=http://192.168.18.157:3001/api/auth/login
```

O código já adiciona os endpoints (`/auth/login`, `/tickets/scan`, etc.) automaticamente.

### 4. Reiniciar o PWA

Após criar/editar o `.env`, **pare o servidor** (Ctrl+C) e **inicie novamente**:

```bash
cd qr-scanner-app
npm run dev
```

Você verá algo como:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: http://192.168.18.157:5174/
```

### 5. Acessar no Celular

⚠️ **IMPORTANTE:** Navegadores bloqueiam acesso à câmera via HTTP quando não é localhost. Você precisa usar HTTPS.

#### Opção A: Usar Túnel HTTPS (Recomendado) ⭐

**Usando Cloudflare Tunnel (gratuito):**

1. **Em outro terminal, execute:**
   ```bash
   cloudflared tunnel --url http://localhost:5174
   ```

2. **Você verá uma URL HTTPS:**
   ```
   https://random-subdomain.trycloudflare.com
   ```

3. **Acesse essa URL no celular**

**Usando ngrok:**

1. **Instale o ngrok:** https://ngrok.com/download
2. **Execute:**
   ```bash
   ngrok http 5174
   ```
3. **Acesse a URL HTTPS gerada no celular**

#### Opção B: Acessar via IP (Câmera não funcionará)

1. **Certifique-se de que o celular está na mesma rede Wi-Fi** do computador
2. No navegador do celular, acesse:
   ```
   http://<SEU_IP>:5174
   ```
   Exemplo: `http://192.168.18.157:5174`

   ⚠️ **Nota:** A câmera não funcionará via HTTP. Use um túnel HTTPS (Opção A).

### 6. Fazer Login

Use as credenciais do usuário QRCODE:
- **Email:** `qrcode@eventhub.com`
- **Senha:** `QRCode123!`

### 7. Instalar como PWA (Opcional)

**Android (Chrome):**
- Toque no menu (3 pontos) → "Adicionar à tela inicial"

**iOS (Safari):**
- Toque no botão de compartilhar → "Adicionar à Tela de Início"

## 🔥 Problemas Comuns

### Erro: "Não foi possível conectar ao servidor"

1. ✅ Verifique se o backend está rodando
2. ✅ Verifique se o IP no `.env` está correto
3. ✅ Verifique se o celular está na mesma rede Wi-Fi
4. ✅ Verifique se o firewall não está bloqueando as portas 3001 e 5174

### Firewall Bloqueando

**Windows:**
- Abra "Firewall do Windows Defender"
- Clique em "Permitir um aplicativo pelo Firewall"
- Adicione exceções para Node.js nas portas 3001 e 5174

**macOS:**
- Sistema → Segurança → Firewall
- Adicione exceções se necessário

### CORS Error

O backend já está configurado para aceitar conexões do QR scanner app. Se ainda houver erro, verifique se o `QR_SCANNER_URL` está configurado no `.env` do backend.

## 📝 Notas

- O Vite já está configurado com `host: true`, permitindo conexões externas
- O backend aceita conexões de qualquer origem em desenvolvimento
- Para produção, você precisará configurar um domínio real

