'use client';

import { useCallback } from 'react';
import { storageHelpers } from '../utils/storageHelpers';
import type { CheckoutCustomerData } from '../types';

/**
 * Hook para gerenciar todo o storage do checkout
 * Consolida lógica de orderId, timer, customerData, PIX flags e navigation flags
 */
export function useCheckoutStorage() {
    // ========== Order Storage ==========
    const saveOrderId = useCallback((orderId: string) => {
        storageHelpers.saveActiveOrderId(orderId);
    }, []);

    const loadOrderId = useCallback((): string | null => {
        return storageHelpers.loadActiveOrderId();
    }, []);

    const clearOrderId = useCallback(() => {
        storageHelpers.clearActiveOrderId();
    }, []);

    // ========== Timer Storage ==========
    const saveTimer = useCallback((startTime: number) => {
        storageHelpers.saveTimerStartTime(startTime);
    }, []);

    const loadTimer = useCallback((): number | null => {
        return storageHelpers.loadTimerStartTime();
    }, []);

    const clearTimer = useCallback(() => {
        storageHelpers.clearTimerStartTime();
    }, []);

    // ========== Customer Data Storage ==========
    const saveCustomerData = useCallback((data: CheckoutCustomerData) => {
        storageHelpers.saveCustomerData(data);
    }, []);

    const loadCustomerData = useCallback((): CheckoutCustomerData => {
        return storageHelpers.loadCustomerData();
    }, []);

    const clearCustomerData = useCallback(() => {
        storageHelpers.clearCustomerData();
    }, []);

    // ========== PIX Order Flag (sessionStorage) ==========
    const PIX_ORDER_ACTIVE_KEY = '__PIX_ORDER_ACTIVE__';

    const setPixOrderActive = useCallback((orderId: string) => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.setItem(PIX_ORDER_ACTIVE_KEY, orderId);
    }, []);

    const getPixOrderActive = useCallback((): string | null => {
        if (typeof window === 'undefined') return null;
        return window.sessionStorage.getItem(PIX_ORDER_ACTIVE_KEY);
    }, []);

    const clearPixOrderActive = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.removeItem(PIX_ORDER_ACTIVE_KEY);
    }, []);

    // ========== Navigation Flag (window global) ==========
    const setAllowNavigation = useCallback((allow: boolean) => {
        if (typeof window === 'undefined') return;
        (window as any).__ALLOW_NAVIGATION__ = allow;
        if (allow) {
            window.onbeforeunload = null;
            // Log removido para reduzir ruído
        }
        // Log removido para reduzir ruído
    }, []);

    const isNavigationAllowed = useCallback((): boolean => {
        if (typeof window === 'undefined') return false;
        return !!(window as any).__ALLOW_NAVIGATION__;
    }, []);

    // ========== Clear All ==========
    const clearAll = useCallback(() => {
        clearOrderId();
        clearTimer();
        clearPixOrderActive();
        setAllowNavigation(false);
    }, [clearOrderId, clearTimer, clearPixOrderActive, setAllowNavigation]);

    // ========== Clear Order Related (orderId + timer + PIX flag) ==========
    const clearOrderRelated = useCallback(() => {
        clearOrderId();
        clearTimer();
        clearPixOrderActive();
    }, [clearOrderId, clearTimer, clearPixOrderActive]);

    return {
        // Order
        saveOrderId,
        loadOrderId,
        clearOrderId,
        // Timer
        saveTimer,
        loadTimer,
        clearTimer,
        // Customer Data
        saveCustomerData,
        loadCustomerData,
        clearCustomerData,
        // PIX Flags
        setPixOrderActive,
        getPixOrderActive,
        clearPixOrderActive,
        // Navigation Flags
        setAllowNavigation,
        isNavigationAllowed,
        // Bulk operations
        clearAll,
        clearOrderRelated,
    };
}

