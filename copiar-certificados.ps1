# Script para copiar certificados para a pasta correta

$sourceDir = "C:\Users\Guilh\certificates"
$targetDir = Join-Path $PSScriptRoot "certificates"

Write-Host "Copiando certificados..." -ForegroundColor Cyan

# Criar pasta se nao existir
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
    Write-Host "Pasta criada: $targetDir" -ForegroundColor Green
}

# Copiar certificados
$certFile = Join-Path $sourceDir "localhost+2.pem"
$keyFile = Join-Path $sourceDir "localhost+2-key.pem"

if (Test-Path $certFile) {
    Copy-Item -Path $certFile -Destination (Join-Path $targetDir "localhost+2.pem") -Force
    Write-Host "OK: Certificado copiado" -ForegroundColor Green
} else {
    Write-Host "ERRO: Certificado nao encontrado em: $certFile" -ForegroundColor Red
}

if (Test-Path $keyFile) {
    Copy-Item -Path $keyFile -Destination (Join-Path $targetDir "localhost+2-key.pem") -Force
    Write-Host "OK: Chave copiada" -ForegroundColor Green
} else {
    Write-Host "ERRO: Chave nao encontrada em: $keyFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verificando arquivos na pasta do projeto..." -ForegroundColor Cyan
Get-ChildItem -Path $targetDir -Filter "*.pem" | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}

