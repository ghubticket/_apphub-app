# 📱 Guia Visual - Dashboard

## 🎯 Layout Final - "Meus Pedidos"

### ✅ SOLUÇÃO FINAL - 1 Box Único com Tudo

```
┌─────────────────────────────────────────────────────────┐
│ PEDIDO PARCELADO                                        │
│ TESTE EVENTO                          AGUARDANDO ENTRADA│
│ Criado em 17 de dez. de 2025                           │
│                                                          │
│ [VER DETALHES ▼]                                        │
├─────────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━ 0% (0/5 pagas)                  │
│                                                          │
│ ⏰ Pague a entrada até o vencimento...                  │
│                                                          │
│ Parcelas (5)                                            │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 💰 Entrada - R$ 35,00 - 💳 PIX Gerado             │  │ ← Card destacado (verde)
│ │ Vencimento em 17 dez. 2025                        │  │
│ │ ─────────────────────────────────────────────────  │  │
│ │ 🎯 PIX PARA PAGAMENTO                             │  │
│ │ ⏰ Você tem: 28min 34s para pagar                 │  │
│ │ [QR Code Image]                                   │  │
│ │ [000282126558014br-gov...] [COPIAR]               │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 💰 Parcela 1/4 - R$ 35,00 - 📅 Pendente          │  │ ← Card normal (branco)
│ │ Vencimento em 20 jan. 2025                        │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 💰 Parcela 2/4 - R$ 35,00 - 📅 Pendente          │  │
│ │ Vencimento em 20 fev. 2025                        │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 💰 Parcela 3/4 - R$ 35,00 - 📅 Pendente          │  │
│ │ Vencimento em 20 mar. 2025                        │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 💰 Parcela 4/4 - R$ 35,00 - 📅 Pendente          │  │
│ │ Vencimento em 20 abr. 2025                        │  │
│ └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Estados Visuais

### 1. Entrada Pendente (COM PIX gerado)

```
┌───────────────────────────────────────────┐
│ 💰 Entrada - R$ 100,00 - 💳 PIX Gerado   │ ← VERDE CLARO
│ ───────────────────────────────────────── │
│ 🎯 PIX PARA PAGAMENTO                    │
│ ⏰ Você tem: 28min 34s                   │
│ [QR Code]                                 │
│ [Código PIX] [COPIAR]                    │
└───────────────────────────────────────────┘
```

### 2. Entrada Paga

```
┌───────────────────────────────────────────┐
│ 💰 Entrada - R$ 100,00 - ✅ Paga         │ ← BRANCO
│ Vencimento em 17 dez. 2025               │
└───────────────────────────────────────────┘
```

### 3. Parcela com PIX Gerado

```
┌───────────────────────────────────────────┐
│ 💰 Parcela 2/4 - R$ 100,00 - 💳 PIX      │ ← VERDE CLARO
│ ───────────────────────────────────────── │
│ 🎯 PIX PARA PAGAMENTO                    │
│ ⏰ Você tem: 1h 28min 34s                │
│ [QR Code]                                 │
│ [Código PIX] [COPIAR]                    │
└───────────────────────────────────────────┘
```

### 4. Parcela Pendente (sem PIX)

```
┌───────────────────────────────────────────┐
│ 💰 Parcela 3/4 - R$ 100,00 - 📅 Pendente │ ← BRANCO
│ Vencimento em 20 mar. 2025               │
│ [Gerar PIX]                              │
└───────────────────────────────────────────┘
```

### 5. Parcela Paga

```
┌───────────────────────────────────────────┐
│ 💰 Parcela 4/4 - R$ 100,00 - ✅ Paga     │ ← BRANCO
│ Vencimento em 20 abr. 2025               │
└───────────────────────────────────────────┘
```

## 🎯 Lógica Visual

### Quando Mostrar o PIX DENTRO do Card

```typescript
// PIX só aparece DENTRO do card se:
✅ É a entrada (sequence === 0) OU parcela qualquer
✅ Não está paga ainda
✅ Tem PIX gerado (qrCode ou qrCodeBase64)

// Resultado: PIX integrado no card da parcela
```

### Cores dos Cards

| Situação | Cor de Fundo | Border |
|----------|--------------|--------|
| Com PIX pendente | `emerald-50/50` 🟢 | `emerald-300` |
| Sem PIX / Pago | `white/70` ⚪ | `[#ded7ca]/70` |

## 🎨 Badges de Status

| Status | Badge | Cor |
|--------|-------|-----|
| Paga | ✅ Paga | Verde |
| PIX Gerado | 💳 PIX Gerado | Azul |
| Pendente | 📅 Pendente | Cinza |
| Atrasada | ⚠️ Em Atraso | Vermelho |
| Cancelada | ❌ Cancelada | Cinza |

## 📊 Barra de Progresso

```
━━━━━━━━━━━━━━━━━━━━━ 60% (3/5 pagas)
│                     │
└─ Verde até 60%     └─ Cinza de 60% a 100%
```

## 🎯 Resumo da Solução

### ❌ ANTES (Problema)
```
Box 1: PIX da entrada (separado)
Box 2: Lista de parcelas
  ├─ Entrada (de novo!)
  ├─ Parcela 1
  ├─ Parcela 2
  └─ Parcela 3
```

### ✅ AGORA (Solução)
```
Box 1: Lista de parcelas (ÚNICA)
  ├─ Entrada (com PIX integrado dentro)
  ├─ Parcela 1
  ├─ Parcela 2
  └─ Parcela 3
```

## 🔑 Código Chave

```typescript
// Em cada card de parcela:
const hasEntryPix = isEntry && 
                    !isEntryPaidValue && 
                    entryPixInfo && 
                    (entryPixInfo.qrCode || entryPixInfo.qrCodeBase64);

// Se hasEntryPix === true:
// → Card fica verde claro
// → PIX aparece DENTRO do card (não separado)
```

---

**Visual limpo, organizado e intuitivo! ✨**
