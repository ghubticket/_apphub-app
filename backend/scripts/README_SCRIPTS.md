# 🛠️ Scripts Utilitários - Backend

## 📋 Scripts Disponíveis

### 1. `payAllParcels.ts` - Pagar Todas as Parcelas

Script para pagar automaticamente todas as parcelas de um pedido parcelado e gerar os ingressos.

#### Uso:

**Se estiver na raiz do projeto:**
```bash
# Com ID específico:
npx ts-node backend/scripts/payAllParcels.ts <parcelledOrderId>

# Sem ID (pega qualquer pedido ativo automaticamente):
npx ts-node backend/scripts/payAllParcels.ts
```

**Se estiver no diretório `backend`:**
```bash
# Com ID específico:
npx ts-node scripts/payAllParcels.ts <parcelledOrderId>

# Sem ID (pega qualquer pedido ativo automaticamente):
npx ts-node scripts/payAllParcels.ts
```

#### Exemplos:
```bash
# Com ID específico:
npx ts-node scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0

# Sem ID (modo teste - pega qualquer pedido):
npx ts-node scripts/payAllParcels.ts
```

#### O Que Faz:
1. ✅ Busca o pedido parcelado (por ID ou automaticamente)
2. ✅ Busca todas as parcelas
3. ✅ Marca todas como pagas
4. ✅ Atualiza status do pedido para `completed`
5. ✅ Gera QR codes dos ingressos
6. ✅ Ativa o pedido vinculado

**Nota:** Se não informar um ID, o script busca automaticamente o primeiro pedido parcelado com status `active` ou `pending`. Se não encontrar, busca qualquer pedido não completado. Perfeito para testes! 🧪

#### Output Esperado:
```
🔌 Conectando ao MongoDB...
✅ Conectado ao MongoDB

🔍 Buscando pedido parcelado: 6942c08ffdf39be7c0950eb0
✅ Pedido encontrado: Teste Evento
   Status atual: active
   Total de parcelas: 6

📦 Encontradas 6 parcelas:

   💳 Pagando parcela 0 (R$ 17.5)...
   ✅ Parcela 0 paga com sucesso!
   💳 Pagando parcela 1 (R$ 17.5)...
   ✅ Parcela 1 paga com sucesso!
   ... (todas as parcelas)

✅ Total de parcelas pagas: 6/6

🎉 Todas as parcelas pagas! Atualizando status do pedido...

✅ Status do pedido atualizado para: completed

🎟️ Buscando tickets associados...
✅ Order vinculado encontrado: 6942c090fdf39be7c0950ebf
📋 Encontrados 1 tickets

   🎨 Gerando QR Code para ticket TKT-ABC123...
   ✅ QR Code gerado: TKT-ABC123

✅ Order vinculado atualizado para: paid
✅ Todos os 1 ingressos foram gerados!

════════════════════════════════════════════════════════════
🎉 PEDIDO COMPLETAMENTE PAGO E ATIVADO!
════════════════════════════════════════════════════════════

📊 Resumo:
   Pedido ID: 6942c08ffdf39be7c0950eb0
   Status: completed
   Parcelas pagas: 6/6
   Ingressos gerados: 1

✨ Tudo pronto! Usuário pode ver os ingressos no dashboard.

👋 Desconectado do MongoDB
```

---

### 2. `mark-first-parcel-as-paid.ts` - Pagar Apenas a Parcela de Entrada

Script para marcar apenas a primeira parcela (entrada) como paga, permitindo visualizar as demais parcelas no frontend.

#### Uso:

**Se estiver na raiz do projeto:**
```bash
# Com ID específico:
npx ts-node backend/scripts/mark-first-parcel-as-paid.ts <parcelledOrderId>

# Sem ID (paga entrada de TODOS os pedidos com pending_entry):
npx ts-node backend/scripts/mark-first-parcel-as-paid.ts
```

**Se estiver no diretório `backend`:**
```bash
# Com ID específico:
npx ts-node scripts/mark-first-parcel-as-paid.ts <parcelledOrderId>

# Sem ID (paga entrada de TODOS os pedidos com pending_entry):
npx ts-node scripts/mark-first-parcel-as-paid.ts
```

#### Exemplos:
```bash
# Com ID específico:
npx ts-node scripts/mark-first-parcel-as-paid.ts 6943f2b4ab6d2f10d0cc8686

# Sem ID (modo teste - paga TODOS os pedidos com entrada não paga):
npx ts-node scripts/mark-first-parcel-as-paid.ts
```

