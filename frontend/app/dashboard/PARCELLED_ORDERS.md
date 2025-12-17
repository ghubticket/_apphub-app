# 📦 Sistema de Pedidos Parcelados (PIX Parcelado)

## 🎯 Visão Geral

Sistema completo de pagamento PIX parcelado integrado na aba **"Meus Pedidos"**, permitindo que usuários paguem ingressos em parcelas via PIX.

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
dashboard/
├── types/
│   └── parcelled.ts              ⭐ Tipos de parcelamento
│
├── config/
│   └── parcelled.ts              ⭐ Configurações de status
│
├── utils/
│   └── parcelHelpers.ts          ⭐ Helpers e validações
│
├── hooks/
│   └── useParcelledOrdersPolling.ts  ⭐ Polling de parcelas
│
└── components/
    └── parcelled/                ⭐ Componentes de parcelamento
        ├── ParcelledOrderCard.tsx
        ├── ParcelStatusBadge.tsx
        └── ParcelProgressBar.tsx
```

## 📋 Fluxos de Pagamento

### 1. Fluxo Completo - Pagamento com Sucesso ✅

```
1. Usuário compra via PIX parcelado
2. Sistema cria pedido parcelado (status: pending_entry)
3. Gera PIX da entrada (30min para pagar)
   ├─ Entrada paga ✅
   │  ├─ Status muda para: active
   │  ├─ Parcelas ficam disponíveis
   │  ├─ Modal de sucesso aparece 🎉
   │  └─ Polling detecta em tempo real
   │
   └─ Entrada NÃO paga ❌
      └─ Pedido é cancelado automaticamente (30min)

4. Usuário paga parcelas subsequentes
   ├─ Cada parcela paga:
   │  ├─ Modal de sucesso "Parcela X paga" 🎉
   │  ├─ Barra de progresso atualiza
   │  └─ Vibração no dispositivo
   │
   └─ Última parcela paga:
      ├─ Status: completed
      ├─ QR codes dos ingressos são gerados ✨
      └─ Botão "Visualizar Ingressos" aparece
```

### 2. Fluxo com Atraso - Parcelas não Pagas ⚠️

```
1. Usuário paga entrada ✅
2. Não paga 1 parcela
   └─ Alerta amarelo aparece ⚠️

3. Não paga 2+ parcelas
   └─ Pedido é CANCELADO automaticamente 🚨
      ├─ Status: cancelled
      ├─ Ingressos NÃO são liberados
      └─ Alerta vermelho "Pedido cancelado"
```

## 🎨 Estados e Status

### Estados do Pedido Parcelado

| Status | Descrição | Badge Color | Ações Disponíveis |
|--------|-----------|-------------|-------------------|
| `pending_entry` | Aguardando entrada | 🟡 Amber | Gerar PIX da entrada |
| `active` | Parcelas em andamento | 🔵 Sky | Gerar PIX de parcelas |
| `completed` | Tudo pago! | 🟢 Green | Ver ingressos |
| `cancelled` | Cancelado | 🔴 Red | Nenhuma |

### Estados das Parcelas Individuais

| Status | Descrição | Badge | Ações |
|--------|-----------|-------|-------|
| `pending` | Aguardando vencimento | 📅 Gray | Gerar PIX |
| `payment_generated` | PIX gerado | 💳 Blue | Copiar código |
| `paid` | Paga | ✅ Green | - |
| `overdue` | Em atraso | ⚠️ Red | Gerar PIX |
| `cancelled` | Cancelada | ❌ Gray | - |

## 🔔 Notificações em Tempo Real

O sistema usa **polling inteligente** para detectar pagamentos:

```typescript
// Intervalo de 5 segundos
const POLLING_INTERVAL = 5000ms;

// Detecta:
✅ Entrada paga → Modal + Vibração
✅ Parcela paga → Modal + Vibração
✅ Última parcela → Modal + QR codes
```

### Callbacks

```typescript
// Quando qualquer parcela é paga
onParcelPaid: (parcelledOrderId, parcelId, sequence) => {
    // sequence 0 = entrada
    // sequence 1+ = parcelas

    // Mostra modal de sucesso
    // Vibra dispositivo
    // Atualiza lista
}
```

## 🎯 Componentes

### 1. ParcelledOrderCard

Card principal que mostra o pedido parcelado.

**Props:**
```typescript
{
    order: ParcelledOrderWithParcels;
    currencyFormatter: Intl.NumberFormat;
    formatDate: (date?: string) => string;
    onPixCodeCopy: (key: string, code: string) => Promise<void>;
    pixCodeCopied: Record<string, boolean>;
    onViewTickets?: (orderId: string) => void;
}
```

**Features:**
- ✅ Barra de progresso visual
- ✅ Timer de expiração do PIX
- ✅ Geração de PIX por parcela
- ✅ Alertas contextuais
- ✅ Lista de parcelas expandível

### 2. ParcelProgressBar

Barra de progresso visual das parcelas pagas.

```tsx
<ParcelProgressBar parcels={parcels} />
// Mostra: 3 / 5 parcelas pagas (60%)
```

### 3. ParcelStatusBadge

Badge colorido para status da parcela.

```tsx
<ParcelStatusBadge status="paid" size="sm" />
// Mostra: ✅ Paga
```

## 🛠️ Utils e Helpers

### Principais Funções

```typescript
// Verificar se parcela está atrasada
isParcelOverdue(parcel: ParcelSummary): boolean

// Contar parcelas atrasadas
countOverdueParcels(parcels: ParcelSummary[]): number

// Verificar se deve cancelar (2+ atrasadas)
shouldCancelOrder(parcels: ParcelSummary[]): boolean

// Encontrar próxima parcela a vencer
getNextParcel(parcels: ParcelSummary[]): ParcelSummary | null

