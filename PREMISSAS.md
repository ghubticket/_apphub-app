# Premissas do Projeto - EventHub

> **Última atualização:** 6 de Novembro de 2025
>
> Documento com todas as premissas, decisões e diretrizes do sistema de venda de ingressos para eventos de pagode.

---

## 🎯 Visão Geral

### O Que É
Sistema completo de venda de ingressos e controle de acesso para eventos de pagode, com validação por QR Code.

### Objetivo Principal
**Eliminar taxas da Ingresse** (~25% por venda) e ter controle total sobre vendas, dados de clientes e experiência do usuário.

### ROI Esperado
```
Com Ingresse:
├── Evento 500 pessoas × R$ 50 = R$ 25.000
├── Taxa Ingresse (25%) = R$ 6.250 por evento
└── 12 eventos/ano = R$ 75.000 em taxas 💸

Com Sistema Próprio:
├── Hospedagem: ~R$ 200/mês = R$ 2.400/ano
├── Gateway (4%): ~R$ 1.000 por evento = R$ 12.000/ano
├── Infraestrutura: ~R$ 175/ano
└── Total: ~R$ 14.600/ano

ECONOMIA: ~R$ 60.000/ano ✅
ROI: 3 meses
```

---

## 📊 Contexto de Negócio

### Perfil da Empresa
- **Ramo:** Eventos de pagode
- **Frequência:** 12 eventos por ano
- **Porte:** 500 a 1500 pessoas por evento
- **Local típico:** Estacionamento do Canindé (São Paulo)
- **Equipe tech:** Em formação

### Problema Atual
- ✅ Já vende pela Ingresse
- ❌ Taxas muito altas (20-30%)
- ❌ Sem controle sobre dados dos clientes
- ❌ Sem flexibilidade para customizar experiência
- ❌ Dependência de plataforma terceira

### Solução Proposta
Sistema próprio de ponta a ponta:
- Portal de venda de ingressos
- Pagamento via Mercado Pago (Orders API: Pix e Cartão; Boleto opcional)
- QR Code seguro e único por ingresso
- App de validação para leitores
- Dashboard administrativo completo

---

## 🎨 Premissas de Produto

### Fluxo do Cliente (Comprador)
1. Acessa site público
2. Vê evento com fotos, descrição, local, data
3. Escolhe tipo de ingresso (Pista, VIP, Meia)
4. Preenche dados (nome, CPF, email, telefone)
5. Paga via Mercado Pago (Pix/Cartão/Boleto)
6. **Recebe ingresso IMEDIATAMENTE:**
   - PDF por email
   - Link para CDN
   - WhatsApp (opcional)
7. Apresenta QR Code na entrada

### Fluxo do Validador (Portão)
1. Acessa app de leitura (PWA)
2. Escaneia QR Code do cliente
3. Sistema valida:
   - Hash do QR Code (anti-fraude)
   - Se já foi usado
   - Se é do evento correto
4. Mostra resultado:
   - ✅ Verde: "Entrada liberada! Nome - Tipo"
   - ❌ Vermelho: "Já usado às 20:30"
   - ⚠️ Amarelo: "QR Code inválido"

### Fluxo Administrativo
1. Master cria evento (título, descrição, foto, local, data)
2. Configura tipos de ingresso (nome, preço, quantidade)
3. Define limites (máx. por CPF, período de venda)
4. Publica evento
5. Acompanha vendas em tempo real
6. Fecha vendas 2h antes do evento
7. Acompanha entradas durante evento
8. Analisa relatórios pós-evento

---

## 🏗️ Premissas Técnicas

### Stack Escolhida

**Backend:**
```
Node.js + TypeScript + Express
MongoDB Atlas (free tier → pago depois)
JWT para autenticação
Mercado Pago SDK (Orders API) para pagamentos
Resend para emails
Cloudinary para uploads
Deploy: Railway ou Render
```

**Frontend:**
```
Next.js 14 (App Router)
TypeScript
Tailwind CSS + Shadcn/ui
React Hook Form + Zod (validação)
Deploy: Vercel
```

