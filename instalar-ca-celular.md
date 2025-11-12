# 📱 Instalar Certificado CA no Celular

Para remover o aviso "Não seguro" no celular, você precisa instalar a CA (Certificate Authority) do mkcert no dispositivo.

## 📍 Localizar o Certificado CA

O certificado CA do mkcert está em:

**Windows:**
```
%LOCALAPPDATA%\mkcert\rootCA.pem
```

Ou execute:
```powershell
Get-ChildItem "$env:LOCALAPPDATA\mkcert" -Filter "rootCA*.pem"
```

## 📲 Android

### Método 1: Via Configurações

1. **Copie o arquivo `rootCA.pem` para o celular:**
   - Envie por email, WhatsApp, ou conecte via USB
   - Salve na pasta Downloads

2. **Instalar:**
   - Vá em **Configurações** → **Segurança** → **Criptografia e credenciais**
   - Toque em **Instalar certificado**
   - Selecione **Certificado CA**
   - Navegue até o arquivo `rootCA.pem` e selecione
   - Dê um nome (ex: "mkcert Local")
   - Confirme a instalação

3. **Verificar:**
   - Vá em **Configurações** → **Segurança** → **Criptografia e credenciais** → **Certificados confiáveis** → **Usuário**
   - Deve aparecer "mkcert Local"

### Método 2: Via Navegador

1. Acesse `https://10.0.0.101:3000` no celular
2. Toque em **Avançado** → **Detalhes do certificado**
3. Toque em **Instalar certificado**
4. Siga as instruções

## 🍎 iOS (iPhone/iPad)

1. **Enviar o certificado:**
   - Envie o `rootCA.pem` por email para você mesmo
   - Abra o email no iPhone
   - Toque no anexo para baixar

2. **Instalar:**
   - Vá em **Configurações** → **Geral** → **Sobre** → **Certificados confiáveis**
   - Toque em **Instalar** no certificado
   - Confirme a instalação (pode pedir senha/Touch ID)

3. **Ativar:**
   - Vá em **Configurações** → **Geral** → **Sobre** → **Certificados confiáveis**
   - Ative o certificado "mkcert" ou similar

## ⚠️ Importante

- **Apenas para desenvolvimento:** Não instale certificados CA de fontes desconhecidas em produção
- **Segurança:** O certificado permite que o mkcert crie certificados confiáveis localmente
- **Após instalar:** Reinicie o navegador e acesse novamente

## ✅ Verificar

Após instalar, acesse `https://10.0.0.101:3000` novamente. Deve aparecer o cadeado verde 🔒 sem avisos.

## 🔄 Se não funcionar

1. **Verifique se o certificado inclui o IP:**
   ```powershell
   .\gerar-certificados.ps1
   ```
   (O script detecta o IP automaticamente)

2. **Limpe o cache do navegador:**
   - Android: Configurações → Apps → Navegador → Limpar cache
   - iOS: Configurações → Safari → Limpar histórico e dados

3. **Reinicie o celular** (às vezes necessário)

