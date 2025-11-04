import { useState, useEffect, useCallback } from 'react';
import { orderService, OrderItem } from '@/services/orderService';

interface UseOrdersOptions {
    autoFetch?: boolean;
}

export const useOrders = (options: UseOrdersOptions = { autoFetch: true }) => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState<boolean>(options.autoFetch || false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await orderService.list();
            console.log('✅ Pedidos carregados:', response);
            setOrders(response.data || []);
        } catch (err: any) {
            console.error('❌ Erro ao carregar pedidos:', err);
            setError(err.message || 'Erro ao carregar pedidos');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (options.autoFetch) {
            fetchOrders();
        }
    }, [options.autoFetch, fetchOrders]);

    return {
        orders,
        loading,
        error,
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

