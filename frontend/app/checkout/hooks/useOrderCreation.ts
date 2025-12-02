'use client';

import { useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { CheckoutCartItem } from '../types';
import { useCheckoutStorage } from './useCheckoutStorage';
import { isOrderExpired, getRemainingTime, parseExpiresAt } from '../utils/orderHelpers';

interface UseOrderCreationOptions {
    setOrder: (order: any) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setShowExpiredModal: (show: boolean) => void;
    orderIdRef: React.MutableRefObject<string | null>;
    cachedOrderIdFromStorageRef: React.MutableRefObject<string | null>;
    creatingRef: React.MutableRefObject<boolean>;
    lastCreateTimeRef: React.MutableRefObject<number>;
    hasShownExpiredModalRef: React.MutableRefObject<boolean>;
    createOrderAbortControllerRef: React.MutableRefObject<AbortController | null>;
    order: any | null;
    promoterCode?: string | null;
}

interface UseOrderCreationReturn {
    createOrder: (
        cartItems: CheckoutCartItem[],
        customerData: { name: string; email: string; cpf: string; phone: string }
    ) => Promise<void>;
}

/**
 * Hook para extrair lógica de criação de pedidos
 * Inclui validação, verificação de pedido existente, criação no backend e tratamento de erros
 */
export function useOrderCreation({
    setOrder,
    setLoading,
    setError,
    setShowExpiredModal,
    orderIdRef,
    cachedOrderIdFromStorageRef,
    creatingRef,
    lastCreateTimeRef,
    hasShownExpiredModalRef,
    createOrderAbortControllerRef,
    order,
    promoterCode,
}: UseOrderCreationOptions): UseOrderCreationReturn {
    const storage = useCheckoutStorage();

    // Função auxiliar para cancelar pedido no backend
    const cancelOrderInBackend = useCallback(async (orderId: string): Promise<boolean> => {
        try {
            await api.post(`/orders/${orderId}/cancel`);
            return true;
        } catch (err: any) {
            // Se pedido não encontrado (404), tratar como sucesso - pedido já foi cancelado/expirado
            if (err?.response?.status === 404) {
                return true;
            }

            // Para outros erros, retornar false
            return false;
        }
    }, []);

    // Função helper para gerar número de pedido fake
    const generateFakeOrderNumber = useCallback((): string => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 10 })
            .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
            .join('');
    }, []);

    // Função helper para calcular total do pedido fake
    const calculateFakeOrderTotal = useCallback((cartItems: CheckoutCartItem[]): number => {
        return cartItems.reduce((acc, item) => acc + item.total, 0);
    }, []);

    // Função helper para calcular total de tickets do pedido fake
    const calculateFakeOrderTotalTickets = useCallback((cartItems: CheckoutCartItem[]): number => {
        return cartItems.reduce((acc, item) => acc + item.quantity, 0);
    }, []);

    const createOrder = useCallback(async (
        cartItems: CheckoutCartItem[],
        customerData: { name: string; email: string; cpf: string; phone: string }
    ) => {
        // Validar dados mínimos
        if (cartItems.length === 0) {
            setError('Carrinho vazio');
            return;
        }

        if (!customerData.name || !customerData.email) {
            setError('Preencha nome e email antes de continuar');
            return;
        }

        // Validação extra de CPF e telefone no frontend
        const normalizedCpf = (customerData.cpf || '').replace(/\D/g, '');
        const normalizedPhone = (customerData.phone || '').replace(/\D/g, '');

        if (normalizedCpf && normalizedCpf.length !== 11) {
            setError('Informe um CPF válido com 11 dígitos.');
            return;
        }

        if (normalizedPhone && normalizedPhone.length < 10) {
            setError('Informe um telefone válido com DDD.');
            return;
        }

        // Evitar múltiplas criações simultâneas
        if (creatingRef.current) {
            return;
        }
        
        creatingRef.current = true;

        try {
            setLoading(true);
            setError(null);

            // IMPORTANTE: Se há orderId no storage, verificar se é um pedido real (não fake)
            const existingOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storage.loadOrderId();
            if (existingOrderId && !existingOrderId.startsWith('fake-') && !order) {
                try {
                    const checkResponse = await api.get(`/orders/${existingOrderId}`);
                    const existingOrder = checkResponse.data?.data?.order;
                    
                    if (existingOrder && existingOrder.status === 'pending' && existingOrder.expiresAt) {
                        const hasExpired = isOrderExpired(existingOrder.expiresAt);
                        
                        if (!hasExpired) {
                            // Pedido ainda válido, usar ele
                            setOrder(existingOrder);
                            orderIdRef.current = existingOrder._id;
                            cachedOrderIdFromStorageRef.current = existingOrder._id;
                            storage.saveOrderId(existingOrder._id);
                            setLoading(false);
                            creatingRef.current = false;
                            return;
                        } else {
                            // Pedido expirado, limpar
                            storage.clearOrderRelated();
                            orderIdRef.current = null;
                            cachedOrderIdFromStorageRef.current = null;
                            setOrder(null);
                            setLoading(false);
                            creatingRef.current = false;
                            
                            if (!hasShownExpiredModalRef.current) {
                                setShowExpiredModal(true);
                                hasShownExpiredModalRef.current = true;
                            }
                            return;
                        }
                    }
                } catch (checkErr: any) {
                    // Se pedido não encontrado (404/403), limpar e criar fake
                    if (checkErr?.response?.status === 404 || checkErr?.response?.status === 403) {
                        storage.clearOrderRelated();
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null;
                    }
                }
            }

            // NOVO: Criar pedido "fake" local ao invés de chamar backend
            // O pedido real será criado apenas quando PIX for gerado ou cartão for pago
            const firstItem = cartItems[0];
            if (!firstItem.eventId) {
                throw new Error('Item do carrinho sem eventId');
            }

            const now = Date.now();
            const fakeOrderId = `fake-${now}`;
            const fakeOrderNumber = generateFakeOrderNumber();
            const totalAmount = calculateFakeOrderTotal(cartItems);
            const totalTickets = calculateFakeOrderTotalTickets(cartItems);
            const CHECKOUT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
            const expiresAt = new Date(now + CHECKOUT_TIMEOUT_MS);

            const fakeOrder = {
                _id: fakeOrderId,
                orderNumber: fakeOrderNumber,
                status: 'pending' as const,
                expiresAt: expiresAt.toISOString(),
                totalAmount,
                totalTickets,
                paymentMethod: undefined,
                createdAt: new Date(now).toISOString(),
                discountAmount: 0,
                promoterCode: promoterCode || null,
                customerData: {
                    name: customerData.name,
                    email: customerData.email,
                    cpf: customerData.cpf || undefined,
                    phone: customerData.phone || undefined,
                },
                event: firstItem.eventId,
                isFake: true, // Flag para identificar pedido fake
            };

            // Salvar pedido fake no estado
            setOrder(fakeOrder);
            orderIdRef.current = fakeOrderId;
            cachedOrderIdFromStorageRef.current = fakeOrderId;
            storage.saveOrderId(fakeOrderId);
            
            // Salvar timer para o pedido fake
            storage.saveTimer(now);

            // Desativar loading
            setLoading(false);
        } catch (err: any) {
            const errorMessage = err?.message || 'Erro ao criar pedido fake';
            setError(errorMessage);
        } finally {
            const orderWasCreated = orderIdRef.current || cachedOrderIdFromStorageRef.current;
            if (!orderWasCreated) {
                setLoading(false);
            }
            creatingRef.current = false;
        }
    }, [
        setOrder,
        setLoading,
        setError,
        setShowExpiredModal,
        orderIdRef,
        cachedOrderIdFromStorageRef,
        creatingRef,
        hasShownExpiredModalRef,
        order,
        storage,
        generateFakeOrderNumber,
        calculateFakeOrderTotal,
        calculateFakeOrderTotalTickets,
        promoterCode,
    ]);

    return {
        createOrder,
    };
}


