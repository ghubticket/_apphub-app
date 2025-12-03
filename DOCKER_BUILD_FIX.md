# 🔧 Solução: Docker Build Error "frontend grpc server closed unexpectedly"

## 🎯 Problema
```
Build Failed: build daemon returned an error < failed to solve: frontend grpc server closed unexpectedly >
```

Este erro geralmente ocorre quando:
- Docker BuildKit está com problemas
- OneDrive está sincronizando arquivos durante o build
- Contexto de build muito grande
- Problemas de memória/recursos

## ✅ Soluções

### 1. Desabilitar BuildKit (Solução Rápida)

```bash
# Windows PowerShell
$env:DOCKER_BUILDKIT=0
docker build .

# Ou no comando direto
docker build --progress=plain .
```

### 2. Limpar Cache do Docker

```bash
# Limpar cache de build
docker builder prune -a

# Limpar tudo (cuidado!)
docker system prune -a
```

### 3. Criar/Atualizar .dockerignore

Crie um arquivo `.dockerignore` na raiz do projeto para excluir arquivos desnecessários:

```
# Node modules
**/node_modules/
**/.next/
**/dist/
**/build/
**/out/

# OneDrive
**/.onedriveignore
**/.onedrive/

# Git
.git/
.gitignore

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
logs/

# Uploads locais
**/uploads/
backend/uploads/

# Certificados
certificates/
*.pem
*.key
*.crt

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
desktop.ini

# Build outputs
**/tsconfig.tsbuildinfo
**/*.tsbuildinfo
```

### 4. Verificar OneDrive Sync

Se o projeto está no OneDrive, pode causar problemas:

1. **Pausar sincronização temporariamente** durante o build
2. **Mover projeto para fora do OneDrive** (recomendado para desenvolvimento)
3. **Usar .onedriveignore** (já existe em `frontend/.onedriveignore`)

### 5. Aumentar Recursos do Docker

No Docker Desktop:
- Settings → Resources
- Aumentar CPU e Memory
- Aumentar Disk Image Size

### 6. Usar Build sem Cache

```bash
docker build --no-cache .
```

### 7. Build com Logs Detalhados

```bash
docker build --progress=plain --no-cache . 2>&1 | tee build.log
```

## 🚀 Solução Recomendada

**Para desenvolvimento local:**
1. Criar `.dockerignore` (ver acima)
2. Desabilitar BuildKit temporariamente: `$env:DOCKER_BUILDKIT=0`
3. Limpar cache: `docker builder prune`

**Para CI/CD:**
1. Garantir que `.dockerignore` está no repositório
2. Usar build com `--progress=plain` para debug
3. Verificar recursos disponíveis no runner

## 📝 Nota sobre OneDrive

Se o projeto está sincronizado com OneDrive:
- ⚠️ Pode causar problemas de performance
- ⚠️ Arquivos podem estar "locked" durante sync
- ✅ Recomendado: mover para pasta local (ex: `C:\dev\`)

## 🔍 Debug

Se o problema persistir:

```bash
# Ver logs detalhados
docker build --progress=plain --no-cache . 2>&1 | tee build.log

# Verificar contexto de build
docker build --progress=plain . 2>&1 | Select-String "Sending build context"

# Verificar tamanho do contexto
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum
```

