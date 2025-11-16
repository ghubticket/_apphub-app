'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { CheckoutCartItem } from '../types';
import { storageHelpers } from '../utils/storageHelpers';
import { isOrderExpired, getRemainingTime, parseExpiresAt } from '../utils/orderHelpers';

export interface CheckoutOrder {
    _id: string;
    orderNumber: string;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'failed';
    expiresAt?: string | Date;
    totalAmount: number;
    totalTickets: number;
    paymentMethod?: string;
    createdAt?: string | Date;
}

interface UseCheckoutOrderReturn {
    order: CheckoutOrder | null;
    loading: boolean;
    error: string | null;
    createOrder: () => Promise<void>;
    refreshOrder: () => Promise<void>;
    clearOrder: () => void; // Limpar pedido manualmente (quando cancelado externamente)
    showRestoreModal: boolean; // Mostrar modal quando pedido é restaurado
    closeRestoreModal: () => void; // Fechar modal manualmente
    showExpiredModal: boolean; // Mostrar modal quando pedido expirou
    closeExpiredModal: () => void; // Fechar modal de expiração
}

/**
 * Hook para gerenciar pedido no checkout
 * REFATORADO: Cria pedido PENDING imediatamente ao entrar no checkout
 * O pedido funciona como reserva de ingressos
 */
