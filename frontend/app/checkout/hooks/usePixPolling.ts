'use client';

import { useCallback, useRef } from 'react';
import api from '@/lib/api';

interface UsePixPollingOptions {
    orderIdRef: React.MutableRefObject<string | null>;
    setStatus: (status: 'idle' | 'processing' | 'success' | 'error') => void;
    setStatusMessage: (message: string) => void;
    onPaymentSuccess: () => void;
    onPaymentError: (message: string) => void;
}

interface UsePixPollingReturn {
    startPolling: (orderId: string) => void;
    stopPolling: () => void;
}

/**
 * Hook para extrair lógica de polling PIX
 * Verifica status do pagamento periodicamente até ser aprovado, cancelado ou exceder tentativas
 */
export function usePixPolling({
    orderIdRef,
    setStatus,
    setStatusMessage,
    onPaymentSuccess,
    onPaymentError,
}: UsePixPollingOptions): UsePixPollingReturn {
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Parar polling
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            console.log('[usePixPolling] 🛑 Polling parado');
        }
    }, []);

    // Iniciar polling para verificar status do pagamento
    const startPolling = useCallback((orderId: string) => {
        // Limpar polling anterior se existir
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        let attempts = 0;
        const maxAttempts = 180; // 180 tentativas = 15 minutos (5s * 180 = 900s = 15min)
        const pollingInterval = 5000; // 5 segundos

        pollingIntervalRef.current = setInterval(async () => {
            attempts++;
            
            // Verificar se ainda temos o mesmo orderId
            if (orderIdRef.current !== orderId) {
                console.log('[usePixPolling] ⚠️ OrderId mudou durante polling, parando:', {
                    expectedOrderId: orderId,
                    currentOrderIdRef: orderIdRef.current,
                });
                stopPolling();
                return;
            }

            try {
                const response = await api.get(`/orders/${orderId}`);
                const order = response.data?.data || response.data?.data?.order;
                
                if (order) {
                    // Se pedido foi pago, parar polling e mostrar sucesso
                    if (order.status === 'paid') {
                        stopPolling();
                        setStatus('success');
                        setStatusMessage('Pagamento aprovado com sucesso!');
                        onPaymentSuccess();
                    } else if (order.status === 'cancelled' || order.status === 'failed') {
                        // Pedido cancelado ou falhou, parar polling
                        stopPolling();
                        setStatus('error');
                        const errorMessage = 'Pagamento não foi concluído. Tente gerar um novo QR Code.';
                        setStatusMessage(errorMessage);
                        onPaymentError(errorMessage);
                    } else {
                        // Pedido ainda pendente
                        console.log('[usePixPolling] ⏳ Pedido ainda pendente:', {
                            orderStatus: order.status,
                            attempts,
                            remainingAttempts: maxAttempts - attempts,
                        });
                    }
                } else {
                    console.log('[usePixPolling] ⚠️ Resposta da API não contém dados do pedido');
                }
            } catch (err: any) {
                const statusCode = err?.response?.status;
                // Se pedido não encontrado (404), parar polling
                if (statusCode === 404) {
                    console.log('[usePixPolling] ⚠️ Pedido não encontrado durante polling (404), parando:', {
                        orderId,
                        attempts,
                    });
                    stopPolling();
                }
            }

            // Se excedeu tentativas, parar polling
            if (attempts >= maxAttempts) {
                stopPolling();
            }
        }, pollingInterval);
        
        console.log('[usePixPolling] ✅ Polling iniciado com sucesso, intervalo configurado');
    }, [orderIdRef, setStatus, setStatusMessage, onPaymentSuccess, onPaymentError, stopPolling]);

    return {
        startPolling,
        stopPolling,
    };
}

