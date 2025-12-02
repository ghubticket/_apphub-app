'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import { useCheckoutStorage } from './useCheckoutStorage';
import { useCheckoutNavigation } from './useCheckoutNavigation';
import { isOrderExpired, getRemainingTime, parseExpiresAt } from '../utils/orderHelpers';
import { loadCartItems } from '@/lib/cart';

interface UseOrderRestorationOptions {
    setOrder: (order: any) => void;
    setLoading: (loading: boolean) => void;
    setShowRestoreModal: (show: boolean) => void;
    setShowExpiredModal: (show: boolean) => void;
    setError: (error: string | null) => void;
    orderIdRef: React.MutableRefObject<string | null>;
    cachedOrderIdFromStorageRef: React.MutableRefObject<string | null>;
    fetchingOrderRef: React.MutableRefObject<boolean>;
    refreshOrderAbortControllerRef: React.MutableRefObject<AbortController | null>;
    hasShownModalRef: React.MutableRefObject<boolean>;
    lastCancelTimeRef: React.MutableRefObject<number>;
    order: any | null;
}

interface UseOrderRestorationReturn {
    refreshOrder: () => Promise<void>;
}

/**
 * Hook para extrair lógica de restauração de pedidos
 * Inclui busca do backend, verificação de expiração, tratamento de PIX, modais e erros
 */
