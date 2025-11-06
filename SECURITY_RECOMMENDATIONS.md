# Recomendações de Segurança para Sistema de Venda de Ingressos

## 1. Segurança de Dados e Transações

### 1.1 Validação de Estoque
- ✅ **Implementado**: Verificação de quantidade máxima por lote
- ✅ **Implementado**: Validação de limite por compra
- 🔄 **Recomendado**: Implementar transações atômicas (MongoDB Transactions) para garantir que a reserva e a venda sejam atômicas
- 🔄 **Recomendado**: Implementar lock otimista para evitar race conditions em vendas simultâneas

### 1.2 Rate Limiting por Compra
- ✅ **Implementado**: Rate limiting global no backend
- ✅ **Implementado**: Proteções de rate limiting nos endpoints de pagamento e status (básico)
- 🔄 **Recomendado**: Rate limiting específico para criação de pedidos (ex: 5 pedidos por minuto por IP)
- 🔄 **Recomendado**: Rate limiting por usuário autenticado (ex: 10 pedidos por hora)

### 1.3 Validação de Quantidade
- ✅ **Implementado**: Validação de limite por compra (`maxPerPurchase`)
- ✅ **Implementado**: Validação de estoque disponível
- 🔄 **Recomendado**: Implementar reserva temporária de ingressos (ex: 15 minutos) para evitar que múltiplos usuários tentem comprar os últimos ingressos simultaneamente

## 2. Segurança de QR Codes

### 2.1 Geração Segura
- 🔄 **Recomendado**: Usar criptografia simétrica (AES-256) para o payload do QR Code
- 🔄 **Recomendado**: Incluir HMAC-SHA256 para verificação de integridade
- 🔄 **Recomendado**: Incluir timestamp no QR Code para validar expiração
- 🔄 **Recomendado**: Adicionar nonce único para evitar replay attacks

### 2.2 Estrutura do QR Code
```typescript
{
  ticketId: string,        // ID do ingresso
  eventId: string,         // ID do evento
  code: string,            // Código único
  timestamp: number,       // Timestamp de geração
  nonce: string,          // Nonce único
  hash: string           // HMAC-SHA256(secret, ticketId + eventId + code + timestamp + nonce)
}
```

### 2.3 Validação
- 🔄 **Recomendado**: Validar assinatura HMAC antes de processar
- 🔄 **Recomendado**: Verificar se o ingresso não foi usado anteriormente
- 🔄 **Recomendado**: Verificar se o evento ainda está ativo
- 🔄 **Recomendado**: Implementar blacklist de códigos cancelados/estornados

## 3. Segurança de Pagamentos

### 3.1 Integração com Gateway
- ✅ **Implementado**: Idempotência nas requisições à Orders API via `X-Idempotency-Key`
- ✅ **Implementado**: Autorização via `Authorization: Bearer <MP_ACCESS_TOKEN>` com validação e logs de diagnóstico
- ✅ **Implementado**: Tratamento de sandbox (forçar email `*@testuser.com` em ambiente dev) para evitar rejeições
- ✅ **Implementado**: Armazenamento e exibição de mensagens detalhadas de status/erros (user/admin)
- ✅ **Implementado**: Logs detalhados de criação de pagamentos e respostas do MP (ambiente dev)
- 🔄 **Recomendado**: Usar webhooks assinados do gateway de pagamento (Mercado Pago, Stripe, etc.)
- 🔄 **Recomendado**: Validar assinatura do webhook antes de processar
- 🔄 **Recomendado**: Idempotência no processamento de webhooks (garantir que eventos duplicados não mudem estado)

### 3.2 Processamento de Pagamento
- ✅ **Implementado**: Nunca processar pagamento diretamente no frontend (toda a criação acontece no backend)
- ✅ **Implementado**: Validações server-side (CPF, email, amount, status do pedido, expiração)
- ✅ **Implementado**: Timeout/expiração automática de pedidos pendentes (serviço agendado)
- 🔄 **Recomendado**: Validar `deviceId`/fingerprint e aplicar heurísticas antifraude por sessão

## 4. Segurança de API

### 4.1 Autenticação e Autorização
- ✅ **Implementado**: JWT com verificação de token
- ✅ **Implementado**: Middleware de autorização por role (ADMIN)
- 🔄 **Recomendado**: Implementar refresh tokens para aumentar segurança
- 🔄 **Recomendado**: Implementar rate limiting por usuário autenticado

### 4.2 Validação de Input
- ✅ **Implementado**: Validação de schema com Mongoose
- 🔄 **Recomendado**: Sanitização adicional de inputs (prevenir XSS, SQL Injection)
- 🔄 **Recomendado**: Validação de tipos de dados no controller

