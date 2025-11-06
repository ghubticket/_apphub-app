# 📱 Arquitetura do Leitor de QR Code - Análise e Recomendação

> **Alinhado com:** `PREMISSAS.md` e `ARCHITECTURE.md`

## 🎯 Cenário do Usuário

- **Evento**: 1500 pessoas
- **Duração**: 10h da noite até 3h da manhã (5 horas)
- **Dispositivos**: 5 tablets/celulares (1 por portão) validando simultaneamente
- **Taxa estimada**: ~300 validações/hora = ~5 validações/minuto por dispositivo
- **Requisito crítico**: Funcionar mesmo se servidor cair (sistema offline - fase futura)

## 🤔 Pergunta: Dashboard ou App Separado?

### ❌ **NÃO recomendo dentro do Dashboard**

#### Problemas do Dashboard (Next.js):

1. **Performance**
   - Next.js é pesado (SSR, hydration, bundle grande)
   - Carrega todo o framework MUI, componentes, etc.
   - Não otimizado para operações rápidas e frequentes
   - Cada validação recarrega componentes desnecessários

2. **Escalabilidade**
   - 5 dispositivos fazendo requisições frequentes
   - Dashboard pode ficar lento para outros usuários (admins)
   - Compartilha recursos com outras funcionalidades

3. **UX (Experiência do Usuário)**
   - Interface pesada para uma operação simples
   - Tempo de carregamento maior
   - Não otimizado para mobile (validação rápida)

4. **Concorrência**
   - Dashboard pode travar se muitos validadores usarem
   - Interfere com operações administrativas
   - Não é feito para operações em tempo real

5. **Offline**
   - Dashboard não funciona offline
   - Em eventos, internet pode cair
   - Sem cache local

### ✅ **RECOMENDO App Separado (PWA)**

#### Vantagens do App Separado:

1. **Performance**
   - App leve e rápido
   - Bundle pequeno (só o necessário)
   - Carregamento instantâneo
   - Otimizado para validação rápida

2. **Escalabilidade**
   - Não interfere no dashboard
   - Cada dispositivo é independente
   - Backend aguenta facilmente 5-10 dispositivos simultâneos

3. **UX Otimizada**
   - Interface minimalista
   - Feedback visual imediato (verde/vermelho)
   - Som de confirmação
   - Tela cheia para melhor visualização

4. **Offline (PWA)**
   - Service Worker para cache
   - Funciona mesmo sem internet (validação em lote)
   - Sincroniza quando voltar online

5. **Mobile-First**
   - Otimizado para celular/tablet
   - Câmera nativa
   - Vibração para feedback
   - Modo escuro/claro

6. **Isolamento**
   - Dashboard continua leve para admins
   - Validação não afeta outras operações
   - Fácil de escalar (adicionar mais dispositivos)

## 🏗️ Arquitetura Recomendada

### Fase MVP (Atual)
```
┌─────────────────┐
│   Dashboard     │  ← Admin (gerenciamento)
│   (Next.js)     │
└─────────────────┘
        │
        │ (API compartilhada)
        │
        ▼
┌─────────────────┐
│   Backend API   │  ← Endpoints de validação
│   (Express)     │     POST /api/tickets/scan
│                 │     POST /api/tickets/code/:code/validate
└─────────────────┘
        │
        │ (REST API)
        │
        ▼
┌─────────────────┐
│  App Validador  │  ← 5 dispositivos
│     (PWA)       │     (leve, rápido)
│                 │     Modo: ONLINE
└─────────────────┘
```

### Fase Futura (Offline - conforme ARCHITECTURE.md)
```
┌─────────────────┐
│   Backend API   │  ← Gera snapshot 2h antes
│   (Express)     │     (1500 tickets em JSON)
└─────────────────┘
        │
        │ Upload para S3/R2/Drive
        │
        ▼
┌─────────────────┐
│  App Validador  │  ← 5 tablets
│     (PWA)       │     Modo: HYBRID
│                 │     ├── Online (preferencial)
│                 │     └── Offline (fallback)
│                 │
│  Cache Local:   │
│  • IndexedDB    │     (snapshot completo)
│  • P2P Sync     │     (WiFi local entre tablets)
└─────────────────┘
```

**Performance Esperada (ARCHITECTURE.md):**
- Online: ~170-650ms por validação
- Offline: ~15-35ms por validação (5x-20x mais rápido!)

## 📱 Funcionalidades do App Validador

### Tela Principal (conforme PREMISSAS.md)
- Scanner de QR Code (câmera)
- Feedback visual:
  - ✅ **Verde**: "Entrada liberada! Nome - Tipo" (conforme PREMISSAS.md)
  - ❌ **Vermelho**: "Já usado às 20:30" (conforme PREMISSAS.md)
  - ⚠️ **Amarelo**: "QR Code inválido" (conforme PREMISSAS.md)
- Som de confirmação
- Vibração

### Informações Exibidas
- Nome do evento
- Nome do portador
- Tipo de ingresso
- Status (Válido/Já usado/Inválido)
- Data/hora da validação
- **Quem passou primeiro** (se já usado - prevenção de burla)

### Funcionalidades Adicionais
- Histórico de validações (últimas 50)
- Busca manual por código ou CPF (conforme PREMISSAS.md: "validar manualmente pelo CPF")
- Estatísticas do evento (opcional)
- Modo offline (fase futura - conforme ARCHITECTURE.md)

### Validações Realizadas (conforme PREMISSAS.md)
1. ✅ Hash do QR Code (anti-fraude)
2. ✅ Se já foi usado
3. ✅ Se é do evento correto
4. ✅ Status do pagamento (deve estar pago)

