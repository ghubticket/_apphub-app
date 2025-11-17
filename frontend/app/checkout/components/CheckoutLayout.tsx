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
import { useCardPayment } from '../hooks/useCardPayment';
import { usePixPayment } from '../hooks/usePixPayment';

export function CheckoutLayout() {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'card' | 'pix'>('card');
    const [showExitWarning, setShowExitWarning] = useState(false);

    // Carregar dados do carrinho
    const { summarizedCart, totalAmount, totalTickets, loading: cartLoading, refreshCart } = useCheckoutCart();

    // Carregar dados do comprador
    const { customerData, handleChange: handleCustomerChange } = useCheckoutCustomer();

    // Criar/gerenciar pedido (REFATORADO: pedido PENDING = reserva de ingressos)
    const { order, loading: orderLoading, error: orderError, refreshOrder, clearOrder, resetRateLimitBlock, rateLimitRemainingSeconds, showRestoreModal, closeRestoreModal, showExpiredModal, closeExpiredModal, createOrder } = useCheckoutOrder(
        summarizedCart,
        customerData
    );

    // OTIMIZADO: Usar order do hook diretamente ao invés de buscar do storage
    // hasPendingOrderInStorage agora é derivado do order, não precisa buscar do storage
    const hasPendingOrderInStorage = !!(order?._id && order.status === 'pending');
    
    // Verificar se há pagamento pendente (bloquear remoção de itens)
    // CRÍTICO: Desabilitar remoção quando há pedido pendente para evitar problemas
    // Bloquear quando há qualquer pedido pendente (PIX, cartão, ou qualquer outro método)
    // Isso evita que o usuário remova itens enquanto há um pagamento em andamento
    const hasPendingPayment = !!(order?.status === 'pending' && order?._id);

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

    // Hook para acessar status do pagamento e desabilitar guard quando aprovado
    const cardPayment = useCardPayment(order?._id || null);
    const pixPayment = usePixPayment(order?._id || null);
    
    // IMPORTANTE: NÃO limpar estado do pedido quando QR code PIX é gerado
    // O orderId deve ser mantido no storage para que ao recarregar (F5), o sistema detecte
    // que há pedido PIX pendente e redirecione para /dashboard
    // O storage só será limpo quando o usuário navegar para home normalmente (não F5)
    
    // Travar aba de cartão quando QR code PIX é gerado
    useEffect(() => {
        if (pixPayment.pixResult && selectedTab === 'card') {
            console.log('[CheckoutLayout] 🔒 QR code PIX gerado - travando aba de cartão');
            setSelectedTab('pix');
        }
    }, [pixPayment.pixResult, selectedTab]);
    
    // CRÍTICO: Desabilitar guard quando pagamento for aprovado ou quando há redirecionamento ativo
    // Não faz sentido bloquear navegação quando o pagamento já foi aprovado e há redirecionamento automático
    // Para PIX: também desabilitar quando QR code foi gerado (permite navegação livre)
    const isPaymentApproved = cardPayment.status === 'success' || cardPayment.redirectCountdown !== null || 
                               pixPayment.status === 'success' || pixPayment.redirectCountdown !== null ||
                               !!pixPayment.pixResult; // QR code PIX gerado = liberar navegação
    
    // CRÍTICO: Definir flag global quando pagamento é aprovado para permitir navegação sem alerta
    // Isso garante que o useNavigationGuard não mostre o alerta durante o redirecionamento
    useEffect(() => {
        if (isPaymentApproved && typeof window !== 'undefined') {
            console.log('[CheckoutLayout] ✅ Pagamento aprovado - definindo flag para permitir redirecionamento sem alerta');
            
            // Definir flag global que o useNavigationGuard verifica
            (window as any).__ALLOW_NAVIGATION__ = true;
            
            // Também limpar o onbeforeunload caso tenha sido definido diretamente
            window.onbeforeunload = null;
            
            return () => {
                // Limpar flag quando componente desmontar ou pagamento não for mais aprovado
                if (typeof window !== 'undefined') {
                    (window as any).__ALLOW_NAVIGATION__ = false;
                }
            };
        } else {
            // Limpar flag quando pagamento não for mais aprovado
            if (typeof window !== 'undefined') {
                (window as any).__ALLOW_NAVIGATION__ = false;
            }
        }
    }, [isPaymentApproved]);
    
    // Interceptar navegação quando há pedido PENDING (mesmo durante loading)
    // CRÍTICO: Desabilitar guard quando pagamento for aprovado
    useNavigationGuard({
        enabled: (!isPaymentApproved && (!!(order && order.status === 'pending') || hasPendingOrderInStorage)),
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
    // CRÍTICO: Quando o timer expira, redirecionar diretamente sem mostrar modal
    const handleTimerExpire = useCallback(async () => {
        console.log('[CheckoutLayout] ⏰ Timer do pedido expirado! Redirecionando diretamente...');

        // CRÍTICO: Fechar modal de expiração se estiver aberto (evita mostrar modal antes de redirecionar)
        closeExpiredModal();

        // OTIMIZADO: Usar order do hook diretamente
        const orderId = order?._id;

        if (orderId) {
            try {
                // Cancelar pedido expirado no backend (devolve estoque automaticamente)
                console.log('[CheckoutLayout] 🗑️ Cancelando pedido expirado:', orderId);
                await api.post(`/orders/${orderId}/cancel`);
                console.log('[CheckoutLayout] ✅ Pedido expirado cancelado com sucesso, estoque devolvido');
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

        // CRÍTICO: Redirecionar diretamente para home sem mostrar modal
        // Não faz sentido mostrar alerta quando o timer expira - o usuário já sabe que o tempo acabou
        console.log('[CheckoutLayout] 🏠 Redirecionando para home após expiração do timer');
        router.push('/');
    }, [order?._id, clearOrder, refreshCart, router, closeExpiredModal]);

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

    // Handler para remover item do carrinho e limpar tudo
    const handleRemoveItem = useCallback(async (itemId: string) => {
        console.log('[CheckoutLayout] 🗑️ Removendo item do carrinho e limpando tudo:', itemId);
        
        try {
            // Se há pedido ativo, cancelar no backend
            if (order?._id) {
                try {
                    console.log('[CheckoutLayout] 🗑️ Cancelando pedido antes de limpar carrinho:', order._id);
                    await api.post(`/orders/${order._id}/cancel`);
                    console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso');
                } catch (cancelErr: any) {
                    // Ignorar erro 404 (pedido já não existe)
                    if (cancelErr?.response?.status !== 404) {
                        console.error('[CheckoutLayout] ⚠️ Erro ao cancelar pedido:', cancelErr);
                    }
                }
            }
            
            // CRÍTICO: Resetar Brick ANTES de limpar o pedido
            // Isso garante que o formulário seja limpo completamente
            if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                try {
                    console.log('[CheckoutLayout] 🧹 Resetando Brick antes de limpar pedido');
                    window.__MP_BRICK_RESET__();
                } catch (brickErr) {
                    console.warn('[CheckoutLayout] ⚠️ Erro ao resetar Brick:', brickErr);
                }
            }
            
            // Limpar estado do pedido
            clearOrder();
            
            // Limpar timer do localStorage
            storageHelpers.clearTimerStartTime();
            
            // Limpar carrinho completamente (storage)
            clearCartItems();
            
            // Atualizar carrinho na UI
            refreshCart();
            
            console.log('[CheckoutLayout] ✅ Carrinho e pedido limpos completamente');
            
            // Redirecionar para home após limpar tudo
            router.push('/');
        } catch (error: any) {
            console.error('[CheckoutLayout] ❌ Erro ao remover item e limpar carrinho:', error);
            // Mesmo com erro, tentar limpar localmente
            // CRÍTICO: Resetar Brick mesmo em caso de erro
            if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                try {
                    window.__MP_BRICK_RESET__();
                } catch (brickErr) {
                    console.warn('[CheckoutLayout] ⚠️ Erro ao resetar Brick (fallback):', brickErr);
                }
            }
            clearCartItems();
            refreshCart();
            clearOrder();
            storageHelpers.clearTimerStartTime();
            router.push('/');
        }
    }, [order?._id, clearOrder, refreshCart, router]);

    // Handler para cancelar pedido e ir para home (usado no modal de erro do cartão)
    const handleCancelOrderAndGoHome = useCallback(async () => {
        console.log('[CheckoutLayout] 🗑️ Cancelando pedido e redirecionando para home (do modal de erro)');
        
        try {
            // Se há pedido ativo, cancelar no backend
            if (order?._id) {
                try {
                    console.log('[CheckoutLayout] 🗑️ Cancelando pedido:', order._id);
                    await api.post(`/orders/${order._id}/cancel`);
                    console.log('[CheckoutLayout] ✅ Pedido cancelado com sucesso');
                } catch (cancelErr: any) {
                    // Ignorar erro 404 (pedido já não existe)
                    if (cancelErr?.response?.status !== 404) {
                        console.error('[CheckoutLayout] ⚠️ Erro ao cancelar pedido:', cancelErr);
                    }
                }
            }
            
            // CRÍTICO: Resetar Brick ANTES de limpar o pedido
            if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                try {
                    console.log('[CheckoutLayout] 🧹 Resetando Brick antes de limpar pedido');
                    window.__MP_BRICK_RESET__();
                } catch (brickErr) {
                    console.warn('[CheckoutLayout] ⚠️ Erro ao resetar Brick:', brickErr);
                }
            }
            
            // Limpar estado do pedido
            clearOrder();
            
            // Limpar timer do localStorage
            storageHelpers.clearTimerStartTime();
            
            // Limpar carrinho completamente (storage)
            clearCartItems();
            
            // Atualizar carrinho na UI
            refreshCart();
            
            console.log('[CheckoutLayout] ✅ Pedido cancelado e redirecionando para home');
            
            // Redirecionar para home
            router.push('/');
        } catch (error: any) {
            console.error('[CheckoutLayout] ❌ Erro ao cancelar pedido:', error);
            // Mesmo com erro, tentar limpar localmente e redirecionar
            if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                try {
                    window.__MP_BRICK_RESET__();
                } catch (brickErr) {
                    console.warn('[CheckoutLayout] ⚠️ Erro ao resetar Brick (fallback):', brickErr);
                }
            }
            clearCartItems();
            refreshCart();
            clearOrder();
            storageHelpers.clearTimerStartTime();
            router.push('/');
        }
    }, [order?._id, clearOrder, refreshCart, router]);

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
            
            // Limpar flag de PIX ativo se existir (navegação normal, não F5)
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('__PIX_ORDER_ACTIVE__');
            }
            
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
            
            // Limpar flag de PIX ativo se existir (navegação normal, não F5)
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('__PIX_ORDER_ACTIVE__');
            }

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
                
                // Limpar flag de PIX ativo se existir (navegação normal, não F5)
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('__PIX_ORDER_ACTIVE__');
                }
                
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
            
            // Limpar flag de PIX ativo se existir (navegação normal, não F5)
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('__PIX_ORDER_ACTIVE__');
            }

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
        const isRateLimitError = orderError.includes('Muitas tentativas') || orderError.includes('aguarde');
        const isFailedStatusError = orderError.includes('Status: failed') || orderError.includes('Status: cancelled');

        // Formatar tempo restante
        const formatRemainingTime = (seconds: number | null): string => {
            if (seconds === null || seconds <= 0) return '';
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            if (mins > 0) {
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }
            return `${secs}s`;
        };

        // Handler para tentar criar pedido novamente
        const handleRetryCreateOrder = async () => {
            console.log('[CheckoutLayout] 🔄 Tentando criar pedido novamente após erro');
            try {
                // Limpar storage de pedidos inválidos antes de tentar novamente
                storageHelpers.clearActiveOrderId();
                storageHelpers.clearTimerStartTime();
                
                // Tentar criar pedido novamente
                await createOrder();
            } catch (err) {
                console.error('[CheckoutLayout] ❌ Erro ao tentar criar pedido novamente:', err);
            }
        };

        return (
            <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
                <Container className="py-12">
                    <CheckoutHeader />
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
                        <p className="font-semibold">Erro ao criar pedido</p>
                        <p className="mt-2">{orderError}</p>
                        {isRateLimitError && rateLimitRemainingSeconds !== null && rateLimitRemainingSeconds > 0 && (
                            <div className="mt-4">
                                <p className="text-base font-medium">
                                    Tempo restante: <span className="font-bold text-rose-800">{formatRemainingTime(rateLimitRemainingSeconds)}</span>
                                </p>
                            </div>
                        )}
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            {isRateLimitError ? (
                                <button
                                    onClick={() => {
                                        resetRateLimitBlock();
                                        // Recarregar a página para resetar completamente
                                        window.location.reload();
                                    }}
                                    className="rounded-lg bg-rose-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                                >
                                    Recarregar página para tentar novamente
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleRetryCreateOrder}
                                        disabled={orderLoading}
                                        className="rounded-lg bg-rose-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {orderLoading ? 'Criando pedido...' : 'Tentar novamente'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Limpar tudo e voltar para home
                                            clearOrder();
                                            clearCartItems();
                                            refreshCart();
                                            router.push('/');
                                        }}
                                        className="rounded-lg border border-rose-300 bg-white px-6 py-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
                                    >
                                        Voltar para início
                                    </button>
                                </>
                            )}
                        </div>
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
                            pixPaymentActive={hasPendingPayment}
                            onRemoveItem={handleRemoveItem}
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
                            pixPaymentActive={!!pixPayment.pixResult}
                            orderId={order?._id || null}
                            totalAmount={totalAmount}
                            customerEmail={customerData.email}
                            onCancelOrder={handleCancelOrderAndGoHome}
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
