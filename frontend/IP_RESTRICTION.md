# Proteção por IP - Dashboard e QR Code

Este documento explica como configurar a restrição de acesso por IP para as rotas `/dashboard` e `/checkout` (onde o QR code PIX é exibido).

## Como Funciona

O middleware do Next.js verifica o IP de cada requisição e compara com uma lista de IPs permitidos configurada via variável de ambiente. Se o IP não estiver autorizado, o acesso é bloqueado com erro 403.

## Configuração na Vercel

### 1. Descobrir seu IP Público

Para descobrir seu IP público atual, você pode:

- Acessar: https://whatismyipaddress.com/
- Ou executar no terminal: `curl ifconfig.me`
- Ou acessar: https://api.ipify.org

**⚠️ IMPORTANTE:** Se você usa internet residencial, seu IP pode mudar periodicamente. Considere usar um IP fixo ou atualizar a variável quando necessário.

### 2. Configurar na Vercel

1. Acesse o dashboard da Vercel: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Configure:
   - **Name:** `ALLOWED_IPS`
   - **Value:** Seu IP público (ex: `203.0.113.42`)
   - **Environment:** Selecione **Production**, **Preview** e **Development** conforme necessário
6. Clique em **Save**

### 3. Formato da Variável

A variável `ALLOWED_IPS` aceita múltiplos IPs separados por vírgula:

```
ALLOWED_IPS=203.0.113.42,198.51.100.10
```

### 4. Suporte a Máscaras CIDR (Opcional)

Você também pode usar máscaras CIDR para permitir uma faixa de IPs:

```
ALLOWED_IPS=192.168.1.0/24,203.0.113.0/28
```

Isso permite todos os IPs de `192.168.1.0` a `192.168.1.255` e de `203.0.113.0` a `203.0.113.15`.

### 5. Desabilitar a Proteção

Para desabilitar a proteção por IP, você pode:

- Deixar a variável `ALLOWED_IPS` vazia
- Ou remover a variável completamente

Quando desabilitada, todas as rotas ficam acessíveis normalmente.

## Rotas Protegidas

As seguintes rotas são protegidas quando a variável `ALLOWED_IPS` está configurada:

- `/dashboard` - Página do dashboard
- `/checkout` - Página de checkout (onde o QR code PIX é exibido)

## Testando

1. Configure seu IP na variável `ALLOWED_IPS` na Vercel
2. Faça deploy ou aguarde o redeploy automático
3. Tente acessar `/dashboard` ou `/checkout`:
   - **Com seu IP:** Acesso permitido ✅
   - **Com outro IP:** Erro 403 (Acesso negado) ❌

## Troubleshooting

### Não consigo acessar mesmo com meu IP configurado

1. Verifique se seu IP público mudou (IPs residenciais podem mudar)
2. Verifique se a variável está configurada corretamente (sem espaços extras)
3. Verifique se o deploy foi concluído após adicionar a variável
4. Verifique os logs da Vercel para ver qual IP está sendo detectado

### Como ver qual IP está sendo detectado

Adicione temporariamente um log no middleware para debug (não recomendado em produção):

```typescript
console.log('Client IP:', getClientIP(request));
console.log('Allowed IPs:', allowedIPs);
```

### IP está mudando frequentemente

Se seu IP muda frequentemente, considere:

1. Contratar um IP fixo com seu provedor de internet
2. Usar uma máscara CIDR se você tem uma faixa de IPs
3. Usar um serviço de VPN com IP fixo
4. Atualizar a variável `ALLOWED_IPS` sempre que o IP mudar

## Segurança

⚠️ **IMPORTANTE:** Esta proteção por IP é uma camada adicional de segurança, mas não substitui:

- Autenticação adequada
- HTTPS
- Validação de dados no backend
- Outras medidas de segurança

A proteção por IP é útil para:
- Restringir acesso administrativo
- Proteger rotas sensíveis durante desenvolvimento
- Adicionar uma camada extra de segurança

## Notas Técnicas

- O middleware verifica o IP através dos headers `x-forwarded-for`, `x-real-ip` e `cf-connecting-ip`
- Na Vercel, o IP real do cliente é extraído do primeiro IP em `x-forwarded-for`
- O middleware roda no Edge Runtime da Vercel para melhor performance

