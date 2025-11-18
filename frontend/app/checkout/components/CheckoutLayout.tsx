'use client';

import { useEffect, useCallback } from 'react';
import Container from '@/components/shared/Container';
import { CheckoutHeader } from './CheckoutHeader';
import { CheckoutTimer } from './CheckoutTimer';
import { CheckoutCartSummary } from './CheckoutCartSummary';
import { CustomerDataForm } from './CustomerDataForm';
import { PaymentSection } from './PaymentSection';
import { OrderRestoreModal } from './OrderRestoreModal';
import { OrderExitWarningModal } from './OrderExitWarningModal';
import { OrderExpiredModal } from './OrderExpiredModal';
import { CheckoutErrorDisplay } from './CheckoutErrorDisplay';
import { CheckoutLoadingState } from './CheckoutLoadingState';
import { CheckoutEmptyState } from './CheckoutEmptyState';
import { useCheckoutCart } from '../hooks/useCheckoutCart';
import { useCheckoutCustomer } from '../hooks/useCheckoutCustomer';
import { useCheckoutOrder } from '../hooks/useCheckoutOrder';
import { useCheckoutState } from '../hooks/useCheckoutState';
import { useOrderCleanup } from '../hooks/useOrderCleanup';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { useCardPayment } from '../hooks/useCardPayment';
import { usePixPayment } from '../hooks/usePixPayment';
import { clearCartItems } from '@/lib/cart';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { storageHelpers } from '../utils/storageHelpers';

/**
 * Componente principal do checkout
 * REFATORADO: Usa hooks especializados e componentes extraídos
 * Reduzido de 771 para ~400 linhas
 */
