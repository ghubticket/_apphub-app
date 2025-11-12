'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    HiOutlineCreditCard,
    HiOutlineChevronDown,
} from 'react-icons/hi2';
import { SiPix } from 'react-icons/si';
import Container from '@/components/shared/Container';
import { useAuth } from '@/context/AuthContext';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import api from '@/lib/api';
import {
    CartItem,
    clearCartItems,
    loadCartItems,
    removeCartItem as removeCartItemFromStorage,
} from '@/lib/cart';
import { sanitizeInput, normalizeCpf, normalizePhone, formatCpfDisplay, formatPhoneDisplay, isValidCpf } from '@/utils/sanitize';
import type {
    CardFieldKey,
    CheckoutCartItem,
    CheckoutCustomerData,
    CreatedOrder,
    PixPaymentResult,
} from './types';
import {
    CARD_ERROR_CODE_MAP,
    CARD_ERROR_MESSAGES,
    CARD_FIELD_REQUIRED_MESSAGES,
} from './utils/cardMessages';
import { CardPaymentForm } from './components/CardPaymentForm';
import { CheckoutCartSummary } from './components/CheckoutCartSummary';
import { CustomerDataForm } from './components/CustomerDataForm';
import { PixPaymentSection } from './components/PixPaymentSection';
import { registerNumericMask } from './utils/inputMasks';
import { storageHelpers } from './utils/storageHelpers';
import { useCardForm } from './hooks/useCardForm';
import { useCardBrandDetection } from './hooks/useCardBrandDetection';
import { useMpSelects } from './hooks/useMpSelects';
import { processMercadoPagoError, extractPaymentMethodId, formatPaymentData, validateCardField } from './utils/paymentHelpers';

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
    }
}

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

