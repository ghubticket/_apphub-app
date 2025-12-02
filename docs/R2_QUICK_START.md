# 🚀 Quick Start: Cloudflare R2 - Configuração Rápida

## ✅ O que você já tem:

- ✅ Bucket criado: `app-hub`
- ✅ Account ID: `fd9fe34d8bafd812f9ffb301fa768f3f`
- ✅ Location: Eastern North America (ENAM)

## 📋 Passo 1: Habilitar Acesso Público

1. No Cloudflare Dashboard, vá em **R2** → **app-hub**
2. Clique em **Settings** (no topo, ao lado de "Objects" e "Metrics")
3. Role até **Public Access**
4. Clique em **Allow Access** ou **Connect Domain**

**Opção A: URL Pública do R2 (Mais Rápido)**
- Clique em **Allow Access**
- Copie a URL pública que aparece (ex: `https://pub-xxxxx.r2.dev`)
- Use essa URL no `R2_PUBLIC_URL`

**Opção B: Domínio Customizado (Recomendado para Produção)**
- Clique em **Connect Domain**
- Escolha um subdomínio (ex: `cdn.ghubtech.com.br`)
- Configure DNS conforme instruções
- Use esse domínio no `R2_PUBLIC_URL`

## 📋 Passo 2: Obter Credenciais da API

1. No menu lateral, vá em **R2** → **Manage R2 API Tokens**
2. Clique em **Create API Token**
3. Preencha:
   - **Token name**: `eventhub-backend` (ou qualquer nome)
   - **Permissions**: Selecione **Object Read & Write**
   - **TTL**: Deixe em branco (sem expiração) ou defina uma data
4. Clique em **Create API Token**
5. **IMPORTANTE**: Copie imediatamente:
   - **Access Key ID**: `xxxxxxxxxxxxxxxx`
   - **Secret Access Key**: `xxxxxxxxxxxxxxxx` ⚠️ Só aparece uma vez!

## 📋 Passo 3: Adicionar Variáveis de Ambiente

Adicione no `.env` do backend:

```env
# Cloudflare R2
R2_ACCOUNT_ID=fd9fe34d8bafd812f9ffb301fa768f3f
R2_ACCESS_KEY_ID=seu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
R2_BUCKET_NAME=app-hub
R2_PUBLIC_URL=https://pub-f4689139a6714f29870cf3f8f2eb9775.r2.dev
```

## 📋 Passo 4: Reiniciar Backend e Testar

1. Reinicie o servidor backend
2. Faça upload de uma nova imagem de evento
3. Verifique no Cloudflare R2 → **app-hub** → **Objects** se a imagem apareceu
4. A URL no banco de dados deve ser do R2 (não mais `/uploads/events/...`)

## ✅ Pronto!

Agora suas imagens serão servidas diretamente do CDN do Cloudflare, sem proxy! 🎉

---

**Dúvidas?** Veja os guias completos:
- `docs/CLOUDFLARE_R2_SETUP.md` - Guia completo
- `docs/R2_CREDENTIALS_SETUP.md` - Detalhes sobre credenciais