## 🔧 Implementação Técnica

### Stack Recomendado

**Opção 1: React PWA (Recomendado - alinhado com ARCHITECTURE.md)**
- React + Vite
- PWA (Service Worker) - conforme ARCHITECTURE.md
- Camera API: `html5-qrcode` - conforme ARCHITECTURE.md
- IndexedDB: `Dexie.js` - para cache offline (fase futura)
- Zustand/Context para estado
- Axios para API

**Opção 2: Next.js PWA (Alternativa)**
- Next.js standalone
- next-pwa
- Mais pesado, mas reutiliza código

**Opção 3: React Native (Futuro)**
- App nativo
- Melhor performance
- Acesso completo à câmera

**Tecnologias para Fase Offline (conforme ARCHITECTURE.md):**
- IndexedDB: Dexie.js (cache local)
- P2P Sync: BroadcastChannel (sincronização WiFi local)
- PWA: Service Worker (app offline)
- Camera: html5-qrcode (scanner QR Code)

### Estrutura de Pastas Sugerida

```
qr-scanner-app/
├── src/
│   ├── components/
│   │   ├── QRScanner.tsx      # Scanner principal
│   │   ├── ValidationResult.tsx # Feedback visual
│   │   └── HistoryList.tsx     # Histórico
│   ├── services/
│   │   ├── api.ts             # Cliente API
│   │   └── cache.ts           # Cache offline
│   ├── hooks/
│   │   ├── useQRScanner.ts    # Hook do scanner
│   │   └── useValidation.ts   # Hook de validação
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service Worker
└── package.json
```

## 📊 Performance Esperada

### Com App Separado:
- **Tempo de validação**: < 500ms
- **Tempo de carregamento**: < 1s
- **Uso de memória**: ~50MB
- **Tamanho do bundle**: ~500KB (gzipped)

### Com Dashboard:
- **Tempo de validação**: 2-5s
- **Tempo de carregamento**: 3-8s
- **Uso de memória**: ~200MB
- **Tamanho do bundle**: ~2MB (gzipped)

## 🚀 Plano de Implementação

### Fase 1: MVP (1-2 semanas) - ONLINE
- [ ] Criar app PWA básico
- [ ] Integrar scanner de QR (`html5-qrcode`)
- [ ] Conectar com API de validação existente
  - `POST /api/tickets/scan` (ler QR seguro)
  - `POST /api/tickets/code/:code/validate` (validar)
- [ ] Feedback visual (verde/vermelho/amarelo conforme PREMISSAS.md)
- [ ] Busca manual por código/CPF
- [ ] Histórico de validações
- [ ] Testes com 1-2 dispositivos

### Fase 2: Melhorias (1 semana)
- [ ] Estatísticas do evento
- [ ] Melhorias de UX
- [ ] Testes com 5 dispositivos simultâneos
- [ ] Otimizações de performance

### Fase 3: Produção (1 semana)
- [ ] Testes em evento real
- [ ] Deploy e distribuição
- [ ] Documentação para validadores

### Fase 4: Sistema Offline (Futuro - conforme ARCHITECTURE.md)
- [ ] Geração de snapshot no backend
- [ ] Download de snapshot no app
- [ ] Cache local (IndexedDB com Dexie.js)
- [ ] Modo hybrid (online + offline fallback)
- [ ] Sincronização P2P entre tablets (WiFi local)
- [ ] Modo 100% offline
- [ ] Estimativa: +2-4 semanas após MVP

## 💡 Recomendação Final

**Criar um App Separado (PWA)** - **CONFORME PREMISSAS.md e ARCHITECTURE.md** ✅

### Por que App Separado?

1. ✅ **Alinhado com PREMISSAS.md**: "Acessa app de leitura (PWA)"
2. ✅ **Melhor performance**: 15-35ms offline vs 170-650ms online (ARCHITECTURE.md)
3. ✅ **Não interfere** no dashboard administrativo
4. ✅ **Escalável**: fácil adicionar mais dispositivos (5 tablets conforme ARCHITECTURE.md)
5. ✅ **Offline**: funciona mesmo sem internet (fase futura)
6. ✅ **UX otimizada**: feito para validação rápida
7. ✅ **Mobile-first**: otimizado para celular/tablet

### Divisão de Responsabilidades

**Dashboard (Next.js) - Admin:**
- Gerenciamento administrativo
- Relatórios e estatísticas
- Configurações
- Visualização de dados
- **NÃO deve validar ingressos** (conforme código atual: apenas role QRCODE)

**App Validador (PWA) - Portão:**
- Validação de ingressos (única função)
- Operação rápida e eficiente
- Múltiplos dispositivos simultâneos (5 tablets)
- Modo offline (fase futura)
- Sincronização P2P (fase futura)

### Endpoints Backend Já Prontos ✅

- `POST /api/tickets/scan` - Ler QR seguro (AES+HMAC)
- `POST /api/tickets/code/:code/validate` - Validar ingresso
- `GET /api/tickets/code/:code` - Buscar ingresso por código
- Proteção anti-replay (QrNonce)
- Detecção de burla (identificação de quem passou primeiro)
- Rate limiting configurado

## 📝 Próximos Passos

1. Criar estrutura do app PWA
2. Implementar scanner básico
3. Integrar com API existente
4. Testar com dispositivos reais
5. Adicionar funcionalidades offline

---

**Conclusão**: App separado é a melhor escolha para este cenário! 🎯

