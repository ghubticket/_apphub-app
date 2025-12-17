'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { PixPaymentResult } from '../types';
import { getMercadoPagoDeviceId, waitForMercadoPagoDeviceId } from '../utils/deviceIdHelper';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCheckoutStorage } from './useCheckoutStorage';
import { useCheckoutNavigation } from './useCheckoutNavigation';
import { usePixPolling } from './usePixPolling';
import { useRedirectCountdown } from './useRedirectCountdown';
import { loadCartItems } from '@/lib/cart';
import { storageHelpers } from '../utils/storageHelpers';

export type PixPaymentStatus = 'idle' | 'processing' | 'success' | 'error';

export interface UsePixPaymentReturn {
    status: PixPaymentStatus;
    statusMessage: string;
    pixResult: PixPaymentResult | null;
    isProcessing: boolean;
    isCheckoutReady: boolean;
    pixCopySuccess: boolean;
    redirectCountdown: number | null;
    pixExpirationDescription: string | null;
    pixGenerationDeadlineMinutes: number;
    generatePix: (orderId: string) => Promise<void>;
    handleFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    handleCopyCode: () => void;
    resetPayment: () => void;
    dismissStatus: () => void;
    onNavigateToOrders: () => void;
}

/**
 * Hook para gerenciar pagamento PIX usando Mercado Pago
 * REFATORADO: Usa hooks especializados para polling e countdown
 * Reduzido de 510 para ~350 linhas
 */
