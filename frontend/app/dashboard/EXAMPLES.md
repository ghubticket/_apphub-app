# 📚 Exemplos de Uso - Dashboard

## Guia prático para trabalhar com a nova estrutura modular

---

## 🎯 Exemplo 1: Adicionar Nova Aba

Vamos adicionar uma aba "Histórico" para mostrar transações passadas.

### Passo 1: Atualizar Tipos

```typescript
// types/index.ts
export type TabKey = 'orders' | 'requests' | 'history'; // Adicionar 'history'
```

### Passo 2: Adicionar na Configuração

```typescript
// config/index.ts
import { HiOutlineClockIcon } from 'react-icons/hi2';

export const tabs = [
    // ... tabs existentes
    {
        key: 'history',
        label: 'Histórico',
        description: 'Veja suas transações anteriores.',
        icon: HiOutlineClockIcon,
    },
];
```

### Passo 3: Criar Componente

```typescript
// components/HistorySection.tsx
'use client';

import React from 'react';

export default function HistorySection() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-6">
                <h2 className="text-xl font-bold text-[#1a1a1d]">Histórico de Transações</h2>
                {/* Seu conteúdo aqui */}
            </div>
        </div>
    );
}
```

### Passo 4: Adicionar no Page

```typescript
// page.tsx
import HistorySection from './components/HistorySection';

// No renderActiveTabContent():
const renderActiveTabContent = () => {
    switch (activeTab) {
        case 'orders':
            return <OrdersList {...props} />;
        case 'requests':
            return <RequestsSection {...props} />;
        case 'history': // Nova aba
            return <HistorySection />;
        default:
            return <OrdersList {...props} />;
    }
};
```

---

## 🔧 Exemplo 2: Adicionar Novo Status de Pedido

Vamos adicionar status "processing" (processando).

### Passo 1: Atualizar Tipo

```typescript
// types/index.ts
export type OrderStatus = 
    | 'pending' 
    | 'processing' // Novo status
    | 'paid' 
    | 'cancelled' 
    | 'refunded';
```

### Passo 2: Adicionar Configuração

```typescript
// config/index.ts
export const statusConfig: Record<OrderStatus, { label: string; badgeClass: string }> = {
    // ... statuses existentes
    processing: {
        label: 'Processando',
        badgeClass: 'border border-blue-500/30 bg-blue-500/10 text-blue-500',
    },
};
```

### Passo 3: Usar no Componente

O componente `OrdersList` automaticamente usará a nova configuração!

---

## 🎨 Exemplo 3: Customizar Aparência de um Card de Pedido

Vamos adicionar um badge especial para pedidos VIP.

### Criar Helper

```typescript
// utils/orderHelpers.ts
export function isVipOrder(order: OrderSummary): boolean {
    return order.paymentMethod === 'vip_free' || order.totalAmount === 0;
}

export function getOrderBadge(order: OrderSummary): string | null {
    if (isVipOrder(order)) {
        return 'VIP 👑';
    }
    return null;
}
```

### Usar no Componente

```typescript
// components/OrdersList.tsx
import { getOrderBadge } from '../utils/orderHelpers';

// No render:
const badge = getOrderBadge(order);
{badge && (
    <span className="text-xs font-bold text-yellow-600">
        {badge}
    </span>
)}
```

---

## 📊 Exemplo 4: Adicionar Filtros na Lista de Pedidos

Vamos adicionar filtro por status.

### Criar Estado no Page

```typescript
// page.tsx
const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
```

### Criar Componente de Filtro

