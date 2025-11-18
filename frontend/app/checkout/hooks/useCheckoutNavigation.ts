'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearCartItems } from '@/lib/cart';
import { useCheckoutStorage } from './useCheckoutStorage';

interface UseCheckoutNavigationReturn {
    navigateToHome: () => void;
    navigateToDashboard: (options?: { clearStorage?: boolean; useReplace?: boolean }) => void;
    navigateTo: (path: string, options?: { clearStorage?: boolean; useReplace?: boolean }) => void;
    allowNavigation: () => void;
    blockNavigation: () => void;
    startRedirectCountdown: (
        targetPath: string,
        seconds: number,
        onCountdownUpdate?: (countdown: number) => void,
        options?: { clearStorage?: boolean; useReplace?: boolean }
    ) => () => void; // Retorna função de cleanup
}

/**
 * Hook para consolidar lógica de redirecionamento e navegação
 * Gerencia flags __ALLOW_NAVIGATION__ e onbeforeunload
 * Unifica redirecionamentos para /dashboard e /
 */
export function useCheckoutNavigation(): UseCheckoutNavigationReturn {
    const router = useRouter();
    const storage = useCheckoutStorage();
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Permitir navegação (remover bloqueios)
    const allowNavigation = useCallback(() => {
        storage.setAllowNavigation(true);
    }, [storage]);

    // Bloquear navegação
    const blockNavigation = useCallback(() => {
        storage.setAllowNavigation(false);
    }, [storage]);

    // Navegar para home
    const navigateToHome = useCallback(() => {
        console.log('[useCheckoutNavigation] 🏠 Navegando para home');
        router.push('/');
    }, [router]);

    // Navegar para dashboard
    const navigateToDashboard = useCallback((options?: { clearStorage?: boolean; useReplace?: boolean }) => {
        const { clearStorage = true, useReplace = false } = options || {};
        
        console.log('[useCheckoutNavigation] 📊 Navegando para dashboard', { clearStorage, useReplace });

        if (clearStorage) {
            // Limpar storage relacionado ao pedido
            storage.clearOrderRelated();
            // Limpar carrinho
            clearCartItems();
        }

        // Permitir navegação
        allowNavigation();

        if (useReplace && typeof window !== 'undefined') {
            // Usar window.location.replace para forçar navegação completa
            // Isso remove automaticamente todos os event listeners
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.location.replace('/dashboard');
                }, 0);
            });
        } else {
            router.push('/dashboard');
        }
    }, [router, storage, allowNavigation]);

    // Navegar para path genérico
    const navigateTo = useCallback((
        path: string,
        options?: { clearStorage?: boolean; useReplace?: boolean }
    ) => {
        const { clearStorage = false, useReplace = false } = options || {};
        
        console.log('[useCheckoutNavigation] 🧭 Navegando para:', path, { clearStorage, useReplace });

        if (clearStorage) {
            // Limpar storage relacionado ao pedido
            storage.clearOrderRelated();
            // Limpar carrinho
            clearCartItems();
        }

        // Permitir navegação
        allowNavigation();

        if (useReplace && typeof window !== 'undefined') {
            // Usar window.location.replace para forçar navegação completa
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.location.replace(path);
                }, 0);
            });
        } else {
            router.push(path);
        }
    }, [router, storage, allowNavigation]);

    // Iniciar countdown para redirecionamento
    const startRedirectCountdown = useCallback((
        targetPath: string,
        seconds: number,
        onCountdownUpdate?: (countdown: number) => void,
        options?: { clearStorage?: boolean; useReplace?: boolean }
    ) => {
        // Limpar countdown anterior se existir
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        const { clearStorage = true, useReplace = true } = options || {};
        let countdown = seconds;

        countdownIntervalRef.current = setInterval(() => {
            countdown -= 1;
            
            if (countdown > 0) {
                // Atualizar countdown via callback
                if (onCountdownUpdate) {
                    onCountdownUpdate(countdown);
                }
            } else {
                // Countdown terminou, limpar intervalo
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }

                // Limpar countdown via callback
                if (onCountdownUpdate) {
                    onCountdownUpdate(0);
                }

                // Limpar storage se necessário
                if (clearStorage) {
                    storage.clearOrderRelated();
                    clearCartItems();
                }

                // Permitir navegação
                allowNavigation();

                // Navegar
                if (useReplace && typeof window !== 'undefined') {
                    // Usar requestAnimationFrame para garantir que não navegue durante render
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            window.location.replace(targetPath);
                        }, 0);
                    });
                } else {
                    router.push(targetPath);
                }
            }
        }, 1000);

        // Retornar função de cleanup
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            if (onCountdownUpdate) {
                onCountdownUpdate(0);
            }
        };
    }, [router, storage, allowNavigation]);

    return {
        navigateToHome,
        navigateToDashboard,
        navigateTo,
        allowNavigation,
        blockNavigation,
        startRedirectCountdown,
    };
}