export function useOrderRestoration({
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
    order,
}: UseOrderRestorationOptions): UseOrderRestorationReturn {
    const storage = useCheckoutStorage();
    const navigation = useCheckoutNavigation();

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

            // Para outros erros, logar mas ainda assim retornar false
            return false;
        }
    }, []);

    const refreshOrder = useCallback(async () => {
        // OTIMIZADO: Usar cache primeiro, só buscar do storage se necessário
        const orderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storage.loadOrderId();
        if (!orderId) {
            return;
        }

        // NOVO: Detectar pedidos fake e restaurá-los localmente sem buscar no backend
        if (orderId.startsWith('fake-')) {
            
            // Verificar se o timer ainda está válido
            let savedStartTime = storage.loadTimer();
            
            // NOVO: Se timer não foi encontrado, tentar extrair do orderId fake
            // O orderId fake tem formato: fake-{timestamp}
            if (!savedStartTime) {
                const timestampMatch = orderId.match(/^fake-(\d+)$/);
                if (timestampMatch && timestampMatch[1]) {
                    const extractedTimestamp = parseInt(timestampMatch[1], 10);
                    if (!isNaN(extractedTimestamp) && extractedTimestamp > 0) {
                        savedStartTime = extractedTimestamp;
                        // Salvar o timer extraído para futuras restaurações
                        storage.saveTimer(savedStartTime);
                    }
                }
            }
            
            // Se ainda não temos timer válido, limpar tudo
            if (!savedStartTime) {
                orderIdRef.current = null;
                cachedOrderIdFromStorageRef.current = null;
                storage.clearOrderRelated();
                setOrder(null);
                setLoading(false);
                return;
            }
            
            const elapsed = Date.now() - savedStartTime;
            const CHECKOUT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
            const remaining = Math.max(0, CHECKOUT_TIMEOUT_MS - elapsed);
            
            if (remaining <= 0) {
                orderIdRef.current = null;
                cachedOrderIdFromStorageRef.current = null;
                storage.clearOrderRelated();
                setOrder(null);
                setLoading(false);
                return;
            }
            
            // Calcular totalAmount e totalTickets do carrinho atual
            let totalAmount = 0;
            let totalTickets = 0;
            try {
                const cartItems = loadCartItems().filter((item) => item.quantity > 0);
                cartItems.forEach((item) => {
                    const subtotal = item.price * item.quantity;
                    const platformFeeValue = item.platformFeePercentage ? (subtotal * item.platformFeePercentage) / 100 : 0;
                    const fixedFeeValue = item.ticketFee ? item.ticketFee * item.quantity : 0;
                    const itemTotal = subtotal + platformFeeValue + fixedFeeValue;
                    totalAmount += itemTotal;
                    totalTickets += item.quantity;
                });
            } catch (err) {
            }
            
            // Criar pedido fake localmente baseado no timer
            const expiresAt = new Date(savedStartTime + CHECKOUT_TIMEOUT_MS);
            const wasNull = order === null;
            const fakeOrder = {
                _id: orderId,
                orderNumber: orderId.slice(5, 15).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase(), // Gerar número baseado no ID
                status: 'pending' as const,
                expiresAt: expiresAt.toISOString(),
                totalAmount,
                totalTickets,
                paymentMethod: undefined,
                createdAt: new Date(savedStartTime).toISOString(),
                discountAmount: 0,
                promoterCode: null,
                isFake: true, // Flag para identificar pedido fake
            };
            
            
            setOrder(fakeOrder);
            orderIdRef.current = orderId;
            cachedOrderIdFromStorageRef.current = orderId;
            
            // IMPORTANTE: Mostrar modal de restauração se o pedido estava null antes
            if (wasNull && !hasShownModalRef.current) {
                setShowRestoreModal(true);
                hasShownModalRef.current = true;
            }
            
            setLoading(false);
            return; // Não buscar no backend para pedidos fake
        }

        // Evitar múltiplas buscas simultâneas do mesmo pedido
        if (fetchingOrderRef.current) {
            return;
        }
        
        // OTIMIZADO: Cancelar requisição anterior se existir
        if (refreshOrderAbortControllerRef.current) {
            refreshOrderAbortControllerRef.current.abort();
        }
        
        // Criar novo AbortController para esta requisição
        const abortController = new AbortController();
        refreshOrderAbortControllerRef.current = abortController;
        
        fetchingOrderRef.current = true;
        setLoading(true);
        try {
            const response = await api.get(`/orders/${orderId}`, {
                signal: abortController.signal,
            });
            // IMPORTANTE: O backend retorna { success: true, data: order }
            // O pedido está diretamente em response.data.data, não em response.data.data.order
            const orderData = response.data?.data;
            if (orderData) {
                const wasNull = order === null;
                
                // IMPORTANTE: Verificar se pedido PENDING expirou ao carregar a página (F5)
                let hasExpired = false;
                if (orderData.status === 'pending' && orderData.expiresAt) {
                    hasExpired = isOrderExpired(orderData.expiresAt);
                    
                    if (hasExpired) {
                        
                        // Cancelar pedido expirado
                        await cancelOrderInBackend(orderData._id);
                        
                        // Limpar estado
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                        storage.clearOrderRelated();
                        setShowRestoreModal(false);
                        setOrder(null);
                        setError(null);
                        lastCancelTimeRef.current = Date.now();
                        return; // Não continuar processamento
                    } else {
                        const remainingMinutes = Math.floor(getRemainingTime(orderData.expiresAt) / 60000);
                    }
                }
                
                setOrder(orderData);
                orderIdRef.current = orderData._id;
                cachedOrderIdFromStorageRef.current = orderData._id; // OTIMIZADO: Atualizar cache
                storage.saveOrderId(orderData._id);
                
                // IMPORTANTE: Se o pedido tem expiresAt, salvar o timer no localStorage para usar como fallback
                if (orderData.status === 'pending' && orderData.expiresAt) {
                    const remaining = getRemainingTime(orderData.expiresAt);
                    if (remaining > 0) {
                        // Calcular startTime baseado no expiresAt para salvar no localStorage
                        const now = Date.now();
                        const startTime = now - (30 * 60 * 1000 - remaining); // 30 minutos
                        storage.saveTimer(startTime);
                    }
                }
                
                // IMPORTANTE: Se pedido PIX pendente foi restaurado E há flag de PIX ativo,
                // redirecionar para /dashboard (indica recarregamento após gerar QR code)
                // Se não houver flag, significa que usuário voltou ao carrinho normalmente e pode criar novo pedido
                if (wasNull && orderData.status === 'pending' && orderData.paymentMethod === 'pix' && !hasExpired) {
                    const hasPixActiveFlag = storage.getPixOrderActive();
                    
                    if (hasPixActiveFlag) {
                        
                        // Limpar flags
                        storage.clearPixOrderActive();
                        navigation.allowNavigation();
                        
                        // Redirecionar para dashboard
                        setTimeout(() => {
                            navigation.navigateToDashboard({ useReplace: true });
                        }, 100);
                        
                        // Não mostrar modal e não continuar processamento
                        setShowRestoreModal(false);
                        hasShownModalRef.current = true;
                        return;
                    } else {
                        // Usuário voltou ao carrinho normalmente, limpar pedido PIX para permitir novo pedido
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null;
                        storage.clearOrderRelated();
                        setOrder(null);
                        setShowRestoreModal(false);
                        // Continuar para criar novo pedido
                    }
                }
                
                // Mostrar modal se pedido foi restaurado (estava null e agora tem pedido PENDING válido)
                // Mas apenas se NÃO for PIX (pedidos PIX são redirecionados acima)
                if (wasNull && orderData.status === 'pending' && !hasExpired && !hasShownModalRef.current && orderData.paymentMethod !== 'pix') {
                    setShowRestoreModal(true);
                    hasShownModalRef.current = true;
                }
                
                // Se pedido foi cancelado ou pago, limpar
                if (orderData.status === 'cancelled' || orderData.status === 'paid' || orderData.status === 'failed') {
                    orderIdRef.current = null;
                    cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                    storage.clearOrderRelated();
                    setShowRestoreModal(false);
                    setOrder(null);
                    setError(null); // Limpar erro também
                    if (orderData.status === 'cancelled') {
                        lastCancelTimeRef.current = Date.now(); // Registrar tempo do cancelamento
                    }
                }
            } else {
            }
            setLoading(false);
            fetchingOrderRef.current = false;
            refreshOrderAbortControllerRef.current = null; // Limpar AbortController após sucesso
        } catch (err: any) {
            setLoading(false);
            fetchingOrderRef.current = false;
            
            // OTIMIZADO: Ignorar erros de cancelamento intencional
            if (err.name === 'AbortError' || err.name === 'CanceledError' || (err.code === 'ERR_CANCELED')) {
                return;
            }
            
            const status = err?.response?.status;
            const errorMessage = err?.response?.data?.message || err?.message;
            
            // Se pedido não encontrado, cancelado ou sem permissão
            if (status === 404 || status === 400 || status === 403) {
                // Logs específicos por tipo de erro
                if (status === 403) {
                } else if (status === 404) {
                } else if (status === 400) {
                }
                
                // IMPORTANTE: Se for 403, verificar se o timer ainda está válido antes de limpar
                // Se o timer ainda não expirou, pode ser erro temporário de permissão
                // Nesse caso, manter o orderId no storage para tentar novamente depois
                // Mas se for 404 ou 400, o pedido realmente não existe mais
                if (status === 403) {
                    // Verificar se o timer ainda está válido (usando localStorage)
                    const savedStartTime = storage.loadTimer();
                    let timerStillValid = false;
                    
                    if (savedStartTime) {
                        const elapsed = Date.now() - savedStartTime;
                        const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
                        timerStillValid = remaining > 0;
                        
                    } else {
                    }
                    
                    // Se o timer ainda está válido, pode ser erro temporário de permissão
                    // Manter o orderId no storage para tentar novamente quando necessário
                    if (timerStillValid) {
                        // Não limpar o orderId nem o timer, apenas limpar o estado do pedido
                        // O pedido será buscado novamente quando:
                        // 1. O usuário adicionar itens ao carrinho (lógica já existe no useEffect de criação)
                        // 2. O componente re-renderizar e detectar que há orderId mas não há pedido carregado
                        // Não precisamos fazer retry automático aqui, pois pode causar loops desnecessários
                        setOrder(null);
                        setShowRestoreModal(false);
                        setShowExpiredModal(false);
                        setError(null);
                        return; // Não limpar orderId nem timer
                    } else {
                    }
                }
                
                // Para 404, 400 ou 403 com timer expirado: limpar tudo
                orderIdRef.current = null;
                cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                storage.clearOrderRelated();
                setOrder(null);
                setShowRestoreModal(false);
                setShowExpiredModal(false);
                setError(null);
            } else {
            }
        }
    }, [
        order,
        orderIdRef,
        cachedOrderIdFromStorageRef,
        fetchingOrderRef,
        refreshOrderAbortControllerRef,
        hasShownModalRef,
        lastCancelTimeRef,
        setOrder,
        setLoading,
        setShowRestoreModal,
        setShowExpiredModal,
        setError,
        storage,
        navigation,
        cancelOrderInBackend,
    ]);

    return {
        refreshOrder,
    };
}

