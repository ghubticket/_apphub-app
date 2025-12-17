'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/shared/PageContainer';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { APP_NAME } from '@/lib/config';
import { useOrdersPolling } from './hooks/useOrdersPolling';
import { useParcelledOrdersPolling } from './hooks/useParcelledOrdersPolling';
import PaymentSuccessModal from '@/components/shared/PaymentSuccessModal';
import DashboardTabs from './components/DashboardTabs';
import OrdersList from './components/OrdersList';
import RequestsSection from './components/RequestsSection';
import TicketModal from './components/TicketModal';
import SecurityModal from './components/SecurityModal';
import { groupOrdersByEvent } from './utils/groupOrders';
import type { 
    TabKey, 
    OrderSummary, 
    OrderGroup, 
    OrderPagination,
    ParcelledOrderWithParcels,
    ParcelSummary
} from './types';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isReady } = useAuth();
    const [activeTab, setActiveTab] = useState<TabKey>('orders');

    // Limpar flag de PIX ativo ao carregar dashboard
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
    
    // Estados para pedidos parcelados
    const [parcelledOrders, setParcelledOrders] = useState<ParcelledOrderWithParcels[]>([]);
    const [parcelledLoading, setParcelledLoading] = useState<boolean>(false);
    const [parcelledError, setParcelledError] = useState<string>('');
    const [hasFetchedParcelled, setHasFetchedParcelled] = useState(false);
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);
    const [modalSlideIndex, setModalSlideIndex] = useState(0);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityModalEntering, setSecurityModalEntering] = useState(false);
    const modalScrollRef = useRef<HTMLDivElement | null>(null);

    // Estado para modal de pagamento aprovado
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
    const [paidOrderInfo, setPaidOrderInfo] = useState<{ orderNumber?: string; message?: string } | null>(null);

    // Estado para controlar quando o código PIX foi copiado (por chave única)
    const [pixCodeCopied, setPixCodeCopied] = useState<Record<string, boolean>>({});

    // Função para verificar se é mobile
    const isMobileDevice = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return (
            window.innerWidth < 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        );
    }, []);

    // Handler para abrir detalhes com verificação de segurança
    const handleViewDetails = useCallback(
        (orderId: string) => {
            if (isMobileDevice() || isMobileViewport) {
                // Mobile: permitir visualização normal
                setOpenOrderId(orderId);
            } else {
                // Desktop: mostrar modal de segurança
                setShowSecurityModal(true);
                requestAnimationFrame(() => {
                    setSecurityModalEntering(true);
                });
            }
        },
        [isMobileDevice, isMobileViewport],
    );

    const handleViewGroup = useCallback(
        (groupId: string) => {
            if (isMobileDevice() || isMobileViewport) {
                // Mobile: permitir visualização normal
                setOpenGroupId(groupId);
                setOpenOrderId(null);
                setModalSlideIndex(0);
            } else {
                // Desktop: mostrar modal de segurança
                setShowSecurityModal(true);
                requestAnimationFrame(() => {
                    setSecurityModalEntering(true);
                });
            }
        },
        [isMobileDevice, isMobileViewport],
    );

    const greetingName = useMemo(() => {
        if (!user) return 'Bem-vindo';
        const baseName = user.name || user.email || 'Bem-vindo';
        const [first] = baseName.trim().split(' ');
        return first || baseName;
    }, [user]);

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

            // Filtrar pedidos que NÃO sejam vinculados a parcelamentos
            // (evita duplicação - pedidos parcelados vêm de /parcelled-orders)
            const filteredOrdersRaw = Array.isArray(ordersRaw)
                ? ordersRaw.filter((order: any) => !order.parcelledOrder && !order.parcelledOrderId)
                : [];

            const normalizedOrders: OrderSummary[] = filteredOrdersRaw.map((order: any) => ({
                _id: order._id || order.id,
                orderNumber: order.orderNumber,
                status: ['pending', 'paid', 'cancelled', 'refunded'].includes(order.status)
                    ? order.status
                    : 'pending',
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
                pixInfo: order.pixInfo || undefined,
            }));

            // Agrupar pedidos pagos do mesmo evento
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

    const fetchParcelledOrders = useCallback(async () => {
        try {
            setParcelledLoading(true);
            setParcelledError('');

            const response = await api.get('/parcelled-orders');
            const data = response.data?.data;

            const ordersRaw = Array.isArray(data?.orders) ? data.orders : [];
            const parcelsRaw = data?.parcelsByOrder || {};

            const normalizedOrders: ParcelledOrderWithParcels[] = ordersRaw
                .map((order: any) => {
                    const orderId = order._id || order.id;
                    const orderParcels = parcelsRaw[orderId] || [];

                    const normalizedParcels: ParcelSummary[] = orderParcels.map((p: any) => ({
                        _id: p._id || p.id,
                        sequence: Number(p.sequence ?? 0),
                        amount: Number(p.amount ?? 0),
                        dueDate: p.dueDate,
                        status: p.status || 'pending',
                        paymentId: p.paymentId,
                        qrCode: p.qrCode,
                        qrCodeBase64: p.qrCodeBase64,
                        ticketUrl: p.ticketUrl,
                        paidAt: p.paidAt,
                    }));

                    return {
                        _id: orderId,
                        orderNumber: order.orderNumber,
                        event: order.event || null,
                        ticketType: order.ticketType || null,
                        totalAmount: Number(order.totalAmount ?? 0),
                        entryAmount: Number(order.entryAmount ?? 0),
                        installmentsCount: Number(order.installmentsCount ?? 1),
                        status: order.status || 'pending_entry',
                        paymentType: order.paymentType || 'pix',
                        createdAt: order.createdAt,
                        metadata: order.metadata || undefined,
                        tickets: Array.isArray(order.tickets) ? order.tickets : [],
                        parcels: normalizedParcels,
                    };
                })
                .filter((order: ParcelledOrderWithParcels) => {
                    // CRÍTICO: Só ocultar pedidos cancelados se a entrada NÃO foi paga
                    // Se entrada foi paga mas 2+ parcelas atrasadas → MOSTRAR (tem histórico)
                    if (order.status === 'cancelled') {
                        const entryParcel = order.parcels.find((p: ParcelSummary) => p.sequence === 0);
                        const entryWasPaid = entryParcel?.status === 'paid';
                        
                        // Só mostrar cancelados se a entrada foi paga
                        return entryWasPaid;
                    }
                    
                    // Mostrar todos os outros status (pending_entry, active, completed)
                    // IMPORTANTE: NÃO filtrar pending_entry mesmo com PIX expirado
                    // O backend vai cancelar, mas enquanto isso o usuário pode ver
                    return true;
                });

            setParcelledOrders(normalizedOrders);
        } catch (error: any) {
            let message: string;

            if (!error?.response) {
                message = 'Não foi possível conectar com o servidor.';
            } else {
                message =
                    error.response?.data?.message ||
                    error?.message ||
                    'Não foi possível carregar os pedidos parcelados.';
            }

            setParcelledError(message);
        } finally {
            setParcelledLoading(false);
            setHasFetchedParcelled(true);
        }
    }, []);

    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isReady, isAuthenticated, router]);

    // Fechar SecurityModal com ESC
    useEffect(() => {
        if (!showSecurityModal) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSecurityModalEntering(false);
                setTimeout(() => setShowSecurityModal(false), 250);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSecurityModal]);

    // Bloquear scroll quando SecurityModal estiver aberta
    useEffect(() => {
        if (!showSecurityModal) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [showSecurityModal]);

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
        if (activeTab === 'orders') {
            if (!hasFetchedOrders) {
                fetchOrders();
            }
            if (!hasFetchedParcelled) {
                fetchParcelledOrders();
            }
        }
    }, [activeTab, fetchOrders, fetchParcelledOrders, hasFetchedOrders, hasFetchedParcelled, isAuthenticated, isReady]);

    // Helper para verificar se é um grupo
    const isOrderGroup = (item: OrderSummary | OrderGroup): item is OrderGroup => {
        return 'orders' in item && Array.isArray((item as OrderGroup).orders);
    };

    // Callback quando pedido é pago (detectado via polling)
    const handleOrderPaid = useCallback(
        (orderId: string, order: any) => {
            const orderNumber = order?.orderNumber || order?.order_number || orderId;

            setPaidOrderInfo({
                orderNumber: orderNumber,
                message: 'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.',
            });
            setShowPaymentSuccessModal(true);

            setTimeout(() => {
                fetchOrders();
            }, 100);
        },
        [fetchOrders],
    );

    // Callback quando parcela é paga (detectado via polling)
    const handleParcelPaid = useCallback(
        async (parcelledOrderId: string, parcelId: string, sequence: number) => {
            try {
                const response = await api.get(`/parcelled-orders/${parcelledOrderId}`);
                const parcelledOrder = response.data?.data?.parcelledOrder;

                if (parcelledOrder) {
                    const eventName =
                        parcelledOrder.metadata?.eventName ||
                        parcelledOrder.event?.name ||
                        'Evento';

                    // Buscar parcelas para verificar se é a última
                    const parcelsResponse = await api.get(`/parcelled-orders/${parcelledOrderId}`);
                    const parcels = parcelsResponse.data?.data?.parcels || [];
                    const totalParcels = parcels.length;
                    const isLastParcel = sequence === totalParcels - 1;

                    let message = '';
                    if (sequence === 0) {
                        // Entrada
                        message = 'Entrada paga com sucesso! Seus ingressos estarão disponíveis quando todas as parcelas forem pagas.';
                    } else if (isLastParcel) {
                        // Última parcela
                        message = '🎉 Parabéns! Você quitou seu pacote! Seus ingressos estão disponíveis agora.';
                    } else {
                        // Parcelas intermediárias
                        message = `Parcela ${sequence + 1} paga com sucesso! Continue pagando as demais parcelas para liberar seus ingressos.`;
                    }

                    setPaidOrderInfo({
                        orderNumber: `${eventName} - Parcela ${sequence + 1}`,
                        message,
                    });
                    setShowPaymentSuccessModal(true);

                    setTimeout(() => {
                        fetchParcelledOrders();
                    }, 100);
                }
            } catch (error) {
                setPaidOrderInfo({
                    orderNumber: `Parcela ${sequence + 1}`,
                    message: sequence === 0
                        ? 'Entrada paga com sucesso!'
                        : 'Parcela paga com sucesso!',
                });
                setShowPaymentSuccessModal(true);
            }
        },
        [fetchParcelledOrders],
    );

    // Polling de pedidos pendentes
    const shouldPoll = activeTab === 'orders' && isAuthenticated && isReady;

    const { isPolling } = useOrdersPolling({
        enabled: shouldPoll,
        onOrderPaid: handleOrderPaid,
    });

    // Polling de pedidos parcelados
    const { isPolling: isPollingParcelled } = useParcelledOrdersPolling({
        enabled: shouldPoll, // Mesmo que pedidos normais - sempre que estiver na aba Orders
        onParcelPaid: handleParcelPaid,
    });

    // Helper para encontrar pedido ativo ou criar ordem consolidada de grupo
    const activeOrder = useMemo(() => {
        if (openGroupId) {
            const group = orders.find(
                (item) =>
                    isOrderGroup(item) &&
                    `group-${(item as OrderGroup).eventId}` === openGroupId,
            ) as OrderGroup | undefined;
            if (group) {
                const allTickets = group.orders.flatMap((o) => {
                    if (Array.isArray(o.tickets)) {
                        return o.tickets;
                    }
                    return [];
                });

                const realTotalTickets = allTickets.length;
                const firstOrder = group.orders[0];
                return {
                    ...firstOrder,
                    _id: `group-${group.eventId}`,
                    orderNumber: `${group.orders.length} Pedidos Consolidados`,
                    totalTickets: realTotalTickets,
                    totalAmount: group.totalAmount,
                    tickets: allTickets,
                } as OrderSummary;
            }
        }

        if (openOrderId) {
            for (const item of orders) {
                if (isOrderGroup(item)) {
                    const found = item.orders.find((o) => o._id === openOrderId);
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
            setModalSlideIndex(0);
            setTimeout(() => {
                if (modalScrollRef.current) {
                    modalScrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
                }
            }, 100);
        }
    }, [activeOrder?._id]);

    const handleModalScroll = useCallback(() => {
        if (!modalScrollRef.current || !activeOrder) return;
        const container = modalScrollRef.current;

        const slides = Array.from(container.children) as HTMLElement[];
        if (slides.length === 0) return;

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

            const maxIndex = Math.max(0, activeOrder.tickets.length - 1);
            const clamped = Math.max(0, Math.min(maxIndex, closestIndex));

            setModalSlideIndex((currentIndex) => {
                if (clamped !== currentIndex) {
                    return clamped;
                }
                return currentIndex;
            });
        });
    }, [activeOrder]);

    const handleCopyPixCode = useCallback(async (key: string, code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setPixCodeCopied((prev) => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setPixCodeCopied((prev) => ({ ...prev, [key]: false }));
            }, 2000);
        } catch (error) {
            // Fallback para navegadores antigos
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setPixCodeCopied((prev) => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setPixCodeCopied((prev) => ({ ...prev, [key]: false }));
            }, 2000);
        }
    }, []);

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'orders':
                return (
                    <OrdersList
                        orders={orders}
                        parcelledOrders={parcelledOrders}
                        loading={ordersLoading || parcelledLoading}
                        error={ordersError || parcelledError}
                        isPolling={isPolling}
                        isPollingParcelled={isPollingParcelled}
                        onViewDetails={handleViewDetails}
                        onViewGroup={handleViewGroup}
                        isMobileDevice={isMobileDevice}
                        isMobileViewport={isMobileViewport}
                        pixCodeCopied={pixCodeCopied}
                        onCopyPixCode={handleCopyPixCode}
                    />
                );
            case 'requests':
                return <RequestsSection userName={user?.name} userEmail={user?.email} />;
            default:
                return (
                    <OrdersList
                        orders={orders}
                        parcelledOrders={parcelledOrders}
                        loading={ordersLoading || parcelledLoading}
                        error={ordersError || parcelledError}
                        isPolling={isPolling}
                        isPollingParcelled={isPollingParcelled}
                        onViewDetails={handleViewDetails}
                        onViewGroup={handleViewGroup}
                        isMobileDevice={isMobileDevice}
                        isMobileViewport={isMobileViewport}
                        pixCodeCopied={pixCodeCopied}
                        onCopyPixCode={handleCopyPixCode}
                    />
                );
        }
    };

    return (
        <>
            <PageContainer bgColor="bg-[#faf7f0]">
                <header className="mb-10 space-y-3 hidden md:block">
                    <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                        Área do Cliente
                    </span>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h1 className="text-3xl font-bold uppercase tracking-normal text-[#1a1a1d]">
                            Dashboard {APP_NAME}
                        </h1>
                        <p className="text-sm text-[#4c4c55]">
                            {greetingName}, gerencie sua conta, pedidos e solicitações em um só lugar.
                        </p>
                    </div>
                </header>

                <section className="space-y-10">
                    <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

                    <section>{renderActiveTabContent()}</section>
                </section>
            </PageContainer>

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

            <SecurityModal
                isOpen={showSecurityModal}
                isEntering={securityModalEntering}
                onClose={() => {
                    setSecurityModalEntering(false);
                    setTimeout(() => setShowSecurityModal(false), 250);
                }}
            />

            <PaymentSuccessModal
                isOpen={showPaymentSuccessModal}
                onClose={() => {
                    setShowPaymentSuccessModal(false);
                    setPaidOrderInfo(null);
                    setActiveTab('orders');
                    setTimeout(() => {
                        fetchOrders();
                        fetchParcelledOrders();
                    }, 100);
                }}
                orderNumber={paidOrderInfo?.orderNumber}
                message={
                    paidOrderInfo?.message ||
                    'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.'
                }
            />
        </>
    );
}
