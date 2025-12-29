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
    startPolling: () => void;
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

    // Flag para evitar múltiplas execuções simultâneas
    const isCheckingRef = useRef(false);

    // Função para verificar pedidos pendentes
    const checkPendingOrders = useCallback(async () => {
        if (!enabled || isCheckingRef.current) {
            if (!enabled) {
                stopPolling();
            }
            return;
        }

        try {
            isCheckingRef.current = true;
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

            // PRIMEIRO: Verificar pedidos que estávamos monitorando para detectar mudanças de status
            // Isso inclui pedidos que mudaram de pending para paid na lista
            const monitoredOrderIds = Array.from(lastOrderStatusesRef.current.keys());
            
            // Verificar pedidos que estão na lista mas mudaram de status
            for (const order of ordersRaw) {
                const orderId = order._id || order.id;
                if (!orderId) continue;
                
                const previousStatus = lastOrderStatusesRef.current.get(orderId);
                if (!previousStatus) continue; // Não estávamos monitorando este pedido
                
                const currentStatus = order.status || 'pending';
                
                // Se mudou de pending para paid, disparar callback
                if (previousStatus === 'pending' && currentStatus === 'paid') {
                    const orderWithNumber = {
                        ...order,
                        orderNumber: order.orderNumber || order.order_number || orderId,
                    };
                    onOrderPaid(orderId, orderWithNumber);
                    lastOrderStatusesRef.current.delete(orderId);
                    continue;
                }
            }
            
            // Verificar pedidos que estávamos monitorando mas que não aparecem mais na lista
            // Isso detecta quando um pedido foi pago e saiu da lista completamente
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

            // Verificar cada pedido pendente - adicionar novos à lista de monitoramento
            for (const order of pendingOrders) {
                const orderId = order._id || order.id;
                if (!orderId) continue;

                // Se não estávamos monitorando, adicionar à lista
                if (!lastOrderStatusesRef.current.has(orderId)) {
                    lastOrderStatusesRef.current.set(orderId, 'pending');
                }
            }

            // CRÍTICO: Se não há pedidos pendentes E não há pedidos sendo monitorados, PARAR polling
            // Não precisa ficar fazendo requisições quando não há nada para verificar
            // IMPORTANTE: Esta verificação deve vir DEPOIS de verificar mudanças de status
            if (pendingOrders.length === 0 && lastOrderStatusesRef.current.size === 0) {
                // Não há mais pedidos para monitorar - parar polling para economizar recursos
                stopPolling();
                return;
            }
        } catch (error: any) {
            // Em caso de erro, continuar tentando (pode ser temporário)
        } finally {
            isCheckingRef.current = false;
        }
    }, [enabled, onOrderPaid, stopPolling]);

    // Iniciar polling quando habilitado E quando há pedidos pendentes
    useEffect(() => {
        if (!enabled) {
            stopPolling();
            return;
        }

        // Inicializar status dos pedidos pendentes
        const initializeStatuses = async () => {
            // Limpar status anteriores ao reiniciar
            lastOrderStatusesRef.current.clear();
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

                // CRÍTICO: Só iniciar polling se houver pedidos pendentes
                // Não fazer polling constante quando não há nada para verificar
                if (pendingOrders.length > 0 || lastOrderStatusesRef.current.size > 0) {
                    setIsPolling(true);
                    // Primeira verificação imediata
                    checkPendingOrders();
                    // Configurar intervalo (5 segundos, igual ao PIX polling)
                    // Só iniciar se não estiver já rodando
                    if (!pollingIntervalRef.current) {
                        pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
                    }
                } else {
                    // Não há pedidos pendentes - não iniciar polling
                    setIsPolling(false);
                    stopPolling();
                }
            } catch (error) {
                // Em caso de erro na inicialização, verificar se há pedidos para monitorar
                // Se não houver, não iniciar polling
                if (lastOrderStatusesRef.current.size > 0) {
                    setIsPolling(true);
                    if (!pollingIntervalRef.current) {
                        pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
                    }
                } else {
                    setIsPolling(false);
                    stopPolling();
                }
            }
        };

        initializeStatuses();

        return () => {
            stopPolling();
        };
        // CRÍTICO: Remover checkPendingOrders e stopPolling das dependências
        // para evitar re-execução do useEffect quando essas funções mudarem
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    // Função para reiniciar polling manualmente (útil quando novos pedidos aparecem)
    const startPolling = useCallback(() => {
        if (!enabled) return;
        
        // Verificar se já está fazendo polling
        if (pollingIntervalRef.current) {
            return;
        }

        // Inicializar e iniciar polling
        const initializeAndStart = async () => {
            try {
                const response = await api.get('/orders', {
                    params: {
                        limit: 20,
                    },
                });

                const ordersRaw = response.data?.data?.orders ?? [];
                const pendingOrders = ordersRaw.filter((order: any) => order.status === 'pending');

                // Armazenar status inicial de cada pedido pendente
                for (const order of pendingOrders) {
                    const orderId = order._id || order.id;
                    if (orderId) {
                        lastOrderStatusesRef.current.set(orderId, 'pending');
                    }
                }

                if (pendingOrders.length > 0 || lastOrderStatusesRef.current.size > 0) {
                    setIsPolling(true);
                    checkPendingOrders();
                    pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
                }
            } catch (error) {
                // Em caso de erro, tentar iniciar mesmo assim se houver pedidos monitorados
                if (lastOrderStatusesRef.current.size > 0) {
                    setIsPolling(true);
                    pollingIntervalRef.current = setInterval(checkPendingOrders, 5000);
                }
            }
        };

        initializeAndStart();
    }, [enabled, checkPendingOrders]);

    return {
        isPolling,
        stopPolling,
        startPolling,
    };
}

