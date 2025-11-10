'use client';

import { useEffect, useState } from 'react';

declare global {
    interface Window {
        MercadoPago?: new (publicKey: string, options?: { locale?: string }) => any;
    }
}

export function useMercadoPago(publicKey?: string) {
    const [mercadoPago, setMercadoPago] = useState<any>(null);

    useEffect(() => {
        if (!publicKey || typeof window === 'undefined') {
            return;
        }

        let isMounted = true;

        const initialize = () => {
            if (!window.MercadoPago) return;
            try {
                const instance = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
                if (isMounted) {
                    setMercadoPago(instance);
                }
            } catch (error) {
                console.error('Erro ao inicializar MercadoPago:', error);
            }
        };

        if (window.MercadoPago) {
            initialize();
            return () => {
                isMounted = false;
            };
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => initialize();
        script.onerror = () => console.error('Não foi possível carregar o SDK do Mercado Pago');
        document.head.appendChild(script);

        return () => {
            isMounted = false;
            script.onload = null;
        };
    }, [publicKey]);

    return mercadoPago;
}


