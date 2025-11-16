'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, loadCartItems } from '@/lib/cart';
import type { CheckoutCartItem } from '../types';

export function useCheckoutCart() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

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
        const rawItems = loadCartItems().filter((item) => item.quantity > 0);
        setCartItems(rawItems);
        setLoading(false);
    }, []);

    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    // Escutar mudanças no storage
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorage = (event: StorageEvent) => {
            if (event.key === '5521-cart-items') {
                refreshCart();
            }
        };

        const handleCustomUpdate = () => refreshCart();

        window.addEventListener('storage', handleStorage);
        window.addEventListener('apphub:cart:update', handleCustomUpdate);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('apphub:cart:update', handleCustomUpdate);
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