```typescript
// components/OrdersFilter.tsx
'use client';

import React from 'react';
import { statusConfig } from '../config';
import type { OrderStatus } from '../types';

interface OrdersFilterProps {
    activeFilter: OrderStatus | 'all';
    onFilterChange: (filter: OrderStatus | 'all') => void;
}

export default function OrdersFilter({ activeFilter, onFilterChange }: OrdersFilterProps) {
    return (
        <div className="flex gap-2 flex-wrap">
            <button
                onClick={() => onFilterChange('all')}
                className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    activeFilter === 'all'
                        ? 'bg-[#1a1a1d] text-white'
                        : 'bg-white text-[#1a1a1d] border border-[#ded7ca]'
                }`}
            >
                Todos
            </button>
            {Object.entries(statusConfig).map(([status, config]) => (
                <button
                    key={status}
                    onClick={() => onFilterChange(status as OrderStatus)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${
                        activeFilter === status
                            ? config.badgeClass
                            : 'bg-white text-[#1a1a1d] border border-[#ded7ca]'
                    }`}
                >
                    {config.label}
                </button>
            ))}
        </div>
    );
}
```

### Filtrar Pedidos

```typescript
// page.tsx
const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders;
    
    return orders.filter(item => {
        if (isOrderGroup(item)) {
            // Grupos sempre mostram (são todos 'paid')
            return filterStatus === 'paid';
        }
        return item.status === filterStatus;
    });
}, [orders, filterStatus]);

// Passar filteredOrders para OrdersList
<OrdersList orders={filteredOrders} {...otherProps} />
```

---

## 🔔 Exemplo 5: Adicionar Notificações

Vamos adicionar um sistema de notificações toast.

### Instalar Biblioteca

```bash
npm install react-hot-toast
```

### Criar Hook Customizado

```typescript
// hooks/useToast.ts
import { useCallback } from 'react';
import toast from 'react-hot-toast';

export function useToast() {
    const showSuccess = useCallback((message: string) => {
        toast.success(message, {
            duration: 3000,
            position: 'bottom-right',
        });
    }, []);

    const showError = useCallback((message: string) => {
        toast.error(message, {
            duration: 4000,
            position: 'bottom-right',
        });
    }, []);

    const showLoading = useCallback((message: string) => {
        return toast.loading(message, {
            position: 'bottom-right',
        });
    }, []);

    return { showSuccess, showError, showLoading };
}
```

### Usar no Componente

```typescript
// components/RequestsSection.tsx
import { useToast } from '../hooks/useToast';

export default function RequestsSection() {
    const { showSuccess, showError } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            await api.post('/support/request', formData);
            showSuccess('Solicitação enviada com sucesso!');
        } catch (error) {
            showError('Erro ao enviar solicitação');
        }
    };

    // ...
}
```

---

## 🧪 Exemplo 6: Adicionar Testes Unitários

Vamos testar o componente `PixExpirationTimer`.

### Instalar Dependências

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### Criar Teste

```typescript
// components/__tests__/PixExpirationTimer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import PixExpirationTimer from '../PixExpirationTimer';

describe('PixExpirationTimer', () => {
    it('should show time remaining', () => {
        const futureDate = new Date();
        futureDate.setMinutes(futureDate.getMinutes() + 10);
        
        render(<PixExpirationTimer expiresAt={futureDate.toISOString()} />);
        
        expect(screen.getByText(/Você tem:/)).toBeInTheDocument();
        expect(screen.getByText(/10min/)).toBeInTheDocument();
    });

    it('should show expired message when time is up', () => {
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 10);
        
        render(<PixExpirationTimer expiresAt={pastDate.toISOString()} />);
        
        expect(screen.getByText(/Código PIX expirado/)).toBeInTheDocument();
    });
});
```

---

## 📱 Exemplo 7: Adicionar Responsividade Customizada

Vamos criar um hook para detectar breakpoints.

### Criar Hook

```typescript
// hooks/useBreakpoint.ts
import { useEffect, useState } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setBreakpoint('mobile');
            } else if (width < 1024) {
                setBreakpoint('tablet');
            } else {
                setBreakpoint('desktop');
            }
        };

        handleResize(); // Checar inicial
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
}
```

### Usar no Componente

```typescript
// components/OrdersList.tsx
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function OrdersList() {
    const breakpoint = useBreakpoint();

    return (
        <div className={`
            ${breakpoint === 'mobile' ? 'grid-cols-1' : ''}
            ${breakpoint === 'tablet' ? 'grid-cols-2' : ''}
            ${breakpoint === 'desktop' ? 'grid-cols-3' : ''}
            grid gap-4
        `}>
            {/* Conteúdo */}
        </div>
    );
}
```

---

## 🎁 Exemplo 8: Adicionar Loading Skeleton

Vamos criar um skeleton para a lista de pedidos.

### Criar Componente

```typescript
// components/OrdersListSkeleton.tsx
'use client';

import React from 'react';

export default function OrdersListSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-[#ded7ca] bg-white/80 p-6"
                >
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
```

### Usar no OrdersList

```typescript
// components/OrdersList.tsx
import OrdersListSkeleton from './OrdersListSkeleton';

export default function OrdersList({ loading, ...props }: OrdersListProps) {
    if (loading) {
        return <OrdersListSkeleton />;
    }

    // Resto do componente...
}
```

---

## 🚀 Dicas de Boas Práticas

### 1. Sempre use tipos TypeScript
```typescript
// ❌ Ruim
const handleClick = (data: any) => { ... }

// ✅ Bom
const handleClick = (data: OrderSummary) => { ... }
```

### 2. Extraia constantes mágicas
```typescript
// ❌ Ruim
if (status === 'paid') { ... }

// ✅ Bom
const PAID_STATUS = 'paid' as const;
if (status === PAID_STATUS) { ... }
```

### 3. Use hooks customizados para lógica reutilizável
```typescript
// ❌ Ruim - lógica duplicada em múltiplos componentes

// ✅ Bom - hook centralizado
const { data, loading, error } = useOrders();
```

### 4. Componentes pequenos e focados
```typescript
// ❌ Ruim - componente faz muitas coisas
<OrderCardWithDetailsAndActionsAndStatus />

// ✅ Bom - componentes compostos
<OrderCard>
    <OrderDetails />
    <OrderActions />
    <OrderStatus />
</OrderCard>
```

### 5. Documente componentes complexos
```typescript
/**
 * Componente que exibe lista de pedidos com agrupamento automático
 * por evento para pedidos pagos.
 * 
 * @param orders - Lista de pedidos ou grupos
 * @param loading - Estado de carregamento
 * @param onViewDetails - Callback ao clicar em detalhes
 */
export default function OrdersList({ orders, loading, onViewDetails }: OrdersListProps) {
    // ...
}
```

---

## 📚 Recursos Adicionais

- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Icons](https://react-icons.github.io/react-icons/)

---

**Precisa de mais exemplos?** Abra uma issue ou consulte a documentação completa no README.md
