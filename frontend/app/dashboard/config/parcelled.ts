import type { ParcelStatus, ParcelledOrderStatus } from '../types/parcelled';

// Configurações de status de parcelas individuais
export const parcelStatusConfig: Record<
    ParcelStatus,
    {
        label: string;
        badgeClass: string;
        icon: string;
    }
> = {
    pending: {
        label: 'Aguardando Vencimento',
        badgeClass: 'border border-gray-400/30 bg-gray-400/10 text-gray-600',
        icon: '📅',
    },
    payment_generated: {
        label: 'PIX Gerado',
        badgeClass: 'border border-blue-500/30 bg-blue-500/10 text-blue-600',
        icon: '💳',
    },
    paid: {
        label: 'Paga',
        badgeClass: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
        icon: '✅',
    },
    overdue: {
        label: 'Em Atraso',
        badgeClass: 'border border-rose-500/30 bg-rose-500/10 text-rose-600',
        icon: '⚠️',
    },
    cancelled: {
        label: 'Cancelada',
        badgeClass: 'border border-gray-500/30 bg-gray-500/10 text-gray-600',
        icon: '❌',
    },
};

// Configurações de status de pedidos parcelados
export const parcelledOrderStatusConfig: Record<
    ParcelledOrderStatus,
    {
        label: string;
        badgeClass: string;
        description: string;
    }
> = {
    pending_entry: {
        label: 'Aguardando Entrada',
        badgeClass: 'border border-amber-500/30 bg-amber-500/10 text-amber-600',
        description: 'Pague a entrada para confirmar seu pedido',
    },
    active: {
        label: 'Ativo',
        badgeClass: 'border border-sky-500/30 bg-sky-500/10 text-sky-600',
        description: 'Continue pagando as parcelas para liberar seus ingressos',
    },
    completed: {
        label: 'Concluído',
        badgeClass: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
        description: 'Todas as parcelas pagas! Seus ingressos estão disponíveis',
    },
    cancelled: {
        label: 'Cancelado',
        badgeClass: 'border border-rose-500/30 bg-rose-500/10 text-rose-600',
        description: 'Pedido cancelado por falta de pagamento',
    },
};

// Mensagens de alerta para parcelas
export const parcelAlertMessages = {
    entryPending: '⏰ Pague a entrada até o vencimento para confirmar seu pedido',
    entryExpiringSoon: '⚠️ A entrada expira em breve! Pague agora para não perder seu pedido',
    parcelOverdue: '⚠️ Parcela(s) em atraso! Pague para não perder seus ingressos',
    aboutToCancel: '🚨 ATENÇÃO! 2 ou mais parcelas atrasadas cancelam o pedido automaticamente',
    completed: '🎉 Parabéns! Todas as parcelas pagas. Seus ingressos estão disponíveis!',
};
