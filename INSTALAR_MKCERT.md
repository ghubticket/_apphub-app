# 🔧 Como Instalar mkcert no Windows

## ⚡ Opção 1: Via Chocolatey (Mais Fácil)

### Passo 1: Instalar Chocolatey

Abra o **PowerShell como Administrador** e execute:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Ou use o script que criei:
```powershell
.\install-chocolatey.ps1
```

### Passo 2: Instalar mkcert

Após instalar o Chocolatey, **feche e reabra o PowerShell como Administrador**, depois execute:

```powershell
choco install mkcert -y
```

---

## 🚀 Opção 2: Via Scoop (Alternativa)

### Passo 1: Instalar Scoop

Abra o **PowerShell** (não precisa ser Administrador) e execute:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Passo 2: Instalar mkcert

```powershell
scoop install mkcert
```

---

## 📥 Opção 3: Download Manual (Sem Gerenciadores)

### Passo 1: Baixar mkcert

1. Acesse: https://github.com/FiloSottile/mkcert/releases
2. Baixe o arquivo `mkcert-v1.4.4-windows-amd64.exe` (ou versão mais recente)
3. Renomeie para `mkcert.exe`

### Passo 2: Adicionar ao PATH

**Opção A: Colocar na pasta do projeto (mais simples)**

1. Crie uma pasta `tools` na raiz do projeto
2. Coloque o `mkcert.exe` lá
3. Use o caminho completo ao executar:
   ```powershell
   .\tools\mkcert.exe -install
   .\tools\mkcert.exe localhost 127.0.0.1 ::1
   ```

**Opção B: Adicionar ao PATH do Windows**

1. Coloque o `mkcert.exe` em uma pasta (ex: `C:\tools\`)
2. Adicione ao PATH:
   - Pressione `Win + R`
   - Digite: `sysdm.cpl`
   - Vá em "Avançado" → "Variáveis de Ambiente"
   - Em "Variáveis do sistema", edite "Path"
   - Adicione: `C:\tools\`
   - Clique em OK
3. Feche e reabra o PowerShell

---

## ✅ Após Instalar (Qualquer Método)

### 1. Instalar Certificate Authority Local

**Como Administrador:**

```powershell
mkcert -install
```

### 2. Gerar Certificados

Na raiz do projeto:

```powershell
mkdir certificates
cd certificates
mkcert localhost 127.0.0.1 ::1
cd ..
```

Isso criará:
- `certificates/localhost+2.pem` (certificado)
- `certificates/localhost+2-key.pem` (chave privada)

---

## 🎯 Verificar Instalação

Teste se o mkcert está funcionando:

```powershell
mkcert --version
```

Deve mostrar algo como: `mkcert v1.4.4`

---

## 🐛 Problemas Comuns

### "mkcert não é reconhecido"

- Certifique-se de que adicionou ao PATH
- Feche e reabra o PowerShell
- Tente usar o caminho completo: `C:\tools\mkcert.exe`

### "Acesso negado" ao instalar CA

- Execute o PowerShell **como Administrador**
- Clique com botão direito → "Executar como Administrador"

### Chocolatey não instala

- Verifique se o PowerShell permite scripts:
  ```powershell
  Get-ExecutionPolicy
  ```
- Se for "Restricted", execute:
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

---

## 📚 Próximos Passos

Após instalar o mkcert e gerar os certificados:

1. Configure o `backend/.env`:
   ```env
   SSL_ENABLED=true
   SSL_CERT_PATH=./certificates/localhost+2.pem
   SSL_KEY_PATH=./certificates/localhost+2-key.pem
   HTTPS_PORT=3443
   ```

2. Configure o `frontend/.env`:
   ```env
   NEXT_PUBLIC_API_URL=https://localhost:3443/api
   ```

3. Rode o backend com HTTPS:
   ```bash
   cd backend
   npm run dev:https
   ```

4. Rode o frontend com HTTPS:
   ```bash
   cd frontend
   npm run dev:https
   ```

---

## 💡 Recomendação

**Use o Chocolatey** (Opção 1) - é a forma mais fácil e mantém o mkcert atualizado automaticamente.

