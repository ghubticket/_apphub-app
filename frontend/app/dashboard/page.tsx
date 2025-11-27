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
    _id?: string;
    id?: string;
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
    expiresAt?: string;
    customerData?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    event?: OrderEventSummary | null;
    tickets: OrderTicketSummary[];
    pixInfo?: PixInfo; // Informações do PIX para pedidos pendentes
};

// Tipo para agrupar pedidos pagos do mesmo evento
type OrderGroup = {
    eventId: string;
    eventName: string;
    eventDate?: string;
    eventLocation?: string;
    orders: OrderSummary[]; // Pedidos agrupados
    totalAmount: number; // Soma de todos os pedidos
    totalTickets: number; // Soma de todos os ingressos
    paymentMethods: string[]; // Métodos de pagamento únicos
    earliestCreatedAt?: string; // Data do pedido mais antigo
    latestCreatedAt?: string; // Data do pedido mais recente
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

// Função para agrupar pedidos pagos do mesmo evento
// Pedidos PENDING são mantidos separados (fluxo de checkout ativo)
function groupOrdersByEvent(orders: OrderSummary[]): Array<OrderSummary | OrderGroup> {
    // Separar pedidos pagos e pendentes
    const paidOrders = orders.filter(order => order.status === 'paid');
    const pendingOrders = orders.filter(order => order.status !== 'paid');

    // Agrupar pedidos pagos por evento
    const groupsMap = new Map<string, OrderSummary[]>();

    paidOrders.forEach(order => {
        // Extrair eventId de diferentes formatos possíveis
        let eventId: string = 'unknown';

        if (order.event) {
            if (typeof order.event === 'string') {
                // Se event é uma string (ObjectId não populado)
                eventId = order.event;
            } else if (typeof order.event === 'object') {
                // Se event é um objeto populado
                const eventObj = order.event as OrderEventSummary;
                eventId = eventObj._id || eventObj.id || 'unknown';
            }
        }

        // Se não encontrar eventId, ainda assim continua o fluxo normalmente

        if (!groupsMap.has(eventId)) {
            groupsMap.set(eventId, []);
        }
        groupsMap.get(eventId)!.push(order);
    });

    // Criar grupos consolidados
    const groups: OrderGroup[] = [];
    groupsMap.forEach((groupOrders, eventId) => {
        if (groupOrders.length > 1) {
            // Só agrupar se houver mais de 1 pedido
            const firstOrder = groupOrders[0];
            const totalAmount = groupOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            const totalTickets = groupOrders.reduce((sum, o) => sum + o.totalTickets, 0);
            const paymentMethods = [...new Set(groupOrders.map(o => o.paymentMethod).filter((m): m is string => Boolean(m)))];
            const createdAts = groupOrders.map(o => o.createdAt).filter((d): d is string => Boolean(d)).sort();

            groups.push({
                eventId,
                eventName: firstOrder.event?.name || 'Evento não informado',
                eventDate: firstOrder.event?.date,
                eventLocation: firstOrder.event?.location || firstOrder.event?.address,
                orders: groupOrders.sort((a, b) => {
                    // Ordenar por data de criação (mais recente primeiro)
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                }),
                totalAmount,
                totalTickets,
                paymentMethods,
                earliestCreatedAt: createdAts[createdAts.length - 1],
                latestCreatedAt: createdAts[0],
            });
        } else {
            // Se só tem 1 pedido, não agrupar (adicionar como pedido individual)
            pendingOrders.push(groupOrders[0]);
        }
    });

    // Combinar: grupos primeiro, depois pedidos pendentes/individuais
    // Ordenar por data (mais recente primeiro)
    const allItems: Array<OrderSummary | OrderGroup> = [...groups, ...pendingOrders];
    allItems.sort((a, b) => {
        const dateA = (a as OrderGroup).latestCreatedAt || (a as OrderSummary).createdAt || '';
        const dateB = (b as OrderGroup).latestCreatedAt || (b as OrderSummary).createdAt || '';
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA;
    });

    return allItems;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isReady } = useAuth();
    const [activeTab, setActiveTab] = useState<TabKey>('orders');

    // IMPORTANTE: Limpar flag de PIX ativo ao carregar dashboard
    // Isso permite que quando o usuário voltar ao carrinho, possa criar novo pedido
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('__PIX_ORDER_ACTIVE__');
        }
    }, []);
    const [orders, setOrders] = useState<Array<OrderSummary | OrderGroup>>([]);
    const [ordersPagination, setOrdersPagination] = useState<OrderPagination | null>(null);
    const [ordersError, setOrdersError] = useState<string>('');
    const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
    const [hasFetchedOrders, setHasFetchedOrders] = useState(false);
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);
    const [openGroupId, setOpenGroupId] = useState<string | null>(null); // Para grupos consolidados
    const [modalSlideIndex, setModalSlideIndex] = useState(0);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const modalScrollRef = useRef<HTMLDivElement | null>(null);

    // Função para verificar se é mobile
    const isMobileDevice = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, []);

    // Handler para abrir detalhes com verificação de segurança
    const handleViewDetails = useCallback((orderId: string) => {
        if (isMobileDevice() || isMobileViewport) {
            // Mobile: permitir visualização normal
            setOpenOrderId(orderId);
        } else {
            // Desktop: mostrar modal de segurança
            setShowSecurityModal(true);
        }
    }, [isMobileDevice, isMobileViewport]);

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
                    expiresAt: order.expiresAt,
                    customerData: order.customerData ?? {},
                    event: order.event ?? null,
                    tickets: Array.isArray(order.tickets) ? order.tickets : [],
                    pixInfo: order.pixInfo || undefined, // Informações do PIX para pedidos pendentes
                }))
                : [];

            // Agrupar pedidos pagos do mesmo evento (sem filtro adicional de expiração)
            const groupedOrders = groupOrdersByEvent(normalizedOrders);

            setOrders(groupedOrders);
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

    // Helper para verificar se é um grupo
    const isOrderGroup = (item: OrderSummary | OrderGroup): item is OrderGroup => {
        return 'orders' in item && Array.isArray((item as OrderGroup).orders);
    };

    // Helper para encontrar pedido ativo ou criar ordem consolidada de grupo
    // Usar useMemo para garantir estabilidade e evitar recálculos desnecessários
    const activeOrder = useMemo(() => {
        if (openGroupId) {
            // Se estamos abrindo um grupo, criar um objeto consolidado com todos os tickets
            const group = orders.find(item => isOrderGroup(item) && `group-${(item as OrderGroup).eventId}` === openGroupId) as OrderGroup | undefined;
            if (group) {
                // Coletar todos os tickets de todos os pedidos do grupo
                const allTickets = group.orders.flatMap(o => {
                    if (Array.isArray(o.tickets)) {
                        return o.tickets;
                    }
                    return [];
                });

                // CRÍTICO: Usar o número real de tickets coletados ao invés do totalTickets calculado
                // Isso resolve discrepâncias causadas por tickets deletados ou não populados
                const realTotalTickets = allTickets.length;

                // Criar um objeto "virtual" que representa o grupo consolidado
                const firstOrder = group.orders[0];
                return {
                    ...firstOrder,
                    _id: `group-${group.eventId}`, // ID único para o grupo
                    orderNumber: `${group.orders.length} Pedidos Consolidados`,
                    totalTickets: realTotalTickets, // Usar número real de tickets
                    totalAmount: group.totalAmount,
                    tickets: allTickets, // Todos os tickets do grupo
                } as OrderSummary;
            }
        }

        if (openOrderId) {
            // Buscar pedido individual
            for (const item of orders) {
                if (isOrderGroup(item)) {
                    const found = item.orders.find(o => o._id === openOrderId);
                    if (found) return found;
                } else if (item._id === openOrderId) {
                    return item;
                }
            }
        }

        return null;
    }, [orders, openGroupId, openOrderId]);

    useEffect(() => {
        if (activeOrder && modalScrollRef.current) {
            // Resetar para o primeiro slide quando o pedido muda
            setModalSlideIndex(0);
            // Usar setTimeout para garantir que o DOM está pronto
            setTimeout(() => {
                if (modalScrollRef.current) {
                    modalScrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
                }
            }, 100);
        }
    }, [activeOrder?._id]); // Usar _id para detectar mudanças no pedido

    const handleModalScroll = useCallback(() => {
        if (!modalScrollRef.current || !activeOrder) return;
        const container = modalScrollRef.current;

        // Obter todos os elementos filhos (slides)
        const slides = Array.from(container.children) as HTMLElement[];
        if (slides.length === 0) return;

        // Calcular qual slide está mais visível no viewport
        // Usar requestAnimationFrame para garantir que o cálculo acontece após o scroll
        requestAnimationFrame(() => {
            if (!modalScrollRef.current || !activeOrder) return;

            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;

            let closestIndex = 0;
            let closestDistance = Infinity;

            slides.forEach((slide, index) => {
                const slideRect = slide.getBoundingClientRect();
                const slideCenter = slideRect.left + slideRect.width / 2;
                const distance = Math.abs(containerCenter - slideCenter);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            });

            // Garantir que o índice está dentro dos limites
            const maxIndex = Math.max(0, activeOrder.tickets.length - 1);
            const clamped = Math.max(0, Math.min(maxIndex, closestIndex));

            // Atualizar apenas se mudou
            setModalSlideIndex((currentIndex) => {
                if (clamped !== currentIndex) {
                    return clamped;
                }
                return currentIndex;
            });
        });
    }, [activeOrder]);

    const renderProfileContent = () => (
        <div className="space-y-6">
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
                {orders.map((item, index) => {
                    // Verificar se é grupo ou pedido individual
                    if (isOrderGroup(item)) {
                        // Renderizar grupo consolidado
                        const group = item;
                        const eventDate = formatEventDate(group.eventDate || undefined);
                        const paymentLabelsList = group.paymentMethods
                            .map(method => paymentLabels[method] || method)
                            .join(', ');
                        const earliestDate = formatDate(group.earliestCreatedAt);
                        const latestDate = formatDate(group.latestCreatedAt);
                        const groupId = `group-${group.eventId}`;
                        const isExpanded = expandedOrderId === groupId;

                        // Coletar todos os tickets do grupo
                        // IMPORTANTE: Garantir que todos os tickets sejam coletados, mesmo se alguns pedidos não tiverem tickets populados
                        const allTickets = group.orders.flatMap(o => {
                            // Verificar se tickets é um array válido
                            if (Array.isArray(o.tickets)) {
                                return o.tickets;
                            }
                            return [];
                        });
                        const ticketsConfirmed = allTickets.filter((ticket) => ticket?.status === 'confirmed').length;

                        // CRÍTICO: Usar o número real de tickets coletados ao invés do totalTickets calculado
                        // Isso resolve discrepâncias causadas por tickets deletados ou não populados
                        const realTotalTickets = allTickets.length;

                        // Log para debug apenas se houver discrepância (qualquer diferença)
                        // Isso ajuda a identificar quando tickets foram deletados ou não foram criados corretamente
                        if (realTotalTickets !== group.totalTickets) {
                            const missingTickets = group.totalTickets - realTotalTickets;
                            console.warn('[Dashboard] ⚠️ Discrepância no número de tickets:', {
                                totalTicketsCalculado: group.totalTickets,
                                ticketsColetados: realTotalTickets,
                                ticketsFaltando: missingTickets > 0 ? missingTickets : 0,
                                pedidosNoGrupo: group.orders.length,
                                ticketsPorPedido: group.orders.map(o => ({
                                    orderId: o._id,
                                    orderNumber: o.orderNumber,
                                    totalTickets: o.totalTickets,
                                    ticketsArrayLength: Array.isArray(o.tickets) ? o.tickets.length : 0,
                                    status: o.status,
                                })),
                                observacao: missingTickets > 0
                                    ? `⚠️ ATENÇÃO: ${missingTickets} ticket(s) podem ter sido deletados ou não foram criados corretamente. Verifique no banco de dados.`
                                    : 'Tickets adicionais podem ter sido criados manualmente.',
                            });
                        }

                        return (
                            <article
                                key={groupId}
                                className="rounded-2xl border border-[#ded7ca] bg-white/80 p-6 shadow-[0_25px_45px_-25px_rgba(20,20,32,0.25)] transition hover:shadow-[0_30px_60px_-25px_rgba(20,20,32,0.35)]"
                            >
                                <header>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedOrderId((current) =>
                                                current === groupId ? null : groupId,
                                            )
                                        }
                                        className="flex w-full flex-col gap-4 text-left transition hover:text-[#1a1a1d] md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                                {group.orders.length} Pedido{group.orders.length > 1 ? 's' : ''} Consolidado{group.orders.length > 1 ? 's' : ''}
                                            </span>
                                            <h3 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                                {group.eventName}
                                            </h3>
                                            <p className="text-xs text-[#7d796c]">
                                                {eventDate ? `${eventDate}` : 'Data a confirmar'}
                                                {group.eventLocation ? ` • ${group.eventLocation}` : ''}
                                                {statusConfig.paid.label}
                                            </p>

                                        </div>
                                        <div className="flex items-center gap-10">
                                            <div className='flex flex-col gap-2'>
                                                <span
                                                    className={`flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-normal ${statusConfig.paid.badgeClass}`}
                                                >
                                                    {statusConfig.paid.label}
                                                </span>
                                                <span className="text-xs uppercase tracking-normal text-[#7d796c]">
                                                    {group.orders.length > 1
                                                        ? `De ${earliestDate} até ${latestDate}`
                                                        : `Criado em ${latestDate}`
                                                    }
                                                </span>

                                                <span className="text-[0.65rem] uppercase tracking-normal text-[#a38f78]">
                                                    {paymentLabelsList || 'Pagamento confirmado'}
                                                </span>
                                                <span className="text-xs text-[#7d796c]">
                                                    {realTotalTickets} ingresso{realTotalTickets > 1 ? 's' : ''} total{realTotalTickets > 1 ? 'is' : ''}
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
                                    className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px] pt-6 opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}
                                >
                                    {/* Lista de pedidos do grupo */}
                                    <div className="mb-4 space-y-4">
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                            Pedidos Consolidados ({group.orders.length})
                                        </span>
                                        {group.orders.map((order) => {
                                            const orderCreatedAt = formatDate(order.createdAt);
                                            const orderPaymentLabel = order.paymentMethod && paymentLabels[order.paymentMethod]
                                                ? paymentLabels[order.paymentMethod]
                                                : 'Pagamento confirmado';

                                            return (
                                                <div
                                                    key={order._id}
                                                    className="rounded-xl border border-[#ded7ca]/50 bg-white/50 p-4"
                                                >
                                                    <div>
                                                        <span className="text-xs font-semibold text-[#a38f78]">
                                                            Pedido #{order.orderNumber}
                                                        </span>
                                                        <p className="text-xs text-[#7d796c] mt-1">
                                                            {orderCreatedAt} • {orderPaymentLabel}
                                                        </p>
                                                        <p className="text-xs font-medium text-[#4c4c55] mt-1">
                                                            {order.totalTickets} ingresso{order.totalTickets > 1 ? 's' : ''} • {currencyFormatter.format(order.totalAmount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Botão para visualizar ingressos */}
                                    <div className="flex justify-center mt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isMobileDevice() || isMobileViewport) {
                                                    // Mobile: abrir grupo consolidado com todos os tickets
                                                    setOpenGroupId(groupId);
                                                    setOpenOrderId(null); // Limpar orderId individual
                                                    setModalSlideIndex(0);
                                                } else {
                                                    // Desktop: mostrar modal de segurança
                                                    setShowSecurityModal(true);
                                                }
                                            }}
                                            className="flex items-center gap-2 rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-normal text-white shadow-[0_18px_38px_-22px_rgba(20,20,32,0.6)] transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                                        >
                                            <HiOutlineTicket className="text-base" />
                                            Visualizar Ingressos ({allTickets.length})
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    }

                    // Renderizar pedido individual
                    const order = item as OrderSummary;
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
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                            Pedido {order.orderNumber ? `#${order.orderNumber}` : ''}
                                        </span>
                                        <h3 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                            {eventName}
                                        </h3>
                                        <p className="text-xs text-[#7d796c]">
                                            {eventDate ? `${eventDate}` : 'Data a confirmar'}
                                            {eventLocation ? ` • ${eventLocation}` : ''}
                                        </p>

                                    </div>
                                    <div className="flex items-center gap-10 w-full md:w-auto">
                                        <div className="flex gap-3 w-full md:w-auto justify-between">
                                            <p className="text-black">
                                                Seu pedido foi:
                                                <span> {currencyFormatter.format(order.totalAmount ?? 0)}</span>
                                            </p>
                                            <span
                                                className={`flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-normal ${statusInfo.badgeClass}`}
                                            >
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        {/* Ícone de seta apenas no desktop */}
                                        <HiOutlineChevronDown
                                            className={`hidden md:block text-xl text-[#a38f78] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                            aria-hidden
                                        />
                                    </div>
                                </button>

                                {/* Botão dedicado para expandir no mobile */}
                                <div className="mt-4 flex md:hidden">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedOrderId((current) =>
                                                current === order._id ? null : order._id,
                                            )
                                        }
                                        className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#fff7ec] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#f97316]"
                                    >
                                        {isExpanded ? 'Recolher pedido' : 'Expandir pedido'}
                                    </button>
                                </div>
                            </header>

                            <div
                                className={`overflow-hidden gap-20 transition-all flex duration-500 ${isExpanded ? 'max-h-[1200px] pt-6 opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}
                            >
                                {/* Seção de PIX pendente */}
                                {order.status === 'pending' && order.paymentMethod === 'pix' && (
                                    order.pixInfo ? (
                                        <div className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-normal text-emerald-800">
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
                                                        className="md:h-48 md:w-48 h-full w-full rounded-lg border-2 border-emerald-200 bg-white p-2"
                                                    />
                                                </div>
                                            )}

                                            {/* Código PIX para copiar */}
                                            {(order.pixInfo.qrCode || order.pixInfo.ticketUrl) && (
                                                <div className="mb-4">
                                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                                        Código PIX (Copiar e Colar)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={order.pixInfo.qrCode || order.pixInfo.ticketUrl || ''}
                                                            className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-[#1a1a1d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    const codeToCopy = order.pixInfo!.qrCode || order.pixInfo!.ticketUrl || '';
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
                                        <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-normal text-amber-800">
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

                                {order.status === 'paid' && ticketsConfirmed > 0 && (
                                    <div className="flex-1 rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                            Ingressos
                                        </span>
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
                                                handleViewDetails(order._id);
                                            }}
                                            className="mt-4 flex gap-3 w-full md:w-fit text-center justify-center rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase text-white shadow-[0_18px_38px_-22px_rgba(20,20,32,0.6)] transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                                        >
                                            <HiOutlineTicket className="text-base" />
                                            Abrir ingressos
                                        </button>
                                    </div>
                                )}
                            </div>
                        </article>
                    );
                })}

                {ordersPagination && ordersPagination.total > orders.length && (
                    <p className="text-center text-xs uppercase tracking-[0.3em] text-[#7d796c]">
                        Exibindo {orders.length} de {ordersPagination.total} pedido{ordersPagination.total > 1 ? 's' : ''} recente{ordersPagination.total > 1 ? 's' : ''}.
                    </p>
                )}
            </div>
        );
    };

    const renderRequestsContent = () => (
        <div className="space-y-6">
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
            <main className="bg-[#f5f1e8]">
                <Container className="py-12">
                        <header className="mb-10 space-y-3 hidden md:block">
                            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                                Área do Cliente
                            </span>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <h1 className="text-3xl font-bold uppercase tracking-normal text-[#1a1a1d]">
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
                                                <span className="text-sm font-semibold uppercase tracking-normal">
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
            </main>

            {activeOrder ? (
                <TicketModal
                    order={activeOrder}
                    slideIndex={modalSlideIndex}
                    onClose={() => {
                        setOpenOrderId(null);
                        setOpenGroupId(null);
                        setModalSlideIndex(0);
                    }}
                    scrollRef={modalScrollRef}
                    onScroll={handleModalScroll}
                    isMobile={isMobileViewport}
                />
            ) : null}

            {/* Modal de Segurança para Desktop */}
            {showSecurityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md rounded-2xl border border-[#ded7ca] bg-white/95 p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setShowSecurityModal(false)}
                            className="absolute right-4 top-4 text-[#7d796c] hover:text-[#1a1a1d] transition"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                <HiOutlineExclamationTriangle className="h-6 w-6 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                Segurança e Comodidade
                            </h3>
                        </div>

                        <div className="space-y-4 text-sm text-[#4c4c55]">
                            <p>
                                Para sua <strong className="text-[#1a1a1d]">SEGURANÇA</strong> e <strong className="text-[#1a1a1d]">MAIOR COMODIDADE</strong>, seus ingressos estão disponíveis somente no <strong className="text-[#1a1a1d]">mobile</strong>.
                            </p>

                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-normal text-amber-800 mb-2">
                                    Proteções Ativas:
                                </p>
                                <ul className="space-y-2 text-xs text-amber-700">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Detecção de prints de tela</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Identificação de atividades suspeitas</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Proteção contra tentativas de burlar o sistema</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Visualização otimizada para dispositivos móveis</span>
                                    </li>
                                </ul>
                            </div>

                            <p className="text-xs text-[#7d796c]">
                                Acesse seus ingressos através do seu celular ou tablet para uma experiência segura e completa.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowSecurityModal(false)}
                            className="mt-6 w-full rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-normal text-white shadow-lg transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
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
                                const ticketUsed = ticket.status === 'used';
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
                                                    className="h-64 w-64 object-contain"
                                                />
                                            ) : ticketUsed ? (
                                                <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-[#ded7ca] bg-[#f5f1e8]/70 px-6 text-center text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[#a22d2d]">
                                                    QR Code já utilizado
                                                </div>
                                            ) : (
                                                <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-[#ded7ca] bg-[#f5f1e8]/70 px-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#7d796c]">
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

