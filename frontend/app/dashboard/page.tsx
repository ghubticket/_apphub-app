'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    HiOutlineClipboardDocumentList,
    HiOutlineTicket,
    HiOutlineUserCircle,
} from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

type TabKey = 'profile' | 'orders' | 'requests';
type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

type OrderTicketSummary = {
    _id?: string;
    code?: string;
    status?: string;
    qrCode?: string | null;
    price?: number;
};

type OrderEventSummary = {
    name?: string;
    date?: string;
    location?: string;
    address?: string;
};

type OrderSummary = {
    _id: string;
    orderNumber?: string;
    status: OrderStatus;
    totalAmount: number;
    subtotal?: number;
    discountAmount?: number;
    platformFee?: number;
    totalTickets: number;
    paymentMethod?: string;
    createdAt?: string;
    customerData?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    event?: OrderEventSummary | null;
    tickets: OrderTicketSummary[];
};

type OrderPagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

const tabs: Array<{
    key: TabKey;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
        {
            key: 'profile',
            label: 'Meu Perfil',
            description: 'Dados pessoais, informações de contato e preferências.',
            icon: HiOutlineUserCircle,
        },
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

const statusConfig: Record<
    OrderStatus,
    {
        label: string;
        badgeClass: string;
    }
> = {
    pending: {
        label: 'Pendente',
        badgeClass: 'border border-amber-500/30 bg-amber-500/10 text-amber-500',
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

const paymentLabels: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    bank_slip: 'Boleto',
    vip_free: 'Cortesia',
};

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isReady } = useAuth();
    const [activeTab, setActiveTab] = useState<TabKey>('orders');
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [ordersPagination, setOrdersPagination] = useState<OrderPagination | null>(null);
    const [ordersError, setOrdersError] = useState<string>('');
    const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
    const [hasFetchedOrders, setHasFetchedOrders] = useState(false);
    const [ticketCarouselIndex, setTicketCarouselIndex] = useState<Record<string, number>>({});

    const greetingName = useMemo(() => {
        if (!user) return 'Bem-vindo';
        const baseName = user.name || user.email || 'Bem-vindo';
        const [first] = baseName.trim().split(' ');
        return first || baseName;
    }, [user]);

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 2,
            }),
        [],
    );

    const formatDate = useCallback((isoDate?: string) => {
        if (!isoDate) return 'Data não informada';
        const parsed = new Date(isoDate);
        if (Number.isNaN(parsed.getTime())) return 'Data não informada';
        return parsed.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }, []);

    const formatEventDate = useCallback((isoDate?: string) => {
        if (!isoDate) return null;
        const parsed = new Date(isoDate);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            setOrdersLoading(true);
            setOrdersError('');

            const response = await api.get('/orders', {
                params: {
                    limit: 10,
                },
            });

            const ordersRaw = response.data?.data?.orders ?? [];
            const paginationRaw = response.data?.data?.pagination;

            const normalizedOrders: OrderSummary[] = Array.isArray(ordersRaw)
                ? ordersRaw.map((order: any) => ({
                    _id: order._id || order.id,
                    orderNumber: order.orderNumber,
                    status: (['pending', 'paid', 'cancelled', 'refunded'].includes(order.status)
                        ? order.status
                        : 'pending') as OrderStatus,
                    totalAmount: Number(order.totalAmount ?? 0),
                    subtotal: Number(order.subtotal ?? 0),
                    discountAmount: Number(order.discountAmount ?? 0),
                    platformFee: Number(order.platformFee ?? 0),
                    totalTickets: Number(order.totalTickets ?? 0),
                    paymentMethod: order.paymentMethod,
                    createdAt: order.createdAt,
                    customerData: order.customerData ?? {},
                    event: order.event ?? null,
                    tickets: Array.isArray(order.tickets) ? order.tickets : [],
                }))
                : [];

            setOrders(normalizedOrders);
            setOrdersPagination(
                paginationRaw
                    ? {
                        page: Number(paginationRaw.page ?? 1),
                        limit: Number(paginationRaw.limit ?? normalizedOrders.length ?? 10),
                        total: Number(paginationRaw.total ?? normalizedOrders.length ?? 0),
                        totalPages: Number(paginationRaw.totalPages ?? 1),
                    }
                    : null,
            );
        } catch (error: any) {
            let message: string;

            if (!error?.response) {
                message =
                    'Não foi possível conectar com o servidor. Verifique sua conexão ou se a API está em execução e tente novamente.';
            } else {
                message =
                    error.response?.data?.message ||
                    error?.message ||
                    'Não foi possível carregar seus pedidos. Tente novamente.';
            }

            setOrdersError(message);
        } finally {
            setOrdersLoading(false);
            setHasFetchedOrders(true);
        }
    }, []);

    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isReady, isAuthenticated, router]);

    useEffect(() => {
        setTicketCarouselIndex((prev) => {
            const next: Record<string, number> = {};
            let changed = false;

            orders.forEach((order) => {
                const maxIndex = Math.max(order.tickets.length - 1, 0);
                const prevIndex = prev[order._id] ?? 0;
                const clamped = Math.min(prevIndex, maxIndex);
                next[order._id] = clamped;
                if (clamped !== prevIndex) changed = true;
            });

            if (Object.keys(prev).length !== Object.keys(next).length) {
                changed = true;
            }

            return changed ? next : prev;
        });
    }, [orders]);

    useEffect(() => {
        if (!isReady || !isAuthenticated) return;
        if (activeTab === 'orders' && !hasFetchedOrders) {
            fetchOrders();
        }
    }, [activeTab, fetchOrders, hasFetchedOrders, isAuthenticated, isReady]);

    const updateTicketIndex = useCallback((orderId: string, nextIndex: number) => {
        setTicketCarouselIndex((prev) => {
            if (prev[orderId] === nextIndex) return prev;
            return { ...prev, [orderId]: nextIndex };
        });
    }, []);

    const handleTicketNavigation = useCallback(
        (orderId: string, direction: 'prev' | 'next', total: number) => {
            if (total <= 1) return;
            setTicketCarouselIndex((prev) => {
                const current = prev[orderId] ?? 0;
                const nextIndex =
                    direction === 'prev'
                        ? Math.max(0, current - 1)
                        : Math.min(total - 1, current + 1);
                if (nextIndex === current) return prev;
                return { ...prev, [orderId]: nextIndex };
            });
        },
        [],
    );

    const renderProfileContent = () => (
        <div className="space-y-6">
            <p className="text-sm text-[#4c4c55]">
                Aqui você poderá atualizar suas informações pessoais, preferências de contato e
                documentos necessários para o acesso aos eventos.
            </p>
            <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-6">
                <p className="text-sm text-[#1a1a1d]">
                    Em breve adicionaremos o formulário completo de edição de perfil. Por enquanto,
                    revise seus dados e mantenha-os atualizados junto ao suporte.
                </p>
            </div>
        </div>
    );

    const renderOrdersContent = () => {
        if (ordersLoading) {
            return (
                <div className="flex items-center justify-center rounded-2xl border border-[#ded7ca] bg-white/60 p-10 text-sm font-medium text-[#7d796c]">
                    Carregando seus pedidos...
                </div>
            );
        }

        if (ordersError) {
            return (
                <div className="rounded-2xl border border-[#f2c4c4] bg-[#fbecec] p-6 text-sm text-[#a22d2d]">
                    {ordersError}
                </div>
            );
        }

        if (!orders.length) {
            return (
                <div className="rounded-2xl border border-dashed border-[#ded7ca] bg-white/50 p-6 text-center text-sm text-[#7d796c]">
                    Você ainda não possui pedidos. Assim que comprar seus ingressos, eles aparecerão
                    aqui com todos os detalhes, status e QR codes.
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {orders.map((order) => {
                    const statusInfo = statusConfig[order.status] ?? statusConfig.pending;
                    const eventName = order.event?.name ?? 'Evento não informado';
                    const eventDate = formatEventDate(order.event?.date || undefined);
                    const eventLocation = order.event?.location || order.event?.address || '';
                    const createdAt = formatDate(order.createdAt);
                    const paymentLabel =
                        (order.paymentMethod && paymentLabels[order.paymentMethod]) ||
                        (order.status === 'paid' ? 'Pagamento confirmado' : 'Pagamento pendente');

                    const ticketsConfirmed = order.tickets.filter((ticket) => ticket?.status === 'confirmed').length;
                    const currentTicketSlide = ticketCarouselIndex[order._id] ?? 0;
                    const hasMultipleTickets = order.tickets.length > 1;

                    return (
                        <article
                            key={order._id}
                        >
                            <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#a38f78]">
                                        Pedido {order.orderNumber ? `#${order.orderNumber}` : ''}
                                    </span>
                                    <h3 className="text-lg font-semibold uppercase tracking-[0.15em] text-[#1a1a1d]">
                                        {eventName}
                                    </h3>
                                    <p className="text-xs text-[#7d796c]">
                                        {eventDate ? `${eventDate}` : 'Data a confirmar'}
                                        {eventLocation ? ` • ${eventLocation}` : ''}
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-2 md:items-end">
                                    <span
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusInfo.badgeClass}`}
                                    >
                                        {statusInfo.label}
                                    </span>
                                    <span className="text-xs uppercase tracking-[0.2em] text-[#7d796c]">
                                        Criado em {createdAt}
                                    </span>
                                </div>
                            </header>

                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                        Valor total
                                    </span>
                                    <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">
                                        {currencyFormatter.format(order.totalAmount ?? 0)}
                                    </p>
                                    <p className="mt-1 text-[0.7rem] uppercase tracking-[0.3em] text-[#7d796c]">
                                        {paymentLabel}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                        Ingressos
                                    </span>
                                    <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">
                                        {order.totalTickets}x
                                    </p>
                                    <p className="mt-1 text-[0.7rem] uppercase tracking-[0.3em] text-[#7d796c]">
                                        {ticketsConfirmed} confirmados
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                        Contato
                                    </span>
                                    <p className="mt-2 text-sm font-semibold text-[#1a1a1d]">
                                        {order.customerData?.name || 'Não informado'}
                                    </p>
                                    <p className="text-xs text-[#7d796c]">
                                        {order.customerData?.email || '—'}
                                    </p>
                                </div>
                            </div>

                            {order.tickets.length > 0 && (
                                <div className="mt-6 space-y-4 rounded-2xl border border-dashed border-[#ded7ca] bg-white/60 p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                            Tickets & QR Codes
                                        </p>
                                        {hasMultipleTickets && (
                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#7d796c]">
                                                <span>
                                                    {currentTicketSlide + 1} / {order.tickets.length}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative overflow-hidden rounded-2xl border border-[#e3dbc8] bg-white">
                                        <div
                                            className="flex transition-transform duration-500 ease-in-out"
                                            style={{ transform: `translateX(-${currentTicketSlide * 100}%)` }}
                                        >
                                            {order.tickets.map((ticket, index) => {
                                                const ticketConfirmed = ticket.status === 'confirmed';
                                                const ticketPrice =
                                                    typeof ticket.price === 'number'
                                                        ? currencyFormatter.format(ticket.price)
                                                        : undefined;

                                                return (
                                                    <div
                                                        key={ticket._id ?? ticket.code ?? index}
                                                        className="flex w-full flex-shrink-0 flex-col gap-6 p-6 md:flex-row md:items-start"
                                                    >
                                                        <div className="flex flex-1 flex-col gap-4">
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                                                    Código do Ticket
                                                                </span>
                                                                <p className="text-lg font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                                                    {ticket.code ?? 'Não informado'}
                                                                </p>
                                                            </div>

                                                            <div className="space-y-1 text-sm text-[#4c4c55]">
                                                                <p>
                                                                    <span className="font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                                                        Evento:
                                                                    </span>{' '}
                                                                    {eventName}
                                                                </p>
                                                                <p>
                                                                    <span className="font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                                                        Data:
                                                                    </span>{' '}
                                                                    {eventDate ?? 'A definir'}
                                                                </p>
                                                                {eventLocation ? (
                                                                    <p>
                                                                        <span className="font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                                                            Local:
                                                                        </span>{' '}
                                                                        {eventLocation}
                                                                    </p>
                                                                ) : null}
                                                                <p>
                                                                    <span className="font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                                                        Status:
                                                                    </span>{' '}
                                                                    <span
                                                                        className={`inline-flex items-center rounded-full px-3 py-[2px] text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${ticketConfirmed
                                                                                ? 'bg-emerald-500/15 text-emerald-600'
                                                                                : 'bg-[#f5f1e8] text-[#7d796c]'
                                                                            }`}
                                                                    >
                                                                        {ticket.status ?? 'Pendente'}
                                                                    </span>
                                                                </p>
                                                                {ticketPrice ? (
                                                                    <p>
                                                                        <span className="font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                                                            Valor:
                                                                        </span>{' '}
                                                                        {ticketPrice}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-1 items-center justify-center">
                                                            {ticketConfirmed && ticket.qrCode ? (
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="rounded-3xl border border-[#ded7ca] bg-white p-4 shadow-[0_20px_45px_-25px_rgba(20,20,32,0.25)]">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img
                                                                            src={ticket.qrCode}
                                                                            alt={`QR Code do ingresso ${ticket.code ?? ''}`}
                                                                            className="h-40 w-40 object-contain"
                                                                        />
                                                                    </div>
                                                                    <p className="text-center text-[0.65rem] uppercase tracking-[0.25em] text-[#7d796c]">
                                                                        Apresente este QR Code na entrada
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#ded7ca] bg-[#f5f1e8]/60 p-6 text-center text-xs text-[#7d796c]">
                                                                    <span className="font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                                                        QR Code indisponível
                                                                    </span>
                                                                    <p className="max-w-xs leading-relaxed">
                                                                        O QR Code será liberado assim que o pagamento for confirmado. Fique de olho no status do seu pedido.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {hasMultipleTickets && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleTicketNavigation(order._id, 'prev', order.tickets.length)
                                                    }
                                                    className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#ded7ca] bg-white text-[#4c4c55] shadow-sm transition hover:border-[#a38f78] hover:text-[#1a1a1d] md:flex"
                                                    aria-label="Ticket anterior"
                                                >
                                                    ‹
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleTicketNavigation(order._id, 'next', order.tickets.length)
                                                    }
                                                    className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#ded7ca] bg-white text-[#4c4c55] shadow-sm transition hover:border-[#a38f78] hover:text-[#1a1a1d] md:flex"
                                                    aria-label="Próximo ticket"
                                                >
                                                    ›
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {hasMultipleTickets && (
                                        <div className="flex items-center justify-center gap-2 pt-2">
                                            {order.tickets.map((_, index) => (
                                                <button
                                                    key={`ticket-dot-${order._id}-${index}`}
                                                    type="button"
                                                    onClick={() => updateTicketIndex(order._id, index)}
                                                    className={`h-2.5 w-2.5 rounded-full transition ${currentTicketSlide === index
                                                            ? 'bg-[#1a1a1d]'
                                                            : 'bg-[#dcd5c7] hover:bg-[#bfb5a2]'
                                                        }`}
                                                    aria-label={`Ticket ${index + 1}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}

                {ordersPagination && ordersPagination.total > orders.length && (
                    <p className="text-center text-xs uppercase tracking-[0.3em] text-[#7d796c]">
                        Exibindo {orders.length} de {ordersPagination.total} pedidos recentes.
                    </p>
                )}
            </div>
        );
    };

    const renderRequestsContent = () => (
        <div className="space-y-6">
            <p className="text-sm text-[#4c4c55]">
                Acompanhe chamados abertos com o suporte, solicitações de upgrade e qualquer pedido
                administrativo relacionado à sua conta.
            </p>
            <div className="rounded-2xl border border-dashed border-[#ded7ca] bg-white/50 p-6 text-center text-sm text-[#7d796c]">
                Você ainda não possui solicitações abertas. Use nossos canais oficiais para iniciar
                um atendimento quando precisar.
            </div>
        </div>
    );

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'orders':
                return renderOrdersContent();
            case 'requests':
                return renderRequestsContent();
            case 'profile':
            default:
                return renderProfileContent();
        }
    };

    return (
        <main
            className="bg-[#f5f1e8]"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            {!isReady || (!isAuthenticated && isReady) ? (
                <Container className="flex min-h-[60vh] items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3 text-[#7d796c]">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                            Redirecionando
                        </span>
                        <span className="h-3 w-3 animate-ping rounded-full bg-[#f97316]" />
                    </div>
                </Container>
            ) : (
                <Container className="py-12">
                    <header className="mb-10 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                            Área do Cliente
                        </span>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-[#1a1a1d]">
                                Dashboard 5521
                            </h1>
                            <p className="text-sm text-[#4c4c55]">
                                {greetingName}, gerencie sua conta, pedidos e solicitações em um só
                                lugar.
                            </p>
                        </div>
                    </header>

                    <section className="space-y-10">
                        <nav className="flex w-full flex-wrap gap-4 rounded-3xl border border-[#ded7ca] bg-white/40 p-3">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`group flex flex-1 min-w-[180px] items-center gap-3 rounded-2xl px-5 py-4 text-left transition ${isActive
                                            ? 'bg-[#1a1a1d] text-white shadow-[0_20px_45px_-18px_rgba(12,12,24,0.45)]'
                                            : 'bg-transparent text-[#4c4c55] hover:bg-white hover:text-[#1a1a1d]'
                                            }`}
                                    >
                                        <span
                                            className={`flex h-10 w-10 items-center justify-center rounded-full ${isActive
                                                ? 'bg-white/10 text-white'
                                                : 'bg-[#f5f1e8] text-[#a38f78]'
                                                } transition`}
                                        >
                                            <Icon className="text-xl" />
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                                                {tab.label}
                                            </span>
                                            <span
                                                className={`text-xs ${isActive ? 'text-white/70' : 'text-[#7d796c]'
                                                    }`}
                                            >
                                                {tab.description}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>

                        <section className="rounded-3xl border border-[#ded7ca] bg-white/80 p-8 shadow-[0_35px_60px_-25px_rgba(20,20,32,0.25)]">
                            {renderActiveTabContent()}
                        </section>
                    </section>
                </Container>
            )}
        </main>
    );
}

