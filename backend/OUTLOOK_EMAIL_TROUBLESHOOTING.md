# 🔍 Troubleshooting: Emails não chegam no Outlook.com

## ❌ Problema

Emails enviados via Resend não estão chegando em contas **@outlook.com** ou **@live.com**.

## 🔍 Causas Principais

### 1. **Domínio não verificado (Principal)**
- Outlook.com bloqueia emails de domínios não verificados
- Estamos usando `onboarding@resend.dev` (domínio de teste)
- Outlook tem políticas anti-spam muito restritivas

### 2. **Emails indo para SPAM**
- Outlook pode marcar como spam automaticamente
- Filtros anti-spam muito agressivos

### 3. **Falta de autenticação DNS**
- SPF, DKIM, DMARC não configurados para domínio de teste
- Outlook verifica essas autenticações

## ✅ Soluções

### Solução 1: Verificar SPAM (Imediato) ⚡

1. Acesse sua conta Outlook.com
2. Verifique a pasta **"Lixo Eletrônico"** ou **"Spam"**
3. Se encontrar o email:
   - Marque como "Não é lixo eletrônico"
   - Adicione o remetente aos contatos confiáveis

### Solução 2: Adicionar aos Contatos Confiáveis

1. No Outlook.com, vá em **Configurações** → **Email** → **Filtros de lixo eletrônico**
2. Adicione `onboarding@resend.dev` à lista de remetentes seguros
3. Ou adicione como contato

### Solução 3: Verificar Logs do Resend (Diagnóstico)

1. Acesse: https://resend.com/emails
2. Verifique se o email foi enviado com sucesso
3. Veja o status de entrega
4. Verifique se há erros de bounce

### Solução 4: Configurar Domínio Próprio (Recomendado para Produção) 🎯

**Esta é a solução definitiva para produção:**

1. **Adicionar domínio no Resend:**
   - Acesse: https://resend.com/domains
   - Clique em "Add Domain"
   - Digite seu domínio (ex: `eventhub.com`)

2. **Configurar registros DNS:**
   - Resend fornecerá os registros necessários:
     - **SPF**: `v=spf1 include:_spf.resend.com ~all`
     - **DKIM**: Registro TXT específico
     - **DMARC**: `v=DMARC1; p=none; rua=mailto:dmarc@seudominio.com`

3. **Adicionar registros no seu provedor DNS:**
   - Acesse o painel do seu provedor (GoDaddy, Cloudflare, etc.)
   - Adicione os registros TXT fornecidos pelo Resend
   - Aguarde propagação (pode levar até 48h)

4. **Verificar domínio no Resend:**
   - Volte ao Resend e clique em "Verify"
   - Aguarde confirmação (verde)

5. **Atualizar .env:**
   ```env
   RESEND_FROM_EMAIL=EventHub <noreply@seudominio.com>
   ```

6. **Testar:**
   ```bash
   npm run test-email-outlook --to=seu-email@outlook.com
   ```

## 🧪 Testar Envio

### Script de teste específico para Outlook:

```bash
# Testar para um email específico
npm run test-email-outlook --to=luizh.benicio@outlook.com

# Testar para os emails padrão (configurados no script)
npm run test-email-outlook
```

### Verificar logs no console:

O script mostrará:
- ✅ Se o email foi enviado com sucesso
- 📧 Message ID do Resend
- 🔗 Link para ver logs detalhados

## 📊 Verificar Status no Resend

1. Acesse: https://resend.com/emails
2. Procure pelo Message ID retornado no log
3. Veja o status:
   - ✅ **Delivered**: Email entregue (pode estar no spam)
   - ⚠️ **Bounced**: Email rejeitado pelo servidor
   - 🔄 **Pending**: Ainda processando

## 🔧 Melhorias Implementadas

1. ✅ **Logs detalhados** no `emailService.ts`
   - Mostra Message ID
   - Link direto para logs do Resend
   - Informações de debug em desenvolvimento

2. ✅ **Script de teste específico** (`testEmailOutlook.ts`)
   - Testa envio para Outlook
   - Mostra diagnóstico completo
   - Instruções de troubleshooting

## ⚠️ Limitações do Domínio de Teste

O domínio `resend.dev` é apenas para **testes**:
- ❌ Pode ser bloqueado por Outlook, Gmail, etc.
- ❌ Taxa de entrega menor
- ❌ Pode ir para spam
- ✅ Funciona para desenvolvimento/testes básicos

**Para produção, SEMPRE use um domínio próprio verificado!**

## 📝 Checklist de Troubleshooting

- [ ] Verificar pasta de SPAM/Lixo Eletrônico
- [ ] Adicionar remetente aos contatos confiáveis
- [ ] Verificar logs no Resend (https://resend.com/emails)
- [ ] Testar com script: `npm run test-email-outlook`
- [ ] Verificar se Message ID foi gerado
- [ ] Configurar domínio próprio (se for produção)
- [ ] Verificar registros DNS (SPF, DKIM, DMARC)
- [ ] Aguardar propagação DNS (até 48h)

## 🆘 Se Nada Funcionar

1. **Teste com outro provedor de email:**
   - Gmail, Yahoo, etc.
   - Para confirmar se é problema específico do Outlook

2. **Entre em contato com Resend:**
   - Suporte: https://resend.com/support
   - Eles podem verificar bloqueios específicos

3. **Use domínio próprio:**
   - Esta é a solução mais confiável
   - Outlook confia mais em domínios verificados

---

**Última atualização:** Janeiro 2025

