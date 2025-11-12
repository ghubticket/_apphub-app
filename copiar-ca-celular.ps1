# Script para copiar o certificado CA para facilitar envio ao celular

Write-Host "Copiando certificado CA para a raiz do projeto..." -ForegroundColor Cyan
Write-Host ""

$caDir = "$env:LOCALAPPDATA\mkcert"
$caFile = Get-ChildItem -Path $caDir -Filter "rootCA*.pem" -Exclude "*key*" | Select-Object -First 1

if ($caFile) {
    $targetPath = Join-Path $PSScriptRoot "rootCA.pem"
    Copy-Item -Path $caFile.FullName -Destination $targetPath -Force
    Write-Host "OK: Certificado CA copiado para: rootCA.pem" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora voce pode:" -ForegroundColor Cyan
    Write-Host "  1. Enviar rootCA.pem para o celular (email, WhatsApp, etc)" -ForegroundColor Yellow
    Write-Host "  2. Instalar no celular seguindo: instalar-ca-celular.md" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "ERRO: Certificado CA nao encontrado em: $caDir" -ForegroundColor Red
    Write-Host "   Execute: mkcert -install (como Administrador)" -ForegroundColor Yellow
}

