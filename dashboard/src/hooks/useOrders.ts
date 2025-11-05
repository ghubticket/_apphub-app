import { useState, useEffect, useCallback } from 'react';
import { orderService, OrderItem } from '@/services/orderService';

interface UseOrdersOptions {
    autoFetch?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
}

interface UseOrdersReturn {
    orders: OrderItem[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    } | null;
    fetchOrders: () => Promise<void>;
    refetch: () => Promise<void>;
}

export const useOrders = (options: UseOrdersOptions = { autoFetch: true }): UseOrdersReturn => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<UseOrdersReturn['pagination']>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await orderService.list({
                page: options.page,
                limit: options.limit,
                search: options.search,
                status: options.status
            });
            
            // Verificar se a resposta tem estrutura paginada ou array direto
            let ordersToSet: OrderItem[] = [];
            let paginationToSet = null;
            
            if (Array.isArray(response.data)) {
                // Estrutura antiga (array direto) - manter compatibilidade
                ordersToSet = response.data;
            } else if (response.data && typeof response.data === 'object' && response.data.orders) {
                // Estrutura nova (paginada) - { orders: [], pagination: {} }
                ordersToSet = Array.isArray(response.data.orders) ? response.data.orders : [];
                paginationToSet = response.data.pagination || null;
            }
            
            console.log('🔄 setOrders será chamado com:', ordersToSet.length, 'pedidos');
            console.log('🔄 Primeiro pedido:', ordersToSet[0]);
            setOrders(ordersToSet);
            setPagination(paginationToSet);
            console.log('✅ setOrders e setPagination chamados');
        } catch (err: any) {
            console.error('Erro ao carregar pedidos:', err);
            setError(err.message || 'Erro ao carregar pedidos');
            setOrders([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    }, [options.page, options.limit, options.search, options.status]);

    useEffect(() => {
        if (options.autoFetch !== false) {
            fetchOrders();
        }
    }, [options.autoFetch, fetchOrders]);

    return {
        orders,
        loading,
        error,
        pagination,
        fetchOrders,
        refetch: fetchOrders,
    };
};

export const useOrder = (id: string | null) => {
    const [order, setOrder] = useState<OrderItem | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrder = useCallback(async () => {
        if (!id) {
            setOrder(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await orderService.getById(id);
            setOrder(response.data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar pedido');
            setOrder(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchOrder();
        }
    }, [id, fetchOrder]);

    return {
        order,
        loading,
        error,
        fetchOrder,
        refetch: fetchOrder,
    };
};

