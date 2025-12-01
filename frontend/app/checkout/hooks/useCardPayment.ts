'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useBrickReset } from './useBrickReset';
import { usePaymentProcessing, type CardPaymentData } from './usePaymentProcessing';

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface UseCardPaymentReturn {
    status: PaymentStatus;
    statusMessage: string;
    statusDetails: string[];
    isProcessing: boolean;
    isCheckoutReady: boolean;
    redirectCountdown: number | null;
    maxAttemptsReached: boolean;
    processPayment: (orderId: string, paymentData: CardPaymentData) => Promise<void>;
    handleFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    resetPayment: () => void;
    dismissStatus: () => void;
    handleBrickReady: () => void;
}

/**
 * Hook para gerenciar pagamento com cartão de crédito usando Mercado Pago Brick
 * REFATORADO: Usa hooks especializados para reset do Brick e processamento de pagamento
 * Reduzido de 811 para ~400 linhas
 */
export function useCardPayment(orderId: string | null): UseCardPaymentReturn {
    const brickReset = useBrickReset();
    
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusDetails, setStatusDetails] = useState<string[]>([]);
    const [isCheckoutReady, setIsCheckoutReady] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
    const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
    
    const processingRef = useRef(false);
    const previousOrderIdRef = useRef<string | null>(null);
    const orderIdRef = useRef<string | null>(orderId);
    const nestedTimersRef = useRef<NodeJS.Timeout[]>([]);

    // Payment processing hook
    const { processPayment: processPaymentInternal } = usePaymentProcessing({
        setStatus,
        setStatusMessage,
        setStatusDetails,
        setRedirectCountdown,
        setMaxAttemptsReached,
        processingRef,
        onCountdownUpdate: (countdown) => {
            setRedirectCountdown(countdown);
        },
    });

        // OTIMIZADO: Consolidar atualização de orderIdRef e reset de estado
        useEffect(() => {
        // CRÍTICO: Não sobrescrever orderIdRef se já temos um pedido real (não fake)
        // Isso evita que o useCardPayment sobrescreva o orderIdRef atualizado pelo usePixPayment
        const currentOrderId = orderIdRef.current;
        const isCurrentReal = currentOrderId && !currentOrderId.startsWith('fake-');
        const isNewFake = orderId && orderId.startsWith('fake-');
        const isNewReal = orderId && !orderId.startsWith('fake-');
        
        // REGRA: Se já temos um pedido REAL, NUNCA sobrescrever com fake
        // Só atualizar se:
        // 1. Não temos orderIdRef atual OU
        // 2. O novo orderId é real (pode atualizar fake para real, ou real para real) OU
        // 3. O orderIdRef atual também é fake E o novo também é fake (pode atualizar fake para fake)
        const shouldUpdate = !currentOrderId || isNewReal || (isCurrentReal === false && isNewFake);
        
        if (shouldUpdate) {
            // Log removido para reduzir ruído - só logar em caso de mudança significativa
            orderIdRef.current = orderId;
        }
        // Log removido para reduzir ruído
        
        // Verificar se orderId mudou (usar ref para evitar loop)
        const orderIdChanged = previousOrderIdRef.current !== orderId;
        
        // Resetar estado apenas se orderId mudou
        if (orderIdChanged) {
            const hasActiveError = status === 'error';
            
            if (!orderId) {
                setIsCheckoutReady(false);
                setStatus('idle');
                setStatusMessage('');
                setStatusDetails([]);
                setMaxAttemptsReached(false);
                processingRef.current = false;
                brickReset.resetBrick();
            } else {
                if (hasActiveError) {
                    setMaxAttemptsReached(false);
                    processingRef.current = false;
                    
                    if (previousOrderIdRef.current !== null) {
                        brickReset.resetBrick();
                    }
                    
                    if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                        setIsCheckoutReady(false);
                        
                        const timer = setTimeout(() => {
                            console.log('[useCardPayment] ✅ Setando isCheckoutReady para true para permitir detecção de mudança');
                            setIsCheckoutReady(true);
                        }, 50);
                        
                        previousOrderIdRef.current = orderId;
                        return () => clearTimeout(timer);
                    } else {
                        setIsCheckoutReady(false);
                        previousOrderIdRef.current = orderId;
                    }
                } else {
                    setStatus('idle');
                    setStatusMessage('');
                    setStatusDetails([]);
                    setMaxAttemptsReached(false);
                    processingRef.current = false;
                    
                    if (previousOrderIdRef.current !== null) {
                        brickReset.resetBrick();
                    }
                    
                    if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                        previousOrderIdRef.current = orderId;
                        const currentOrderId = orderId;
                        
                        setIsCheckoutReady(false);
                        
                        const timerIds: NodeJS.Timeout[] = [];
                        
                                if (window.__MP_BRICK_RESET_VISIBILITY_REF__) {
                                    try {
                                        const resetVisibilityRef = window.__MP_BRICK_RESET_VISIBILITY_REF__;
                                        const timer1 = setTimeout(() => {
                                            if (previousOrderIdRef.current !== currentOrderId) {
                                                return;
                                            }
                                            
                                            if (resetVisibilityRef) {
                                                resetVisibilityRef();
                                            }
                                            
                                            const timer2 = setTimeout(() => {
                                                if (previousOrderIdRef.current === currentOrderId) {
                                                    setIsCheckoutReady(true);
                                                }
                                            }, 100);
                                            timerIds.push(timer2);
                                        }, 50);
                                        timerIds.push(timer1);
                                    } catch (error) {
                                        const fallbackTimer = setTimeout(() => {
                                            if (previousOrderIdRef.current === currentOrderId) {
                                                setIsCheckoutReady(true);
                                            }
                                        }, 150);
                                        timerIds.push(fallbackTimer);
                                    }
                        } else {
                            const noResetTimer = setTimeout(() => {
                                if (previousOrderIdRef.current === currentOrderId) {
                                    setIsCheckoutReady(true);
                                }
                            }, 200);
                            timerIds.push(noResetTimer);
                        }
                        
                        return () => {
                            timerIds.forEach(timerId => clearTimeout(timerId));
                        };
                    } else {
                        setIsCheckoutReady(false);
                        
                        previousOrderIdRef.current = orderId;
                        const currentOrderId = orderId;
                        
                        let attempts = 0;
                        const maxAttempts = 10;
                        
                        nestedTimersRef.current.forEach(timerId => clearTimeout(timerId));
                        nestedTimersRef.current = [];
                        
                        const checkInterval = setInterval(() => {
                            attempts++;
                            
                            if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                                clearInterval(checkInterval);
                                
                                setIsCheckoutReady(false);
                                
                                if (window.__MP_BRICK_RESET_VISIBILITY_REF__) {
                                    try {
                                        const resetVisibilityRef = window.__MP_BRICK_RESET_VISIBILITY_REF__;
                                        const nestedTimer1 = setTimeout(() => {
                                            if (previousOrderIdRef.current !== currentOrderId) {
                                                console.log('[useCardPayment] ⚠️ OrderId mudou durante o delay, cancelando reset');
                                                return;
                                            }
                                            
                                            if (resetVisibilityRef) {
                                                resetVisibilityRef();
                                            }
                                            
                                            const nestedTimer2 = setTimeout(() => {
                                                if (previousOrderIdRef.current === currentOrderId) {
                                                    setIsCheckoutReady(true);
                                                }
                                            }, 100);
                                            nestedTimersRef.current.push(nestedTimer2);
                                        }, 50);
                                        nestedTimersRef.current.push(nestedTimer1);
                                    } catch (error) {
                                        const errorTimer = setTimeout(() => {
                                            if (previousOrderIdRef.current === currentOrderId) {
                                                setIsCheckoutReady(true);
                                            }
                                        }, 150);
                                        nestedTimersRef.current.push(errorTimer);
                                    }
                                } else {
                                    const noResetTimer = setTimeout(() => {
                                        if (previousOrderIdRef.current === currentOrderId) {
                                            setIsCheckoutReady(true);
                                        }
                                    }, 150);
                                    nestedTimersRef.current.push(noResetTimer);
                                }
                            } else if (attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                            }
                        }, 50);
                        
                        return () => {
                            clearInterval(checkInterval);
                            nestedTimersRef.current.forEach(timerId => clearTimeout(timerId));
                            nestedTimersRef.current = [];
                        };
                    }
                }
            }
            
            // Atualizar previousOrderIdRef apenas se realmente mudou
            previousOrderIdRef.current = orderId;
        }
    }, [orderId, status, brickReset]);

    // Resetar pagamento para estado inicial
    const resetPayment = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
        setStatusDetails([]);
        setRedirectCountdown(null);
        setMaxAttemptsReached(false);
        processingRef.current = false;
        brickReset.resetBrick();
    }, [brickReset]);

    // Wrapper para processPayment que chama o hook interno
    const processPayment = useCallback(async (orderId: string, paymentData: CardPaymentData) => {
        await processPaymentInternal(orderId, paymentData);
    }, [processPaymentInternal]);

    // Handler para submit do formulário
    const handleFormSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const currentOrderId = orderIdRef.current;
        
        if (!currentOrderId) {
            setStatus('error');
            setStatusMessage('Pedido não encontrado');
            setStatusDetails(['Por favor, recarregue a página e tente novamente.']);
            return;
        }

        if (currentOrderId !== orderId) {
            orderIdRef.current = orderId;
        }

        const form = event.currentTarget;
        const brickData = (form as any).__brickData as CardPaymentData | undefined;

        if (!brickData || !brickData.token) {
            setStatus('error');
            setStatusMessage('Dados do cartão não encontrados');
            setStatusDetails(['Por favor, preencha todos os dados do cartão.']);
            return;
        }

        const finalOrderId = orderIdRef.current;
        if (!finalOrderId) {
            console.error('[useCardPayment] ⚠️ orderIdRef está null após correção');
            setStatus('error');
            setStatusMessage('Pedido não encontrado');
            setStatusDetails(['Por favor, recarregue a página e tente novamente.']);
            return;
        }
        await processPayment(finalOrderId, brickData);
    }, [processPayment, orderId]);

    // Dismiss status
    const dismissStatus = useCallback(() => {
        if (status === 'error') {
            resetPayment();
        }
    }, [status, resetPayment]);

    // Marcar checkout como pronto quando Brick estiver pronto
    const handleBrickReady = useCallback(() => {
        console.log('[useCardPayment] ✅ handleBrickReady chamado, marcando checkout como pronto');
        setIsCheckoutReady(true);
    }, []);

    return {
        status,
        statusMessage,
        statusDetails,
        isProcessing: status === 'processing',
        isCheckoutReady,
        redirectCountdown,
        maxAttemptsReached,
        processPayment,
        handleFormSubmit,
        resetPayment,
        dismissStatus,
        handleBrickReady,
    };
}
