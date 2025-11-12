# Script para gerar certificados SSL na pasta correta
# Execute na raiz do projeto

Write-Host "Gerando certificados SSL..." -ForegroundColor Cyan
Write-Host ""

# Verificar se esta na pasta do projeto
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Criar pasta de certificados se nao existir
$certDir = Join-Path $PSScriptRoot "certificates"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
    Write-Host "OK: Pasta criada: $certDir" -ForegroundColor Green
}

# Verificar se mkcert esta disponivel
$mkcertPath = "C:\ProgramData\chocolatey\lib\mkcert\tools\mkcert.exe"
if (-not (Test-Path $mkcertPath)) {
    # Tentar encontrar mkcert no PATH
    $mkcertCmd = Get-Command mkcert -ErrorAction SilentlyContinue
    if ($mkcertCmd) {
        $mkcertPath = "mkcert"
    } else {
        Write-Host "ERRO: mkcert nao encontrado!" -ForegroundColor Red
        Write-Host "   Certifique-se de que o mkcert esta instalado." -ForegroundColor Yellow
        exit 1
    }
}

# Descobrir IP da rede
Write-Host "Descobrindo IP da rede..." -ForegroundColor Yellow
$ip = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object {
        ($_.InterfaceAlias -like "*Wi-Fi*" -or 
         $_.InterfaceAlias -like "*Ethernet*" -or
         $_.InterfaceAlias -like "*WLAN*") -and
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*"
    } | 
    Select-Object -First 1 -ExpandProperty IPAddress

if ($ip) {
    Write-Host "IP encontrado: $ip" -ForegroundColor Green
    Write-Host "Gerando certificados para localhost e IP da rede..." -ForegroundColor Yellow
} else {
    Write-Host "AVISO: IP nao encontrado. Gerando apenas para localhost." -ForegroundColor Yellow
    $ip = $null
}

# Gerar certificados
Write-Host "Gerando certificados em: $certDir" -ForegroundColor Yellow
Push-Location $certDir

try {
    if ($ip) {
        & $mkcertPath localhost 127.0.0.1 ::1 $ip
    } else {
        & $mkcertPath localhost 127.0.0.1 ::1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "OK: Certificados gerados com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Arquivos criados:" -ForegroundColor Cyan
        Write-Host "   - certificates/localhost+2.pem" -ForegroundColor Gray
        Write-Host "   - certificates/localhost+2-key.pem" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Proximos passos:" -ForegroundColor Cyan
        Write-Host "   1. Configure backend/.env:" -ForegroundColor Yellow
        Write-Host "      SSL_ENABLED=true" -ForegroundColor Gray
        Write-Host "      SSL_CERT_PATH=./certificates/localhost+2.pem" -ForegroundColor Gray
        Write-Host "      SSL_KEY_PATH=./certificates/localhost+2-key.pem" -ForegroundColor Gray
        Write-Host "      HTTPS_PORT=3443" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   2. Configure frontend/.env:" -ForegroundColor Yellow
        if ($ip) {
            Write-Host "      NEXT_PUBLIC_API_URL=https://localhost:3443/api" -ForegroundColor Gray
            Write-Host "      (ou https://$ip:3443/api para acesso na rede)" -ForegroundColor DarkGray
        } else {
            Write-Host "      NEXT_PUBLIC_API_URL=https://localhost:3443/api" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "   3. Rode o backend:" -ForegroundColor Yellow
        Write-Host "      cd backend" -ForegroundColor Gray
        Write-Host "      npm run dev:https" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   4. Rode o frontend:" -ForegroundColor Yellow
        Write-Host "      cd frontend" -ForegroundColor Gray
        Write-Host "      npm run dev:https" -ForegroundColor Gray
    } else {
        Write-Host "ERRO: Erro ao gerar certificados" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

