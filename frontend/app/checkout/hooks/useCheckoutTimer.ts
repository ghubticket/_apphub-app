import { useState, useEffect, useRef, useCallback } from 'react';

// 30 minutos para testes de cartão
const CHECKOUT_TIMEOUT_SECONDS = 30 * 60; // 30 minutos em segundos
const CHECKOUT_TIMEOUT_MS = CHECKOUT_TIMEOUT_SECONDS * 1000;

export interface UseCheckoutTimerReturn {
    timeRemaining: number; // segundos restantes
    minutes: number;
    seconds: number;
    isExpired: boolean;
    percentageRemaining: number; // 0-100
    resetTimer: () => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
}

export function useCheckoutTimer(
    isActive: boolean,
    onExpire?: () => void,
    initialRemainingSeconds?: number | null, // Tempo restante em segundos (calculado do expiresAt da reserva)
): UseCheckoutTimerReturn {
    // Calcular tempo inicial baseado no initialRemainingSeconds ou usar padrão
    const getInitialTime = () => {
        if (initialRemainingSeconds !== undefined && initialRemainingSeconds !== null && initialRemainingSeconds > 0) {
            return initialRemainingSeconds * 1000; // Converter segundos para milissegundos
        }
        return CHECKOUT_TIMEOUT_MS;
    };
    
    const [timeRemaining, setTimeRemaining] = useState(getInitialTime);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now() - (CHECKOUT_TIMEOUT_MS - getInitialTime()));
    const pausedTimeRef = useRef<number>(0);
    const lastInitialSecondsRef = useRef<number | null | undefined>(initialRemainingSeconds);

    // Atualizar timer quando initialRemainingSeconds mudar (ex: reserva restaurada após F5)
    // IMPORTANTE: Não verificar isActive aqui - queremos atualizar mesmo se ainda não está ativo
    // para que quando ficar ativo, já tenha o valor correto
    useEffect(() => {
        // Só atualizar se o valor realmente mudou e é válido
        if (
            initialRemainingSeconds !== lastInitialSecondsRef.current &&
            initialRemainingSeconds !== undefined && 
            initialRemainingSeconds !== null && 
            initialRemainingSeconds > 0
        ) {
            const remainingMs = initialRemainingSeconds * 1000;
            setTimeRemaining(remainingMs);
            // Ajustar startTime para que o cálculo funcione corretamente
            // Se temos 7 minutos restantes (420000ms) e CHECKOUT_TIMEOUT_MS é 12 minutos (720000ms),
            // precisamos calcular quando começou: agora - (12min - 7min) = agora - 5min
            // Assim, quando calcularmos: elapsed = agora - startTime = 5min, remaining = 12min - 5min = 7min ✅
            startTimeRef.current = Date.now() - (CHECKOUT_TIMEOUT_MS - remainingMs);
            lastInitialSecondsRef.current = initialRemainingSeconds;
            console.log('[useCheckoutTimer] 🔄 Timer atualizado com tempo restante:', {
                initialRemainingSeconds,
                remainingMs,
                remainingMinutes: Math.floor(remainingMs / 60000),
                startTimeRef: startTimeRef.current,
                startTimeRefDate: new Date(startTimeRef.current).toISOString(),
                now: Date.now(),
                nowDate: new Date().toISOString(),
                calculatedElapsed: Date.now() - startTimeRef.current,
                calculatedRemaining: CHECKOUT_TIMEOUT_MS - (Date.now() - startTimeRef.current),
            });
        }
    }, [initialRemainingSeconds]);

    const resetTimer = useCallback(() => {
        // Timer resetado para 12 minutos
        setTimeRemaining(CHECKOUT_TIMEOUT_MS);
        setIsPaused(false);
        pausedTimeRef.current = 0;
        startTimeRef.current = Date.now();
    }, []);

    const pauseTimer = useCallback(() => {
        if (!isPaused) {
            // Timer pausado
            setIsPaused(true);
            pausedTimeRef.current = Date.now();
        }
    }, [isPaused]);

    const resumeTimer = useCallback(() => {
        if (isPaused) {
            // Timer retomado
            const pausedDuration = Date.now() - pausedTimeRef.current;
            startTimeRef.current += pausedDuration; // Ajustar tempo inicial
            setIsPaused(false);
            pausedTimeRef.current = 0;
        }
    }, [isPaused]);

    useEffect(() => {
        if (!isActive) {
            // Limpar timer quando checkout não está ativo
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Se temos tempo inicial (reserva restaurada), usar esse tempo
        // Mas só atualizar se ainda não foi atualizado pelo useEffect anterior
        if (initialRemainingSeconds !== undefined && initialRemainingSeconds !== null && initialRemainingSeconds > 0) {
            // Verificar se já foi atualizado pelo useEffect anterior
            if (lastInitialSecondsRef.current !== initialRemainingSeconds) {
                const remainingMs = initialRemainingSeconds * 1000;
                setTimeRemaining(remainingMs);
                startTimeRef.current = Date.now() - (CHECKOUT_TIMEOUT_MS - remainingMs);
                lastInitialSecondsRef.current = initialRemainingSeconds;
            }
        } else {
            // Iniciar timer quando checkout fica ativo (apenas se não temos tempo inicial)
            resetTimer();
            lastInitialSecondsRef.current = null;
        }

        // Atualizar timer a cada segundo
        intervalRef.current = setInterval(() => {
            if (isPaused) {
                return; // Não atualizar quando pausado
            }

            // Se temos tempo inicial específico (reserva restaurada), calcular baseado no startTimeRef ajustado
            // O startTimeRef já foi ajustado para refletir o tempo correto da reserva
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
            
            setTimeRemaining(remaining);

            if (remaining === 0) {
                console.warn('[useCheckoutTimer] ⏰ Timer expirado!');
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                if (onExpire) {
                    onExpire();
                }
            }
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, isPaused, onExpire, resetTimer, initialRemainingSeconds]);

    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    const isExpired = timeRemaining === 0;
    const percentageRemaining = (timeRemaining / CHECKOUT_TIMEOUT_MS) * 100;

    return {
        timeRemaining: Math.floor(timeRemaining / 1000), // em segundos
        minutes,
        seconds,
        isExpired,
        percentageRemaining,
        resetTimer,
        pauseTimer,
        resumeTimer,
    };
}

