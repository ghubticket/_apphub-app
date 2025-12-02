import type { CheckoutCustomerData } from '../types';

const CHECKOUT_CUSTOMER_STORAGE_KEY = 'checkout:customer-data';
const CHECKOUT_CUSTOMER_USER_ID_KEY = 'checkout:customer-user-id';
const CHECKOUT_DEVICE_STORAGE_KEY = 'checkout:mp-device';
const CHECKOUT_ACTIVE_ORDER_KEY = 'checkout:active-order-id';
const CHECKOUT_TIMER_START_KEY = 'checkout:timer-start-time';

export type CreatedOrder = {
    _id: string;
    orderNumber?: string;
    status: string;
    cardAttempts?: number;
    [key: string]: any;
};

export const storageHelpers = {
    // Customer Data
    loadCustomerData: (userId?: string | null): CheckoutCustomerData => {
        if (typeof window === 'undefined') {
            return { name: '', email: '', cpf: '', phone: '' };
        }
        
        // Se houver userId, verificar se os dados salvos pertencem a esse usuário
        if (userId) {
            const savedUserId = window.localStorage.getItem(CHECKOUT_CUSTOMER_USER_ID_KEY);
            
            if (savedUserId && savedUserId !== userId) {
                // Usuário diferente - limpar dados antigos
                window.localStorage.removeItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
                window.localStorage.removeItem(CHECKOUT_CUSTOMER_USER_ID_KEY);
                return { name: '', email: '', cpf: '', phone: '' };
            }
        } else {
            // Sem userId - limpar dados para segurança
            window.localStorage.removeItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
            window.localStorage.removeItem(CHECKOUT_CUSTOMER_USER_ID_KEY);
            return { name: '', email: '', cpf: '', phone: '' };
        }
        
        const raw = window.localStorage.getItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as Partial<CheckoutCustomerData>;
                const loaded = {
                    name: parsed.name ?? '',
                    email: parsed.email ?? '',
                    cpf: parsed.cpf ?? '',
                    phone: parsed.phone ?? '',
                };
                // Log removido para reduzir ruído
                return loaded;
            } catch {
                // ignore parse errors
            }
        }
        
        // Log removido para reduzir ruído
        return { name: '', email: '', cpf: '', phone: '' };
    },

    saveCustomerData: (data: CheckoutCustomerData, userId?: string | null): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(CHECKOUT_CUSTOMER_STORAGE_KEY, JSON.stringify(data));
        if (userId) {
            window.localStorage.setItem(CHECKOUT_CUSTOMER_USER_ID_KEY, userId);
        }
    },

    clearCustomerData: (): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
        window.localStorage.removeItem(CHECKOUT_CUSTOMER_USER_ID_KEY);
    },

    // Order
    saveActiveOrderId: (orderId: string): void => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.setItem(CHECKOUT_ACTIVE_ORDER_KEY, orderId);
    },

    loadActiveOrderId: (): string | null => {
        if (typeof window === 'undefined') return null;
        const orderId = window.sessionStorage.getItem(CHECKOUT_ACTIVE_ORDER_KEY);
        // OTIMIZADO: Removido log excessivo - será logado apenas quando necessário
        return orderId;
    },

    clearActiveOrderId: (): void => {
        if (typeof window === 'undefined') return;
        const orderId = window.sessionStorage.getItem(CHECKOUT_ACTIVE_ORDER_KEY);
        window.sessionStorage.removeItem(CHECKOUT_ACTIVE_ORDER_KEY);
    },

    // Device ID
    saveDeviceId: (deviceId: string): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, deviceId);
    },

    loadDeviceId: (): string | null => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(CHECKOUT_DEVICE_STORAGE_KEY);
    },

    // Timer persistence
    saveTimerStartTime: (startTime: number): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(CHECKOUT_TIMER_START_KEY, String(startTime));
    },

    loadTimerStartTime: (): number | null => {
        if (typeof window === 'undefined') return null;
        const raw = window.localStorage.getItem(CHECKOUT_TIMER_START_KEY);
        if (raw) {
            const parsed = Number(raw);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
        return null;
    },

    clearTimerStartTime: (): void => {
        if (typeof window === 'undefined') return;
        const oldTime = window.localStorage.getItem(CHECKOUT_TIMER_START_KEY);
        window.localStorage.removeItem(CHECKOUT_TIMER_START_KEY);
        if (oldTime) {
        }
    },
};

