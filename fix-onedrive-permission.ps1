# Script para resolver problemas de permissao do OneDrive com Next.js

Write-Host "Corrigindo problemas de permissao do OneDrive..." -ForegroundColor Cyan
Write-Host ""

# Pasta do frontend
$frontendPath = Join-Path $PSScriptRoot "frontend"
$nextPath = Join-Path $frontendPath ".next"

if (Test-Path $nextPath) {
    Write-Host "Removendo pasta .next..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $nextPath -Recurse -Force -ErrorAction Stop
        Write-Host "OK: Pasta .next removida" -ForegroundColor Green
    } catch {
        Write-Host "AVISO: Nao foi possivel remover completamente. Tente fechar o OneDrive e executar novamente." -ForegroundColor Yellow
    }
} else {
    Write-Host "Pasta .next nao existe" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Configurando exclusao do OneDrive para pasta .next..." -ForegroundColor Yellow

# Criar arquivo .onedriveignore se nao existir
$ignoreFile = Join-Path $frontendPath ".onedriveignore"
if (-not (Test-Path $ignoreFile)) {
    $content = @"
.next
node_modules
out
.env
.env.local
"@
    $content | Out-File -FilePath $ignoreFile -Encoding UTF8
    Write-Host "OK: Arquivo .onedriveignore criado" -ForegroundColor Green
} else {
    Write-Host "Arquivo .onedriveignore ja existe" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Pause a sincronizacao do OneDrive temporariamente" -ForegroundColor Yellow
Write-Host "  2. Ou exclua a pasta do projeto do OneDrive" -ForegroundColor Yellow
Write-Host "  3. Rode o frontend novamente: npm run dev:network" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para pausar o OneDrive:" -ForegroundColor Cyan
Write-Host "  - Clique no icone do OneDrive na bandeja" -ForegroundColor Gray
Write-Host "  - Configuracoes > Pausar sincronizacao > 2 horas" -ForegroundColor Gray
Write-Host ""

