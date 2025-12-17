'use client';

import { useCallback, useRef, useEffect } from 'react';
import { getParcelledOrder as getParcelledOrderAction } from '@/app/api/payments/actions';
import { useRouter } from 'next/navigation';

interface UseParcelledOrderPollingOptions {
    parcelledOrderId: string | null;
    onEntryPaid: () => void;
}

interface UseParcelledOrderPollingReturn {
    startPolling: () => void;
    stopPolling: () => void;
}

/**
 * Hook para polling de pedidos parcelados no checkout
 * Detecta quando a entrada (parcela 0) é paga e dispara modal de sucesso
 */
export function useParcelledOrderPolling({
    parcelledOrderId,
    onEntryPaid,
}: UseParcelledOrderPollingOptions): UseParcelledOrderPollingReturn {
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastEntryStatusRef = useRef<string | null>(null);
    const router = useRouter();

    // Parar polling
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    // Iniciar polling para verificar status da entrada
    const startPolling = useCallback(() => {
        if (!parcelledOrderId) {
            return;
        }

        // Limpar polling anterior se existir
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        let attempts = 0;
        const maxAttempts = 180; // 15 minutos (5s * 180 = 900s = 15min)
        const pollingInterval = 5000; // 5 segundos

        // Função que executa uma verificação de status
        const executePoll = async () => {
            attempts++;

            if (!parcelledOrderId) {
                stopPolling();
                return;
            }

            try {
                // Obter token de autenticação
                const token = localStorage.getItem('accessToken') || 
                            sessionStorage.getItem('accessToken') || 
                            localStorage.getItem('token') || 
                            null;
                
                // Usar Server Action para buscar pedido parcelado (nunca expõe URL da API)
                const response = await getParcelledOrderAction(
                    parcelledOrderId,
                    token ? { 'Authorization': `Bearer ${token}` } : {}
                );
                
                const parcelledOrder = response?.data?.parcelledOrder;
                const parcels = response?.data?.parcels || [];

                if (parcelledOrder && parcels.length > 0) {
                    // Buscar parcela de entrada (sequence 0)
                    const entryParcel = parcels.find((p: any) => p.sequence === 0);
                    
                    if (entryParcel) {
                        const currentStatus = entryParcel.status || 'pending';
                        const lastStatus = lastEntryStatusRef.current;

                        // Detectar quando entrada foi paga
                        if (lastStatus && lastStatus !== 'paid' && currentStatus === 'paid') {
                            stopPolling();
                            
                            // Vibrar dispositivo (se suportado)
                            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                                navigator.vibrate([200, 100, 200]);
                            }

                            // Chamar callback para mostrar modal
                            onEntryPaid();
                            return;
                        }

                        // Atualizar status na ref
                        lastEntryStatusRef.current = currentStatus;

                        // Se entrada já está paga, parar polling
                        if (currentStatus === 'paid') {
                            stopPolling();
                            return;
                        }

                        // Se parcelled order foi cancelado, parar polling
                        if (parcelledOrder.status === 'cancelled') {
                            stopPolling();
                            return;
                        }
                    }
                }
            } catch (err: any) {
                const statusCode = err?.response?.status;
                
                // Se pedido não encontrado (404), parar polling
                if (statusCode === 404) {
                    stopPolling();
                    return;
                }
                // Não parar polling em outros erros (pode ser temporário)
            }

            // Se excedeu tentativas, parar polling
            if (attempts >= maxAttempts) {
                stopPolling();
            }
        };

        // Executar primeira verificação imediatamente
        executePoll();

        // Configurar intervalo para próximas verificações
        pollingIntervalRef.current = setInterval(executePoll, pollingInterval);
    }, [parcelledOrderId, onEntryPaid, stopPolling]);

    // Limpar polling ao desmontar
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    return {
        startPolling,
        stopPolling,
    };
}
