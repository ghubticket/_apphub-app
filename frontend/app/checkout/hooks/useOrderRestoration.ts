'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import { useCheckoutStorage } from './useCheckoutStorage';
import { useCheckoutNavigation } from './useCheckoutNavigation';
import { isOrderExpired, getRemainingTime, parseExpiresAt } from '../utils/orderHelpers';

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
            console.log('[useOrderRestoration] 🗑️ Cancelando pedido no backend:', orderId);
            await api.post(`/orders/${orderId}/cancel`);
            console.log('[useOrderRestoration] ✅ Pedido cancelado com sucesso no backend');
            return true;
        } catch (err: any) {
            // Se pedido não encontrado (404), tratar como sucesso - pedido já foi cancelado/expirado
            if (err?.response?.status === 404) {
                console.log('[useOrderRestoration] ⚠️ Pedido já não existe (404), tratando como sucesso:', orderId);
                return true;
            }

            // Para outros erros, logar mas ainda assim retornar false
            console.error('[useOrderRestoration] ❌ Erro ao cancelar pedido no backend:', err);
            return false;
        }
    }, []);

    const refreshOrder = useCallback(async () => {
        // OTIMIZADO: Usar cache primeiro, só buscar do storage se necessário
        const orderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storage.loadOrderId();
        if (!orderId) {
            console.log('[useOrderRestoration] ⚠️ refreshOrder chamado mas não há orderId');
            return;
        }

        // Evitar múltiplas buscas simultâneas do mesmo pedido
        if (fetchingOrderRef.current) {
            console.log('[useOrderRestoration] ⏸️ Já está buscando pedido, ignorando chamada duplicada');
            return;
        }
        
        // OTIMIZADO: Cancelar requisição anterior se existir
        if (refreshOrderAbortControllerRef.current) {
            console.log('[useOrderRestoration] 🛑 Cancelando requisição anterior de refreshOrder');
            refreshOrderAbortControllerRef.current.abort();
        }
        
        // Criar novo AbortController para esta requisição
        const abortController = new AbortController();
        refreshOrderAbortControllerRef.current = abortController;
        
        console.log('[useOrderRestoration] 🔍 Buscando pedido:', orderId);
        fetchingOrderRef.current = true;
        setLoading(true);
        try {
            const response = await api.get(`/orders/${orderId}`, {
                signal: abortController.signal,
            });
            console.log('[useOrderRestoration] 📡 Resposta recebida do backend:', {
                status: response.status,
                hasData: !!response.data,
                hasDataData: !!response.data?.data,
                responseStructure: {
                    success: response.data?.success,
                    hasData: !!response.data?.data,
                    dataType: typeof response.data?.data,
                },
            });
            // IMPORTANTE: O backend retorna { success: true, data: order }
            // O pedido está diretamente em response.data.data, não em response.data.data.order
            const orderData = response.data?.data;
            if (orderData) {
                const wasNull = order === null;
                console.log('[useOrderRestoration] ✅ Pedido encontrado:', {
                    orderId: orderData._id,
                    orderNumber: orderData.orderNumber,
                    status: orderData.status,
                    expiresAt: orderData.expiresAt,
                    wasNull,
                });
                
                // IMPORTANTE: Verificar se pedido PENDING expirou ao carregar a página (F5)
                let hasExpired = false;
                if (orderData.status === 'pending' && orderData.expiresAt) {
                    hasExpired = isOrderExpired(orderData.expiresAt);
                    
                    if (hasExpired) {
                        console.log('[useOrderRestoration] ⏰ Pedido PENDING expirado ao carregar, cancelando:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            now: new Date().toISOString(),
                        });
                        
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
                        console.log('[useOrderRestoration] ✅ Pedido PENDING ainda válido, mantendo:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            remainingMinutes,
                        });
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
                        console.log('[useOrderRestoration] 💾 Timer salvo no localStorage baseado no expiresAt do pedido:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            startTime: new Date(startTime).toISOString(),
                            remainingMinutes: Math.floor(remaining / 60000),
                        });
                    }
                }
                
                // IMPORTANTE: Se pedido PIX pendente foi restaurado E há flag de PIX ativo,
                // redirecionar para /dashboard (indica recarregamento após gerar QR code)
                // Se não houver flag, significa que usuário voltou ao carrinho normalmente e pode criar novo pedido
                if (wasNull && orderData.status === 'pending' && orderData.paymentMethod === 'pix' && !hasExpired) {
                    const hasPixActiveFlag = storage.getPixOrderActive();
                    
                    if (hasPixActiveFlag) {
                        console.log('[useOrderRestoration] ⚠️ Pedido PIX pendente restaurado após recarregar, redirecionando para /dashboard:', {
                            orderId: orderData._id,
                            orderNumber: orderData.orderNumber,
                        });
                        
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
                        console.log('[useOrderRestoration] 🧹 Pedido PIX pendente encontrado mas usuário voltou ao carrinho normalmente, limpando para permitir novo pedido');
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
                    console.log('[useOrderRestoration] 🔔 Mostrando modal de restauração');
                    setShowRestoreModal(true);
                    hasShownModalRef.current = true;
                }
                
                // Se pedido foi cancelado ou pago, limpar
                if (orderData.status === 'cancelled' || orderData.status === 'paid' || orderData.status === 'failed') {
                    console.log('[useOrderRestoration] 🗑️ Pedido finalizado, limpando estado:', orderData.status);
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
                console.log('[useOrderRestoration] ⚠️ Resposta do backend não contém dados do pedido:', {
                    hasResponse: !!response,
                    hasData: !!response?.data,
                    hasDataData: !!response?.data?.data,
                    success: response?.data?.success,
                    responseData: response?.data,
                });
            }
            setLoading(false);
            fetchingOrderRef.current = false;
            refreshOrderAbortControllerRef.current = null; // Limpar AbortController após sucesso
        } catch (err: any) {
            setLoading(false);
            fetchingOrderRef.current = false;
            
            // OTIMIZADO: Ignorar erros de cancelamento intencional
            if (err.name === 'AbortError' || err.name === 'CanceledError' || (err.code === 'ERR_CANCELED')) {
                console.log('[useOrderRestoration] ⏸️ Requisição cancelada intencionalmente');
                return;
            }
            
            const status = err?.response?.status;
            const errorMessage = err?.response?.data?.message || err?.message;
            
            // Se pedido não encontrado, cancelado ou sem permissão
            if (status === 404 || status === 400 || status === 403) {
                // Logs específicos por tipo de erro
                if (status === 403) {
                    console.log('[useOrderRestoration] 🔒 Erro 403 - Acesso negado ao pedido:', {
                        orderId,
                        message: errorMessage,
                        reason: 'O usuário atual não é o dono do pedido ou não está autenticado corretamente',
                        note: 'Pode ser erro temporário de autenticação ou pedido pertence a outro usuário',
                    });
                } else if (status === 404) {
                    console.log('[useOrderRestoration] ❌ Erro 404 - Pedido não encontrado:', {
                        orderId,
                        message: errorMessage,
                        reason: 'O pedido não existe mais ou foi deletado',
                    });
                } else if (status === 400) {
                    console.log('[useOrderRestoration] ⚠️ Erro 400 - Requisição inválida:', {
                        orderId,
                        message: errorMessage,
                        reason: 'Dados inválidos ou pedido em estado inválido',
                    });
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
                        
                        console.log('[useOrderRestoration] 🔍 Verificando timer do localStorage:', {
                            savedStartTime: new Date(savedStartTime).toISOString(),
                            elapsed: Math.floor(elapsed / 1000),
                            remaining: Math.floor(remaining / 1000),
                            remainingMinutes: Math.floor(remaining / 60000),
                            timerStillValid,
                        });
                    } else {
                        console.log('[useOrderRestoration] ⚠️ Não há timer salvo no localStorage');
                    }
                    
                    // Se o timer ainda está válido, pode ser erro temporário de permissão
                    // Manter o orderId no storage para tentar novamente quando necessário
                    if (timerStillValid) {
                        console.log('[useOrderRestoration] ⏸️ Erro 403 mas timer ainda válido, mantendo orderId para retry:', {
                            orderId,
                            remainingMinutes: Math.floor((30 * 60 * 1000 - (Date.now() - savedStartTime!)) / 60000),
                        });
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
                        console.log('[useOrderRestoration] ⏰ Timer expirado ou não encontrado, limpando pedido');
                    }
                }
                
                // Para 404, 400 ou 403 com timer expirado: limpar tudo
                console.log('[useOrderRestoration] 🗑️ Limpando pedido (não encontrado/inválido ou timer expirado)');
                orderIdRef.current = null;
                cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                storage.clearOrderRelated();
                setOrder(null);
                setShowRestoreModal(false);
                setShowExpiredModal(false);
                setError(null);
            } else {
                console.error('[useOrderRestoration] ❌ Erro ao buscar pedido:', err);
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