export default function CheckoutPage() {
    const router = useRouter();
    const { user, isAuthenticated, isReady } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<CreatedOrder | null>(null);
    const [selectedTab, setSelectedTab] = useState<'card' | 'pix'>('card');
    const [globalError, setGlobalError] = useState<string>('');
    const [globalSuccess, setGlobalSuccess] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pixResult, setPixResult] = useState<PixPaymentResult | null>(null);
    const [checkingPaidOrder, setCheckingPaidOrder] = useState(true);
    const persistOrder = useCallback(
        (next: CreatedOrder | null) => {
            setOrder(next);
            if (next?._id) {
                storageHelpers.saveActiveOrderId(next._id);
            } else {
                storageHelpers.clearActiveOrderId();
            }
        },
        [],
    );

    // BUG CRÍTICO: Verificar se há pedido aprovado no sessionStorage ANTES de qualquer renderização
    // Este useEffect deve executar primeiro e redirecionar se encontrar pedido pago
    useEffect(() => {
        if (typeof window === 'undefined') {
            setCheckingPaidOrder(false);
            return;
        }
        if (!isReady || !isAuthenticated) {
            return;
        }

        const activeOrderId = storageHelpers.loadActiveOrderId();

        if (!activeOrderId) {
            setCheckingPaidOrder(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const response = await api.get(`/orders/${activeOrderId}`);
                const restoredOrder = response.data?.data;

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
                setCheckingPaidOrder(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isReady, isAuthenticated, router, persistOrder]);

    // Restaurar pedido pendente/failed normalmente (após verificação de pedido pago)
    useEffect(() => {
        if (order) return;
        const activeOrderId = storageHelpers.loadActiveOrderId();
        if (!activeOrderId) return;
        let cancelled = false;
        (async () => {
            try {
                const response = await api.get(`/orders/${activeOrderId}`);
                const restoredOrder = response.data?.data;

                // Se já foi verificado como pago no useEffect anterior, não restaurar
                if (restoredOrder?.status === 'paid') {
                    return;
                }

                if (
                    !cancelled &&
                    restoredOrder?._id &&
                    ['pending', 'failed'].includes(String(restoredOrder.status)) &&
                    restoredOrder.paymentMethod !== 'pix'
                ) {
                    persistOrder(restoredOrder);
                } else if (!cancelled) {
                    storageHelpers.clearActiveOrderId();
                }
            } catch (restoreError: any) {
                if (!cancelled) {
                    storageHelpers.clearActiveOrderId();
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [order, persistOrder]);
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
                const response = await api.get(`/orders/${order._id}`);
                const orderData = response.data?.data;
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
                        
                        // Configurar countdown de 5 segundos para mostrar overlay de sucesso
                        setRedirectCountdown(5);
                        
                        // Limpar timeouts/intervals anteriores se existirem
                        if (pixRedirectTimeoutRef.current) {
                            window.clearTimeout(pixRedirectTimeoutRef.current);
                            pixRedirectTimeoutRef.current = null;
                        }
                        if (blockCountdownIntervalRef.current) {
                            window.clearInterval(blockCountdownIntervalRef.current);
                            blockCountdownIntervalRef.current = null;
                        }
                        
                        // Iniciar countdown de 5 segundos
                        blockCountdownIntervalRef.current = window.setInterval(() => {
                            setRedirectCountdown((prev) => {
                                if (prev === null) return prev;
                                if (prev <= 1) {
                                    if (blockCountdownIntervalRef.current) {
                                        window.clearInterval(blockCountdownIntervalRef.current);
                                        blockCountdownIntervalRef.current = null;
                                    }
                                    return 0;
                                }
                                return prev - 1;
                            });
                        }, 1000);
                        
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
    const [cardErrors, setCardErrors] = useState<string[]>([]);
    const [cardFieldErrors, setCardFieldErrors] = useState<Partial<Record<CardFieldKey, string>>>({});
    const [selectedDocType, setSelectedDocType] = useState<string>('CPF');

    const mercadoPago = useMercadoPago(MP_PUBLIC_KEY);

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

    // Hook para detecção de bandeira do cartão
    const { cardBrand } = useCardBrandDetection({
        mercadoPago,
        selectedTab,
        onBrandDetected: () => {
            // Bandeira detectada - os selects serão atualizados automaticamente pelo useMpSelects
        },
        onBrandCleared: () => {
            // Bandeira limpa
        },
    });

    const cardBrandDisplay = useMemo(() => {
        if (!cardBrand) return '';
        const normalized = cardBrand.trim();
        if (!normalized) return '';
        if (normalized.length <= 3) {
            return normalized.toUpperCase();
        }
        return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    }, [cardBrand]);

    // Hook para gerenciar selects do Mercado Pago
    const { mpSelectReady } = useMpSelects({
        cardBrand,
        selectedTab,
    });

    // Hook para gerenciar cardForm do Mercado Pago
    const { cardFormRef } = useCardForm({
        mercadoPago,
        publicKey: MP_PUBLIC_KEY,
        totalAmount,
        selectedTab,
        callbacks: {
            onFormMounted: (error: any) => {
                if (error) {
                    setCardErrors([error.message ?? 'Não foi possível montar o formulário do cartão.']);
                }
            },
            onError: (error: any) => {
                const errorMessage = processMercadoPagoError(error);
                setCardErrors([errorMessage]);
            },
            onFetchInstallments: (error: any) => {
                if (error) {
                    setCardErrors((prev) => [
                        ...prev,
                        'Não foi possível carregar as opções de parcelamento. Verifique os dados do cartão.',
                    ]);
                }
            },
        },
        onCardBrandDetected: () => {
            // Bandeira detectada via callback do cardForm
        },
        onInstallmentsReady: () => {
            // Parcelas carregadas
        },
    });
    useEffect(() => {
        if (!mpSelectReady.docType) return;
        const input = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;
        if (!input) return;

        const formatCpf = (value: string) =>
            value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

        const formatCnpj = (value: string) =>
            value
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})$/, '$1-$2');

        const applyFormatting = (digits: string) => {
            const normalizedType = selectedDocType?.toUpperCase() || 'CPF';
            return normalizedType === 'CNPJ' ? formatCnpj(digits) : formatCpf(digits);
        };

        const normalizedType = selectedDocType?.toUpperCase() || 'CPF';
        const digitsLimit = normalizedType === 'CNPJ' ? 14 : 11;

        const handler = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const digitsOnly = target.value.replace(/\D/g, '');
            const trimmed = digitsOnly.slice(0, digitsLimit);
            target.dataset.rawValue = trimmed;
            target.value = trimmed ? applyFormatting(trimmed) : '';

            if (trimmed.length === digitsLimit) {
                setCardFieldErrors((prev) => {
                    if (!prev.identificationNumber) return prev;
                    const next = { ...prev };
                    delete next.identificationNumber;
                    return next;
                });
            }
        };

        input.placeholder = normalizedType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00';
        input.inputMode = 'numeric';

        const initialDigits = (input.dataset.rawValue || input.value || '').replace(/\D/g, '').slice(0, digitsLimit);
        input.dataset.rawValue = initialDigits;
        input.value = initialDigits ? applyFormatting(initialDigits) : '';

        input.addEventListener('input', handler);
        return () => {
            input.removeEventListener('input', handler);
        };
    }, [selectedDocType, mpSelectReady.docType, setCardFieldErrors]);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [cardStatus, setCardStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [cardStatusMessage, setCardStatusMessage] = useState('');
    const [cardStatusDetails, setCardStatusDetails] = useState<string[]>([]);
    const [isCardBlocked, setIsCardBlocked] = useState(false);
    const cardRedirectTimeoutRef = useRef<number | null>(null);
    const cardBlockRedirectTimeoutRef = useRef<number | null>(null);
    const blockCountdownIntervalRef = useRef<number | null>(null);
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

    const greetingName = useMemo(() => {
        if (!user) return 'Bem-vindo';
        return `Bem-vindo, ${user.name}`;
    }, [user]);

    const [customerData, setCustomerData] = useState<CheckoutCustomerData>(() => storageHelpers.loadCustomerData());
    const [persistCustomerData, setPersistCustomerData] = useState(true);

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
        script.onerror = (error) => {
            console.error('Não foi possível carregar o script de segurança do Mercado Pago.', error);
        };
        document.body.appendChild(script);

        return () => {
            script.onload = null;
            script.onerror = null;
        };
    }, []);

    const refreshCart = useCallback(async () => {
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
        }
    }, []);

    useEffect(() => {
        refreshCart();
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
        storageHelpers.saveCustomerData(customerData);
    }, [customerData, persistCustomerData]);

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

            if (mercadoPago) {
                candidate = (await resolveMaybePromise<string>(mercadoPago.getDeviceId?.())) ?? null;

                if (!candidate) {
                    candidate = (await resolveMaybePromise<string>(mercadoPago.device?.getId?.())) ?? null;
                }

                if (!candidate && typeof mercadoPago.security === 'function') {
                    try {
                        const security = mercadoPago.security();
                        if (security?.getDeviceId) {
                            candidate = (await resolveMaybePromise<string>(security.getDeviceId())) ?? null;
                        }
                        if (!candidate && security?.createDevice) {
                            candidate = (await resolveMaybePromise<string>(security.createDevice())) ?? null;
                        }
                    } catch (error) {
                        // Ignorar erros silenciosamente
                    }
                }
            }

            if (!candidate && cardFormRef.current?.getCardFormData) {
                try {
                    const formData = cardFormRef.current.getCardFormData();
                    candidate = formData?.deviceId || formData?.additional_info?.device_id || null;
                } catch (error) {
                    candidate = null;
                }
            }

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
        }, [deviceId, mercadoPago]);

    useEffect(() => {
        if (!mercadoPago) return;
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
    }, [mercadoPago, ensureDeviceIdAvailable]);

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


    useEffect(() => {
        if (selectedTab !== 'card') {
            setCardErrors([]);
            setCardFieldErrors({});
        }
    }, [selectedTab]);

    useEffect(() => {
        // Máscara para CVV (máximo 4 dígitos)
        const detachCvv = registerNumericMask('form-checkout__securityCode', 4);

        // Para o número do cartão, adicionar validação adicional para garantir limite
        // O onInput do CardPaymentForm já limita, mas vamos garantir também aqui para mudanças programáticas
        const cardNumberInput = document.getElementById('form-checkout__cardNumber') as HTMLInputElement | null;
        if (cardNumberInput) {
            // Garantir que o maxLength está definido (23 = 19 dígitos + 4 espaços)
            // Mas priorizar 16 dígitos como padrão (19 apenas para cartões específicos)
            cardNumberInput.maxLength = 23;

            // Validação adicional para detectar mudanças programáticas (do Mercado Pago)
            // Usar setInterval para verificar periodicamente se o valor ultrapassou o limite
            const checkInterval = setInterval(() => {
                if (cardNumberInput) {
                    const digitsOnly = cardNumberInput.value.replace(/\D/g, '');
                    // Limitar a 19 dígitos (máximo absoluto)
                    if (digitsOnly.length > 19) {
                        // Limitar a 19 dígitos e reformatar
                        const limited = digitsOnly.slice(0, 19);
                        const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ');
                        cardNumberInput.value = formatted;
                    }
                }
            }, 100); // Verificar a cada 100ms

            return () => {
                detachCvv();
                clearInterval(checkInterval);
            };
        }

        return () => {
            detachCvv();
        };
    }, [selectedTab]);

    useEffect(() => {
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;

        const applyPrefill = () => {
            const docInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;
            const docTypeSelect = document.getElementById('form-checkout__identificationType') as HTMLSelectElement | null;
            const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement | null;

            const normalizedCpf = normalizeCpf(customerData.cpf);

            if (emailInput && customerData.email && !emailInput.value) {
                emailInput.value = customerData.email;
            }

            if (docInput && normalizedCpf) {
                if (docInput.value !== normalizedCpf) {
                    docInput.value = normalizedCpf;
                    docInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            if (docTypeSelect && normalizedCpf) {
                if (docTypeSelect.options.length === 0) {
                    return false;
                }
                const hasCpfOption = Array.from(docTypeSelect.options).some((option) => option.value === 'CPF');
                if (hasCpfOption && docTypeSelect.value !== 'CPF') {
                    docTypeSelect.value = 'CPF';
                    docTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            return true;
        };

        const applied = applyPrefill();
        if (!applied) {
            retryTimeout = setTimeout(() => {
                applyPrefill();
            }, 250);
        }

        return () => {
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, [customerData.cpf, customerData.email, selectedTab]);

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

    const handleCardFormValidationErrors = useCallback(
        (cardFormData: any) => {
            if (!cardFormData) return false;
            if (cardFormData?.token) {
                return false;
            }

            const extractMessages = (field: any): string[] => {
                if (!field) return [];
                if (Array.isArray(field)) {
                    return field.flatMap((item) => extractMessages(item));
                }
                if (typeof field === 'object') {
                    if (field.message) {
                        return [String(field.message)];
                    }
                    if (field.messages) {
                        const messages = Array.isArray(field.messages) ? field.messages : [field.messages];
                        return messages.map((msg: any) => String(msg));
                    }
                    return Object.values(field).flatMap((value) => extractMessages(value));
                }
                return [];
            };

            const translated: string[] = [];
            const fieldErrors: Partial<Record<CardFieldKey, string>> = {};

            Object.entries(cardFormData).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    return;
                }
                const messages = extractMessages(value);
                messages.forEach((message) => {
                    const normalized = message.toLowerCase();
                    if (normalized.includes('cardnumber') || normalized.includes('card number')) {
                        fieldErrors.cardNumber = CARD_FIELD_REQUIRED_MESSAGES.cardNumber;
                        translated.push(CARD_FIELD_REQUIRED_MESSAGES.cardNumber);
                        return;
                    }
                    if (normalized.includes('cardholdername') || normalized.includes('card holder name')) {
                        fieldErrors.cardholderName = CARD_FIELD_REQUIRED_MESSAGES.cardholderName;
                        translated.push(CARD_FIELD_REQUIRED_MESSAGES.cardholderName);
                        return;
                    }
                    if (normalized.includes('cardholderemail') || normalized.includes('card holder email')) {
                        fieldErrors.cardholderEmail = CARD_FIELD_REQUIRED_MESSAGES.cardholderEmail;
                        translated.push(CARD_FIELD_REQUIRED_MESSAGES.cardholderEmail);
                        return;
                    }
                    if (normalized.includes('cardexpirationmonth')) {
                        fieldErrors.cardExpirationMonth = CARD_FIELD_REQUIRED_MESSAGES.cardExpirationMonth;
                        translated.push(CARD_FIELD_REQUIRED_MESSAGES.cardExpirationMonth);
                        return;
                    }
                    if (normalized.includes('cardexpirationyear')) {
                        fieldErrors.cardExpirationYear = CARD_FIELD_REQUIRED_MESSAGES.cardExpirationYear;
                        translated.push(CARD_FIELD_REQUIRED_MESSAGES.cardExpirationYear);
                        return;
                    }
                    if (normalized.includes('securitycode')) {
                        fieldErrors.securityCode = CARD_FIELD_REQUIRED_MESSAGES.securityCode;
                        translated.push(CARD_FIELD_REQUIRED_MESSAGES.securityCode);
                        return;
                    }
                    if (normalized.includes('identificationnumber')) {
                        const normalizedType = selectedDocType?.toUpperCase() || 'CPF';
                        const docMessage =
                            normalizedType === 'CNPJ'
                                ? 'Informe o CNPJ do titular do cartão (14 dígitos).'
                                : 'Informe o CPF do titular do cartão (11 dígitos).';
                        fieldErrors.identificationNumber = docMessage;
                        translated.push(docMessage);
                        return;
                    }
                    if (normalized.includes('invalid parameter identificationnumber')) {
                        const normalizedType = selectedDocType?.toUpperCase() || 'CPF';
                        const docMessage =
                            normalizedType === 'CNPJ'
                                ? 'Documento do titular inválido. Digite o CNPJ com 14 números.'
                                : 'CPF inválido. Verifique os números e tente novamente.';
                        fieldErrors.identificationNumber = docMessage;
                        translated.push(docMessage);
                        return;
                    }
                    translated.push(message || 'Existem campos obrigatórios não preenchidos.');
                });
            });

            if (Object.keys(fieldErrors).length) {
                setCardFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
            }

            if (translated.length) {
                const uniqueErrors = Array.from(new Set(translated));
                setCardErrors(uniqueErrors);
                return true;
            }

            return false;
        },
        [selectedDocType],
    );

    const validateCardFormFields = useCallback(() => {
        const cardNumberInput = document.getElementById('form-checkout__cardNumber') as HTMLInputElement | null;
        const cardholderNameInput = document.getElementById('form-checkout__cardholderName') as HTMLInputElement | null;
        const cardholderEmailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement | null;
        const expirationMonthInput = document.getElementById(
            'form-checkout__cardExpirationMonth',
        ) as HTMLSelectElement | null;
        const expirationYearInput = document.getElementById(
            'form-checkout__cardExpirationYear',
        ) as HTMLSelectElement | null;
        const securityCodeInput = document.getElementById('form-checkout__securityCode') as HTMLInputElement | null;
        const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement | null;
        const documentInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;

        const errors: string[] = [];
        const fieldErrors: Partial<Record<CardFieldKey, string>> = {};

        // Validação de campos do cartão

        // REGRA DE NEGÓCIO:
        // Campos obrigatórios iniciais: número do cartão, mês, ano, CVV, nome igual ao cartão
        // Campos que se tornam obrigatórios APÓS preencher o cartão: parcelas, tipo de documento, CPF

        // 1. Validar campos obrigatórios iniciais
        const cardNumberDigits = cardNumberInput?.value.replace(/\D/g, '') || '';
        // Padrão ISO 7812: permite cartões com 13 a 19 dígitos (flexível)
        // Não limitar a tamanhos específicos, apenas ao range 13-19
        if (cardNumberDigits.length === 0) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardNumber;
            errors.push(message);
            fieldErrors.cardNumber = message;
        } else if (cardNumberDigits.length < 13) {
            const message = 'Número do cartão muito curto. Cartões devem ter entre 13 e 19 dígitos (padrão ISO 7812).';
            errors.push(message);
            fieldErrors.cardNumber = message;
        } else if (cardNumberDigits.length > 19) {
            const message = 'Número do cartão muito longo. Cartões devem ter entre 13 e 19 dígitos (padrão ISO 7812).';
            errors.push(message);
            fieldErrors.cardNumber = message;
        }
        // Se estiver entre 13-19 dígitos, está válido segundo ISO 7812

        if (!cardholderNameInput?.value.trim()) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardholderName;
            errors.push(message);
            fieldErrors.cardholderName = message;
        }

        const emailValue = cardholderEmailInput?.value.trim() || '';
        if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardholderEmail;
            errors.push(message);
            fieldErrors.cardholderEmail = message;
        }

        // Validação de Mês (MM) - Mercado Pago: formato MM (01-12)
        // OBRIGATÓRIO: mês deve ser preenchido
        const monthValueRaw = expirationMonthInput?.value || '';
        const monthDigits = monthValueRaw.replace(/\D/g, '');
        const monthValue = Number(monthDigits);

        // Verificar se está vazio ou não foi selecionado
        if (!monthValueRaw || monthValueRaw.trim() === '' || monthDigits.length === 0) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardExpirationMonth;
            errors.push(message);
            fieldErrors.cardExpirationMonth = message;
        } else if (monthDigits.length !== 2) {
            const message = 'Use dois dígitos para o mês (ex: 09).';
            errors.push(message);
            fieldErrors.cardExpirationMonth = message;
        } else if (monthValue < 1 || monthValue > 12) {
            const message = 'Mês inválido. Use um valor entre 01 e 12.';
            errors.push(message);
            fieldErrors.cardExpirationMonth = message;
        }

        // Validação de Ano (AA) - Mercado Pago: formato AA (2 dígitos), deve ser ano atual ou futuro
        // OBRIGATÓRIO: ano deve ser preenchido
        const yearValueRaw = expirationYearInput?.value || '';
        const yearDigits = yearValueRaw.replace(/\D/g, '');
        const yearValue = Number(yearDigits);
        const currentYear = new Date().getFullYear();
        const currentYear2Digits = currentYear % 100; // Últimos 2 dígitos do ano atual
        const currentMonth = new Date().getMonth() + 1; // Mês atual (1-12)

        // Verificar se está vazio ou não foi selecionado
        if (!yearValueRaw || yearValueRaw.trim() === '' || yearDigits.length === 0) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardExpirationYear;
            errors.push(message);
            fieldErrors.cardExpirationYear = message;
        } else if (yearDigits.length !== 2) {
            const message = 'Use dois dígitos para o ano (ex: 25).';
            errors.push(message);
            fieldErrors.cardExpirationYear = message;
        } else {
            // Converter ano de 2 dígitos para 4 dígitos (assumir século 2000)
            // Ex: 25 = 2025, 24 = 2024, 99 = 2099, 00 = 2000
            // Para cartões de crédito, anos de 2 dígitos são sempre do século 2000 (2000-2099)
            const fullYear = 2000 + yearValue;

            // Validar se o cartão não está expirado
            // Mercado Pago: cartão é válido até o último dia do mês/ano indicado
            if (fullYear < currentYear) {
                const message = 'Cartão expirado. Verifique a data de validade.';
                errors.push(message);
                fieldErrors.cardExpirationYear = message;
            } else if (fullYear === currentYear && monthValue < currentMonth) {
                // Se o ano é o atual, o mês deve ser >= mês atual
                // Ex: se estamos em nov/2024, mês 10/2024 está expirado
                const message = 'Cartão expirado. Verifique a data de validade.';
                errors.push(message);
                fieldErrors.cardExpirationYear = message;
                // Também marcar o mês como erro se ainda não tiver erro
                if (!fieldErrors.cardExpirationMonth) {
                    fieldErrors.cardExpirationMonth = message;
                }
            }
        }

        // Validação de CVV - Mercado Pago: 3 dígitos (Visa, Mastercard) ou 4 dígitos (American Express)
        const securityDigits = securityCodeInput?.value.replace(/\D/g, '') || '';
        if (!securityDigits || securityDigits.length === 0) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.securityCode;
            errors.push(message);
            fieldErrors.securityCode = message;
        } else if (securityDigits.length < 3) {
            const message = 'Código de segurança deve ter 3 ou 4 dígitos.';
            errors.push(message);
            fieldErrors.securityCode = message;
        } else if (securityDigits.length > 4) {
            const message = 'Código de segurança deve ter no máximo 4 dígitos.';
            errors.push(message);
            fieldErrors.securityCode = message;
        } else if (securityDigits.length !== 3 && securityDigits.length !== 4) {
            // Garantir que seja exatamente 3 ou 4 dígitos (não 1, 2, 5, etc)
            const message = 'Código de segurança deve ter 3 dígitos (Visa/Mastercard) ou 4 dígitos (American Express).';
            errors.push(message);
            fieldErrors.securityCode = message;
        }

        // 2. Verificar se o cartão foi preenchido (tem cardBrand ou número válido)
        const isCardFilled = Boolean(cardBrand) || (cardNumberDigits.length >= 13 && cardNumberDigits.length <= 19);

        // 3. Se o cartão foi preenchido, validar campos que se tornam obrigatórios
        if (isCardFilled) {
            // Parcelas se torna obrigatório
            if (!installmentsSelect?.value) {
                const message = CARD_FIELD_REQUIRED_MESSAGES.installments;
                errors.push(message);
                fieldErrors.installments = message;
            }

            // Tipo de documento e CPF se tornam obrigatórios
            const normalizedDocType = selectedDocType?.toUpperCase() || 'CPF';
            const documentDigits = documentInput?.value.replace(/\D/g, '') || '';
            if (normalizedDocType === 'CPF') {
                if (!isValidCpf(documentDigits)) {
                    const message = 'Informe um CPF válido do titular do cartão.';
                    errors.push(message);
                    fieldErrors.identificationNumber = message;
                }
            } else {
                const expectedDocLength = normalizedDocType === 'CNPJ' ? 14 : 11;
                if (documentDigits.length !== expectedDocLength) {
                    const message =
                        normalizedDocType === 'CNPJ'
                            ? 'Informe o CNPJ do titular do cartão (14 dígitos).'
                            : 'Informe o documento do titular do cartão.';
                    errors.push(message);
                    fieldErrors.identificationNumber = message;
                }
            }
        }

        // Não usar setCardErrors - erros apenas nos campos individuais
        setCardFieldErrors(fieldErrors);

        // Log de debug para verificar validação

        return errors.length === 0;
    }, [selectedDocType, cardBrand]);

    const ensureOrder = useCallback(
        async (options: { allowReuse?: boolean } = {}) => {
            const { allowReuse = false } = options;
            if (order) return order;
            if (!primaryCartItem) {
                throw new Error('Carrinho vazio.');
            }
            if (!primaryCartItem.eventId) {
                throw new Error('Evento não identificado para este ingresso.');
            }
            if (!validateCustomerData()) {
                throw new Error('Dados do comprador inválidos.');
            }

            const normalizedCpf = normalizeCpf(customerData.cpf);
            const normalizedPhone = normalizePhone(customerData.phone);
            const formattedCpf = formatCpfDisplay(normalizedCpf);
            const formattedPhone = formatPhoneDisplay(normalizedPhone);

            try {
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
                if (!createdOrder?._id) {
                    throw new Error('Não foi possível criar o pedido.');
                }
                persistOrder(createdOrder);
                return createdOrder;
            } catch (error: any) {
                const message =
                    error?.response?.data?.message ||
                    (Array.isArray(error?.response?.data?.errors) ? error.response.data.errors.join(', ') : undefined) ||
                    error?.message ||
                    'Não foi possível criar o pedido. Tente novamente.';
                setGlobalError(message);
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
        setCardErrors([]);
        setCardFieldErrors({});
        storageHelpers.clearCustomerData();
        storageHelpers.clearActiveOrderId();
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
        // Não limpar o estado visual do React (setCartItems, etc.) para evitar "flash" de checkout vazio
        // O redirecionamento acontecerá imediatamente, então não importa
        setRedirectCountdown(null);
        setIsCardBlocked(false);
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        } else {
            router.push('/');
        }
    }, [router]);

    const handleDismissCardStatus = useCallback(() => {
        if (isCardBlocked) {
            handleStartNewOrder();
            return;
        }
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
        setRedirectCountdown(null);
        setIsCardBlocked(false);
        setCardStatus('idle');
        setCardStatusMessage('');
        setCardStatusDetails([]);
    }, [handleStartNewOrder, isCardBlocked]);

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
        setRedirectCountdown(null);
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
            setCardErrors([]);
            setCardFieldErrors({});
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
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn('[checkout][card] cancelPendingOrder keepalive failed', error);
                    }
                }
                return;
            }

            try {
                await api.post(`/orders/${orderId}/cancel`, { reason });
            } catch (error) {
                // Ignorar erros ao cancelar pedido pendente
            }
        },
        [getStoredToken],
    );

    const cardPaymentSettledRef = useRef(false);
    useEffect(() => {
        cardPaymentSettledRef.current = cardStatus === 'success';
    }, [cardStatus]);

    // Removido: não cancelar pedidos PIX automaticamente ao sair da página
    // Pedidos PIX devem respeitar o tempo de expiração do Mercado Pago (30 minutos)
    // O backend irá cancelar automaticamente quando realmente expirar
    // useEffect(() => {
    //     if (!order) return;
    //     const handleBeforeUnload = () => {
    //         if (order && pixPaymentActive) {
    //             cancelPendingOrder(order._id, { keepalive: true });
    //         }
    //     };
    //     window.addEventListener('beforeunload', handleBeforeUnload);
    //     return () => {
    //         window.removeEventListener('beforeunload', handleBeforeUnload);
    //         if (order && pixPaymentActive) {
    //             void cancelPendingOrder(order._id, { reason: 'checkout_pix_abandoned_cleanup' });
    //         }
    //     };
    // }, [order, pixPaymentActive, cancelPendingOrder]);

    const handleCardPayment = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setGlobalError('');
            setGlobalSuccess('');
            setPixResult(null);
            setCardErrors([]);
            setCardStatusDetails([]);

            // VALIDAÇÃO DEVE ACONTECER ANTES DE SETAR STATUS COMO 'processing'
            // Regra de negócio: validar campos obrigatórios iniciais primeiro
            setCardFieldErrors({});
            const isValid = validateCardFormFields();
            if (!isValid) {
                // Validação falhou - erros já foram setados em setCardFieldErrors
                // Não setar status como 'processing' se a validação falhou
                setCardStatus('idle');
                setIsProcessing(false);
                return;
            }

            // Se passou na validação, agora pode setar como 'processing'
            setCardStatus('processing');
            setCardStatusMessage('Estamos processando seu pagamento com segurança...');

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
            if (!cardFormRef.current) {
                setGlobalError('O formulário de cartão ainda não está pronto. Aguarde alguns segundos e tente novamente.');
                setCardStatus('idle');
                return;
            }
            if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
                setCardErrors([
                    'O Mercado Pago exige conexão segura (HTTPS) para processar cartões. Acesse o checkout via https:// para continuar.',
                ]);
                setCardStatus('idle');
                return;
            }

            const currentDeviceId = await ensureDeviceIdAvailable(deviceId !== null, 'card-submit');
            if (!currentDeviceId) {
                setCardErrors([
                    'Não foi possível obter o deviceId do Mercado Pago. Recarregue a página (em HTTPS) e tente novamente.',
                ]);
                setCardStatus('idle');
                return;
            }

            let createdOrder: CreatedOrder | null = null;

            try {
                setIsProcessing(true);
                setCardErrors([]);

                const docInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;
                const cardholderNameInput = document.getElementById('form-checkout__cardholderName') as HTMLInputElement | null;
                const cardholderEmailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement | null;
                const originalDocValue = docInput?.value ?? null;
                const originalDocRaw = docInput?.dataset.rawValue;
                let identificationDigits = '';
                if (docInput) {
                    const rawDoc = originalDocRaw ?? docInput.value ?? '';
                    const digits = rawDoc.replace(/\D/g, '');
                    docInput.value = digits;
                    docInput.dataset.rawValue = digits;
                    identificationDigits = digits;
                }

                if (process.env.NODE_ENV !== 'production') {
                    const methods = cardFormRef.current && typeof cardFormRef.current === 'object' ? Object.keys(cardFormRef.current) : [];
                    console.log('[checkout][card] cardForm methods before tokenization', methods);
                }
                const resolveMaybePromise = async <T,>(value: T | Promise<T> | undefined | null): Promise<T | null> => {
                    if (!value) return null;
                    if (typeof (value as any)?.then === 'function') {
                        try {
                            return await (value as Promise<T>);
                        } catch (promiseError) {
                            console.warn('[checkout][card] token helper promise rejected', promiseError);
                            return null;
                        }
                    }
                    return value as T;
                };
                try {
                    if (typeof cardFormRef.current?.createToken === 'function') {
                        await resolveMaybePromise<any>(cardFormRef.current.createToken());
                    } else if (typeof cardFormRef.current?.createCardToken === 'function') {
                        await resolveMaybePromise<any>(cardFormRef.current.createCardToken());
                    } else if (typeof cardFormRef.current?.submit === 'function') {
                        await resolveMaybePromise<any>(cardFormRef.current.submit());
                    }
                } catch (tokenError) {
                    // Ignorar erros de tokenização
                }

                const cardFormData = cardFormRef.current.getCardFormData();

                if (docInput) {
                    if (originalDocValue !== null) {
                        docInput.value = originalDocValue;
                    }
                    if (typeof originalDocRaw !== 'undefined') {
                        docInput.dataset.rawValue = originalDocRaw;
                    }
                    if (originalDocValue) {
                        docInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }

                if (handleCardFormValidationErrors(cardFormData)) {
                    setCardStatus('idle');
                    setIsProcessing(false);
                    return;
                }
                if (!cardFormData?.token) {
                    setCardStatus('idle');
                    throw new Error('Não foi possível gerar o token do cartão. Verifique os dados e tente novamente.');
                }

                createdOrder = await ensureOrder({ allowReuse: true });
                if (!createdOrder?._id) {
                    throw new Error('Não foi possível criar o pedido para processar o pagamento.');
                }

                const installments = Number(cardFormData.installments || 1);

                // Obter paymentMethodId: primeiro do cardFormData, depois do dataset do input, depois buscar pelo BIN
                let paymentMethodId = cardFormData.paymentMethodId;

                // Se não veio no cardFormData, tentar obter do dataset do input (armazenado durante detecção de bandeira)
                if (!paymentMethodId) {
                    const cardNumberInput = document.getElementById('form-checkout__cardNumber') as HTMLInputElement | null;
                    paymentMethodId = cardNumberInput?.dataset.paymentMethodId || '';
                }

                // Se ainda não tiver, tentar buscar pelo BIN usando getPaymentMethods
                if (!paymentMethodId && mercadoPago) {
                    try {
                        // Tentar obter número do cartão do cardFormData ou do input diretamente
                        let cardNumberDigits = cardFormData.cardNumber?.replace(/\D/g, '') || '';
                        if (!cardNumberDigits) {
                            const cardNumberInput = document.getElementById('form-checkout__cardNumber') as HTMLInputElement | null;
                            cardNumberDigits = cardNumberInput?.value?.replace(/\D/g, '') || '';
                        }

                        if (cardNumberDigits.length >= 6) {
                            const bin = cardNumberDigits.slice(0, 6);
                            const response: any = await (mercadoPago as any).getPaymentMethods({ bin });

                            // A resposta pode vir em diferentes formatos
                            let firstResult: any = null;
                            if (Array.isArray(response)) {
                                firstResult = response[0];
                            } else if (response?.results && Array.isArray(response.results)) {
                                firstResult = response.results[0];
                            } else if (response?.data && Array.isArray(response.data)) {
                                firstResult = response.data[0];
                            } else {
                                firstResult = response;
                            }

                            paymentMethodId =
                                firstResult?.payment_method_id ||
                                firstResult?.id ||
                                firstResult?.payment_method?.id ||
                                '';

                            if (process.env.NODE_ENV !== 'production') {
                                console.log('[checkout][card] Buscando paymentMethodId no handleCardPayment:', {
                                    response,
                                    firstResult,
                                    paymentMethodId
                                });
                            }

                            // Armazenar para próxima vez
                            const cardNumberInput = document.getElementById('form-checkout__cardNumber') as HTMLInputElement | null;
                            if (cardNumberInput && paymentMethodId) {
                                cardNumberInput.dataset.paymentMethodId = paymentMethodId;
                            }
                        }
                    } catch (pmError) {
                        // Ignorar erros ao buscar paymentMethodId
                    }
                }

                // Mapear cardBrand para paymentMethodId se ainda não tiver (fallback)
                if (!paymentMethodId && cardBrand) {
                    const brandLower = cardBrand.toLowerCase();
                    if (brandLower.includes('visa')) {
                        paymentMethodId = 'visa';
                    } else if (brandLower.includes('mastercard') || brandLower.includes('master')) {
                        paymentMethodId = 'master';
                    } else if (brandLower.includes('amex') || brandLower.includes('american express')) {
                        paymentMethodId = 'amex';
                    } else if (brandLower.includes('elo')) {
                        paymentMethodId = 'elo';
                    } else if (brandLower.includes('hipercard')) {
                        paymentMethodId = 'hipercard';
                    }
                }

                const cardholderNameValue = (cardFormData.cardholderName || cardholderNameInput?.value || customerData.name || '').trim();
                const cardholderEmailValue = (cardFormData.cardholderEmail || cardholderEmailInput?.value || customerData.email || '').trim();
                const identificationTypeValue = (cardFormData.identificationType || selectedDocType || 'CPF').toUpperCase();
                const identificationNumberValue = (cardFormData.identificationNumber || identificationDigits || '').replace(/\D/g, '');
                if (identificationTypeValue === 'CPF' && !isValidCpf(identificationNumberValue)) {
                    setCardErrors(['Informe um CPF válido do titular do cartão.']);
                    setCardFieldErrors((prev) => ({ ...prev, identificationNumber: 'Informe um CPF válido do titular do cartão.' }));
                    setCardStatus('idle');
                    setIsProcessing(false);
                    return;
                }

                // Validar paymentMethodId antes de enviar
                if (!paymentMethodId) {
                    setCardErrors(['Método de pagamento é obrigatório. Verifique os dados do cartão e tente novamente.']);
                    setCardFieldErrors((prev) => ({ ...prev, cardNumber: 'Método de pagamento não identificado. Verifique o número do cartão.' }));
                    setCardStatus('idle');
                    setIsProcessing(false);
                    return;
                }

                const payload = {
                    token: cardFormData.token,
                    paymentMethodId,
                    installments,
                    issuerId: cardFormData.issuerId || undefined,
                    cardholder: {
                        name: cardholderNameValue,
                        email: cardholderEmailValue,
                        identification: {
                            type: identificationTypeValue,
                            number: identificationNumberValue,
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

                // Verificar se o pagamento foi realmente aprovado
                if (internalStatus === 'paid' || paymentStatus === 'approved' || paymentStatus === 'accredited') {
                    // PAGAMENTO APROVADO - mostrar mensagem de sucesso
                    // NÃO chamar finalizeSuccess aqui - ele limpa o carrinho imediatamente
                    // O carrinho deve permanecer visível até o usuário clicar no botão (igual ao comportamento do erro)
                    setIsCardBlocked(false);
                    setRedirectCountdown(null);
                    if (blockCountdownIntervalRef.current) {
                        window.clearInterval(blockCountdownIntervalRef.current);
                        blockCountdownIntervalRef.current = null;
                    }
                    if (cardBlockRedirectTimeoutRef.current) {
                        window.clearTimeout(cardBlockRedirectTimeoutRef.current);
                        cardBlockRedirectTimeoutRef.current = null;
                    }
                    setCardStatus('success');
                    setCardStatusMessage('Seu pagamento foi aprovado e seu ingresso já está disponível, vamos te levar pra lá.');
                    setCardStatusDetails(['Seu pagamento foi aprovado e seu ingresso já está disponível, vamos te levar pra lá.']);

                    // BUG CRÍTICO: Limpar sessionStorage e carrinho imediatamente quando pagamento é aprovado
                    // Isso evita que ao apertar F5 ou navegar de volta, o pedido/carrinho seja restaurado
                    storageHelpers.clearActiveOrderId();
                    clearCartItems();
                    // Também limpar o estado do pedido para evitar restauração
                    persistOrder(null);
                    setPixResult(null);
                    
                    // Configurar countdown de 5 segundos para mostrar overlay de sucesso
                    setRedirectCountdown(5);
                    
                    // Limpar timeouts/intervals anteriores se existirem
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
                    
                    // Iniciar countdown de 5 segundos
                    blockCountdownIntervalRef.current = window.setInterval(() => {
                        setRedirectCountdown((prev) => {
                            if (prev === null) return prev;
                            if (prev <= 1) {
                                if (blockCountdownIntervalRef.current) {
                                    window.clearInterval(blockCountdownIntervalRef.current);
                                    blockCountdownIntervalRef.current = null;
                                }
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                    
                    // Redirecionar automaticamente após 5 segundos
                    cardRedirectTimeoutRef.current = window.setTimeout(() => {
                        navigateToOrders();
                    }, 5000);
                } else {
                    // Pagamento não foi aprovado - tratar como erro ou pendente
                    const userMessage = statusInfo?.userMessage || 'Pagamento processado. Aguardando confirmação...';
                    const requiresAction = statusInfo?.requiresAction || false;

                    if (requiresAction || internalStatus === 'pending' || internalStatus === 'in_process') {
                        // Pagamento pendente - aguardar confirmação
                        setCardStatus('processing');
                        setCardStatusMessage(userMessage);
                        setCardStatusDetails([]);
                        // Não redirecionar - aguardar webhook ou próxima verificação
                    } else {
                        // Pagamento falhou ou foi cancelado
                        throw new Error(userMessage || 'Pagamento não foi aprovado. Verifique os dados e tente novamente.');
                    }
                }
            } catch (error: any) {
                console.log('Erro no pagamento com cartão:', error);
                const attemptsValueRaw = error?.response?.data?.cardAttempts;
                const maxAttemptsValueRaw = error?.response?.data?.maxCardAttempts;
                const attemptsValue = Number(attemptsValueRaw);
                const maxAttemptsValue = Number(maxAttemptsValueRaw);
                const hasAttemptInfo =
                    Number.isFinite(attemptsValue) && Number.isFinite(maxAttemptsValue) && maxAttemptsValue > 0;
                const attemptDescription = hasAttemptInfo
                    ? attemptsValue >= maxAttemptsValue
                        ? `Tentativas esgotadas (${Math.min(attemptsValue, maxAttemptsValue)} de ${maxAttemptsValue}).`
                        : `Tentativa ${attemptsValue} de ${maxAttemptsValue}.`
                    : undefined;

                if (error?.response?.status === 429) {
                    const backendLimitMessage =
                        error?.response?.data?.message ||
                        'Você excedeu o número máximo de tentativas para este pedido. Inicie um novo pedido.';
                    const limitFriendlyMessage = 'Você excedeu o limite de tentativas para este pedido.';

                    setIsCardBlocked(true);
                    setRedirectCountdown(10);

                    if (blockCountdownIntervalRef.current) {
                        window.clearInterval(blockCountdownIntervalRef.current);
                        blockCountdownIntervalRef.current = null;
                    }
                    blockCountdownIntervalRef.current = window.setInterval(() => {
                        setRedirectCountdown((prev) => {
                            if (prev === null) return prev;
                            if (prev <= 1) {
                                if (blockCountdownIntervalRef.current) {
                                    window.clearInterval(blockCountdownIntervalRef.current);
                                    blockCountdownIntervalRef.current = null;
                                }
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);

                    // Limpar apenas localStorage/sessionStorage, mantendo o estado visual do checkout
                    storageHelpers.clearCustomerData();
                    storageHelpers.clearActiveOrderId();
                    clearCartItems();
                    // Não limpar o estado visual do pedido (persistOrder) para manter o checkout visível
                    // Apenas limpar estados relacionados ao formulário de pagamento
                    setPixResult(null);
                    setGlobalError('');
                    setCardErrors([]);
                    setCardFieldErrors({});

                    const detailMessages: string[] = [backendLimitMessage || limitFriendlyMessage];
                    if (attemptDescription) {
                        detailMessages.push(attemptDescription);
                    }
                    // Removida mensagem estática de redirecionamento - o contador já mostra isso dinamicamente

                    setCardStatus('error');
                    setCardStatusMessage(limitFriendlyMessage);
                    setCardStatusDetails(detailMessages);

                    if (cardRedirectTimeoutRef.current) {
                        window.clearTimeout(cardRedirectTimeoutRef.current);
                        cardRedirectTimeoutRef.current = null;
                    }
                    if (cardBlockRedirectTimeoutRef.current) {
                        window.clearTimeout(cardBlockRedirectTimeoutRef.current);
                        cardBlockRedirectTimeoutRef.current = null;
                    }
                    cardBlockRedirectTimeoutRef.current = window.setTimeout(() => {
                        handleStartNewOrder();
                    }, 10000);
                    return;
                }
                const collectedMessages: string[] = [];
                if (error?.response?.data?.errors) {
                    const rawErrors = Array.isArray(error.response.data.errors)
                        ? error.response.data.errors
                        : [error.response.data.errors];
                    const fieldErrors: Partial<Record<CardFieldKey, string>> = {};

                    rawErrors.forEach((err: any) => {
                        const code = String(err?.code || '').toUpperCase();
                        const fallbackMessage = typeof err?.message === 'string' ? err.message : undefined;
                        const mapped = CARD_ERROR_CODE_MAP[code];
                        if (mapped) {
                            const customMessage =
                                mapped.field === 'identificationNumber' && selectedDocType?.toUpperCase() === 'CNPJ'
                                    ? 'Informe o CNPJ do titular do cartão (14 dígitos).'
                                    : mapped.message;
                            fieldErrors[mapped.field] = customMessage;
                            collectedMessages.push(customMessage);
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

                    if (Object.keys(fieldErrors).length) {
                        setCardFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
                    }
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

                setGlobalError('');
                setCardErrors([]);
                setIsCardBlocked(false);
                setRedirectCountdown(null);
                if (blockCountdownIntervalRef.current) {
                    window.clearInterval(blockCountdownIntervalRef.current);
                    blockCountdownIntervalRef.current = null;
                }
                if (cardBlockRedirectTimeoutRef.current) {
                    window.clearTimeout(cardBlockRedirectTimeoutRef.current);
                    cardBlockRedirectTimeoutRef.current = null;
                }
                const detailsWithAttempts = [...displayMessages];
                if (attemptDescription && !detailsWithAttempts.includes(attemptDescription)) {
                    detailsWithAttempts.push(attemptDescription);
                }
                setCardStatusDetails(detailsWithAttempts);
                if (createdOrder?._id) {
                    if (hasAttemptInfo) {
                        persistOrder({
                            ...createdOrder,
                            cardAttempts: attemptsValue,
                            maxCardAttempts: Number.isFinite(maxAttemptsValue) ? maxAttemptsValue : createdOrder.maxCardAttempts,
                        });
                    } else {
                        persistOrder(createdOrder);
                    }
                }
                if (cardRedirectTimeoutRef.current && typeof window !== 'undefined') {
                    window.clearTimeout(cardRedirectTimeoutRef.current);
                    cardRedirectTimeoutRef.current = null;
                }
                setCardStatus('error');
                setCardStatusMessage(message);
            } finally {
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
            handleCardFormValidationErrors,
            navigateToOrders,
            handleStartNewOrder,
            resetCheckoutState,
            primaryCartItem,
            selectedDocType,
            validateCardFormFields,
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

                const createdOrder = await ensureOrder({ allowReuse: false });

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
                setPixResult(data);
                setSelectedTab('pix');
                finalizeSuccess('Pagamento PIX gerado! Use o QR Code ou código copia e cola.', {
                    preserveCartState: true,
                    showGlobalMessage: false,
                });
            } catch (error: any) {
                console.error('Erro ao gerar PIX:', error);
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

    const clearCardFieldError = useCallback((field: CardFieldKey, extraMessages: string[] = []) => {
        setCardFieldErrors((prev) => {
            if (!prev || !prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
        setCardErrors((prev) => {
            const next = prev.filter((message) => {
                if (field === 'identificationNumber') {
                    const cpfMessage = 'Informe o CPF do titular do cartão (11 dígitos).';
                    const cpfInvalidMessage = 'Informe um CPF válido do titular do cartão.';
                    const cnpjMessage = 'Informe o CNPJ do titular do cartão (14 dígitos).';
                    return (
                        message !== cpfMessage &&
                        message !== cpfInvalidMessage &&
                        message !== cnpjMessage &&
                        message !== CARD_FIELD_REQUIRED_MESSAGES[field]
                    );
                }
                return message !== CARD_FIELD_REQUIRED_MESSAGES[field] && !extraMessages.includes(message);
            });
            if (next.length === prev.length) {
                let changed = false;
                for (let index = 0; index < prev.length; index += 1) {
                    if (prev[index] !== next[index]) {
                        changed = true;
                        break;
                    }
                }
                if (!changed) {
                    return prev;
                }
            }
            return next;
        });
    }, []);

    const handleDocumentTypeSelection = useCallback(
        (value: string) => {
            setSelectedDocType(value ? value.toUpperCase() : 'CPF');
            const input = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;
            if (input) {
                input.value = '';
            }
            setCardErrors((prev) =>
                prev.filter(
                    (message) =>
                        message !== 'Informe o CPF do titular do cartão (11 dígitos).' &&
                        message !== 'Informe o CNPJ do titular do cartão (14 dígitos).' &&
                        message !== CARD_FIELD_REQUIRED_MESSAGES.identificationNumber,
                ),
            );
        },
        [],
    );

    const handleCopyPixCode = useCallback(async () => {
        if (!pixResult?.ticketUrl) return;
        try {
            await navigator.clipboard.writeText(pixResult.ticketUrl);
            setPixCopySuccess(true);
            setTimeout(() => setPixCopySuccess(false), 5000);
        } catch (clipboardError) {
            console.error('Não foi possível copiar código PIX:', clipboardError);
        }
    }, [pixResult?.ticketUrl]);

    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">
                <div className="mb-10 flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        Finalizar compra
                    </span>
                    <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-[#1a1a1d]">
                        Checkout seguro
                    </h1>
                </div>

                {checkingPaidOrder || loading ? (
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
                                docTypeReady={mpSelectReady.docType}
                            />
                        </section>

                        <section className="space-y-6">
                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] relative">
                                <header className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
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
                                {/* Removido: box vermelho de erros - erros agora aparecem apenas nos campos individuais */}

                                {selectedTab === 'card' ? (
                                    <CardPaymentForm
                                        onSubmit={handleCardPayment}
                                        isCheckoutReady={isCheckoutReady}
                                        isProcessing={isProcessing}
                                        cardBrandDisplay={cardBrandDisplay}
                                        cardFieldErrors={cardFieldErrors}
                                        cardBrand={cardBrand}
                                        selectedDocType={selectedDocType}
                                        customerEmail={customerData.email}
                                        onDocumentTypeChange={handleDocumentTypeSelection}
                                        clearFieldError={clearCardFieldError}
                                        status={cardStatus}
                                        statusMessage={cardStatusMessage}
                                        statusDetails={cardStatusDetails}
                                        isBlocked={isCardBlocked}
                                        redirectCountdown={redirectCountdown}
                                        onStartNewOrder={handleStartNewOrder}
                                        onStatusDismiss={handleDismissCardStatus}
                                        onNavigateToOrders={navigateToOrders}
                                    />
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
