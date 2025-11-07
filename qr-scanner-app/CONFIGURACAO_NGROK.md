# 🔧 Configuração com ngrok

## ✅ Seu ngrok está rodando!

Você tem um túnel ativo:
- **URL HTTPS:** `https://tessie-petechial-hai.ngrok-free.dev`
- **Redirecionando para:** `http://localhost:5174`

## 📱 Próximos Passos

### 1. Acessar o App no Celular

No navegador do celular, acesse:
```
https://tessie-petechial-hai.ngrok-free.dev
```

⚠️ **Nota:** A URL muda a cada vez que você reinicia o ngrok (plano gratuito).

### 2. Configurar o Backend

O backend também precisa estar acessível. Você tem duas opções:

#### Opção A: Backend via IP Local (Mais Simples)

Se o backend está rodando em `http://192.168.18.157:3001`, o app já deve funcionar porque:
- O app detecta automaticamente o IP quando acessado via rede
- A API não precisa de HTTPS (só a câmera precisa)

**Não precisa fazer nada!** O código já detecta automaticamente.

#### Opção B: Backend via ngrok (Se Opção A não funcionar)

Se precisar que o backend também passe pelo ngrok:

1. **Em outro terminal, crie um túnel para o backend:**
   ```bash
   ngrok http 3001
   ```

2. **Você terá uma URL como:**
   ```
   https://outra-url.ngrok-free.dev -> http://localhost:3001
   ```

3. **Configure o `.env` do PWA:**
   ```env
   VITE_API_URL=https://outra-url.ngrok-free.dev/api
   ```

4. **Reinicie o PWA:**
   ```bash
   npm run dev
   ```

### 3. Testar

1. Acesse `https://tessie-petechial-hai.ngrok-free.dev` no celular
2. Faça login com:
   - Email: `qrcode@eventhub.com`
   - Senha: `QRCode123!`
3. Teste o scanner de QR code

## 🔄 Se Reiniciar o ngrok

Se você reiniciar o ngrok, a URL mudará. Você precisará:

1. **Atualizar a URL no celular** (nova URL do ngrok)
2. **Se estiver usando Opção B**, atualizar também o `.env` com a nova URL do backend

## 💡 Dica: URL Fixa com ngrok

Se quiser uma URL fixa (não muda), você pode:

1. **Criar conta no ngrok** (gratuito)
2. **Configurar authtoken:**
   ```bash
   ngrok config add-authtoken SEU_TOKEN
   ```
3. **Usar domínio reservado:**
   ```bash
   ngrok http 5174 --domain=seu-dominio.ngrok-free.app
   ```

## ✅ Checklist

- [ ] ngrok rodando na porta 5174
- [ ] Backend rodando na porta 3001
- [ ] Acessar URL HTTPS do ngrok no celular
- [ ] Fazer login
- [ ] Testar scanner de QR code

