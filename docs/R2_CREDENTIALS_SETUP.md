# Como Obter Credenciais do Cloudflare R2

## 📋 Passo 1: Obter Account ID

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. No canto superior direito, clique no seu **Account ID** (ou vá em **Overview**)
3. Copie o **Account ID** (ex: `fd9fe34d8bafd812f9ffb301fa768f3f`)

## 📋 Passo 2: Criar API Token

1. No menu lateral, vá em **R2** → **Manage R2 API Tokens**
2. Clique em **Create API Token**
3. Preencha:
   - **Token name**: `eventhub-backend` (ou qualquer nome)
   - **Permissions**: Selecione **Object Read & Write**
   - **TTL**: Deixe em branco (sem expiração) ou defina uma data
4. Clique em **Create API Token**
5. **IMPORTANTE**: Copie imediatamente:
   - **Access Key ID**
   - **Secret Access Key**
   - ⚠️ A secret key só é mostrada uma vez!

## 📋 Passo 3: Configurar Domínio Customizado (Opcional mas Recomendado)

1. No menu lateral, vá em **R2** → Seu bucket (`app-hub`)
2. Vá em **Settings** → **Public Access**
3. Clique em **Connect Domain**
4. Escolha um subdomínio (ex: `cdn.ghubtech.com.br`)
5. Siga as instruções para configurar DNS
6. Após configurar, copie a URL (ex: `https://cdn.ghubtech.com.br`)

## 📋 Passo 4: Adicionar Variáveis de Ambiente

Adicione no `.env` do backend:

```env
# Cloudflare R2
R2_ACCOUNT_ID=fd9fe34d8bafd812f9ffb301fa768f3f
R2_ACCESS_KEY_ID=seu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
R2_BUCKET_NAME=app-hub
R2_PUBLIC_URL=https://cdn.ghubtech.com.br  # Ou https://pub-xxxxx.r2.dev se não usar domínio customizado
```

## ✅ Pronto!

Após configurar, reinicie o backend. As novas imagens serão automaticamente enviadas para o R2!

## 🔍 Verificar se está funcionando

1. Faça upload de uma nova imagem de evento
2. Verifique no Cloudflare R2 → Seu bucket → **Objects**
3. A imagem deve aparecer lá
4. A URL no banco de dados deve ser do R2 (não mais `/uploads/events/...`)

## 🚨 Troubleshooting

**Erro: "R2 não configurado"**
- Verifique se todas as variáveis R2_* estão no `.env`
- Reinicie o servidor após adicionar

**Erro: "Access Denied"**
- Verifique se o Access Key ID e Secret estão corretos
- Verifique se o token tem permissões "Object Read & Write"

**Imagens não aparecem no frontend**
- Verifique se o domínio R2 está no `next.config.js`
- Verifique se `R2_PUBLIC_URL` está configurado corretamente

