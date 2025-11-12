# Script para corrigir certificado no desktop

Write-Host "Corrigindo certificado SSL para desktop..." -ForegroundColor Cyan
Write-Host ""

# Verificar se mkcert esta disponivel
$mkcertPath = "C:\ProgramData\chocolatey\lib\mkcert\tools\mkcert.exe"
if (-not (Test-Path $mkcertPath)) {
    $mkcertCmd = Get-Command mkcert -ErrorAction SilentlyContinue
    if ($mkcertCmd) {
        $mkcertPath = "mkcert"
    } else {
        Write-Host "ERRO: mkcert nao encontrado!" -ForegroundColor Red
        exit 1
    }
}

# Verificar se CA esta instalada
Write-Host "Verificando se CA esta instalada..." -ForegroundColor Yellow
& $mkcertPath -install | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: CA instalada/verificada" -ForegroundColor Green
} else {
    Write-Host "AVISO: Problema ao verificar CA" -ForegroundColor Yellow
}

# Descobrir IP
Write-Host ""
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
} else {
    Write-Host "AVISO: IP nao encontrado" -ForegroundColor Yellow
}

# Regenerar certificados
Write-Host ""
Write-Host "Regenerando certificados..." -ForegroundColor Yellow
$certDir = Join-Path $PSScriptRoot "certificates"

# Remover certificados antigos (todos os localhost+*.pem)
Write-Host "Removendo certificados antigos..." -ForegroundColor Gray
Get-ChildItem -Path $certDir -Filter "localhost+*.pem" | Remove-Item -Force -ErrorAction SilentlyContinue

Push-Location $certDir

try {
    if ($ip) {
        Write-Host "Gerando certificado para: localhost, 127.0.0.1, ::1, $ip" -ForegroundColor Gray
        & $mkcertPath localhost 127.0.0.1 ::1 $ip
    } else {
        Write-Host "Gerando certificado para: localhost, 127.0.0.1, ::1" -ForegroundColor Gray
        & $mkcertPath localhost 127.0.0.1 ::1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "OK: Certificados regenerados com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Proximos passos:" -ForegroundColor Cyan
        Write-Host "  1. Feche todos os navegadores" -ForegroundColor Yellow
        Write-Host "  2. Reinicie os servidores (backend e frontend)" -ForegroundColor Yellow
        Write-Host "  3. Acesse novamente: https://localhost:3000" -ForegroundColor Yellow
        if ($ip) {
            Write-Host "     ou: https://$ip:3000" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Se ainda aparecer aviso:" -ForegroundColor Cyan
        Write-Host "  - No Chrome/Edge: Clique no cadeado > Certificado > Instalar certificado" -ForegroundColor Gray
        Write-Host "  - Ou execute: mkcert -install (como Administrador)" -ForegroundColor Gray
    } else {
        Write-Host "ERRO: Falha ao gerar certificados" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