### 4.3 CORS e Headers de Segurança
- ✅ **Implementado**: Helmet com configuração de CSP
- ✅ **Implementado**: CORS configurado
- ✅ **Implementado**: Headers adicionais nas chamadas ao MP (`X-Idempotency-Key`, `X-meli-session-id` quando disponível)
- 🔄 **Recomendado**: Revisar e restringir CORS para produção
- 🔄 **Recomendado**: Implementar Content-Security-Policy mais restritiva

## 5. Prevenção de Fraude

### 5.1 Limites por CPF/Email
- 🔄 **Recomendado**: Implementar limite de ingressos por CPF por evento
- 🔄 **Recomendado**: Implementar verificação de email único por pedido
- 🔄 **Recomendado**: Implementar blacklist de CPFs/emails suspeitos

### 5.2 Detecção de Padrões Suspeitos
- 🔄 **Recomendado**: Alertar sobre múltiplas compras do mesmo IP em pouco tempo
- 🔄 **Recomendado**: Alertar sobre múltiplos pedidos com mesmo CPF mas diferentes emails
- 🔄 **Recomendado**: Implementar CAPTCHA após X tentativas de compra

### 5.3 Validação de Dados do Comprador
- 🔄 **Recomendado**: Validar CPF (algoritmo de validação)
- 🔄 **Recomendado**: Validar formato de telefone
- 🔄 **Recomendado**: Verificar se email é válido (envio de confirmação)

## 6. Auditoria e Logs

### 6.1 Logging
- 🔄 **Recomendado**: Logar todas as operações críticas (criação de pedido, validação de QR Code, cancelamento)
- 🔄 **Recomendado**: Incluir IP, user agent, timestamp em todos os logs
- 🔄 **Recomendado**: Implementar log rotation para evitar acúmulo excessivo

### 6.2 Auditoria
- 🔄 **Recomendado**: Criar tabela de auditoria para mudanças em pedidos e ingressos
- 🔄 **Recomendado**: Registrar quem fez cada alteração (admin, sistema, etc.)
- 🔄 **Recomendado**: Manter histórico de alterações de status

## 7. Backup e Recuperação

### 7.1 Backup
- 🔄 **Recomendado**: Backup diário do banco de dados
- 🔄 **Recomendado**: Backup de arquivos de upload (imagens)
- 🔄 **Recomendado**: Testar processo de restauração periodicamente

### 7.2 Recuperação
- 🔄 **Recomendado**: Implementar processo de reembolso automatizado
- 🔄 **Recomendado**: Implementar processo de cancelamento de evento
- 🔄 **Recomendado**: Notificar todos os compradores em caso de cancelamento

## 8. Segurança de Infraestrutura

### 8.1 Variáveis de Ambiente
- ✅ **Implementado**: Uso de dotenv
- 🔄 **Recomendado**: Nunca commitar secrets no código
- 🔄 **Recomendado**: Usar serviços de gerenciamento de secrets (AWS Secrets Manager, Azure Key Vault)

### 8.2 HTTPS
- 🔄 **Recomendado**: Forçar HTTPS em produção
- 🔄 **Recomendado**: Implementar HSTS (HTTP Strict Transport Security)

### 8.3 Monitoramento
- 🔄 **Recomendado**: Implementar monitoramento de métricas (Sentry, New Relic, etc.)
- 🔄 **Recomendado**: Alertas para tentativas de fraude
- 🔄 **Recomendado**: Alertas para erros críticos

## 9. Checklist de Implementação Prioritária

### Alta Prioridade 🔴
1. ✅ Validação de estoque e limites por compra
2. 🔄 Transações atômicas para vendas
3. 🔄 Rate limiting específico para compras
4. 🔄 Geração segura de QR Codes com criptografia
5. 🔄 Validação de QR Codes com HMAC

### Média Prioridade 🟡
6. 🔄 Reserva temporária de ingressos
7. 🔄 Limites por CPF/Email
8. 🔄 Validação de CPF
9. 🔄 Webhooks assinados para pagamentos
10. 🔄 Logging de operações críticas

### Baixa Prioridade 🟢
11. 🔄 Refresh tokens
12. 🔄 CAPTCHA após tentativas suspeitas
13. 🔄 Sistema de auditoria completo
14. 🔄 Monitoramento avançado

## 10. Observações Importantes

- **VIP Ingressos**: Já implementado que ingressos VIP não têm valor nem taxa
- **Taxa do Evento**: Campo `ticketFee` adicionado ao modelo Event
- **Lotes**: Sistema de lotes implementado com validação de número único por evento
- **Limite por Compra**: Campo `maxPerPurchase` configurável por tipo de ingresso

---

**Nota**: Este documento deve ser atualizado conforme novas funcionalidades são implementadas e novas vulnerabilidades são identificadas.

