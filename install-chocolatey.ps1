# Script para instalar Chocolatey
# Execute como Administrador

Write-Host "🍫 Instalando Chocolatey..." -ForegroundColor Cyan

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "   Clique com botão direito no PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    exit 1
}

# Instalar Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

Write-Host ""
Write-Host "✅ Chocolatey instalado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Feche e reabra o PowerShell como Administrador" -ForegroundColor Yellow
Write-Host "   2. Execute: choco install mkcert -y" -ForegroundColor Yellow
Write-Host "   3. Execute: mkcert -install" -ForegroundColor Yellow
Write-Host ""