**Infraestrutura:**
```
CDN: Cloudflare R2 ou S3 + CloudFront
Email: Resend (free tier: 3k/mês)
WhatsApp: Twilio (opcional)
Monitoramento: Sentry (free tier)
```

### Por Que Essas Tecnologias?

**MongoDB (NoSQL) vs PostgreSQL (SQL):**
- ✅ Mais flexível para evolução do schema
- ✅ Equipe mais familiarizada com JavaScript/JSON
- ✅ Atlas tem free tier generoso
- ✅ Performance adequada para o volume

**Next.js vs React puro:**
- ✅ SEO otimizado (importante para eventos públicos)
- ✅ Server-Side Rendering
- ✅ API Routes (pode substituir backend se precisar)
- ✅ Deploy fácil na Vercel

**Railway/Render vs AWS:**
- ✅ Mais simples de configurar
- ✅ Deploy automático via Git
- ✅ Preço previsível
- ✅ Sem surpresas na conta
- ❌ AWS: complexo demais para começar

**Mercado Pago (Orders API) vs Stripe:**
- ✅ Melhor para Brasil (Pix nativo)
- ✅ Documentação em português
- ✅ Suporte local
- ✅ Taxa competitiva (~4%)
- ❌ Stripe: precisa empresa no exterior

---

## 🧪 Testes de Carga

### Objetivo
Validar a capacidade do sistema de suportar acessos simultâneos, como:
- Picos de validação de QR Codes durante eventos.
- Picos de vendas online de ingressos em horários de alta demanda.

### Ferramentas Utilizadas
- **k6**: Para simular acessos simultâneos.
- **Artillery**: Para cenários complexos com múltiplos endpoints.
- **Sentry**: Para monitorar erros e latência durante os testes.

### Cenários Testados
1. **Validação de QR Codes**:
   - Simular 500-900 acessos simultâneos ao endpoint `/api/validate-qrcode`.
   - Métricas: tempo de resposta, taxa de erro.

2. **Venda de Ingressos**:
   - Simular 300 requisições por segundo no endpoint `/api/buy-ticket`.
   - Métricas: throughput, latência média.

3. **Sincronização Offline/Online**:
   - Simular envio de 1000 check-ins offline ao backend após reconexão.

### Resultados Esperados
- Tempo de resposta < 2s em 95% das requisições.
- Taxa de erro < 1%.
- Backend capaz de processar 1000+ requisições simultâneas com escalabilidade horizontal.

---

## 🌐 Modo Offline

### Objetivo
Garantir que o sistema funcione mesmo sem conexão com a internet, especialmente:
- Durante quedas de internet no local do evento.
- Para check-ins em dispositivos móveis (tablets/smartphones).

### Estratégia
1. **Sincronização Pré-Evento**:
   - Antes do evento, todos os dispositivos baixam a lista de ingressos válidos (CPF, tipo, status).

2. **Validação Offline**:
   - O app valida os ingressos localmente usando dados armazenados em IndexedDB ou SQLite.
   - Marca os ingressos como "usados" no armazenamento local.

3. **Sincronização Pós-Evento**:
   - Após a internet ser restaurada, os dispositivos enviam os dados de validação para o backend.
   - O backend resolve conflitos (ex.: ingressos duplicados).

### Benefícios
- **Resiliência**: O sistema continua funcionando mesmo sem conexão.
- **Facilidade de Uso**: Operadores podem validar ingressos manualmente pelo CPF, além do QR Code.
- **Conflitos Resolvidos**: Sincronização incremental garante integridade dos dados.

---

## 🔐 Segurança

> **Princípio:** Segurança em camadas (Defense in Depth)

### Dados Sensíveis
- Criptografia em trânsito (HTTPS obrigatório).
- Criptografia em repouso para dados como CPF e telefone (AES-256).
- Nunca armazenar senhas em texto plano.

### Proteção Contra Bots
- Uso de CAPTCHA em endpoints críticos (registro, reset de senha, compra).
- Rate limiting para evitar abusos em endpoints públicos.

---

**Próximos Passos:**
- Implementar os testes de carga no pipeline de CI/CD.
- Finalizar o módulo de sincronização offline.
- Validar todas as premissas de segurança com auditorias externas.