# 📱 Como Acessar o Frontend no Celular

## 🌐 Seu IP na Rede: `10.0.0.101`

---

## ⚡ Opção 1: HTTP (Mais Simples)

### 1. Rodar Frontend na Rede

```powershell
cd frontend
npm run dev:network
```

### 2. Acessar no Celular

**Certifique-se de que o celular está na mesma rede Wi-Fi!**

No navegador do celular, acesse:
```
http://10.0.0.101:3000
```

### 3. Configurar Backend para Rede

O backend já está configurado para aceitar conexões externas. Certifique-se de que está rodando.

No `frontend/.env`, configure:
```env
NEXT_PUBLIC_API_URL=http://10.0.0.101:3001/api
```

---

## 🔒 Opção 2: HTTPS (Recomendado para Testes de Pagamento)

### 1. Gerar Certificados com IP

Os certificados atuais só funcionam para `localhost`. Para funcionar no celular, precisamos incluir o IP:

```powershell
cd certificates
mkcert localhost 127.0.0.1 ::1 10.0.0.101
cd ..
```

**⚠️ Importante:** Se o IP mudar, você precisará regenerar os certificados.

### 2. Rodar Frontend com HTTPS na Rede

```powershell
cd frontend
npm run dev:https:network
```

### 3. Acessar no Celular

No navegador do celular, acesse:
```
https://10.0.0.101:3000
```

**⚠️ Aviso de Segurança:** O navegador vai mostrar um aviso porque o certificado não é confiável para o IP. Isso é normal em desenvolvimento. Clique em "Avançado" → "Continuar mesmo assim".

### 4. Configurar Backend para Rede

No `frontend/.env`, configure:
```env
NEXT_PUBLIC_API_URL=https://10.0.0.101:3443/api
```

---

## 🔥 Configurar Firewall do Windows

O Windows pode bloquear conexões externas. Para permitir:

### Via PowerShell (como Administrador):

```powershell
# Permitir porta 3000 (Frontend HTTP)
New-NetFirewallRule -DisplayName "Next.js Dev" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Permitir porta 3443 (Backend HTTPS)
New-NetFirewallRule -DisplayName "Backend HTTPS" -Direction Inbound -LocalPort 3443 -Protocol TCP -Action Allow

# Permitir porta 3001 (Backend HTTP - se usar)
New-NetFirewallRule -DisplayName "Backend HTTP" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Ou via Interface Gráfica:

1. Abra "Firewall do Windows Defender"
2. Clique em "Configurações Avançadas"
3. Clique em "Regras de Entrada" → "Nova Regra"
4. Selecione "Porta" → Próximo
5. Selecione "TCP" e digite a porta (3000 ou 3443)
6. Selecione "Permitir a conexão"
7. Marque todos os perfis
8. Dê um nome (ex: "Next.js Dev") e Finalizar

---

## 📋 Checklist

- [ ] Celular e computador na mesma rede Wi-Fi
- [ ] Firewall configurado para permitir conexões
- [ ] Frontend rodando com `-H 0.0.0.0` (script `dev:network` ou `dev:https:network`)
- [ ] Backend rodando (já aceita conexões externas por padrão)
- [ ] `.env` do frontend configurado com o IP correto
- [ ] Para HTTPS: certificados gerados com o IP incluído

---

## 🐛 Troubleshooting

### "Não consigo acessar"

1. **Verificar se estão na mesma rede:**
   - Celular e PC devem estar no mesmo Wi-Fi
   - Não funciona com dados móveis

2. **Verificar firewall:**
   - Desative temporariamente o firewall para testar
   - Se funcionar, configure as regras acima

3. **Verificar IP:**
   - Execute: `ipconfig` no PowerShell
   - Procure por "IPv4" na interface Wi-Fi
   - Use esse IP no celular

4. **Verificar se o servidor está rodando:**
   - No PC, acesse `http://localhost:3000` para confirmar

### "Aviso de certificado inválido (HTTPS)"

- Isso é normal em desenvolvimento
- Clique em "Avançado" → "Continuar mesmo assim"
- O certificado é válido, mas não está assinado por uma CA pública

### "CORS Error"

- Verifique se o `NEXT_PUBLIC_API_URL` está correto no `.env`
- O backend já está configurado para aceitar conexões de qualquer origem em desenvolvimento

---

## 💡 Dica: Descobrir IP Automaticamente

Crie um script para mostrar o IP:

```powershell
# get-ip.ps1
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "Seu IP na rede: $ip" -ForegroundColor Green
Write-Host "Acesse no celular: http://$ip:3000" -ForegroundColor Cyan
```

---

## 🎯 Resumo Rápido

**HTTP (Simples):**
```powershell
# Frontend
cd frontend
npm run dev:network
# Acesse: http://10.0.0.101:3000
```

**HTTPS (Recomendado):**
```powershell
# 1. Gerar certificados com IP
cd certificates
mkcert localhost 127.0.0.1 ::1 10.0.0.101

# 2. Frontend
cd frontend
npm run dev:https:network
# Acesse: https://10.0.0.101:3000
```

---

**Pronto! Agora você pode testar no celular!** 📱✨