#### O Que Faz:
1. ✅ Busca o(s) pedido(s) parcelado(s) (por ID específico ou TODOS com `pending_entry`)
2. ✅ Encontra a parcela de entrada (sequence === 0) de cada pedido
3. ✅ Marca a entrada como paga (apenas se ainda não estiver paga)
4. ✅ Atualiza status do pedido de `pending_entry` para `active`
5. ✅ Permite visualizar as demais parcelas no frontend

**Nota:** 
- Se não passar ID, o script processa **TODOS** os pedidos com entrada não paga
- Este script é útil para testar o fluxo de parcelas no frontend
- Após pagar a entrada, o pedido muda para `active` e as demais parcelas ficam visíveis

#### Output Esperado:
```
🔌 Conectando ao MongoDB...
✅ Conectado ao MongoDB

🔍 Nenhum ID informado. Buscando TODOS os pedidos parcelados com entrada não paga...

✅ Encontrados 2 pedido(s) com entrada não paga:

   - ID: 6943f2b4ab6d2f10d0cc8686 (Criado em: 18/12/2025 12:25:24)
   - ID: 6943f2b4ab6d2f10d0cc8687 (Criado em: 18/12/2025 11:15:10)

📦 Processando pedido: 6943f2b4ab6d2f10d0cc8686
   💳 Marcando entrada como paga...
      Parcela ID: 6943f2b4ab6d2f10d0cc8688
      Valor: R$ 17.50
      Status atual: pending
   ✅ Entrada marcada como paga
   ✅ Status do pedido atualizado para: active

📦 Processando pedido: 6943f2b4ab6d2f10d0cc8687
   💳 Marcando entrada como paga...
      Parcela ID: 6943f2b4ab6d2f10d0cc8689
      Valor: R$ 25.00
      Status atual: pending
   ✅ Entrada marcada como paga
   ✅ Status do pedido atualizado para: active

════════════════════════════════════════════════════════════
📊 Resumo:
   ✅ Atualizadas: 2
   ❌ Erros: 0
   📦 Total processado: 2
════════════════════════════════════════════════════════════

✨ Pronto! Agora você pode ver as demais parcelas no frontend.
   2 pedido(s) mudaram de "pending_entry" para "active".

👋 Desconectado do MongoDB
```

---

## 🚀 Como Usar

### Passo 1: Executar Script

**Opção 1 - Modo Automático (Recomendado para testes):**
```bash
cd backend
npx ts-node scripts/payAllParcels.ts
```
O script vai buscar automaticamente um pedido parcelado ativo!

**Opção 2 - Com ID Específico:**
```bash
cd backend
npx ts-node scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0
```

**Para obter um ID específico:**
No dashboard, copie o ID do pedido parcelado ou use a API:
```bash
# Listar pedidos parcelados de um usuário
curl http://localhost:3443/api/parcelled-orders \
  -H "Authorization: Bearer <token>"
```

### Passo 3: Verificar no Dashboard

1. Acesse o dashboard do usuário
2. Veja o pedido parcelado com status "CONCLUÍDO"
3. Clique em "Visualizar Ingressos"
4. QR codes estarão disponíveis!

---

## ⚠️ Importante

### Ambiente
- ✅ Use em **desenvolvimento** para testes
- ⚠️ Cuidado em **produção** (pagamentos reais)

### Validações
- ✅ Verifica se pedido existe
- ✅ Verifica parcelas já pagas (não duplica)
- ✅ Gera QR codes automaticamente
- ✅ Atualiza todos os status necessários

### Rollback
Se precisar reverter:
```bash
# Resetar status das parcelas manualmente no MongoDB
db.parcels.updateMany(
    { parcelledOrder: ObjectId("6942c08ffdf39be7c0950eb0") },
    { $set: { status: "pending", paidAt: null } }
)

# Resetar status do pedido
db.parcelledorders.updateOne(
    { _id: ObjectId("6942c08ffdf39be7c0950eb0") },
    { $set: { status: "active" } }
)
```

---

## 🎯 Casos de Uso

### 1. Testes de QA
```bash
# Criar pedido parcelado
# Pagar todas as parcelas automaticamente (sem precisar do ID!)
npx ts-node scripts/payAllParcels.ts
# Testar visualização de ingressos
```

### 2. Correção de Bugs
```bash
# Se um pedido ficou travado
# Forçar pagamento de todas as parcelas (pega automaticamente)
npx ts-node scripts/payAllParcels.ts
# Ou com ID específico:
npx ts-node scripts/payAllParcels.ts <id>
```

### 3. Demo para Clientes
```bash
# Mostrar fluxo completo rapidamente (sem precisar do ID!)
npx ts-node scripts/payAllParcels.ts
```

---

**Script pronto para uso! 🚀**
