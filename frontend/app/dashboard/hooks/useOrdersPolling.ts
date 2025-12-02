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
            // CRÍTICO: Buscar TODOS os pedidos recentes (não apenas pendentes)
            // Isso permite detectar quando um pedido muda de pending para paid
            // mesmo que ele não apareça mais na lista de pendentes
            const response = await api.get('/orders', {
                params: {
                    limit: 20, // Aumentar limite para pegar mais pedidos
                },
            });

            const ordersRaw = response.data?.data?.orders ?? [];
            const pendingOrders = ordersRaw.filter((order: any) => order.status === 'pending');
            const allOrderIds = new Set(ordersRaw.map((order: any) => order._id || order.id).filter(Boolean));

            // Verificar pedidos que estávamos monitorando mas que não aparecem mais na lista
            // Isso detecta quando um pedido foi pago e saiu da lista de pendentes
            const monitoredOrderIds = Array.from(lastOrderStatusesRef.current.keys());
            for (const orderId of monitoredOrderIds) {
                // Se o pedido não está mais na lista de todos os pedidos, verificar individualmente
                if (!allOrderIds.has(orderId)) {
                    const previousStatus = lastOrderStatusesRef.current.get(orderId);
                    if (previousStatus === 'pending') {
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
                                if (isPaid) {
                                    const orderWithNumber = {
                                        ...orderData,
                                        orderNumber: orderData.orderNumber || orderData.order_number || orderId,
                                    };
                                    onOrderPaid(orderId, orderWithNumber);
                                    lastOrderStatusesRef.current.delete(orderId);
                                    // Continuar verificando outros pedidos
                                    continue;
                                }
                            }
                        } catch (err: any) {
                            // Se pedido não encontrado ou erro, remover da lista
                            if (err?.response?.status === 404) {
                                lastOrderStatusesRef.current.delete(orderId);
                            }
                        }
                    }
                }
            }

            // Se não há pedidos pendentes na lista, mas ainda há pedidos sendo monitorados, continuar
            if (pendingOrders.length === 0 && lastOrderStatusesRef.current.size === 0) {
                // Não há mais pedidos para monitorar, mas continuar polling caso apareça um novo
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
                            // CRÍTICO: Disparar callback com dados completos do pedido
                            // Garantir que orderNumber está presente
                            const orderWithNumber = {
                                ...orderData,
                                orderNumber: orderData.orderNumber || orderData.order_number || orderId,
                            };
                            onOrderPaid(orderId, orderWithNumber);
                            lastOrderStatusesRef.current.delete(orderId);
                            // Continuar verificando outros pedidos (não retornar aqui)
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
                        limit: 20, // Aumentar limite para pegar mais pedidos
                    },
                });

                const ordersRaw = response.data?.data?.orders ?? [];
                const pendingOrders = ordersRaw.filter((order: any) => order.status === 'pending');

                // Armazenar status inicial de cada pedido pendente
                lastOrderStatusesRef.current.clear();
                for (const order of pendingOrders) {
                    const orderId = order._id || order.id;
                    if (orderId) {
                        lastOrderStatusesRef.current.set(orderId, 'pending');
                    }
                }

                // CRÍTICO: Sempre iniciar polling se enabled=true, mesmo sem pedidos pendentes na lista inicial
                // Isso garante que se um pedido pendente aparecer depois, será detectado
                setIsPolling(true);
                // Primeira verificação imediata
                checkPendingOrders();
                // Configurar intervalo (5 segundos, igual ao PIX polling)
                pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
            } catch (error) {
                // Em caso de erro na inicialização, ainda tentar iniciar polling
                // Pode ser um erro temporário
                setIsPolling(true);
                pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
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

