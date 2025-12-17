# 📐 Layout Final - Pedido Parcelado

## ✅ SOLUÇÃO FINAL - 1 Box Único

### Layout Completo

```
┌─────────────────────────────────────────────────────────┐
│ PEDIDO PARCELADO #5678                                  │
│ TESTE EVENTO                    AGUARDANDO ENTRADA ●    │
│ Criado em 17 de dez. de 2025                           │
│                                                          │
│ [VER DETALHES ▼]                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━ 0% (0/5 pagas)                  │
│                                                          │
│ ⏰ Pague a entrada até o vencimento para confirmar      │
│                                                          │
│ 🎯 PAGAMENTO PIX DA ENTRADA                             │ ← Box de PIX separado
│ ⏰ Você tem: 28min 34s para pagar                       │
│ ┌───────────────────────────────────────────────────┐  │
│ │           [QR Code Image 200x200]                 │  │
│ └───────────────────────────────────────────────────┘  │
│ Código PIX (Copiar e Colar)                            │
│ [0002821265580...] [COPIAR]                            │
│                                                          │
│ Parcelas (5)                                            │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Entrada     ✅ Paga                             │    │ ← Linha simples
│ │ R$ 35,00 • Vencimento: 17 dez. 2025            │    │
│ └─────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Parcela 1/4     📅 Pendente     [Gerar PIX]    │    │ ← Linha simples
│ │ R$ 35,00 • Vencimento: 20 jan. 2025            │    │
│ └─────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Parcela 2/4     📅 Pendente                     │    │
│ │ R$ 35,00 • Vencimento: 20 fev. 2025            │    │
│ └─────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Parcela 3/4     📅 Pendente                     │    │
│ │ R$ 35,00 • Vencimento: 20 mar. 2025            │    │
│ └─────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Parcela 4/4     📅 Pendente                     │    │
│ │ R$ 35,00 • Vencimento: 20 abr. 2025            │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Estrutura do Box

### 1 Box Principal Contém:
1. ✅ **Header** - Título, status, botão expandir
2. ✅ **Barra de progresso** - Visual do pagamento
3. ✅ **Alerta contextual** - Mensagem importante
4. ✅ **Box de PIX** - Separado, só quando necessário
5. ✅ **Lista de parcelas** - Linhas simples e limpas

## 📋 Seções do Box

### Seção 1: Header
```
PEDIDO PARCELADO #5678
TESTE EVENTO                    AGUARDANDO ENTRADA ●
Criado em 17 de dez. de 2025
[VER DETALHES]
```

### Seção 2: Progresso
```
━━━━━━━━━━━━━━━━━━━━━ 20% (1/5 pagas)
```

### Seção 3: Alerta
```
⏰ Pague a entrada até o vencimento para confirmar
```

### Seção 4: PIX da Entrada (se necessário)
```
🎯 PAGAMENTO PIX DA ENTRADA
⏰ Você tem: 28min 34s
[QR Code]
[Código] [COPIAR]
```

### Seção 5: Lista de Parcelas (simplificada)
```
Parcelas (5)

Entrada         ✅ Paga
R$ 35,00 • Vencimento: 17 dez.

Parcela 1/4     📅 Pendente     [Gerar PIX]
R$ 35,00 • Vencimento: 20 jan.

Parcela 2/4     📅 Pendente
R$ 35,00 • Vencimento: 20 fev.
```

## 🎨 Design Clean

- ✅ **1 box principal** por pedido parcelado
- ✅ **PIX em seção separada** (não repetido)
- ✅ **Parcelas em linhas simples** (não cards grandes)
- ✅ **Visual limpo e organizado**
- ✅ **Fácil de entender de relance**

---

**Layout otimizado para clareza e usabilidade! ✨**
