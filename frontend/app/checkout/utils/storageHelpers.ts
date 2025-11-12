const CHECKOUT_CUSTOMER_STORAGE_KEY = 'checkout:customer-data';
const CHECKOUT_DEVICE_STORAGE_KEY = 'checkout:mp-device';
const CHECKOUT_ACTIVE_ORDER_KEY = 'checkout:active-order-id';

export type CheckoutCustomerData = {
    name: string;
    email: string;
    cpf: string;
    phone: string;
};

export type CreatedOrder = {
    _id: string;
    orderNumber?: string;
    status: string;
    cardAttempts?: number;
    [key: string]: any;
};

export const storageHelpers = {
    // Customer Data
    loadCustomerData: (): CheckoutCustomerData => {
        if (typeof window === 'undefined') {
            return { name: '', email: '', cpf: '', phone: '' };
        }
        const raw = window.localStorage.getItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as Partial<CheckoutCustomerData>;
                return {
                    name: parsed.name ?? '',
                    email: parsed.email ?? '',
                    cpf: parsed.cpf ?? '',
                    phone: parsed.phone ?? '',
                };
            } catch {
                // ignore parse errors
            }
        }
        return { name: '', email: '', cpf: '', phone: '' };
    },

    saveCustomerData: (data: CheckoutCustomerData): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(CHECKOUT_CUSTOMER_STORAGE_KEY, JSON.stringify(data));
    },

    clearCustomerData: (): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
    },

    // Order
    saveActiveOrderId: (orderId: string): void => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.setItem(CHECKOUT_ACTIVE_ORDER_KEY, orderId);
    },

    loadActiveOrderId: (): string | null => {
        if (typeof window === 'undefined') return null;
        return window.sessionStorage.getItem(CHECKOUT_ACTIVE_ORDER_KEY);
    },

    clearActiveOrderId: (): void => {
        if (typeof window === 'undefined') return;
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
};

