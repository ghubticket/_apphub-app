'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HiOutlineCreditCard } from 'react-icons/hi2';
import { SiPix } from 'react-icons/si';
import Container from '@/components/shared/Container';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
    CartItem,
    clearCartItems,
    loadCartItems,
    removeCartItem as removeCartItemFromStorage,
} from '@/lib/cart';
import { sanitizeInput, normalizeCpf, normalizePhone, formatCpfDisplay, formatPhoneDisplay, isValidCpf } from '@/utils/sanitize';
import type {
    CheckoutCartItem,
    CheckoutCustomerData,
    CreatedOrder,
    PixPaymentResult,
    Reservation,
} from './types';
import { CARD_ERROR_CODE_MAP } from './utils/cardMessages';
import dynamic from 'next/dynamic';
import { CheckoutCartSummary } from './components/CheckoutCartSummary';
import { CustomerDataForm } from './components/CustomerDataForm';
import { initMercadoPago } from '@mercadopago/sdk-react';

const CardPaymentFormBrick = dynamic(() => import('./components/CardPaymentFormBrick').then((mod) => ({ default: mod.CardPaymentFormBrick })), {
    loading: () => <div className="mt-6 text-sm text-[#7d796c]">Carregando formulário de pagamento...</div>,
});

const PixPaymentSection = dynamic(() => import('./components/PixPaymentSection').then((mod) => ({ default: mod.PixPaymentSection })), {
    loading: () => <div className="mt-6 text-sm text-[#7d796c]">Carregando seção PIX...</div>,
});
import { storageHelpers } from './utils/storageHelpers';
import { debounce, apiCache } from './utils/performanceHelpers';
import { useCheckoutTimer } from './hooks/useCheckoutTimer';

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
        __MP_INITIALIZED__?: boolean;
        __MP_BRICK_RESET__?: () => void;
    }
}

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

function CheckoutPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isReady } = useAuth();

    // Proteção: redirecionar para login se não estiver autenticado
    useEffect(() => {
        if (isReady && !isAuthenticated) {
            // Salvar URL atual para redirecionar após login
            const returnUrl = '/checkout';
            router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
    }, [isReady, isAuthenticated, router]);

    useEffect(() => {
        if (typeof window !== 'undefined' && MP_PUBLIC_KEY && !window.__MP_INITIALIZED__) {
            try {
                initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
                window.__MP_INITIALIZED__ = true;
                // Mercado Pago inicializado
            } catch (error) {
                console.error('[Checkout] Erro ao inicializar Mercado Pago:', error);
            }
        }
    }, []);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<CreatedOrder | null>(null);
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [selectedTab, setSelectedTab] = useState<'card' | 'pix'>('card');
    const [globalError, setGlobalError] = useState<string>('');
    const [globalSuccess, setGlobalSuccess] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pixResult, setPixResult] = useState<PixPaymentResult | null>(null);
    const [checkingPaidOrder, setCheckingPaidOrder] = useState(true);
    const [restoringReservation, setRestoringReservation] = useState(false);
    const [rateLimitActive, setRateLimitActive] = useState(false);
    const reservationRestoredRef = useRef(false); // Rastrear se restaurou reserva nesta sessão
    const creatingReservationRef = useRef(false); // Proteger contra múltiplas criações simultâneas
    const cancelingReservationsRef = useRef(false); // Proteger contra criar reserva durante cancelamento
    const reservationExpiredRef = useRef(false); // Rastrear se a reserva expirou (evita criar nova automaticamente)
    const pixOrderCreatedAtRef = useRef<{ orderId: string; timestamp: number } | null>(null); // Rastrear quando pedido PIX foi criado
    const persistOrder = useCallback(
        (next: CreatedOrder | null) => {
            setOrder(next);
            if (next?._id) {
                storageHelpers.saveActiveOrderId(next._id);
            } else {
                storageHelpers.clearActiveOrderId();
                // Limpar ref quando pedido é limpo
                pixOrderCreatedAtRef.current = null;
            }
        },
        [],
    );

    // Funções de reserva serão definidas depois de summarizedCart

    // Log estado inicial e mudanças importantes
    // Log removido

    // Verificar se há pedido aprovado antes de renderizar (silencioso - apenas redireciona se pago)
    useEffect(() => {
        if (typeof window === 'undefined' || !isReady || !isAuthenticated) {
            setCheckingPaidOrder(false);
            return;
        }
        
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        if (!token) {
            return;
        }

        const activeOrderId = storageHelpers.loadActiveOrderId();
        if (!activeOrderId) {
            setCheckingPaidOrder(false);
            return;
        }

        const cacheKey = `order-${activeOrderId}`;
        const cachedOrder = apiCache.get<any>(cacheKey);

        if (cachedOrder?.status === 'paid') {
                storageHelpers.clearActiveOrderId();
                clearCartItems();
                setCartItems([]);
                persistOrder(null);
                setPixResult(null);
                window.location.href = '/';
                return;
            }

        if (cachedOrder) {
            setCheckingPaidOrder(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const response = await api.get(`/orders/${activeOrderId}`);
                const restoredOrder = response.data?.data;

                if (restoredOrder?._id) {
                    apiCache.set(cacheKey, restoredOrder, 5000);
                }

                if (!cancelled && restoredOrder?._id && restoredOrder.status === 'paid') {
                    storageHelpers.clearActiveOrderId();
                    clearCartItems();
                    setCartItems([]);
                    persistOrder(null);
                    setPixResult(null);
                    window.location.href = '/';
                    return;
                }
                if (!cancelled) {
                    setCheckingPaidOrder(false);
                }
            } catch (restoreError: any) {
                const status = restoreError?.response?.status;
                const hasOrder = order && '_id' in order;
                if ((status === 403 || status === 404) && !hasOrder) {
                    const hasCartItems = typeof window !== 'undefined' && loadCartItems().length > 0;
                    if (!hasCartItems) {
                        storageHelpers.clearActiveOrderId();
                        apiCache.clear(cacheKey);
                    }
                }
                setCheckingPaidOrder(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isReady, isAuthenticated, router, persistOrder, order]);

    // Restaurar pedido após F5 (apenas se já existe - não cria novos)
    useEffect(() => {
        if (order || checkingPaidOrder || !isReady || !isAuthenticated) {
            return;
        }
        
        const activeOrderId = storageHelpers.loadActiveOrderId();
        if (!activeOrderId) {
            return;
        }

        const cacheKey = `order-${activeOrderId}`;
        const cachedOrder = apiCache.get<any>(cacheKey);

        if (cachedOrder && ['pending', 'failed'].includes(String(cachedOrder.status)) && cachedOrder.paymentMethod !== 'pix') {
                persistOrder(cachedOrder);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const response = await api.get(`/orders/${activeOrderId}`);
                const restoredOrder = response.data?.data;

                if (!cancelled && restoredOrder?._id) {
                    apiCache.set(cacheKey, restoredOrder, 5000);

                    if (restoredOrder.status === 'paid' || restoredOrder.status === 'cancelled') {
                        storageHelpers.clearActiveOrderId();
                        apiCache.clear(cacheKey);
                    return;
                }

                    if (['pending', 'failed'].includes(String(restoredOrder.status)) && restoredOrder.paymentMethod !== 'pix') {
                    persistOrder(restoredOrder);
                    }
                }
            } catch (error: any) {
                const status = error?.response?.status;
                const hasOrder = order && '_id' in order;
                if ((status === 403 || status === 404) && !hasOrder) {
                    const hasCartItems = typeof window !== 'undefined' && loadCartItems().length > 0;
                    if (!hasCartItems) {
                    storageHelpers.clearActiveOrderId();
                    apiCache.clear(cacheKey);
                    }
                }
            }
        })();
        
        return () => {
            cancelled = true;
        };
    }, [order, persistOrder, isReady, isAuthenticated, checkingPaidOrder]);

    const pixPaymentActive = Boolean(pixResult);
    const pixGenerationDeadlineMinutes = pixResult?.expirationMinutes ?? 30;
    const [pixCopySuccess, setPixCopySuccess] = useState(false);
    const [pixStatus, setPixStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [pixStatusMessage, setPixStatusMessage] = useState('');
    const pixRedirectTimeoutRef = useRef<number | null>(null);

    // Verificar status do pedido PIX periodicamente
    useEffect(() => {
        // Continuar verificando mesmo se pixStatus === 'success' para garantir que o overlay apareça
        if (!order?._id || !pixPaymentActive) return;

        const checkPixStatus = async () => {
            try {
                // Verificar cache primeiro
                const cacheKey = `order-${order._id}`;
                const cachedOrder = apiCache.get<any>(cacheKey);

                let orderData = cachedOrder;
                if (!cachedOrder) {
                    const response = await api.get(`/orders/${order._id}`);
                    orderData = response.data?.data;
                    // Salvar no cache
                    if (orderData?._id) {
                        apiCache.set(cacheKey, orderData, 5000);
                    }
                }

                if (orderData?.status === 'paid') {
                    // Só setar success uma vez para evitar múltiplos redirecionamentos
                    if (pixStatus !== 'success') {
                        setPixStatus('success');
                        setPixStatusMessage('Seu pagamento foi aprovado e seu ingresso já está disponível, vamos te levar pra lá.');

                        storageHelpers.clearActiveOrderId();
                        clearCartItems();
                        // Também limpar o estado do pedido para evitar restauração
                        persistOrder(null);
                        setPixResult(null);

                        // DESATIVADO: Countdown automático
                        // setRedirectCountdown(5);
                        // blockCountdownIntervalRef.current = window.setInterval(() => { ... }, 1000);

                        // Limpar timeouts/intervals anteriores se existirem
                        if (pixRedirectTimeoutRef.current) {
                            window.clearTimeout(pixRedirectTimeoutRef.current);
                            pixRedirectTimeoutRef.current = null;
                        }
                        if (blockCountdownIntervalRef.current) {
                            window.clearInterval(blockCountdownIntervalRef.current);
                            blockCountdownIntervalRef.current = null;
                        }

                        // Redirecionar automaticamente após 5 segundos
                        pixRedirectTimeoutRef.current = window.setTimeout(() => {
                            navigateToOrders();
                        }, 5000);
                    }
                }
            } catch (error) {
                // Ignorar erros silenciosamente
            }
        };

        const interval = setInterval(checkPixStatus, 3000); // Verificar a cada 3 segundos
        return () => clearInterval(interval);
    }, [order?._id, pixPaymentActive, pixStatus, persistOrder]);
    const pixExpirationDescription = useMemo(() => {
        if (!pixResult) return '';
        const minutesFromResponse =
            typeof pixResult.expirationMinutes === 'number' && Number.isFinite(pixResult.expirationMinutes)
                ? Math.max(1, Math.round(pixResult.expirationMinutes))
                : null;
        if (pixResult.expiresAt) {
            const expiresAtDate = new Date(pixResult.expiresAt);
            if (!Number.isNaN(expiresAtDate.getTime())) {
                const formattedTime = expiresAtDate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                const now = new Date();
                const diffMinutes = Math.max(
                    1,
                    Math.round((expiresAtDate.getTime() - now.getTime()) / 60000),
                );
                const minutesLabel = minutesFromResponse ?? diffMinutes;
                return `O QR Code expira às ${formattedTime} (em aproximadamente ${minutesLabel} minuto${minutesLabel > 1 ? 's' : ''
                    }).`;
            }
        }
        if (minutesFromResponse) {
            return `O QR Code expira em aproximadamente ${minutesFromResponse} minuto${minutesFromResponse > 1 ? 's' : ''
                }.`;
        }
        return '';
    }, [pixResult]);
    const initialDeviceId = storageHelpers.loadDeviceId();
    const [deviceId, setDeviceId] = useState<string | null>(initialDeviceId);
    const [deviceChecks, setDeviceChecks] = useState(0);

    const calculateItem = useCallback(
        (item: CartItem): CheckoutCartItem => {
            const subtotal = item.price * item.quantity;
            const platformFeeValue = item.platformFeePercentage
                ? (subtotal * item.platformFeePercentage) / 100
                : 0;
            const fixedFeeValue = item.ticketFee ? item.ticketFee * item.quantity : 0;
            return {
                ...item,
                subtotal,
                platformFeeValue,
                fixedFeeValue,
                total: subtotal + platformFeeValue + fixedFeeValue,
            };
        },
        [],
    );

    const summarizedCart = useMemo(() => cartItems.map(calculateItem), [cartItems, calculateItem]);

    const totalAmount = useMemo(
        () => summarizedCart.reduce((acc, item) => acc + item.total, 0),
        [summarizedCart],
    );

    const totalTickets = useMemo(
        () => summarizedCart.reduce((acc, item) => acc + item.quantity, 0),
        [summarizedCart],
    );

    const primaryCartItem = summarizedCart[0];

    // Função para criar reserva (chama backend apenas quando necessário)
    const ensureReservation = useCallback(
        async () => {
            const currentPrimaryItem = summarizedCart[0];
            if (!currentPrimaryItem || !currentPrimaryItem.eventId) {
                return null;
            }

            // CRÍTICO: Se já tem reserva ativa e válida, verificar se está vinculada a PIX pendente
            // Se estiver vinculada a PIX pendente, NÃO usar - criar nova reserva
            if (reservation?._id && reservation.isActive) {
                const expiresAt = new Date(reservation.expiresAt);
                const isValid = expiresAt > new Date();
                
                // Verificar se está vinculada a pedido PIX pendente
                const isLinkedToPixOrder = (reservation as any).orderId && 
                    order?._id && 
                    order.status === 'pending' && 
                    (order as any).paymentMethod === 'pix' &&
                    String((reservation as any).orderId) === String(order._id);
                
                if (isValid && !isLinkedToPixOrder) {
                    console.log('[ensureReservation] ✅ Já tem reserva válida não vinculada a PIX, usando existente');
                    return reservation; // Já tem reserva válida e não vinculada a PIX, não precisa criar
                } else if (isLinkedToPixOrder) {
                    console.log('[ensureReservation] ⚠️ Reserva vinculada a PIX pendente, criando nova reserva:', {
                        reservationId: reservation._id,
                        orderId: order._id,
                    });
                    // Limpar reserva vinculada a PIX do estado local para forçar criação de nova
                    setReservation(null);
                }
            }
            
            // Se tem reserva mas está cancelada ou expirada, limpar estado local
            if (reservation?._id && (!reservation.isActive || new Date(reservation.expiresAt) <= new Date())) {
                setReservation(null);
            }

            // Proteger contra múltiplas criações simultâneas
            if (creatingReservationRef.current) {
                console.log('[ensureReservation] ⏳ Já está criando reserva, aguardando...');
                return null;
            }

            // CRÍTICO: Garantir que sempre use o mesmo sessionId (deviceId)
            // Se não tem deviceId, buscar ou criar um persistido
            let sessionId = deviceId;
            if (!sessionId) {
                // Tentar buscar do storage
                sessionId = storageHelpers.loadDeviceId() || null;
                if (!sessionId && typeof window !== 'undefined') {
                    // Último recurso: criar um persistido
                    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                    storageHelpers.saveDeviceId(sessionId);
                    console.log('[ensureReservation] 🔑 Criado novo sessionId persistido:', sessionId);
                } else if (sessionId) {
                    console.log('[ensureReservation] 🔑 Usando sessionId do storage:', sessionId);
                }
            }

            if (!sessionId) {
                console.error('[ensureReservation] ❌ Não foi possível obter sessionId');
                return null;
            }

            creatingReservationRef.current = true;
            try {
                console.log('[ensureReservation] 🌐 Criando/atualizando reserva no backend:', {
                    eventId: currentPrimaryItem.eventId,
                    ticketTypeId: currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id,
                    quantity: currentPrimaryItem.quantity,
                    sessionId,
                });

                const response = await api.post('/reservations', {
                    eventId: currentPrimaryItem.eventId,
                    ticketTypeId: currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id,
                    quantity: currentPrimaryItem.quantity,
                }, {
                    headers: {
                        'x-session-id': sessionId,
                    },
                });

                const createdReservation = response.data?.data?.reservation;
                if (createdReservation?._id) {
                    // CRÍTICO: Se a nova reserva NÃO está vinculada a um pedido PIX pendente,
                    // limpar o estado do pedido PIX anterior para permitir que o timer funcione
                    const isReservationLinkedToPixOrder = (createdReservation as any).orderId && 
                        order?._id && 
                        order.status === 'pending' && 
                        (order as any).paymentMethod === 'pix' &&
                        String((createdReservation as any).orderId) === String(order._id);
                    
                    if (!isReservationLinkedToPixOrder && order?._id) {
                        console.log('[ensureReservation] 🗑️ Nova reserva não vinculada a pedido PIX, limpando estado do pedido anterior:', {
                            reservationId: createdReservation._id,
                            reservationOrderId: (createdReservation as any).orderId,
                            currentOrderId: order._id,
                            currentOrderStatus: order.status,
                            currentOrderPaymentMethod: (order as any).paymentMethod,
                        });
                        // Limpar estado do pedido PIX anterior
                        persistOrder(null);
                        storageHelpers.clearActiveOrderId();
                        setPixResult(null);
                    }
                    
                    setReservation(createdReservation);
                    return createdReservation;
                }

                return null;
            } catch (error: any) {
                return null;
            } finally {
                creatingReservationRef.current = false;
            }
        },
        [summarizedCart, reservation, deviceId, order, persistOrder],
    );

    // Função para cancelar reserva
    const cancelReservation = useCallback(
        async (reservationId?: string) => {
            const reservationToCancel = reservationId || reservation?._id;
            if (!reservationToCancel) {
                return;
            }

            try {
                console.log('[cancelReservation] 🗑️ Cancelando reserva:', reservationToCancel);
                await api.delete(`/reservations/${reservationToCancel}`);
                console.log('[cancelReservation] ✅ Reserva cancelada');
                setReservation(null);
            } catch (error: any) {
                console.error('[cancelReservation] ⚠️ Erro ao cancelar reserva (ignorado):', error?.message);
                // Ignorar erros - reserva pode já ter sido cancelada ou expirado
                setReservation(null);
            }
        },
        [reservation],
    );

    const [cardStatus, setCardStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [cardStatusMessage, setCardStatusMessage] = useState('');
    const [cardStatusDetails, setCardStatusDetails] = useState<string[]>([]);

    // Modal de confirmação ao sair do checkout
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
    
    // Modal de reserva expirada
    const [showReservationExpiredModal, setShowReservationExpiredModal] = useState(false);

    // ============================================
    // DESATIVADO: Lógica de bloqueio e re-tentativa
    // Mantido para referência futura
    // ============================================
    // const [isCardBlocked, setIsCardBlocked] = useState(false);
    // const cardRedirectTimeoutRef = useRef<number | null>(null);
    // const cardBlockRedirectTimeoutRef = useRef<number | null>(null);
    // const blockCountdownIntervalRef = useRef<number | null>(null);
    // const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

    // Valores temporários para não quebrar o código
    const isCardBlocked = false;
    const cardRedirectTimeoutRef = useRef<number | null>(null);
    const cardBlockRedirectTimeoutRef = useRef<number | null>(null);
    const blockCountdownIntervalRef = useRef<number | null>(null);
    const redirectCountdown = null;
    const setRedirectCountdown = () => { };

    const greetingName = useMemo(() => {
        if (!user) return 'Bem-vindo';
        return `Bem-vindo, ${user.name}`;
    }, [user]);

    const [customerData, setCustomerData] = useState<CheckoutCustomerData>(() => storageHelpers.loadCustomerData());
    const [persistCustomerData, setPersistCustomerData] = useState(true);

    // Debounced save para customerData - salva 300ms após parar de digitar
    const debouncedSaveCustomerData = useMemo(
        () => debounce((data: CheckoutCustomerData) => {
            storageHelpers.saveCustomerData(data);
        }, 300),
        [],
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const existing = document.querySelector<HTMLScriptElement>('script[data-mp-security="true"]');
        if (existing) {
            // Device session já carregado
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.mercadopago.com/v2/security.js';
        script.async = true;
        script.setAttribute('view', 'checkout');
        script.setAttribute('data-mp-security', 'true');
        script.onload = () => {
            if (window.MP_DEVICE_SESSION_ID) {
                setDeviceId((prev) => {
                    if (prev === window.MP_DEVICE_SESSION_ID) {
                        return prev;
                    }
                    if (window.MP_DEVICE_SESSION_ID) {
                        storageHelpers.saveDeviceId(window.MP_DEVICE_SESSION_ID);
                        if (typeof window !== 'undefined') {
                            window.sessionStorage.setItem('checkout:mp-device', window.MP_DEVICE_SESSION_ID);
                        }
                    }
                    return window.MP_DEVICE_SESSION_ID || prev;
                });
            }
        };
        script.onerror = () => {
            // Erro silencioso - deviceId será obtido de outras fontes
        };
        document.body.appendChild(script);

        return () => {
            script.onload = null;
            script.onerror = null;
        };
    }, []);

    const refreshCart = useCallback(async () => {
        // CRÍTICO: Se a reserva expirou, não restaurar carrinho (deve estar vazio)
        if (reservationExpiredRef.current) {
            console.log('[refreshCart] ⚠️ Reserva expirada, não restaurar carrinho');
            setCartItems([]);
            setLoading(false);
            return;
        }
        
        const rawItems = loadCartItems().filter((item) => item.quantity > 0);
        setCartItems(rawItems);
        setLoading(false);
        const needsDetails = rawItems.filter(
            (item) =>
                !item.eventId ||
                item.platformFeePercentage === undefined ||
                item.ticketFee === undefined ||
                item.price === 0,
        );

        if (!needsDetails.length) return;

        try {
            const responses = await Promise.allSettled(
                needsDetails.map(async (item) => {
                    const response = await api.get(`/ticket-types/${item.id}`);
                    const ticketType = response.data?.data;
                    return {
                        id: item.id,
                        eventId: ticketType?.event?._id ?? ticketType?.event,
                        price: ticketType?.price ?? item.price,
                        ticketFee:
                            ticketType?.event?.ticketFee ??
                            ticketType?.ticketFee ??
                            item.ticketFee,
                        platformFeePercentage:
                            ticketType?.event?.platformFeePercentage ??
                            ticketType?.platformFeePercentage ??
                            item.platformFeePercentage,
                    };
                }),
            );

            const enriched = responses
                .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
                .map((result) => result.value);

            if (enriched.length) {
                setCartItems((prev) =>
                    prev.map((item) => {
                        const found = enriched.find((detail: any) => detail.id === item.id);
                        if (!found) return item;
                        return {
                            ...item,
                            eventId: found.eventId ?? item.eventId,
                            price: found.price ?? item.price,
                            ticketFee: found.ticketFee ?? item.ticketFee,
                            platformFeePercentage: found.platformFeePercentage ?? item.platformFeePercentage,
                        };
                    }),
                );
            }
        } catch (error) {
            // Ignorar erros ao atualizar dados dos ingressos
            console.log('[refreshCart] ⚠️ Erro ao atualizar detalhes dos ingressos (ignorado)');
        } finally {
            // Garantir que loading seja sempre false
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // CRÍTICO: Não restaurar carrinho se a reserva expirou
        if (!reservationExpiredRef.current) {
            refreshCart();
        } else {
            // Se expirou, garantir que carrinho está vazio
            setCartItems([]);
        }
    }, [refreshCart]);

    useEffect(() => {
        if (!user) return;
        setCustomerData((prev) => {
            const next = { ...prev };
            let changed = false;
            if (!next.name && user.name) {
                next.name = sanitizeInput(user.name);
                changed = true;
            }
            if (!next.email && user.email) {
                next.email = sanitizeInput(user.email).toLowerCase();
                changed = true;
            }
            if (!next.cpf && user.cpf) {
                next.cpf = formatCpfDisplay(user.cpf);
                changed = true;
            }
            if (!next.phone && user.phone) {
                next.phone = formatPhoneDisplay(user.phone);
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [user]);

    useEffect(() => {
        if (!persistCustomerData) return;
        // Usar debounce para evitar muitas escritas no localStorage
        debouncedSaveCustomerData(customerData);
    }, [customerData, persistCustomerData, debouncedSaveCustomerData]);

    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated) {
            router.replace('/login?redirect=/checkout');
        }
    }, [isReady, isAuthenticated, router]);

    const ensureDeviceIdAvailable = useCallback(
        async (forceReload = false, source: string = 'unknown') => {
            const resolveMaybePromise = async <T,>(value: T | Promise<T> | undefined | null): Promise<T | null> => {
                if (!value) return null;
                if (typeof (value as any).then === 'function') {
                    try {
                        return await (value as Promise<T>);
                    } catch {
                        return null;
                    }
                }
                return value as T;
            };

            if (!forceReload && deviceId) {
                return deviceId;
            }

            const stored = storageHelpers.loadDeviceId();
            if (stored && !forceReload) {
                setDeviceId(stored);
                return stored;
            }

            if (!forceReload && typeof window !== 'undefined' && window.MP_DEVICE_SESSION_ID) {
                setDeviceId(window.MP_DEVICE_SESSION_ID);
                storageHelpers.saveDeviceId(window.MP_DEVICE_SESSION_ID);
                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem('checkout:mp-device', window.MP_DEVICE_SESSION_ID);
                }
                return window.MP_DEVICE_SESSION_ID;
            }

            let candidate: string | null = null;

            if (!candidate && typeof window !== 'undefined' && window.MP_DEVICE_SESSION_ID) {
                candidate = window.MP_DEVICE_SESSION_ID;
            }

            if (
                !candidate &&
                typeof window !== 'undefined' &&
                (window as any).MercadoPago?.device?.getId
            ) {
                candidate = await resolveMaybePromise<string>((window as any).MercadoPago.device.getId());
            }

            if (candidate) {
                setDeviceId(candidate);
                storageHelpers.saveDeviceId(candidate);
                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem('checkout:mp-device', candidate);
                    window.MP_DEVICE_SESSION_ID = candidate;
                }
                return candidate;
            }

            if (process.env.NODE_ENV !== 'production') {
                let fallback: string;
                if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
                    fallback = `dev-device-${window.crypto.randomUUID()}`;
                } else {
                    fallback = `dev-device-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
                }
                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem('checkout:mp-device', fallback);
                    storageHelpers.saveDeviceId(fallback);
                    window.MP_DEVICE_SESSION_ID = fallback;
                }
                setDeviceId(fallback);
                return fallback;
            }

            return null;
        }, [deviceId]);

    useEffect(() => {
        let cancelled = false;
        const capture = async () => {
            const id = await ensureDeviceIdAvailable(false, 'mount');
            if (!cancelled && id) {
                setDeviceId(id);
            }
        };
        capture();
        return () => {
            cancelled = true;
        };
    }, [ensureDeviceIdAvailable]);

    useEffect(() => {
        if (deviceId) return;
        if (deviceChecks > 10) return;
        const timer = setTimeout(async () => {
            const id = await ensureDeviceIdAvailable(false, `retry-${deviceChecks + 1}`);
            if (!id) {
                setDeviceChecks((prev) => prev + 1);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [deviceId, deviceChecks, ensureDeviceIdAvailable]);



    const handleCustomerChange = (field: keyof CheckoutCustomerData, value: string) => {
        if (pixPaymentActive) {
            return;
        }
        setPersistCustomerData(true);
        setCustomerData((prev) => {
            const next = { ...prev };
            if (field === 'name') {
                next.name = sanitizeInput(value);
            } else if (field === 'email') {
                next.email = sanitizeInput(value).toLowerCase();
            } else if (field === 'cpf') {
                next.cpf = formatCpfDisplay(value);
            } else if (field === 'phone') {
                next.phone = formatPhoneDisplay(value);
            }
            return next;
        });
    };

    const validateCustomerData = useCallback(() => {
        setGlobalError('');
        const normalizedCpf = normalizeCpf(customerData.cpf);
        const normalizedPhone = normalizePhone(customerData.phone);

        if (!customerData.name.trim()) {
            setGlobalError('Informe o nome completo.');
            return false;
        }
        if (!customerData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
            setGlobalError('Informe um e-mail válido.');
            return false;
        }
        if (normalizedCpf.length !== 11) {
            setGlobalError('Informe um CPF válido (11 dígitos).');
            return false;
        }
        if (normalizedPhone.length < 10) {
            setGlobalError('Informe um telefone válido com DDD.');
            return false;
        }
        return true;
    }, [customerData]);

    const ensureSingleItem = useCallback(() => {
        const uniqueItems = new Set(summarizedCart.map((item) => item.id));
        if (uniqueItems.size > 1) {
            setGlobalError('O checkout atual processa um tipo de ingresso por vez. Remova itens adicionais para continuar.');
            return false;
        }
        return true;
    }, [summarizedCart]);

    const ensureOrder = useCallback(
        async (options: { allowReuse?: boolean } = {}) => {
            const { allowReuse = false } = options;
            console.log('[ensureOrder] 🔄 Iniciando ensureOrder...', { allowReuse, hasOrder: !!order });
            
            if (order) {
                console.log('[ensureOrder] ✅ Já tem pedido, retornando:', order._id);
                return order;
            }
            if (!primaryCartItem) {
                console.log('[ensureOrder] ❌ Sem primaryCartItem');
                throw new Error('Carrinho vazio.');
            }
            if (!primaryCartItem.eventId) {
                console.log('[ensureOrder] ❌ Sem eventId no primaryCartItem');
                throw new Error('Evento não identificado para este ingresso.');
            }
            if (!validateCustomerData()) {
                console.log('[ensureOrder] ❌ Dados do cliente inválidos');
                throw new Error('Dados do comprador inválidos.');
            }
            
            console.log('[ensureOrder] ✅ Validações passadas, criando pedido...');

            const normalizedCpf = normalizeCpf(customerData.cpf);
            const normalizedPhone = normalizePhone(customerData.phone);
            const formattedCpf = formatCpfDisplay(normalizedCpf);
            const formattedPhone = formatPhoneDisplay(normalizedPhone);

            try {
                console.log('[ensureOrder] 🌐 Criando pedido no backend...', {
                    eventId: primaryCartItem.eventId,
                    ticketTypeId: primaryCartItem.ticketTypeId ?? primaryCartItem.id,
                    quantity: primaryCartItem.quantity,
                    allowReuse,
                });
                
                const response = await api.post('/orders', {
                    eventId: primaryCartItem.eventId,
                    ticketTypeId: primaryCartItem.ticketTypeId ?? primaryCartItem.id,
                    quantity: primaryCartItem.quantity,
                    customerData: {
                        name: sanitizeInput(customerData.name),
                        email: sanitizeInput(customerData.email).toLowerCase(),
                        phone: formattedPhone,
                        cpf: formattedCpf,
                    },
                    allowReuse,
                });

                const createdOrder = response.data?.data?.order;
                const isReused = response.data?.data?.reused === true;
                const addedTickets = response.data?.data?.addedTickets === true;
                
                if (!createdOrder?._id) {
                    console.log('[ensureOrder] ❌ Pedido não criado na resposta');
                    throw new Error('Não foi possível criar o pedido.');
                }

                // Log importante: mostrar se foi criado novo, reutilizado ou adicionado ingressos
                if (addedTickets) {
                    console.log('[ensureOrder] ➕ INGRESSOS ADICIONADOS AO PEDIDO PIX EXISTENTE:', {
                        orderId: createdOrder._id,
                        orderNumber: createdOrder.orderNumber,
                        status: createdOrder.status,
                        totalTickets: createdOrder.totalTickets,
                    });
                } else if (isReused) {
                    console.log('[ensureOrder] ♻️ PEDIDO REUTILIZADO:', {
                        orderId: createdOrder._id,
                        orderNumber: createdOrder.orderNumber,
                        status: createdOrder.status,
                        createdAt: createdOrder.createdAt,
                    });
                } else {
                    console.log('[ensureOrder] 🆕 NOVO PEDIDO CRIADO:', {
                        orderId: createdOrder._id,
                        orderNumber: createdOrder.orderNumber,
                        status: createdOrder.status,
                    });
                }

                // IMPORTANTE: Se criou novo pedido (não reutilizou e não adicionou ingressos), limpar pedido antigo do sessionStorage
                // Isso evita conflitos quando usuário volta ao carrinho após criar novo pedido
                // Se adicionou ingressos ao pedido PIX existente, manter o activeOrderId
                if (!isReused && !addedTickets) {
                    const oldActiveOrderId = storageHelpers.loadActiveOrderId();
                    console.log('[ensureOrder] 🗑️ Novo pedido criado, limpando activeOrderId antigo:', oldActiveOrderId);
                    storageHelpers.clearActiveOrderId();
                }

                // Salvar no cache quando criar/reutilizar pedido
                const cacheKey = `order-${createdOrder._id}`;
                apiCache.set(cacheKey, createdOrder, 5000);
                console.log('[ensureOrder] 💾 Pedido salvo no cache:', createdOrder._id);

                persistOrder(createdOrder);
                console.log('[ensureOrder] ✅ Pedido persistido:', createdOrder._id);
                return createdOrder;
            } catch (error: any) {
                const status = error?.response?.status;
                console.error('[ensureOrder] ❌ Erro ao criar pedido:', { 
                    status, 
                    message: error?.message,
                    responseData: error?.response?.data 
                });
                
                // Para erro 429, não mostrar mensagem aqui - será tratado pelo AutoCreateOrder ou pelo handler de pagamento
                // Para outros erros, mostrar mensagem normalmente
                if (status !== 429) {
                const message =
                    error?.response?.data?.message ||
                    (Array.isArray(error?.response?.data?.errors) ? error.response.data.errors.join(', ') : undefined) ||
                    error?.message ||
                    'Não foi possível criar o pedido. Tente novamente.';
                setGlobalError(message);
                }
                throw error;
            }
        },
        [customerData, order, persistOrder, primaryCartItem, validateCustomerData],
    );

    const handleRemoveItem = useCallback(
        (id: string) => {
            if (pixPaymentActive) return;
            removeCartItemFromStorage(id);
            persistOrder(null);
            setPixResult(null);
            setGlobalSuccess('');
            refreshCart();
        },
        [pixPaymentActive, refreshCart, persistOrder],
    );

    const resetCheckoutState = useCallback(() => {
        clearCartItems();
        setCartItems([]);
        persistOrder(null);
        setPixResult(null);
        setGlobalError('');
        storageHelpers.clearCustomerData();
        storageHelpers.clearActiveOrderId();
        // Limpar cache quando resetar estado
        apiCache.clear();
    }, [persistOrder]);

    const handleStartNewOrder = useCallback(() => {
        if (typeof window !== 'undefined') {
            if (cardRedirectTimeoutRef.current) {
                window.clearTimeout(cardRedirectTimeoutRef.current);
                cardRedirectTimeoutRef.current = null;
            }
            if (cardBlockRedirectTimeoutRef.current) {
                window.clearTimeout(cardBlockRedirectTimeoutRef.current);
                cardBlockRedirectTimeoutRef.current = null;
            }
        }
        if (blockCountdownIntervalRef.current) {
            window.clearInterval(blockCountdownIntervalRef.current);
            blockCountdownIntervalRef.current = null;
        }
        clearCartItems();
        storageHelpers.clearCustomerData();
        storageHelpers.clearActiveOrderId();
        // Limpar cache ao iniciar novo pedido
        apiCache.clear();
        // DESATIVADO: setRedirectCountdown(null);
        // DESATIVADO: setIsCardBlocked(false);
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        } else {
            router.push('/');
        }
    }, [router]);

    // Função auxiliar para resetar o status e campos do card
    const resetCardStatusAndFields = useCallback(() => {
        // Limpar timeouts (mantido para evitar memory leaks)
        if (typeof window !== 'undefined') {
            if (cardRedirectTimeoutRef.current) {
                window.clearTimeout(cardRedirectTimeoutRef.current);
                cardRedirectTimeoutRef.current = null;
            }
            if (cardBlockRedirectTimeoutRef.current) {
                window.clearTimeout(cardBlockRedirectTimeoutRef.current);
                cardBlockRedirectTimeoutRef.current = null;
            }
        }
        if (blockCountdownIntervalRef.current) {
            window.clearInterval(blockCountdownIntervalRef.current);
            blockCountdownIntervalRef.current = null;
        }

        // Resetar status para permitir nova tentativa
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
        setIsProcessing(false);

        // Limpar dados do Brick para permitir novo submit
        if (typeof window !== 'undefined') {
            const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
            if (form) {
                // Limpar dados do Brick
                if ((form as any).__brickData) {
                    delete (form as any).__brickData;
                }

                // IMPORTANTE: Resetar o formulário para permitir novo submit
                // Isso força o Brick a permitir uma nova tentativa
                form.reset();

                // Forçar reset do Brick se a função global existir
                // Isso re-renderiza o Brick internamente para limpar estado de erro
                if (window.__MP_BRICK_RESET__) {
                    setTimeout(() => {
                        window.__MP_BRICK_RESET__?.();
                    }, 200);
                }
            }
        }
    }, []);

    const handleDismissCardStatus = useCallback(() => {
        // Resetar status do card manualmente (quando usuário clica no botão)
        resetCardStatusAndFields();
    }, [resetCardStatusAndFields]);

    const navigateToOrders = useCallback(() => {
        if (typeof window !== 'undefined') {
            if (cardRedirectTimeoutRef.current) {
                window.clearTimeout(cardRedirectTimeoutRef.current);
                cardRedirectTimeoutRef.current = null;
            }
            if (pixRedirectTimeoutRef.current) {
                window.clearTimeout(pixRedirectTimeoutRef.current);
                pixRedirectTimeoutRef.current = null;
            }
            if (blockCountdownIntervalRef.current) {
                window.clearInterval(blockCountdownIntervalRef.current);
                blockCountdownIntervalRef.current = null;
            }
        }
        // Limpar estados antes de redirecionar
        // DESATIVADO: setRedirectCountdown(null);
        persistOrder(null);
        setPixResult(null);
        clearCartItems();
        setCartItems([]);
        router.push('/dashboard');
    }, [router, persistOrder]);

    useEffect(
        () => () => {
            if (typeof window !== 'undefined' && cardRedirectTimeoutRef.current) {
                window.clearTimeout(cardRedirectTimeoutRef.current);
            }
            if (typeof window !== 'undefined' && cardBlockRedirectTimeoutRef.current) {
                window.clearTimeout(cardBlockRedirectTimeoutRef.current);
            }
            if (blockCountdownIntervalRef.current) {
                window.clearInterval(blockCountdownIntervalRef.current);
            }
        },
        [],
    );

    const finalizeSuccess = useCallback(
        (
            message: string,
            options: { preserveCartState?: boolean; showGlobalMessage?: boolean } = {},
        ) => {
            const { preserveCartState = false, showGlobalMessage = true } = options;
            setPersistCustomerData(false);
            clearCartItems();
            storageHelpers.clearCustomerData();
            if (!preserveCartState) {
                setCartItems([]);
            }
            if (showGlobalMessage) {
                setGlobalSuccess(message);
            } else {
                setGlobalSuccess('');
            }
            setGlobalError('');
        },
        [],
    );

    const getStoredToken = useCallback(() => {
        if (typeof window === 'undefined') return null;
        return (
            localStorage.getItem('accessToken') ||
            sessionStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            null
        );
    }, []);

    const cancelPendingOrder = useCallback(
        async (orderId: string, opts?: { keepalive?: boolean; reason?: string }) => {
            if (!orderId) return;
            const reason = opts?.reason ?? 'checkout_card_abandoned';
            console.log('[cancelPendingOrder] 🗑️ Cancelando pedido...', { orderId, reason, keepalive: opts?.keepalive });
            const token = getStoredToken();

            if (opts?.keepalive && typeof fetch !== 'undefined') {
                const baseUrl = api.defaults.baseURL || '';
                try {
                    await fetch(`${baseUrl}/orders/${orderId}/cancel`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ reason }),
                        keepalive: true,
                    });
                } catch (error) {
                    // Erro no keepalive - ignorar
                }
                return;
            }

            try {
                await api.post(`/orders/${orderId}/cancel`, { reason });
                console.log('[cancelPendingOrder] ✅ Pedido cancelado com sucesso:', orderId);
            } catch (error) {
                console.log('[cancelPendingOrder] ⚠️ Erro ao cancelar pedido (ignorado):', orderId);
                // Ignorar erros ao cancelar pedido pendente
            }
        },
        [getStoredToken],
    );

    const cardPaymentSettledRef = useRef(false);
    useEffect(() => {
        cardPaymentSettledRef.current = cardStatus === 'success';
    }, [cardStatus]);

    // Refs para controle de criação automática de pedido
    const creatingOrderRef = useRef(false);
    const orderCreatedRef = useRef(false);
    const rateLimitRef = useRef<number | null>(null); // Timestamp da última tentativa com erro 429
    const rateLimitIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval para atualizar mensagem de rate limit
    const lastRateLimitMessageRef = useRef<string>(''); // Última mensagem de rate limit para evitar atualizações desnecessárias

    // 🔴 Função centralizada de cleanup - pode ser chamada de qualquer lugar
    // Garante que tudo é limpo quando sai do checkout (navegação, desmontagem, etc)
    const cleanupCheckout = useCallback((immediate = false) => {
        const orderIdBeforeCleanup = order?._id;
        const activeOrderIdBeforeCleanup = storageHelpers.loadActiveOrderId();
        console.log('[cleanupCheckout] 🧹 Limpando checkout completamente...', {
            orderId: orderIdBeforeCleanup,
            orderNumber: order?.orderNumber,
            activeOrderId: activeOrderIdBeforeCleanup,
            immediate,
        });
        
        // Limpar timeouts e intervals
        if (cardRedirectTimeoutRef.current) {
            window.clearTimeout(cardRedirectTimeoutRef.current);
            cardRedirectTimeoutRef.current = null;
        }
        if (cardBlockRedirectTimeoutRef.current) {
            window.clearTimeout(cardBlockRedirectTimeoutRef.current);
            cardBlockRedirectTimeoutRef.current = null;
        }
        if (blockCountdownIntervalRef.current) {
            window.clearInterval(blockCountdownIntervalRef.current);
            blockCountdownIntervalRef.current = null;
        }
        if (pixRedirectTimeoutRef.current) {
            window.clearTimeout(pixRedirectTimeoutRef.current);
            pixRedirectTimeoutRef.current = null;
        }
        if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
        }

        // Limpar estados de UI
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
        setPixStatus('idle');
        setPixStatusMessage('');
        setGlobalError('');
        setGlobalSuccess('');
        setIsProcessing(false);
        
        // CRÍTICO: Limpar estado do Brick para permitir novo submit
        if (typeof window !== 'undefined') {
            const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
            if (form) {
                delete (form as any).__brickData;
            }
        }
        
        // Limpar dados do pedido
        persistOrder(null);
        setPixResult(null);
        
        // Cancelar APENAS a reserva específica ao sair do checkout (exceto F5)
        // CRÍTICO: NÃO cancelar reserva se tem pedido PIX pendente (pedido já "segura" estoque)
        const hasPixPendingOrder = order?._id && order.status === 'pending' && (order as any).paymentMethod === 'pix';
        if (!immediate && !pixPaymentActive && !hasPixPendingOrder) {
            // immediate=true significa que é F5 ou desmontagem, não cancelar reserva
            // immediate=false significa que é navegação, cancelar APENAS a reserva específica
            // Mas só cancelar se NÃO tem pedido PIX pendente
            if (reservation?._id) {
                // CRÍTICO: Marcar que está cancelando para bloquear criação de novas reservas
                cancelingReservationsRef.current = true;
                
                // IMPORTANTE: Cancelar APENAS a reserva específica, não todas
                cancelReservation(reservation._id).then(() => {
                    // Só limpar estado após confirmar cancelamento
                    setReservation(null);
                    reservationRestoredRef.current = false; // Resetar flag - impede restaurar após cancelar
                    wasOnCheckoutRef.current = false; // Resetar flag de checkout
                    creatingReservationRef.current = false; // Resetar flag de criação
                    cancelingReservationsRef.current = false; // Liberar bloqueio de criação
                }).catch(() => {
                    // Mesmo com erro, limpar estado local
                    setReservation(null);
                    reservationRestoredRef.current = false;
                    wasOnCheckoutRef.current = false;
                    creatingReservationRef.current = false;
                    cancelingReservationsRef.current = false; // Liberar bloqueio mesmo com erro
                });
            } else {
                // Se não tem reserva específica, limpar estado mesmo assim
                setReservation(null);
                reservationRestoredRef.current = false;
                wasOnCheckoutRef.current = false;
                creatingReservationRef.current = false;
                cancelingReservationsRef.current = false;
            }
        } else if (pixPaymentActive || hasPixPendingOrder) {
            // Se tem PIX pendente, não cancelar reserva mas limpar estado local se necessário
            console.log('[cleanupCheckout] ✅ Tem pedido PIX pendente, não cancelando reserva');
        }
        
        // Limpar sessionStorage
        storageHelpers.clearActiveOrderId();
        
        // Limpar cache
        apiCache.clear();
        
        // Resetar flags de criação de pedido para permitir nova criação
        creatingOrderRef.current = false;
        orderCreatedRef.current = false;
        rateLimitRef.current = null; // Limpar rate limit ao sair do checkout
        setRateLimitActive(false); // Limpar estado de rate limit
        lastRateLimitMessageRef.current = ''; // Limpar ref de mensagem
        if (rateLimitIntervalRef.current) {
            clearInterval(rateLimitIntervalRef.current);
            rateLimitIntervalRef.current = null;
        }
        
        // Limpar dados do formulário do Brick
        if (typeof window !== 'undefined') {
            const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
            if (form && (form as any).__brickData) {
                delete (form as any).__brickData;
            }
        }
        
        // Resetar Brick se disponível
        if (typeof window !== 'undefined' && window.__MP_BRICK_RESET__) {
            try {
                window.__MP_BRICK_RESET__();
            } catch (error) {
                // Erro silencioso
            }
        }
    }, [persistOrder]);

    const wasOnCheckoutRef = useRef<boolean>(pathname?.startsWith('/checkout') ?? false);
    const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modalShownRef = useRef<boolean>(false);

    // Interceptar navegação (mas NÃO F5 - deixar recarregar normalmente)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Função auxiliar para verificar se deve mostrar modal
        const shouldShowModal = () => {
            // CRÍTICO: Se tem pedido PIX pendente, NÃO mostrar modal nem cancelar reserva
            // O pedido PIX já está "segurando" o estoque pelo tempo de expiração do PIX
            if (pixPaymentActive || (order?._id && order.status === 'pending' && (order as any).paymentMethod === 'pix')) {
                return false; // Não mostrar modal se tem PIX pendente
            }
            
            // Verificar tanto estado quanto storage
            const hasOrderInState = order?._id && (order.status === 'pending' || order.status === 'failed') && !pixPaymentActive;
            const hasActiveOrderInStorage = storageHelpers.loadActiveOrderId() !== null;
            // Também mostrar modal se há reserva ativa (reserva "segura" estoque)
            const hasActiveReservation = reservation?._id && reservation.isActive && new Date(reservation.expiresAt) > new Date();
            return hasOrderInState || hasActiveOrderInStorage || hasActiveReservation;
        };

        // Interceptar cliques em links (incluindo logo)
        const handleLinkClick = (e: MouseEvent) => {
            // Verificar se deve mostrar modal - verificar a cada clique
            if (!shouldShowModal()) return;

            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement;

            if (link) {
                const href = link.getAttribute('href');
                // Se o link não é do checkout, mostrar modal
                if (href && !href.startsWith('/checkout') && !href.startsWith('#')) {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingNavigation(href);
                    setShowLeaveModal(true);
                }
            }
        };

        // Interceptar navegação via browser (back/forward)
        const handlePopState = (e: PopStateEvent) => {
            if (shouldShowModal() && !pathname?.startsWith('/checkout')) {
                e.preventDefault();
                window.history.pushState(null, '', pathname);
                setShowLeaveModal(true);
            }
        };

        // Apenas interceptar cliques em links (F5 deixa recarregar normalmente)
        document.addEventListener('click', handleLinkClick, true); // Use capture phase
        window.addEventListener('popstate', handlePopState);

        return () => {
            document.removeEventListener('click', handleLinkClick, true);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [order, pixPaymentActive, pathname, reservation]);

    useEffect(() => {
        const isOnCheckout = pathname?.startsWith('/checkout') ?? false;

        // CRÍTICO: Atualizar wasOnCheckoutRef ANTES de qualquer outra lógica
        // Isso previne que AutoCreateReservation execute durante transição
        const wasOnCheckoutBefore = wasOnCheckoutRef.current;
        wasOnCheckoutRef.current = isOnCheckout;

        if (cleanupTimeoutRef.current && !isOnCheckout) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
        }

        // Se saiu do checkout, verificar se deve mostrar modal ANTES de limpar
        if (wasOnCheckoutBefore && !isOnCheckout && !showLeaveModal && !modalShownRef.current) {
            // CRÍTICO: Se tem pedido PIX pendente, NÃO mostrar modal nem cancelar reserva
            // O pedido PIX já está "segurando" o estoque pelo tempo de expiração do PIX
            const hasPixPendingOrder = pixPaymentActive || (order?._id && order.status === 'pending' && (order as any).paymentMethod === 'pix');
            
            if (hasPixPendingOrder) {
                console.log('[Navigation] ✅ Tem pedido PIX pendente, permitindo navegação sem modal');
                // Não fazer nada - permitir navegação livre quando tem PIX pendente
                return;
            }
            
            // Verificar se há pedido ativo (no estado ou no storage) OU reserva ativa
            const hasOrderInState = order?._id && (order.status === 'pending' || order.status === 'failed') && !pixPaymentActive;
            const hasActiveOrderInStorage = storageHelpers.loadActiveOrderId() !== null;
            const hasActiveReservation = reservation?._id && reservation.isActive && new Date(reservation.expiresAt) > new Date();
            
            console.log('[Navigation] 🔍 Verificando se deve mostrar modal:', {
                wasOnCheckout: wasOnCheckoutRef.current,
                isOnCheckout,
                showLeaveModal,
                modalShown: modalShownRef.current,
                hasOrderInState,
                hasActiveOrderInStorage,
                hasActiveReservation,
                orderId: order?._id,
                orderStatus: order?.status,
                reservationId: reservation?._id,
                pixPaymentActive,
                pathname,
            });
            
            if (hasOrderInState || hasActiveOrderInStorage || hasActiveReservation) {
                // Mostrar modal ao invés de limpar imediatamente
                console.log('[Navigation] 🚪 Usuário saiu do checkout, mostrando modal...', {
                    orderId: order?._id,
                    orderNumber: order?.orderNumber,
                    reservationId: reservation?._id,
                    destination: pathname,
                });
                modalShownRef.current = true;
                setPendingNavigation(pathname || '/');
                setShowLeaveModal(true);
                // Voltar para checkout temporariamente até o usuário decidir
                // Usar replace para não adicionar ao histórico
                router.replace('/checkout');
                return;
            }
            
            // Se não há pedido ativo, limpar normalmente
            // CRÍTICO: Marcar que está cancelando ANTES de chamar cleanupCheckout
            cancelingReservationsRef.current = true;
            
            if (order?._id && (order.status === 'pending' || order.status === 'failed') && !pixPaymentActive) {
                // Cancelar no backend (mas não esperar - usar keepalive se possível)
                cancelPendingOrder(order._id, { reason: 'checkout_navigation_abandoned', keepalive: true });
            }
            // Limpar TUDO: sessionStorage, estado, cache, form, etc.
            // cleanupCheckout já cancela todas as reservas automaticamente
            cleanupCheckout(false);
        }

        // Resetar ref quando voltar para checkout
        if (isOnCheckout) {
            modalShownRef.current = false;
        }
        // NOTA: wasOnCheckoutRef já foi atualizado no início do useEffect (linha 1333)
    }, [pathname, cleanupCheckout, order, pixPaymentActive, showLeaveModal, cancelPendingOrder, router, reservation]);

    // Cleanup ao desmontar componente (quando usuário navega para outra página)
    useEffect(() => {
        return () => {
            // Limpar estado de processamento ao desmontar
            setIsProcessing(false);
            setCardStatus('idle');
            setCardStatusMessage('');
            setCardStatusDetails([]);
            
            // Limpar dados do Brick
            if (typeof window !== 'undefined') {
                const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
                if (form) {
                    delete (form as any).__brickData;
                }
            }
        };
    }, []);

    // REMOVIDO: Interceptação do F5
    // Agora o F5 recarrega normalmente e o pedido/timer são restaurados automaticamente
    // O beforeunload só é usado para navegação (fechar aba, etc) - não para F5

    // Auto-reset após erro: limpar campos automaticamente após 10 segundos
    const autoResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        // Limpar timeout anterior se existir
        if (autoResetTimeoutRef.current) {
            clearTimeout(autoResetTimeoutRef.current);
            autoResetTimeoutRef.current = null;
        }

        // Se houver erro, agendar reset automático após 10 segundos
        if (cardStatus === 'error') {
            autoResetTimeoutRef.current = setTimeout(() => {
                resetCardStatusAndFields();
                autoResetTimeoutRef.current = null;
            }, 10000); // 10 segundos
        }

        // Cleanup: limpar timeout se o componente desmontar ou status mudar
        return () => {
            if (autoResetTimeoutRef.current) {
                clearTimeout(autoResetTimeoutRef.current);
                autoResetTimeoutRef.current = null;
            }
        };
    }, [cardStatus, resetCardStatusAndFields]);

    const handleCardPayment = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            setGlobalError('');
            setGlobalSuccess('');
            setPixResult(null);
            setCardStatusDetails([]);

            if (!ensureSingleItem()) {
                setCardStatus('idle');
                return;
            }
            if (!primaryCartItem) {
                setGlobalError('Seu carrinho está vazio.');
                setCardStatus('idle');
                return;
            }
            if (primaryCartItem.quantity <= 0) {
                setGlobalError('Selecione pelo menos 1 ingresso para continuar.');
                setCardStatus('idle');
                return;
            }

            // Buscar dados do Brick
            const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
            const brickData = form ? (form as any).__brickData : null;

            console.log('[handleCardPayment] 🔍 Verificando dados do Brick:', {
                formExists: !!form,
                brickDataExists: !!brickData,
                brickData: brickData,
            });

            if (!brickData || !brickData.token) {
                console.error('[handleCardPayment] ❌ Dados do Brick não encontrados ou token ausente');
                setGlobalError('O formulário de cartão ainda não está pronto. Aguarde alguns segundos e tente novamente.');
                setCardStatus('idle');
                setIsProcessing(false);
                return;
            }

            if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
                setCardStatusDetails([
                    'O Mercado Pago exige conexão segura (HTTPS) para processar cartões. Acesse o checkout via https:// para continuar.',
                ]);
                setCardStatus('error');
                setCardStatusMessage('Conexão insegura detectada');
                setIsProcessing(false);
                return;
            }

            const currentDeviceId = await ensureDeviceIdAvailable(deviceId !== null, 'card-submit');
            if (!currentDeviceId) {
                setCardStatusDetails([
                    'Não foi possível obter o deviceId do Mercado Pago. Recarregue a página (em HTTPS) e tente novamente.',
                ]);
                setCardStatus('error');
                setCardStatusMessage('Erro ao obter deviceId');
                setIsProcessing(false);
                return;
            }

            let createdOrder: CreatedOrder | null = null;

            try {
                // DESATIVADO: Deixar MP gerenciar o estado de processamento
                // setIsProcessing(true);
                // setCardStatus('processing');
                // setCardStatusMessage('Estamos processando seu pagamento com segurança...');


                const token = brickData.token;
                const installments = Number(brickData.installments || 1);
                const paymentMethodId = brickData.paymentMethodId || '';
                const issuerId = brickData.issuerId || '';

                console.log('[handleCardPayment] 📦 Dados extraídos do Brick:', {
                    token: token ? `${token.substring(0, 10)}...` : 'N/A',
                    installments,
                    paymentMethodId,
                    issuerId,
                });

                // Validar paymentMethodId antes de enviar
                if (!paymentMethodId) {
                    console.error('[handleCardPayment] ❌ PaymentMethodId não encontrado nos dados do Brick');
                    // PaymentMethodId não encontrado - mostrar erro ao usuário
                    setCardStatusDetails(['Método de pagamento não foi identificado. Verifique os dados do cartão e tente novamente.']);
                    setCardStatus('error');
                    setCardStatusMessage('Dados do cartão incompletos');
                    setIsProcessing(false);
                    return;
                }

                // IMPORTANTE: Criar pedido SOMENTE quando usuário tenta pagar (não automaticamente)
                // Tentar reutilizar pedido existente se ainda houver tentativas disponíveis
                // Isso permite que o usuário corrija erros (ex: CVV errado) sem criar novo pedido
                const currentOrder = order;
                const canReuseOrder = Boolean(
                    currentOrder?._id &&
                    (currentOrder.status === 'failed' || currentOrder.status === 'pending') &&
                    (currentOrder.cardAttempts || 0) < 3 // MAX_CARD_PAYMENT_ATTEMPTS = 3
                );

                // Criar pedido como PENDING temporariamente para processar pagamento
                // Se pagamento aprovado, backend atualiza para PAID automaticamente
                createdOrder = await ensureOrder({ allowReuse: canReuseOrder });
                if (!createdOrder?._id) {
                    throw new Error('Não foi possível criar o pedido para processar o pagamento.');
                }

                // Cancelar reserva após criar pedido (pedido agora "segura" o estoque)
                if (reservation?._id) {
                    console.log('[handleCardPayment] 🗑️ Cancelando reserva após criar pedido:', reservation._id);
                    await cancelReservation(reservation._id).catch(() => {
                        // Ignorar erro - reserva pode já ter sido cancelada
                    });
                }

                const brickCardholder = brickData.cardholder;

                // Validar dados do cardholder antes de enviar
                const cardholderName = brickCardholder?.name || customerData.name || '';
                const cardholderEmail = brickCardholder?.email || customerData.email || '';
                const identificationType = brickCardholder?.identification?.type || 'CPF';
                const identificationNumber = brickCardholder?.identification?.number || normalizeCpf(customerData.cpf) || '';

                if (!cardholderName.trim() || !cardholderEmail.trim() || !identificationNumber.trim()) {
                    // Dados do cardholder incompletos - mostrar erro ao usuário
                    setCardStatusDetails(['Por favor, preencha todos os dados do titular do cartão corretamente.']);
                    setCardStatus('error');
                    setCardStatusMessage('Dados do titular incompletos');
                    setIsProcessing(false);
                    // Limpar dados inválidos
                    if (typeof window !== 'undefined') {
                        const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
                        if (form && (form as any).__brickData) {
                            delete (form as any).__brickData;
                        }
                    }
                    return;
                }

                const payload = {
                    token,
                    paymentMethodId,
                    installments,
                    issuerId: issuerId || undefined,
                    cardholder: {
                        name: cardholderName.trim(),
                        email: cardholderEmail.trim(),
                        identification: {
                            type: identificationType,
                            number: identificationNumber.replace(/\D/g, ''), // Apenas números
                        },
                    },
                };

                // Capturar resposta da API para verificar status do pagamento
                const response = await api.post(`/payments/${createdOrder._id}/card`, payload, {
                    headers: {
                        'X-meli-session-id': currentDeviceId,
                    },
                });

                const paymentData = response.data?.data;
                const paymentStatus = paymentData?.status?.toLowerCase();
                const statusInfo = paymentData?.statusInfo;
                const internalStatus = statusInfo?.internalStatus || paymentStatus;

                // Atualizar cache do pedido após pagamento
                const cacheKey = `order-${createdOrder._id}`;
                if (paymentData?.order?._id) {
                    apiCache.set(cacheKey, paymentData.order, 5000);
                }

                // Verificar se o pagamento foi realmente aprovado
                if (internalStatus === 'paid' || paymentStatus === 'approved' || paymentStatus === 'accredited') {

                    // PAGAMENTO APROVADO - pedido já foi atualizado para PAID pelo backend
                    console.log('[handleCardPayment] ✅ Pagamento aprovado, pedido criado como PAID:', createdOrder._id);

                    // PAGAMENTO APROVADO - mostrar mensagem de sucesso
                    setCardStatus('success');
                    setCardStatusMessage('Seu pagamento foi aprovado e seu ingresso já está disponível, vamos te levar pra lá.');
                    setCardStatusDetails(['Seu pagamento foi aprovado e seu ingresso já está disponível, vamos te levar pra lá.']);

                    // Limpar sessionStorage e carrinho imediatamente quando pagamento é aprovado
                    storageHelpers.clearActiveOrderId();
                    clearCartItems();
                    persistOrder(null);
                    setPixResult(null);
                    setReservation(null); // Limpar reserva também

                    // DESATIVADO: Countdown automático - deixar usuário decidir quando navegar
                    // setRedirectCountdown(5);
                    // blockCountdownIntervalRef.current = window.setInterval(...);
                    // cardRedirectTimeoutRef.current = window.setTimeout(() => navigateToOrders(), 5000);
                } else {

                    // DESATIVADO: Deixar MP gerenciar completamente o estado
                    // Não setar nenhum status - o MP vai mostrar seu próprio overlay
                    const userMessage = statusInfo?.userMessage || 'Pagamento processado. Aguardando confirmação...';
                    const requiresAction = statusInfo?.requiresAction || false;

                    if (requiresAction || internalStatus === 'pending' || internalStatus === 'in_process') {
                        // Pagamento pendente - MP vai gerenciar
                        // DESATIVADO: setCardStatus('processing');
                        // DESATIVADO: setCardStatusMessage(userMessage);
                    } else {
                        // Pagamento recusado - deixar MP mostrar o erro
                        throw new Error(userMessage || 'Pagamento não foi aprovado. Verifique os dados e tente novamente.');
                    }
                }
            } catch (error: any) {
                // Log apenas erros críticos
                if (error?.response?.status >= 500) {
                    console.error('[handleCardPayment] Erro do servidor:', error?.message);
                }

                // DESATIVADO: Lógica de tentativas e bloqueio
                // const attemptsValueRaw = error?.response?.data?.cardAttempts;
                // const maxAttemptsValueRaw = error?.response?.data?.maxCardAttempts;
                // const attemptsValue = Number(attemptsValueRaw);
                // const maxAttemptsValue = Number(maxAttemptsValueRaw);
                // const hasAttemptInfo = Number.isFinite(attemptsValue) && Number.isFinite(maxAttemptsValue) && maxAttemptsValue > 0;
                // const attemptDescription = hasAttemptInfo ? ... : undefined;

                // DESATIVADO: Bloqueio automático em caso de 429
                // Deixar o Mercado Pago gerenciar o fluxo completo
                if (error?.response?.status === 429) {
                    // STATUS 429 - Limite de tentativas excedido

                    const backendLimitMessage =
                        error?.response?.data?.message ||
                        'Você excedeu o número máximo de tentativas para este pedido.';

                    // DESATIVADO: Deixar MP gerenciar completamente o erro 429
                    // Status 429 - MP gerencia o fluxo
                    // setCardStatus('error');
                    // setCardStatusMessage(backendLimitMessage);
                    // setCardStatusDetails([backendLimitMessage]);
                    // setIsProcessing(false);

                    return;
                }
                const collectedMessages: string[] = [];
                if (error?.response?.data?.errors) {
                    const rawErrors = Array.isArray(error.response.data.errors)
                        ? error.response.data.errors
                        : [error.response.data.errors];

                    rawErrors.forEach((err: any) => {
                        const code = String(err?.code || '').toUpperCase();
                        const fallbackMessage = typeof err?.message === 'string' ? err.message : undefined;
                        const mapped = CARD_ERROR_CODE_MAP[code];
                        if (mapped) {
                            collectedMessages.push(mapped.message);
                        } else if (fallbackMessage) {
                            collectedMessages.push(fallbackMessage);
                        }
                        if (Array.isArray(err?.details)) {
                            err.details.forEach((detail: any) => {
                                if (typeof detail === 'string') {
                                    collectedMessages.push(detail);
                                }
                            });
                        }
                    });
                }

                const backendErrors = error?.response?.data?.errors;
                const backendMessages: string[] = Array.isArray(backendErrors)
                    ? backendErrors.reduce<string[]>((acc, item) => {
                        if (typeof item === 'string') {
                            acc.push(item);
                        } else if (item && typeof item.message === 'string') {
                            acc.push(item.message);
                        }
                        return acc;
                    }, [])
                    : [];

                const combinedMessages = Array.from(
                    new Set(
                        [
                            error?.response?.data?.message,
                            ...(backendMessages || []),
                            ...collectedMessages,
                        ].filter((msg): msg is string => Boolean(msg)),
                    ),
                );

                const filteredMessages = combinedMessages.filter((msg) => {
                    const normalized = msg.trim().toLowerCase();
                    return normalized && !['the following transactions failed', 'failed'].includes(normalized);
                });
                const displayMessages = filteredMessages.length ? filteredMessages : combinedMessages;

                const message =
                    displayMessages[0] ||
                    error?.message ||
                    'Não foi possível processar o pagamento. Verifique os dados e tente novamente.';

                // DESATIVADO: Lógica de bloqueio e countdown
                // setGlobalError('');
                // setIsCardBlocked(false);
                // setRedirectCountdown(null);
                // if (blockCountdownIntervalRef.current) { ... }
                // if (cardBlockRedirectTimeoutRef.current) { ... }

                // Erro de backend - mostrar mensagem inline

                // Erros de BACKEND precisam ser mostrados por nós
                // MP só gerencia erros internos (validação, tokenização)
                setGlobalError('');

                // Adicionar informação sobre tentativas restantes na mensagem
                const cardAttempts = createdOrder?.cardAttempts || 0;
                const maxAttempts = 3; // MAX_CARD_PAYMENT_ATTEMPTS
                const remainingAttempts = maxAttempts - cardAttempts;
                const attemptsInfo = remainingAttempts > 0
                    ? ` Você ainda tem ${remainingAttempts} ${remainingAttempts === 1 ? 'tentativa' : 'tentativas'} restante${remainingAttempts === 1 ? '' : 's'}.`
                    : '';

                const messageWithAttempts = message + attemptsInfo;

                setCardStatusDetails(displayMessages);
                setCardStatus('error');
                setCardStatusMessage(messageWithAttempts);

                // Manter o pedido para permitir nova tentativa (se ainda houver tentativas)
                if (createdOrder?._id && remainingAttempts > 0) {
                    persistOrder(createdOrder);
                }

                // Limpar dados do Brick para permitir novo submit
                if (typeof window !== 'undefined') {
                    const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
                    if (form) {
                        // Limpar dados do Brick para nova tentativa
                        if ((form as any).__brickData) {
                            delete (form as any).__brickData;
                        }

                        // IMPORTANTE: Resetar o formulário para limpar estado interno
                        // Isso ajuda o Brick a permitir nova tentativa
                        form.reset();
                    }
                }

                // Erro processado - usuário pode tentar novamente
            } finally {
                // IMPORTANTE: Resetar isProcessing para permitir nova tentativa
                setIsProcessing(false);
            }
        },
        [
            cancelPendingOrder,
            customerData,
            ensureDeviceIdAvailable,
            ensureOrder,
            ensureSingleItem,
            finalizeSuccess,
            navigateToOrders,
            handleStartNewOrder,
            resetCheckoutState,
            primaryCartItem,
            customerData,
        ],
    );

    const handlePixPayment = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setGlobalError('');
            setGlobalSuccess('');
            setPixResult(null);

            if (!ensureSingleItem()) return;
            if (!primaryCartItem) {
                setGlobalError('Seu carrinho está vazio.');
                return;
            }
            if (primaryCartItem.quantity <= 0) {
                setGlobalError('Selecione pelo menos 1 ingresso para continuar.');
                return;
            }

            const currentDeviceId = await ensureDeviceIdAvailable(deviceId !== null, 'pix payment');
            if (!currentDeviceId) {
                setGlobalError(
                    'Não foi possível obter o deviceId do Mercado Pago. Recarregue a página (em HTTPS) e tente novamente.',
                );
                return;
            }

            try {
                setIsProcessing(true);

                // Criar pedido PENDING quando gerar PIX (pedido "segura" estoque pelo tempo de expiração do PIX)
                const createdOrder = await ensureOrder({ allowReuse: false });
                if (!createdOrder?._id) {
                    throw new Error('Não foi possível criar o pedido para gerar o pagamento PIX.');
                }

                // CRÍTICO: NÃO cancelar reserva antes de criar PIX
                // O backend vai atualizar a reserva existente vinculando ao pedido PIX
                // Isso evita criar reservas duplicadas
                // A reserva será atualizada pelo backend com orderId e expiresAt do PIX

                const response = await api.post(
                    `/payments/${createdOrder._id}/pix`,
                    {
                        deviceId: currentDeviceId,
                    },
                    {
                        headers: {
                            'X-meli-session-id': currentDeviceId,
                        },
                    },
                );

                const data = response.data?.data;

                // Atualizar cache do pedido após gerar PIX
                const cacheKey = `order-${createdOrder._id}`;
                if (data?.order?._id) {
                    apiCache.set(cacheKey, data.order, 5000);
                }

                // CRÍTICO: Atualizar estado do pedido para garantir que apareça na lista de pedidos
                // O pedido PIX deve aparecer como 'pending' na tela de pedidos
                if (data?.order) {
                    persistOrder({
                        ...data.order,
                        status: 'pending', // Garantir que está como pending
                    });
                } else if (createdOrder) {
                    // Se não veio no response, usar o pedido criado e marcar como pending
                    persistOrder({
                        ...createdOrder,
                        status: 'pending',
                        paymentMethod: 'pix',
                    });
                }

                console.log('[handlePixPayment] ✅ Pedido PIX criado como PENDING:', createdOrder._id);
                
                // CRÍTICO: Atualizar estado da reserva se o backend retornou uma reserva vinculada ao pedido PIX
                if (data?.reservation?._id) {
                    console.log('[handlePixPayment] 🔄 Atualizando estado com reserva vinculada ao pedido PIX:', {
                        reservationId: data.reservation._id,
                        orderId: data.reservation.orderId,
                        expiresAt: data.reservation.expiresAt,
                    });
                    setReservation(data.reservation);
                    // Limpar ref já que temos a reserva vinculada
                    pixOrderCreatedAtRef.current = null;
                } else {
                    // Se não veio reserva na resposta, buscar reserva vinculada ao pedido PIX
                    // O backend cria a reserva vinculada, então vamos buscá-la
                    console.log('[handlePixPayment] ⏳ Reserva não retornada na resposta, buscando reserva vinculada ao pedido PIX...');
                    pixOrderCreatedAtRef.current = {
                        orderId: createdOrder._id,
                        timestamp: Date.now(),
                    };
                    
                    // Buscar reserva vinculada ao pedido PIX após um pequeno delay
                    setTimeout(async () => {
                        try {
                            const sessionId = currentDeviceId || deviceId || storageHelpers.loadDeviceId();
                            if (sessionId) {
                                const reservationsResponse = await api.get('/reservations/my', {
                                    headers: {
                                        'x-session-id': sessionId,
                                    },
                                });
                                const reservations = reservationsResponse.data?.data || [];
                                const linkedReservation = reservations.find((r: Reservation) => 
                                    r.orderId && String(r.orderId) === String(createdOrder._id)
                                );
                                
                                if (linkedReservation?._id) {
                                    console.log('[handlePixPayment] ✅ Reserva vinculada encontrada:', {
                                        reservationId: linkedReservation._id,
                                        orderId: linkedReservation.orderId,
                                    });
                                    setReservation(linkedReservation);
                                    pixOrderCreatedAtRef.current = null;
                                } else {
                                    console.log('[handlePixPayment] ⚠️ Reserva vinculada não encontrada ainda');
                                }
                            }
                        } catch (error: any) {
                            console.warn('[handlePixPayment] ⚠️ Erro ao buscar reserva vinculada:', error?.message);
                        }
                    }, 2000); // Aguardar 2 segundos para o backend criar a reserva
                }
                
                setPixResult(data);
                setSelectedTab('pix');
                finalizeSuccess('Pagamento PIX gerado! Use o QR Code ou código copia e cola.', {
                    preserveCartState: true,
                    showGlobalMessage: false,
                });
            } catch (error: any) {
                const message =
                    error?.response?.data?.message ||
                    error?.response?.data?.errors?.[0] ||
                    error?.message ||
                    'Não foi possível gerar o pagamento PIX. Tente novamente.';
                setGlobalError(message);
            } finally {
                setIsProcessing(false);
            }
        },
        [ensureDeviceIdAvailable, ensureOrder, ensureSingleItem, finalizeSuccess, primaryCartItem],
    );

    const isCheckoutReady =
        !loading &&
        summarizedCart.length > 0 &&
        primaryCartItem?.quantity > 0 &&
        totalAmount > 0 &&
        Boolean(MP_PUBLIC_KEY);


    // Timer de 12 minutos para checkout
    // Cancelar reserva e pedido quando timer expira e mostrar modal
    const handleTimerExpire = useCallback(async () => {
        console.log('[handleTimerExpire] ⏰ Timer expirado, cancelando reserva e pedido...');
        
        // CRÍTICO: NÃO cancelar se há pedido PIX pendente (pedido já "segura" estoque)
        const hasPixPendingOrder = order?._id && order.status === 'pending' && (order as any).paymentMethod === 'pix';
        if (hasPixPendingOrder) {
            console.log('[handleTimerExpire] ✅ Tem pedido PIX pendente, não cancelando reserva/pedido');
            return;
        }
        
        // CRÍTICO: Cancelar pedido pendente se existir (exceto PIX)
        if (order?._id && (order.status === 'pending' || order.status === 'failed')) {
            try {
                console.log('[handleTimerExpire] 🗑️ Cancelando pedido pendente:', order._id);
                await cancelPendingOrder(order._id, { reason: 'reservation_expired', keepalive: false });
            } catch (error) {
                console.log('[handleTimerExpire] ⚠️ Erro ao cancelar pedido (ignorado)');
            }
        }
        
        // Cancelar APENAS a reserva específica se existir
        if (reservation?._id) {
            try {
                console.log('[handleTimerExpire] 🗑️ Cancelando reserva:', reservation._id);
                await cancelReservation(reservation._id);
            } catch (error) {
                console.log('[handleTimerExpire] ⚠️ Erro ao cancelar reserva (ignorado)');
            }
        }
        
        // CRÍTICO: Limpar COMPLETAMENTE o carrinho quando timer expira
        console.log('[handleTimerExpire] 🗑️ Limpando carrinho completamente...');
        clearCartItems();
        setCartItems([]); // Garantir que o estado também está limpo
        
        // Limpar estado
        setReservation(null);
        persistOrder(null);
        reservationRestoredRef.current = false; // Resetar flag ao expirar
        creatingReservationRef.current = false; // Resetar flag de criação
        reservationExpiredRef.current = true; // CRÍTICO: Marcar que expirou para evitar criar nova automaticamente
        
        // Limpar storage
        storageHelpers.clearActiveOrderId();
        storageHelpers.clearCustomerData();
        
        // Mostrar modal
        setShowReservationExpiredModal(true);
    }, [reservation, order, cancelReservation, cancelPendingOrder, clearCartItems, persistOrder]);

    // Restaurar reserva após F5
    useEffect(() => {
        // CRÍTICO: Não restaurar se não está na rota do checkout
        const isOnCheckoutRoute = typeof window !== 'undefined' && 
            (pathname?.startsWith('/checkout') || window.location.pathname?.startsWith('/checkout'));
        if (!isOnCheckoutRoute) {
            return;
        }
        
        console.log('[RestoreReservation] 🔍 Verificando se deve restaurar:', {
            hasReservation: !!reservation?._id,
            reservationId: reservation?._id,
            hasOrder: !!order?._id,
            checkingPaidOrder,
            isReady,
            isAuthenticated,
            isCheckoutReady,
            cartLength: summarizedCart.length,
            reservationRestored: reservationRestoredRef.current,
            wasOnCheckout: wasOnCheckoutRef.current,
            restoringReservation,
        });
        
        // Se já tem reserva ou pedido, não precisa restaurar
        if (reservation?._id || order?._id) {
            console.log('[RestoreReservation] ❌ Já tem reserva ou pedido, não restaurar');
            return;
        }
        if (checkingPaidOrder) {
            console.log('[RestoreReservation] ⏳ Aguardando verificação de pedido pago');
            return; // Aguardar verificação de pedido pago
        }
        if (!isReady || !isAuthenticated) {
            console.log('[RestoreReservation] ⏳ Aguardando autenticação:', { isReady, isAuthenticated });
            return;
        }
        if (!isCheckoutReady || summarizedCart.length === 0) {
            console.log('[RestoreReservation] ⏳ Aguardando checkout pronto:', { isCheckoutReady, cartLength: summarizedCart.length });
            return; // Não restaurar se não há itens no carrinho
        }

        // IMPORTANTE: No F5, as flags são resetadas, então não podemos confiar nelas
        // Sempre tentar restaurar a reserva se ela existir no backend
        // A verificação de cancelamento será feita pelo backend (se a reserva não existe mais)
        // Se reservationRestoredRef foi resetado MAS estamos no checkout (F5), tentar restaurar mesmo assim
        // Só não restaurar se explicitamente saiu do checkout (não é F5)
        // Como não temos como diferenciar F5 de navegação, vamos sempre tentar restaurar
        // O backend vai retornar a reserva se ela existir e estiver ativa

        const sessionId = deviceId || storageHelpers.loadDeviceId() || (typeof window !== 'undefined' ? window.MP_DEVICE_SESSION_ID : null);
        if (!sessionId) {
            console.log('[RestoreReservation] ❌ Sem sessionId, não restaurar');
            return;
        }
        
        console.log('[RestoreReservation] ✅ Condições atendidas, iniciando restauração...');
        
        setRestoringReservation(true);

        (async () => {
            try {
                console.log('[RestoreReservation] 🔄 Buscando reservas ativas da sessão...', { sessionId });
                const url = '/reservations/my';
                const response = await api.get(url, {
                    headers: {
                        'x-session-id': sessionId,
                    },
                });
                const reservations = response.data?.data || [];
                console.log('[RestoreReservation] 📦 Reservas encontradas:', {
                    count: reservations.length,
                    reservations: reservations.map((r: Reservation) => ({
                        id: r._id,
                        event: typeof r.event === 'object' ? r.event._id : r.event,
                        ticketType: typeof r.ticketType === 'object' ? r.ticketType._id : r.ticketType,
                        isActive: r.isActive,
                        expiresAt: r.expiresAt,
                    })),
                });
                
                const currentPrimaryItem = summarizedCart[0];
                if (!currentPrimaryItem || !currentPrimaryItem.eventId) {
                    return;
                }

                const matchingReservation = reservations.find((r: Reservation) => {
                    const reservationEventId = typeof r.event === 'object' && r.event !== null && '_id' in r.event 
                        ? String((r.event as any)._id) 
                        : String(r.event);
                    const reservationTicketTypeId = typeof r.ticketType === 'object' && r.ticketType !== null && '_id' in r.ticketType
                        ? String((r.ticketType as any)._id)
                        : String(r.ticketType);
                    
                    return reservationEventId === String(currentPrimaryItem.eventId) &&
                           reservationTicketTypeId === String(currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id) &&
                           r.isActive &&
                           new Date(r.expiresAt) > new Date();
                });

                if (matchingReservation?._id) {
                    const isStillActive = matchingReservation.isActive && new Date(matchingReservation.expiresAt) > new Date();
                    if (isStillActive) {
                        // CRÍTICO: Verificar se a reserva está vinculada a um pedido PIX pendente para o MESMO evento/ticketType
                        // Se for para evento/ticketType diferente, restaurar normalmente (permitir criar nova reserva depois)
                        if ((matchingReservation as any).orderId) {
                            try {
                                // CRÍTICO: Verificar se a reserva é para o MESMO evento/ticketType do carrinho atual
                                const reservationEventId = typeof matchingReservation.event === 'object' && matchingReservation.event !== null && '_id' in matchingReservation.event 
                                    ? String((matchingReservation.event as any)._id) 
                                    : String(matchingReservation.event);
                                const reservationTicketTypeId = typeof matchingReservation.ticketType === 'object' && matchingReservation.ticketType !== null && '_id' in matchingReservation.ticketType
                                    ? String((matchingReservation.ticketType as any)._id)
                                    : String(matchingReservation.ticketType);
                                
                                const isSameEvent = reservationEventId === String(currentPrimaryItem.eventId);
                                const isSameTicketType = reservationTicketTypeId === String(currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id);
                                
                                // Se não é para o mesmo evento/ticketType, restaurar normalmente (permitir criar nova reserva depois)
                                if (!isSameEvent || !isSameTicketType) {
                                    console.log('[RestoreReservation] ℹ️ Reserva vinculada a pedido PIX pendente é para evento/ticketType diferente, restaurando normalmente:', {
                                        reservationId: matchingReservation._id,
                                        reservationEventId,
                                        reservationTicketTypeId,
                                        currentEventId: currentPrimaryItem.eventId,
                                        currentTicketTypeId: currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id,
                                    });
                                    // Continuar para restaurar a reserva (mas ela não será usada, pois é para evento/ticketType diferente)
                                    // O AutoCreateReservation criará uma nova reserva para o evento/ticketType correto
                                } else {
                                    // É para o mesmo evento/ticketType, verificar se o pedido PIX está pendente
                                    // Tentar buscar o pedido específico primeiro
                                    try {
                                        const orderResponse = await api.get(`/orders/${(matchingReservation as any).orderId}`);
                                        const linkedOrder = orderResponse.data?.data;
                                        
                                        if (linkedOrder && linkedOrder.status === 'pending' && linkedOrder.paymentMethod === 'pix') {
                                            console.log('[RestoreReservation] ⚠️ Reserva vinculada a pedido PIX pendente para o MESMO evento/ticketType, não restaurando:', {
                                                reservationId: matchingReservation._id,
                                                orderId: linkedOrder._id,
                                                orderNumber: linkedOrder.orderNumber,
                                                eventId: reservationEventId,
                                                ticketTypeId: reservationTicketTypeId,
                                            });
                                            // Não restaurar reserva vinculada a pedido PIX pendente para o mesmo evento/ticketType
                                            // O pedido já "segura" o estoque
                                            return;
                                        }
                                    } catch (orderError: any) {
                                        // Se der erro 403/404, tentar buscar na lista de pedidos do usuário
                                        if (orderError?.response?.status === 403 || orderError?.response?.status === 404) {
                                            try {
                                                const ordersResponse = await api.get('/orders', { params: { limit: 100 } });
                                                const userOrders = ordersResponse.data?.data?.orders || [];
                                                const linkedOrder = userOrders.find((o: any) => String(o._id) === String((matchingReservation as any).orderId));
                                                
                                                if (linkedOrder && linkedOrder.status === 'pending' && linkedOrder.paymentMethod === 'pix') {
                                                    console.log('[RestoreReservation] ⚠️ Reserva vinculada a pedido PIX pendente (encontrado na lista) para o MESMO evento/ticketType, não restaurando:', {
                                                        reservationId: matchingReservation._id,
                                                        orderId: linkedOrder._id,
                                                        orderNumber: linkedOrder.orderNumber,
                                                        eventId: reservationEventId,
                                                        ticketTypeId: reservationTicketTypeId,
                                                    });
                                                    return;
                                                }
                                            } catch (listError: any) {
                                                // Se também falhar, não restaurar por segurança apenas se for o mesmo evento/ticketType
                                                console.warn('[RestoreReservation] ⚠️ Erro ao verificar pedido vinculado na lista, não restaurando reserva por segurança (mesmo evento/ticketType):', {
                                                    reservationId: matchingReservation._id,
                                                    orderId: (matchingReservation as any).orderId,
                                                    error: listError?.message,
                                                });
                                                return;
                                            }
                                        }
                                        
                                        // CRÍTICO: Se não conseguir buscar o pedido (outros erros), NÃO restaurar a reserva apenas se for o mesmo evento/ticketType
                                        // Por segurança, assumir que pode ser um pedido PIX pendente
                                        console.warn('[RestoreReservation] ⚠️ Erro ao verificar pedido vinculado, não restaurando reserva por segurança (mesmo evento/ticketType):', {
                                            reservationId: matchingReservation._id,
                                            orderId: (matchingReservation as any).orderId,
                                            error: orderError?.message,
                                            status: orderError?.response?.status,
                                        });
                                        // Não restaurar reserva com orderId se não conseguir verificar o pedido e for o mesmo evento/ticketType
                                        return;
                                    }
                                }
                            } catch (error: any) {
                                // Erro geral, não restaurar por segurança apenas se for o mesmo evento/ticketType
                                const reservationEventId = typeof matchingReservation.event === 'object' && matchingReservation.event !== null && '_id' in matchingReservation.event 
                                    ? String((matchingReservation.event as any)._id) 
                                    : String(matchingReservation.event);
                                const reservationTicketTypeId = typeof matchingReservation.ticketType === 'object' && matchingReservation.ticketType !== null && '_id' in matchingReservation.ticketType
                                    ? String((matchingReservation.ticketType as any)._id)
                                    : String(matchingReservation.ticketType);
                                
                                const isSameEvent = reservationEventId === String(currentPrimaryItem.eventId);
                                const isSameTicketType = reservationTicketTypeId === String(currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id);
                                
                                if (isSameEvent && isSameTicketType) {
                                    console.warn('[RestoreReservation] ⚠️ Erro geral ao verificar pedido vinculado, não restaurando reserva (mesmo evento/ticketType):', {
                                        reservationId: matchingReservation._id,
                                        orderId: (matchingReservation as any).orderId,
                                        error: error?.message,
                                    });
                                    return;
                                }
                            }
                        }
                        
                        const expiresAt = new Date(matchingReservation.expiresAt);
                        const now = new Date();
                        const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
                        const remainingSeconds = Math.floor(remainingMs / 1000);
                        const remainingMinutes = Math.floor(remainingSeconds / 60);
                        
                        console.log('[RestoreReservation] ✅ Restaurando reserva:', {
                            reservationId: matchingReservation._id,
                            expiresAt: expiresAt.toISOString(),
                            now: now.toISOString(),
                            remainingMs,
                            remainingSeconds,
                            remainingMinutes,
                            hasOrderId: !!(matchingReservation as any).orderId,
                        });
                        
                        // CRÍTICO: Marcar flags ANTES de setar a reserva para evitar race condition
                        reservationRestoredRef.current = true; // Marcar que restaurou - não criar nova
                        wasOnCheckoutRef.current = true; // Marcar que estava no checkout
                        
                        console.log('[RestoreReservation] 🏁 Flags setadas:', {
                            reservationRestored: reservationRestoredRef.current,
                            wasOnCheckout: wasOnCheckoutRef.current,
                        });
                        
                        // CRÍTICO: Setar reserva DEPOIS de marcar as flags
                        setReservation(matchingReservation);
                        
                        // CRÍTICO: Aguardar um pouco antes de liberar restoringReservation
                        // para garantir que AutoCreateReservation veja a reserva restaurada
                        // e que o estado seja atualizado pelo React
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        return; // Reserva restaurada, sair
                    }
                }
                
                // Cancelar reservas antigas que não correspondem
                if (reservations.length > 0) {
                    await Promise.all(
                        reservations.map(async (r: Reservation) => {
                            try {
                                await cancelReservation(r._id);
                            } catch (error) {
                                // Ignorar erro
                            }
                        })
                    );
                }
            } catch (error: any) {
                // Erro silencioso
            } finally {
                setRestoringReservation(false);
            }
        })();
        }, [reservation, order, checkingPaidOrder, isReady, isAuthenticated, isCheckoutReady, summarizedCart, deviceId, cancelReservation, pathname]);

    // Criar reserva automaticamente quando checkout está pronto
    useEffect(() => {
        // Verificações básicas: só criar se está no checkout e checkout está pronto
        const isOnCheckoutRoute = typeof window !== 'undefined' && 
            (pathname?.startsWith('/checkout') || window.location.pathname?.startsWith('/checkout'));
        
        if (!isOnCheckoutRoute) {
            return;
        }
        
        // Não criar se está aguardando outras operações
        if (restoringReservation || checkingPaidOrder) {
            return;
        }
        
        // Não criar se está saindo ou cancelando
        if (showLeaveModal || modalShownRef.current || cancelingReservationsRef.current) {
            return;
        }
        
        // Não criar se já tem reserva ativa e válida
        const hasActiveReservation = Boolean(
            reservation?._id && 
            reservation.isActive && 
            new Date(reservation.expiresAt) > new Date()
        );
        
        if (hasActiveReservation) {
            return; // Já tem reserva válida, não precisa criar
        }
        
        // Não criar se já restaurou reserva (evita sobrescrever com nova reserva após F5)
        if (reservationRestoredRef.current) {
            return;
        }
        
        // CRÍTICO: Não criar se a reserva expirou (timer terminou)
        // Isso evita criar nova reserva automaticamente quando o timer expira
        if (reservationExpiredRef.current) {
            return;
        }
        
        // Não criar se já tem pedido ou PIX ativo
        if (order?._id || pixPaymentActive) {
            return;
        }
        
        // CRÍTICO: Não criar se está processando pagamento (PIX ou cartão)
        // Isso evita criar reserva duplicada quando o pagamento está sendo processado
        if (isProcessing) {
            console.log('[AutoCreateReservation] ⏳ Processando pagamento, não criar reserva');
            return;
        }
        
        // CRÍTICO: Não criar se não tem itens no carrinho (carrinho vazio)
        // Verificar tanto summarizedCart quanto cartItems para garantir que está realmente vazio
        if (summarizedCart.length === 0 || cartItems.length === 0) {
            console.log('[AutoCreateReservation] ❌ Carrinho vazio, não criar reserva');
            return;
        }
        
        // Não criar se checkout não está pronto
        if (!isCheckoutReady) {
            return;
        }
        
        // Não criar se já está criando
        if (creatingReservationRef.current) {
            return;
        }
        
        // CRÍTICO: Verificar se já existe reserva ativa para o mesmo evento/ticketType antes de criar
        // Se já existe e está válida, não criar nova
        const currentPrimaryItem = summarizedCart[0];
        if (reservation?._id && reservation.isActive && currentPrimaryItem) {
            const expiresAt = new Date(reservation.expiresAt);
            const isSameEvent = String(reservation.event) === String(currentPrimaryItem.eventId);
            const isSameTicketType = String(reservation.ticketType) === String(currentPrimaryItem.ticketTypeId ?? currentPrimaryItem.id);
            const isValid = expiresAt > new Date();
            
            if (isSameEvent && isSameTicketType && isValid) {
                console.log('[AutoCreateReservation] ✅ Já existe reserva válida para este evento/ticketType, não criar nova:', {
                    reservationId: reservation._id,
                    expiresAt: reservation.expiresAt,
                });
                return;
            }
        }

        // CRÍTICO: SEMPRE permitir criar nova reserva, mesmo que já exista uma vinculada a pedido PIX pendente
        // O usuário pode querer fazer múltiplas compras do mesmo evento/ticketType
        // A reserva vinculada a pedido PIX pendente não deve bloquear novas reservas
        console.log('[AutoCreateReservation] 🆕 Criando/atualizando reserva...');
        ensureReservation().then((newReservation) => {
            if (newReservation?._id) {
                // Marcar que estava no checkout para permitir restauração no próximo F5
                wasOnCheckoutRef.current = true;
                reservationRestoredRef.current = false; // Resetar flag para permitir restauração no próximo F5
                // CRÍTICO: Resetar flag de expiração apenas quando criar nova reserva manualmente
                // Isso permite que o usuário adicione novos itens após o timer expirar
                reservationExpiredRef.current = false;
                console.log('[AutoCreateReservation] ✅ Reserva criada/atualizada:', {
                    reservationId: newReservation._id,
                    orderId: (newReservation as any).orderId,
                });
            }
        });
    }, [
        isCheckoutReady,
        reservation,
        order,
        pixPaymentActive,
        isProcessing, // CRÍTICO: Adicionar isProcessing para evitar criar reserva durante processamento
        summarizedCart,
        cartItems, // CRÍTICO: Adicionar cartItems para verificar se carrinho está vazio
        pathname,
        showLeaveModal,
        restoringReservation,
        checkingPaidOrder,
        ensureReservation,
        deviceId,
    ]);

    // Atualizar mensagem de rate limit periodicamente
    useEffect(() => {
        // Limpar interval anterior se existir
        if (rateLimitIntervalRef.current) {
            clearInterval(rateLimitIntervalRef.current);
            rateLimitIntervalRef.current = null;
        }

        // Se não há rate limit ativo, não fazer nada
        if (!rateLimitActive || !rateLimitRef.current) {
            return;
        }

        const RATE_LIMIT_DELAY = 2 * 60 * 1000; // 2 minutos
        
        const updateMessage = () => {
            // Verificar novamente se ainda há rate limit ativo (usar ref para evitar closure stale)
            if (!rateLimitRef.current) {
                if (rateLimitIntervalRef.current) {
                    clearInterval(rateLimitIntervalRef.current);
                    rateLimitIntervalRef.current = null;
                }
                return;
            }

            const now = Date.now();
            const remainingTime = Math.ceil((RATE_LIMIT_DELAY - (now - (rateLimitRef.current || 0))) / 1000);
            
            if (remainingTime > 0) {
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                const timeString = minutes > 0 
                    ? `${minutes} minuto${minutes > 1 ? 's' : ''} e ${seconds} segundo${seconds !== 1 ? 's' : ''}`
                    : `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
                
                const newMessage = `Muitas tentativas de criação de pedido. Aguarde ${timeString} antes de tentar novamente.`;
                
                // Só atualizar se a mensagem mudou realmente
                if (lastRateLimitMessageRef.current !== newMessage) {
                    lastRateLimitMessageRef.current = newMessage;
                    setGlobalError(newMessage);
                }
        } else {
                // Rate limit expirado
                if (rateLimitIntervalRef.current) {
                    clearInterval(rateLimitIntervalRef.current);
                    rateLimitIntervalRef.current = null;
                }
                rateLimitRef.current = null;
                setRateLimitActive(false);
                lastRateLimitMessageRef.current = '';
                setGlobalError((prev) => prev.includes('Muitas') ? '' : prev);
            }
        };

        // Atualizar imediatamente
        updateMessage();

        // Atualizar a cada segundo
        rateLimitIntervalRef.current = setInterval(updateMessage, 1000);

        return () => {
            if (rateLimitIntervalRef.current) {
                clearInterval(rateLimitIntervalRef.current);
                rateLimitIntervalRef.current = null;
        }
        };
    }, [rateLimitActive]); // Removido order?._id para evitar re-execuções desnecessárias

    // Limpar rate limit quando pedido é criado
    useEffect(() => {
        if (order?._id && rateLimitActive) {
            rateLimitRef.current = null;
            setRateLimitActive(false);
            lastRateLimitMessageRef.current = '';
            if (rateLimitIntervalRef.current) {
                clearInterval(rateLimitIntervalRef.current);
                rateLimitIntervalRef.current = null;
            }
            setGlobalError((prev) => prev.includes('Muitas') ? '' : prev);
        }
    }, [order?._id, rateLimitActive]);

    // Calcular tempo restante baseado no expiresAt da reserva (para restaurar após F5)
    const calculateRemainingTime = useMemo(() => {
        // CRÍTICO: Verificar se a reserva está vinculada a um pedido PIX pendente
        // Se estiver vinculada, não mostrar timer (pedido PIX já "segura" estoque)
        const isReservationLinkedToPixOrder = reservation?._id && 
            (reservation as any).orderId && 
            order?._id && 
            order.status === 'pending' && 
            (order as any).paymentMethod === 'pix' &&
            String((reservation as any).orderId) === String(order._id);
        
        // Se tem pedido PIX pendente vinculado à reserva, não mostrar timer de reserva
        if (isReservationLinkedToPixOrder || pixPaymentActive) {
            return null;
        }
        
        // Se tem pedido mas NÃO está vinculado à reserva atual, também não mostrar timer
        // (pode ser um pedido PIX anterior que ainda está no estado)
        if (order?._id && !isReservationLinkedToPixOrder) {
            // Se a reserva não está vinculada ao pedido, limpar o estado do pedido
            // Isso garante que o timer funcione corretamente
            return null;
        }
        
        // Se tem reserva ativa e NÃO está vinculada a pedido PIX, calcular tempo restante
        if (reservation?._id && reservation?.expiresAt && reservation.isActive) {
            const expiresAt = new Date(reservation.expiresAt).getTime();
            const now = Date.now();
            const remaining = Math.max(0, expiresAt - now);
            const remainingSeconds = Math.floor(remaining / 1000);
            
            console.log('[calculateRemainingTime] ⏰ Calculando tempo restante:', {
                reservationId: reservation._id,
                reservationOrderId: (reservation as any).orderId,
                orderId: order?._id,
                isReservationLinkedToPixOrder,
                expiresAt: new Date(reservation.expiresAt).toISOString(),
                now: new Date(now).toISOString(),
                remainingMs: remaining,
                remainingSeconds,
                remainingMinutes: Math.floor(remainingSeconds / 60),
            });
            
            // Se já expirou, retornar 0
            if (remainingSeconds <= 0) {
                return 0;
            }
            
            return remainingSeconds;
        }
        
        return null;
    }, [reservation?._id, reservation?.expiresAt, reservation?.isActive, order?._id, pixPaymentActive]);

    // CRÍTICO: Limpar estado do pedido PIX anterior quando há uma nova reserva não vinculada a pedido
    useEffect(() => {
        // Verificar se a reserva está vinculada a um pedido PIX pendente
        const isReservationLinkedToPixOrder = reservation?._id && 
            (reservation as any).orderId && 
            order?._id && 
            order.status === 'pending' && 
            (order as any).paymentMethod === 'pix' &&
            String((reservation as any).orderId) === String(order._id);
        
        // CRÍTICO: Verificar se o pedido PIX foi criado recentemente (dentro de 10 segundos)
        // Isso evita limpar o estado enquanto o backend está criando a reserva vinculada
        const pixOrderCreatedRecently = pixOrderCreatedAtRef.current &&
            pixOrderCreatedAtRef.current.orderId === order?._id &&
            (Date.now() - pixOrderCreatedAtRef.current.timestamp) < 10000; // 10 segundos
        
        // Se há reserva ativa mas NÃO está vinculada ao pedido PIX atual, limpar estado do pedido
        // Isso garante que quando o usuário faz uma nova reserva após ter gerado um PIX,
        // o estado do pedido PIX anterior seja limpo e o timer funcione corretamente
        // MAS não limpar se o pedido PIX foi criado recentemente (aguardar reserva vinculada ser criada)
        if (reservation?._id && reservation.isActive && order?._id && !isReservationLinkedToPixOrder && !pixOrderCreatedRecently) {
            const orderIsPixPending = order.status === 'pending' && (order as any).paymentMethod === 'pix';
            if (orderIsPixPending) {
                console.log('[useEffect] 🗑️ Limpando estado do pedido PIX anterior - reserva não está vinculada:', {
                    reservationId: reservation._id,
                    reservationOrderId: (reservation as any).orderId,
                    currentOrderId: order._id,
                    currentOrderStatus: order.status,
                    currentOrderPaymentMethod: (order as any).paymentMethod,
                    pixOrderCreatedRecently,
                });
                // Limpar estado do pedido PIX anterior
                persistOrder(null);
                storageHelpers.clearActiveOrderId();
                setPixResult(null);
                // Limpar ref também
                pixOrderCreatedAtRef.current = null;
            }
        }
        
        // Se a reserva está vinculada ao pedido PIX, limpar o ref (não precisamos mais rastrear)
        if (isReservationLinkedToPixOrder && pixOrderCreatedAtRef.current?.orderId === order?._id) {
            pixOrderCreatedAtRef.current = null;
        }
    }, [reservation?._id, reservation?.isActive, (reservation as any)?.orderId, order?._id, order?.status, (order as any)?.paymentMethod, persistOrder]);

    // Timer ativo quando há reserva (não quando há pedido - pedido tem seu próprio fluxo)
    // CRÍTICO: Verificar se a reserva está vinculada a um pedido PIX pendente
    const isReservationLinkedToPixOrder = reservation?._id && 
        (reservation as any).orderId && 
        order?._id && 
        order.status === 'pending' && 
        (order as any).paymentMethod === 'pix' &&
        String((reservation as any).orderId) === String(order._id);
    
    // Timer só deve estar ativo se:
    // 1. Checkout está pronto
    // 2. Não há pagamento PIX ativo
    // 3. A reserva NÃO está vinculada a um pedido PIX pendente
    // 4. A reserva existe e está ativa
    const checkoutTimer = useCheckoutTimer(
        Boolean(
            isCheckoutReady && 
            !pixPaymentActive && 
            !isReservationLinkedToPixOrder && 
            reservation?._id && 
            reservation.isActive
        ),
        handleTimerExpire,
        calculateRemainingTime, // Passar tempo restante calculado do expiresAt da reserva
    );

    // Timer é independente do formulário - aparece quando há pedido pendente

    const handleCopyPixCode = useCallback(async () => {
        if (!pixResult?.ticketUrl) return;
        try {
            await navigator.clipboard.writeText(pixResult.ticketUrl);
            setPixCopySuccess(true);
            setTimeout(() => setPixCopySuccess(false), 5000);
        } catch (clipboardError) {
            // Erro silencioso ao copiar
        }
    }, [pixResult?.ticketUrl]);

    // Handlers do modal
    const handleConfirmLeave = useCallback(async () => {
        // CRÍTICO: NÃO cancelar se há pedido PIX pendente (pedido já "segura" estoque)
        const hasPixPendingOrder = order?._id && order.status === 'pending' && (order as any).paymentMethod === 'pix';
        if (hasPixPendingOrder) {
            console.log('[handleConfirmLeave] ✅ Tem pedido PIX pendente, não cancelando reserva/pedido');
            // Apenas limpar estado local e navegar
            setReservation(null);
            clearCartItems();
            storageHelpers.clearCustomerData();
            storageHelpers.clearActiveOrderId();
            persistOrder(null);
            reservationRestoredRef.current = false;
            creatingReservationRef.current = false;
            modalShownRef.current = false;
            setShowLeaveModal(false);
            const destination = pendingNavigation || '/';
            setPendingNavigation(null);
            router.replace(destination);
            return;
        }
        
        // 1. Cancelar pedido se houver (exceto PIX pendente)
        if (order?._id && !hasPixPendingOrder) {
            try {
                await cancelPendingOrder(order._id, { reason: 'checkout_user_confirmed_leave' });
            } catch (error) {
                // Erro silencioso
            }
        }
        
        // 2. Cancelar APENAS a reserva específica (se não estiver vinculada a pedido PIX pendente)
        // CRÍTICO: Marcar que está cancelando ANTES de cancelar para bloquear criação
        cancelingReservationsRef.current = true;
        
        if (reservation?._id) {
            // CRÍTICO: Verificar se a reserva está vinculada a um pedido PIX pendente antes de cancelar
            // Se estiver vinculada, NÃO cancelar (pedido PIX já "segura" o estoque)
            const isReservationLinkedToPixOrder = (reservation as any).orderId && 
                order?._id && 
                order.status === 'pending' && 
                (order as any).paymentMethod === 'pix' &&
                String((reservation as any).orderId) === String(order._id);
            
            if (!isReservationLinkedToPixOrder) {
                // Reserva não está vinculada a pedido PIX pendente, pode cancelar
                try {
                    await cancelReservation(reservation._id);
                } catch (error) {
                    // Erro silencioso
                }
            } else {
                console.log('[handleConfirmLeave] ✅ Reserva vinculada a pedido PIX pendente, não cancelando:', {
                    reservationId: reservation._id,
                    orderId: order._id,
                });
            }
            
            // Manter flag ativa por mais tempo para garantir que AutoCreateReservation não cria
            setTimeout(() => {
                cancelingReservationsRef.current = false;
            }, 2000); // Liberar após 2 segundos
        } else {
            // Se não tem reserva específica, ainda assim marcar como cancelando
            setTimeout(() => {
                cancelingReservationsRef.current = false;
            }, 2000);
        }
        
        // 3. Limpar tudo
        // CRÍTICO: Limpar estado ANTES de liberar flag para evitar race condition
        setReservation(null); // Limpar estado primeiro
        clearCartItems();
        storageHelpers.clearCustomerData();
        storageHelpers.clearActiveOrderId();
        persistOrder(null);
        reservationRestoredRef.current = false; // Resetar flag
        creatingReservationRef.current = false; // Resetar flag de criação
        setPixResult(null);
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
        setPixStatus('idle');
        setPixStatusMessage('');
        setGlobalError('');
        setGlobalSuccess('');
        setIsProcessing(false);
        apiCache.clear();
        
        // 4. Fechar modal e navegar
        modalShownRef.current = false;
        setShowLeaveModal(false);
        const destination = pendingNavigation || '/';
        setPendingNavigation(null);
        router.replace(destination);
    }, [order, reservation, cancelPendingOrder, cancelReservation, router, pendingNavigation, persistOrder, deviceId]);

    const handleCancelLeave = useCallback(() => {
        modalShownRef.current = false;
        setShowLeaveModal(false);
        setPendingNavigation(null);
    }, []);

    // Handler para fechar modal de reserva expirada
    const handleReservationExpiredClose = useCallback(async () => {
        console.log('[Modal] ✅ Fechando modal de reserva expirada, cancelando pedido e limpando tudo...');
        
        // CRÍTICO: NÃO cancelar se há pedido PIX pendente (pedido já "segura" estoque)
        const hasPixPendingOrder = order?._id && order.status === 'pending' && (order as any).paymentMethod === 'pix';
        if (hasPixPendingOrder) {
            console.log('[Modal] ✅ Tem pedido PIX pendente, não cancelando pedido');
            // Apenas limpar estado local e navegar
            clearCartItems();
            setCartItems([]);
            storageHelpers.clearCustomerData();
            storageHelpers.clearActiveOrderId();
            persistOrder(null);
            setReservation(null);
            reservationRestoredRef.current = false;
            creatingReservationRef.current = false;
            reservationExpiredRef.current = true;
            setPixResult(null);
            setCardStatus('idle');
            setCardStatusMessage('');
            setCardStatusDetails([]);
            setPixStatus('idle');
            setPixStatusMessage('');
            setGlobalError('');
            setGlobalSuccess('');
            setIsProcessing(false);
            apiCache.clear();
            router.push('/');
            return;
        }
        
        // CRÍTICO: Cancelar pedido pendente se existir (exceto PIX)
        if (order?._id && (order.status === 'pending' || order.status === 'failed')) {
            try {
                console.log('[Modal] 🗑️ Cancelando pedido pendente:', order._id);
                await cancelPendingOrder(order._id, { reason: 'reservation_expired_modal_closed', keepalive: false });
            } catch (error) {
                console.log('[Modal] ⚠️ Erro ao cancelar pedido (ignorado)');
            }
        }
        
        // Cancelar APENAS a reserva específica se existir
        if (reservation?._id) {
            try {
                console.log('[Modal] 🗑️ Cancelando reserva:', reservation._id);
                await cancelReservation(reservation._id);
            } catch (error) {
                console.log('[Modal] ⚠️ Erro ao cancelar reserva (ignorado)');
            }
        }
        
        // CRÍTICO: Limpar COMPLETAMENTE o carrinho
        console.log('[Modal] 🗑️ Limpando carrinho completamente...');
        clearCartItems();
        setCartItems([]); // Garantir que o estado também está limpo
        
        // Limpar dados do cliente
        storageHelpers.clearCustomerData();
        
        // Limpar storage de pedido
        storageHelpers.clearActiveOrderId();
        
        // Limpar estado do checkout
        persistOrder(null);
        setReservation(null);
        reservationRestoredRef.current = false;
        creatingReservationRef.current = false;
        reservationExpiredRef.current = true; // MANTER flag de expiração para evitar criar nova reserva
        setPixResult(null);
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
        setPixStatus('idle');
        setPixStatusMessage('');
        setGlobalError('');
        setGlobalSuccess('');
        setIsProcessing(false);
        
        // Limpar cache
        apiCache.clear();
        
        // Fechar modal
        setShowReservationExpiredModal(false);
        
        // Redirecionar para home
        router.push('/');
    }, [router, persistOrder, clearCartItems, order, cancelPendingOrder]);

    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            {/* Modal de confirmação ao sair do checkout */}
            {showLeaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-center gap-3">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold uppercase tracking-wide text-[#1a1a1d]">
                                Cancelar pedido?
                            </h3>
                        </div>
                        <p className="mb-6 text-center text-sm text-[#7d796c]">
                            Se você sair agora, seu pedido será cancelado, <br /> e você precisará criar um novo pedido para continuar.<br /><br />
                            <strong>Mas seu pedido vai depdenter da quantidaude <br /> de Ingressos que Possuem no Nosso estoque</strong>
                        </p>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleCancelLeave}
                                className="flex-1 rounded-full border border-[#ded7ca] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#4c4c55] transition hover:border-[#a38f78] hover:bg-[#faf7f0]"
                            >
                                Voltar ao checkout
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmLeave}
                                className="flex-1 rounded-full border border-rose-300 bg-rose-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                            >
                                Cancelar pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de reserva expirada */}
            {showReservationExpiredModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-center gap-3">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold uppercase tracking-wide text-[#1a1a1d]">
                                Reserva Expirada
                            </h3>
                        </div>
                        <p className="mb-6 text-center text-sm text-[#7d796c]">
                            Sua reserva foi cancelada porque o tempo expirou.<br /><br />
                            <strong className="text-rose-700">
                                O estoque pode ter mudado durante esse período.
                            </strong>
                            <br /><br />
                            Você precisará criar um novo pedido para continuar.
                        </p>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={handleReservationExpiredClose}
                                className="rounded-full border border-rose-300 bg-rose-50 px-8 py-3 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                            >
                                Entendi, voltar para home
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Container className="py-12">
                <div className="mb-10 flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        Finalizar compra
                    </span>
                    <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-[#1a1a1d]">
                        Checkout seguro
                    </h1>
                </div>

                {/* Mostrar loading enquanto verifica autenticação */}
                {(() => {
                    const renderCondition = !isReady || (isReady && !isAuthenticated) 
                        ? 'verificando-autenticacao'
                        : checkingPaidOrder || loading 
                        ? 'loading'
                        : summarizedCart.length === 0 
                        ? 'carrinho-vazio'
                        : 'checkout-content';
                    
                    // Log removido - estava disparando a cada segundo por causa do timer
                    return null;
                })()}
                {!isReady || (isReady && !isAuthenticated) ? (
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        Verificando autenticação...
                    </div>
                ) : checkingPaidOrder || loading ? (
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        {checkingPaidOrder ? 'Verificando pedido...' : 'Carregando resumo do carrinho...'}
                    </div>
                ) : summarizedCart.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        <p> Seu carrinho está vazio. Explore nossos eventos e selecione os ingressos desejados.</p>

                        <button
                            type="button"
                            className="mt-6 inline-flex items-center justify-center rounded-full border border-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                            onClick={() => router.push('/ingressos')}
                        >
                            Voltar para os ingressos
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                        <section className="space-y-6">
                            {/* Timer de checkout - mostra quando pedido está pendente ou failed */}
                            {(() => {
                                // Log removido - estava disparando a cada segundo por causa do timer
                                return null;
                            })()}
                            {/* Timer aparece quando há reserva OU pedido pendente */}
                            {((isCheckoutReady && reservation?._id && reservation.isActive && !order?._id && !pixPaymentActive) ||
                            (isCheckoutReady && order?._id && (order?.status === 'pending' || order?.status === 'failed') && !pixPaymentActive)) && (
                                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">
                                                    Tempo restante para finalizar
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    {order?._id ? 'Seu pedido será cancelado automaticamente' : 'Sua reserva será cancelada automaticamente'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`text-2xl font-bold ${checkoutTimer.minutes < 2 ? 'text-rose-600' : checkoutTimer.minutes < 5 ? 'text-amber-600' : 'text-amber-700'}`}>
                                                {String(checkoutTimer.minutes).padStart(2, '0')}:{String(checkoutTimer.seconds).padStart(2, '0')}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Barra de progresso */}
                                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                                        <div
                                            className={`h-full transition-all duration-1000 ${checkoutTimer.percentageRemaining < 20 ? 'bg-rose-500' : checkoutTimer.percentageRemaining < 50 ? 'bg-amber-500' : 'bg-amber-400'}`}
                                            style={{ width: `${checkoutTimer.percentageRemaining}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <CheckoutCartSummary
                                items={summarizedCart}
                                totalTickets={totalTickets}
                                totalAmount={totalAmount}
                                pixPaymentActive={pixPaymentActive}
                                onRemoveItem={handleRemoveItem}
                            />

                            <CustomerDataForm
                                data={customerData}
                                disabled={pixPaymentActive}
                                onChange={handleCustomerChange}
                                docTypeReady={true}
                            />
                        </section>

                        <section className="space-y-6">
                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] relative">
                                <header className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                            Formas de pagamento
                                        </h2>
                                        <p className="text-xs text-[#7d796c]">
                                            Utilize cartão de crédito ou gere um PIX instantâneo via Mercado Pago.
                                        </p>
                                    </div>
                                </header>

                                {!MP_PUBLIC_KEY ? (
                                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                        Configure a variável <span className="rounded bg-[#f5f1e8] px-1 font-mono text-xs">NEXT_PUBLIC_MP_PUBLIC_KEY</span>{' '}
                                        para habilitar o checkout do Mercado Pago.
                                    </div>
                                ) : null}

                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => !pixPaymentActive && setSelectedTab('card')}
                                        disabled={pixPaymentActive}
                                        aria-disabled={pixPaymentActive}
                                        className={`flex-1 rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.10em] transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${selectedTab === 'card'
                                            ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white shadow-[0_20px_45px_-20px_rgba(20,20,32,0.45)]'
                                            : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                                            }`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <HiOutlineCreditCard className="text-base" />
                                            Cartão de crédito
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTab('pix')}
                                        className={`flex-1 rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.10em] transition ${selectedTab === 'pix'
                                            ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white shadow-[0_20px_45px_-20px_rgba(20,20,32,0.45)]'
                                            : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                                            }`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <SiPix className="text-base" />
                                            Pagamento via PIX
                                        </span>
                                    </button>
                                </div>

                                {/* Mensagens de erro/sucesso no topo */}
                                {globalError ? (
                                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        {globalError}
                                    </div>
                                ) : null}
                                {globalSuccess ? (
                                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                        {globalSuccess}
                                    </div>
                                ) : null}

                                {/* Mensagem de erro de pagamento no topo (antes do formulário) */}
                                {selectedTab === 'card' && cardStatus === 'error' && cardStatusMessage ? (
                                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex-shrink-0">
                                                <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-semibold uppercase text-rose-800 mb-2">
                                                    Sua compra foi negada
                                                </h3>
                                                <p className="text-sm text-rose-700 mb-3">
                                                    {cardStatusMessage}
                                                </p>
                                                {cardStatusDetails.length > 0 && (
                                                    <ul className="space-y-1 mb-3">
                                                        {cardStatusDetails.map((detail, index) => (
                                                            <li key={index} className="text-sm text-rose-600">
                                                                • {detail}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleDismissCardStatus}
                                                    className="rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                                                >
                                                    Vamos revisar seus dados?
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {(() => {
                                    const shouldShowForm = isCheckoutReady && !pixPaymentActive;
                                    // Log removido - estava disparando a cada segundo por causa do timer
                                    return null;
                                })()}
                                {selectedTab === 'card' ? (
                                    <>
                                        <CardPaymentFormBrick
                                            onSubmit={handleCardPayment}
                                            isCheckoutReady={isCheckoutReady}
                                            isProcessing={isProcessing}
                                            status={cardStatus}
                                            statusMessage={cardStatusMessage}
                                            statusDetails={cardStatusDetails}
                                            isBlocked={isCardBlocked}
                                            redirectCountdown={redirectCountdown}
                                            onStartNewOrder={handleStartNewOrder}
                                            onStatusDismiss={handleDismissCardStatus}
                                            onNavigateToOrders={navigateToOrders}
                                            amount={totalAmount}
                                            publicKey={MP_PUBLIC_KEY || ''}
                                        />
                                    </>
                                ) : (
                                    <PixPaymentSection
                                        pixResult={pixResult}
                                        pixExpirationDescription={pixExpirationDescription}
                                        pixGenerationDeadlineMinutes={pixGenerationDeadlineMinutes}
                                        isCheckoutReady={isCheckoutReady}
                                        isProcessing={isProcessing}
                                        pixPaymentActive={pixPaymentActive}
                                        pixCopySuccess={pixCopySuccess}
                                        onCopyCode={handleCopyPixCode}
                                        onSubmit={handlePixPayment}
                                        pixStatus={pixStatus}
                                        pixStatusMessage={pixStatusMessage}
                                        redirectCountdown={redirectCountdown}
                                        onNavigateToOrders={navigateToOrders}
                                    />
                                )}

                                <div className="mt-6 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                                    <div className="flex items-center gap-3">
                                        <span className="mt-0.5 text-[#a38f78]">
                                            <SiPix className="text-base" />
                                        </span>
                                        <p>
                                            Pagamentos processados pelo Mercado Pago (Checkout Transparente). Ambiente seguro,
                                            com antifraude e 3D Secure quando necessário.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </Container>
        </main>
    );
}

export default function CheckoutPage() {
    return <CheckoutPageContent />;
}
