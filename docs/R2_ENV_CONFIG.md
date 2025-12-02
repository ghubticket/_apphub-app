# 🔐 Configuração R2 - Variáveis de Ambiente

## ✅ Credenciais Obtidas:

- **Account ID**: `fd9fe34d8bafd812f9ffb301fa768f3f`
- **Access Key ID**: `47bf4531f0a3bbd91cfd00eb2942c376`
- **Secret Access Key**: `adf1b277a89086975d7e080ad744ccb18788439dfa374ea0470449266c03b717`
- **Bucket Name**: `app-hub`
- **Public URL**: `https://pub-f4689139a6714f29870cf3f8f2eb9775.r2.dev`

## 📋 Adicionar no `.env` do backend:

Adicione estas linhas no arquivo `backend/.env`:

```env
# Cloudflare R2 (Object Storage)
R2_ACCOUNT_ID=fd9fe34d8bafd812f9ffb301fa768f3f
R2_ACCESS_KEY_ID=47bf4531f0a3bbd91cfd00eb2942c376
R2_SECRET_ACCESS_KEY=adf1b277a89086975d7e080ad744ccb18788439dfa374ea0470449266c03b717
R2_BUCKET_NAME=app-hub
R2_PUBLIC_URL=https://pub-f4689139a6714f29870cf3f8f2eb9775.r2.dev
```

## ✅ Próximos Passos:

1. ✅ Adicionar variáveis no `.env`
2. ✅ Reiniciar o servidor backend
3. ✅ Fazer upload de uma nova imagem de evento
4. ✅ Verificar no Cloudflare R2 → **app-hub** → **Objects** se a imagem apareceu
5. ✅ A URL no banco deve ser do R2 (ex: `https://pub-f4689139a6714f29870cf3f8f2eb9775.r2.dev/events/...`)

## 🎉 Pronto!

Agora suas imagens serão automaticamente enviadas para o Cloudflare R2 e servidas diretamente do CDN, sem proxy!

