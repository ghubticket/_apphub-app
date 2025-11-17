'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { FormEvent } from 'react';
import type { PixPaymentResult } from '../types';
import { getMercadoPagoDeviceId, waitForMercadoPagoDeviceId } from '../utils/deviceIdHelper';
import { clearCartItems } from '@/lib/cart';
import { storageHelpers } from '../utils/storageHelpers';

// Ref para rastrear se já buscou informações do pedido (evitar múltiplas buscas)
const orderInfoFetchedRef = new Map<string, boolean>();

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
 * 
 * Features:
 * - Geração de QR Code PIX
 * - Polling para verificar status do pagamento
 * - Gerenciamento de estados (idle, processing, success, error)
 * - Tratamento de erros detalhado
 * - Countdown para redirecionamento após sucesso
 * - Limpeza automática de pedidos pendentes ao criar novo pedido
 * - Performance otimizada com useCallback e useRef
 */
export function usePixPayment(orderId: string | null, orderExpiresAt?: string | Date | null): UsePixPaymentReturn {
    const router = useRouter();
    const [status, setStatus] = useState<PixPaymentStatus>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [pixResult, setPixResult] = useState<PixPaymentResult | null>(null);
    // CRÍTICO: Inicializar isCheckoutReady como true se já há orderId
    const [isCheckoutReady, setIsCheckoutReady] = useState(() => !!orderId);
    const [pixCopySuccess, setPixCopySuccess] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
    const [pixExpirationDescription, setPixExpirationDescription] = useState<string | null>(null);
    
    const processingRef = useRef(false);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousOrderIdRef = useRef<string | null>(null);
    const orderIdRef = useRef<string | null>(orderId);
    const orderExpiresAtRef = useRef<string | Date | null | undefined>(orderExpiresAt);
    const pixGenerationDeadlineMinutes = 30; // PIX expira em 30 minutos

    // CRÍTICO: Atualizar orderIdRef ANTES de qualquer outra lógica
    useEffect(() => {
        orderIdRef.current = orderId;
        
        // CRÍTICO: Atualizar isCheckoutReady quando orderId mudar
        // Se há orderId, checkout está pronto; se não há, não está pronto
        setIsCheckoutReady(!!orderId);
    }, [orderId]);
    
    // Atualizar orderExpiresAtRef quando mudar
    useEffect(() => {
        orderExpiresAtRef.current = orderExpiresAt;
        
        // Se há pixResult e orderExpiresAt mudou, atualizar descrição de expiração
        if (pixResult && orderExpiresAt) {
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
            
            setPixExpirationDescription(`Você pode pagar até: ${formattedDate} às ${formattedTime}`);
        }
    }, [orderExpiresAt, pixResult]);


    
    // Resetar estado quando orderId mudar ou quando não houver orderId
    // CRÍTICO: Não incluir 'status' nas dependências para evitar loops e atualizações durante render
    useEffect(() => {
        if (previousOrderIdRef.current !== orderId) {
            if (!orderId) {
                // Sem orderId, resetar tudo
                setIsCheckoutReady(false);
                setStatus('idle');
                setStatusMessage('');
                setPixResult(null);
                setPixCopySuccess(false);
                setPixExpirationDescription(null);
                processingRef.current = false;
                
                // Limpar polling se existir
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            } else {
                // OrderId mudou ou foi definido
                // NOTA: Não resetar pixResult aqui se já foi restaurado pelo efeito acima
                // Apenas resetar se não há pixResult restaurado
                if (!pixResult) {
                    setStatus((prevStatus) => {
                        // Se há um erro ativo, manter o erro para exibição
                        if (prevStatus === 'error') {
                            return prevStatus;
                        }
                        return 'idle';
                    });
                    
                    setStatusMessage('');
                    setPixCopySuccess(false);
                    setPixExpirationDescription(null);
                    processingRef.current = false;
                }
                
                // Limpar polling se existir (será reiniciado se necessário)
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                
                // Se há orderId, marcar checkout como pronto
                setIsCheckoutReady(true);
            }
        }
    }, [orderId, pixResult]); // CRÍTICO: Incluir pixResult para não resetar se já foi restaurado

    // Resetar pagamento para estado inicial
    const resetPayment = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
        setPixResult(null);
        setPixCopySuccess(false);
        setPixExpirationDescription(null);
        setRedirectCountdown(null);
        processingRef.current = false;
        
        // Limpar countdown e polling se existirem
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    // Countdown para redirecionamento (definido antes de startPolling para poder ser usado)
    const startRedirectCountdown = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }

        let countdown = 5;
        
        countdownIntervalRef.current = setInterval(() => {
            countdown -= 1;
            if (countdown > 0) {
                setRedirectCountdown(countdown);
            } else {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }
                setRedirectCountdown(null);
                
                // CRÍTICO: Usar requestAnimationFrame para garantir que não navegue durante render
                if (typeof window !== 'undefined') {
                    storageHelpers.clearActiveOrderId();
                    storageHelpers.clearTimerStartTime();
                    clearCartItems();
                    (window as any).__ALLOW_NAVIGATION__ = true;
                    window.onbeforeunload = null;
                    
                    // Usar requestAnimationFrame para garantir que não navegue durante render
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            window.location.replace('/dashboard');
                        }, 0);
                    });
                } else {
                    router.push('/dashboard');
                }
            }
        }, 1000);
    }, [router]);

    // Polling para verificar status do pagamento
    const startPolling = useCallback((orderId: string) => {
        // Limpar polling anterior se existir
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        let attempts = 0;
        const maxAttempts = 180; // 180 tentativas = 15 minutos (5s * 180 = 900s = 15min)
        const pollingInterval = 5000; // 5 segundos

        pollingIntervalRef.current = setInterval(async () => {
            attempts++;
            
            // Verificar se ainda temos o mesmo orderId
            if (orderIdRef.current !== orderId) {
                console.log('[usePixPayment] ⚠️ OrderId mudou durante polling, parando');
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                return;
            }

            try {
                const response = await api.get(`/orders/${orderId}`);
                const order = response.data?.data || response.data?.data?.order;
                
                if (order) {
                    // Se pedido foi pago, parar polling e mostrar sucesso
                    if (order.status === 'paid') {
                        console.log('[usePixPayment] ✅ Pagamento PIX aprovado!');
                        
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        
                        setStatus('success');
                        setStatusMessage('Pagamento aprovado com sucesso!');
                        
                        // Iniciar countdown para redirecionamento
                        setRedirectCountdown(5);
                        startRedirectCountdown();
                    } else if (order.status === 'cancelled' || order.status === 'failed') {
                        // Pedido cancelado ou falhou, parar polling
                        console.log('[usePixPayment] ⚠️ Pedido cancelado ou falhou:', order.status);
                        
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        
                        setStatus('error');
                        setStatusMessage('Pagamento não foi concluído. Tente gerar um novo QR Code.');
                    }
                }
            } catch (err: any) {
                // Se pedido não encontrado (404), parar polling
                if (err?.response?.status === 404) {
                    console.log('[usePixPayment] ⚠️ Pedido não encontrado durante polling, parando');
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
                // Outros erros: continuar tentando até maxAttempts
            }

            // Se excedeu tentativas, parar polling
            if (attempts >= maxAttempts) {
                console.log('[usePixPayment] ⏰ Polling excedeu tentativas máximas, parando');
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            }
        }, pollingInterval);
    }, [startRedirectCountdown]);

    // Gerar QR Code PIX
    const generatePix = useCallback(async (orderId: string) => {
        // Prevenir múltiplas execuções simultâneas
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
            // Obter Device ID do Mercado Pago (obrigatório para processar pagamento)
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

            // Criar pagamento PIX
            const response = await api.post(
                `/payments/${orderId}/pix`,
                { deviceId },
                {
                    headers: {
                        'X-meli-session-id': deviceId,
                    },
                }
            );

            // Backend retorna { success: true, data: { ... } }
            const paymentResult = response.data?.data || response.data;
            
            console.log('[usePixPayment] 📡 Resposta do backend:', {
                success: response.data?.success,
                hasQrCode: !!paymentResult?.qrCodeBase64,
                hasTicketUrl: !!paymentResult?.ticketUrl,
                status: paymentResult?.status,
            });

            if (paymentResult && response.data?.success) {
                // IMPORTANTE: Usar expiresAt do pedido (não do QR code) para calcular tempo de pagamento
                // O tempo de expiração do pedido é a fonte de verdade
                const expiresAt = orderExpiresAtRef.current || orderExpiresAt || paymentResult.expiresAt;
                let expirationDescription: string | null = null;
                
                if (expiresAt) {
                    const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
                    const now = new Date();
                    
                    // Formatar data/hora para exibição
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
                setStatus('idle'); // Voltar para idle após gerar QR code
                setStatusMessage('');
                
                // IMPORTANTE: Manter orderId no storage quando QR code PIX é gerado
                // Isso permite que ao recarregar a página (F5), o sistema detecte que há pedido PIX pendente
                // e redirecione para /dashboard ao invés de criar novo pedido
                // O storage só será limpo quando o usuário navegar para home normalmente (não F5)
                console.log('[usePixPayment] ✅ QR code PIX gerado - mantendo orderId no storage para detecção ao recarregar');
                
                // Marcar que há um pedido PIX ativo (para detecção ao recarregar)
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('__PIX_ORDER_ACTIVE__', orderId);
                }
                
                // CRÍTICO: Liberar navegação quando QR code é gerado (sem modais)
                // Definir flag global para permitir navegação sem alerta
                if (typeof window !== 'undefined') {
                    (window as any).__ALLOW_NAVIGATION__ = true;
                    window.onbeforeunload = null;
                }
                
                // Iniciar polling para verificar status do pagamento
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
    }, [pixGenerationDeadlineMinutes, startPolling]);


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
        // Limpar estado antes de navegar
        if (typeof window !== 'undefined') {
            storageHelpers.clearActiveOrderId();
            storageHelpers.clearTimerStartTime();
            clearCartItems();
            (window as any).__ALLOW_NAVIGATION__ = true;
            window.onbeforeunload = null;
            
            // CRÍTICO: Usar requestAnimationFrame para garantir que não navegue durante render
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.location.replace('/dashboard');
                }, 0);
            });
        } else {
            router.push('/dashboard');
        }
    }, [router]);

    // Dismiss status (fechar modal de erro)
    const dismissStatus = useCallback(() => {
        setStatus('idle');
        setStatusMessage('');
    }, []);

    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
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
        redirectCountdown,
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

