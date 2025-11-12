# Script para descobrir o IP na rede local

Write-Host "Descobrindo seu IP na rede..." -ForegroundColor Cyan
Write-Host ""

# Tentar encontrar IP da interface Wi-Fi ou Ethernet
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
    Write-Host "Seu IP na rede: $ip" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse no celular:" -ForegroundColor Cyan
    Write-Host "  HTTP:  http://$ip:3000" -ForegroundColor Yellow
    Write-Host "  HTTPS: https://$ip:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Backend:" -ForegroundColor Cyan
    Write-Host "  HTTP:  http://$ip:3001" -ForegroundColor Yellow
    Write-Host "  HTTPS: https://$ip:3443" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Certifique-se de que:" -ForegroundColor Gray
    Write-Host "  - Celular e PC estao na mesma rede Wi-Fi" -ForegroundColor Gray
    Write-Host "  - Firewall permite conexoes nas portas" -ForegroundColor Gray
} else {
    Write-Host "ERRO: Nao foi possivel encontrar o IP" -ForegroundColor Red
    Write-Host "Execute: ipconfig" -ForegroundColor Yellow
}

