'use client';

import { useEffect, useRef, useCallback } from 'react';
import { listParcelledOrders as listParcelledOrdersAction } from '@/app/api/payments/actions';

interface UseParcelledOrdersPollingOptions {
    enabled: boolean;
    onParcelPaid?: (parcelledOrderId: string, parcelId: string, sequence: number) => void;
    intervalMs?: number;
}

export function useParcelledOrdersPolling({
    enabled,
    onParcelPaid,
    intervalMs = 5000, // 5 segundos
}: UseParcelledOrdersPollingOptions) {
    const lastParcelStatusesRef = useRef<Map<string, string>>(new Map());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPollingRef = useRef(false);

    const checkParcelsStatus = useCallback(async () => {
        if (!enabled || isPollingRef.current) return;

        try {
            isPollingRef.current = true;

            // Obter token de autenticação
            const token = localStorage.getItem('accessToken') || 
                        sessionStorage.getItem('accessToken') || 
                        localStorage.getItem('token') || 
                        null;
            
            // Usar Server Action para listar pedidos parcelados (nunca expõe URL da API)
            const response = await listParcelledOrdersAction(
                token ? { 'Authorization': `Bearer ${token}` } : {}
            );
            const data = response?.data;

            const ordersRaw = Array.isArray(data?.orders) ? data.orders : [];
            const parcelsRaw = data?.parcelsByOrder || {};

            // Verificar mudanças de status das parcelas
            Object.keys(parcelsRaw).forEach((orderId) => {
                const parcels = parcelsRaw[orderId] || [];
                
                parcels.forEach((parcel: any) => {
                    const parcelId = parcel._id || parcel.id;
                    if (!parcelId) return;

                    const currentStatus = parcel.status || 'pending';
                    const lastStatus = lastParcelStatusesRef.current.get(parcelId);

                    // Detectar quando uma parcela foi paga
                    if (lastStatus && lastStatus !== 'paid' && currentStatus === 'paid') {
                        // Vibrar dispositivo (se suportado)
                        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                            navigator.vibrate([200, 100, 200]);
                        }

                        // Notificar callback
                        if (onParcelPaid) {
                            onParcelPaid(orderId, parcelId, parcel.sequence);
                        }
                    }

                    // Atualizar status na ref
                    lastParcelStatusesRef.current.set(parcelId, currentStatus);
                });
            });
        } catch (error) {
            console.error('[ParcelledOrdersPolling] Erro ao verificar status:', error);
        } finally {
            isPollingRef.current = false;
        }
    }, [enabled, onParcelPaid]);

    // Iniciar/parar polling
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Primeira verificação imediata
        checkParcelsStatus();

        // Polling periódico
        intervalRef.current = setInterval(checkParcelsStatus, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, checkParcelsStatus, intervalMs]);

    return {
        isPolling: enabled && isPollingRef.current,
    };
}
