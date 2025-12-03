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
import { calculateTotalWithDiscount } from '../utils/calculateTotalWithDiscount';
import type { AppliedDiscountInfo } from '../hooks/usePromoterCodeState';

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
    
    // Estado para informações do desconto aplicado (para cálculo local antes do pedido ser criado)
    const [appliedDiscountInfo, setAppliedDiscountInfo] = useState<AppliedDiscountInfo | null>(null);

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
                    } else {
                        // Código inválido: não salvar e deixar o CheckoutCartSummary mostrar o erro
                        setPromoterCode(null);
                    }
                } catch (error: any) {
                    // Em caso de erro na validação, não salvar o código
                    setPromoterCode(null);
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
            clearCartItems();
            refreshCart();
        }
    }, [showExpiredModal, refreshCart]);

    // Handler para expiração do timer
    const handleTimerExpire = useCallback(async () => {
        closeExpiredModal();
        const orderId = order?._id ?? null;

        if (orderId) {
            try {
                await api.post(`/orders/${orderId}/cancel`);
            } catch (err: any) {
                // Ignorar erro 404 (pedido já não existe)
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
            return;
        }

        // NOVO: Se pedido é fake, apenas limpar estado local (não chamar backend)
        const isFakeOrder = order._id.startsWith('fake-');
        if (isFakeOrder) {
            orderCleanup.cleanupAll(order._id, { skipBackend: true });
            router.refresh();
            return;
        }

        try {
            await api.post(`/orders/${order._id}/cancel`);
            orderCleanup.cleanupAll(order._id, { skipBackend: false });
            router.refresh();
        } catch (err: any) {
            if (err?.response?.status === 404) {
                orderCleanup.cleanupAll(order._id, { skipBackend: true });
                router.refresh();
                return;
            }
            orderCleanup.cleanupAll(order._id, { skipBackend: true });
        }
    }, [order, orderCleanup, router]);

    const handleStayOnPage = useCallback(() => {
        checkoutState.setShowExitWarning(false);
    }, [checkoutState]);

    const handleRemoveItem = useCallback(async (itemId: string) => {
        try {
            if (order?._id) {
                // NOVO: Se pedido é fake, não chamar backend
                const isFakeOrder = order._id.startsWith('fake-');
                if (!isFakeOrder) {
                    try {
                        await api.post(`/orders/${order._id}/cancel`);
                    } catch (cancelErr: any) {
                        // Ignorar erro 404
                    }
                }
            }

            orderCleanup.cleanupAll(order?._id || null, { skipBackend: false, redirectTo: '/' });
        } catch (error: any) {
            orderCleanup.cleanupAll(order?._id || null, { skipBackend: true, redirectTo: '/' });
        }
    }, [order?._id, orderCleanup]);

    const handleCancelOrderAndGoHome = useCallback(async () => {
        orderCleanup.cleanupAll(order?._id || null, { skipBackend: false, redirectTo: '/' });
    }, [order?._id, orderCleanup]);

    const handleLeavePage = useCallback(async () => {
        checkoutState.setShowExitWarning(false);

        const orderId = order?._id;

        if (!orderId) {
            orderCleanup.cleanupAll(null, { skipBackend: true, redirectTo: '/' });
            return;
        }

        // NOVO: Se pedido é fake, apenas limpar estado local (não chamar backend)
        const isFakeOrder = orderId.startsWith('fake-');
        if (isFakeOrder) {
            orderCleanup.cleanupAll(orderId, { skipBackend: true, redirectTo: '/' });
            return;
        }

        try {
            await api.post(`/orders/${orderId}/cancel`);
            orderCleanup.cleanupAll(orderId, { skipBackend: false, redirectTo: '/' });
        } catch (err: any) {
            if (err?.response?.status === 404) {
                orderCleanup.cleanupAll(orderId, { skipBackend: true, redirectTo: '/' });
                return;
            }
            orderCleanup.cleanupAll(orderId, { skipBackend: true, redirectTo: '/' });
        }
    }, [order?._id, orderCleanup, checkoutState]);

    // Handlers para erro
    const handleRetryCreateOrder = useCallback(async () => {
        try {
            storageHelpers.clearActiveOrderId();
            storageHelpers.clearTimerStartTime();
            await createOrder();
        } catch (err) {
            // Erro silencioso
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
    // Se há pedido real, usar totalAmount do pedido (já inclui desconto do backend)
    // Se não há pedido ou é fake, calcular localmente com desconto aplicado
    const displayTotalAmount = useMemo(() => {
        // Se há pedido real, usar o totalAmount do pedido (backend já calculou com desconto)
        if (order?._id && !order._id.startsWith('fake-')) {
            return order.totalAmount ?? totalAmount;
        }

        // Se há desconto aplicado localmente (cupom aplicado mas pedido ainda não criado)
        if (appliedDiscountInfo) {
            const calculated = calculateTotalWithDiscount(summarizedCart, appliedDiscountInfo);
            return calculated.totalAmount;
        }

        // Caso padrão: usar totalAmount do carrinho
        return totalAmount;
    }, [order?._id, order?.totalAmount, totalAmount, appliedDiscountInfo, summarizedCart]);

    // Memoizar se PIX está ativo (quando há QR code gerado)
    const isPixActive = useMemo(() => {
        return !!pixPayment.pixResult;
    }, [pixPayment.pixResult]);

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
            return false;
        }
        
        // Se não há pedido e não há pedido no storage, mas há itens no carrinho e dados do cliente, mostrar loading
        // Isso faz o loading aparecer IMEDIATAMENTE ao entrar no checkout para criar novo pedido
        if (!order && summarizedCart.length > 0 && customerData.name && customerData.email) {
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
            <Container className="py-7">
                <div className={`grid gap-8 ${isPixActive ? 'lg:grid-cols-1 max-w-[40rem] mx-auto' : 'lg:grid-cols-[1.1fr_1fr]'}`}>
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

                        {isPixActive ? (
                            <PaymentSection
                                selectedTab={checkoutState.selectedTab}
                                onTabChange={checkoutState.setSelectedTab}
                                pixPaymentActive={isPixActive}
                                orderId={order?._id || null}
                                orderExpiresAt={order?.expiresAt || null}
                                totalAmount={displayTotalAmount}
                                customerEmail={customerData.email}
                                onCancelOrder={handleCancelOrderAndGoHome}
                                orderNumber={order?.orderNumber}
                                pixPayment={pixPayment}
                            />
                        ) : (
                            <>
                                <CheckoutCartSummary
                                    items={summarizedCart}
                                    totalTickets={totalTickets}
                                    totalAmount={displayTotalAmount}
                                    pixPaymentActive={isPixActive}
                                    onRemoveItem={handleRemoveItem}
                                    onPromoterCodeApplied={handlePromoterCodeChange}
                                    onDiscountInfoChange={setAppliedDiscountInfo}
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
                                    pixPaymentActive={isPixActive}
                                />
                            </>
                        )}
                    </section>

                    {!isPixActive && (
                        <section className="space-y-6">
                            <PaymentSection
                                selectedTab={checkoutState.selectedTab}
                                onTabChange={checkoutState.setSelectedTab}
                                pixPaymentActive={isPixActive}
                                orderId={order?._id || null}
                                orderExpiresAt={order?.expiresAt || null}
                                totalAmount={displayTotalAmount}
                                customerEmail={customerData.email}
                                onCancelOrder={handleCancelOrderAndGoHome}
                                orderNumber={order?.orderNumber}
                                pixPayment={pixPayment}
                            />
                        </section>
                    )}
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

