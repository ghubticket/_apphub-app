'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { FormEvent } from 'react';
import { getMercadoPagoDeviceId, waitForMercadoPagoDeviceId } from '../utils/deviceIdHelper';

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

export interface CardPaymentData {
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: string;
    cardholder?: {
        name: string;
        email: string;
        identification?: {
            type: string;
            number: string;
        };
    };
}

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
 * 
 * Features:
 * - Processamento de pagamento com token do Brick
 * - Gerenciamento de estados (idle, processing, success, error)
 * - Tratamento de erros detalhado
 * - Countdown para redirecionamento após sucesso
 * - Performance otimizada com useCallback e useRef
 */
export function useCardPayment(orderId: string | null): UseCardPaymentReturn {
    const router = useRouter();
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusDetails, setStatusDetails] = useState<string[]>([]);
    const [isCheckoutReady, setIsCheckoutReady] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
    const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
    
    const processingRef = useRef(false);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousOrderIdRef = useRef<string | null>(null);
    const orderIdRef = useRef<string | null>(orderId); // CRÍTICO: Ref para sempre pegar o orderId mais recente
    const nestedTimersRef = useRef<NodeJS.Timeout[]>([]); // CRÍTICO: Ref para armazenar timers aninhados do setInterval

    // CRÍTICO: Atualizar orderIdRef ANTES de qualquer outra lógica
    // Isso garante que o handleFormSubmit sempre use o orderId mais recente
    useEffect(() => {
        console.log('[useCardPayment] 🔄 Atualizando orderIdRef:', { previous: orderIdRef.current, current: orderId });
        orderIdRef.current = orderId;
    }, [orderId]);

    // Resetar estado quando orderId mudar ou quando não houver orderId
    useEffect(() => {
        // Se orderId mudou ou foi removido, resetar estado de checkout
        if (previousOrderIdRef.current !== orderId) {
            console.log('[useCardPayment] 🔄 OrderId mudou:', {
                previous: previousOrderIdRef.current,
                current: orderId,
                currentStatus: status, // Log do status atual para debug
            });
            
            // CRÍTICO: Se há um erro ativo, NÃO resetar o status imediatamente
            // Isso permite que o modal de erro apareça antes de ser resetado
            const hasActiveError = status === 'error';
            
            if (!orderId) {
                // Sem orderId, resetar tudo incluindo Brick
                console.log('[useCardPayment] 🧹 Resetando tudo (sem orderId)');
                setIsCheckoutReady(false);
                setStatus('idle');
                setStatusMessage('');
                setStatusDetails([]);
                setMaxAttemptsReached(false); // Resetar flag de tentativas esgotadas
                processingRef.current = false; // CRÍTICO: Resetar flag de processamento
                
                // CRÍTICO: Resetar Brick quando orderId é removido
                // Isso limpa as validações e campos do formulário
                if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                    try {
                        window.__MP_BRICK_RESET__();
                        console.log('[useCardPayment] ✅ Brick resetado (orderId removido)');
                    } catch (error) {
                        console.warn('[useCardPayment] Erro ao resetar Brick quando orderId foi removido:', error);
                    }
                }
            } else {
                // OrderId mudou ou foi definido, resetar estado do pagamento
                // CRÍTICO: NÃO resetar status se há um erro ativo - o erro deve ser mantido até ser explicitamente fechado
                // O status só será resetado quando o usuário fechar o modal de erro ou quando um novo pedido for criado
                if (hasActiveError) {
                    console.log('[useCardPayment] ⚠️ Há erro ativo, NÃO resetando status - mantendo erro para exibição do modal');
                    // NÃO resetar o status - manter o erro para que o modal apareça
                    // Apenas resetar flags e processamento
                    setMaxAttemptsReached(false);
                    processingRef.current = false;
                    
                    // Continuar com o resto da lógica normalmente
                    // CRÍTICO: Resetar Brick quando orderId muda (novo pedido)
                    if (previousOrderIdRef.current !== null && typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                        try {
                            window.__MP_BRICK_RESET__();
                            console.log('[useCardPayment] ✅ Brick resetado (orderId mudou)');
                        } catch (error) {
                            console.warn('[useCardPayment] Erro ao resetar Brick quando orderId mudou:', error);
                        }
                    }
                    
                    // Se Brick já está montado globalmente, resetar e aguardar onReady
                    if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                        console.log('[useCardPayment] ⏳ Brick já montado, resetando e aguardando onReady');
                        setIsCheckoutReady(false);
                        
                        const timer = setTimeout(() => {
                            console.log('[useCardPayment] ✅ Setando isCheckoutReady para true para permitir detecção de mudança');
                            setIsCheckoutReady(true);
                        }, 50);
                        
                        // CRÍTICO: Atualizar ref ANTES de sair do useEffect
                        previousOrderIdRef.current = orderId;
                        
                        return () => clearTimeout(timer);
                    } else {
                        console.log('[useCardPayment] ⏳ Aguardando Brick ser montado');
                        setIsCheckoutReady(false);
                        previousOrderIdRef.current = orderId;
                    }
                } else {
                    // Sem erro ativo, resetar normalmente
                    console.log('[useCardPayment] 🧹 Resetando estado do pagamento (novo orderId)');
                    setStatus('idle');
                    setStatusMessage('');
                    setStatusDetails([]);
                    setMaxAttemptsReached(false); // Resetar flag de tentativas esgotadas
                    processingRef.current = false; // CRÍTICO: Resetar flag de processamento
                    
                    // CRÍTICO: Resetar Brick quando orderId muda (novo pedido)
                    // Isso garante que campos e validações sejam limpos para o novo pedido
                    if (previousOrderIdRef.current !== null && typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                        try {
                            window.__MP_BRICK_RESET__();
                            console.log('[useCardPayment] ✅ Brick resetado (orderId mudou)');
                        } catch (error) {
                            console.warn('[useCardPayment] Erro ao resetar Brick quando orderId mudou:', error);
                        }
                    }
                    
                    // Se Brick já está montado globalmente, resetar e aguardar onReady
                    // O IsolatedCardPaymentBrick vai chamar onReady quando isVisible mudar para true
                    if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                        // CRÍTICO: Resetar para false primeiro para garantir que o IsolatedCardPaymentBrick detecte a mudança
                        // Depois setar para true após um delay maior para garantir que o componente detecte a transição
                        console.log('[useCardPayment] ⏳ Brick já montado, resetando e aguardando onReady');
                        
                        // CRÍTICO: Atualizar ref ANTES de resetar isCheckoutReady para evitar problemas de timing
                        previousOrderIdRef.current = orderId;
                        
                        // CRÍTICO: Capturar orderId no closure para verificar depois
                        const currentOrderId = orderId;
                        
                        // CRÍTICO: Resetar isCheckoutReady para false primeiro
                        setIsCheckoutReady(false);
                        
                        // CRÍTICO: Forçar reset do previousIsVisibleRef no IsolatedCardPaymentBrick
                        // Isso garante que a mudança de false para true seja detectada corretamente
                        // IMPORTANTE: Fazer isso DEPOIS de setar isCheckoutReady para false para garantir sincronização
                        // CRÍTICO: Armazenar IDs dos timers para cleanup adequado
                        const timerIds: NodeJS.Timeout[] = [];
                        
                        if (window.__MP_BRICK_RESET_VISIBILITY_REF__) {
                            try {
                                const resetVisibilityRef = window.__MP_BRICK_RESET_VISIBILITY_REF__;
                                // Pequeno delay para garantir que o React processou o setIsCheckoutReady(false)
                                const timer1 = setTimeout(() => {
                                    // CRÍTICO: Verificar se o orderId ainda é o mesmo antes de executar
                                    if (previousOrderIdRef.current !== currentOrderId) {
                                        console.log('[useCardPayment] ⚠️ OrderId mudou durante o delay, cancelando reset');
                                        return;
                                    }
                                    
                                    if (resetVisibilityRef) {
                                        resetVisibilityRef();
                                        console.log('[useCardPayment] ✅ previousIsVisibleRef resetado no IsolatedCardPaymentBrick');
                                    }
                                    
                                    // CRÍTICO: Após resetar o ref, aguardar um pouco e então setar isCheckoutReady para true
                                    // Isso garante que o IsolatedCardPaymentBrick detecte a mudança de false para true
                                    const timer2 = setTimeout(() => {
                                        // Verificar se o orderId ainda é o mesmo antes de setar isCheckoutReady
                                        if (previousOrderIdRef.current === currentOrderId) {
                                            console.log('[useCardPayment] ✅ Setando isCheckoutReady para true para permitir detecção de mudança');
                                            setIsCheckoutReady(true);
                                        } else {
                                            console.log('[useCardPayment] ⚠️ OrderId mudou durante o delay, não setando isCheckoutReady');
                                        }
                                    }, 100); // Delay para garantir que o ref foi resetado e o componente foi renderizado
                                    timerIds.push(timer2);
                                }, 50); // Delay inicial para garantir que o React processou o setIsCheckoutReady(false)
                                timerIds.push(timer1);
                            } catch (error) {
                                console.warn('[useCardPayment] Erro ao resetar previousIsVisibleRef:', error);
                                // Em caso de erro, tentar setar isCheckoutReady mesmo assim após um delay
                                const fallbackTimer = setTimeout(() => {
                                    if (previousOrderIdRef.current === currentOrderId) {
                                        console.log('[useCardPayment] ✅ Setando isCheckoutReady para true (fallback após erro)');
                                        setIsCheckoutReady(true);
                                    }
                                }, 150);
                                timerIds.push(fallbackTimer);
                            }
                        } else {
                            // Se não há função de reset, apenas aguardar e setar isCheckoutReady
                            const noResetTimer = setTimeout(() => {
                                if (previousOrderIdRef.current === currentOrderId) {
                                    console.log('[useCardPayment] ✅ Setando isCheckoutReady para true (sem reset de ref)');
                                    setIsCheckoutReady(true);
                                }
                            }, 200);
                            timerIds.push(noResetTimer);
                        }
                        
                        // CRÍTICO: Retornar cleanup function para evitar memory leaks
                        return () => {
                            timerIds.forEach(timerId => clearTimeout(timerId));
                        };
                    } else {
                        // Brick ainda não está montado, mas pode estar sendo renderizado
                        // CRÍTICO: Aguardar um pouco para verificar se o Brick foi montado
                        // Isso resolve o problema quando o pedido é restaurado do storage
                        console.log('[useCardPayment] ⏳ Aguardando Brick ser montado (pode estar sendo renderizado)');
                        setIsCheckoutReady(false);
                        
                        // CRÍTICO: Atualizar ref ANTES de setar o timer
                        previousOrderIdRef.current = orderId;
                        
                        // CRÍTICO: Capturar orderId no closure para verificar depois
                        const currentOrderId = orderId;
                        
                        // CRÍTICO: Verificar periodicamente se o Brick foi montado
                        // Isso resolve o problema quando o componente ainda não foi renderizado
                        let attempts = 0;
                        const maxAttempts = 10; // 10 tentativas = 500ms máximo
                        
                        // CRÍTICO: Limpar timers anteriores antes de criar novos
                        nestedTimersRef.current.forEach(timerId => clearTimeout(timerId));
                        nestedTimersRef.current = [];
                        
                        const checkInterval = setInterval(() => {
                            attempts++;
                            
                            // Se o Brick foi montado, seguir o fluxo normal
                            if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                                console.log('[useCardPayment] ✅ Brick montado detectado após', attempts, 'tentativas');
                                clearInterval(checkInterval);
                                
                                // Resetar isCheckoutReady para false primeiro
                                setIsCheckoutReady(false);
                                
                                // Resetar previousIsVisibleRef se disponível
                                if (window.__MP_BRICK_RESET_VISIBILITY_REF__) {
                                    try {
                                        const resetVisibilityRef = window.__MP_BRICK_RESET_VISIBILITY_REF__;
                                        const nestedTimer1 = setTimeout(() => {
                                            // CRÍTICO: Verificar se o orderId ainda é o mesmo antes de executar
                                            if (previousOrderIdRef.current !== currentOrderId) {
                                                console.log('[useCardPayment] ⚠️ OrderId mudou durante o delay, cancelando reset');
                                                return;
                                            }
                                            
                                            if (resetVisibilityRef) {
                                                resetVisibilityRef();
                                                console.log('[useCardPayment] ✅ previousIsVisibleRef resetado no IsolatedCardPaymentBrick');
                                            }
                                            
                                            // Após resetar o ref, setar isCheckoutReady para true
                                            const nestedTimer2 = setTimeout(() => {
                                                if (previousOrderIdRef.current === currentOrderId) {
                                                    console.log('[useCardPayment] ✅ Setando isCheckoutReady para true após detectar Brick montado');
                                                    setIsCheckoutReady(true);
                                                }
                                            }, 100);
                                            nestedTimersRef.current.push(nestedTimer2);
                                        }, 50);
                                        nestedTimersRef.current.push(nestedTimer1);
                                    } catch (error) {
                                        console.warn('[useCardPayment] Erro ao resetar previousIsVisibleRef:', error);
                                        // Em caso de erro, tentar setar isCheckoutReady mesmo assim
                                        const errorTimer = setTimeout(() => {
                                            if (previousOrderIdRef.current === currentOrderId) {
                                                setIsCheckoutReady(true);
                                            }
                                        }, 150);
                                        nestedTimersRef.current.push(errorTimer);
                                    }
                                } else {
                                    // Se não há função de reset, apenas aguardar e setar isCheckoutReady
                                    const noResetTimer = setTimeout(() => {
                                        if (previousOrderIdRef.current === currentOrderId) {
                                            console.log('[useCardPayment] ✅ Setando isCheckoutReady para true (sem reset de ref)');
                                            setIsCheckoutReady(true);
                                        }
                                    }, 150);
                                    nestedTimersRef.current.push(noResetTimer);
                                }
                            } else if (attempts >= maxAttempts) {
                                // Se excedeu o número máximo de tentativas, assumir que o Brick será montado depois
                                console.log('[useCardPayment] ⚠️ Brick não detectado após', maxAttempts, 'tentativas, aguardando onReady');
                                clearInterval(checkInterval);
                                // O Brick será marcado como pronto quando onReady for chamado
                            }
                        }, 50); // Verificar a cada 50ms
                        
                        // Cleanup: limpar o intervalo e todos os timers aninhados
                        return () => {
                            clearInterval(checkInterval);
                            // Limpar timers aninhados se ainda existirem
                            nestedTimersRef.current.forEach(timerId => clearTimeout(timerId));
                            nestedTimersRef.current = [];
                        };
                    }
                }
            }
            
            // CRÍTICO: Atualizar ref ANTES de sair do useEffect para evitar loops (se não foi atualizado acima)
            if (previousOrderIdRef.current !== orderId) {
                previousOrderIdRef.current = orderId;
            }
        }
    }, [orderId]); // CRÍTICO: NÃO adicionar status como dependência para evitar loops

    // Resetar pagamento para estado inicial
    const resetPayment = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
        setStatusDetails([]);
        setRedirectCountdown(null);
        setMaxAttemptsReached(false); // Resetar flag de tentativas esgotadas
        processingRef.current = false;
        
        // Limpar countdown se existir
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        
        // Resetar Brick se disponível
        if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
            try {
                window.__MP_BRICK_RESET__();
            } catch (error) {
                console.warn('[useCardPayment] Erro ao resetar Brick:', error);
            }
        }
    }, []);

    // Processar pagamento com dados do Brick
    const processPayment = useCallback(async (orderId: string, paymentData: CardPaymentData) => {
        // Prevenir múltiplas execuções simultâneas
        if (processingRef.current) {
            console.log('[useCardPayment] ⏸️ Pagamento já está sendo processado');
            return;
        }

        if (!orderId) {
            setStatus('error');
            setStatusMessage('Pedido não encontrado');
            setStatusDetails(['Por favor, recarregue a página e tente novamente.']);
            return;
        }

        processingRef.current = true;
        setStatus('processing');
        setStatusMessage('Processando pagamento...');
        setStatusDetails([]);

        try {
            // Obter Device ID do Mercado Pago (obrigatório para processar pagamento)
            // Tentar aguardar o SDK gerar o deviceId real (timeout curto de 1s para não bloquear)
            let deviceId: string;
            try {
                deviceId = await waitForMercadoPagoDeviceId(1000); // Aguardar até 1s pelo deviceId do SDK
            } catch (error) {
                // Se falhar, usar fallback imediatamente
                deviceId = getMercadoPagoDeviceId();
            }
            
            const isRealDeviceId = deviceId && !deviceId.startsWith('mp-') && deviceId !== 'ssr-device-id';
            
            console.log('[useCardPayment] 🚀 Processando pagamento:', {
                orderId,
                hasToken: !!paymentData.token,
                paymentMethodId: paymentData.paymentMethodId,
                installments: paymentData.installments,
                hasDeviceId: !!deviceId,
                deviceIdSource: isRealDeviceId ? 'SDK' : 'fallback',
                deviceIdPreview: deviceId?.substring(0, 20) + '...',
            });

            // Preparar payload da requisição
            // Enviar cardholder apenas se tiver dados válidos
            const cardholderData = paymentData.cardholder && 
                (paymentData.cardholder.name || paymentData.cardholder.email) 
                ? paymentData.cardholder 
                : undefined;
            
            const payload: any = {
                token: paymentData.token,
                installments: paymentData.installments || 1,
                paymentMethodId: paymentData.paymentMethodId,
                issuerId: paymentData.issuerId,
                deviceId, // Enviar no body (backend aceita aqui também)
            };
            
            // Adicionar cardholder apenas se tiver dados válidos
            if (cardholderData) {
                payload.cardholder = cardholderData;
            }
            
            console.log('[useCardPayment] 📤 Enviando requisição de pagamento:', {
                url: `/payments/${orderId}/card`,
                payload: {
                    ...payload,
                    token: payload.token?.substring(0, 20) + '...', // Log parcial do token por segurança
                },
                headers: {
                    'X-meli-session-id': deviceId?.substring(0, 20) + '...',
                },
            });
            
            // Enviar requisição com deviceId no body e header
            const response = await api.post(
                `/payments/${orderId}/card`,
                payload,
                {
                    headers: {
                        'X-meli-session-id': deviceId, // Enviar também no header
                    },
                }
            );

            const paymentResult = response.data?.data || response.data;
            const statusInfo = paymentResult?.statusInfo;
            
            console.log('[useCardPayment] 📡 Resposta do backend:', {
                success: response.data?.success,
                status: paymentResult?.status,
                paymentStatus: paymentResult?.paymentStatus,
                paymentMessage: paymentResult?.paymentMessage,
                statusInfo: statusInfo,
            });

            // Verificar status do pagamento
            const paymentStatus = paymentResult?.paymentStatus || paymentResult?.status;
            const paymentMessage = statusInfo?.userMessage || paymentResult?.paymentMessage || paymentResult?.message;
            const paymentStatusDetail = paymentResult?.paymentStatusDetail || paymentResult?.statusDetail;

            // Mapear status do MP para nosso status interno
            // Verificar múltiplas formas de indicar sucesso
            const isSuccess = paymentStatus === 'approved' || 
                             paymentStatus === 'paid' || 
                             paymentStatus === 'processed' ||
                             statusInfo?.internalStatus === 'paid' ||
                             (response.data?.success && paymentStatus !== 'rejected' && paymentStatus !== 'cancelled' && paymentStatus !== 'failed');
            
            if (isSuccess) {
                setStatus('success');
                setStatusMessage(paymentMessage || 'Pagamento aprovado com sucesso!');
                setStatusDetails([
                    'Seus ingressos estão disponíveis.',
                    'Você receberá um e-mail com os detalhes do pedido.',
                ]);

                // Iniciar countdown para redirecionamento
                let countdown = 5;
                setRedirectCountdown(countdown);
                
                countdownIntervalRef.current = setInterval(() => {
                    countdown -= 1;
                    if (countdown > 0) {
                        setRedirectCountdown(countdown);
                    } else {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                        }
                        setRedirectCountdown(null);
                        router.push('/orders');
                    }
                }, 1000);
            } else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
                // Pagamento pendente (pode ser 3D Secure ou análise)
                setStatus('processing');
                setStatusMessage(paymentMessage || 'Pagamento em análise...');
                setStatusDetails([
                    'Seu pagamento está sendo processado.',
                    'Você será notificado quando o pagamento for confirmado.',
                ]);
            } else {
                // Pagamento recusado ou erro
                // Verificar se esgotou tentativas
                const cardAttempts = paymentResult?.cardAttempts ?? response.data?.cardAttempts;
                const maxCardAttempts = paymentResult?.maxCardAttempts ?? response.data?.maxCardAttempts ?? 3;
                const attemptsExhausted = cardAttempts !== undefined && maxCardAttempts !== undefined && cardAttempts >= maxCardAttempts;
                
                setMaxAttemptsReached(attemptsExhausted);
                setStatus('error');
                
                if (attemptsExhausted) {
                    // Esgotou tentativas: mostrar mensagem especial
                    setStatusMessage('Tentativas esgotadas');
                    setStatusDetails([
                        'Infelizmente você esgotou suas tentativas nesse pedido.',
                        'Você vai precisar criar um novo pedido para tentar novamente.',
                    ]);
                } else {
                    // Ainda há tentativas disponíveis
                    setStatusMessage(paymentMessage || 'Pagamento não aprovado');
                    const remainingAttempts = maxCardAttempts - (cardAttempts || 0);
                    const errorDetails: string[] = [];
                    
                    // Adicionar detalhes específicos do erro
                    if (paymentStatusDetail) {
                        const detailMessages: Record<string, string> = {
                            'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão.',
                            'cc_rejected_bad_filled_card_number': 'Número do cartão inválido.',
                            'cc_rejected_bad_filled_date': 'Data de validade inválida.',
                            'cc_rejected_bad_filled_other': 'Dados do cartão inválidos.',
                            'cc_rejected_call_for_authorize': 'Cartão requer autorização. Entre em contato com o banco.',
                            'cc_rejected_card_error': 'Erro no cartão. Verifique os dados e tente novamente.',
                            'cc_rejected_high_risk': 'Pagamento recusado por segurança.',
                            'cc_rejected_invalid_installments': 'Número de parcelas inválido.',
                            'cc_rejected_max_attempts': 'Muitas tentativas. Tente novamente mais tarde.',
                        };
                        
                        errorDetails.push(detailMessages[paymentStatusDetail] || 'Tente novamente ou use outro cartão.');
                    } else {
                        errorDetails.push('Tente novamente ou use outro cartão.');
                    }
                    
                    // Adicionar informação sobre tentativas restantes
                    if (remainingAttempts > 0) {
                        errorDetails.push(`Você ainda tem ${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`);
                    }
                    
                    setStatusDetails(errorDetails);
                }
            }
        } catch (error: any) {
            console.error('[useCardPayment] ❌ Erro ao processar pagamento:', {
                error,
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                message: error?.message,
            });
            
            setStatus('error');
            
            // Tratar diferentes tipos de erro
            const errorResponse = error?.response?.data;
            const statusCode = error?.response?.status;
            const errorMessage = errorResponse?.message || error?.message || 'Erro ao processar pagamento';
            const errorDetails = errorResponse?.errors || [];
            const errorDetailsFull = errorResponse?.errorDetails || null;
            
            // Verificar se esgotou tentativas no erro
            const cardAttempts = errorResponse?.cardAttempts;
            const maxCardAttempts = errorResponse?.maxCardAttempts ?? 3;
            const attemptsExhausted = cardAttempts !== undefined && cardAttempts >= maxCardAttempts;
            setMaxAttemptsReached(attemptsExhausted);
            
            // Log detalhado do erro do backend
            if (errorResponse) {
                console.error('[useCardPayment] 📋 Detalhes do erro do backend:', {
                    message: errorMessage,
                    errors: errorDetails,
                    errorDetails: errorDetailsFull,
                    statusCode,
                    cardAttempts,
                    maxCardAttempts,
                    attemptsExhausted,
                });
            }
            
            // CRÍTICO: Se esgotou tentativas, definir mensagem especial ANTES de qualquer outra coisa
            if (attemptsExhausted) {
                setStatusMessage('Tentativas esgotadas');
                setStatusDetails([
                    'Infelizmente você esgotou suas tentativas nesse pedido.',
                    'Você vai precisar criar um novo pedido para tentar novamente.',
                ]);
                // Não processar mais nada - já definimos tudo que precisa
                return;
            }
            
            setStatusMessage(errorMessage);
            
            // CRÍTICO: Garantir que sempre há mensagens de erro para exibir no modal
            let finalErrorDetails: string[] = [];
            
            if (errorDetails.length > 0) {
                // Se errorDetails é um array de strings, usar diretamente
                // Se é um array de objetos, extrair mensagens
                finalErrorDetails = errorDetails.map((err: any) => 
                    typeof err === 'string' ? err : err.message || String(err)
                );
            } else if (errorDetailsFull) {
                // Usar errorDetails se disponível
                const fullMessage = typeof errorDetailsFull === 'string' 
                    ? errorDetailsFull 
                    : errorDetailsFull.message || errorMessage;
                finalErrorDetails = [fullMessage];
            } else {
                // Sempre garantir pelo menos uma mensagem de erro
                finalErrorDetails = [
                    errorMessage || 'Não foi possível processar o pagamento.',
                    statusCode === 400 
                        ? 'Verifique os dados do cartão e tente novamente.' 
                        : statusCode === 404
                            ? 'Pedido não encontrado. Por favor, recarregue a página.'
                            : 'Verifique seus dados e tente novamente.',
                ];
            }
            
            // Garantir que há pelo menos uma mensagem
            // NOTA: attemptsExhausted já foi tratado acima com return, então não precisa verificar aqui novamente
            if (finalErrorDetails.length === 0) {
                finalErrorDetails = [errorMessage || 'Erro ao processar pagamento. Tente novamente.'];
            }
            
            // CRÍTICO: Filtrar mensagens em inglês do Mercado Pago/Backend
            // Remover mensagens como "The following transactions failed", "failed", etc.
            const filteredErrorDetails = finalErrorDetails.filter((msg) => {
                const lowerMsg = msg.toLowerCase().trim();
                // Filtrar mensagens comuns em inglês que não agregam valor
                const englishPatterns = [
                    'the following transactions failed',
                    '^failed$', // Apenas a palavra "failed" sozinha
                    '^transaction failed$', // Apenas "transaction failed" sozinha
                    '^payment failed$', // Apenas "payment failed" sozinha
                ];
                // Se a mensagem corresponde exatamente a um padrão em inglês, remover
                // Mas manter se contém informações úteis em português ou detalhes específicos
                const isOnlyEnglishPattern = englishPatterns.some(pattern => {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(lowerMsg);
                });
                
                // Se é apenas um padrão em inglês genérico, remover
                if (isOnlyEnglishPattern) {
                    return false;
                }
                
                // Manter mensagens em português ou que contenham informações úteis
                return true;
            });
            
            // Se após filtrar não sobrou nada, usar mensagem padrão em português
            const finalFilteredDetails = filteredErrorDetails.length > 0 
                ? filteredErrorDetails 
                : ['Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.'];
            
            setStatusDetails(finalFilteredDetails);
            
            // Log para debug
            console.log('[useCardPayment] 🔴 Status de erro definido:', {
                status: 'error',
                statusMessage: errorMessage,
                statusDetails: finalErrorDetails,
                statusCode,
            });
        } finally {
            processingRef.current = false;
        }
    }, [router]);

    // Handler para submit do formulário (chamado pelo Brick)
    // CRÍTICO: orderIdRef já foi declarado e atualizado acima, apenas usar aqui
    const handleFormSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // CRÍTICO: Sempre usar o orderId mais recente do ref, não do closure
        const currentOrderId = orderIdRef.current;
        
        if (!currentOrderId) {
            console.error('[useCardPayment] ⚠️ handleFormSubmit chamado mas não há orderId atual');
            setStatus('error');
            setStatusMessage('Pedido não encontrado');
            setStatusDetails(['Por favor, recarregue a página e tente novamente.']);
            return;
        }

        console.log('[useCardPayment] 📝 handleFormSubmit - usando orderId:', currentOrderId, '(orderId atual do hook:', orderId, ')');
        
        // CRÍTICO: Verificar se o orderId do ref está sincronizado com o orderId atual
        if (currentOrderId !== orderId) {
            console.warn('[useCardPayment] ⚠️ ATENÇÃO: orderIdRef está desatualizado!', {
                refValue: currentOrderId,
                currentValue: orderId,
            });
            // Atualizar o ref imediatamente antes de processar
            orderIdRef.current = orderId;
            console.log('[useCardPayment] ✅ orderIdRef atualizado para:', orderId);
        }

        // Obter dados do Brick do form
        const form = event.currentTarget;
        const brickData = (form as any).__brickData as CardPaymentData | undefined;

        if (!brickData || !brickData.token) {
            setStatus('error');
            setStatusMessage('Dados do cartão não encontrados');
            setStatusDetails(['Por favor, preencha todos os dados do cartão.']);
            return;
        }

        // CRÍTICO: Usar o orderId atualizado (pode ter sido corrigido acima)
        const finalOrderId = orderIdRef.current;
        if (!finalOrderId) {
            console.error('[useCardPayment] ⚠️ orderIdRef está null após correção');
            setStatus('error');
            setStatusMessage('Pedido não encontrado');
            setStatusDetails(['Por favor, recarregue a página e tente novamente.']);
            return;
        }
        await processPayment(finalOrderId, brickData);
    }, [processPayment]); // Removido orderId das dependências - usamos ref

    // Dismiss status (fechar modal de erro)
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
        handleBrickReady, // Expor para uso no componente
    };
}

