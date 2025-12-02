# Troubleshooting: Problemas com Envio de Emails no Resend

## Problema: Apenas um email está recebendo

Se apenas o email `guilhermehr.desgner@gmail.com` está recebendo emails, isso é **muito provável** que seja por causa da versão **FREE** do Resend.

## Causas Principais

### 1. **Domínio de Teste (`onboarding@resend.dev`)**

Quando você usa o plano free sem configurar um domínio próprio, o Resend usa o domínio de teste `onboarding@resend.dev`.

**Problemas:**
- ✅ Funciona para emails que você já testou/verificou
- ❌ Emails de domínios não verificados vão para SPAM
- ❌ Provedores como Outlook, Gmail bloqueiam frequentemente
- ❌ Taxa de entrega muito baixa

### 2. **Limitações do Plano Free**

- **3.000 emails/mês**
- **100 emails/dia**
- Pode haver restrições de destinatários em testes

### 3. **Políticas Anti-Spam dos Provedores**

Provedores como Outlook, Gmail, Yahoo têm políticas muito restritivas:
- Bloqueiam emails de domínios não verificados
- Marcam como SPAM automaticamente
- Exigem autenticação SPF, DKIM, DMARC

## Soluções

### ✅ Solução 1: Verificar Logs do Resend (Imediato)

1. Acesse: https://resend.com/emails
2. Verifique se os emails estão sendo enviados
3. Veja o status de cada email (entregue, rejeitado, etc.)
4. Verifique se há erros específicos

### ✅ Solução 2: Configurar Domínio Próprio para ENVIO (Recomendado)

**⚠️ IMPORTANTE:** Isso é sobre ENVIO (sending), não recebimento (receiving)!

**Esta é a solução definitiva para produção!**

O plano free do Resend permite **1 domínio personalizado por equipe** para envio de emails.

#### Passo a Passo:

1. **Acesse o Dashboard do Resend:**
   - https://resend.com/domains
   - Faça login na sua conta

2. **Adicione seu Domínio para ENVIO:**
   - Clique em "Add Domain"
   - Digite seu domínio (ex: `notificacoes.com.br` ou `send.notificacoes.com.br`)
   - Clique em "Add"
   - ⚠️ **NOTA:** Se você já tem um domínio configurado para recebimento, pode usar o mesmo para envio!

3. **Configure os Registros DNS para ENVIO:**
   O Resend vai mostrar os registros DNS que você precisa adicionar:
   
   **SPF Record (para envio):**
   ```
   Tipo: TXT
   Nome: @ (ou domínio raiz, ou subdomínio como send.notificacoes)
   Valor: v=spf1 include:resend.com ~all
   ```
   
   **DKIM Record (para envio):**
   ```
   Tipo: TXT
   Nome: [nome fornecido pelo Resend, algo como _resend-key]
   Valor: [valor fornecido pelo Resend]
   ```
   
   **DMARC Record (Opcional mas recomendado):**
   ```
   Tipo: TXT
   Nome: _dmarc
   Valor: v=DMARC1; p=none; rua=mailto:seu-email@seu-dominio.com
   ```

4. **Adicione os Registros no seu Provedor DNS:**
   - Acesse o painel do seu provedor DNS (ex: Cloudflare, GoDaddy, Registro.br)
   - Adicione cada registro DNS
   - ⚠️ **IMPORTANTE:** Os registros para ENVIO são diferentes dos de RECEBIMENTO (MX records)
   - Aguarde a propagação (pode levar até 48h, geralmente 1-2h)

5. **Verifique no Resend:**
   - Volte para https://resend.com/domains
   - Clique no seu domínio
   - Na seção "Sending", o status deve mudar para "Verified" (verificado)
   - Pode levar alguns minutos após a propagação DNS

6. **Configure no Backend:**
   - Adicione no `.env`:
   ```env
   RESEND_FROM_EMAIL=Toka <noreply@seu-dominio.com.br>
   ```
   - Ou use o formato:
   ```env
   RESEND_FROM_EMAIL=noreply@seu-dominio.com.br
   ```
   - ⚠️ **IMPORTANTE:** Use o domínio que você verificou no Resend!

7. **Reinicie o Backend:**
   ```bash
   npm run build
   npm start
   ```

#### Diferença entre Sending e Receiving:

- **Sending (ENVIO):** Usa registros SPF, DKIM, DMARC (TXT) → Para enviar emails
- **Receiving (RECEBIMENTO):** Usa registros MX → Para receber emails

Você pode ter ambos configurados no mesmo domínio!

### ✅ Solução 3: Verificar Pasta de SPAM

Mesmo com domínio próprio, emails podem ir para SPAM:

1. **Gmail:**
   - Verifique a pasta "Spam" ou "Lixo Eletrônico"
   - Se encontrar, marque como "Não é spam"
   - Adicione o remetente aos contatos

2. **Outlook:**
   - Verifique a pasta "Lixo Eletrônico"
   - Adicione o remetente à lista de remetentes seguros

3. **Outros Provedores:**
   - Sempre verifique a pasta de spam primeiro

### ✅ Solução 4: Testar com Scripts de Teste

O backend já tem scripts de teste:

```bash
# Testar envio de email
npm run test-email -- --to=email@exemplo.com

# Testar envio para Outlook
npm run test-email-outlook -- --to=email@outlook.com
```

### ✅ Solução 5: Verificar Configuração Atual

Verifique se as variáveis estão configuradas:

```bash
# No backend/.env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Toka <noreply@seu-dominio.com.br>
```

## Como Verificar se Está Funcionando

1. **Envie um email de teste:**
   ```bash
   npm run test-email -- --to=email-teste@exemplo.com
   ```

2. **Verifique os logs do Resend:**
   - https://resend.com/emails
   - Veja o status de cada envio

3. **Verifique a pasta de SPAM:**
   - Sempre verifique primeiro!

4. **Teste com múltiplos provedores:**
   - Gmail
   - Outlook
   - Yahoo
   - Email corporativo

## Checklist de Diagnóstico

- [ ] Verificou os logs do Resend? (https://resend.com/emails)
- [ ] Verificou a pasta de SPAM?
- [ ] Configurou domínio próprio no Resend?
- [ ] Adicionou registros DNS (SPF, DKIM)?
- [ ] Domínio está verificado no Resend?
- [ ] Configurou `RESEND_FROM_EMAIL` no `.env`?
- [ ] Reiniciou o backend após mudanças?
- [ ] Testou com script de teste?

## Próximos Passos

1. **Imediato:** Verifique os logs do Resend e pasta de SPAM
2. **Curto Prazo:** Configure domínio próprio (recomendado para produção)
3. **Longo Prazo:** Considere upgrade para plano pago se precisar de mais volume

## Links Úteis

- Dashboard Resend: https://resend.com/emails
- Domínios: https://resend.com/domains
- Documentação: https://resend.com/docs
- Suporte: https://resend.com/support

## Nota Importante

⚠️ **Para produção, é ESSENCIAL configurar um domínio próprio!**

O domínio de teste (`onboarding@resend.dev`) é apenas para desenvolvimento e testes. Para produção, você DEVE configurar seu próprio domínio para garantir:
- ✅ Melhor taxa de entrega
- ✅ Menos bloqueios
- ✅ Mais confiança dos provedores
- ✅ Melhor reputação do domínio