export function CheckoutLayout() {
    const router = useRouter();

    // Carregar dados do carrinho
    const { summarizedCart, totalAmount, totalTickets, loading: cartLoading, refreshCart } = useCheckoutCart();

    // Carregar dados do comprador
    const { customerData, handleChange: handleCustomerChange } = useCheckoutCustomer();

    // Criar/gerenciar pedido
    const { 
        order, 
        loading: orderLoading, 
        error: orderError, 
        refreshOrder, 
        clearOrder, 
        resetRateLimitBlock, 
        rateLimitRemainingSeconds, 
        showRestoreModal, 
        closeRestoreModal, 
        showExpiredModal, 
        closeExpiredModal, 
        createOrder 
    } = useCheckoutOrder(summarizedCart, customerData);

    // Hooks de pagamento
    const cardPayment = useCardPayment(order?._id ?? null);
    const pixPayment = usePixPayment(order?._id ?? null, order?.expiresAt ?? null);

    // Estado consolidado do checkout
    const checkoutState = useCheckoutState({
        order,
        cardPaymentStatus: cardPayment.status,
        cardPaymentRedirectCountdown: cardPayment.redirectCountdown,
        pixPaymentStatus: pixPayment.status,
        pixPaymentRedirectCountdown: pixPayment.redirectCountdown,
        pixResult: pixPayment.pixResult,
    });

    // Order cleanup hook
    const orderCleanup = useOrderCleanup({
        clearOrder,
        refreshCart,
    });

    // Escutar mudanças no storage para sincronizar entre abas
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === '5521-active-order-id') {
                // O hook useCheckoutOrder já gerencia isso
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Navigation guard
    useNavigationGuard({
        enabled: (!checkoutState.isPaymentApproved && (!!(order && order.status === 'pending') || checkoutState.hasPendingOrderInStorage)),
        onNavigationAttempt: () => {
            checkoutState.setShowExitWarning(true);
        },
        allowedPaths: ['/checkout'],
    });

    // Limpar carrinho quando modal de expiração aparecer
    useEffect(() => {
        if (showExpiredModal) {
            console.log('[CheckoutLayout] 🧹 Limpando carrinho porque pedido expirou');
            clearCartItems();
            refreshCart();
        }
    }, [showExpiredModal, refreshCart]);

    // Handler para expiração do timer
    const handleTimerExpire = useCallback(async () => {
        console.log('[CheckoutLayout] ⏰ Timer do pedido expirado! Redirecionando diretamente...');
        closeExpiredModal();
        const orderId = order?._id ?? null;

        if (orderId) {
            try {
                console.log('[CheckoutLayout] 🗑️ Cancelando pedido expirado:', orderId);
                await api.post(`/orders/${orderId}/cancel`);
                console.log('[CheckoutLayout] ✅ Pedido expirado cancelado com sucesso, estoque devolvido');
            } catch (err: any) {
                if (err?.response?.status !== 404) {
                    console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido expirado:', err);
                }
            }
        }

        orderCleanup.cleanupAll(orderId, { skipBackend: false, redirectTo: '/' });
    }, [order?._id, closeExpiredModal, orderCleanup]);

    // Handlers de modais
    const handleContinueOrder = useCallback(() => {
        closeRestoreModal();
    }, [closeRestoreModal]);

    const handleCloseModal = useCallback(() => {
        closeRestoreModal();
    }, [closeRestoreModal]);

    const handleCreateNewOrder = useCallback(async () => {
        console.log('[CheckoutLayout] 🔄 Usuário confirmou criação de novo pedido após expiração');
        closeExpiredModal();
        clearCartItems();
        refreshCart();
        await createOrder();
    }, [closeExpiredModal, refreshCart, createOrder]);

    const handleCloseExpiredModal = useCallback(() => {
        closeExpiredModal();
    }, [closeExpiredModal]);

    // Handlers de cancelamento
    const handleCancelOrder = useCallback(async () => {
        if (!order) {
            console.log('[CheckoutLayout] ⚠️ handleCancelOrder chamado mas não há pedido');
            return;
        }

        console.log('[CheckoutLayout] 🗑️ Cancelando pedido:', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
        });

        try {
            await api.post(`/orders/${order._id}/cancel`);
            console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso no backend');
            orderCleanup.cleanupAll(order._id, { skipBackend: false });
            router.refresh();
        } catch (err: any) {
            if (err?.response?.status === 404) {
                console.log('[CheckoutLayout] ⚠️ Pedido já não existe (404), limpando estado local');
                orderCleanup.cleanupAll(order._id, { skipBackend: true });
                router.refresh();
                return;
            }
            console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido:', err);
            orderCleanup.cleanupAll(order._id, { skipBackend: true });
        }
    }, [order, orderCleanup, router]);

    const handleStayOnPage = useCallback(() => {
        console.log('[CheckoutLayout] ✅ Usuário escolheu continuar no checkout');
        checkoutState.setShowExitWarning(false);
    }, [checkoutState]);

    const handleRemoveItem = useCallback(async (itemId: string) => {
        console.log('[CheckoutLayout] 🗑️ Removendo item do carrinho e limpando tudo:', itemId);
        
        try {
            if (order?._id) {
                try {
                    console.log('[CheckoutLayout] 🗑️ Cancelando pedido antes de limpar carrinho:', order._id);
                    await api.post(`/orders/${order._id}/cancel`);
                    console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso');
                } catch (cancelErr: any) {
                    if (cancelErr?.response?.status !== 404) {
                        console.error('[CheckoutLayout] ⚠️ Erro ao cancelar pedido:', cancelErr);
                    }
                }
            }
            
            orderCleanup.cleanupAll(order?._id || null, { skipBackend: false, redirectTo: '/' });
        } catch (error: any) {
            console.error('[CheckoutLayout] ❌ Erro ao remover item e limpar carrinho:', error);
            orderCleanup.cleanupAll(order?._id || null, { skipBackend: true, redirectTo: '/' });
        }
    }, [order?._id, orderCleanup]);

    const handleCancelOrderAndGoHome = useCallback(async () => {
        console.log('[CheckoutLayout] 🗑️ Cancelando pedido e redirecionando para home (do modal de erro)');
        orderCleanup.cleanupAll(order?._id || null, { skipBackend: false, redirectTo: '/' });
    }, [order?._id, orderCleanup]);

    const handleLeavePage = useCallback(async () => {
        console.log('[CheckoutLayout] 🚪 Usuário escolheu sair do checkout');
        checkoutState.setShowExitWarning(false);

        const orderId = order?._id;
        console.log('[CheckoutLayout] 📋 OrderId para cancelar:', {
            orderId,
            fromOrder: !!order?._id,
        });

        if (!orderId) {
            console.log('[CheckoutLayout] ⚠️ Nenhum pedido encontrado, apenas saindo');
            orderCleanup.cleanupAll(null, { skipBackend: true, redirectTo: '/' });
            return;
        }

        try {
            console.log('[CheckoutLayout] 🗑️ Cancelando pedido antes de sair:', orderId);
            await api.post(`/orders/${orderId}/cancel`);
            console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso, limpando estado');
            orderCleanup.cleanupAll(orderId, { skipBackend: false, redirectTo: '/' });
        } catch (err: any) {
            if (err?.response?.status === 404) {
                console.log('[CheckoutLayout] ⚠️ Pedido já não existe (404), limpando estado local e saindo');
                orderCleanup.cleanupAll(orderId, { skipBackend: true, redirectTo: '/' });
                return;
            }
            console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido ao sair:', err);
            orderCleanup.cleanupAll(orderId, { skipBackend: true, redirectTo: '/' });
        }
    }, [order?._id, orderCleanup, checkoutState]);

    // Handlers para erro
    const handleRetryCreateOrder = useCallback(async () => {
        console.log('[CheckoutLayout] 🔄 Tentando criar pedido novamente após erro');
        try {
            storageHelpers.clearActiveOrderId();
            storageHelpers.clearTimerStartTime();
            await createOrder();
        } catch (err) {
            console.error('[CheckoutLayout] ❌ Erro ao tentar criar pedido novamente:', err);
        }
    }, [createOrder]);

    const handleGoHome = useCallback(() => {
        clearOrder();
        clearCartItems();
        refreshCart();
        router.push('/');
    }, [clearOrder, refreshCart, router]);

    // Calcular expiresAt para o timer (sempre usa o expiresAt do pedido)
    const timerExpiresAt = order?.expiresAt || null;

    // Mostrar loading
    if (cartLoading || orderLoading) {
        return <CheckoutLoadingState cartLoading={cartLoading} orderLoading={orderLoading} />;
    }

    // Mostrar erro
    if (orderError && summarizedCart.length > 0) {
        return (
            <CheckoutErrorDisplay
                error={orderError}
                rateLimitRemainingSeconds={rateLimitRemainingSeconds}
                orderLoading={orderLoading}
                onRetry={handleRetryCreateOrder}
                onResetRateLimit={() => {
                    resetRateLimitBlock();
                    window.location.reload();
                }}
                onGoHome={handleGoHome}
            />
        );
    }

    // Mostrar carrinho vazio
    if (summarizedCart.length === 0) {
        return <CheckoutEmptyState />;
    }

    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">
                <CheckoutHeader />

                <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                    <section className="space-y-6">
                        {checkoutState.timerActive && (
                            <CheckoutTimer
                                isActive={checkoutState.timerActive}
                                onExpire={handleTimerExpire}
                                expiresAt={timerExpiresAt}
                                initialRemainingSeconds={checkoutState.remainingSeconds}
                                key={order?.expiresAt ? String(order.expiresAt) : 'no-expires'}
                            />
                        )}

                        <CheckoutCartSummary
                            items={summarizedCart}
                            totalTickets={totalTickets}
                            totalAmount={totalAmount}
                            pixPaymentActive={checkoutState.hasPendingPayment}
                            onRemoveItem={handleRemoveItem}
                        />

                        <CustomerDataForm
                            data={customerData}
                            disabled={false}
                            onChange={handleCustomerChange}
                            docTypeReady={true}
                        />
                    </section>

                    <section className="space-y-6">
                        <PaymentSection
                            selectedTab={checkoutState.selectedTab}
                            onTabChange={checkoutState.setSelectedTab}
                            pixPaymentActive={!!pixPayment.pixResult}
                            orderId={order?._id || null}
                            orderExpiresAt={order?.expiresAt || null}
                            totalAmount={totalAmount}
                            customerEmail={customerData.email}
                            onCancelOrder={handleCancelOrderAndGoHome}
                        />
                    </section>
                </div>
            </Container>

            {showRestoreModal && order && order.status === 'pending' && (
                <OrderRestoreModal
                    order={order}
                    onContinue={handleContinueOrder}
                    onCancel={handleCancelOrder}
                    onClose={handleCloseModal}
                />
            )}

            {checkoutState.showExitWarning && (order || checkoutState.hasPendingOrderInStorage) && (
                <OrderExitWarningModal
                    order={order || {
                        _id: storageHelpers.loadActiveOrderId() || '',
                        orderNumber: '...',
                        status: 'pending' as const,
                        totalAmount: 0,
                        totalTickets: 0,
                    }}
                    onStay={handleStayOnPage}
                    onLeave={handleLeavePage}
                />
            )}

            {showExpiredModal && (
                <OrderExpiredModal
                    onCreateNew={handleCreateNewOrder}
                    onClose={handleCloseExpiredModal}
                />
            )}
        </main>
    );
}
