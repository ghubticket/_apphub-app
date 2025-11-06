# Guia de Deploy Seguro (Backend EventHub)

## 1) Ambiente e Secrets
- Defina `NODE_ENV=production`.
- Configure `.env` em produção via secrets do provedor (nunca comitar):
  - JWT_SECRET, JWT_REFRESH_SECRET (≥ 32 chars)
  - MONGODB_URI (com usuário de prod e IP allowlist)
  - MP_ACCESS_TOKEN, MP_PUBLIC_KEY, (opcional) MP_WEBHOOK_SECRET
  - FRONTEND_URL, BACKEND_URL (domínios oficiais)
  - SENTRY_DSN (opcional) e `SENTRY_TRACES_SAMPLE_RATE=0.1`

## 2) HTTPS e Segurança de Cabeçalhos
- Coloque o backend atrás de HTTPS (proxy/reverse proxy ou plataforma).
- Ative HSTS (na camada do proxy/CDN) após validar HTTPS estável.
- Helmet já ativo no app.

## 3) CORS (Somente domínios oficiais)
- Em produção, CORS está restrito a `FRONTEND_URL` e `DASHBOARD_URL`.
- Ajuste variáveis para refletir os domínios reais.

## 4) Logs e Observabilidade
- Logs estruturados por requisição com `requestId` já habilitados.
- Configure Sentry se desejar rastrear erros/traces:
  - Setar `SENTRY_DSN` e ajustar `SENTRY_TRACES_SAMPLE_RATE`.
- Considere log rotation e envio para agregador (CloudWatch/Elastic).

## 5) Banco de Dados
- Habilite backups automáticos no MongoDB Atlas.
- Limite acesso por IPs (allowlist) e use usuário com permissões mínimas.

## 6) Mercado Pago (Orders API)
- Verifique `MP_ACCESS_TOKEN` de produção.
- Webhook:
  - Endpoint: `/api/payments/webhook` (no roteador de pagamentos)
  - Idempotência básica habilitada (cache in-memory)
  - Assinatura HMAC opcional (defina `MP_WEBHOOK_SECRET` se disponível)
  - Aponte o webhook no painel do MP para o domínio público do backend

## 7) Uploads e CDN
- Proteções atuais:
  - Cache-Control forte em `/uploads` (30 dias, immutable)
  - Hotlink protection simples por Referer em produção
  - Rate limiting global cobre `/uploads`
- Recomendado para produção:
  - Colocar `/uploads` atrás de CDN (Cloudflare/CloudFront/R2)
  - Ativar cache e rate limit no edge
  - Habilitar hotlink protection/WAF por domínio na CDN

## 8) Rate Limiting e Proteções de Autenticação
- Rate limiting global já ativo.
- Lockout progressivo no login (5 falhas/15min → bloqueio por 15min) já ativo.
- Considere limites adicionais por usuário autenticado para criação de pedidos.

## 9) Sanitização e Validações
- Sanitização básica aplicada em rotas de Eventos (descrições/texto).
- Validações de modelos ativas (Mongoose).

## 10) Checklist Final
- [ ] `NODE_ENV=production`
- [ ] HTTPS e HSTS (na borda)
- [ ] `.env` via secrets: JWT, Mongo, Mercado Pago, URLs, Sentry
- [ ] CORS: `FRONTEND_URL`/`DASHBOARD_URL` corretos
- [ ] Sentry configurado (opcional)
- [ ] Webhook MP apontando para produção + (opcional) `MP_WEBHOOK_SECRET`
- [ ] CDN para `/uploads` (recomendado) + cache/ratelimit no edge
- [ ] Backups automáticos no Atlas
- [ ] Logs estruturados e monitoramento básico

> Dica: após o deploy, valide Health (`/health`), Auth, criação de pedido, PIX, webhook e listagens.


