'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { clearCartItems } from '@/lib/cart';
import { useCheckoutStorage } from './useCheckoutStorage';

interface UseOrderCleanupOptions {
    clearOrder: () => void;
    refreshCart: () => void;
    onComplete?: () => void;
}

interface UseOrderCleanupReturn {
    cancelOrder: (orderId: string, options?: { skipBackend?: boolean; redirectTo?: string }) => Promise<void>;
    cleanupOrder: (orderId: string | null, options?: { skipBackend?: boolean; redirectTo?: string }) => Promise<void>;
    resetBrick: () => void;
    cleanupAll: (orderId: string | null, options?: { skipBackend?: boolean; redirectTo?: string }) => Promise<void>;
    cancelOrderInBackend: (orderId: string) => Promise<boolean>;
}

/**
 * Hook para consolidar lógica de cancelamento e limpeza de pedidos
 * Unifica handleCancelOrder, handleLeavePage, handleRemoveItem, handleCancelOrderAndGoHome
 */
export function useOrderCleanup({ clearOrder, refreshCart, onComplete }: UseOrderCleanupOptions): UseOrderCleanupReturn {
    const router = useRouter();
    const storage = useCheckoutStorage();

    // Resetar Mercado Pago Brick
    const resetBrick = useCallback(() => {
        if (typeof window === 'undefined' || !window.__MP_BRICK_RESET__) {
            return;
        }

        try {
            console.log('[useOrderCleanup] 🧹 Resetando Brick');
            window.__MP_BRICK_RESET__();
        } catch (brickErr) {
            console.warn('[useOrderCleanup] ⚠️ Erro ao resetar Brick:', brickErr);
        }
    }, []);

    // Cancelar pedido no backend
    const cancelOrderInBackend = useCallback(async (orderId: string): Promise<boolean> => {
        try {
            console.log('[useOrderCleanup] 🗑️ Cancelando pedido no backend:', orderId);
            await api.post(`/orders/${orderId}/cancel`);
            console.log('[useOrderCleanup] ✅ Pedido cancelado com sucesso no backend');
            return true;
        } catch (err: any) {
            // Se pedido não encontrado (404), tratar como sucesso - pedido já foi cancelado/expirado
            if (err?.response?.status === 404) {
                console.log('[useOrderCleanup] ⚠️ Pedido já não existe (404), tratando como sucesso:', orderId);
                return true;
            }

            // Para outros erros, logar mas ainda assim retornar false
            console.error('[useOrderCleanup] ❌ Erro ao cancelar pedido no backend:', err);
            return false;
        }
    }, []);

    // Cancelar pedido (backend + limpeza básica)
    const cancelOrder = useCallback(async (
        orderId: string,
        options?: { skipBackend?: boolean; redirectTo?: string }
    ) => {
        const { skipBackend = false, redirectTo } = options || {};

        // Cancelar no backend se necessário
        if (!skipBackend) {
            await cancelOrderInBackend(orderId);
        }

        // Limpar estado do pedido
        clearOrder();

        // Limpar storage relacionado ao pedido
        storage.clearOrderRelated();

        // Limpar carrinho
        clearCartItems();
        refreshCart();

        // Redirecionar se especificado
        if (redirectTo) {
            if (redirectTo === '/') {
                router.push('/');
            } else if (redirectTo === '/dashboard') {
                router.push('/dashboard');
            } else {
                router.push(redirectTo);
            }
        }

        // Callback opcional
        if (onComplete) {
            onComplete();
        }
    }, [cancelOrderInBackend, clearOrder, storage, refreshCart, router, onComplete]);

    // Limpeza completa (sem cancelar no backend)
    const cleanupOrder = useCallback(async (
        orderId: string | null,
        options?: { skipBackend?: boolean; redirectTo?: string }
    ) => {
        const { skipBackend = true, redirectTo } = options || {};

        // Cancelar no backend apenas se orderId existe e não foi solicitado skip
        if (orderId && !skipBackend) {
            await cancelOrderInBackend(orderId);
        }

        // Resetar Brick ANTES de limpar o pedido
        resetBrick();

        // Limpar estado do pedido
        clearOrder();

        // Limpar storage relacionado ao pedido
        storage.clearOrderRelated();

        // Limpar carrinho
        clearCartItems();
        refreshCart();

        // Redirecionar se especificado
        if (redirectTo) {
            if (redirectTo === '/') {
                router.push('/');
            } else if (redirectTo === '/dashboard') {
                router.push('/dashboard');
            } else {
                router.push(redirectTo);
            }
        }

        // Callback opcional
        if (onComplete) {
            onComplete();
        }
    }, [cancelOrderInBackend, resetBrick, clearOrder, storage, refreshCart, router, onComplete]);

    // Limpeza completa incluindo Brick reset
    const cleanupAll = useCallback(async (
        orderId: string | null,
        options?: { skipBackend?: boolean; redirectTo?: string }
    ) => {
        const { skipBackend = false, redirectTo } = options || {};

        // Cancelar no backend se orderId existe e não foi solicitado skip
        if (orderId && !skipBackend) {
            await cancelOrderInBackend(orderId);
        }

        // Resetar Brick ANTES de limpar o pedido
        resetBrick();

        // Limpar estado do pedido
        clearOrder();

        // Limpar todo o storage (incluindo navigation flags)
        storage.clearAll();

        // Limpar carrinho
        clearCartItems();
        refreshCart();

        // Redirecionar se especificado
        if (redirectTo) {
            if (redirectTo === '/') {
                router.push('/');
            } else if (redirectTo === '/dashboard') {
                router.push('/dashboard');
            } else {
                router.push(redirectTo);
            }
        }

        // Callback opcional
        if (onComplete) {
            onComplete();
        }
    }, [cancelOrderInBackend, resetBrick, clearOrder, storage, refreshCart, router, onComplete]);

    return {
        cancelOrder,
        cleanupOrder,
        resetBrick,
        cleanupAll,
        cancelOrderInBackend,
    };
}

