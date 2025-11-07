# 🔒 Segurança e Arquitetura para Múltiplos Validadores

## ✅ RECOMENDAÇÃO: 1 Email/Usuário por Validador

### Por que NÃO usar 1 email compartilhado?

❌ **Problemas de Segurança:**
- Se um dispositivo é comprometido, TODOS estão comprometidos
- Impossível revogar acesso de um validador específico
- Senha compartilhada = maior risco de vazamento
- Sem controle granular de permissões

❌ **Problemas de Rastreabilidade:**
- Impossível saber QUEM validou cada ingresso
- Sem auditoria individual
- Sem responsabilização
- Problemas legais em caso de fraude

❌ **Problemas de Performance:**
- Histórico misturado = queries mais lentas
- Difícil filtrar por validador específico
- Análise de dados mais complexa

### Por que usar 1 Email/Usuário por Validador?

✅ **Segurança:**
- Cada validador tem seu próprio token JWT
- Revogação individual de acesso
- Controle granular (ativar/desativar por pessoa)
- Senha individual = menor risco de vazamento

✅ **Rastreabilidade:**
- Cada validação registra `validatorId` (quem validou)
- Histórico individual por validador
- Auditoria completa
- Responsabilização clara

✅ **Performance:**
- Histórico filtrado por `validatorId` (índice otimizado)
- Queries mais rápidas (menos dados por query)
- Cada validador vê apenas seus registros

✅ **Compliance:**
- Atende requisitos de auditoria
- Conformidade legal
- Rastreamento completo de ações

## 📊 Impacto no Banco de Dados

### Tamanho de um Usuário:
- **Email**: ~50 bytes
- **Nome**: ~100 bytes
- **Hash de senha**: ~60 bytes
- **Campos extras**: ~200 bytes
- **Total por usuário**: ~410 bytes

### Para 5 Validadores:
- **Total**: ~2KB (desprezível!)
- **Benefícios**: Enormes
- **Custo**: Mínimo

### Comparação:

| Aspecto | 1 Email Compartilhado | 5 Emails Separados |
|---------|----------------------|-------------------|
| **Segurança** | ❌ Baixa | ✅ Alta |
| **Rastreabilidade** | ❌ Nenhuma | ✅ Completa |
| **Performance** | ⚠️ Média | ✅ Otimizada |
| **Auditoria** | ❌ Impossível | ✅ Completa |
| **Custo no BD** | ✅ Menor | ⚠️ +2KB |
| **Controle** | ❌ Nenhum | ✅ Total |

## 🏗️ Arquitetura Atual

O sistema **JÁ ESTÁ PREPARADO** para múltiplos validadores:

### 1. Modelo `ValidationAttempt`:
```typescript
{
  validatorId: ObjectId,  // Quem validou (índice otimizado)
  ticketCode: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string,
  createdAt: Date
}
```

### 2. Histórico Individual:
- Endpoint: `GET /api/tickets/validation-history`
- Filtra por `validatorId` do usuário autenticado
- Cada validador vê apenas seu próprio histórico
- Performance otimizada com índices

### 3. Rastreamento Completo:
- Cada validação registra quem validou
- IP e User-Agent capturados
- Timestamp preciso
- Motivo de falha (se houver)

## 📋 Como Criar os 5 Validadores

### Opção 1: Via Dashboard (Recomendado)
1. Acesse `/apps/users/list` como ADMIN
2. Clique em "Criar Usuário"
3. Preencha:
   - Nome: "Validador 1", "Validador 2", etc.
   - Email: `validador1@evento.com`, `validador2@evento.com`, etc.
   - Role: `QRCODE`
   - Senha: (senha forte individual)
4. Repita para cada validador

### Opção 2: Via Script (Bulk)
```typescript
// backend/src/scripts/createValidators.ts
import { User } from '../models';
import bcrypt from 'bcryptjs';

const validators = [
  { name: 'Validador 1', email: 'validador1@evento.com' },
  { name: 'Validador 2', email: 'validador2@evento.com' },
  { name: 'Validador 3', email: 'validador3@evento.com' },
  { name: 'Validador 4', email: 'validador4@evento.com' },
  { name: 'Validador 5', email: 'validador5@evento.com' },
];

async function createValidators() {
  const defaultPassword = 'SenhaSegura123!'; // Mudar após primeiro login
  
  for (const validator of validators) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await User.create({
      ...validator,
      password: hashedPassword,
      role: 'QRCODE',
      isActive: true,
    });
    
    console.log(`✅ Criado: ${validator.name} (${validator.email})`);
  }
}

createValidators();
```

## 🔐 Boas Práticas de Segurança

### 1. Senhas Fortes:
- Mínimo 12 caracteres
- Mistura de maiúsculas, minúsculas, números e símbolos
- Única por validador (não compartilhar)

### 2. Rotação de Senhas:
- Trocar senha a cada 90 dias (opcional)
- Forçar troca no primeiro login

### 3. Controle de Acesso:
- Desativar validadores que não estão mais trabalhando
- Monitorar tentativas de login falhas
- Revogar tokens em caso de suspeita

### 4. Auditoria:
- Revisar histórico de validações regularmente
- Identificar padrões suspeitos
- Rastrear quem validou o quê

## 📈 Estatísticas por Validador (Futuro)

Podemos adicionar endpoint para estatísticas individuais:

```typescript
GET /api/tickets/validation-stats
// Retorna:
{
  totalValidations: 150,
  successful: 145,
  failed: 5,
  lastValidation: "2025-01-07T14:30:00Z",
  validationsByHour: [...],
  validationsByEvent: [...]
}
```

## 🎯 Conclusão

**USE 5 EMAILS/USUÁRIOS SEPARADOS!**

- ✅ Segurança muito superior
- ✅ Rastreabilidade completa
- ✅ Performance otimizada
- ✅ Custo mínimo no banco (~2KB)
- ✅ Sistema já preparado para isso

**NÃO USE 1 EMAIL COMPARTILHADO!**

- ❌ Risco de segurança alto
- ❌ Sem rastreabilidade
- ❌ Sem auditoria
- ❌ Problemas legais potenciais

---

**Última atualização:** Janeiro 2025

