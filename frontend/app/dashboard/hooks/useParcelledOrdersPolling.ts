'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface UseParcelledOrdersPollingOptions {
    enabled: boolean;
    onParcelPaid: (parcelledOrderId: string, parcelId: string, sequence: number) => void;
}

interface UseParcelledOrdersPollingReturn {
    isPolling: boolean;
    stopPolling: () => void;
}

/**
 * Hook para fazer polling de parcelamentos e detectar quando parcelas são pagas
 * Similar ao useOrdersPolling, mas para vendas parceladas
 */
export function useParcelledOrdersPolling({
    enabled,
    onParcelPaid,
}: UseParcelledOrdersPollingOptions): UseParcelledOrdersPollingReturn {
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const lastParcelStatusesRef = useRef<Map<string, string>>(new Map()); // parcelId -> status

    // Parar polling
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setIsPolling(false);
    }, []);

    // Função para verificar parcelas pendentes
    const checkParcels = useCallback(async () => {
        if (!enabled) {
            stopPolling();
            return;
        }

        try {
            // Buscar todas as vendas parceladas ativas
            const response = await api.get('/parcelled-orders', {
                params: {
                    limit: 50, // Buscar mais para pegar todas as parcelas
                },
            });

            const data = response.data?.data;
            const ordersRaw = Array.isArray(data?.orders) ? data.orders : [];
            const parcelsRaw = data?.parcelsByOrder || {};
            
            // Coletar todas as parcelas de todas as vendas parceladas
            const allParcels: Array<{ parcelId: string; status: string; sequence: number; parcelledOrderId: string }> = [];
            
            // Processar parcelas por orderId
            Object.keys(parcelsRaw).forEach((orderId) => {
                const parcels = parcelsRaw[orderId] || [];
                for (const parcel of parcels) {
                    allParcels.push({
                        parcelId: parcel._id || parcel.id,
                        status: parcel.status,
                        sequence: parcel.sequence,
                        parcelledOrderId: orderId,
                    });
                }
            });

            // Verificar cada parcela para detectar mudanças de status
            for (const parcel of allParcels) {
                const parcelId = parcel.parcelId;
                if (!parcelId) continue;

                const previousStatus = lastParcelStatusesRef.current.get(parcelId) || parcel.status;
                
                // Se mudou de qualquer status para 'paid', disparar callback
                if (previousStatus !== 'paid' && parcel.status === 'paid') {
                    onParcelPaid(parcel.parcelledOrderId, parcelId, parcel.sequence);
                    lastParcelStatusesRef.current.set(parcelId, 'paid');
                } else if (parcel.status !== 'paid') {
                    // Atualizar status na ref se não estiver pago
                    lastParcelStatusesRef.current.set(parcelId, parcel.status);
                } else {
                    // Já estava pago, manter na ref
                    lastParcelStatusesRef.current.set(parcelId, 'paid');
                }
            }

            // Remover parcelas que não estão mais na lista (já foram pagas e removidas)
            const currentParcelIds = new Set(allParcels.map(p => p.parcelId));
            const monitoredParcelIds = Array.from(lastParcelStatusesRef.current.keys());
            for (const parcelId of monitoredParcelIds) {
                if (!currentParcelIds.has(parcelId)) {
                    // Parcela não está mais na lista, pode ter sido removida ou paga
                    // Manter na ref por enquanto, mas não disparar callback
                }
            }
        } catch (error: any) {
            // Em caso de erro, continuar tentando (pode ser temporário)
        }
    }, [enabled, onParcelPaid, stopPolling]);

    // Iniciar polling quando habilitado
    useEffect(() => {
        if (!enabled) {
            stopPolling();
            return;
        }

        // Inicializar status das parcelas
        const initializeStatuses = async () => {
            try {
                const response = await api.get('/parcelled-orders', {
                    params: {
                        limit: 50,
                    },
                });

                const data = response.data?.data;
                const parcelsRaw = data?.parcelsByOrder || {};
                
                // Armazenar status inicial de cada parcela
                lastParcelStatusesRef.current.clear();
                Object.keys(parcelsRaw).forEach((orderId) => {
                    const parcels = parcelsRaw[orderId] || [];
                    for (const parcel of parcels) {
                        const parcelId = parcel._id || parcel.id;
                        if (parcelId) {
                            lastParcelStatusesRef.current.set(parcelId, parcel.status || 'pending');
                        }
                    }
                });

                setIsPolling(true);
                // Primeira verificação imediata
                checkParcels();
                // Configurar intervalo (5 segundos, igual ao orders polling)
                pollingIntervalRef.current = setInterval(checkParcels, 5000);
            } catch (error) {
                // Em caso de erro na inicialização, ainda tentar iniciar polling
                setIsPolling(true);
                pollingIntervalRef.current = setInterval(checkParcels, 5000);
            }
        };

        initializeStatuses();

        return () => {
            stopPolling();
        };
    }, [enabled, checkParcels, stopPolling]);

    return {
        isPolling,
        stopPolling,
    };
}