export function useCheckoutOrder(
    cartItems: CheckoutCartItem[],
    customerData: { name: string; email: string; cpf: string; phone: string }
): UseCheckoutOrderReturn {
    const router = useRouter();
    const [order, setOrder] = useState<CheckoutOrder | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const creatingRef = useRef(false);
    const orderIdRef = useRef<string | null>(null);
    const hasShownModalRef = useRef(false); // Evitar mostrar modal múltiplas vezes
    const hasShownExpiredModalRef = useRef(false); // Evitar mostrar modal de expiração múltiplas vezes
    const lastCancelTimeRef = useRef<number>(0); // Timestamp do último cancelamento
    const fetchingOrderRef = useRef(false); // Evitar múltiplas buscas simultâneas do mesmo pedido
    const cachedOrderIdFromStorageRef = useRef<string | null>(null); // OTIMIZADO: Cache do orderId do storage
    const hasInitializedFromStorageRef = useRef(false); // OTIMIZADO: Flag para evitar múltiplas inicializações
    
    // Função para fechar modal (exposta via callback)
    const closeRestoreModal = useCallback(() => {
        setShowRestoreModal(false);
    }, []);

    // Função para fechar modal de expiração
    const closeExpiredModal = useCallback(() => {
        setShowExpiredModal(false);
    }, []);

    // Função para limpar pedido manualmente (quando cancelado externamente)
    // CORRIGIDO: Removida dependência de 'order' - usa apenas orderIdRef
    const clearOrder = useCallback(() => {
        const currentOrderId = orderIdRef.current;
        console.log('[useCheckoutOrder] 🧹 Limpando pedido manualmente:', {
            orderId: currentOrderId,
        });
        orderIdRef.current = null;
        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
        storageHelpers.clearActiveOrderId();
        storageHelpers.clearTimerStartTime(); // Limpar timer também
        setOrder(null);
        setError(null);
        setShowRestoreModal(false);
        setShowExpiredModal(false);
        lastCancelTimeRef.current = Date.now(); // Registrar tempo do cancelamento
        creatingRef.current = false; // Resetar flag de criação
        hasShownModalRef.current = false; // Resetar flag do modal também
        hasShownExpiredModalRef.current = false; // Resetar flag do modal de expiração
    }, []); // Sem dependências - usa apenas refs e setters estáveis

    // OTIMIZADO: Carregar orderId salvo do storage apenas uma vez ao montar
    useEffect(() => {
        if (hasInitializedFromStorageRef.current) return; // Evitar múltiplas inicializações
        
        const savedOrderId = storageHelpers.loadActiveOrderId();
        cachedOrderIdFromStorageRef.current = savedOrderId; // Cache do valor
        
        if (savedOrderId) {
            orderIdRef.current = savedOrderId;
            console.log('[useCheckoutOrder] 🔄 OrderId restaurado do storage:', savedOrderId);
        } else {
            console.log('[useCheckoutOrder] ℹ️ Nenhum OrderId encontrado no storage');
        }
        
        hasInitializedFromStorageRef.current = true;
    }, []);

    // Buscar pedido existente
    const refreshOrder = useCallback(async () => {
        // OTIMIZADO: Usar cache primeiro, só buscar do storage se necessário
        const orderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storageHelpers.loadActiveOrderId();
        if (!orderId) {
            console.log('[useCheckoutOrder] ⚠️ refreshOrder chamado mas não há orderId');
            return;
        }

        // Evitar múltiplas buscas simultâneas do mesmo pedido
        if (fetchingOrderRef.current) {
            console.log('[useCheckoutOrder] ⏸️ Já está buscando pedido, ignorando chamada duplicada');
            return;
        }
        
        console.log('[useCheckoutOrder] 🔍 Buscando pedido:', orderId);
        fetchingOrderRef.current = true;
        setLoading(true);
        try {
            const response = await api.get(`/orders/${orderId}`);
            console.log('[useCheckoutOrder] 📡 Resposta recebida do backend:', {
                status: response.status,
                hasData: !!response.data,
                hasDataData: !!response.data?.data,
                // O backend retorna { success: true, data: order } - o pedido está diretamente em data, não em data.order
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
                console.log('[useCheckoutOrder] ✅ Pedido encontrado:', {
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
                        console.log('[useCheckoutOrder] ⏰ Pedido PENDING expirado ao carregar, cancelando:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            now: new Date().toISOString(),
                        });
                        
                        // Cancelar pedido expirado
                        try {
                            await api.post(`/orders/${orderData._id}/cancel`);
                            console.log('[useCheckoutOrder] ✅ Pedido expirado cancelado com sucesso');
                        } catch (cancelErr: any) {
                            // Se já foi cancelado (404), tudo bem
                            if (cancelErr?.response?.status !== 404) {
                                console.error('[useCheckoutOrder] ❌ Erro ao cancelar pedido expirado:', cancelErr);
                            }
                        }
                        
                        // Limpar estado
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                        storageHelpers.clearActiveOrderId();
                        storageHelpers.clearTimerStartTime();
                        setShowRestoreModal(false);
                        setOrder(null);
                        setError(null);
                        lastCancelTimeRef.current = Date.now();
                        return; // Não continuar processamento
                    } else {
                        const remainingMinutes = Math.floor(getRemainingTime(orderData.expiresAt) / 60000);
                        console.log('[useCheckoutOrder] ✅ Pedido PENDING ainda válido, mantendo:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            remainingMinutes,
                        });
                    }
                }
                
                setOrder(orderData);
                orderIdRef.current = orderData._id;
                cachedOrderIdFromStorageRef.current = orderData._id; // OTIMIZADO: Atualizar cache
                storageHelpers.saveActiveOrderId(orderData._id);
                
                // IMPORTANTE: Se o pedido tem expiresAt, salvar o timer no localStorage para usar como fallback
                if (orderData.status === 'pending' && orderData.expiresAt) {
                    const remaining = getRemainingTime(orderData.expiresAt);
                    if (remaining > 0) {
                        // Calcular startTime baseado no expiresAt para salvar no localStorage
                        const now = Date.now();
                        const startTime = now - (30 * 60 * 1000 - remaining); // 30 minutos
                        storageHelpers.saveTimerStartTime(startTime);
                        console.log('[useCheckoutOrder] 💾 Timer salvo no localStorage baseado no expiresAt do pedido:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            startTime: new Date(startTime).toISOString(),
                            remainingMinutes: Math.floor(remaining / 60000),
                        });
                    }
                }
                
                // Mostrar modal se pedido foi restaurado (estava null e agora tem pedido PENDING válido)
                if (wasNull && orderData.status === 'pending' && !hasExpired && !hasShownModalRef.current) {
                    console.log('[useCheckoutOrder] 🔔 Mostrando modal de restauração');
                    setShowRestoreModal(true);
                    hasShownModalRef.current = true;
                }
                
                // Se pedido foi cancelado ou pago, limpar
                if (orderData.status === 'cancelled' || orderData.status === 'paid' || orderData.status === 'failed') {
                    console.log('[useCheckoutOrder] 🗑️ Pedido finalizado, limpando estado:', orderData.status);
                    orderIdRef.current = null;
                    cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                    storageHelpers.clearActiveOrderId();
                    setShowRestoreModal(false);
                    setOrder(null);
                    setError(null); // Limpar erro também
                    if (orderData.status === 'cancelled') {
                        lastCancelTimeRef.current = Date.now(); // Registrar tempo do cancelamento
                    }
                }
            } else {
                console.log('[useCheckoutOrder] ⚠️ Resposta do backend não contém dados do pedido:', {
                    hasResponse: !!response,
                    hasData: !!response?.data,
                    hasDataData: !!response?.data?.data,
                    success: response?.data?.success,
                    responseData: response?.data,
                });
            }
            setLoading(false);
            fetchingOrderRef.current = false;
        } catch (err: any) {
            setLoading(false);
            fetchingOrderRef.current = false;
            const status = err?.response?.status;
            const errorMessage = err?.response?.data?.message || err?.message;
            
            // Se pedido não encontrado, cancelado ou sem permissão
            if (status === 404 || status === 400 || status === 403) {
                // Logs específicos por tipo de erro
                if (status === 403) {
                    console.log('[useCheckoutOrder] 🔒 Erro 403 - Acesso negado ao pedido:', {
                        orderId,
                        message: errorMessage,
                        reason: 'O usuário atual não é o dono do pedido ou não está autenticado corretamente',
                        note: 'Pode ser erro temporário de autenticação ou pedido pertence a outro usuário',
                    });
                } else if (status === 404) {
                    console.log('[useCheckoutOrder] ❌ Erro 404 - Pedido não encontrado:', {
                        orderId,
                        message: errorMessage,
                        reason: 'O pedido não existe mais ou foi deletado',
                    });
                } else if (status === 400) {
                    console.log('[useCheckoutOrder] ⚠️ Erro 400 - Requisição inválida:', {
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
                    const savedStartTime = storageHelpers.loadTimerStartTime();
                    let timerStillValid = false;
                    
                    if (savedStartTime) {
                        const elapsed = Date.now() - savedStartTime;
                        const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
                        timerStillValid = remaining > 0;
                        
                        console.log('[useCheckoutOrder] 🔍 Verificando timer do localStorage:', {
                            savedStartTime: new Date(savedStartTime).toISOString(),
                            elapsed: Math.floor(elapsed / 1000),
                            remaining: Math.floor(remaining / 1000),
                            remainingMinutes: Math.floor(remaining / 60000),
                            timerStillValid,
                        });
                    } else {
                        console.log('[useCheckoutOrder] ⚠️ Não há timer salvo no localStorage');
                    }
                    
                    // Se o timer ainda está válido, pode ser erro temporário de permissão
                    // Manter o orderId no storage para tentar novamente quando necessário
                    if (timerStillValid) {
                        console.log('[useCheckoutOrder] ⏸️ Erro 403 mas timer ainda válido, mantendo orderId para retry:', {
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
                        console.log('[useCheckoutOrder] ⏰ Timer expirado ou não encontrado, limpando pedido');
                    }
                }
                
                // Para 404, 400 ou 403 com timer expirado: limpar tudo
                console.log('[useCheckoutOrder] 🗑️ Limpando pedido (não encontrado/inválido ou timer expirado)');
                orderIdRef.current = null;
                cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                storageHelpers.clearActiveOrderId();
                storageHelpers.clearTimerStartTime(); // Limpar timer
                setOrder(null);
                setShowRestoreModal(false);
                setShowExpiredModal(false);
                setError(null);
            } else {
                console.error('[useCheckoutOrder] ❌ Erro ao buscar pedido:', err);
            }
        }
    }, [order]);

    // Criar pedido a partir do carrinho
    const createOrder = useCallback(async () => {
        // Validar dados mínimos
        if (cartItems.length === 0) {
            setError('Carrinho vazio');
            return;
        }

        if (!customerData.name || !customerData.email) {
            setError('Preencha nome e email antes de continuar');
            return;
        }

        // Evitar múltiplas criações simultâneas
        if (creatingRef.current) {
            console.log('[useCheckoutOrder] ⏸️ Já está criando pedido, ignorando chamada duplicada');
            return;
        }
        creatingRef.current = true;

        try {
            setLoading(true);
            setError(null);

            // IMPORTANTE: Se há orderId no storage, primeiro verificar se o pedido ainda é válido
            // OTIMIZADO: Usar cache primeiro
            const existingOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storageHelpers.loadActiveOrderId();
            if (existingOrderId && !order) {
                console.log('[useCheckoutOrder] 🔍 Encontrado orderId no storage antes de criar, verificando se pedido ainda é válido:', existingOrderId);
                try {
                    const checkResponse = await api.get(`/orders/${existingOrderId}`);
                    const existingOrder = checkResponse.data?.data?.order;
                    
                    if (existingOrder && existingOrder.status === 'pending' && existingOrder.expiresAt) {
                        const hasExpired = isOrderExpired(existingOrder.expiresAt);
                        
                        if (!hasExpired) {
                            // Pedido ainda válido, usar ele ao invés de criar novo
                            const remainingMinutes = Math.floor(getRemainingTime(existingOrder.expiresAt) / 60000);
                            console.log('[useCheckoutOrder] ✅ Pedido existente ainda válido, usando ao invés de criar novo:', {
                                orderId: existingOrder._id,
                                remainingMinutes,
                            });
                            setOrder(existingOrder);
                            orderIdRef.current = existingOrder._id;
                            cachedOrderIdFromStorageRef.current = existingOrder._id; // OTIMIZADO: Atualizar cache
                            storageHelpers.saveActiveOrderId(existingOrder._id);
                            setLoading(false);
                            creatingRef.current = false;
                            return; // Não criar novo pedido
                        } else {
                            // Pedido expirado, cancelar, limpar e mostrar modal
                            console.log('[useCheckoutOrder] ⏰ Pedido existente expirado, cancelando e limpando:', existingOrderId);
                            try {
                                await api.post(`/orders/${existingOrderId}/cancel`);
                                console.log('[useCheckoutOrder] ✅ Pedido expirado cancelado com sucesso');
                            } catch (cancelErr: any) {
                                // Ignorar erro 404 (já foi cancelado)
                                if (cancelErr?.response?.status !== 404) {
                                    console.error('[useCheckoutOrder] ❌ Erro ao cancelar pedido expirado:', cancelErr);
                                }
                            }
                            
                            // Limpar estado
                            storageHelpers.clearActiveOrderId();
                            storageHelpers.clearTimerStartTime();
                            orderIdRef.current = null;
                            cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                            setOrder(null);
                            setLoading(false);
                            creatingRef.current = false;
                            
                            // Mostrar modal de expiração
                            // O carrinho será limpo no componente que usa o hook (CheckoutLayout)
                            if (!hasShownExpiredModalRef.current) {
                                console.log('[useCheckoutOrder] 🔔 Mostrando modal de pedido expirado');
                                setShowExpiredModal(true);
                                hasShownExpiredModalRef.current = true;
                            }
                            
                            return; // Não criar novo pedido automaticamente
                        }
                    } else {
                        // Pedido não é PENDING ou não tem expiresAt, limpar
                        console.log('[useCheckoutOrder] 🗑️ Pedido existente não é válido (status:', existingOrder?.status, '), limpando');
                        storageHelpers.clearActiveOrderId();
                        storageHelpers.clearTimerStartTime();
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                    }
                } catch (checkErr: any) {
                    // Se pedido não encontrado (404/403), limpar e criar novo
                    if (checkErr?.response?.status === 404 || checkErr?.response?.status === 403) {
                        console.log('[useCheckoutOrder] ⚠️ Pedido existente não encontrado ou sem acesso, limpando e criando novo');
                        storageHelpers.clearActiveOrderId();
                        storageHelpers.clearTimerStartTime();
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                    } else {
                        // Outro erro, logar mas continuar tentando criar
                        console.error('[useCheckoutOrder] ❌ Erro ao verificar pedido existente:', checkErr);
                    }
                }
            }

            // O backend agrupa automaticamente itens do mesmo evento em um único pedido
            // Criar pedido com o primeiro item - o backend vai adicionar outros itens ao mesmo pedido
            // se forem do mesmo evento/cliente
            const firstItem = cartItems[0];

            if (!firstItem.eventId) {
                throw new Error('Item do carrinho sem eventId');
            }

            const orderPayload = {
                eventId: firstItem.eventId,
                ticketTypeId: firstItem.id,
                quantity: firstItem.quantity,
                customerData: {
                    name: customerData.name,
                    email: customerData.email,
                    cpf: customerData.cpf || undefined,
                    phone: customerData.phone || undefined,
                },
            };

            console.log('[useCheckoutOrder] 🚀 Criando novo pedido no backend:', {
                eventId: orderPayload.eventId,
                ticketTypeId: orderPayload.ticketTypeId,
                quantity: orderPayload.quantity,
                customerEmail: orderPayload.customerData.email,
            });

            const response = await api.post('/orders', orderPayload);
            const orderData = response.data?.data?.order;

            if (orderData) {
                console.log('[useCheckoutOrder] ✅ Pedido criado com sucesso:', {
                    orderId: orderData._id,
                    orderNumber: orderData.orderNumber,
                    status: orderData.status,
                    expiresAt: orderData.expiresAt,
                    totalAmount: orderData.totalAmount,
                    totalTickets: orderData.totalTickets,
                });
                setOrder(orderData);
                orderIdRef.current = orderData._id;
                cachedOrderIdFromStorageRef.current = orderData._id; // OTIMIZADO: Atualizar cache
                storageHelpers.saveActiveOrderId(orderData._id);
                
                // IMPORTANTE: Se o pedido tem expiresAt, salvar o timer no localStorage para usar como fallback
                if (orderData.status === 'pending' && orderData.expiresAt) {
                    const remaining = getRemainingTime(orderData.expiresAt);
                    if (remaining > 0) {
                        // Calcular startTime baseado no expiresAt para salvar no localStorage
                        const now = Date.now();
                        const startTime = now - (30 * 60 * 1000 - remaining); // 30 minutos
                        storageHelpers.saveTimerStartTime(startTime);
                        console.log('[useCheckoutOrder] 💾 Timer salvo no localStorage baseado no expiresAt do pedido criado:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            startTime: new Date(startTime).toISOString(),
                            remainingMinutes: Math.floor(remaining / 60000),
                        });
                    }
                } else {
                    // Limpar timer antigo do localStorage se pedido não tem expiresAt
                    storageHelpers.clearTimerStartTime();
                    console.log('[useCheckoutOrder] 🧹 Timer antigo do localStorage limpo (novo pedido criado sem expiresAt)');
                }
            }
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || err?.message || 'Erro ao criar pedido';
            setError(errorMessage);
            console.error('[useCheckoutOrder] ❌ Erro ao criar pedido:', err);
            
            // Se erro 400 ou 404, pode ser que pedido já foi cancelado - limpar storage
            if (err?.response?.status === 400 || err?.response?.status === 404) {
                // OTIMIZADO: Usar cache primeiro
                const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
                if (savedOrderId) {
                    orderIdRef.current = null;
                    cachedOrderIdFromStorageRef.current = null; // Limpar cache também
                    storageHelpers.clearActiveOrderId();
                    setOrder(null);
                }
            }
        } finally {
            setLoading(false);
            creatingRef.current = false;
        }
    }, [cartItems, customerData]);

    // OTIMIZADO: Criar pedido automaticamente quando há itens no carrinho e dados do cliente
    // Consolidado para reduzir verificações duplicadas
    useEffect(() => {
        // Early returns para evitar processamento desnecessário
        if (order && order.status === 'pending') {
            return; // Já tem pedido PENDING
        }

        if (loading || creatingRef.current) {
            return; // Está carregando ou criando
        }

        if (error) {
            return; // Tem erro
        }

        // Não criar se acabou de cancelar um pedido (evitar criar imediatamente após cancelamento)
        const timeSinceCancel = Date.now() - lastCancelTimeRef.current;
        if (timeSinceCancel < 2000) {
            return; // Cancelamento recente
        }

        // OTIMIZADO: Usar cache primeiro, só buscar do storage se necessário
        const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
        if (savedOrderId && !order) {
            // Tem orderId mas não tem order ainda - pode estar carregando ou retornou 403
            // Verificar se timer ainda está válido e tentar buscar novamente
            const savedStartTime = storageHelpers.loadTimerStartTime();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, 30 * 60 * 1000 - elapsed);
                if (remaining > 0 && cartItems.length > 0) {
                    // Timer ainda válido e tem itens no carrinho, tentar buscar pedido novamente
                    refreshOrder();
                    return; // Não criar novo enquanto tenta buscar
                }
            }
            return; // Tem orderId mas pedido não carregado ainda
        }

        // Criar se tem itens no carrinho e dados mínimos do cliente
        if (cartItems.length > 0 && customerData.name && customerData.email) {
            // Pequeno delay para evitar múltiplas chamadas
            const timer = setTimeout(() => {
                // Verificar novamente antes de criar (pode ter mudado durante o delay)
                if (!creatingRef.current && !loading && (!order || order.status !== 'pending')) {
                    createOrder();
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [cartItems, customerData, order, loading, error, createOrder, refreshOrder]);

    // OTIMIZADO: Buscar pedido existente ao montar componente
    // Consolidado com a inicialização para evitar verificações duplicadas
    useEffect(() => {
        // OTIMIZADO: Usar cache primeiro
        const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
        
        // IMPORTANTE: Só buscar se:
        // 1. Tem orderId no storage
        // 2. Não tem order carregado ainda
        // 3. Não está carregando
        // 4. Não está criando
        // 5. Já inicializou do storage (evitar buscar antes de inicializar)
        if (savedOrderId && !order && !loading && !creatingRef.current && hasInitializedFromStorageRef.current) {
            refreshOrder();
        }
    }, [order, loading, refreshOrder]); // OTIMIZADO: refreshOrder estável via useCallback

    return {
        order,
        loading,
        error,
        createOrder,
        refreshOrder,
        clearOrder,
        showRestoreModal,
        closeRestoreModal,
        showExpiredModal,
        closeExpiredModal,
    };
}

