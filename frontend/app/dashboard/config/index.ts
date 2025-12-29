import { HiOutlineClipboardDocumentList, HiOutlineTicket } from 'react-icons/hi2';
import type { TabKey, OrderStatus } from '../types';

export const tabs: Array<{
    key: TabKey;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    {
        key: 'orders',
        label: 'Meus Pedidos',
        description: 'Histórico de compras, ingressos ativos e detalhes.',
        icon: HiOutlineTicket,
    },
    {
        key: 'requests',
        label: 'Minhas Solicitações',
        description: 'Acompanhamento de suporte, solicitações e chamados.',
        icon: HiOutlineClipboardDocumentList,
    },
];

export const statusConfig: Record<
    OrderStatus,
    {
        label: string;
        badgeClass: string;
    }
> = {
    pending: {
        label: 'Pendente',
        badgeClass: 'border border-amber-200 bg-amber-100 text-amber-800',
    },
    paid: {
        label: 'Pago',
        badgeClass: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
    },
    cancelled: {
        label: 'Cancelado',
        badgeClass: 'border border-rose-500/30 bg-rose-500/10 text-rose-500',
    },
    refunded: {
        label: 'Reembolsado',
        badgeClass: 'border border-sky-500/30 bg-sky-500/10 text-sky-500',
    },
};

export const paymentLabels: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    bank_slip: 'Boleto',
    vip_free: 'Cortesia',
};
