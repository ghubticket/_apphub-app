# Dashboard - Área do Cliente

## 📋 Visão Geral

Dashboard refatorado e organizado em componentes modulares para melhor manutenibilidade e escalabilidade.

## 🗂️ Estrutura de Arquivos

```
dashboard/
├── components/              # Componentes reutilizáveis
│   ├── DashboardTabs.tsx   # Navegação entre abas
│   ├── OrdersList.tsx      # Lista de pedidos com agrupamento
│   ├── RequestsSection.tsx # Seção de solicitações e suporte
│   ├── TicketModal.tsx     # Modal para visualizar ingressos
│   ├── SecurityModal.tsx   # Modal de aviso de segurança
│   └── PixExpirationTimer.tsx # Timer de expiração do PIX
│
├── config/                  # Configurações e constantes
│   └── index.ts            # Status, labels, tabs
│
├── types/                   # Definições de tipos TypeScript
│   └── index.ts            # Tipos do dashboard
│
├── utils/                   # Funções utilitárias
│   └── groupOrders.ts      # Agrupamento de pedidos por evento
│
├── hooks/                   # Custom hooks
│   └── useOrdersPolling.ts # Polling de pedidos pendentes
│
└── page.tsx                # Página principal (470 linhas vs 2780 antes!)
```

## ✨ O Que Foi Feito

### 1. **Removido Sistema de Parcelamentos** ✅
- Removida aba "Parcelamentos"
- Removido hook `useParcelledOrdersPolling`
- Removidos todos os tipos e lógicas relacionadas a parcelamentos
- Código reduzido de ~2780 linhas para ~470 linhas no arquivo principal

### 2. **Componentização** ✅
- **DashboardTabs**: Navegação isolada e reutilizável
- **OrdersList**: Gerenciamento completo da lista de pedidos
- **RequestsSection**: Formulário de suporte, FAQ e contatos
- **TicketModal**: Visualização de ingressos com QR codes
- **SecurityModal**: Modal de aviso para desktop
- **PixExpirationTimer**: Timer reativo de expiração do PIX

### 3. **Separação de Responsabilidades** ✅
- **Types**: Todos os tipos TypeScript em arquivo dedicado
- **Config**: Constantes e configurações centralizadas
- **Utils**: Funções utilitárias isoladas (agrupamento de pedidos)

### 4. **Melhorias de Código** ✅
- Redução de ~84% do tamanho do arquivo principal
- Código mais legível e manutenível
- Componentes testáveis individualmente
- Facilita adição de novas features

## 🎯 Funcionalidades Mantidas

### Pedidos
- ✅ Visualização de pedidos (pendentes e pagos)
- ✅ Agrupamento automático de pedidos do mesmo evento
- ✅ Detalhamento de pedidos individuais
- ✅ Visualização de QR codes (apenas mobile)
- ✅ PIX pendente com timer de expiração
- ✅ Polling em tempo real para detectar pagamentos
- ✅ Modal de pagamento aprovado com vibração

### Solicitações
- ✅ Formulário de contato
- ✅ FAQ interativo
- ✅ Links para WhatsApp
- ✅ Informações de horários de atendimento

### Segurança
- ✅ QR codes protegidos (apenas mobile)
- ✅ Modal de segurança no desktop
- ✅ Detecção de device (mobile/desktop)

## 🔄 Como Usar os Componentes

### Exemplo: Adicionar Nova Aba

1. Atualizar `types/index.ts`:
```typescript
export type TabKey = 'orders' | 'requests' | 'nova-aba';
```

2. Atualizar `config/index.ts`:
```typescript
export const tabs = [
    // ... abas existentes
    {
        key: 'nova-aba',
        label: 'Nova Aba',
        description: 'Descrição da nova aba',
        icon: HiOutlineIcon,
    },
];
```

3. Criar componente em `components/NovaAbaSection.tsx`

4. Adicionar no switch em `page.tsx`:
```typescript
case 'nova-aba':
    return <NovaAbaSection />;
```

## 📊 Estatísticas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Linhas no page.tsx | ~2780 | ~470 | -83% |
| Componentes | 1 arquivo | 6+ componentes | +500% |
| Manutenibilidade | Baixa | Alta | ⭐⭐⭐⭐⭐ |
| Testabilidade | Difícil | Fácil | ⭐⭐⭐⭐⭐ |

## 🚀 Próximos Passos (Sugestões)

1. **Testes Unitários**: Adicionar testes para cada componente
2. **Storybook**: Documentar componentes visualmente
3. **Performance**: Implementar lazy loading para abas
4. **Cache**: Adicionar cache de pedidos com React Query
5. **Animações**: Melhorar transições entre estados

## 📝 Notas Importantes

- O arquivo original foi substituído. Caso precise do código antigo, ele tinha 2780 linhas com sistema de parcelamentos
- Todos os imports foram atualizados para a nova estrutura
- A funcionalidade permanece 100% idêntica (exceto parcelamentos que foram removidos)
- Os tipos são compartilhados entre componentes via `types/index.ts`

## 🐛 Troubleshooting

### Erro de Import
- Verifique se todos os arquivos em `components/`, `types/`, `config/` e `utils/` existem
- Certifique-se de que os caminhos de import estão corretos

### Componente Não Renderiza
- Verifique se o componente está exportado como `default`
- Confirme que as props estão sendo passadas corretamente

### Type Errors
- Execute `npm run type-check` para verificar erros de tipagem
- Todos os tipos estão em `types/index.ts`

---

**Última atualização**: Dezembro 2024
**Versão**: 2.0.0 (Refatorada e sem parcelamentos)
