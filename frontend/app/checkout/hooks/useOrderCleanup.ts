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
            const status = err?.response?.status;
            const backendMessage: string | undefined = err?.response?.data?.message;

            // Se pedido não encontrado (404) OU não está mais pendente (400), tratar como sucesso.
            // Isso significa que o backend já cancelou/atualizou o pedido (ex: expirado, pago, etc.).
            if (status === 404 || (status === 400 && backendMessage)) {
                console.log(
                    '[useOrderCleanup] ⚠️ Pedido já não pode ser cancelado no backend (status=%s, message=%s), tratando como sucesso: %s',
                    status,
                    backendMessage,
                    orderId
                );
                return true;
            }

            // Para outros erros, logar mas ainda assim retornar false
            console.error('[useOrderCleanup] ❌ Erro ao cancelar pedido no backend:', err);
            return false;
        }
    }, []);

    // Limpar código de promotor do sessionStorage
    const clearPromoterCodesFromStorage = useCallback(() => {
        if (typeof window !== 'undefined') {
            // Limpar todos os códigos de promotor do sessionStorage
            // Como não temos o eventId aqui, vamos limpar todas as chaves que começam com 'promoter_code_'
            const keysToRemove: string[] = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
                const key = window.sessionStorage.key(i);
                if (key && key.startsWith('promoter_code_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                window.sessionStorage.removeItem(key);
            });
            if (keysToRemove.length > 0) {
                console.log('[useOrderCleanup] 🗑️ Códigos de promotor removidos do sessionStorage:', keysToRemove.length);
            }
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

        // Limpar código de promotor do sessionStorage
        clearPromoterCodesFromStorage();

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
    }, [cancelOrderInBackend, clearOrder, storage, refreshCart, router, onComplete, clearPromoterCodesFromStorage]);

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

        // Limpar código de promotor do sessionStorage
        clearPromoterCodesFromStorage();

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
    }, [cancelOrderInBackend, resetBrick, clearOrder, storage, refreshCart, router, onComplete, clearPromoterCodesFromStorage]);

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

        // Limpar código de promotor do sessionStorage
        clearPromoterCodesFromStorage();

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
    }, [cancelOrderInBackend, resetBrick, clearOrder, storage, refreshCart, router, onComplete, clearPromoterCodesFromStorage]);

    return {
        cancelOrder,
        cleanupOrder,
        resetBrick,
        cleanupAll,
        cancelOrderInBackend,
    };
}

