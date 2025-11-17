'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Container from '@/components/shared/Container';
import { CheckoutHeader } from './CheckoutHeader';
import { CheckoutTimer } from './CheckoutTimer';
import { CheckoutCartSummary } from './CheckoutCartSummary';
import { CustomerDataForm } from './CustomerDataForm';
import { PaymentSection } from './PaymentSection';
import { useCheckoutCart } from '../hooks/useCheckoutCart';
import { useCheckoutCustomer } from '../hooks/useCheckoutCustomer';
import { useCheckoutOrder } from '../hooks/useCheckoutOrder';
import { OrderRestoreModal } from './OrderRestoreModal';
import { OrderExitWarningModal } from './OrderExitWarningModal';
import { OrderExpiredModal } from './OrderExpiredModal';
import { clearCartItems } from '@/lib/cart';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { storageHelpers } from '../utils/storageHelpers';
import { getRemainingSeconds, parseExpiresAt } from '../utils/orderHelpers';

export function CheckoutLayout() {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'card' | 'pix'>('card');
    const [showExitWarning, setShowExitWarning] = useState(false);
    
    // Carregar dados do carrinho
    const { summarizedCart, totalAmount, totalTickets, loading: cartLoading, refreshCart } = useCheckoutCart();

    // Carregar dados do comprador
    const { customerData, handleChange: handleCustomerChange } = useCheckoutCustomer();

    // Criar/gerenciar pedido (REFATORADO: pedido PENDING = reserva de ingressos)
    const { order, loading: orderLoading, error: orderError, refreshOrder, clearOrder, showRestoreModal, closeRestoreModal, showExpiredModal, closeExpiredModal, createOrder } = useCheckoutOrder(
        summarizedCart,
        customerData
    );

    // OTIMIZADO: Usar order do hook diretamente ao invés de buscar do storage
    // hasPendingOrderInStorage agora é derivado do order, não precisa buscar do storage
    const hasPendingOrderInStorage = !!(order?._id && order.status === 'pending');

    // Escutar mudanças no storage apenas para sincronizar entre abas
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorageChange = (e: StorageEvent) => {
            // Sincronizar quando storage mudar em outra aba
            if (e.key === '5521-active-order-id') {
                // Se orderId foi removido em outra aba, não precisamos fazer nada aqui
                // O hook useCheckoutOrder já gerencia isso
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Verificar se há timer válido no localStorage (mesmo quando pedido retorna 403)
    // Usar useState para atualizar quando o timer muda
    const [hasValidTimerInStorage, setHasValidTimerInStorage] = useState(() => {
        if (typeof window === 'undefined') return false;
        const savedStartTime = storageHelpers.loadTimerStartTime();
        if (savedStartTime) {
            const elapsed = Date.now() - savedStartTime;
            const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
            return remaining > 0;
        }
        return false;
    });

    // Atualizar estado do timer a cada segundo quando há orderId no storage mas não há pedido carregado
    useEffect(() => {
        if (!hasPendingOrderInStorage || order) {
            // Se não há orderId ou já tem pedido carregado, não precisa verificar timer
            if (!hasPendingOrderInStorage) {
                setHasValidTimerInStorage(false);
            }
            return;
        }

        // Verificar timer imediatamente
        const checkTimer = () => {
            const savedStartTime = storageHelpers.loadTimerStartTime();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
                setHasValidTimerInStorage(remaining > 0);
            } else {
                setHasValidTimerInStorage(false);
            }
        };

        checkTimer(); // Verificar imediatamente
        const interval = setInterval(checkTimer, 1000); // Verificar a cada segundo

        return () => clearInterval(interval);
    }, [hasPendingOrderInStorage, order]);

    // Timer ativo quando há pedido PENDING com expiresAt OU quando há timer válido no localStorage
    // Isso garante que o timer apareça mesmo quando o pedido retorna 403 temporariamente
    const timerActive = !!(order?.status === 'pending' && order.expiresAt) || (hasPendingOrderInStorage && hasValidTimerInStorage);

    // Calcular tempo restante do pedido em segundos
    // Se não temos pedido carregado mas temos timer válido no localStorage, usar ele
    const remainingSeconds = useMemo(() => {
        if (order?.expiresAt) {
            return getRemainingSeconds(order.expiresAt);
        }
        
        // Fallback: usar timer do localStorage se não temos pedido carregado
        if (hasPendingOrderInStorage && hasValidTimerInStorage) {
            const savedStartTime = storageHelpers.loadTimerStartTime();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
                return Math.floor(remaining / 1000);
            }
        }
        
        return null;
    }, [order?.expiresAt, hasPendingOrderInStorage, hasValidTimerInStorage]);

    // Interceptar navegação quando há pedido PENDING (mesmo durante loading)
    useNavigationGuard({
        enabled: !!(order && order.status === 'pending') || hasPendingOrderInStorage,
        onNavigationAttempt: () => {
            setShowExitWarning(true);
        },
        allowedPaths: ['/checkout'], // Permitir navegação dentro do checkout
    });

    // Limpar carrinho quando modal de expiração aparecer
    useEffect(() => {
        if (showExpiredModal) {
            console.log('[CheckoutLayout] 🧹 Limpando carrinho porque pedido expirou');
            clearCartItems();
            refreshCart();
        }
    }, [showExpiredModal, refreshCart]);

    // OTIMIZADO: Memoizar callbacks para evitar re-renders desnecessários
    const handleTimerExpire = useCallback(async () => {
        console.log('[CheckoutLayout] ⏰ Timer do pedido expirado!');
        
        // OTIMIZADO: Usar order do hook diretamente
        const orderId = order?._id;
        
        if (orderId) {
            try {
                // Cancelar pedido expirado no backend
                console.log('[CheckoutLayout] 🗑️ Cancelando pedido expirado:', orderId);
                await api.post(`/orders/${orderId}/cancel`);
                console.log('[CheckoutLayout] ✅ Pedido expirado cancelado com sucesso');
            } catch (err: any) {
                // Se já foi cancelado (404), tudo bem
                if (err?.response?.status !== 404) {
                    console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido expirado:', err);
                }
            }
        }
        
        // Limpar estado e carrinho
        clearOrder();
        clearCartItems();
        refreshCart();
        
        // Atualizar pedido para verificar status final
        await refreshOrder();
    }, [order?._id, clearOrder, refreshCart, refreshOrder]);

    const handleContinueOrder = useCallback(() => {
        // Fechar modal e continuar com o pedido
        closeRestoreModal();
    }, [closeRestoreModal]);

    const handleCloseModal = useCallback(() => {
        // Fechar modal sem ação
        closeRestoreModal();
    }, [closeRestoreModal]);

    const handleCreateNewOrder = useCallback(async () => {
        console.log('[CheckoutLayout] 🔄 Usuário confirmou criação de novo pedido após expiração');
        
        // Fechar modal de expiração
        closeExpiredModal();
        
        // Limpar carrinho antes de criar novo pedido (se necessário)
        // O carrinho já foi limpo quando o pedido expirou, mas garantimos aqui
        clearCartItems();
        refreshCart();
        
        // Criar novo pedido
        await createOrder();
    }, [closeExpiredModal, refreshCart, createOrder]);

    const handleCloseExpiredModal = useCallback(() => {
        // Fechar modal sem criar novo pedido
        closeExpiredModal();
    }, [closeExpiredModal]);

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
            // Cancelar pedido no backend (usar POST /orders/:id/cancel ao invés de DELETE)
            await api.post(`/orders/${order._id}/cancel`);
            
            console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso no backend');
            
            // Limpar estado do pedido no hook
            clearOrder();
            
            // Limpar timer também
            storageHelpers.clearTimerStartTime();
            
            // Limpar carrinho
            clearCartItems();
            refreshCart();
            
            console.log('[CheckoutLayout] 🧹 Estado limpo, recarregando página');
            
            // Recarregar página para resetar estado
            router.refresh();
        } catch (err: any) {
            // Se pedido não encontrado (404), tratar como sucesso - pedido já foi cancelado/expirado
            if (err?.response?.status === 404) {
                console.log('[CheckoutLayout] ⚠️ Pedido já não existe (404), limpando estado local:', {
                    orderId: order._id,
                });
                clearOrder();
                clearCartItems();
                refreshCart();
                router.refresh();
                return;
            }
            
            // Para outros erros, logar mas ainda assim limpar estado
            console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido:', err);
            clearOrder();
        }
    }, [order, clearOrder, refreshCart, router]);


    const handleStayOnPage = useCallback(() => {
        console.log('[CheckoutLayout] ✅ Usuário escolheu continuar no checkout');
        setShowExitWarning(false);
    }, []);

    const handleLeavePage = useCallback(async () => {
        console.log('[CheckoutLayout] 🚪 Usuário escolheu sair do checkout');
        setShowExitWarning(false);
        
        // OTIMIZADO: Usar order do hook diretamente
        const orderId = order?._id;
        console.log('[CheckoutLayout] 📋 OrderId para cancelar:', {
            orderId,
            fromOrder: !!order?._id,
        });
        
        if (!orderId) {
            // Não há pedido para cancelar, apenas sair
            console.log('[CheckoutLayout] ⚠️ Nenhum pedido encontrado, apenas saindo');
            clearOrder();
            clearCartItems();
            refreshCart();
            router.push('/');
            return;
        }
        
        try {
            console.log('[CheckoutLayout] 🗑️ Cancelando pedido antes de sair:', orderId);
            // Cancelar pedido no backend (usar POST /orders/:id/cancel ao invés de DELETE)
            await api.post(`/orders/${orderId}/cancel`);
            
            console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso, limpando estado');
            
            // Limpar estado do pedido no hook ANTES de limpar storage
            clearOrder();
            
            // Limpar timer do localStorage também
            storageHelpers.clearTimerStartTime();
            
            // Limpar carrinho
            clearCartItems();
            refreshCart();
            
            // Pequeno delay para garantir que estado foi limpo
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('[CheckoutLayout] 🏠 Navegando para home');
            // Navegar para home (agora permitido porque pedido foi cancelado)
            router.push('/');
        } catch (err: any) {
            // Se pedido não encontrado (404), tratar como sucesso - pedido já foi cancelado/expirado
            if (err?.response?.status === 404) {
                console.log('[CheckoutLayout] ⚠️ Pedido já não existe (404), limpando estado local e saindo:', {
                    orderId,
                });
                clearOrder();
                storageHelpers.clearTimerStartTime();
                clearCartItems();
                refreshCart();
                router.push('/');
                return;
            }
            
            // Para outros erros, logar mas ainda assim limpar estado e permitir sair
            console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido ao sair:', err);
            
            // Mesmo com erro, limpar estado e permitir sair
            clearOrder();
            storageHelpers.clearTimerStartTime();
            clearCartItems();
            refreshCart();
            
            router.push('/');
        }
    }, [order?._id, clearOrder, refreshCart, router]);

    // Mostrar loading enquanto carrega carrinho ou cria pedido
    if (cartLoading || orderLoading) {
        return (
            <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
                <Container className="py-12">
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        {cartLoading ? 'Carregando resumo do carrinho...' : 'Criando pedido...'}
                    </div>
                </Container>
            </main>
        );
    }

    // Mostrar erro se houver
    if (orderError && summarizedCart.length > 0) {
        return (
            <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
                <Container className="py-12">
                    <CheckoutHeader />
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
                        <p className="font-semibold">Erro ao criar pedido</p>
                        <p className="mt-2">{orderError}</p>
                    </div>
                </Container>
            </main>
        );
    }

    // Mostrar mensagem se carrinho vazio
    if (summarizedCart.length === 0) {
        return (
            <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
                <Container className="py-12">
                    <CheckoutHeader />
                    <div className="rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        <p>Seu carrinho está vazio. Explore nossos eventos e selecione os ingressos desejados.</p>
                    </div>
                </Container>
            </main>
        );
    }

    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">
                <CheckoutHeader />

                {/* Conteúdo principal */}
                <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                    {/* Coluna esquerda */}
                    <section className="space-y-6">
                        {/* Timer - mostrar quando há pedido válido OU quando há timer válido no localStorage (fallback para erro 403) */}
                        {timerActive && (
                            <CheckoutTimer 
                                isActive={timerActive} 
                                onExpire={handleTimerExpire}
                                expiresAt={order?.expiresAt || null}
                                initialRemainingSeconds={remainingSeconds}
                            />
                        )}

                        <CheckoutCartSummary
                            items={summarizedCart}
                            totalTickets={totalTickets}
                            totalAmount={totalAmount}
                            pixPaymentActive={false}
                            onRemoveItem={() => {}}
                        />

                        <CustomerDataForm
                            data={customerData}
                            disabled={false}
                            onChange={handleCustomerChange}
                            docTypeReady={true}
                        />
                    </section>

                    {/* Coluna direita */}
                    <section className="space-y-6">
                        <PaymentSection
                            selectedTab={selectedTab}
                            onTabChange={setSelectedTab}
                            pixPaymentActive={false}
                        />
                    </section>
                </div>
            </Container>

            {/* Modal de restauração de pedido */}
            {showRestoreModal && order && order.status === 'pending' && (
                <OrderRestoreModal
                    order={order}
                    onContinue={handleContinueOrder}
                    onCancel={handleCancelOrder}
                    onClose={handleCloseModal}
                />
            )}

            {/* Modal de aviso ao sair */}
            {showExitWarning && (order || hasPendingOrderInStorage) && (
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

            {/* Modal de pedido expirado */}
            {showExpiredModal && (
                <OrderExpiredModal
                    onCreateNew={handleCreateNewOrder}
                    onClose={handleCloseExpiredModal}
                />
            )}
        </main>
    );
}
