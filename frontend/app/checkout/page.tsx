'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { CheckoutProvider } from './providers/CheckoutProvider';
import { CheckoutLayout } from './components/CheckoutLayout';

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
        __MP_INITIALIZED__?: boolean;
        __MP_BRICK_RESET__?: () => void;
        __MP_BRICK_CONTAINER__?: HTMLDivElement;
    }
}

function CheckoutPageContent() {
    const router = useRouter();
    const { user, isAuthenticated, isReady } = useAuth();

    // Proteção: redirecionar para login se não estiver autenticado
    useEffect(() => {
        if (isReady && !isAuthenticated) {
            const returnUrl = '/checkout';
            router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
    }, [isReady, isAuthenticated, router]);

    // A detecção de navegação é feita pelo useNavigationGuard no CheckoutLayout
    // Não precisamos interceptar aqui, pois o componente CheckoutLayout já faz isso

    // Inicializar Mercado Pago
    useEffect(() => {
        if (typeof window !== 'undefined' && MP_PUBLIC_KEY && !window.__MP_INITIALIZED__) {
            try {
                initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
                window.__MP_INITIALIZED__ = true;
                
                // Tentar capturar deviceId após inicialização
                // O SDK pode definir window.MP_DEVICE_SESSION_ID após alguns milissegundos
                const checkDeviceId = setInterval(() => {
                    if (window.MP_DEVICE_SESSION_ID) {
                        localStorage.setItem('mp-device-session-id', window.MP_DEVICE_SESSION_ID);
                        console.log('[Checkout] ✅ DeviceId capturado após inicialização:', window.MP_DEVICE_SESSION_ID.substring(0, 15) + '...');
                        clearInterval(checkDeviceId);
                    }
                }, 100);
                
                // Limpar após 5 segundos
                setTimeout(() => {
                    clearInterval(checkDeviceId);
                }, 5000);
            } catch (error) {
                console.error('[Checkout] Erro ao inicializar Mercado Pago:', error);
            }
        }
    }, []);

    if (!isReady || (isReady && !isAuthenticated)) {
    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
                <div className="flex min-h-screen items-center justify-center">
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        Verificando autenticação...
                    </div>
                    </div>
        </main>
    );
    }

    return <CheckoutLayout />;
}

export default function CheckoutPage() {
    return (
        <CheckoutProvider>
            <CheckoutPageContent />
        </CheckoutProvider>
    );
}
