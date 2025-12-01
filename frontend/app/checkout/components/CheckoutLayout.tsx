'use client';

import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
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
import { useCheckoutNavigation } from '../hooks/useCheckoutNavigation';
import { useCheckoutStorage } from '../hooks/useCheckoutStorage';
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
    const navigation = useCheckoutNavigation();

    // Carregar dados do carrinho
    const { summarizedCart, totalAmount, totalTickets, loading: cartLoading, refreshCart } = useCheckoutCart();

    // Carregar dados do comprador
    const { customerData, handleChange: handleCustomerChange } = useCheckoutCustomer();

    // Estado para código de promotor aplicado
    const [promoterCode, setPromoterCode] = useState<string | null>(null);

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
    } = useCheckoutOrder(summarizedCart, customerData, promoterCode);

    // Atualizar código de promotor no pedido existente via API
    // REFATORADO: Simplificado - lógica movida para hooks especializados
    const handlePromoterCodeChange = useCallback(async (code: string | null) => {
        // Se código é null, apenas limpar
        if (!code) {
            setPromoterCode(null);
            return;
        }

        // Se já existe um pedido REAL (não fake), atualizar via API sem resetar nada
        if (order?._id && !order._id.startsWith('fake-')) {
            try {
                const response = await api.patch(`/orders/${order._id}/promoter-code`, {
                    promoterCode: code,
                });

                if (response.data?.success && response.data?.data?.order) {
                    await refreshOrder();
                }
            } catch (error: any) {
                // Reverter estado do código se houver erro
                setPromoterCode(promoterCode);
                // Log do erro para debug
                console.error('[CheckoutLayout] ❌ Erro ao atualizar código de promotor:', {
                    error: error?.response?.data?.message || error?.message,
                    orderId: order._id,
                    code,
                });
            }
        } else if (order?._id?.startsWith('fake-')) {
            // Pedido fake: validar código via API para mostrar feedback visual
            // O código será aplicado quando o pedido real for criado
            const eventId = summarizedCart[0]?.eventId;
            if (eventId) {
                try {
                    const response = await api.get(`/promoters/validate`, {
                        params: {
                            code: code.toUpperCase().trim(),
                            eventId,
                        },
                    });

                    const result = response.data;
                    if (result?.valid && result?.data) {
                        // Código válido: salvar no estado para aplicar quando pedido real for criado
                        setPromoterCode(code);
                        console.log('[CheckoutLayout] ✅ Código validado (pedido fake), será aplicado quando pedido real for criado');
                    } else {
                        // Código inválido: não salvar e deixar o CheckoutCartSummary mostrar o erro
                        setPromoterCode(null);
                        console.log('[CheckoutLayout] ❌ Código inválido (pedido fake)');
                    }
                } catch (error: any) {
                    // Em caso de erro na validação, não salvar o código
                    setPromoterCode(null);
                    console.error('[CheckoutLayout] ❌ Erro ao validar código de promotor:', {
                        error: error?.response?.data?.message || error?.message,
                        code,
                    });
                }
            } else {
                // Sem eventId, apenas salvar no estado
                setPromoterCode(code);
            }
        } else {
            // Sem pedido ainda: apenas salvar no estado
            setPromoterCode(code);
        }
    }, [order?._id, promoterCode, refreshOrder, summarizedCart]);

    // Ler código de desconto do sessionStorage quando o pedido for criado
    // CRÍTICO: Usar useRef para evitar loop infinito
    const promoterCodeAppliedRef = useRef(false);
    useEffect(() => {
        // Só aplicar código se não houver código já aplicado e se houver um pedido e eventId do carrinho
        // E se ainda não foi aplicado anteriormente (evitar loop)
        if (!promoterCode && !promoterCodeAppliedRef.current && order?._id && summarizedCart.length > 0) {
            const eventId = summarizedCart[0]?.eventId;
            if (eventId && typeof window !== 'undefined') {
                const storageKey = `promoter_code_${eventId}`;
                const savedCode = window.sessionStorage.getItem(storageKey);
                if (savedCode) {
                    // Marcar como aplicado ANTES de chamar para evitar loop
                    promoterCodeAppliedRef.current = true;
                    // Aplicar código automaticamente
                    handlePromoterCodeChange(savedCode);
                }
            }
        }
        // Resetar flag se o pedido mudar
        if (!order?._id) {
            promoterCodeAppliedRef.current = false;
        }
    }, [order?._id, summarizedCart.length, promoterCode]); // Removido handlePromoterCodeChange das dependências

    // Hooks de pagamento
    // NOVO: Passar dados do carrinho e cliente para criar pedido real quando pagar com cartão
    const cardPayment = useCardPayment(order?._id ?? null);
    
    // Adicionar dados do carrinho e cliente ao processPayment quando orderId for fake
    const originalProcessPayment = cardPayment.processPayment;
    const enhancedProcessPayment = useCallback(async (orderId: string, paymentData: any) => {
        const isFakeOrder = orderId.startsWith('fake-');
        if (isFakeOrder) {
            // Adicionar dados do carrinho e cliente ao paymentData
            paymentData.cartItems = summarizedCart;
            paymentData.customerData = customerData;
            if (promoterCode) {
                paymentData.promoterCode = promoterCode;
            }
        }
        return originalProcessPayment(orderId, paymentData);
    }, [originalProcessPayment, summarizedCart, customerData, promoterCode]);
    
    // Substituir processPayment
    const cardPaymentWithData = {
        ...cardPayment,
        processPayment: enhancedProcessPayment,
    };
    const pixPayment = usePixPayment(
        order?._id ?? null, 
        order?.expiresAt ?? null,
        summarizedCart,
        customerData,
        promoterCode
    );

    // Estado consolidado do checkout
    const checkoutState = useCheckoutState({
        order,
        cardPaymentStatus: cardPaymentWithData.status,
        cardPaymentRedirectCountdown: cardPaymentWithData.redirectCountdown,
        pixPaymentStatus: pixPayment.status,
        pixPaymentRedirectCountdown: pixPayment.redirectCountdown,
        pixResult: pixPayment.pixResult,
    });

    const [isEditingCustomer, setIsEditingCustomer] = useState(false);

    // Order cleanup hook
    const orderCleanup = useOrderCleanup({
        clearOrder,
        refreshCart,
    });

    // Hook de storage para verificar flag PIX
    const storage = useCheckoutStorage();

    // Restaurar flag de navegação se houver flag PIX ativa (após reload)
    // CRÍTICO: Usar ref para evitar loop infinito
    const pixFlagCheckedRef = useRef(false);
    useEffect(() => {
        if (pixFlagCheckedRef.current) return;
        
        const pixOrderId = storage.getPixOrderActive();
        if (pixOrderId) {
            pixFlagCheckedRef.current = true;
            navigation.allowNavigation();
        }
    }, []); // Executar apenas uma vez na montagem

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
    // Regra: só bloquear navegação enquanto ainda NÃO há PIX gerado nem pagamento aprovado.
    // Após gerar o QR Code PIX (hasGeneratedPix=true), o usuário pode sair livremente e o pedido
    // será cancelado somente pelas regras de expiração do backend.
    // CRÍTICO: Também verificar flag PIX no sessionStorage para garantir navegação liberada após reload
    const hasPixActiveFlag = useMemo(() => {
        return storage.getPixOrderActive() !== null;
    }, [storage]);

    useNavigationGuard({
        enabled:
            !checkoutState.isPaymentApproved &&
            !checkoutState.hasGeneratedPix &&
            !hasPixActiveFlag && // CRÍTICO: Se há flag PIX ativa, não bloquear navegação
            (!!(order && order.status === 'pending') || checkoutState.hasPendingOrderInStorage),
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

        // NOVO: Se pedido é fake, apenas limpar estado local (não chamar backend)
        const isFakeOrder = order._id.startsWith('fake-');
        if (isFakeOrder) {
            console.log('[CheckoutLayout] 🎭 Pedido fake detectado, apenas limpando estado local');
            orderCleanup.cleanupAll(order._id, { skipBackend: true });
            router.refresh();
            return;
        }

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
                // NOVO: Se pedido é fake, não chamar backend
                const isFakeOrder = order._id.startsWith('fake-');
                if (!isFakeOrder) {
                    try {
                        console.log('[CheckoutLayout] 🗑️ Cancelando pedido antes de limpar carrinho:', order._id);
                        await api.post(`/orders/${order._id}/cancel`);
                        console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso');
                    } catch (cancelErr: any) {
                        if (cancelErr?.response?.status !== 404) {
                            console.error('[CheckoutLayout] ⚠️ Erro ao cancelar pedido:', cancelErr);
                        }
                    }
                } else {
                    console.log('[CheckoutLayout] 🎭 Pedido fake detectado, pulando cancelamento no backend');
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

        // NOVO: Se pedido é fake, apenas limpar estado local (não chamar backend)
        const isFakeOrder = orderId.startsWith('fake-');
        if (isFakeOrder) {
            console.log('[CheckoutLayout] 🎭 Pedido fake detectado, apenas limpando estado local e saindo');
            orderCleanup.cleanupAll(orderId, { skipBackend: true, redirectTo: '/' });
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
        // Usar a função de navegação que já limpa tudo (pedido, carrinho, storage)
        // Isso garante consistência com outros pontos de navegação
        navigation.navigateToHome();
    }, [navigation]);

    // Calcular expiresAt para o timer (sempre usa o expiresAt do pedido)
    const timerExpiresAt = order?.expiresAt || null;

    // OTIMIZADO: Memoizar displayTotalAmount para evitar recálculos desnecessários
    const displayTotalAmount = useMemo(() => {
        return order?.totalAmount ?? totalAmount;
    }, [order?.totalAmount, totalAmount]);

    // CRÍTICO: Mostrar loading IMEDIATAMENTE se não há pedido mas há condições para criar um
    // Isso garante que o loading apareça antes de qualquer renderização
    // IMPORTANTE: Não mostrar loading de criação se já existe pedido no storage (será restaurado)
    // OTIMIZADO: Usar ref para verificar storage apenas uma vez e evitar recálculos
    const savedOrderIdRef = useRef<string | null>(null);
    if (savedOrderIdRef.current === null) {
        savedOrderIdRef.current = storageHelpers.loadActiveOrderId();
    }
    
    const shouldShowInitialLoading = useMemo(() => {
        // Se já está carregando (cart ou order), mostrar loading
        if (cartLoading || orderLoading) {
            return true;
        }
        
        // Verificar se há pedido no storage - se houver, não mostrar loading de criação
        if (savedOrderIdRef.current) {
            console.log('[CheckoutLayout] ℹ️ Pedido encontrado no storage, não mostrando loading de criação (será restaurado)');
            return false;
        }
        
        // Se não há pedido e não há pedido no storage, mas há itens no carrinho e dados do cliente, mostrar loading
        // Isso faz o loading aparecer IMEDIATAMENTE ao entrar no checkout para criar novo pedido
        if (!order && summarizedCart.length > 0 && customerData.name && customerData.email) {
            console.log('[CheckoutLayout] 🚀 Mostrando loading inicial - condições para criar pedido atendidas');
            return true;
        }
        
        return false;
    }, [cartLoading, orderLoading, order, summarizedCart.length, customerData.name, customerData.email]);

    // Mostrar loading
    if (shouldShowInitialLoading) {
        return <CheckoutLoadingState cartLoading={cartLoading} orderLoading={orderLoading || (!order && summarizedCart.length > 0)} />;
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
            <Container className="py-10">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                    <section className="space-y-6">
                        {checkoutState.timerActive && (
                            <>
                                <CheckoutTimer
                                    isActive={checkoutState.timerActive}
                                    onExpire={handleTimerExpire}
                                    expiresAt={timerExpiresAt}
                                    initialRemainingSeconds={checkoutState.remainingSeconds}
                                    key={order?.expiresAt ? String(order.expiresAt) : 'no-expires'}
                                />
                            </>
                        )}

                        <CheckoutCartSummary
                            items={summarizedCart}
                            totalTickets={totalTickets}
                            totalAmount={displayTotalAmount}
                            pixPaymentActive={!!pixPayment.pixResult}
                            onRemoveItem={handleRemoveItem}
                            onPromoterCodeApplied={handlePromoterCodeChange}
                            orderPromoterCode={order?.promoterCode || null}
                            orderDiscountAmount={order?.discountAmount || 0}
                            pendingPromoterCode={order?._id?.startsWith('fake-') ? promoterCode : null}
                        />

                        <CustomerDataForm
                            data={customerData}
                            disabled={!isEditingCustomer}
                            onChange={handleCustomerChange}
                            docTypeReady={true}
                            showEditToggle
                            onEditClick={() => setIsEditingCustomer((prev) => !prev)}
                        />
                    </section>

                    <section className="space-y-6">
                        <PaymentSection
                            selectedTab={checkoutState.selectedTab}
                            onTabChange={checkoutState.setSelectedTab}
                            pixPaymentActive={!!pixPayment.pixResult}
                            orderId={order?._id || null}
                            orderExpiresAt={order?.expiresAt || null}
                            totalAmount={displayTotalAmount}
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

