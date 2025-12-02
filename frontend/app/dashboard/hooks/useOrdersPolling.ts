'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface UseOrdersPollingOptions {
    enabled: boolean;
    onOrderPaid: (orderId: string, order: any) => void;
}

interface UseOrdersPollingReturn {
    isPolling: boolean;
    stopPolling: () => void;
}

/**
 * Hook para fazer polling de pedidos pendentes e detectar quando são pagos
 * Similar ao usePixPolling, mas para a página de pedidos
 */
export function useOrdersPolling({
    enabled,
    onOrderPaid,
}: UseOrdersPollingOptions): UseOrdersPollingReturn {
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const lastOrderStatusesRef = useRef<Map<string, string>>(new Map()); // orderId -> status

    // Parar polling
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setIsPolling(false);
    }, []);

    // Função para verificar pedidos pendentes
    const checkPendingOrders = useCallback(async () => {
        if (!enabled) {
            stopPolling();
            return;
        }

        try {
            // Buscar apenas pedidos pendentes
            const response = await api.get('/orders', {
                params: {
                    limit: 10,
                    status: 'pending', // Filtrar apenas pendentes
                },
            });

            const ordersRaw = response.data?.data?.orders ?? [];
            const pendingOrders = ordersRaw.filter((order: any) => order.status === 'pending');

            // Se não há pedidos pendentes, parar polling
            if (pendingOrders.length === 0) {
                stopPolling();
                return;
            }

            // Verificar cada pedido pendente individualmente para detectar mudanças
            for (const order of pendingOrders) {
                const orderId = order._id || order.id;
                if (!orderId) continue;

                const previousStatus = lastOrderStatusesRef.current.get(orderId) || 'pending';
                
                try {
                    // Buscar detalhes atualizados do pedido
                    const orderResponse = await api.get(`/orders/${orderId}`);
                    const orderData = orderResponse.data?.data;

                    if (orderData) {
                        const isProcessedAccredited =
                            orderData.paymentStatus === 'processed' &&
                            (orderData.paymentStatusDetail === 'accredited' ||
                                String(orderData.paymentStatusDetail || '').toLowerCase().includes('accredited'));

                        const isPaid =
                            orderData.status === 'paid' ||
                            orderData.paymentStatus === 'approved' ||
                            isProcessedAccredited;

                        // Se mudou de pending para paid, disparar callback
                        if (previousStatus === 'pending' && isPaid) {
                            onOrderPaid(orderId, orderData);
                            lastOrderStatusesRef.current.delete(orderId);
                        } else if (isPaid) {
                            // Já estava pago, remover da lista
                            lastOrderStatusesRef.current.delete(orderId);
                        } else {
                            // Ainda pendente, atualizar timestamp (não status)
                            lastOrderStatusesRef.current.set(orderId, 'pending');
                        }
                    }
                } catch (err: any) {
                    // Ignorar erros individuais, continuar com outros pedidos
                    if (err?.response?.status === 404) {
                        // Pedido não encontrado, remover da lista
                        lastOrderStatusesRef.current.delete(orderId);
                    }
                }
            }
        } catch (error: any) {
            // Em caso de erro, continuar tentando (pode ser temporário)
        }
    }, [enabled, onOrderPaid, stopPolling]);

    // Iniciar polling quando habilitado
    useEffect(() => {
        if (!enabled) {
            stopPolling();
            return;
        }

        // Inicializar status dos pedidos pendentes
        const initializeStatuses = async () => {
            try {
                const response = await api.get('/orders', {
                    params: {
                        limit: 10,
                    },
                });

                const ordersRaw = response.data?.data?.orders ?? [];
                const pendingOrders = ordersRaw.filter((order: any) => order.status === 'pending');

                // Armazenar status inicial de cada pedido pendente
                lastOrderStatusesRef.current.clear();
                for (const order of pendingOrders) {
                    const orderId = order._id || order.id;
                    lastOrderStatusesRef.current.set(orderId, 'pending');
                }

                // Se há pedidos pendentes, iniciar polling
                if (pendingOrders.length > 0) {
                    setIsPolling(true);
                    // Primeira verificação imediata
                    checkPendingOrders();
                    // Configurar intervalo (5 segundos, igual ao PIX polling)
                    pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
                }
            } catch (error) {
                // Em caso de erro na inicialização, não iniciar polling
            }
        };

        initializeStatuses();

        return () => {
            stopPolling();
        };
    }, [enabled, checkPendingOrders, stopPolling]);

    return {
        isPolling,
        stopPolling,
    };
}

