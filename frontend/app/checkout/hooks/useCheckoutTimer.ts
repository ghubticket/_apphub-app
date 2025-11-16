import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { storageHelpers } from '../utils/storageHelpers';
import { parseExpiresAt, getRemainingTime } from '../utils/orderHelpers';

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
    initialRemainingSeconds?: number | null, // Tempo restante em segundos (calculado do expiresAt do pedido)
    expiresAt?: string | Date | null, // Data de expiração do pedido (prioridade sobre initialRemainingSeconds)
): UseCheckoutTimerReturn {
    // CORRIGIDO: Usar useMemo para calcular valores iniciais apenas quando necessário
    // Isso evita recalcular a cada render e causar loops infinitos
    const initialValues = useMemo(() => {
        // Prioridade 1: Se temos expiresAt do pedido (nova arquitetura)
        if (expiresAt) {
            const now = Date.now();
            const remaining = getRemainingTime(expiresAt, now);
            
            if (remaining > 0) {
                const startTime = now - (CHECKOUT_TIMEOUT_MS - remaining);
                return { initialTime: remaining, startTime };
            } else {
                // Pedido já expirou
                return { initialTime: 0, startTime: now };
            }
        }
        
        // Prioridade 2: Se temos tempo inicial passado como prop (compatibilidade)
        if (initialRemainingSeconds !== undefined && initialRemainingSeconds !== null && initialRemainingSeconds > 0) {
            const remainingMs = initialRemainingSeconds * 1000;
            const startTime = Date.now() - (CHECKOUT_TIMEOUT_MS - remainingMs);
            return { initialTime: remainingMs, startTime };
        }
        
        // Prioridade 3: Tentar restaurar tempo do localStorage (fallback)
        const savedStartTime = typeof window !== 'undefined' ? storageHelpers.loadTimerStartTime() : null;
        if (savedStartTime) {
            const elapsed = Date.now() - savedStartTime;
            const remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
            
            if (remaining > 0) {
                return { initialTime: remaining, startTime: savedStartTime };
            } else {
                if (typeof window !== 'undefined') {
                    storageHelpers.clearTimerStartTime();
                }
            }
        }
        
        // Prioridade 4: Iniciar novo timer com 30 minutos
        const newStartTime = Date.now();
        return { initialTime: CHECKOUT_TIMEOUT_MS, startTime: newStartTime };
    }, [expiresAt, initialRemainingSeconds]); // Apenas recalcular quando essas props mudarem
    
    const [timeRemaining, setTimeRemaining] = useState(initialValues.initialTime);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(initialValues.startTime);
    const pausedTimeRef = useRef<number>(0);
    const lastInitialSecondsRef = useRef<number | null | undefined>(initialRemainingSeconds);
    const lastExpiresAtRef = useRef<string | Date | null | undefined>(expiresAt);
    const hasInitializedFromStorageRef = useRef(false); // CORRIGIDO: Ref para rastrear inicialização do localStorage
    
    // CONSOLIDADO: Unificar lógica de inicialização e atualização do timer
    // CORRIGIDO: Usar refs para rastrear mudanças e evitar loops infinitos
    useEffect(() => {
        const now = Date.now();
        
        // Prioridade 1: expiresAt do pedido (nova arquitetura)
        if (expiresAt && expiresAt !== lastExpiresAtRef.current) {
            const remaining = getRemainingTime(expiresAt, now);
            if (remaining > 0) {
                const startTime = now - (CHECKOUT_TIMEOUT_MS - remaining);
                setTimeRemaining(remaining);
                startTimeRef.current = startTime;
                lastExpiresAtRef.current = expiresAt;
                hasInitializedFromStorageRef.current = true; // Marcar como inicializado
                console.log('[useCheckoutTimer] 🔄 Timer atualizado com expiresAt do pedido:', {
                    expiresAt: parseExpiresAt(expiresAt)?.toISOString(),
                    remainingMs: remaining,
                    remainingMinutes: Math.floor(remaining / 60000),
                });
            } else {
                setTimeRemaining(0);
                lastExpiresAtRef.current = expiresAt;
                hasInitializedFromStorageRef.current = true;
            }
            return;
        }
        
        // Prioridade 2: initialRemainingSeconds (compatibilidade)
        if (
            initialRemainingSeconds !== lastInitialSecondsRef.current &&
            initialRemainingSeconds !== undefined && 
            initialRemainingSeconds !== null && 
            initialRemainingSeconds > 0
        ) {
            const remainingMs = initialRemainingSeconds * 1000;
            setTimeRemaining(remainingMs);
            startTimeRef.current = now - (CHECKOUT_TIMEOUT_MS - remainingMs);
            lastInitialSecondsRef.current = initialRemainingSeconds;
            hasInitializedFromStorageRef.current = true; // Marcar como inicializado
            // Limpar timer antigo do localStorage quando temos initialRemainingSeconds
            storageHelpers.clearTimerStartTime();
            console.log('[useCheckoutTimer] 🔄 Timer atualizado com tempo restante:', {
                initialRemainingSeconds,
                remainingMinutes: Math.floor(remainingMs / 60000),
            });
            return;
        }

        // Prioridade 3: Restaurar do localStorage (fallback) - apenas na primeira vez
        if (
            !expiresAt && 
            (initialRemainingSeconds === undefined || initialRemainingSeconds === null || initialRemainingSeconds <= 0) &&
            !hasInitializedFromStorageRef.current
        ) {
            const savedStartTime = storageHelpers.loadTimerStartTime();
            if (savedStartTime) {
                const elapsed = now - savedStartTime;
                const remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
                if (remaining > 0) {
                    setTimeRemaining(remaining);
                    startTimeRef.current = savedStartTime;
                    console.log('[useCheckoutTimer] 🔄 Timer restaurado do localStorage:', {
                        savedStartTime: new Date(savedStartTime).toISOString(),
                        remainingMs: remaining,
                        remainingMinutes: Math.floor(remaining / 60000),
                    });
                } else {
                    console.log('[useCheckoutTimer] ⏰ Timer do localStorage expirado, limpando');
                    storageHelpers.clearTimerStartTime();
                }
            } else {
                // Novo timer iniciado sem expiresAt, salvar no localStorage (fallback)
                const newStartTime = Date.now();
                storageHelpers.saveTimerStartTime(newStartTime);
                startTimeRef.current = newStartTime;
                console.log('[useCheckoutTimer] 💾 Novo timer salvo no localStorage:', {
                    startTime: new Date(newStartTime).toISOString(),
                });
            }
            // Marcar como inicializado para não executar novamente
            hasInitializedFromStorageRef.current = true;
            lastInitialSecondsRef.current = initialRemainingSeconds;
        }
    }, [expiresAt, initialRemainingSeconds]); // CORRIGIDO: Apenas dependências estáveis

    const resetTimer = useCallback(() => {
        // Timer resetado para 30 minutos (CHECKOUT_TIMEOUT_SECONDS)
        // IMPORTANTE: Só resetar se não temos expiresAt (pedido sem expiresAt)
        if (expiresAt) {
            console.log('[useCheckoutTimer] ⚠️ Tentativa de resetar timer ignorada (temos expiresAt do pedido)');
            return;
        }
        
        const newStartTime = Date.now();
        setTimeRemaining(CHECKOUT_TIMEOUT_MS);
        setIsPaused(false);
        pausedTimeRef.current = 0;
        startTimeRef.current = newStartTime;
        // Salvar novo tempo de início no localStorage (apenas se não temos expiresAt)
        storageHelpers.saveTimerStartTime(newStartTime);
        console.log('[useCheckoutTimer] 🔄 Timer resetado e salvo:', {
            startTime: new Date(newStartTime).toISOString(),
        });
    }, [expiresAt]);

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

        // Timer já foi inicializado pelo useEffect anterior quando expiresAt/initialRemainingSeconds mudaram
        // Aqui apenas garantimos que o timer está rodando quando isActive=true

        // Atualizar timer a cada segundo
        intervalRef.current = setInterval(() => {
            if (isPaused) {
                return; // Não atualizar quando pausado
            }

            // Calcular tempo restante
            let remaining: number;
            if (expiresAt) {
                // Se temos expiresAt, calcular baseado nele (fonte de verdade)
                remaining = getRemainingTime(expiresAt);
            } else {
                // Se não temos expiresAt, usar cálculo baseado em startTimeRef
                const elapsed = Date.now() - startTimeRef.current;
                remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
            }
            
            setTimeRemaining(remaining);

            if (remaining === 0) {
                console.warn('[useCheckoutTimer] ⏰ Timer expirado!');
                storageHelpers.clearTimerStartTime();
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
    }, [isActive, isPaused, onExpire, expiresAt]); // CORRIGIDO: Removidas dependências que causavam loop (resetTimer, initialRemainingSeconds)

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

