'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CartItem, loadCartItems } from '@/lib/cart';
import type { CheckoutCartItem } from '../types';
import { debounce } from '../utils/performanceHelpers';

export function useCheckoutCart() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const isRefreshingRef = useRef(false);

    const calculateItem = useCallback((item: CartItem): CheckoutCartItem => {
        const subtotal = item.price * item.quantity;
        const platformFeeValue = item.platformFeePercentage ? (subtotal * item.platformFeePercentage) / 100 : 0;
        const fixedFeeValue = item.ticketFee ? item.ticketFee * item.quantity : 0;
        return {
            ...item,
            subtotal,
            platformFeeValue,
            fixedFeeValue,
            total: subtotal + platformFeeValue + fixedFeeValue,
        };
    }, []);

    const summarizedCart = useMemo(() => cartItems.map(calculateItem), [cartItems, calculateItem]);

    const totalAmount = useMemo(() => summarizedCart.reduce((acc, item) => acc + item.total, 0), [summarizedCart]);

    const totalTickets = useMemo(() => summarizedCart.reduce((acc, item) => acc + item.quantity, 0), [summarizedCart]);

    const refreshCart = useCallback(() => {
        // Evitar múltiplas execuções simultâneas
        if (isRefreshingRef.current) {
            return;
        }
        
        isRefreshingRef.current = true;
        try {
            const rawItems = loadCartItems().filter((item) => item.quantity > 0);
            setCartItems(rawItems);
            setLoading(false);
        } finally {
            // Resetar flag após um pequeno delay para permitir próximas atualizações
            setTimeout(() => {
                isRefreshingRef.current = false;
            }, 50);
        }
    }, []);

    // Inicializar carrinho no mount
    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    // Escutar mudanças no storage com debounce
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Debounce de 50ms para eventos de storage
        const [debouncedRefreshCart, cancelDebounce] = debounce(refreshCart, 50);

        const handleStorage = (event: StorageEvent) => {
            if (event.key === '5521-cart-items') {
                debouncedRefreshCart();
            }
        };

        const handleCustomUpdate = () => debouncedRefreshCart();

        window.addEventListener('storage', handleStorage);
        window.addEventListener('apphub:cart:update', handleCustomUpdate);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('apphub:cart:update', handleCustomUpdate);
            // Cancelar qualquer debounce pendente ao desmontar
            cancelDebounce();
        };
    }, [refreshCart]);

    return {
        cartItems,
        summarizedCart,
        totalAmount,
        totalTickets,
        loading,
        refreshCart,
    };
}

