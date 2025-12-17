# 🛠️ Scripts Utilitários - Backend

## 📋 Scripts Disponíveis

### 1. `payAllParcels.ts` - Pagar Todas as Parcelas

Script para pagar automaticamente todas as parcelas de um pedido parcelado e gerar os ingressos.

#### Uso:
```bash
npx ts-node backend/scripts/payAllParcels.ts <parcelledOrderId>
```

#### Exemplo:
```bash
npx ts-node backend/scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0
```

#### O Que Faz:
1. ✅ Busca o pedido parcelado
2. ✅ Busca todas as parcelas
3. ✅ Marca todas como pagas
4. ✅ Atualiza status do pedido para `completed`
5. ✅ Gera QR codes dos ingressos
6. ✅ Ativa o pedido vinculado

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

## 🚀 Como Usar

### Passo 1: Obter ID do Pedido Parcelado

No dashboard, copie o ID do pedido parcelado ou use a API:

```bash
# Listar pedidos parcelados de um usuário
curl http://localhost:3443/api/parcelled-orders \
  -H "Authorization: Bearer <token>"
```

### Passo 2: Executar Script

```bash
cd backend
npx ts-node scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0
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
# Pagar todas as parcelas automaticamente
npx ts-node scripts/payAllParcels.ts <id>
# Testar visualização de ingressos
```

### 2. Correção de Bugs
```bash
# Se um pedido ficou travado
# Forçar pagamento de todas as parcelas
npx ts-node scripts/payAllParcels.ts <id>
```

### 3. Demo para Clientes
```bash
# Mostrar fluxo completo rapidamente
npx ts-node scripts/payAllParcels.ts <id>
```

---

**Script pronto para uso! 🚀**
