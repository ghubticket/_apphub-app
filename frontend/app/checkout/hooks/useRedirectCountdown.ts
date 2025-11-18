'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useCheckoutNavigation } from './useCheckoutNavigation';

interface UseRedirectCountdownOptions {
    onCountdownUpdate?: (countdown: number | null) => void;
}

interface UseRedirectCountdownReturn {
    startCountdown: (targetPath: string, seconds: number) => () => void; // Retorna função de cleanup
    stopCountdown: () => void;
    countdown: number | null;
}

/**
 * Hook para gerenciar countdown de redirecionamento
 * Usa useCheckoutNavigation internamente para navegação
 */
export function useRedirectCountdown({
    onCountdownUpdate,
}: UseRedirectCountdownOptions = {}): UseRedirectCountdownReturn {
    const navigation = useCheckoutNavigation();
    const [countdown, setCountdown] = useState<number | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    // Parar countdown
    const stopCountdown = useCallback(() => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
        setCountdown(null);
        if (onCountdownUpdate) {
            onCountdownUpdate(null);
        }
    }, [onCountdownUpdate]);

    // Iniciar countdown
    const startCountdown = useCallback((targetPath: string, seconds: number) => {
        // Parar countdown anterior se existir
        stopCountdown();

        // Iniciar novo countdown usando useCheckoutNavigation
        const cleanup = navigation.startRedirectCountdown(
            targetPath,
            seconds,
            (countdownValue) => {
                setCountdown(countdownValue > 0 ? countdownValue : null);
                if (onCountdownUpdate) {
                    onCountdownUpdate(countdownValue > 0 ? countdownValue : null);
                }
            },
            { clearStorage: true, useReplace: true }
        );

        cleanupRef.current = cleanup;
        setCountdown(seconds);

        // Retornar função de cleanup
        return cleanup;
    }, [navigation, stopCountdown, onCountdownUpdate]);

    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            stopCountdown();
        };
    }, [stopCountdown]);

    return {
        startCountdown,
        stopCountdown,
        countdown,
    };
}

