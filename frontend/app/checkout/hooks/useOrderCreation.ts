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
            console.log('[useOrderCreation] 🗑️ Cancelando pedido no backend:', orderId);
            await api.post(`/orders/${orderId}/cancel`);
            console.log('[useOrderCreation] ✅ Pedido cancelado com sucesso no backend');
            return true;
        } catch (err: any) {
            // Se pedido não encontrado (404), tratar como sucesso - pedido já foi cancelado/expirado
            if (err?.response?.status === 404) {
                console.log('[useOrderCreation] ⚠️ Pedido já não existe (404), tratando como sucesso:', orderId);
                return true;
            }

            // Para outros erros, logar mas ainda assim retornar false
            console.error('[useOrderCreation] ❌ Erro ao cancelar pedido no backend:', err);
            return false;
        }
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

        // Evitar múltiplas criações simultâneas
        if (creatingRef.current) {
            console.log('[useOrderCreation] ⏸️ Já está criando pedido, ignorando chamada duplicada');
            return;
        }
        
        // CRÍTICO: Proteção contra loop infinito - evitar criar pedidos muito rapidamente
        const now = Date.now();
        const lastCreateTime = lastCreateTimeRef.current;
        
        // Se lastCreateTime está no futuro, significa que há um bloqueio ativo (ex: após rate limit)
        if (lastCreateTime > now) {
            const remainingBlockTime = Math.ceil((lastCreateTime - now) / 1000); // segundos restantes
            const remainingMinutes = Math.ceil(remainingBlockTime / 60);
            const remainingSeconds = remainingBlockTime % 60;
            
            console.warn(`[useOrderCreation] ⚠️ Criação de pedido bloqueada. Aguarde ${remainingBlockTime} segundos.`);
            
            if (remainingMinutes > 0) {
                setError(`Muitas tentativas de criar pedido. Aguarde ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''} antes de tentar novamente. Ou recarregue a página para resetar.`);
            } else {
                setError(`Muitas tentativas de criar pedido. Aguarde ${remainingSeconds} segundo${remainingSeconds > 1 ? 's' : ''} antes de tentar novamente.`);
            }
            return;
        }
        
        // Verificar se passou tempo mínimo desde última criação
        const timeSinceLastCreate = now - lastCreateTime;
        if (timeSinceLastCreate < 2000 && lastCreateTime > 0) { // Mínimo de 2 segundos entre criações
            console.warn('[useOrderCreation] ⚠️ Tentativa de criar pedido muito rapidamente após última criação, ignorando para evitar loop infinito');
            return;
        }
        
        // OTIMIZADO: Cancelar requisição anterior se existir
        if (createOrderAbortControllerRef.current) {
            console.log('[useOrderCreation] 🛑 Cancelando requisição anterior de createOrder');
            createOrderAbortControllerRef.current.abort();
        }
        
        // Criar novo AbortController para esta requisição
        const abortController = new AbortController();
        createOrderAbortControllerRef.current = abortController;
        
        creatingRef.current = true;
        lastCreateTimeRef.current = now; // Registrar timestamp da criação

        try {
            setLoading(true);
            setError(null);

            // IMPORTANTE: Se há orderId no storage, primeiro verificar se o pedido ainda é válido
            // OTIMIZADO: Usar cache primeiro
            const existingOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current || storage.loadOrderId();
            if (existingOrderId && !order) {
                console.log('[useOrderCreation] 🔍 Encontrado orderId no storage antes de criar, verificando se pedido ainda é válido:', existingOrderId);
                try {
                    const checkResponse = await api.get(`/orders/${existingOrderId}`, {
                        signal: abortController.signal,
                    });
                    const existingOrder = checkResponse.data?.data?.order;
                    
                    if (existingOrder && existingOrder.status === 'pending' && existingOrder.expiresAt) {
                        const hasExpired = isOrderExpired(existingOrder.expiresAt);
                        
                        if (!hasExpired) {
                            // Pedido ainda válido, usar ele ao invés de criar novo
                            const remainingMinutes = Math.floor(getRemainingTime(existingOrder.expiresAt) / 60000);
                            console.log('[useOrderCreation] ✅ Pedido existente ainda válido, usando ao invés de criar novo:', {
                                orderId: existingOrder._id,
                                remainingMinutes,
                            });
                            setOrder(existingOrder);
                            orderIdRef.current = existingOrder._id;
                            cachedOrderIdFromStorageRef.current = existingOrder._id; // OTIMIZADO: Atualizar cache
                            storage.saveOrderId(existingOrder._id);
                            setLoading(false);
                            creatingRef.current = false;
                            return; // Não criar novo pedido
                        } else {
                            // Pedido expirado, cancelar, limpar e mostrar modal
                            console.log('[useOrderCreation] ⏰ Pedido existente expirado, cancelando e limpando:', existingOrderId);
                            try {
                                await cancelOrderInBackend(existingOrderId);
                            } catch (cancelErr: any) {
                                // Ignorar erro 404 (já foi cancelado)
                                if (cancelErr?.response?.status !== 404) {
                                    console.error('[useOrderCreation] ❌ Erro ao cancelar pedido expirado:', cancelErr);
                                }
                            }
                            
                            // Limpar estado
                            storage.clearOrderRelated();
                            orderIdRef.current = null;
                            cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                            setOrder(null);
                            setLoading(false);
                            creatingRef.current = false;
                            
                            // Mostrar modal de expiração
                            if (!hasShownExpiredModalRef.current) {
                                console.log('[useOrderCreation] 🔔 Mostrando modal de pedido expirado');
                                setShowExpiredModal(true);
                                hasShownExpiredModalRef.current = true;
                            }
                            
                            return; // Não criar novo pedido automaticamente
                        }
                    } else {
                        // Pedido não é PENDING ou não tem expiresAt, limpar
                        const orderStatus = existingOrder?.status || 'undefined';
                        console.log('[useOrderCreation] 🗑️ Pedido existente não é válido (status:', orderStatus, '), limpando');
                        storage.clearOrderRelated();
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                        
                        // CRÍTICO: Se o pedido tem status 'failed', não criar novo automaticamente
                        // Isso evita loop infinito quando o backend retorna pedidos com status 'failed'
                        if (orderStatus === 'failed' || orderStatus === 'cancelled') {
                            console.warn('[useOrderCreation] ⚠️ Pedido com status inválido detectado, abortando criação de novo pedido para evitar loop infinito');
                            setLoading(false);
                            creatingRef.current = false;
                            setError('Não foi possível criar um pedido válido. Por favor, tente novamente.');
                            return; // CRÍTICO: Retornar para evitar criar novo pedido
                        }
                    }
                } catch (checkErr: any) {
                    // OTIMIZADO: Ignorar erros de cancelamento intencional
                    if (checkErr.name === 'AbortError' || checkErr.name === 'CanceledError' || (checkErr.code === 'ERR_CANCELED')) {
                        console.log('[useOrderCreation] ⏸️ Requisição de verificação cancelada intencionalmente');
                        return;
                    }
                    
                    // Se pedido não encontrado (404/403), limpar e criar novo
                    if (checkErr?.response?.status === 404 || checkErr?.response?.status === 403) {
                        console.log('[useOrderCreation] ⚠️ Pedido existente não encontrado ou sem acesso, limpando e criando novo');
                        storage.clearOrderRelated();
                        orderIdRef.current = null;
                        cachedOrderIdFromStorageRef.current = null; // OTIMIZADO: Limpar cache
                    } else {
                        // Outro erro, logar mas continuar tentando criar
                        console.error('[useOrderCreation] ❌ Erro ao verificar pedido existente:', checkErr);
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
                ...(promoterCode ? { promoterCode: promoterCode.toUpperCase().trim() } : {}),
            };

            console.log('[useOrderCreation] 🚀 Criando novo pedido no backend:', {
                eventId: orderPayload.eventId,
                ticketTypeId: orderPayload.ticketTypeId,
                quantity: orderPayload.quantity,
                customerEmail: orderPayload.customerData.email,
            });

            const response = await api.post('/orders', orderPayload, {
                signal: abortController.signal,
            });
            const orderData = response.data?.data?.order;

            if (orderData) {
                console.log('[useOrderCreation] ✅ Pedido criado com sucesso:', {
                    orderId: orderData._id,
                    orderNumber: orderData.orderNumber,
                    status: orderData.status,
                    expiresAt: orderData.expiresAt,
                    totalAmount: orderData.totalAmount,
                    totalTickets: orderData.totalTickets,
                });
                
                // CRÍTICO: Validar se o pedido foi criado com status válido
                // Se o backend retornar 'failed', não salvar no storage para evitar loop infinito
                if (orderData.status === 'failed' || orderData.status === 'cancelled') {
                    console.error('[useOrderCreation] ❌ Pedido criado com status inválido:', orderData.status);
                    console.error('[useOrderCreation] 📋 Detalhes do pedido inválido:', {
                        orderId: orderData._id,
                        orderNumber: orderData.orderNumber,
                        status: orderData.status,
                        totalAmount: orderData.totalAmount,
                        eventId: orderData.event,
                        ticketTypeId: orderData.tickets?.[0]?.ticketType,
                    });
                    
                    setLoading(false);
                    creatingRef.current = false;
                    
                    // CRÍTICO: Limpar qualquer pedido inválido do storage para evitar loops
                    storage.clearOrderRelated();
                    orderIdRef.current = null;
                    cachedOrderIdFromStorageRef.current = null;
                    
                    // Mensagem de erro mais amigável
                    setError(`Não foi possível criar um pedido válido. Status: ${orderData.status}. Por favor, tente novamente.`);
                    
                    // NÃO definir orderIdRef para evitar tentativas de refresh
                    createOrderAbortControllerRef.current = null;
                    
                    // CRÍTICO: Não tentar criar novamente automaticamente
                    // O usuário precisará tentar manualmente ou recarregar a página
                    return; // Retornar sem salvar o pedido inválido
                }
                
                // Pedido válido, salvar normalmente
                setOrder(orderData);
                orderIdRef.current = orderData._id;
                cachedOrderIdFromStorageRef.current = orderData._id; // OTIMIZADO: Atualizar cache
                storage.saveOrderId(orderData._id);
                createOrderAbortControllerRef.current = null; // Limpar AbortController após sucesso
                
                // IMPORTANTE: Se o pedido tem expiresAt, salvar o timer no localStorage para usar como fallback
                if (orderData.status === 'pending' && orderData.expiresAt) {
                    const remaining = getRemainingTime(orderData.expiresAt);
                    if (remaining > 0) {
                        // Calcular startTime baseado no expiresAt para salvar no localStorage
                        const now = Date.now();
                        const startTime = now - (30 * 60 * 1000 - remaining); // 30 minutos
                        storage.saveTimer(startTime);
                        console.log('[useOrderCreation] 💾 Timer salvo no localStorage baseado no expiresAt do pedido criado:', {
                            expiresAt: parseExpiresAt(orderData.expiresAt)?.toISOString(),
                            startTime: new Date(startTime).toISOString(),
                            remainingMinutes: Math.floor(remaining / 60000),
                        });
                    }
                } else {
                    // Limpar timer antigo do localStorage se pedido não tem expiresAt
                    storage.clearTimer();
                    console.log('[useOrderCreation] 🧹 Timer antigo do localStorage limpo (novo pedido criado sem expiresAt)');
                }
            }
        } catch (err: any) {
            // OTIMIZADO: Ignorar erros de cancelamento intencional
            if (err.name === 'AbortError' || err.name === 'CanceledError' || (err.code === 'ERR_CANCELED')) {
                console.log('[useOrderCreation] ⏸️ Requisição de criação cancelada intencionalmente');
                return;
            }
            
            const statusCode = err?.response?.status;
            let errorMessage = err?.response?.data?.message || err?.message || 'Erro ao criar pedido';
            
            // CRÍTICO: Tratar erro 429 (Rate Limit) especificamente
            if (statusCode === 429) {
                // Em desenvolvimento, bloqueio mais curto para facilitar testes
                const isDevelopment = typeof window !== 'undefined' && (
                    process.env.NODE_ENV !== 'production' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1'
                );
                const blockDuration = isDevelopment ? 10 * 1000 : 5 * 60 * 1000; // 10 segundos em dev, 5 minutos em produção
                const blockUntil = Date.now() + blockDuration;
                lastCreateTimeRef.current = blockUntil;
                
                const blockSeconds = isDevelopment ? 10 : 300;
                const blockMinutes = Math.floor(blockSeconds / 60);
                errorMessage = `Muitas tentativas de criar pedido. O sistema está temporariamente bloqueado. Aguarde ${isDevelopment ? `${blockSeconds} segundos` : `${blockMinutes} minutos`} ou recarregue a página para tentar novamente.`;
                console.warn(`[useOrderCreation] ⚠️ Rate limit atingido (429). Bloqueando tentativas automáticas por ${isDevelopment ? `${blockSeconds} segundos` : `${blockMinutes} minutos`}.`);
                
                // Limpar qualquer pedido inválido do storage
                const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
                if (savedOrderId) {
                    orderIdRef.current = null;
                    cachedOrderIdFromStorageRef.current = null;
                    storage.clearOrderRelated();
                    setOrder(null);
                }
            }
            
            setError(errorMessage);
            console.error('[useOrderCreation] ❌ Erro ao criar pedido:', {
                status: statusCode,
                message: errorMessage,
                error: err,
            });
            
            // Se erro 400 ou 404, pode ser que pedido já foi cancelado - limpar storage
            if (statusCode === 400 || statusCode === 404) {
                // OTIMIZADO: Usar cache primeiro
                const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
                if (savedOrderId) {
                    orderIdRef.current = null;
                    cachedOrderIdFromStorageRef.current = null; // Limpar cache também
                    storage.clearOrderRelated();
                    setOrder(null);
                }
            }
        } finally {
            setLoading(false);
            creatingRef.current = false;
            // Limpar AbortController no finally para garantir cleanup mesmo em caso de erro
            if (createOrderAbortControllerRef.current && !createOrderAbortControllerRef.current.signal.aborted) {
                createOrderAbortControllerRef.current = null;
            }
        }
    }, [
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
        storage,
        cancelOrderInBackend,
    ]);

    return {
        createOrder,
    };
}

