# Feature: Sistema de Códigos de Promotor/Afiliado

## 🎯 Objetivo

Permitir que promotores/afiliados tenham códigos únicos para vender ingressos de eventos, com desconto aplicado automaticamente e rastreamento de vendas por código.

---

## 📋 Histórias de Usuário

### US-1: Cadastro de Código de Promotor
**Como** um administrador  
**Eu quero** cadastrar códigos de promotores  
**Para que** eu possa associá-los a eventos e aplicar descontos nas vendas

**Critérios de Aceite:**
- [ ] Admin pode criar código único (ex: "GUILHERME123", "PROMOTER5521")
- [ ] Código deve ser único no sistema (não pode repetir)
- [ ] Nome do promotor é obrigatório
- [ ] CPF do promotor é obrigatório (validado)
- [ ] Email do promotor é obrigatório (validado)
- [ ] WhatsApp do promotor é obrigatório (validado)
- [ ] Código pode ter desconto configurado (percentual ou fixo)
- [ ] Código pode estar ativo/inativo (toggle)
- [ ] Não há limite de uso
- [ ] Não há validade (só desativar manualmente)

### US-2: Associar Código a Eventos
**Como** um administrador  
**Eu quero** associar códigos de promotores a eventos específicos  
**Para que** o desconto seja aplicado apenas nos eventos configurados

**Critérios de Aceite:**
- [ ] Admin pode associar um código a múltiplos eventos
- [ ] Admin pode associar múltiplos códigos a um evento
- [ ] Relação muitos-para-muitos (N:N)
- [ ] Ao criar evento, pode associar códigos existentes
- [ ] Pode adicionar/remover códigos de um evento depois

### US-3: Compra com Código de Promotor
**Como** um cliente  
**Eu quero** usar um código de promotor na compra  
**Para que** eu receba desconto no ingresso

**Critérios de Aceite:**
- [ ] Cliente pode inserir código no checkout/compra
- [ ] Sistema valida se código existe e está ativo
- [ ] Sistema valida se código é válido para aquele evento
- [ ] Desconto é aplicado automaticamente
- [ ] Taxa da plataforma é calculada sobre (subtotal - desconto)
- [ ] Valor final é calculado: (subtotal - desconto) + taxa
- [ ] Código é registrado no pedido para rastreamento
- [ ] Contador de uso é incrementado

### US-4: Rastreamento de Vendas por Código
**Como** um administrador  
**Eu quero** ver vendas por código de promotor  
**Para que** eu possa calcular comissões e acompanhar performance

**Critérios de Aceite:**
- [ ] Admin pode ver lista de códigos e suas estatísticas
- [ ] Mostra total de vendas por código
- [ ] Mostra valor total vendido por código
- [ ] Mostra quantidade de pedidos por código
- [ ] Mostra desconto total aplicado por código
- [ ] Mostra comissão (sobre vendas brutas - futuro)
- [ ] Filtros por evento, período, código
- [ ] Boxes de estatísticas na página de visualização

---

## 🏗️ Arquitetura Proposta

### Modelos de Dados

#### 1. PromoterCode (Código de Promotor)
```typescript
interface PromoterCode {
  _id: ObjectId
  code: string // Código único (ex: "GUILHERME123")
  name: string // Nome do promotor (obrigatório)
  cpf: string // CPF do promotor (obrigatório)
  email: string // Email de contato (obrigatório)
  whatsapp: string // WhatsApp de contato (obrigatório)
  discountType: 'percentage' | 'fixed' // Tipo de desconto
  discountValue: number // Valor do desconto (5 = 5% ou R$ 5,00)
  currentUses: number // Usos atuais (contador)
  isActive: boolean // Ativo/Desativado
  events: ObjectId[] // Array de eventos associados
  createdBy: ObjectId // Admin que criou
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

#### 2. Order (Atualização)
```typescript
interface Order {
  // ... campos existentes
  promoterCode?: string // Código usado (se houver)
  discountAmount?: number // Valor do desconto aplicado
  subtotal: number // Valor sem desconto
  platformFee: number // Taxa da plataforma (calculada sobre subtotal - desconto)
  totalAmount: number // Total final (subtotal - desconto + platformFee)
}
```

### Fluxo de Compra com Código

```
1. Cliente acessa: /evento/123?codigo=GUILHERME123
2. Sistema valida código:
   - Existe?
   - Está ativo?
   - É válido para este evento?
   - Não excedeu limite?
   - Está dentro da validade?
