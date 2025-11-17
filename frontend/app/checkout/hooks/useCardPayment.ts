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
    
    const processingRef = useRef(false);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousOrderIdRef = useRef<string | null>(null);

    // Resetar estado quando orderId mudar ou quando não houver orderId
    useEffect(() => {
        // Se orderId mudou ou foi removido, resetar estado de checkout
        if (previousOrderIdRef.current !== orderId) {
            if (!orderId) {
                // Sem orderId, resetar tudo incluindo Brick
                setIsCheckoutReady(false);
                setStatus('idle');
                setStatusMessage('');
                setStatusDetails([]);
                
                // CRÍTICO: Resetar Brick quando orderId é removido
                // Isso limpa as validações e campos do formulário
                if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                    try {
                        window.__MP_BRICK_RESET__();
                    } catch (error) {
                        console.warn('[useCardPayment] Erro ao resetar Brick quando orderId foi removido:', error);
                    }
                }
            } else {
                // OrderId mudou ou foi definido, resetar estado do pagamento
                setStatus('idle');
                setStatusMessage('');
                setStatusDetails([]);
                
                // CRÍTICO: Resetar Brick quando orderId muda (novo pedido)
                // Isso garante que campos e validações sejam limpos para o novo pedido
                if (previousOrderIdRef.current !== null && typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
                    try {
                        window.__MP_BRICK_RESET__();
                    } catch (error) {
                        console.warn('[useCardPayment] Erro ao resetar Brick quando orderId mudou:', error);
                    }
                }
                
                // Se Brick já está montado globalmente, marcar como pronto imediatamente
                // Isso resolve o problema de não aparecer quando volta para o checkout
                if (typeof window !== 'undefined' && window.__MP_BRICK_MOUNTED__) {
                    // Pequeno delay para garantir que o componente foi renderizado e Brick foi resetado
                    const timer = setTimeout(() => {
                        setIsCheckoutReady(true);
                    }, 200); // Aumentado para dar tempo do reset do Brick
                    return () => clearTimeout(timer);
                } else {
                    // Brick ainda não está montado, será marcado como pronto quando onReady for chamado
                    setIsCheckoutReady(false);
                }
            }
            previousOrderIdRef.current = orderId;
        }
    }, [orderId]);

    // Resetar pagamento para estado inicial
    const resetPayment = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
        setStatusDetails([]);
        setRedirectCountdown(null);
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
                setStatus('error');
                setStatusMessage(paymentMessage || 'Pagamento não aprovado');
                
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
                
                setStatusDetails(errorDetails);
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
            
            // Log detalhado do erro do backend
            if (errorResponse) {
                console.error('[useCardPayment] 📋 Detalhes do erro do backend:', {
                    message: errorMessage,
                    errors: errorDetails,
                    errorDetails: errorDetailsFull,
                    statusCode,
                });
            }
            
            setStatusMessage(errorMessage);
            
            if (errorDetails.length > 0) {
                // Se errorDetails é um array de strings, usar diretamente
                // Se é um array de objetos, extrair mensagens
                const details = errorDetails.map((err: any) => 
                    typeof err === 'string' ? err : err.message || err
                );
                setStatusDetails(details);
            } else if (errorDetailsFull) {
                // Usar errorDetails se disponível
                setStatusDetails([errorDetailsFull.message || errorMessage]);
            } else {
                setStatusDetails([
                    'Não foi possível processar o pagamento.',
                    statusCode === 400 ? 'Verifique os dados do cartão e tente novamente.' : 'Verifique seus dados e tente novamente.',
                ]);
            }
        } finally {
            processingRef.current = false;
        }
    }, [router]);

    // Handler para submit do formulário (chamado pelo Brick)
    // CRÍTICO: Usar ref para sempre pegar o orderId mais recente, não o capturado no closure
    const orderIdRef = useRef<string | null>(orderId);
    
    // Atualizar ref sempre que orderId mudar
    useEffect(() => {
        orderIdRef.current = orderId;
    }, [orderId]);
    
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

        console.log('[useCardPayment] 📝 handleFormSubmit - usando orderId:', currentOrderId);

        // Obter dados do Brick do form
        const form = event.currentTarget;
        const brickData = (form as any).__brickData as CardPaymentData | undefined;

        if (!brickData || !brickData.token) {
            setStatus('error');
            setStatusMessage('Dados do cartão não encontrados');
            setStatusDetails(['Por favor, preencha todos os dados do cartão.']);
            return;
        }

        await processPayment(currentOrderId, brickData);
    }, [processPayment]); // Removido orderId das dependências - usamos ref

    // Dismiss status (fechar modal de erro)
    const dismissStatus = useCallback(() => {
        if (status === 'error') {
            resetPayment();
        }
    }, [status, resetPayment]);

    // Marcar checkout como pronto quando Brick estiver pronto
    const handleBrickReady = useCallback(() => {
        setIsCheckoutReady(true);
    }, []);

    return {
        status,
        statusMessage,
        statusDetails,
        isProcessing: status === 'processing',
        isCheckoutReady,
        redirectCountdown,
        processPayment,
        handleFormSubmit,
        resetPayment,
        dismissStatus,
        handleBrickReady, // Expor para uso no componente
    };
}

