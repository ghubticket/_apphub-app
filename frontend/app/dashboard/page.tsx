'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    HiOutlineClipboardDocumentList,
    HiOutlineTicket,
    HiOutlineUserCircle,
    HiOutlineExclamationTriangle,
    HiOutlineChevronDown,
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

type PixInfo = {
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;
    expiresAt?: string | null;
    expirationMinutes?: number | null;
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
    pixInfo?: PixInfo; // Informações do PIX para pedidos pendentes
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
            key: 'orders',
            label: 'Meus Pedidos',
            description: 'Histórico de compras, ingressos ativos e detalhes.',
            icon: HiOutlineTicket,
        },
        {
            key: 'profile',
            label: 'Meu Perfil',
            description: 'Dados pessoais, informações de contato e preferências.',
            icon: HiOutlineUserCircle,
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
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);
    const [modalSlideIndex, setModalSlideIndex] = useState(0);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const modalScrollRef = useRef<HTMLDivElement | null>(null);

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
                    pixInfo: order.pixInfo || undefined, // Informações do PIX para pedidos pendentes
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
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const update = () => setIsMobileViewport(mediaQuery.matches);
        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (!isReady || !isAuthenticated) return;
        if (activeTab === 'orders' && !hasFetchedOrders) {
            fetchOrders();
        }
    }, [activeTab, fetchOrders, hasFetchedOrders, isAuthenticated, isReady]);

    const activeOrder = openOrderId ? orders.find((order) => order._id === openOrderId) : null;

    useEffect(() => {
        if (activeOrder && modalScrollRef.current) {
            setModalSlideIndex(0);
            modalScrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
        }
    }, [activeOrder]);

    const handleModalScroll = useCallback(() => {
        if (!modalScrollRef.current || !activeOrder) return;
        const container = modalScrollRef.current;
        const width = container.clientWidth || 1;
        const index = Math.round(container.scrollLeft / width);
        const clamped = Math.max(0, Math.min(activeOrder.tickets.length - 1, index));
        if (clamped !== modalSlideIndex) {
            setModalSlideIndex(clamped);
        }
    }, [activeOrder, modalSlideIndex]);

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

                    const isExpanded = expandedOrderId === order._id;

                    return (
                        <article
                            key={order._id}
                            className="rounded-2xl border border-[#ded7ca] bg-white/80 p-6 shadow-[0_25px_45px_-25px_rgba(20,20,32,0.25)] transition hover:shadow-[0_30px_60px_-25px_rgba(20,20,32,0.35)]"
                        >
                            <header>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedOrderId((current) =>
                                            current === order._id ? null : order._id,
                                        )
                                    }
                                    className="flex w-full flex-col gap-4 text-left transition hover:text-[#1a1a1d] md:flex-row md:items-center md:justify-between"
                                >
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
                                    <div className="flex  items-center gap-10">
                                        <div className='flex flex-col gap-2'>
                                            <span
                                                className={`flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusInfo.badgeClass}`}
                                            >
                                                {statusInfo.label}
                                            </span>
                                            <span className="text-xs uppercase tracking-[0.2em] text-[#7d796c]">
                                                Criado em {createdAt}
                                            </span>
                                            <span className="text-xs font-medium text-[#4c4c55]">
                                                Valor total {currencyFormatter.format(order.totalAmount ?? 0)}
                                            </span>
                                            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#a38f78]">
                                                {paymentLabel}
                                            </span>
                                        </div>

                                        <HiOutlineChevronDown
                                            className={`text-xl text-[#a38f78] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                            aria-hidden
                                        />
                                    </div>
                                </button>
                            </header>

                            <div
                                className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[1200px] pt-6 opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}
                            >
                                {/* Seção de PIX pendente */}
                                {order.status === 'pending' && order.paymentMethod === 'pix' && (
                                    order.pixInfo ? (
                                        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                                                    Pagamento PIX Pendente
                                                </span>
                                            </div>
                                            <p className="mb-4 text-sm text-emerald-700">
                                                Seu pedido ainda está pendente. Copie e cole o código PIX abaixo para finalizar o pagamento.
                                            </p>
                                            
                                            {/* QR Code */}
                                            {order.pixInfo.qrCodeBase64 && (
                                                <div className="mb-4 flex justify-center">
                                                    <img
                                                        src={`data:image/png;base64,${order.pixInfo.qrCodeBase64}`}
                                                        alt="QR Code PIX"
                                                        className="h-48 w-48 rounded-lg border-2 border-emerald-200 bg-white p-2"
                                                    />
                                                </div>
                                            )}
                                            
                                            {/* Código PIX para copiar */}
                                            {(order.pixInfo.ticketUrl || order.pixInfo.qrCode) && (
                                                <div className="mb-4">
                                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                                                        Código PIX (Copiar e Colar)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={order.pixInfo.ticketUrl || order.pixInfo.qrCode || ''}
                                                            className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-[#1a1a1d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    const codeToCopy = order.pixInfo!.ticketUrl || order.pixInfo!.qrCode || '';
                                                                    await navigator.clipboard.writeText(codeToCopy);
                                                                    alert('Código PIX copiado!');
                                                                } catch (error) {
                                                                    alert('Erro ao copiar código PIX');
                                                                }
                                                            }}
                                                            className="rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-200"
                                                        >
                                                            Copiar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Timer de expiração dinâmico */}
                                            {order.pixInfo.expiresAt && (
                                                <PixExpirationTimer expiresAt={order.pixInfo.expiresAt} />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                                                    Pagamento PIX Pendente
                                                </span>
                                            </div>
                                            <p className="mb-2 text-sm text-amber-700">
                                                Seu pedido está aguardando pagamento via PIX.
                                            </p>
                                            <p className="text-xs text-amber-600">
                                                ⚠️ As informações do PIX estão sendo carregadas...
                                            </p>
                                        </div>
                                    )
                                )}
                                
                                <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a38f78]">
                                        Ingressos
                                    </span>
                                    {order.status === 'cancelled' ? (
                                        <p className="mt-3 text-xs font-medium text-[#a22d2d]">
                                            Pedido cancelado. Os ingressos não ficam disponíveis neste status.
                                        </p>
                                    ) : (
                                        <>
                                            <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">
                                                {order.totalTickets}x
                                            </p>
                                            <p className="mt-1 text-xs font-medium tracking-normal text-[#6a6760]">
                                                {ticketsConfirmed} confirmados
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModalSlideIndex(0);
                                                    setOpenOrderId(order._id);
                                                }}
                                                className="mt-4 flex gap-3 w-full md:w-fit text-center justify-center rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase text-white shadow-[0_18px_38px_-22px_rgba(20,20,32,0.6)] transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                                            >
                                                <HiOutlineTicket className="text-base" />
                                                Abrir ingressos
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
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
        <>
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

                            <section>
                                {renderActiveTabContent()}
                            </section>
                        </section>
                    </Container>
                )}
            </main>

            {activeOrder ? (
                <TicketModal
                    order={activeOrder}
                    slideIndex={modalSlideIndex}
                    onClose={() => {
                        setOpenOrderId(null);
                        setModalSlideIndex(0);
                    }}
                    scrollRef={modalScrollRef}
                    onScroll={handleModalScroll}
                    isMobile={isMobileViewport}
                />
            ) : null}
        </>
    );
}

interface TicketModalProps {
    order: OrderSummary;
    slideIndex: number;
    onClose: () => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    onScroll: () => void;
    isMobile: boolean;
}

const TicketModal = ({
    order,
    slideIndex,
    onClose,
    scrollRef,
    onScroll,
    isMobile,
}: TicketModalProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = setTimeout(() => {
            onClose();
        }, 250);
    }, [onClose]);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClose]);

    const handleOverlayClick = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) {
                handleClose();
            }
        },
        [handleClose],
    );

    const eventName = order.event?.name ?? 'Evento não informado';
    const eventDate = order.event?.date
        ? new Date(order.event.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })
        : 'Data a definir';
    const eventLocation = order.event?.location || order.event?.address || '';

    const formatCurrency = (value?: number) =>
        typeof value === 'number'
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
            : undefined;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            onMouseDown={handleOverlayClick}
        >
            <div
                className={`relative flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-[#ded7ca] bg-white p-6 text-[#1a1a1d] shadow-[0_40px_80px_-40px_rgba(18,18,24,0.45)] transition-all duration-300 md:p-10 ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
                    }`}
            >
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ded7ca] bg-white text-[#4c4c55] transition hover:border-[#a38f78] hover:text-[#1a1a1d]"
                    aria-label="Fechar modal de ingressos"
                >
                    ✕
                </button>

                {isMobile ? (
                    <>
                        <p className="text-xs text-center pt-1 font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                            Ingresso {slideIndex + 1} de {order.tickets.length}
                        </p>

                        <div
                            ref={scrollRef}
                            onScroll={onScroll}
                            className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6"
                        >
                            {order.tickets.map((ticket, index) => {
                                const ticketConfirmed = ticket.status === 'confirmed';
                                const ticketPrice = formatCurrency(ticket.price);

                                return (
                                    <div
                                        key={ticket._id ?? ticket.code ?? index}
                                        className="flex min-w-full snap-center flex-col items-center gap-6 text-center"
                                    >

                                        <div className="rounded-3xl border border-[#ded7ca] bg-white p-4 shadow-[0_20px_45px_-25px_rgba(20,20,32,0.25)]">
                                            {ticketConfirmed && ticket.qrCode ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={ticket.qrCode}
                                                    alt={`QR Code do ingresso ${ticket.code ?? ''}`}
                                                    className="h-56 w-56 object-contain"
                                                />
                                            ) : (
                                                <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-[#ded7ca] bg-[#f5f1e8]/70 px-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#7d796c]">
                                                    Aguardando confirmação do pagamento
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                    </>
                ) : (
                    <div className="rounded-3xl border mt-5 border-amber-200 bg-amber-50 p-8 text-center text-amber-700">
                        <HiOutlineExclamationTriangle className="mx-auto mb-4 text-3xl" />
                        <h3 className="text-lg font-semibold uppercase">
                            Disponível apenas no mobile
                        </h3>
                        <p className="mt-3 text-sm font-medium tracking-normal text-[#8a6942]">
                            Para sua segurança, seus ingressos estão disponíveis somente na versão mobile. <br></br> Acesse pelo
                            seu celular para visualizar o QR Code.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente de timer de expiração do PIX
function PixExpirationTimer({ expiresAt }: { expiresAt: string }) {
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const expirationDate = new Date(expiresAt);
            const now = new Date();
            const diff = expirationDate.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeRemaining(0);
                setIsExpired(true);
                return;
            }
            
            setIsExpired(false);
            setTimeRemaining(Math.floor(diff / 1000)); // segundos restantes
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    if (timeRemaining === null) {
        return (
            <p className="text-xs text-emerald-600">
                ⏰ Carregando tempo restante...
            </p>
        );
    }

    if (isExpired || timeRemaining <= 0) {
        return (
            <p className="text-xs font-semibold text-red-600">
                ⚠️ Código PIX expirado
            </p>
        );
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;

    return (
        <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-800">
                ⏰ Você tem até{' '}
                {hours > 0 && (
                    <span className="text-emerald-900">
                        {hours}h {displayMinutes.toString().padStart(2, '0')}min {seconds.toString().padStart(2, '0')}s
                    </span>
                )}
                {hours === 0 && (
                    <span className="text-emerald-900">
                        {displayMinutes}min {seconds.toString().padStart(2, '0')}s
                    </span>
                )}
                {' '}para pagar
            </p>
        </div>
    );
}

