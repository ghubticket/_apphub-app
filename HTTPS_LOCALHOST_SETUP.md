# 🔒 Configurar HTTPS no Localhost (sem túneis)

Este guia mostra como configurar HTTPS no localhost para testes, **sem usar ngrok ou outros túneis**.

## 📋 Pré-requisitos

- Windows 10/11
- Node.js instalado
- Chocolatey (opcional, mas recomendado para instalar mkcert)

---

## 🚀 Método 1: mkcert (Recomendado - Mais Fácil)

O **mkcert** é a ferramenta mais popular para gerar certificados SSL confiáveis localmente. Os navegadores confiam automaticamente nos certificados gerados por ele.

### Passo 1: Instalar mkcert

**Opção A: Via Chocolatey (Recomendado)**
```powershell
# Instalar Chocolatey (se não tiver)
# Abra PowerShell como Administrador e execute:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar mkcert
choco install mkcert
```

**Opção B: Via Scoop**
```powershell
# Instalar Scoop (se não tiver)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar mkcert
scoop install mkcert
```

**Opção C: Download Manual**
1. Baixe o executável: https://github.com/FiloSottile/mkcert/releases
2. Adicione ao PATH do Windows

### Passo 2: Instalar a Autoridade Certificadora Local

```powershell
# Abra PowerShell como Administrador
mkcert -install
```

Isso instala uma CA (Certificate Authority) local que o Windows e os navegadores confiarão automaticamente.

### Passo 3: Gerar Certificados SSL

Crie uma pasta para os certificados (recomendado: na raiz do projeto):

```powershell
# Na raiz do projeto
mkdir certificates
cd certificates

# Gerar certificado para localhost
mkcert localhost 127.0.0.1 ::1

# Isso criará dois arquivos:
# - localhost+2.pem (certificado)
# - localhost+2-key.pem (chave privada)
```

**Para múltiplos domínios:**
```powershell
mkcert localhost 127.0.0.1 ::1 app.local api.local
```

---

## 🔧 Configurar Backend (Express.js)

### 1. Instalar dependências necessárias

```bash
cd backend
npm install --save-dev @types/node
# Não precisa instalar https, já vem com Node.js
```

### 2. Modificar `backend/src/server.ts`

O servidor precisa ser configurado para usar HTTPS. Vou criar uma versão que suporta tanto HTTP quanto HTTPS.

### 3. Criar arquivo de configuração SSL

Crie `backend/src/config/ssl.ts`:

```typescript
import fs from 'fs';
import path from 'path';

export interface SSLOptions {
    key: Buffer;
    cert: Buffer;
}

export function getSSLOptions(): SSLOptions | null {
    const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../../certificates/localhost+2.pem');
    const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../../certificates/localhost+2-key.pem');

    // Verificar se os arquivos existem
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.warn('⚠️  Certificados SSL não encontrados. Servidor rodará em HTTP.');
        console.warn(`   Certificado esperado em: ${certPath}`);
        console.warn(`   Chave esperada em: ${keyPath}`);
        console.warn('   Para usar HTTPS, execute: mkcert localhost 127.0.0.1 ::1');
        return null;
    }

    try {
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
    } catch (error) {
        console.error('❌ Erro ao ler certificados SSL:', error);
        return null;
    }
}
```

---

## 🔧 Configurar Frontend (Next.js)

O Next.js suporta HTTPS nativamente no modo de desenvolvimento.

### Opção 1: Via next.config.js (Recomendado)

Modifique `frontend/next.config.js` para incluir suporte a HTTPS.

### Opção 2: Via script customizado

Crie um script que inicia o Next.js com HTTPS.

---

## 📝 Variáveis de Ambiente

Adicione ao `.env` do backend:

```env
# SSL Configuration (opcional - se não configurado, usa HTTP)
SSL_ENABLED=true
SSL_CERT_PATH=./certificates/localhost+2.pem
SSL_KEY_PATH=./certificates/localhost+2-key.pem
HTTPS_PORT=3443
```

Adicione ao `.env` do frontend:

```env
# Atualizar URL da API para HTTPS
NEXT_PUBLIC_API_URL=https://localhost:3443/api
```

---

## 🎯 Scripts NPM Úteis

Adicione aos `package.json`:

**Backend:**
```json
{
  "scripts": {
    "dev": "nodemon",
    "dev:https": "cross-env SSL_ENABLED=true nodemon",
    "dev:http": "cross-env SSL_ENABLED=false nodemon"
  }
}
```

**Frontend:**
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:https": "next dev --experimental-https"
  }
}
```

---

## ✅ Testar

1. **Backend HTTPS:**
   ```bash
   cd backend
   npm run dev:https
   # Acesse: https://localhost:3443
   ```

2. **Frontend HTTPS:**
   ```bash
   cd frontend
   npm run dev:https
   # Acesse: https://localhost:3000
   ```

3. **Verificar no navegador:**
   - Abra `https://localhost:3443` (backend)
   - Abra `https://localhost:3000` (frontend)
   - Deve aparecer o cadeado verde 🔒 (sem avisos)

---

## 🔄 Alternativa: OpenSSL (Mais Complexo)

Se preferir usar OpenSSL diretamente:

```powershell
# Gerar chave privada
openssl genrsa -out localhost.key 2048

# Gerar certificado auto-assinado
openssl req -new -x509 -key localhost.key -out localhost.crt -days 365 -subj "/CN=localhost"
```

**⚠️ Desvantagem:** Navegadores mostrarão aviso de "Não seguro" (você precisará aceitar manualmente).

---

## 🐛 Troubleshooting

### Erro: "certificate has expired"
- Regenerar certificado: `mkcert localhost 127.0.0.1 ::1`

### Erro: "NET::ERR_CERT_AUTHORITY_INVALID"
- Reinstalar CA: `mkcert -install` (como Administrador)

### Porta já em uso
- Mude a porta no `.env` ou mate o processo: `netstat -ano | findstr :3443`

### CORS errors
- Atualizar `FRONTEND_URL` no `.env` do backend para `https://localhost:3000`

---

## 📚 Referências

- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Next.js HTTPS](https://nextjs.org/docs/app/api-reference/cli#development)
- [Express HTTPS](https://expressjs.com/en/5x/api.html#app.listen)

---

## 🎉 Pronto!

Agora você pode testar funcionalidades que requerem HTTPS (como WebRTC, Service Workers, APIs de pagamento, etc.) diretamente no localhost, sem precisar de túneis externos!