export function usePixPayment(
    orderId: string | null, 
    orderExpiresAt?: string | Date | null,
    cartItems?: any[],
    customerData?: { name: string; email: string; cpf: string; phone: string },
    promoterCode?: string | null
): UsePixPaymentReturn {
    const { user } = useAuth();
    const userId = user?._id || user?.id || null;
    const storage = useCheckoutStorage();
    const navigation = useCheckoutNavigation();
    
    const [status, setStatus] = useState<PixPaymentStatus>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [pixResult, setPixResult] = useState<PixPaymentResult | null>(null);
    const [isCheckoutReady, setIsCheckoutReady] = useState(() => !!orderId);
    const [pixCopySuccess, setPixCopySuccess] = useState(false);
    const [pixExpirationDescription, setPixExpirationDescription] = useState<string | null>(null);
    
    const processingRef = useRef(false);
    const previousOrderIdRef = useRef<string | null>(null);
    const orderIdRef = useRef<string | null>(orderId);
    const orderExpiresAtRef = useRef<string | Date | null | undefined>(orderExpiresAt);
    const cartItemsRef = useRef<any[] | undefined>(cartItems);
    const customerDataRef = useRef<{ name: string; email: string; cpf: string; phone: string } | undefined>(customerData);
    const promoterCodeRef = useRef<string | null | undefined>(promoterCode);
    const pixGenerationDeadlineMinutes = 30;
    
    // Atualizar refs quando os valores mudarem
    useEffect(() => {
        cartItemsRef.current = cartItems;
        customerDataRef.current = customerData;
        promoterCodeRef.current = promoterCode;
    }, [cartItems, customerData, promoterCode]);

    // Redirect countdown hook
    const [redirectCountdownState, setRedirectCountdownState] = useState<number | null>(null);
    
    const redirectCountdown = useRedirectCountdown({
        onCountdownUpdate: (countdown) => {
            // CRÍTICO: Atualizar o estado local para que o componente re-renderize com o countdown atualizado
            setRedirectCountdownState(countdown);
        },
    });

    // Pix polling hook
    const { startPolling, stopPolling } = usePixPolling({
        orderIdRef,
        setStatus,
        setStatusMessage,
        onPaymentSuccess: () => {
            setStatus('success');
            setStatusMessage('Pagamento aprovado com sucesso!');
            // Limpar storage e permitir navegação
            storage.clearOrderRelated();
            navigation.allowNavigation();
            // Iniciar countdown - o onCountdownUpdate vai atualizar o redirectCountdownState
            redirectCountdown.startCountdown('/dashboard', 5);
        },
        onPaymentError: (message) => {
            setStatus('error');
            setStatusMessage(message);
        },
    });

    // Memoizar descrição de expiração para evitar recálculos desnecessários
    const expirationDescription = useMemo(() => {
        if (!pixResult || !orderExpiresAt) return null;
        
        const expirationDate = typeof orderExpiresAt === 'string' ? new Date(orderExpiresAt) : orderExpiresAt;
        const formattedDate = expirationDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
        const formattedTime = expirationDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
        
        return `Você pode pagar até: ${formattedDate} às ${formattedTime}`;
    }, [pixResult, orderExpiresAt]);
    
    // Sincronizar expirationDescription quando mudar
    useEffect(() => {
        setPixExpirationDescription(expirationDescription);
    }, [expirationDescription]);
    
    // OTIMIZADO: Consolidar atualização de refs e reset de estado quando orderId mudar
    useEffect(() => {
        const orderIdChanged = previousOrderIdRef.current !== orderId;
        
        // CRÍTICO: Não sobrescrever orderIdRef se já temos um pedido real (não fake)
        // Isso evita que o orderIdRef seja sobrescrito de volta para fake após criar pedido real
        const currentOrderId = orderIdRef.current;
        const isCurrentReal = currentOrderId && !currentOrderId.startsWith('fake-');
        const isNewFake = orderId && orderId.startsWith('fake-');
        const isNewReal = orderId && !orderId.startsWith('fake-');
        
        // REGRA: Se já temos um pedido REAL, NUNCA sobrescrever com fake
        // Só atualizar se:
        // 1. Não temos orderIdRef atual OU
        // 2. O novo orderId é real (pode atualizar fake para real, ou real para real) OU
        // 3. O orderIdRef atual também é fake E o novo também é fake (pode atualizar fake para fake)
        const shouldUpdateOrderId = !currentOrderId || isNewReal || (isCurrentReal === false && isNewFake);
        
        if (shouldUpdateOrderId) {
            orderIdRef.current = orderId;
        }
        // Log removido para reduzir ruído
        
        // Sempre atualizar orderExpiresAt
        orderExpiresAtRef.current = orderExpiresAt;
        
        // Atualizar isCheckoutReady baseado em orderId
        setIsCheckoutReady(!!orderId);
        
        // Resetar estado apenas se orderId mudou
        if (orderIdChanged) {
            if (!orderId) {
                // Sem orderId: resetar tudo
                setStatus('idle');
                setStatusMessage('');
                setPixResult(null);
                setPixCopySuccess(false);
                setPixExpirationDescription(null);
                processingRef.current = false;
                stopPolling();
            } else {
                // Novo orderId: resetar apenas se não houver pixResult
                if (!pixResult) {
                    setStatus((prevStatus) => {
                        if (prevStatus === 'error') {
                            return prevStatus; // Manter erro para exibição
                        }
                        return 'idle';
                    });
                    
                    setStatusMessage('');
                    setPixCopySuccess(false);
                    setPixExpirationDescription(null);
                    processingRef.current = false;
                    // Só parar polling se não há pixResult ativo
                    stopPolling();
                }
                // Se há pixResult ativo, não parar o polling - ele deve continuar verificando
                
                setIsCheckoutReady(true);
            }
            
            previousOrderIdRef.current = orderId;
        }
        // Se orderId não mudou mas pixResult mudou, não fazer nada - não parar polling
    }, [orderId, orderExpiresAt, pixResult]);

    // Resetar pagamento
    const resetPayment = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
        setPixResult(null);
        setPixCopySuccess(false);
        setPixExpirationDescription(null);
        setRedirectCountdownState(null);
        processingRef.current = false;
        stopPolling();
        redirectCountdown.stopCountdown();
    }, [stopPolling, redirectCountdown]);

    // Gerar QR Code PIX
    const generatePix = useCallback(async (orderId: string) => {
        if (processingRef.current) {
            return;
        }

        if (!orderId) {
            setStatus('error');
            setStatusMessage('Pedido não encontrado');
            return;
        }

        processingRef.current = true;
        setStatus('processing');
        setStatusMessage('Gerando QR Code PIX...');
        setPixResult(null);
        setPixCopySuccess(false);

        try {
            let deviceId: string;
            try {
                deviceId = await waitForMercadoPagoDeviceId(1000);
            } catch (error) {
                deviceId = getMercadoPagoDeviceId();
            }

            // Log do deviceId obtido
            console.log('[usePixPayment] Gersando PIX - Device ID:', {
                hasDeviceId: !!deviceId,
                deviceIdPrefix: deviceId?.substring(0, 20) + '...', // Log parcial por segurança
                orderId,
            });
            
            // Se orderId é fake, enviar dados do carrinho e cliente para criar pedido real
            const isFakeOrder = orderId.startsWith('fake-');
            const requestBody: any = { deviceId };
            
            if (isFakeOrder) {
                // Obter dados do carrinho e cliente - tentar múltiplas fontes
                let currentCartItems = cartItemsRef.current || cartItems;
                let currentCustomerData = customerDataRef.current || customerData;
                let currentPromoterCode = promoterCodeRef.current || promoterCode;
                
                // Se não temos dados dos parâmetros, tentar obter do storage/cart diretamente
                if (!currentCartItems || currentCartItems.length === 0) {
                    try {
                        const rawCartItems = loadCartItems().filter((item) => item.quantity > 0);
                        if (rawCartItems.length > 0) {
                            // Calcular valores como no useCheckoutCart
                            currentCartItems = rawCartItems.map((item: any) => {
                                const subtotal = item.price * item.quantity;
                                const platformFeeValue = item.platformFeePercentage ? (subtotal * item.platformFeePercentage) / 100 : 0;
                                const fixedFeeValue = item.ticketFee ? item.ticketFee * item.quantity : 0;
                                return {
                                    ...item,
                                    subtotal,
                                    platformFeeValue,
                                    fixedFeeValue,
                                    total: subtotal + platformFeeValue + fixedFeeValue,
                                };
                            });
                            // Log removido para reduzir ruído
                        }
                    } catch (err) {
                        // Erro silencioso ao carregar carrinho
                    }
                }
                
                if (!currentCustomerData || !currentCustomerData.name || !currentCustomerData.email) {
                    try {
                        // CRÍTICO: Passar userId para validar que os dados pertencem ao usuário atual
                        const storedCustomerData = storageHelpers.loadCustomerData(userId);
                        if (storedCustomerData && storedCustomerData.name && storedCustomerData.email) {
                            currentCustomerData = storedCustomerData;
                            // Log removido para reduzir ruído
                        }
                    } catch (err) {
                        // Erro silencioso ao carregar dados do cliente
                    }
                }
                
                // Log removido para reduzir ruído
                
                if (!currentCartItems || currentCartItems.length === 0) {
                    throw new Error('Carrinho vazio. Por favor, adicione itens ao carrinho antes de gerar o PIX.');
                }
                
                if (!currentCustomerData || !currentCustomerData.name || !currentCustomerData.email) {
                    throw new Error('Dados do cliente incompletos. Por favor, preencha nome e email.');
                }
                
                // Garantir que os dados estão no formato correto
                requestBody.cartItems = currentCartItems.map((item: any) => ({
                    eventId: item.eventId,
                    id: item.id, // ticketTypeId
                    quantity: item.quantity,
                    price: item.price,
                    name: item.name,
                }));
                
                requestBody.customerData = {
                    name: currentCustomerData.name,
                    email: currentCustomerData.email,
                    cpf: currentCustomerData.cpf || undefined,
                    phone: currentCustomerData.phone || undefined,
                };
                
                if (currentPromoterCode) {
                    requestBody.promoterCode = currentPromoterCode;
                }
                
                // Log do payload quando é fake order
                console.log('[usePixPayment] Criando pedido real (fake order) - Payload:', {
                    isFakeOrder: true,
                    cartItemsCount: requestBody.cartItems?.length || 0,
                    customerEmail: requestBody.customerData?.email,
                    customerName: requestBody.customerData?.name,
                    hasPromoterCode: !!requestBody.promoterCode,
                    hasDeviceId: !!deviceId,
                });
            } else {
                console.log('[usePixPayment] Gerando PIX para pedido existente:', {
                    orderId,
                    hasDeviceId: !!deviceId,
                });
            }
            
            const response = await api.post(
                `/payments/${orderId}/pix`,
                requestBody,
                {
                    headers: {
                        'X-meli-session-id': deviceId,
                    },
                }
            );

            // Log da resposta
            console.log('[usePixPayment] Resposta do backend:', {
                success: response.data?.success,
                hasData: !!response.data?.data,
                hasPaymentId: !!response.data?.data?.paymentId,
                hasQrCode: !!response.data?.data?.qrCode,
                hasCreatedOrderId: !!response.data?.data?.createdOrderId,
                status: response.data?.data?.status,
            });

            const paymentResult = response.data?.data || response.data;
            
            if (paymentResult && response.data?.success) {
                // NOVO: Se pedido real foi criado, atualizar orderId ANTES de iniciar polling
                const realOrderId = paymentResult.createdOrderId || orderId;
                const finalOrderId = realOrderId || orderId;
                
                if (realOrderId !== orderId && realOrderId) {
                    // CRÍTICO: Atualizar orderIdRef ANTES de iniciar polling para evitar que polling pare
                    orderIdRef.current = realOrderId;
                    // Atualizar storage com orderId real
                    storage.saveOrderId(realOrderId);
                } else {
                    // Garantir que orderIdRef está atualizado mesmo se não houver mudança
                    orderIdRef.current = finalOrderId;
                }
                
                const expiresAt = orderExpiresAtRef.current || orderExpiresAt || paymentResult.expiresAt || (paymentResult.order?.expiresAt);
                let expirationDescription: string | null = null;
                
                if (expiresAt) {
                    const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
                    
                    const formattedDate = expirationDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    });
                    const formattedTime = expirationDate.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                    
                    expirationDescription = `Você pode pagar até: ${formattedDate} às ${formattedTime}`;
                }

                setPixResult({
                    paymentId: paymentResult.paymentId || paymentResult.id,
                    qrCode: paymentResult.qrCode,
                    qrCodeBase64: paymentResult.qrCodeBase64,
                    // Priorizar o código PIX puro; usar ticketUrl apenas como fallback
                    ticketUrl: paymentResult.qrCode || paymentResult.ticketUrl,
                    expiresAt: paymentResult.expiresAt,
                    expirationMinutes: paymentResult.expirationMinutes || pixGenerationDeadlineMinutes,
                    status: paymentResult.status || 'pending',
                    statusDetail: paymentResult.statusDetail,
                    statusInfo: paymentResult.statusInfo,
                });
                
                setPixExpirationDescription(expirationDescription);
                setStatus('idle');
                setStatusMessage('');
                
                // Iniciar polling com orderId real (já atualizado no orderIdRef)
                storage.setPixOrderActive(finalOrderId);
                navigation.allowNavigation();
                
                // CRÍTICO: Iniciar polling com o orderId real, que já está no orderIdRef
                // Log removido para reduzir ruído
                startPolling(finalOrderId);
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || 
                                err?.message || 
                                'Erro ao gerar QR Code PIX. Tente novamente.';
            
            setStatus('error');
            setStatusMessage(errorMessage);
            setPixResult(null);
        } finally {
            processingRef.current = false;
        }
    }, [
        pixGenerationDeadlineMinutes, 
        startPolling, 
        storage, 
        navigation, 
        orderExpiresAt, 
        cartItems, 
        customerData, 
        promoterCode
    ]);

    // Handler para submit do formulário
    const handleFormSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const currentOrderId = orderIdRef.current;
        if (!currentOrderId) {
            setStatus('error');
            setStatusMessage('Pedido não encontrado. Por favor, recarregue a página.');
            return;
        }

        await generatePix(currentOrderId);
    }, [generatePix]);

    // Handler para copiar código PIX
    const handleCopyCode = useCallback(() => {
        const codeToCopy = pixResult?.qrCode || pixResult?.ticketUrl;
        if (codeToCopy) {
            navigator.clipboard.writeText(codeToCopy).then(() => {
                setPixCopySuccess(true);
                setTimeout(() => {
                    setPixCopySuccess(false);
                }, 3000);
            }).catch((err) => {
                // Erro silencioso ao copiar código
            });
        }
    }, [pixResult]);

    // Handler para navegar para pedidos
    const onNavigateToOrders = useCallback(() => {
        storage.clearOrderRelated();
        navigation.allowNavigation();
        navigation.navigateToDashboard({ useReplace: true });
    }, [storage, navigation]);

    // Dismiss status
    const dismissStatus = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
    }, []);

    // Cleanup ao desmontar - usar refs para evitar dependências instáveis
    const stopPollingRef = useRef(stopPolling);
    const stopCountdownRef = useRef(() => redirectCountdown.stopCountdown());
    
    // Atualizar refs quando as funções mudarem
    useEffect(() => {
        stopPollingRef.current = stopPolling;
        stopCountdownRef.current = () => redirectCountdown.stopCountdown();
    }, [stopPolling, redirectCountdown]);
    
    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            if (stopPollingRef.current) {
                stopPollingRef.current();
            }
            if (stopCountdownRef.current) {
                stopCountdownRef.current();
            }
        };
    }, []);

    return {
        status,
        statusMessage,
        pixResult,
        isProcessing: processingRef.current,
        isCheckoutReady,
        pixCopySuccess,
        redirectCountdown: redirectCountdownState,
        pixExpirationDescription,
        pixGenerationDeadlineMinutes,
        generatePix,
        handleFormSubmit,
        handleCopyCode,
        resetPayment,
        dismissStatus,
        onNavigateToOrders,
    };
}
