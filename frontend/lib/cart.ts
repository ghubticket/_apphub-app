'use client';

import { useCallback, useEffect } from 'react';

export type CartItem = {
    id: string;
    ticketTypeId?: string;
    eventId?: string;
    name: string;
    quantity: number;
    price: number;
    date?: string;
    location?: string;
    image?: string;
    maxQuantity?: number;
    ticketFee?: number;
    platformFeePercentage?: number;
    metadata?: Record<string, string | number | boolean | null | undefined>;
};

export const CART_STORAGE_KEY = 'toka-cart-items';
export const CART_UPDATED_EVENT = 'apphub:cart:update';
export const CART_OPEN_EVENT = 'apphub:cart:open';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Função para detectar se um item é VIP (não deve estar no carrinho)
const isVipTicket = (item: CartItem): boolean => {
    // Detectar por nome (contém "VIP" ou "vip")
    const nameLower = item.name?.toLowerCase() || '';
    if (nameLower.includes('vip')) {
        return true;
    }
    // Detectar por preço zero (VIP geralmente é gratuito)
    if (item.price === 0) {
        return true;
    }
    // Detectar por metadata
    if (item.metadata?.isVip === true || item.metadata?.isVip === 'true') {
        return true;
    }
    return false;
};

const sanitizeCartItem = (item: CartItem): CartItem => ({
    id: String(item.id),
    ticketTypeId: item.ticketTypeId ? String(item.ticketTypeId) : String(item.id),
    eventId: item.eventId ? String(item.eventId) : undefined,
    name: String(item.name),
    quantity: Math.max(0, Number.isFinite(item.quantity) ? Number(item.quantity) : 0),
    price: Number.isFinite(item.price) ? Number(item.price) : 0,
    date: item.date ? String(item.date) : undefined,
    location: item.location ? String(item.location) : undefined,
    image: item.image ? String(item.image) : undefined,
    maxQuantity:
        typeof item.maxQuantity === 'number' && Number.isFinite(item.maxQuantity) && item.maxQuantity > 0
            ? Math.floor(item.maxQuantity)
            : undefined,
    ticketFee: typeof item.ticketFee === 'number' && Number.isFinite(item.ticketFee) ? Number(item.ticketFee) : undefined,
    platformFeePercentage:
        typeof item.platformFeePercentage === 'number' && Number.isFinite(item.platformFeePercentage)
            ? Number(item.platformFeePercentage)
            : undefined,
    metadata: item.metadata ?? undefined,
});

export const loadCartItems = (): CartItem[] => {
    if (!isBrowser()) {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const items = parsed
            .map((entry) => {
                try {
                    return sanitizeCartItem(entry);
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as CartItem[];
        
        // CRÍTICO: Filtrar e remover ingressos VIP do carrinho
        const nonVipItems = items.filter((item) => !isVipTicket(item));
        
        // Se houver diferença, salvar o carrinho sem os VIPs
        if (nonVipItems.length !== items.length) {
            saveCartItems(nonVipItems);
        }
        
        return nonVipItems;
    } catch {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return [];
    }
};

export const saveCartItems = (items: CartItem[]) => {
    if (!isBrowser()) return;
    const sanitized = items.map((item) => sanitizeCartItem(item));
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

export const clearCartItems = () => {
    if (!isBrowser()) return;
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

type AddCartItemOptions = {
    merge?: boolean;
};

export const addCartItem = (item: CartItem, options: AddCartItemOptions = {}) => {
    if (!isBrowser()) return;
    
    // CRÍTICO: Bloquear adição de ingressos VIP ao carrinho
    if (isVipTicket(item)) {
        console.warn('[cart] ⚠️ Tentativa de adicionar ingresso VIP ao carrinho bloqueada:', item.name);
        return;
    }
    
    const { merge = true } = options;
    const current = loadCartItems();
    const sanitized = sanitizeCartItem(item);

    if (!merge) {
        current.push(sanitized);
        saveCartItems(current);
        return;
    }

    const existingIndex = current.findIndex((cartItem) => cartItem.id === sanitized.id);
    if (existingIndex >= 0) {
        const existing = current[existingIndex];
        const maxQuantity = sanitized.maxQuantity ?? existing.maxQuantity;
        const nextQuantity = existing.quantity + sanitized.quantity;
        const clampedQuantity =
            typeof maxQuantity === 'number' ? Math.min(nextQuantity, Math.max(1, maxQuantity)) : nextQuantity;

        current[existingIndex] = {
            ...existing,
            ...sanitized,
            quantity: clampedQuantity,
            maxQuantity,
        };
    } else {
        // Se já existe outro item diferente no carrinho e merge=false, substitui lista
        current.push(sanitized);
    }

    saveCartItems(current);
};

export const emitOpenCart = () => {
    if (!isBrowser()) return;
    window.dispatchEvent(new Event(CART_OPEN_EVENT));
};

export const removeCartItem = (itemId: string) => {
    if (!isBrowser()) return;
    const current = loadCartItems();
    const next = current.filter((item) => item.id !== itemId);
    saveCartItems(next);
};

export const useCartSubscription = (callback: () => void) => {
    useEffect(() => {
        if (!isBrowser()) return;
        const handler = () => callback();
        window.addEventListener(CART_UPDATED_EVENT, handler);
        return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
    }, [callback]);
};


