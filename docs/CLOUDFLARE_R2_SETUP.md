# Guia de Implementação: Cloudflare R2

## 🎯 Por que Cloudflare R2?

- ✅ **Sem taxas de egress** (download) - economiza muito dinheiro
- ✅ **Compatível com S3 API** - fácil migração
- ✅ **CDN integrado** - imagens servidas rapidamente
- ✅ **Preço competitivo**: $0.015/GB/mês de storage
- ✅ **10GB grátis** no free tier
- ✅ **Boa performance no Brasil** (Cloudflare tem edge locations aqui)

## 📋 Passo 1: Criar Bucket no Cloudflare R2 ✅ (Já feito!)

Você já criou o bucket `app-hub`! 🎉

## 📋 Passo 2: Obter Credenciais

**Veja o guia detalhado em:** `docs/R2_CREDENTIALS_SETUP.md`

Resumo rápido:
1. Vá em **R2** → **Manage R2 API Tokens**
2. Clique em **Create API Token**
3. Permissões: **Object Read & Write**
4. Copie:
   - **Account ID** (já está visível no dashboard)
   - **Access Key ID**
   - **Secret Access Key** ⚠️ Só aparece uma vez!

## 📋 Passo 3: Configurar Acesso Público

1. No Cloudflare Dashboard, vá em **R2** → Seu bucket (`app-hub`)
2. Vá em **Settings** → **Public Access**
3. Você tem duas opções:

   **Opção A: Usar URL pública do R2 (mais rápido)**
   - Clique em **Allow Access** 
   - Copie a URL pública (ex: `https://pub-xxxxx.r2.dev`)
   - Use essa URL no `R2_PUBLIC_URL`

   **Opção B: Usar domínio customizado (recomendado para produção)**
   - Clique em **Connect Domain**
   - Escolha um subdomínio (ex: `cdn.ghubtech.com.br`)
   - Configure o DNS conforme instruções
   - Use esse domínio no `R2_PUBLIC_URL`

## 📋 Passo 4: Configurar Variáveis de Ambiente

Adicione no `.env` do backend:

```env
# Cloudflare R2
R2_ACCOUNT_ID=seu_account_id
R2_ACCESS_KEY_ID=seu_access_key
R2_SECRET_ACCESS_KEY=seu_secret_key
R2_BUCKET_NAME=app-hub
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # Ou https://cdn.ghubtech.com.br se usar domínio customizado
```

**Veja o guia detalhado de credenciais em:** `docs/R2_CREDENTIALS_SETUP.md`

## 📋 Passo 4: Instalar Dependências

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 📋 Passo 6: Serviço de Upload ✅ (Já criado!)

O serviço já foi criado em `backend/src/services/r2Service.ts`!

## 📋 Passo 7: Configurar Domínio Customizado (Opcional mas Recomendado)

1. No Cloudflare Dashboard, vá em **R2** → Seu bucket → **Settings**
2. Em **Public Access**, configure um domínio customizado
3. Exemplo: `cdn.ghubtech.com.br`
4. Isso melhora SEO e performance

## 📋 Passo 8: Atualizar Next.js Config

O `frontend/next.config.js` já foi atualizado!

**Importante:** Após configurar o domínio customizado ou obter a URL pública do R2, adicione no `next.config.js`:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'cdn.ghubtech.com.br', // Seu domínio customizado
    },
    // Ou se usar URL pública do R2:
    // {
    //   protocol: 'https',
    //   hostname: 'pub-xxxxx.r2.dev',
    // },
  ],
}
```

## 💰 Custos Estimados

Para 100GB de imagens:
- **Storage**: 100GB × $0.015 = **$1.50/mês**
- **Egress**: **$0** (sem taxas!)
- **Total**: **$1.50/mês**

Comparado com AWS S3 + CloudFront:
- Storage: $2.30/mês
- Egress: ~$8.50/mês (100GB)
- **Total**: ~$10.80/mês

**Economia: ~87% com R2!**

## 🔄 Migração de Imagens Existentes

Script para migrar imagens locais para R2:

```typescript
// scripts/migrate-to-r2.ts
import fs from 'fs';
import path from 'path';
import { uploadImageToR2 } from '../src/services/r2Service';

async function migrateImages() {
    const uploadsDir = path.join(__dirname, '../uploads/events');
    const files = fs.readdirSync(uploadsDir);

    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const buffer = fs.readFileSync(filePath);
        
        const r2Url = await uploadImageToR2(buffer, file, 'events');
        console.log(`Migrado: ${file} → ${r2Url}`);
        
        // Atualizar URL no banco de dados aqui
    }
}
```

## ✅ Vantagens Finais

1. **Sem proxy** - imagens servidas diretamente do CDN
2. **Performance** - CDN global do Cloudflare
3. **Custo baixo** - sem taxas de egress
4. **Escalável** - cresce com seu projeto
5. **Simples** - compatível com S3 API

## 🚀 Próximos Passos

1. ✅ Criar bucket no R2 - **FEITO!** (bucket `app-hub` criado)
2. ✅ Instalar dependências - **FEITO!** (`@aws-sdk/client-s3` instalado)
3. ✅ Implementar serviço R2 - **FEITO!** (`r2Service.ts` criado)
4. ✅ Criar middleware de upload - **FEITO!** (`r2Upload.ts` criado)
5. ✅ Atualizar rotas - **FEITO!** (rotas de eventos atualizadas)
6. ✅ Atualizar controllers - **FEITO!** (eventsController atualizado)
7. ⏳ **Obter credenciais R2** - Veja `docs/R2_CREDENTIALS_SETUP.md`
8. ⏳ **Configurar acesso público** - Habilitar public access no bucket
9. ⏳ **Adicionar variáveis de ambiente** - Adicionar R2_* no `.env`
10. ⏳ **Testar upload** - Fazer upload de uma nova imagem
11. ⏳ **Migrar imagens existentes** (opcional) - Script de migração
12. ⏳ **Remover proxy do frontend** (opcional) - Após confirmar que R2 funciona

---

## ✅ Status da Implementação

- ✅ Serviço R2 criado
- ✅ Middleware de upload criado
- ✅ Rotas atualizadas
- ✅ Controllers atualizados
- ✅ Next.js config atualizado
- ⏳ Aguardando credenciais e configuração

**Próximo passo:** Obter credenciais R2 e configurar variáveis de ambiente!

