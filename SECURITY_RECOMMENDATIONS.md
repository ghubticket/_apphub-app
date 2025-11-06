# Recomendações de Segurança para Sistema de Venda de Ingressos

## 1. Segurança de Dados e Transações

### 1.1 Validação de Estoque
- ✅ **Implementado**: Verificação de quantidade máxima por lote
- ✅ **Implementado**: Validação de limite por compra
- ✅ **Implementado**: Transações atômicas na criação de pedidos (Mongoose Transactions)
- 🔄 **Recomendado**: Lock otimista/estratégias anti-race para picos de venda

### 1.2 Rate Limiting por Compra
- ✅ **Implementado**: Rate limiting global no backend
- ✅ **Implementado**: Proteções de rate limiting nos endpoints de pagamento e status (básico)
- ✅ **Implementado**: Rate limiting específico para criação de pedidos (20 requisições por 15 minutos por IP)
- 🔄 **Recomendado**: Rate limiting por usuário autenticado (ex: 10 pedidos por hora)

### 1.3 Validação de Quantidade
- ✅ **Implementado**: Validação de limite por compra (`maxPerPurchase`)
- ✅ **Implementado**: Validação de estoque disponível
- 🔄 **Recomendado**: Implementar reserva temporária de ingressos (ex: 15 minutos) para evitar que múltiplos usuários tentem comprar os últimos ingressos simultaneamente

## 2. Segurança de QR Codes

### 2.1 Geração Segura
- ✅ **Implementado**: Criptografia do payload com AES-256-GCM (com IV e auth tag)
- ✅ **Implementado**: Assinatura HMAC-SHA256 do payload
- ✅ **Implementado**: Inclusão de timestamp e nonce (anti-replay)
- ℹ️ **Obs.**: Variáveis `QR_SECRET` (32 bytes hex/base64) e opcional `QR_HMAC_SECRET`

### 2.3 Validação
- ✅ **Implementado**: Validação de assinatura HMAC e decriptografia AES-256-GCM
- ✅ **Implementado**: Checagem de timestamp e nonce anti-replay (persistente)
- ✅ **Implementado**: Verificação de status do ingresso (confirmado) e pedido (pago)
- 🔄 **Recomendado**: Blacklist de códigos cancelados/estornados

## 3. Segurança de Pagamentos

### 3.1 Integração com Gateway
- ✅ **Implementado**: Idempotência nas requisições à Orders API via `X-Idempotency-Key`
- ✅ **Implementado**: Autorização via `Authorization: Bearer <MP_ACCESS_TOKEN>` com validação e logs de diagnóstico
- ✅ **Implementado**: Tratamento de sandbox (forçar email `*@testuser.com` em ambiente dev)
- ✅ **Implementado**: Armazenamento e exibição de mensagens detalhadas de status/erros (user/admin)
- ✅ **Implementado**: Logs detalhados de criação de pagamentos e respostas do MP (ambiente dev)
- ✅ **Implementado**: Webhook tipo `order` (Orders API) com idempotência persistente (DB + fila + retry) e assinatura HMAC-SHA256 obrigatória em produção (`MP_WEBHOOK_SECRET`)

### 3.2 Processamento de Pagamento
- ✅ **Implementado**: Nunca processar pagamento diretamente no frontend (toda a criação acontece no backend)
- ✅ **Implementado**: Validações server-side (CPF, email, amount, status do pedido, expiração)
- ✅ **Implementado**: Timeout/expiração automática de pedidos pendentes (serviço agendado)
- ✅ **Implementado**: Exigir `deviceId`/fingerprint (`X-meli-session-id` ou `deviceId`) no checkout
- 🔄 **Recomendado**: Heurísticas antifraude por sessão (ex.: correlação IP/UA, velocity rules)

## 4. Segurança de API

### 4.1 Autenticação e Autorização
- ✅ **Implementado**: JWT com verificação de token
- ✅ **Implementado**: Middleware de autorização por role (ADMIN)
- ✅ **Implementado**: Lockout progressivo no login (5 falhas/15 min → bloqueio 15 min)
- 🔄 **Recomendado**: Refresh tokens + rotação
- 🔄 **Recomendado**: Rate limiting por usuário autenticado

### 4.2 Validação de Input
- ✅ **Implementado**: Validação de schema com Mongoose
- 🔄 **Recomendado**: Sanitização adicional de inputs (prevenir XSS, SQL Injection)
- 🔄 **Recomendado**: Validação de tipos de dados no controller

### 4.3 CORS e Headers de Segurança
- ✅ **Implementado**: Helmet com configuração de CSP
- ✅ **Implementado**: CORS restrito por domínio (prod), permissivo em dev
- ✅ **Implementado**: Headers adicionais nas chamadas ao MP (`X-Idempotency-Key`, `X-meli-session-id` quando disponível)
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
- ✅ **Implementado**: Logging estruturado por requisição com `requestId`, status e duração
- ✅ **Implementado**: Captura de IP, user-agent e timestamp nos logs HTTP
- 🔄 **Recomendado**: Implementar log rotation e envio para agregador (Elastic/CloudWatch)

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
- ✅ **Implementado**: Forçar HTTPS em produção (redirect 301 quando não seguro)
- ✅ **Implementado**: HSTS (HTTP Strict Transport Security) com preload em produção

### 8.3 Monitoramento
- ✅ **Implementado**: Sentry/APM (opcional) habilitável via `SENTRY_DSN` e `SENTRY_TRACES_SAMPLE_RATE`
- 🔄 **Recomendado**: Alertas e métricas (fraude/erros críticos)

## 9. Proteção de Arquivos Estáticos/Imagens (Uploads)

### 9.1 Riscos
- Abuso de URL direta (hotlink) para consumir banda e tentar derrubar o servidor
- Varredura/bots baixando repetidamente imagens grandes

### 9.2 O que já ajuda
- ✅ Rate limiting global aplicado a todas as rotas (inclui `/uploads`)
- ✅ Helmet/CSP (camada de headers – não bloqueia acesso direto, mas reduz superfície de risco)
- ✅ Cache-Control forte em `/uploads` (`public, max-age=2592000, immutable`)
- ✅ Hotlink protection por `Referer` em produção (bloqueia origens fora de `FRONTEND_URL`/`DASHBOARD_URL`)

### 9.3 Recomendações
- 🔄 Colocar imagens atrás de CDN (Cloudflare/CloudFront/R2) com cache no edge
- 🔄 Hotlink protection no edge (WAF/CDN) e/ou URLs assinadas
- 🔄 Limitar taxa de download por IP no edge (Rate limiting da CDN)
- 🔄 Servir estático via Nginx/CDN (tirar carga do Node)

## 9. Checklist de Implementação Prioritária

### Alta Prioridade 🔴
1. ✅ Validação de estoque e limites por compra
2. ✅ Transações atômicas para vendas (Mongoose Transactions)
3. ✅ Rate limiting específico para criação de pedidos (IP)
4. ✅ Geração segura de QR Codes com criptografia (AES-256-GCM)
5. ✅ Validação de QR Codes com HMAC + timestamp/nonce (anti-replay persistente)
6. ✅ Webhooks com assinatura obrigatória + idempotência persistente (fila + retry)

### Média Prioridade 🟡
7. 🔄 Reserva temporária de ingressos
8. 🔄 Limites por CPF/Email
9. 🔄 Validação de CPF
10. 🔄 Logging de operações críticas

### Baixa Prioridade 🟢
11. 🔄 Refresh tokens
12. 🔄 CAPTCHA após tentativas suspeitas
13. 🔄 Sistema de auditoria completo
14. 🔄 Monitoramento avançado