// Calcular progresso (%)
calculatePaymentProgress(parcels: ParcelSummary[]): number

// Verificar se todas pagas
areAllParcelsPaid(parcels: ParcelSummary[]): boolean

// Obter mensagem de alerta
getOrderAlertMessage(order: ParcelledOrderWithParcels): string | null
```

## 📊 Integração com OrdersList

Os pedidos parcelados são exibidos **junto com pedidos normais**:

```typescript
// Combina os dois tipos
const allItems = [
    ...orders.map(o => ({ type: 'normal', data: o })),
    ...parcelledOrders.map(p => ({ type: 'parcelled', data: p }))
];

// Ordena por data (mais recente primeiro)
allItems.sort((a, b) => compareByDate(a, b));

// Renderiza o componente correto
{allItems.map(item => (
    item.type === 'parcelled' 
        ? <ParcelledOrderCard {...} />
        : <NormalOrderCard {...} />
))}
```

## 🔄 API Endpoints Utilizados

```bash
# Buscar pedidos parcelados + parcelas
GET /parcelled-orders
Response: {
    orders: ParcelledOrderSummary[],
    parcelsByOrder: Record<string, ParcelSummary[]>
}

# Gerar PIX de uma parcela
POST /parcelled-orders/:orderId/parcels/:parcelId/generate-payment
Response: {
    pixPayment: {
        qrCode: string,
        qrCodeBase64: string,
        expiresAt: string
    }
}

# Buscar status do pagamento
GET /payments/:paymentId/status
Response: {
    status: string,
    expiresAt: string
}
```

## 🎨 UI/UX Features

### Alertas Contextuais

```tsx
// Entrada pendente
⏰ Pague a entrada até o vencimento para confirmar seu pedido

// Entrada expirando
⚠️ A entrada expira em breve! Pague agora para não perder seu pedido

// Parcelas atrasadas
⚠️ Parcela(s) em atraso! Pague para não perder seus ingressos

// Prestes a cancelar
🚨 ATENÇÃO! 2 ou mais parcelas atrasadas cancelam o pedido automaticamente

// Completo
🎉 Parabéns! Todas as parcelas pagas. Seus ingressos estão disponíveis!
```

### Cores dos Alertas

| Situação | Cor | Classe |
|----------|-----|--------|
| Completo | Verde | `emerald` |
| Informação | Azul | `sky` |
| Atenção | Amarelo | `amber` |
| Crítico | Vermelho | `rose` |

## 🧪 Testes Sugeridos

### Cenários de Teste

1. **✅ Fluxo Feliz**
   - [ ] Criar pedido parcelado
   - [ ] Pagar entrada
   - [ ] Verificar modal de sucesso
   - [ ] Pagar todas as parcelas
   - [ ] Verificar QR codes gerados

2. **⚠️ Atrasos**
   - [ ] Não pagar entrada até expirar
   - [ ] Verificar cancelamento automático
   - [ ] Pagar entrada + 1 parcela atrasada
   - [ ] Verificar alerta amarelo
   - [ ] Deixar 2+ parcelas atrasarem
   - [ ] Verificar cancelamento

3. **🔄 Polling**
   - [ ] Pagar parcela em outra aba
   - [ ] Verificar detecção automática
   - [ ] Confirmar vibração do dispositivo
   - [ ] Validar modal de sucesso

4. **📱 Responsividade**
   - [ ] Testar em mobile
   - [ ] Testar em tablet
   - [ ] Testar em desktop
   - [ ] Verificar QR codes apenas no mobile

## 📱 Exemplo Visual

### Card de Pedido Parcelado Expandido

```
┌───────────────────────────────────────────────┐
│ 📦 Pedido Parcelado #1234 - Festival ABC     │
│ ● Ativo                                        │
│ [Ver detalhes ▼]                              │
├───────────────────────────────────────────────┤
│                                               │
│ ━━━━━━━━━━━━━━━━━━━━━ 60% (3/5 pagas)       │
│                                               │
│ ⚠️ Parcela 4 vence em 3 dias                 │
│                                               │
│ Parcelas (5)                                  │
│ ┌─────────────────────────────────────────┐  │
│ │ ✅ Entrada - R$ 100,00 - Paga           │  │
│ ├─────────────────────────────────────────┤  │
│ │ ✅ Parcela 1/4 - R$ 100,00 - Paga       │  │
│ ├─────────────────────────────────────────┤  │
│ │ ✅ Parcela 2/4 - R$ 100,00 - Paga       │  │
│ ├─────────────────────────────────────────┤  │
│ │ 💳 Parcela 3/4 - R$ 100,00 - PIX Gerado │  │
│ │    [Gerar PIX]                           │  │
│ ├─────────────────────────────────────────┤  │
│ │ 📅 Parcela 4/4 - R$ 100,00 - Pendente   │  │
│ └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

## 🚀 Performance

### Otimizações Implementadas

- ✅ **useMemo** para cálculos pesados
- ✅ **useCallback** para funções de event handler
- ✅ **Polling inteligente** apenas quando aba ativa
- ✅ **Lazy loading** de componentes
- ✅ **Componentes isolados** para rerenderização eficiente

### Métricas Esperadas

| Métrica | Valor |
|---------|-------|
| Tamanho do componente | ~500 linhas |
| Rerenderizações | Mínimas (otimizado) |
| Polling overhead | ~5KB/5s |
| First contentful paint | < 1s |

## 📚 Recursos

- [Documentação Principal](./README.md)
- [Exemplos de Uso](./EXAMPLES.md)
- [Changelog](./CHANGELOG.md)

---

**Versão**: 2.1.0  
**Data**: Dezembro 2024  
**Status**: ✅ IMPLEMENTADO E TESTADO
