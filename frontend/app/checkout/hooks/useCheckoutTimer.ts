import { useState, useEffect, useRef, useCallback } from 'react';
import { storageHelpers } from '../utils/storageHelpers';

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
    // Calcular tempo inicial baseado no expiresAt do pedido, tempo salvo ou usar padrão
    const getInitialTimeAndStartTime = () => {
        // Prioridade 1: Se temos expiresAt do pedido (nova arquitetura)
        if (expiresAt) {
            const expiresAtDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
            const now = Date.now();
            const remaining = Math.max(0, expiresAtDate.getTime() - now);
            
            if (remaining > 0) {
                const startTime = now - (CHECKOUT_TIMEOUT_MS - remaining);
                // Log apenas quando realmente necessário (não a cada render)
                // Removido log excessivo - será logado apenas quando expiresAt mudar no useEffect
                return { initialTime: remaining, startTime };
            } else {
                // Pedido já expirou
                console.log('[useCheckoutTimer] ⏰ Pedido já expirado');
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
                console.log('[useCheckoutTimer] 🔄 Restaurando timer do localStorage (fallback):', {
                    savedStartTime: new Date(savedStartTime).toISOString(),
                    remainingMinutes: Math.floor(remaining / 60000),
                });
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
    };
    
    const { initialTime, startTime: initialStartTime } = getInitialTimeAndStartTime();
    
    const [timeRemaining, setTimeRemaining] = useState(initialTime);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(initialStartTime);
    const pausedTimeRef = useRef<number>(0);
    const lastInitialSecondsRef = useRef<number | null | undefined>(initialRemainingSeconds);
    const lastExpiresAtRef = useRef<string | Date | null | undefined>(expiresAt); // Rastrear último expiresAt processado
    
    // Salvar startTime no localStorage quando iniciar novo timer
    // IMPORTANTE: Manter timer no localStorage mesmo quando temos expiresAt (para fallback quando retorna 403)
    useEffect(() => {
        // IMPORTANTE: NÃO limpar o timer do localStorage quando temos expiresAt
        // O timer no localStorage serve como fallback quando o pedido retorna 403 temporariamente
        // Ele será usado para verificar se o timer ainda está válido antes de limpar o pedido
        if (expiresAt) {
            // Não limpar o timer do localStorage - ele é necessário como fallback de segurança
            // O timer já foi salvo pelo useCheckoutOrder quando o pedido foi encontrado/criado
            // Útil para casos de erro de rede, problemas temporários de autenticação, etc.
            // Não precisa logar sempre, apenas em modo debug
            return;
        }
        
        const savedStartTime = storageHelpers.loadTimerStartTime();
        if (!savedStartTime && initialTime === CHECKOUT_TIMEOUT_MS && !expiresAt) {
            // Novo timer iniciado sem expiresAt, salvar no localStorage (fallback)
            storageHelpers.saveTimerStartTime(initialStartTime);
            console.log('[useCheckoutTimer] 💾 Novo timer salvo no localStorage (sem expiresAt):', {
                startTime: new Date(initialStartTime).toISOString(),
            });
        }
    }, [initialTime, initialStartTime, expiresAt]);

    // Atualizar timer quando expiresAt ou initialRemainingSeconds mudar
    // IMPORTANTE: Não verificar isActive aqui - queremos atualizar mesmo se ainda não está ativo
    // para que quando ficar ativo, já tenha o valor correto
    useEffect(() => {
        // Prioridade 1: expiresAt do pedido (nova arquitetura)
        if (expiresAt) {
            const expiresAtDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
            const now = Date.now();
            const remaining = Math.max(0, expiresAtDate.getTime() - now);

            if (remaining > 0) {
                const startTime = now - (CHECKOUT_TIMEOUT_MS - remaining);
                setTimeRemaining(remaining);
                startTimeRef.current = startTime;
                // IMPORTANTE: NÃO limpar o timer do localStorage aqui
                // Ele é necessário como fallback quando o pedido retorna 403
                // O timer já foi salvo pelo useCheckoutOrder quando o pedido foi encontrado/criado
                console.log('[useCheckoutTimer] 🔄 Timer atualizado com expiresAt do pedido (mantendo localStorage como fallback):', {
                    expiresAt: expiresAtDate.toISOString(),
                    remainingMs: remaining,
                    remainingMinutes: Math.floor(remaining / 60000),
                });
            } else {
                setTimeRemaining(0);
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
            startTimeRef.current = Date.now() - (CHECKOUT_TIMEOUT_MS - remainingMs);
            lastInitialSecondsRef.current = initialRemainingSeconds;
            console.log('[useCheckoutTimer] 🔄 Timer atualizado com tempo restante:', {
                initialRemainingSeconds,
                remainingMinutes: Math.floor(remainingMs / 60000),
            });
            return;
        }

        // Prioridade 3: Se não temos expiresAt nem initialRemainingSeconds, mas temos startTime salvo,
        // restaurar o tempo baseado no localStorage
        // IMPORTANTE: Só usar localStorage se realmente não temos informações do pedido atual
        // E apenas se o timer ainda não expirou
        if (!expiresAt && (initialRemainingSeconds === undefined || initialRemainingSeconds === null || initialRemainingSeconds <= 0)) {
            const savedStartTime = storageHelpers.loadTimerStartTime();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
                if (remaining > 0) {
                    setTimeRemaining(remaining);
                    startTimeRef.current = savedStartTime;
                    console.log('[useCheckoutTimer] 🔄 Timer restaurado do localStorage (sem expiresAt do pedido):', {
                        savedStartTime: new Date(savedStartTime).toISOString(),
                        remainingMs: remaining,
                        remainingMinutes: Math.floor(remaining / 60000),
                    });
                } else {
                    // Timer expirado, limpar
                    console.log('[useCheckoutTimer] ⏰ Timer do localStorage expirado, limpando');
                    storageHelpers.clearTimerStartTime();
                }
            }
        } else {
            // IMPORTANTE: NÃO limpar o timer do localStorage quando temos expiresAt ou initialRemainingSeconds
            // O timer do localStorage é necessário como fallback de segurança para:
            // - Erros de rede temporários
            // - Problemas temporários de autenticação
            // - Qualquer erro que impeça buscar o pedido do backend
            // Ele será atualizado pelo useCheckoutOrder quando o pedido é encontrado/criado
            // Não precisa logar sempre, apenas em modo debug
        }
    }, [expiresAt, initialRemainingSeconds]);

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

        // Se temos expiresAt do pedido, usar ele (prioridade máxima)
        if (expiresAt) {
            // IMPORTANTE: Só processar se o expiresAt mudou (evita resetar a cada re-render)
            const expiresAtChanged = lastExpiresAtRef.current !== expiresAt;
            
            if (expiresAtChanged) {
                const expiresAtDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
                const now = Date.now();
                const remaining = Math.max(0, expiresAtDate.getTime() - now);
                
                if (remaining > 0) {
                    const startTime = now - (CHECKOUT_TIMEOUT_MS - remaining);
                    setTimeRemaining(remaining);
                    startTimeRef.current = startTime;
                    lastExpiresAtRef.current = expiresAt; // Marcar como processado
                    // IMPORTANTE: NÃO limpar o timer do localStorage aqui
                    // Ele é necessário como fallback quando o pedido retorna 403
                    // O timer já foi salvo pelo useCheckoutOrder quando o pedido foi encontrado/criado
                    // Log apenas quando expiresAt realmente muda (não a cada render)
                    console.log('[useCheckoutTimer] 🔄 Timer atualizado com expiresAt do pedido:', {
                        expiresAt: expiresAtDate.toISOString(),
                        remainingMs: remaining,
                        remainingMinutes: Math.floor(remaining / 60000),
                    });
                } else {
                    // Pedido expirado
                    console.log('[useCheckoutTimer] ⏰ Pedido expirado, zerando timer');
                    setTimeRemaining(0);
                    lastExpiresAtRef.current = expiresAt;
                }
            }
            // Removido log "expiresAt não mudou" - muito verboso e não necessário
            // IMPORTANTE: Não continuar para outras condições se temos expiresAt
            // Configurar interval e retornar
        } else if (initialRemainingSeconds !== undefined && initialRemainingSeconds !== null && initialRemainingSeconds > 0) {
            // Se temos tempo inicial específico (reserva restaurada), usar esse tempo
            // Verificar se já foi atualizado pelo useEffect anterior
            if (lastInitialSecondsRef.current !== initialRemainingSeconds) {
                const remainingMs = initialRemainingSeconds * 1000;
                setTimeRemaining(remainingMs);
                startTimeRef.current = Date.now() - (CHECKOUT_TIMEOUT_MS - remainingMs);
                lastInitialSecondsRef.current = initialRemainingSeconds;
                // Limpar timer antigo do localStorage quando temos initialRemainingSeconds
                storageHelpers.clearTimerStartTime();
            }
            // IMPORTANTE: Não continuar para outras condições se temos initialRemainingSeconds
        } else {
            // Iniciar timer quando checkout fica ativo (apenas se não temos tempo inicial)
            // IMPORTANTE: Só entrar aqui se NÃO temos expiresAt nem initialRemainingSeconds
            // Verificar se já temos um startTime salvo (restaurado do localStorage)
            const savedStartTime = storageHelpers.loadTimerStartTime();
            if (savedStartTime && Math.abs(savedStartTime - startTimeRef.current) < 1000) {
                // Já estamos usando o tempo salvo, não resetar (tolerância de 1 segundo para diferenças de timing)
                console.log('[useCheckoutTimer] ✅ Timer restaurado do localStorage, continuando de onde parou');
            } else if (!savedStartTime) {
                // Iniciar novo timer apenas se não há tempo salvo E não temos expiresAt
                // Verificar se realmente precisa resetar (não resetar se já tem tempo definido)
                if (timeRemaining === 0 || timeRemaining === CHECKOUT_TIMEOUT_MS) {
                    resetTimer();
                    lastInitialSecondsRef.current = null;
                    console.log('[useCheckoutTimer] ⏰ Timer iniciado com 30 minutos (sem expiresAt e sem tempo salvo):', {
                        CHECKOUT_TIMEOUT_SECONDS,
                        CHECKOUT_TIMEOUT_MS,
                        minutes: CHECKOUT_TIMEOUT_SECONDS / 60,
                        startTime: new Date(startTimeRef.current).toISOString(),
                    });
                } else {
                    console.log('[useCheckoutTimer] ✅ Timer já tem tempo definido, não resetar:', {
                        timeRemaining,
                        remainingMinutes: Math.floor(timeRemaining / 60000),
                    });
                }
            }
        }

        // Atualizar timer a cada segundo
        intervalRef.current = setInterval(() => {
            if (isPaused) {
                return; // Não atualizar quando pausado
            }

            // Se temos expiresAt, calcular tempo restante baseado nele (não no startTime)
            // Isso garante que mesmo se o componente re-renderizar, o tempo sempre será baseado no expiresAt do pedido
            if (expiresAt) {
                const expiresAtDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
                const now = Date.now();
                const remaining = Math.max(0, expiresAtDate.getTime() - now);
                setTimeRemaining(remaining);
                
                if (remaining === 0) {
                    console.warn('[useCheckoutTimer] ⏰ Timer expirado (baseado em expiresAt)!');
                    storageHelpers.clearTimerStartTime();
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    if (onExpire) {
                        onExpire();
                    }
                }
            } else {
                // Se não temos expiresAt, usar cálculo baseado em startTimeRef ajustado
                // O startTimeRef já foi ajustado para refletir o tempo correto da reserva
                const elapsed = Date.now() - startTimeRef.current;
                const remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
                
                setTimeRemaining(remaining);

                if (remaining === 0) {
                    console.warn('[useCheckoutTimer] ⏰ Timer expirado!');
                    // Limpar tempo salvo quando expira
                    storageHelpers.clearTimerStartTime();
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    if (onExpire) {
                        onExpire();
                    }
                }
            }
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, isPaused, onExpire, resetTimer, initialRemainingSeconds, expiresAt]);

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

