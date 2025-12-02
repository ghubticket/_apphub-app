# Cache e Atualizações em Tempo Real

## ⚡ Como Funciona Agora

### TTLs Reduzidos (Atualizações Mais Rápidas)

- **Eventos**: 1 minuto (antes: 5 minutos)
- **Tickets/Preços**: 30 segundos (antes: 2 minutos) ⚡ **CRÍTICO**
- **Catálogo**: 1 minuto (antes: 3 minutos)

### Stale-While-Revalidate

O sistema usa **stale-while-revalidate**, que significa:

1. **Primeira requisição**: Busca da API e salva no cache
2. **Requisições seguintes**: Retorna do cache **imediatamente** (mesmo se expirado)
3. **Em background**: Atualiza o cache quando o navegador está ocioso
4. **Resultado**: UI rápida + dados sempre atualizados

## ⏱️ Tempo de Atualização

### Cenário: Você atualiza um preço no dashboard

**Antes (com cache antigo):**
- ⏳ Até 2 minutos para aparecer no frontend

**Agora (com cache otimizado):**
- ⚡ **30 segundos** para preços aparecerem
- ⚡ **1 minuto** para descrições/fotos aparecerem
- 🔄 **Atualização em background** após 30 segundos (stale-while-revalidate)

### Como Funciona na Prática

1. **Você atualiza preço no dashboard** → Backend atualiza
2. **Usuário acessa frontend**:
   - Se cache tem menos de 30s → Mostra dados do cache (rápido)
   - Se cache tem mais de 30s → Mostra dados do cache (stale) + atualiza em background
   - **Máximo de 30 segundos** para ver dados atualizados

## 🔧 Invalidar Cache Manualmente (Opcional)

Se você quiser **forçar atualização imediata** após uma mudança no dashboard, pode usar:

### No Dashboard (após atualizar evento):

```typescript
import { invalidateEventCacheInFrontend } from '@/lib/cacheInvalidation';

// Após atualizar evento
await eventService.update(eventId, formData);

// Invalidar cache do frontend (se estiver na mesma sessão)
// Nota: Isso só funciona se o dashboard e frontend estiverem na mesma sessão
invalidateEventCacheInFrontend(eventId);
```

### Limitação

⚠️ **Importante**: O cache está no **frontend** (sessionStorage), então:
- Se você atualizar no dashboard, o cache do frontend **não é invalidado automaticamente**
- O cache expira naturalmente após o TTL (30s-1min)
- Stale-while-revalidate atualiza em background

## 📊 Estratégia de Cache

### Dados Críticos (Preços)
- **TTL**: 30 segundos
- **Atualização**: Stale-while-revalidate após 15 segundos
- **Resultado**: Máximo 30s para ver atualização

### Dados Menos Críticos (Descrições, Fotos)
- **TTL**: 1 minuto
- **Atualização**: Stale-while-revalidate após 30 segundos
- **Resultado**: Máximo 1min para ver atualização

## 🎯 Recomendações

### Para Atualizações Imediatas

Se você **precisa** que atualizações apareçam imediatamente:

1. **Opção 1**: Reduzir TTL ainda mais (mas aumenta requisições)
2. **Opção 2**: Implementar WebSocket/SSE para notificações em tempo real
3. **Opção 3**: Adicionar botão "Forçar atualização" no frontend

### Para Performance vs Atualização

**Balance atual (recomendado):**
- ✅ Performance: Cache de 30s-1min reduz requisições
- ✅ Atualização: Stale-while-revalidate mantém dados frescos
- ✅ UX: Usuário vê dados instantaneamente do cache

## 🔍 Como Verificar

### Teste de Atualização

1. Atualize um preço no dashboard
2. Acesse o frontend
3. Aguarde até 30 segundos
4. Recarregue a página (F5)
5. O preço atualizado deve aparecer

### Logs de Debug

No console do navegador, você verá:
- `[fetchTicketCatalog] ✅ Retornando catálogo do cache` - Usando cache
- `[fetchTicketCatalog] 🔄 Cache atualizado em background` - Atualizando em background

## 📝 Resumo

| Tipo de Dado | TTL | Tempo Máximo para Atualizar |
|--------------|-----|----------------------------|
| **Preços** | 30s | ⚡ 30 segundos |
| **Descrições** | 1min | ⏱️ 1 minuto |
| **Fotos** | 1min | ⏱️ 1 minuto |
| **Eventos** | 1min | ⏱️ 1 minuto |

**Stale-while-revalidate**: Atualiza em background após 30 segundos, então na prática pode ser ainda mais rápido!

---

## 🚀 Melhorias Futuras (Opcional)

Se precisar de atualizações **instantâneas**:

1. **WebSocket**: Notificar frontend quando houver atualizações
2. **Server-Sent Events (SSE)**: Stream de atualizações
3. **Polling Inteligente**: Verificar atualizações a cada X segundos
4. **Cache Invalidation API**: Endpoint no backend para invalidar cache do frontend

Mas para a maioria dos casos, o sistema atual (30s-1min) é suficiente! ✅