3. Se válido:
   - Aplica desconto no subtotal
   - Calcula taxa da plataforma sobre (subtotal - desconto)
   - Calcula total final
   - Mostra valores na tela
4. Ao confirmar compra:
   - Salva código no pedido
   - Incrementa contador de uso do código
   - Registra desconto aplicado
```

### Regras de Negócio

#### 1. Cálculo de Desconto
- **Desconto Percentual**: `desconto = subtotal * (discountValue / 100)`
- **Desconto Fixo**: `desconto = discountValue` (limitado ao subtotal)
- **Taxa da Plataforma**: Calculada sobre `(subtotal - desconto)`, não sobre o subtotal original
- **Total Final**: `(subtotal - desconto) + platformFee`
- **Comissão do Promotor**: Calculada sobre vendas brutas (subtotal original) - **Futuro**

#### 2. Validação de Código
- Código deve existir no banco
- Código deve estar `isActive = true`
- Código deve estar associado ao evento
- Não há limite de uso (sem validação de `maxUses`)
- Não há validade (sem validação de datas)

#### 3. Associação Evento-Código
- Um código pode estar associado a N eventos
- Um evento pode ter N códigos
- Ao remover código de evento, não afeta vendas já realizadas
- Ao desativar código, não afeta vendas já realizadas

---

## 🎨 Telas Necessárias

### 1. Lista de Códigos de Promotor
**Rota**: `/apps/promoters/list`
- Tabela com: Código, Nome, CPF, Email, WhatsApp, Desconto, Eventos, Usos, Status
- Botão "Novo Código"
- Filtros: Status (Ativo/Inativo), Evento, Busca por código/nome
- Ações: Editar, Desativar/Ativar (toggle)

### 2. Cadastro/Edição de Código
**Rota**: `/apps/promoters/create` ou `/apps/promoters/edit/[id]`
- Campo: Código (único, obrigatório, gerado automaticamente ou manual)
- Campo: Nome do Promotor (obrigatório)
- Campo: CPF (obrigatório, validado)
- Campo: Email (obrigatório, validado)
- Campo: WhatsApp (obrigatório, validado)
- Campo: Tipo de Desconto (Percentual/Fixo)
- Campo: Valor do Desconto
- Seletor: Eventos (múltipla seleção)
- Toggle: Ativo/Inativo
- Exibição: Contador de usos (somente leitura)

### 3. Estatísticas na Lista
**Rota**: `/apps/promoters/list` (boxes no topo)
- Card: Total de Códigos (ativos/inativos)
- Card: Total de Vendas (quantidade de pedidos)
- Card: Valor Total Vendido (bruto)
- Card: Desconto Total Aplicado
- Card: Comissão Total (futuro - sobre vendas brutas)

### 4. Integração no Checkout (Portal Público) - Futuro
- Campo para inserir código
- Botão "Aplicar Código"
- Validação em tempo real via API
- Exibição de desconto aplicado
- URL com parâmetro: `?codigo=GUILHERME123`
- Exibição de valores: Subtotal, Desconto, Taxa, Total

---

## 🔧 Endpoints da API

### Promoter Codes
```
POST   /api/promoters              - Criar código
GET    /api/promoters               - Listar códigos (admin)
GET    /api/promoters/:id           - Buscar código
PUT    /api/promoters/:id           - Atualizar código
DELETE /api/promoters/:id           - Desativar código (soft delete)
GET    /api/promoters/:id/stats     - Estatísticas do código
POST   /api/promoters/:id/events    - Associar eventos
DELETE /api/promoters/:id/events/:eventId - Remover associação
```

### Validação de Código (Público)
```
GET    /api/promoters/validate      - Validar código para evento
  Query: ?code=GUILHERME123&eventId=123
  Response: { valid: true, discount: { type: 'percentage', value: 5 }, discountAmount: 2.50 }
