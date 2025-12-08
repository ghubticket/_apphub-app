# Script para resolver problemas de sincronizacao do OneDrive

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracao OneDrive - Projeto Vicente" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o OneDrive esta ativo
Write-Host "1. Verificando status do OneDrive..." -ForegroundColor Yellow
$onedriveProcess = Get-Process -Name "OneDrive" -ErrorAction SilentlyContinue
if ($onedriveProcess) {
    Write-Host "   [OK] OneDrive esta rodando" -ForegroundColor Green
} else {
    Write-Host "   [AVISO] OneDrive nao esta rodando" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Verificando arquivos .onedriveignore..." -ForegroundColor Yellow
if (Test-Path ".onedriveignore") {
    Write-Host "   [OK] .onedriveignore encontrado na raiz" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] .onedriveignore nao encontrado na raiz" -ForegroundColor Red
}

if (Test-Path "frontend\.onedriveignore") {
    Write-Host "   [OK] .onedriveignore encontrado no frontend" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] .onedriveignore nao encontrado no frontend" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Limpando pasta .next para evitar conflitos..." -ForegroundColor Yellow
if (Test-Path "frontend\.next") {
    try {
        Remove-Item -Path "frontend\.next" -Recurse -Force -ErrorAction Stop
        Write-Host "   [OK] Pasta .next removida com sucesso" -ForegroundColor Green
    } catch {
        Write-Host "   [AVISO] Erro ao remover .next: $_" -ForegroundColor Yellow
        Write-Host "   Dica: Tente fechar o OneDrive e executar novamente" -ForegroundColor Cyan
    }
} else {
    Write-Host "   [OK] Pasta .next nao existe" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RECOMENDACOES:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OPCAO 1 (Recomendada): Mover projeto para fora do OneDrive" -ForegroundColor Yellow
Write-Host "   - Mova a pasta do projeto para C:\dev\ ou C:\projetos\" -ForegroundColor White
Write-Host "   - Isso evita completamente conflitos de sincronizacao" -ForegroundColor White
Write-Host ""
Write-Host "OPCAO 2: Desativar sincronizacao desta pasta no OneDrive" -ForegroundColor Yellow
Write-Host "   1. Clique com botao direito na pasta do projeto" -ForegroundColor White
Write-Host "   2. Selecione 'OneDrive' > 'Liberar espaco'" -ForegroundColor White
Write-Host "   3. Isso fara a pasta ficar 'online-only'" -ForegroundColor White
Write-Host ""
Write-Host "OPCAO 3: Pausar temporariamente o OneDrive" -ForegroundColor Yellow
Write-Host "   1. Clique no icone do OneDrive na bandeja do sistema" -ForegroundColor White
Write-Host "   2. Configuracoes > Pausar sincronizacao" -ForegroundColor White
Write-Host "   3. Faca o build e depois reative" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
