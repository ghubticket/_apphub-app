'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { registerGlobalErrorHandler, unregisterGlobalErrorHandler } from '@/lib/globalErrorHandler';

interface GlobalError {
    isOpen: boolean;
    title?: string;
    message?: string;
    errorType?: 'network' | 'server' | 'maintenance' | 'unknown';
}

interface GlobalErrorContextType {
    error: GlobalError;
    showError: (error: Omit<GlobalError, 'isOpen'>) => void;
    hideError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export function GlobalErrorProvider({ children }: { children: ReactNode }) {
    const [error, setError] = useState<GlobalError>({
        isOpen: false,
    });

    const showError = useCallback((errorData: Omit<GlobalError, 'isOpen'>) => {
        setError({
            ...errorData,
            isOpen: true,
        });
    }, []);

    const hideError = useCallback(() => {
        setError((prev) => ({
            ...prev,
            isOpen: false,
        }));
    }, []);

    // Registrar handler global para ser usado em interceptors
    useEffect(() => {
        registerGlobalErrorHandler(showError);
        return () => {
            unregisterGlobalErrorHandler();
        };
    }, [showError]);

    return (
        <GlobalErrorContext.Provider value={{ error, showError, hideError }}>
            {children}
        </GlobalErrorContext.Provider>
    );
}

export function useGlobalError() {
    const context = useContext(GlobalErrorContext);
    if (context === undefined) {
        throw new Error('useGlobalError must be used within a GlobalErrorProvider');
    }
    return context;
}

