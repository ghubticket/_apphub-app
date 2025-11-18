'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { PixPaymentResult } from '../types';
import { getMercadoPagoDeviceId, waitForMercadoPagoDeviceId } from '../utils/deviceIdHelper';
import api from '@/lib/api';
import { useCheckoutStorage } from './useCheckoutStorage';
import { useCheckoutNavigation } from './useCheckoutNavigation';
import { usePixPolling } from './usePixPolling';
import { useRedirectCountdown } from './useRedirectCountdown';

export type PixPaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface UsePixPaymentReturn {
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
export function usePixPayment(orderId: string | null, orderExpiresAt?: string | Date | null): UsePixPaymentReturn {
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
    const pixGenerationDeadlineMinutes = 30;

    // Redirect countdown hook
    const redirectCountdown = useRedirectCountdown({
        onCountdownUpdate: (countdown) => {
            // Countdown é gerenciado pelo hook
        },
    });
    
    const [redirectCountdownState, setRedirectCountdownState] = useState<number | null>(null);

    // Pix polling hook
    const { startPolling, stopPolling } = usePixPolling({
        orderIdRef,
        setStatus,
        setStatusMessage,
        onPaymentSuccess: () => {
            setStatus('success');
            setStatusMessage('Pagamento aprovado com sucesso!');
            setRedirectCountdownState(5);
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
        
        // Atualizar refs
        orderIdRef.current = orderId;
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
            console.log('[usePixPayment] ⏸️ PIX já está sendo gerado');
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
            
            console.log('[usePixPayment] 🚀 Gerando PIX:', {
                orderId,
                hasDeviceId: !!deviceId,
                deviceIdPreview: deviceId?.substring(0, 20) + '...',
            });

            const response = await api.post(
                `/payments/${orderId}/pix`,
                { deviceId },
                {
                    headers: {
                        'X-meli-session-id': deviceId,
                    },
                }
            );

            const paymentResult = response.data?.data || response.data;
            
            console.log('[usePixPayment] 📡 Resposta do backend:', {
                success: response.data?.success,
                hasQrCode: !!paymentResult?.qrCodeBase64,
                hasTicketUrl: !!paymentResult?.ticketUrl,
                status: paymentResult?.status,
            });

            if (paymentResult && response.data?.success) {
                const expiresAt = orderExpiresAtRef.current || orderExpiresAt || paymentResult.expiresAt;
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
                    ticketUrl: paymentResult.ticketUrl || paymentResult.qrCode,
                    expiresAt: paymentResult.expiresAt,
                    expirationMinutes: paymentResult.expirationMinutes || pixGenerationDeadlineMinutes,
                    status: paymentResult.status || 'pending',
                    statusDetail: paymentResult.statusDetail,
                    statusInfo: paymentResult.statusInfo,
                });
                
                setPixExpirationDescription(expirationDescription);
                setStatus('idle');
                setStatusMessage('');
                
                console.log('[usePixPayment] ✅ QR code PIX gerado - mantendo orderId no storage para detecção ao recarregar');
                
                // Garantir que orderIdRef.current está atualizado antes de iniciar polling
                orderIdRef.current = orderId;
                console.log('[usePixPayment] 🔧 orderIdRef atualizado antes de iniciar polling:', {
                    orderId,
                    orderIdRefCurrent: orderIdRef.current,
                });
                
                storage.setPixOrderActive(orderId);
                navigation.allowNavigation();
                
                console.log('[usePixPayment] 🔄 Iniciando polling para verificar status do pagamento PIX');
                startPolling(orderId);
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (err: any) {
            console.error('[usePixPayment] ❌ Erro ao gerar PIX:', err);
            
            const errorMessage = err?.response?.data?.message || 
                                err?.message || 
                                'Erro ao gerar QR Code PIX. Tente novamente.';
            
            setStatus('error');
            setStatusMessage(errorMessage);
            setPixResult(null);
        } finally {
            processingRef.current = false;
        }
    }, [pixGenerationDeadlineMinutes, startPolling, storage, navigation, orderExpiresAt]);

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
        if (pixResult?.ticketUrl) {
            navigator.clipboard.writeText(pixResult.ticketUrl).then(() => {
                setPixCopySuccess(true);
                setTimeout(() => {
                    setPixCopySuccess(false);
                }, 3000);
            }).catch((err) => {
                console.error('[usePixPayment] Erro ao copiar código:', err);
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