```

### Orders (Atualização)
```
POST   /api/orders                  - Criar pedido (adicionar campo promoterCode)
  Body: { ...existing, promoterCode?: string }
```

---

## 📊 Exemplo de Cálculo

### Cenário 1: Desconto Percentual
- Ingresso: R$ 150,00
- Código: 10% de desconto
- Taxa da Plataforma: 5%

**Cálculo:**
1. Subtotal: R$ 150,00
2. Desconto (10%): R$ 15,00
3. Subtotal com desconto: R$ 135,00
4. Taxa (5% sobre R$ 135,00): R$ 6,75
5. **Total Final: R$ 141,75**

### Cenário 2: Desconto Fixo
- Ingresso: R$ 150,00
- Código: R$ 20,00 de desconto
- Taxa da Plataforma: 5%

**Cálculo:**
1. Subtotal: R$ 150,00
2. Desconto (fixo): R$ 20,00
3. Subtotal com desconto: R$ 130,00
4. Taxa (5% sobre R$ 130,00): R$ 6,50
5. **Total Final: R$ 136,50**

---

## ✅ Regras Confirmadas

1. **Campos do Promotor:**
   - ✅ Nome (obrigatório)
   - ✅ CPF (obrigatório, validado)
   - ✅ Email (obrigatório, validado)
   - ✅ WhatsApp (obrigatório, validado)
   - ✅ Código único

2. **Desconto e Taxa:**
   - ✅ Taxa da plataforma calculada sobre valor COM desconto
   - ✅ Total = (subtotal - desconto) + taxa

3. **Comissão:**
   - ✅ Sobre vendas brutas (subtotal original, sem desconto)
   - ⏳ Implementação futura (apenas cálculo, não pagamento)

4. **Limites e Validade:**
   - ✅ Sem limite de uso
   - ✅ Sem validade (só desativar manualmente)
   - ✅ Botão desativar/ativar no código

5. **URLs:**
   - ✅ Query parameter: `?codigo=GUILHERME123`
   - ⏳ URLs personalizadas (futuro)

6. **Dashboard:**
   - ✅ Sem dashboard do promoter
   - ✅ Apenas CRUD e estatísticas no admin
   - ✅ Boxes de análise de vendas

---

## 🚀 Implementação Sugerida (Fases)

### Fase 1 - MVP (Essencial)
- [ ] Modelo `PromoterCode`
- [ ] CRUD de códigos (admin)
- [ ] Associação código ↔ evento
- [ ] Validação de código no checkout
- [ ] Aplicação de desconto no pedido
- [ ] Registro de código no pedido
- [ ] Estatísticas básicas (admin)

### Fase 2 - Melhorias
- [ ] URLs personalizadas (`/promoter/codigo`)
- [ ] Dashboard do promotor (login próprio)
- [ ] Relatórios detalhados
- [ ] Exportação de dados
- [ ] Notificações por email

### Fase 3 - Avançado
- [ ] Comissões automáticas
- [ ] Links de afiliado com tracking
- [ ] Campanhas de marketing
- [ ] Multi-nível (afiliado de afiliado)

---

## ✅ Próximos Passos

1. **Confirmar regras de negócio** (responder perguntas acima)
2. **Criar modelo `PromoterCode`** no backend
3. **Criar endpoints da API**
4. **Criar telas de gerenciamento** (admin)
5. **Integrar no checkout** (portal público)
6. **Testar fluxo completo**

---

**Versão**: 1.0  
**Data**: Novembro 2024  
**Status**: Aguardando aprovação das regras de negócio

