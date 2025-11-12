# Script PowerShell para configurar HTTPS no localhost
# Execute como Administrador: .\setup-https.ps1

Write-Host "🔒 Configurando HTTPS no Localhost" -ForegroundColor Cyan
Write-Host ""

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "   Clique com botão direito no PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    exit 1
}

# Verificar se mkcert está instalado
Write-Host "📦 Verificando se mkcert está instalado..." -ForegroundColor Yellow
$mkcertInstalled = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertInstalled) {
    Write-Host "⚠️  mkcert não encontrado. Instalando..." -ForegroundColor Yellow
    
    # Tentar instalar via Chocolatey
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    if ($chocoInstalled) {
        Write-Host "   Instalando via Chocolatey..." -ForegroundColor Gray
        choco install mkcert -y
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Erro ao instalar mkcert via Chocolatey" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⚠️  Chocolatey não encontrado." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📦 Deseja instalar o Chocolatey agora? (S/N)" -ForegroundColor Cyan
        $response = Read-Host
        if ($response -eq 'S' -or $response -eq 's' -or $response -eq 'Y' -or $response -eq 'y') {
            Write-Host "   Instalando Chocolatey..." -ForegroundColor Gray
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Chocolatey instalado! Instalando mkcert..." -ForegroundColor Green
                choco install mkcert -y
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "❌ Erro ao instalar mkcert" -ForegroundColor Red
                    exit 1
                }
            } else {
                Write-Host "❌ Erro ao instalar Chocolatey" -ForegroundColor Red
                Write-Host ""
                Write-Host "📥 Alternativa: Baixe mkcert manualmente:" -ForegroundColor Yellow
                Write-Host "   1. Acesse: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Gray
                Write-Host "   2. Baixe: mkcert-v1.4.4-windows-amd64.exe" -ForegroundColor Gray
                Write-Host "   3. Renomeie para: mkcert.exe" -ForegroundColor Gray
                Write-Host "   4. Coloque em: .\tools\mkcert.exe" -ForegroundColor Gray
                Write-Host "   5. Execute este script novamente" -ForegroundColor Gray
                Write-Host ""
                Write-Host "   Ou veja: INSTALAR_MKCERT.md para mais opções" -ForegroundColor Cyan
                exit 1
            }
        } else {
            Write-Host ""
            Write-Host "📥 Instale mkcert manualmente:" -ForegroundColor Yellow
            Write-Host "   1. Acesse: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Gray
            Write-Host "   2. Baixe: mkcert-v1.4.4-windows-amd64.exe" -ForegroundColor Gray
            Write-Host "   3. Renomeie para: mkcert.exe" -ForegroundColor Gray
            Write-Host "   4. Coloque em: .\tools\mkcert.exe" -ForegroundColor Gray
            Write-Host "   5. Execute este script novamente" -ForegroundColor Gray
            Write-Host ""
            Write-Host "   Ou veja: INSTALAR_MKCERT.md para mais opções" -ForegroundColor Cyan
            exit 1
        }
    }
} else {
    Write-Host "✅ mkcert já está instalado" -ForegroundColor Green
}

# Instalar CA local
Write-Host ""
Write-Host "🔐 Instalando Certificate Authority local..." -ForegroundColor Yellow
mkcert -install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CA instalada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao instalar CA" -ForegroundColor Red
    exit 1
}

# Criar pasta de certificados
Write-Host ""
Write-Host "📁 Criando pasta de certificados..." -ForegroundColor Yellow
$certDir = Join-Path $PSScriptRoot "certificates"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
    Write-Host "✅ Pasta criada: $certDir" -ForegroundColor Green
} else {
    Write-Host "✅ Pasta já existe: $certDir" -ForegroundColor Green
}

# Gerar certificados
Write-Host ""
Write-Host "🔑 Gerando certificados SSL..." -ForegroundColor Yellow
Push-Location $certDir
mkcert localhost 127.0.0.1 ::1
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Certificados gerados com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Configure no backend/.env:" -ForegroundColor Yellow
    Write-Host "      SSL_ENABLED=true" -ForegroundColor Gray
    Write-Host "      SSL_CERT_PATH=./certificates/localhost+2.pem" -ForegroundColor Gray
    Write-Host "      SSL_KEY_PATH=./certificates/localhost+2-key.pem" -ForegroundColor Gray
    Write-Host "      HTTPS_PORT=3443" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Configure no frontend/.env:" -ForegroundColor Yellow
    Write-Host "      NEXT_PUBLIC_API_URL=https://localhost:3443/api" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Para Next.js com HTTPS, use:" -ForegroundColor Yellow
    Write-Host "      npm run dev:https" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Configuração concluída!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao gerar certificados" -ForegroundColor Red
    exit 1
}

