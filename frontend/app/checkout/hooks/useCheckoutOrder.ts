'use client';

import { useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '@/lib/api';
import type { CheckoutCartItem } from '../types';
import { useCheckoutStorage } from './useCheckoutStorage';
import { useOrderCreation } from './useOrderCreation';
import { useOrderRestoration } from './useOrderRestoration';
import { useRateLimit } from './useRateLimit';
import { useCheckoutNavigation } from './useCheckoutNavigation';

export interface CheckoutOrder {
    _id: string;
    orderNumber: string;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'failed';
    expiresAt?: string | Date;
    totalAmount: number;
    totalTickets: number;
    paymentMethod?: string;
    createdAt?: string | Date;
    discountAmount?: number;
    promoterCode?: string | null;
}

interface UseCheckoutOrderReturn {
    order: CheckoutOrder | null;
    loading: boolean;
    error: string | null;
    createOrder: () => Promise<void>;
    refreshOrder: () => Promise<void>;
    clearOrder: () => void;
    resetRateLimitBlock: () => void;
    rateLimitRemainingSeconds: number | null;
    showRestoreModal: boolean;
    closeRestoreModal: () => void;
    showExpiredModal: boolean;
    closeExpiredModal: () => void;
}

// Estado consolidado do pedido
interface OrderState {
    order: CheckoutOrder | null;
    loading: boolean;
    error: string | null;
    showRestoreModal: boolean;
    showExpiredModal: boolean;
}

// Ações do reducer
type OrderAction =
    | { type: 'SET_ORDER'; payload: CheckoutOrder | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SHOW_RESTORE_MODAL' }
    | { type: 'HIDE_RESTORE_MODAL' }
    | { type: 'SHOW_EXPIRED_MODAL' }
    | { type: 'HIDE_EXPIRED_MODAL' }
    | { type: 'CLEAR_ALL' };

// Reducer para gerenciar estado do pedido
function orderReducer(state: OrderState, action: OrderAction): OrderState {
    switch (action.type) {
        case 'SET_ORDER':
            return { ...state, order: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SHOW_RESTORE_MODAL':
            return { ...state, showRestoreModal: true };
        case 'HIDE_RESTORE_MODAL':
            return { ...state, showRestoreModal: false };
        case 'SHOW_EXPIRED_MODAL':
            return { ...state, showExpiredModal: true };
        case 'HIDE_EXPIRED_MODAL':
            return { ...state, showExpiredModal: false };
        case 'CLEAR_ALL':
            return {
                order: null,
                loading: false,
                error: null,
                showRestoreModal: false,
                showExpiredModal: false,
            };
        default:
            return state;
    }
}

/**
 * Hook para gerenciar pedido no checkout
 * REFATORADO: Usa hooks especializados para criação, restauração e rate limit
 * OTIMIZADO: Usa useReducer para consolidar estados relacionados
 * Reduzido de 943 para ~300 linhas
 */
export function useCheckoutOrder(
    cartItems: CheckoutCartItem[],
    customerData: { name: string; email: string; cpf: string; phone: string },
    promoterCode?: string | null
): UseCheckoutOrderReturn {
    const storage = useCheckoutStorage();
    const navigation = useCheckoutNavigation();
    
    // Estado consolidado usando reducer
    // CRÍTICO: Iniciar com loading: false e usar useEffect para ativar quando necessário
    // Isso evita problemas com hooks condicionais e acessa props corretamente
    const [state, dispatch] = useReducer(orderReducer, {
        order: null,
        loading: false,
        error: null,
        showRestoreModal: false,
        showExpiredModal: false,
    });
    
    // Efeito para ativar loading inicial se necessário (apenas uma vez quando condições são atendidas)
    const hasInitializedLoadingRef = useRef(false);
    useEffect(() => {
        if (hasInitializedLoadingRef.current) return;
        
        // Verificar se já existe pedido no storage
        const savedOrderId = storage.loadOrderId();
        if (savedOrderId) {
            // Se há pedido no storage, não iniciar com loading (será verificado depois)
            hasInitializedLoadingRef.current = true;
            return;
        }
        
        // Verificar condições iniciais
        const hasCartItems = cartItems.length > 0;
        const hasCustomerData = customerData.name && customerData.email;
        
        if (hasCartItems && hasCustomerData) {
            dispatch({ type: 'SET_LOADING', payload: true });
            hasInitializedLoadingRef.current = true;
        }
    }, [cartItems.length, customerData.name, customerData.email, storage]); // Dependências necessárias
    
    // Wrappers para setters (para compatibilidade com hooks que recebem setters)
    const setOrder = useCallback((order: CheckoutOrder | null) => {
        dispatch({ type: 'SET_ORDER', payload: order });
    }, []);
    
    const setLoading = useCallback((loading: boolean) => {
        dispatch({ type: 'SET_LOADING', payload: loading });
    }, []);
    
    const setError = useCallback((error: string | null) => {
        dispatch({ type: 'SET_ERROR', payload: error });
    }, []);
    
    const setShowRestoreModal = useCallback((show: boolean) => {
        dispatch(show ? { type: 'SHOW_RESTORE_MODAL' } : { type: 'HIDE_RESTORE_MODAL' });
    }, []);
    
    const setShowExpiredModal = useCallback((show: boolean) => {
        dispatch(show ? { type: 'SHOW_EXPIRED_MODAL' } : { type: 'HIDE_EXPIRED_MODAL' });
    }, []);
    
    const creatingRef = useRef(false);
    const orderIdRef = useRef<string | null>(null);
    const hasShownModalRef = useRef(false);
    const hasShownExpiredModalRef = useRef(false);
    const lastCancelTimeRef = useRef<number>(0);
    const lastCreateTimeRef = useRef<number>(0);
    const fetchingOrderRef = useRef(false);
    const cachedOrderIdFromStorageRef = useRef<string | null>(null);
    const hasInitializedFromStorageRef = useRef(false);
    const refreshOrderAbortControllerRef = useRef<AbortController | null>(null);
    const createOrderAbortControllerRef = useRef<AbortController | null>(null);

    // Rate limit hook
    const rateLimit = useRateLimit({
        lastCreateTimeRef,
        setError,
    });

    // Order creation hook
    const { createOrder: createOrderInternal } = useOrderCreation({
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
        order: state.order,
        promoterCode,
    });

    // Order restoration hook
    const { refreshOrder: refreshOrderInternal } = useOrderRestoration({
        setOrder,
        setLoading,
        setShowRestoreModal,
        setShowExpiredModal,
        setError,
        orderIdRef,
        cachedOrderIdFromStorageRef,
        fetchingOrderRef,
        refreshOrderAbortControllerRef,
        hasShownModalRef,
        lastCancelTimeRef,
        order: state.order,
    });

    // Função para fechar modal
    const closeRestoreModal = useCallback(() => {
        dispatch({ type: 'HIDE_RESTORE_MODAL' });
    }, []);

    // Função para fechar modal de expiração
    const closeExpiredModal = useCallback(() => {
        dispatch({ type: 'HIDE_EXPIRED_MODAL' });
    }, []);

    // Função para limpar pedido manualmente
    const clearOrder = useCallback(() => {
        const currentOrderId = orderIdRef.current;
        orderIdRef.current = null;
        cachedOrderIdFromStorageRef.current = null;
        storage.clearOrderRelated();
        dispatch({ type: 'CLEAR_ALL' });
        lastCancelTimeRef.current = Date.now();
        creatingRef.current = false;
        hasShownModalRef.current = false;
        hasShownExpiredModalRef.current = false;
    }, [storage]);

    // Função para resetar bloqueio de rate limit
    const resetRateLimitBlock = useCallback(() => {
        rateLimit.resetBlock();
    }, [rateLimit]);

    // Wrapper para createOrder que chama o hook interno
    const createOrder = useCallback(async () => {
        await createOrderInternal(cartItems, customerData);
    }, [createOrderInternal, cartItems, customerData]);

    // Wrapper para refreshOrder que chama o hook interno
    const refreshOrder = useCallback(async () => {
        await refreshOrderInternal();
    }, [refreshOrderInternal]);

    // Inicializar do storage e verificar PIX flag
    useEffect(() => {
        if (hasInitializedFromStorageRef.current) return;
        
        const savedOrderId = storage.loadOrderId();
        cachedOrderIdFromStorageRef.current = savedOrderId;
        
        if (savedOrderId) {
            orderIdRef.current = savedOrderId;
        } else {
            
            // Verificar se há flag de PIX ativo (recarregamento após gerar QR code)
            const pixOrderId = storage.getPixOrderActive();
            if (pixOrderId) {
                
                const checkPixOrder = async () => {
                    try {
                        const ordersResponse = await api.get('/orders', {
                            params: {
                                limit: 1,
                                status: 'pending',
                            },
                        });
                        
                        const pendingOrders = ordersResponse.data?.data?.orders || [];
                        const pendingPixOrder = pendingOrders.find((o: any) => o.paymentMethod === 'pix' && o.status === 'pending');
                        
                        if (pendingPixOrder) {
                            
                            storage.clearPixOrderActive();
                            navigation.allowNavigation();
                            
                            setTimeout(() => {
                                navigation.navigateToDashboard({ useReplace: true });
                            }, 100);
                    } else {
                            storage.clearPixOrderActive();
                        }
                    } catch (err: any) {
                        storage.clearPixOrderActive();
                    }
                };
                
                setTimeout(checkPixOrder, 500);
            }
        }
        
        hasInitializedFromStorageRef.current = true;
    }, [storage, navigation]);

    // Criar pedido automaticamente quando há itens no carrinho e dados do cliente
    useEffect(() => {
        if (state.order && state.order.status === 'pending') {
            return;
        }

        // CRÍTICO: Não verificar state.loading aqui, pois o loading pode estar ativo
        // mas ainda precisamos criar o pedido. Verificar apenas creatingRef para evitar duplicatas
        if (creatingRef.current) {
            return;
        }

        if (state.error) {
            return;
        }

        const timeSinceCancel = Date.now() - lastCancelTimeRef.current;
        if (timeSinceCancel < 2000) {
            return;
        }
        
        if (rateLimit.isBlocked()) {
            return;
        }

        const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storage.loadOrderId();
        if (savedOrderId && !state.order) {
            const savedStartTime = storage.loadTimer();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, 30 * 60 * 1000 - elapsed);
                if (remaining > 0 && cartItems.length > 0) {
                    refreshOrder();
                    return;
                }
            }
            return;
        }

        if (cartItems.length > 0 && customerData.name && customerData.email) {
            const timer = setTimeout(() => {
                // CRÍTICO: Não verificar state.loading aqui também
                // O loading pode estar ativo mas ainda precisamos criar o pedido
                if (!creatingRef.current && (!state.order || state.order.status !== 'pending')) {
                    createOrder();
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [cartItems, customerData, state.order, state.error, createOrder, refreshOrder, storage, rateLimit]);

    // Buscar pedido existente ao montar componente
    useEffect(() => {
        const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
        
        if (savedOrderId && !state.order && !state.loading && !creatingRef.current && hasInitializedFromStorageRef.current) {
            refreshOrder();
        }
    }, [state.order, state.loading, refreshOrder]);

    // Cleanup de AbortControllers ao desmontar
    useEffect(() => {
        return () => {
            if (refreshOrderAbortControllerRef.current) {
                refreshOrderAbortControllerRef.current.abort();
                refreshOrderAbortControllerRef.current = null;
            }
            if (createOrderAbortControllerRef.current) {
                createOrderAbortControllerRef.current.abort();
                createOrderAbortControllerRef.current = null;
            }
        };
    }, []);

    return {
        order: state.order,
        loading: state.loading,
        error: state.error,
        createOrder,
        refreshOrder,
        clearOrder,
        resetRateLimitBlock,
        rateLimitRemainingSeconds: rateLimit.rateLimitRemainingSeconds,
        showRestoreModal: state.showRestoreModal,
        closeRestoreModal,
        showExpiredModal: state.showExpiredModal,
        closeExpiredModal,
    };
}
