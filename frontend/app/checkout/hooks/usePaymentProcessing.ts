'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import { getMercadoPagoDeviceId, waitForMercadoPagoDeviceId } from '../utils/deviceIdHelper';
import { useCheckoutNavigation } from './useCheckoutNavigation';
import { useCheckoutStorage } from './useCheckoutStorage';
import { clearCartItems } from '@/lib/cart';

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

interface UsePaymentProcessingOptions {
    setStatus: (status: 'idle' | 'processing' | 'success' | 'error') => void;
    setStatusMessage: (message: string) => void;
    setStatusDetails: (details: string[]) => void;
    setRedirectCountdown: (countdown: number | null) => void;
    setMaxAttemptsReached: (reached: boolean) => void;
    processingRef: React.MutableRefObject<boolean>;
    onCountdownUpdate?: (countdown: number) => void;
}

interface UsePaymentProcessingReturn {
    processPayment: (orderId: string, paymentData: CardPaymentData) => Promise<void>;
}

/**
 * Hook para extrair lógica de processamento de pagamento
 * Inclui chamada ao backend, tratamento de status, erros e redirecionamento
 */
export function usePaymentProcessing({
    setStatus,
    setStatusMessage,
    setStatusDetails,
    setRedirectCountdown,
    setMaxAttemptsReached,
    processingRef,
    onCountdownUpdate,
}: UsePaymentProcessingOptions): UsePaymentProcessingReturn {
    const navigation = useCheckoutNavigation();
    const storage = useCheckoutStorage();

    // Mapear detalhes de erro do Mercado Pago
    const getErrorDetailMessage = useCallback((paymentStatusDetail: string): string => {
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
        return detailMessages[paymentStatusDetail] || 'Tente novamente ou use outro cartão.';
    }, []);

    // Filtrar mensagens de erro em inglês
    const filterEnglishErrorMessages = useCallback((errorDetails: string[]): string[] => {
        return errorDetails.filter((msg) => {
            const lowerMsg = msg.toLowerCase().trim();
            const englishPatterns = [
                'the following transactions failed',
                '^failed$',
                '^transaction failed$',
                '^payment failed$',
            ];
            const isOnlyEnglishPattern = englishPatterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(lowerMsg);
            });
            return !isOnlyEnglishPattern;
        });
    }, []);

    const processPayment = useCallback(async (orderId: string, paymentData: CardPaymentData) => {
        // Prevenir múltiplas execuções simultâneas
        if (processingRef.current) {
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
            let deviceId: string;
            try {
                deviceId = await waitForMercadoPagoDeviceId(1000); // Aguardar até 1s pelo deviceId do SDK
            } catch (error) {
                // Se falhar, usar fallback imediatamente
                deviceId = getMercadoPagoDeviceId();
            }
            
            const isRealDeviceId = deviceId && !deviceId.startsWith('mp-') && deviceId !== 'ssr-device-id';
            
            // Preparar payload da requisição
            const cardholderData = paymentData.cardholder && 
                (paymentData.cardholder.name || paymentData.cardholder.email) 
                ? paymentData.cardholder 
                : undefined;
            
            const payload: any = {
                token: paymentData.token,
                installments: paymentData.installments || 1,
                paymentMethodId: paymentData.paymentMethodId,
                issuerId: paymentData.issuerId,
                deviceId,
            };
            
            if (cardholderData) {
                payload.cardholder = cardholderData;
            }
            
            // Enviar requisição com deviceId no body e header
            const response = await api.post(
                `/payments/${orderId}/card`,
                payload,
                {
                    headers: {
                        'X-meli-session-id': deviceId,
                    },
                }
            );

            const paymentResult = response.data?.data || response.data;
            const statusInfo = paymentResult?.statusInfo;
            
            // Verificar status do pagamento
            const paymentStatus = paymentResult?.paymentStatus || paymentResult?.status;
            const paymentMessage = statusInfo?.userMessage || paymentResult?.paymentMessage || paymentResult?.message;
            const paymentStatusDetail = paymentResult?.paymentStatusDetail || paymentResult?.statusDetail;

            // Mapear status do MP para nosso status interno
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

                // Limpar storage e permitir navegação
                storage.clearOrderRelated();
                navigation.allowNavigation();

                // Iniciar countdown para redirecionamento
                setRedirectCountdown(5);
                navigation.startRedirectCountdown(
                    '/dashboard',
                    5,
                    (countdown) => {
                        if (onCountdownUpdate) {
                            onCountdownUpdate(countdown);
                        }
                        setRedirectCountdown(countdown > 0 ? countdown : null);
                    },
                    { clearStorage: true, useReplace: true }
                );
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
                const cardAttempts = paymentResult?.cardAttempts ?? response.data?.cardAttempts;
                const maxCardAttempts = paymentResult?.maxCardAttempts ?? response.data?.maxCardAttempts ?? 3;
                const attemptsExhausted = cardAttempts !== undefined && maxCardAttempts !== undefined && cardAttempts >= maxCardAttempts;
                
                setMaxAttemptsReached(attemptsExhausted);
                setStatus('error');
                
                if (attemptsExhausted) {
                    setStatusMessage('Tentativas esgotadas');
                    setStatusDetails([
                        'Infelizmente você esgotou suas tentativas nesse pedido.',
                        'Você vai precisar criar um novo pedido para tentar novamente.',
                    ]);
                } else {
                    setStatusMessage(paymentMessage || 'Pagamento não aprovado');
                    const remainingAttempts = maxCardAttempts - (cardAttempts || 0);
                    const errorDetails: string[] = [];
                    
                    if (paymentStatusDetail) {
                        errorDetails.push(getErrorDetailMessage(paymentStatusDetail));
                    } else {
                        errorDetails.push('Tente novamente ou use outro cartão.');
                    }
                    
                    if (remainingAttempts > 0) {
                        errorDetails.push(`Você ainda tem ${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`);
                    }
                    
                    setStatusDetails(errorDetails);
                }
            }
        } catch (error: any) {
            console.error('[usePaymentProcessing] ❌ Erro ao processar pagamento:', {
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
                console.error('[usePaymentProcessing] 📋 Detalhes do erro do backend:', {
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
                return;
            }
            
            setStatusMessage(errorMessage);
            
            // CRÍTICO: Garantir que sempre há mensagens de erro para exibir no modal
            let finalErrorDetails: string[] = [];
            
            if (errorDetails.length > 0) {
                finalErrorDetails = errorDetails.map((err: any) => 
                    typeof err === 'string' ? err : err.message || String(err)
                );
            } else if (errorDetailsFull) {
                const fullMessage = typeof errorDetailsFull === 'string' 
                    ? errorDetailsFull 
                    : errorDetailsFull.message || errorMessage;
                finalErrorDetails = [fullMessage];
            } else {
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
            if (finalErrorDetails.length === 0) {
                finalErrorDetails = [errorMessage || 'Erro ao processar pagamento. Tente novamente.'];
            }
            
            // Filtrar mensagens em inglês
            const filteredErrorDetails = filterEnglishErrorMessages(finalErrorDetails);
            const finalFilteredDetails = filteredErrorDetails.length > 0 
                ? filteredErrorDetails 
                : ['Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.'];
            
            setStatusDetails(finalFilteredDetails);
            
            // Log para debug
        } finally {
            processingRef.current = false;
        }
    }, [
        setStatus,
        setStatusMessage,
        setStatusDetails,
        setRedirectCountdown,
        setMaxAttemptsReached,
        processingRef,
        onCountdownUpdate,
        navigation,
        storage,
        getErrorDetailMessage,
        filterEnglishErrorMessages,
    ]);

    return {
        processPayment,
    };
}

