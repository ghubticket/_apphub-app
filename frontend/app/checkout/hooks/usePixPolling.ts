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

        // Função que executa uma verificação de status
        const executePoll = async () => {
            attempts++;
            
            // CRÍTICO: Usar orderIdRef.current em vez de orderId para permitir atualização dinâmica
            // Isso permite que o polling continue mesmo quando o pedido fake é substituído por um real
            const currentOrderId = orderIdRef.current || orderId;
            
            // Verificar se ainda temos um orderId válido (não null)
            if (!currentOrderId) {
                stopPolling();
                return;
            }
            
            // Se o orderId mudou de fake para real, atualizar e continuar
            if (currentOrderId !== orderId && currentOrderId.startsWith('fake-') === false) {
                // Não parar - continuar com o novo orderId real
            }

            try {
                // Usar o orderId atualizado (pode ser real ou fake)
                const orderIdToCheck = orderIdRef.current || orderId;
                
                // Log removido para reduzir ruído - só logar a cada 10 tentativas ou em caso de mudança de status
                if (attempts % 10 === 0) {
                }
                
                const response = await api.get(`/orders/${orderIdToCheck}`);
                // API retorna { success: true, data: order }
                const order = response.data?.data;
                
                // Log removido para reduzir ruído - só logar quando status mudar
                
                if (order) {
                    // CRÍTICO: Verificar tanto order.status quanto paymentStatus
                    // Na Orders API, PIX aprovado vem como status='processed' + status_detail='accredited'
                    // O backend mapeia isso para order.status='paid'
                    const isProcessedAccredited = 
                        order.paymentStatus === 'processed' && 
                        (order.paymentStatusDetail === 'accredited' || 
                         String(order.paymentStatusDetail || '').toLowerCase().includes('accredited'));
                    
                    const isPaid = order.status === 'paid' || 
                                  order.paymentStatus === 'approved' || 
                                  isProcessedAccredited;
                    
                    // Se pedido foi pago, parar polling e mostrar sucesso
                    if (isPaid) {
                        stopPolling();
                        setStatus('success');
                        setStatusMessage('Pagamento aprovado com sucesso!');
                        onPaymentSuccess();
                        return; // Parar execução
                    } else if (order.status === 'cancelled' || order.status === 'failed' || 
                               order.paymentStatus === 'cancelled' || order.paymentStatus === 'rejected') {
                        // Pedido cancelado ou falhou, parar polling
                        stopPolling();
                        setStatus('error');
                        const errorMessage = 'Pagamento não foi concluído. Tente gerar um novo QR Code.';
                        setStatusMessage(errorMessage);
                        onPaymentError(errorMessage);
                        return; // Parar execução
                    } else {
                        // Pedido ainda pendente - log removido para reduzir ruído
                    }
                } else {
                }
            } catch (err: any) {
                const statusCode = err?.response?.status;
                const errorMessage = err?.response?.data?.message || err?.message;
                const orderIdToCheck = orderIdRef.current || orderId;
                
                // Log do erro no polling (apenas a cada 10 tentativas para não poluir)
                if (attempts % 10 === 0) {
                    console.warn('[usePixPolling] Erro ao verificar status:', {
                        statusCode,
                        errorMessage,
                        orderId: orderIdToCheck,
                        attempts,
                    });
                }
                
                // Se pedido não encontrado (404), parar polling imediatamente
                if (statusCode === 404) {
                    console.error('[usePixPolling] Pedido não encontrado (404), parando polling:', orderIdToCheck);
                    stopPolling();
                    setStatus('error');
                    setStatusMessage('Pedido não encontrado. Por favor, recarregue a página.');
                    onPaymentError('Pedido não encontrado');
                    return; // Parar execução
                }
                
                // Se erro 500 ou outros erros críticos, parar após algumas tentativas
                if (statusCode >= 500 && attempts >= 5) {
                    console.error('[usePixPolling] Erro crítico do servidor, parando polling após 5 tentativas');
                    stopPolling();
                    setStatus('error');
                    setStatusMessage('Erro ao verificar pagamento. Tente recarregar a página.');
                    onPaymentError('Erro ao verificar pagamento');
                    return;
                }
                
                // Não parar polling em outros erros (pode ser temporário)
            }

            // Se excedeu tentativas, parar polling
            if (attempts >= maxAttempts) {
                stopPolling();
            }
        };

        // Executar primeira verificação imediatamente (não esperar 5 segundos)
        executePoll();

        // Configurar intervalo para próximas verificações
        pollingIntervalRef.current = setInterval(executePoll, pollingInterval);
        
    }, [orderIdRef, setStatus, setStatusMessage, onPaymentSuccess, onPaymentError, stopPolling]);

    return {
        startPolling,
        stopPolling,
    };
}

