'use client';

import { createContext, useContext, ReactNode } from 'react';

// Context simples para começar - vamos expandir conforme necessário
interface CheckoutContextValue {
    // Será preenchido conforme as regras forem passadas
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
    const value: CheckoutContextValue = {
        // Será preenchido conforme necessário
    };

    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckoutContext() {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckoutContext must be used within CheckoutProvider');
    }
    return context;
}

