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
import {
    sanitizeInput,
    normalizeCpf,
    normalizePhone,
    formatCpfDisplay,
    formatPhoneDisplay,
} from '@/utils/sanitize';
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

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
    }
}

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
const CHECKOUT_CUSTOMER_STORAGE_KEY = 'checkout:customer-data';
const CHECKOUT_DEVICE_STORAGE_KEY = 'checkout:mp-device';

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
    const pixPaymentActive = Boolean(pixResult);
    const pixGenerationDeadlineMinutes = pixResult?.expirationMinutes ?? 30;
    const [pixCopySuccess, setPixCopySuccess] = useState(false);
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
    const initialDeviceId =
        typeof window !== 'undefined' ? window.localStorage.getItem(CHECKOUT_DEVICE_STORAGE_KEY) : null;
    const [deviceId, setDeviceId] = useState<string | null>(initialDeviceId);
    const [deviceChecks, setDeviceChecks] = useState(0);
    const [cardErrors, setCardErrors] = useState<string[]>([]);
    const [cardFieldErrors, setCardFieldErrors] = useState<Partial<Record<CardFieldKey, string>>>({});
    const [cardBrand, setCardBrand] = useState<string>('');
    const cardBrandDisplay = useMemo(() => {
        if (!cardBrand) return '';
        const normalized = cardBrand.trim();
        if (!normalized) return '';
        if (normalized.length <= 3) {
            return normalized.toUpperCase();
        }
        return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    }, [cardBrand]);
    const [mpSelectReady, setMpSelectReady] = useState({ installments: false, docType: false });
    const [selectedDocType, setSelectedDocType] = useState<string>('CPF');
    useEffect(() => {
        if (!mpSelectReady.docType) return;
        const input = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;
        if (!input) return;

        const formatCpf = (value: string) => {
            return value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        };

        const formatCnpj = (value: string) => {
            return value
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        };

        const handler = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const digitsOnly = target.value.replace(/\D/g, '');
            const limit = selectedDocType?.toUpperCase() === 'CNPJ' ? 14 : 11;
            const trimmed = digitsOnly.slice(0, limit);
            const formatted =
                selectedDocType?.toUpperCase() === 'CNPJ'
                    ? formatCnpj(trimmed)
                    : formatCpf(trimmed);
            target.value = formatted;

            if (trimmed.length === limit) {
                setCardFieldErrors((prev) => {
                    if (!prev.identificationNumber) return prev;
                    const next = { ...prev };
                    delete next.identificationNumber;
                    return next;
                });
            }
        };

        input.placeholder = selectedDocType?.toUpperCase() === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00';
        input.value = '';
        input.addEventListener('input', handler);
        return () => {
            input.removeEventListener('input', handler);
        };
    }, [selectedDocType, mpSelectReady.docType, setCardFieldErrors]);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [paypalLoading, setPaypalLoading] = useState(false);

    const greetingName = useMemo(() => {
        if (!user) return 'Bem-vindo';
        return `Bem-vindo, ${user.name}`;
    }, [user]);

    const [customerData, setCustomerData] = useState<CheckoutCustomerData>(() => {
        if (typeof window !== 'undefined') {
            const raw = window.localStorage.getItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw) as Partial<CheckoutCustomerData>;
                    return {
                        name: parsed.name ?? '',
                        email: parsed.email ?? '',
                        cpf: parsed.cpf ?? '',
                        phone: parsed.phone ?? '',
                    };
                } catch {
                    // ignore parse errors
                }
            }
        }
        return {
            name: '',
            email: '',
            cpf: '',
            phone: '',
        };
    });
    const [persistCustomerData, setPersistCustomerData] = useState(true);

    const mercadoPago = useMercadoPago(MP_PUBLIC_KEY);
    const cardFormRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const existing = document.querySelector<HTMLScriptElement>('script[data-mp-security="true"]');
        if (existing) {
            if (window.MP_DEVICE_SESSION_ID) {
                console.debug('[checkout][security] existing device session', window.MP_DEVICE_SESSION_ID);
            }
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.mercadopago.com/v2/security.js';
        script.async = true;
        script.setAttribute('view', 'checkout');
        script.setAttribute('data-mp-security', 'true');
        script.onload = () => {
            if (window.MP_DEVICE_SESSION_ID) {
                console.debug('[checkout][security] script loaded deviceId', window.MP_DEVICE_SESSION_ID);
                setDeviceId((prev) => {
                    if (prev === window.MP_DEVICE_SESSION_ID) {
                        return prev;
                    }
                    if (window.MP_DEVICE_SESSION_ID) {
                        window.localStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, window.MP_DEVICE_SESSION_ID);
                        window.sessionStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, window.MP_DEVICE_SESSION_ID);
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
            console.warn('Não foi possível atualizar os dados dos ingressos:', error);
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
        if (typeof window === 'undefined' || !persistCustomerData) return;
        window.localStorage.setItem(CHECKOUT_CUSTOMER_STORAGE_KEY, JSON.stringify(customerData));
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
                console.debug('[checkout][deviceId]', source, 'using cached value', deviceId);
                return deviceId;
            }

            if (typeof window !== 'undefined') {
                const stored =
                    window.sessionStorage.getItem(CHECKOUT_DEVICE_STORAGE_KEY) ??
                    window.localStorage.getItem(CHECKOUT_DEVICE_STORAGE_KEY);
                if (stored && !forceReload) {
                    console.debug('[checkout][deviceId]', source, 'using stored value', stored);
                    setDeviceId(stored);
                    return stored;
                }
            }

            if (!forceReload && typeof window !== 'undefined' && window.MP_DEVICE_SESSION_ID) {
                console.debug('[checkout][deviceId]', source, 'using MP_DEVICE_SESSION_ID', window.MP_DEVICE_SESSION_ID);
                setDeviceId(window.MP_DEVICE_SESSION_ID);
                window.sessionStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, window.MP_DEVICE_SESSION_ID);
                window.localStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, window.MP_DEVICE_SESSION_ID);
                return window.MP_DEVICE_SESSION_ID;
            }

            let candidate: string | null = null;

            if (mercadoPago) {
                candidate = (await resolveMaybePromise<string>(mercadoPago.getDeviceId?.())) ?? null;
                if (candidate) {
                    console.debug('[checkout][deviceId]', source, 'via mercadoPago.getDeviceId', candidate);
                }

                if (!candidate) {
                    candidate = (await resolveMaybePromise<string>(mercadoPago.device?.getId?.())) ?? null;
                    if (candidate) {
                        console.debug('[checkout][deviceId]', source, 'via mercadoPago.device.getId', candidate);
                    }
                }

                if (!candidate && typeof mercadoPago.security === 'function') {
                    try {
                        const security = mercadoPago.security();
                        if (security?.getDeviceId) {
                            candidate = (await resolveMaybePromise<string>(security.getDeviceId())) ?? null;
                            if (candidate) {
                                console.debug('[checkout][deviceId]', source, 'via security.getDeviceId', candidate);
                            }
                        }
                        if (!candidate && security?.createDevice) {
                            candidate = (await resolveMaybePromise<string>(security.createDevice())) ?? null;
                            if (candidate) {
                                console.debug('[checkout][deviceId]', source, 'via security.createDevice', candidate);
                            }
                        }
                    } catch (error) {
                        console.warn('[checkout][deviceId]', source, 'security helper failed', error);
                    }
                }
            }

            if (!candidate && cardFormRef.current?.getCardFormData) {
                try {
                    const formData = cardFormRef.current.getCardFormData();
                    candidate = formData?.deviceId || formData?.additional_info?.device_id || null;
                    if (candidate) {
                        console.debug('[checkout][deviceId]', source, 'via cardFormData', candidate);
                    }
                } catch (error) {
                    console.warn('[checkout][deviceId]', source, 'cardFormData lookup failed', error);
                    candidate = null;
                }
            }

            if (!candidate && typeof window !== 'undefined' && window.MP_DEVICE_SESSION_ID) {
                console.debug('[checkout][deviceId]', source, 'late MP_DEVICE_SESSION_ID', window.MP_DEVICE_SESSION_ID);
                candidate = window.MP_DEVICE_SESSION_ID;
            }

            if (
                !candidate &&
                typeof window !== 'undefined' &&
                (window as any).MercadoPago?.device?.getId
            ) {
                candidate = await resolveMaybePromise<string>((window as any).MercadoPago.device.getId());
                if (candidate) {
                    console.debug('[checkout][deviceId]', source, 'via window.MercadoPago.device.getId', candidate);
                }
            }

            if (candidate) {
                setDeviceId(candidate);
                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, candidate);
                    window.localStorage.setItem(CHECKOUT_DEVICE_STORAGE_KEY, candidate);
                    window.MP_DEVICE_SESSION_ID = candidate;
                }
                console.debug('[checkout][deviceId]', source, 'stored candidate', candidate);
                return candidate;
            }

            console.warn('[checkout][deviceId]', source, 'failed to resolve candidate');
            return null;
        }, [deviceId, mercadoPago]);

    useEffect(() => {
        if (!mercadoPago) return;
        let cancelled = false;
        const capture = async () => {
            const id = await ensureDeviceIdAvailable(false, 'mount');
            if (!cancelled && id) {
                setDeviceId(id);
                console.debug('[checkout][deviceId] mount captured', id);
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
            } else {
                console.debug('[checkout][deviceId] retry success', id);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [deviceId, deviceChecks, ensureDeviceIdAvailable]);

    useEffect(() => {
        if (!mercadoPago || !MP_PUBLIC_KEY) return;
        const formElement = document.getElementById('checkout-card-form');
        if (!formElement) return;

        if (cardFormRef.current?.destroy) {
            cardFormRef.current.destroy();
        }

        try {
            cardFormRef.current = mercadoPago.cardForm({
                amount: totalAmount.toFixed(2),
                autoMount: true,
                form: {
                    id: 'checkout-card-form',
                    cardholderName: {
                        id: 'form-checkout__cardholderName',
                        placeholder: 'Nome completo (igual ao cartão)',
                    },
                    cardholderEmail: {
                        id: 'form-checkout__cardholderEmail',
                        placeholder: 'email@testuser.com',
                    },
                    cardNumber: {
                        id: 'form-checkout__cardNumber',
                        placeholder: 'Número do cartão',
                    },
                    cardExpirationMonth: {
                        id: 'form-checkout__cardExpirationMonth',
                        placeholder: 'MM',
                    },
                    cardExpirationYear: {
                        id: 'form-checkout__cardExpirationYear',
                        placeholder: 'AA',
                    },
                    securityCode: {
                        id: 'form-checkout__securityCode',
                        placeholder: 'CVV',
                    },
                    installments: {
                        id: 'form-checkout__installments',
                        placeholder: 'Parcelas',
                    },
                    identificationType: {
                        id: 'form-checkout__identificationType',
                    },
                    identificationNumber: {
                        id: 'form-checkout__identificationNumber',
                        placeholder: 'CPF',
                    },
                    issuer: {
                        id: 'form-checkout__issuer',
                    },
                },
                callbacks: {
                    onFormMounted: (error: any) => {
                        if (error) {
                            setCardErrors([error.message ?? 'Não foi possível montar o formulário do cartão.']);
                        }
                    },
                    onPaymentMethodsReceived: (error: any, paymentMethods: any[]) => {
                        if (!error && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
                            setCardBrand(paymentMethods[0]?.name || '');
                        }
                    },
                    onFetchInstallments: (error: any) => {
                        if (error) {
                            setCardErrors((prev) => [
                                ...prev,
                                'Não foi possível carregar as opções de parcelamento. Verifique os dados do cartão.',
                            ]);
                        }
                    },
                    onError: (error: any) => {
                        if (error?.type === 'invalid_card_number') {
                            setCardErrors(['Número do cartão inválido.']);
                            return;
                        }
                        if (error?.type === 'invalid_security_code') {
                            setCardErrors(['Código de segurança inválido.']);
                            return;
                        }
                        if (error?.type === 'invalid_email') {
                            setCardErrors(['Informe um e-mail válido para o recibo.']);
                            return;
                        }
                        if (error?.type === 'invalid_cardholder_name') {
                            setCardErrors(['Informe o nome exatamente como está no cartão.']);
                            return;
                        }
                        if (error?.type === 'invalid_cardholder_identification_number') {
                            setCardErrors(['Informe um CPF válido.']);
                            return;
                        }

                        if (error?.message?.includes('secure connection') || error?.message?.includes('SSL')) {
                            setCardErrors([
                                'O Mercado Pago exige conexão segura (HTTPS) para processar cartões. Abra o checkout em https:// e tente novamente.',
                            ]);
                        } else {
                            setCardErrors([
                                error?.message || 'Não foi possível processar os dados do cartão. Verifique e tente novamente.',
                            ]);
                        }
                    },
                },
            });
        } catch (error) {
            console.error('Erro ao inicializar o cardForm do Mercado Pago:', error);
        }

        return () => {
            if (cardFormRef.current?.destroy) {
                cardFormRef.current.destroy();
            }
            setCardBrand('');
        };
    }, [mercadoPago, totalAmount]);

    useEffect(() => {
        if (selectedTab !== 'card') {
            setCardErrors([]);
            setCardFieldErrors({});
        }
    }, [selectedTab]);

    useEffect(() => {
        if (selectedTab !== 'card') return;

        setMpSelectReady({ installments: false, docType: false });

        let attempts = 0;
        const maxAttempts = 50;

        const interval = setInterval(() => {
            attempts += 1;

            const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement | null;
            const docTypeSelect = document.getElementById('form-checkout__identificationType') as HTMLSelectElement | null;

            const installmentsReady = Boolean(installmentsSelect && installmentsSelect.options.length > 0);
            const docTypeReady = Boolean(docTypeSelect && docTypeSelect.options.length > 0);

            const nextState = {
                installments: installmentsReady,
                docType: docTypeReady,
            };

            setMpSelectReady((prev) => {
                if (prev.installments === nextState.installments && prev.docType === nextState.docType) {
                    return prev;
                }
                return nextState;
            });

            if (nextState.installments && nextState.docType) {
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [selectedTab]);

    useEffect(() => {
        const detachCard = registerNumericMask('form-checkout__cardNumber', 16, true);
        const detachMonth = registerNumericMask('form-checkout__cardExpirationMonth', 2);
        const detachYear = registerNumericMask('form-checkout__cardExpirationYear', 2);
        const detachCvv = registerNumericMask('form-checkout__securityCode', 4);
        const detachDocument = registerNumericMask('form-checkout__identificationNumber', 11);

        return () => {
            detachCard();
            detachMonth();
            detachYear();
            detachCvv();
            detachDocument();
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

            const extractMessages = (field: any): string[] => {
                if (!field) return [];
                if (Array.isArray(field)) {
                    return field.flatMap((item) => extractMessages(item));
                }
                if (typeof field === 'string') return [field];
                if (typeof field === 'object' && field.message) return [String(field.message)];
                if (typeof field === 'object' && field.messages) {
                    const messages = Array.isArray(field.messages) ? field.messages : [field.messages];
                    return messages.map((msg: any) => String(msg));
                }
                return [];
            };

            const translated: string[] = [];
            const fieldErrors: Partial<Record<CardFieldKey, string>> = {};

            Object.entries(cardFormData).forEach(([key, value]) => {
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
                        const docMessage =
                            selectedDocType?.toUpperCase() === 'CNPJ'
                                ? 'Informe o CNPJ do titular do cartão (14 dígitos).'
                                : 'Informe o CPF do titular do cartão (11 dígitos).';
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
        ) as HTMLInputElement | null;
        const expirationYearInput = document.getElementById(
            'form-checkout__cardExpirationYear',
        ) as HTMLInputElement | null;
        const securityCodeInput = document.getElementById('form-checkout__securityCode') as HTMLInputElement | null;
        const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement | null;
        const documentInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement | null;

        const errors: string[] = [];
        const fieldErrors: Partial<Record<CardFieldKey, string>> = {};

        const cardNumberDigits = cardNumberInput?.value.replace(/\D/g, '') || '';
        if (cardNumberDigits.length < 13 || cardNumberDigits.length > 19) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardNumber;
            errors.push(message);
            fieldErrors.cardNumber = message;
        }

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

        const monthDigits = expirationMonthInput?.value.replace(/\D/g, '') || '';
        const monthValue = Number(monthDigits);
        if (monthValue < 1 || monthValue > 12) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardExpirationMonth;
            errors.push(message);
            fieldErrors.cardExpirationMonth = message;
        } else if (monthDigits.length !== 2) {
            const message = 'Use dois dígitos para o mês (ex: 09).';
            errors.push(message);
            fieldErrors.cardExpirationMonth = message;
        }

        const yearDigits = expirationYearInput?.value.replace(/\D/g, '') || '';
        const yearValue = Number(yearDigits);
        if (yearDigits.length !== 2 || yearValue < 0) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.cardExpirationYear;
            errors.push(message);
            fieldErrors.cardExpirationYear = message;
        }

        const securityDigits = securityCodeInput?.value.replace(/\D/g, '') || '';
        if (securityDigits.length < 3) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.securityCode;
            errors.push(message);
            fieldErrors.securityCode = message;
        }

        const documentDigits = documentInput?.value.replace(/\D/g, '') || '';
        const expectedDocLength = selectedDocType?.toUpperCase() === 'CNPJ' ? 14 : 11;
        if (documentDigits.length !== expectedDocLength) {
            const message =
                selectedDocType?.toUpperCase() === 'CNPJ'
                    ? 'Informe o CNPJ do titular do cartão (14 dígitos).'
                    : 'Informe o CPF do titular do cartão (11 dígitos).';
            errors.push(message);
            fieldErrors.identificationNumber = message;
        }

        if (!installmentsSelect?.value) {
            const message = CARD_FIELD_REQUIRED_MESSAGES.installments;
            errors.push(message);
            fieldErrors.installments = message;
        }

        setCardErrors(Array.from(new Set(errors)));
        setCardFieldErrors(fieldErrors);
        return errors.length === 0;
    }, [selectedDocType]);

    const ensureOrder = useCallback(async () => {
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
            });

            const createdOrder = response.data?.data?.order;
            if (!createdOrder?._id) {
                throw new Error('Não foi possível criar o pedido.');
            }
            setOrder(createdOrder);
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
    }, [customerData, order, primaryCartItem, validateCustomerData]);

    const handleRemoveItem = useCallback(
        (id: string) => {
            if (pixPaymentActive) return;
            removeCartItemFromStorage(id);
            setOrder(null);
            setPixResult(null);
            setGlobalSuccess('');
            refreshCart();
        },
        [pixPaymentActive, refreshCart],
    );

    const finalizeSuccess = useCallback(
        (
            message: string,
            options: { preserveCartState?: boolean; showGlobalMessage?: boolean } = {},
        ) => {
            const { preserveCartState = false, showGlobalMessage = true } = options;
            setPersistCustomerData(false);
            clearCartItems();
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
            }
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

    const handleCardPayment = useCallback(
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
            if (!cardFormRef.current) {
                setGlobalError('O formulário de cartão ainda não está pronto. Aguarde alguns segundos e tente novamente.');
                return;
            }
            if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
                setCardErrors([
                    'O Mercado Pago exige conexão segura (HTTPS) para processar cartões. Acesse o checkout via https:// para continuar.',
                ]);
                return;
            }

            console.debug('[checkout][card] requesting deviceId', { hasExisting: Boolean(deviceId) });
            const currentDeviceId = await ensureDeviceIdAvailable(deviceId !== null, 'card-submit');
            if (!currentDeviceId) {
                console.warn('[checkout][card] deviceId unavailable');
                setCardErrors([
                    'Não foi possível obter o deviceId do Mercado Pago. Recarregue a página (em HTTPS) e tente novamente.',
                ]);
                return;
            }
            console.debug('[checkout][card] using deviceId', currentDeviceId);

            try {
                setIsProcessing(true);
                setCardErrors([]);
                setCardFieldErrors({});

                const isValid = validateCardFormFields();
                if (!isValid) {
                    setIsProcessing(false);
                    return;
                }

                const cardFormData = cardFormRef.current.getCardFormData();
                if (handleCardFormValidationErrors(cardFormData)) {
                    setIsProcessing(false);
                    return;
                }
                if (!cardFormData?.token) {
                    throw new Error('Não foi possível gerar o token do cartão. Verifique os dados e tente novamente.');
                }

                const createdOrder = await ensureOrder();

                const installments = Number(cardFormData.installments || 1);
                const paymentMethodId = cardFormData.paymentMethodId;

                const payload = {
                    token: cardFormData.token,
                    paymentMethodId,
                    installments,
                    issuerId: cardFormData.issuerId || undefined,
                };

                await api.post(`/payments/${createdOrder._id}/card`, payload, {
                    headers: {
                        'X-meli-session-id': currentDeviceId,
                    },
                });

                finalizeSuccess('Pagamento aprovado! Seus ingressos serão liberados em instantes.');
            } catch (error: any) {
                console.error('Erro no pagamento com cartão:', error);
                if (error?.response?.data?.errors) {
                    const rawErrors = Array.isArray(error.response.data.errors)
                        ? error.response.data.errors
                        : [error.response.data.errors];
                    const fieldErrors: Partial<Record<CardFieldKey, string>> = {};
                    const messages: string[] = [];

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
                            messages.push(customMessage);
                        } else if (fallbackMessage) {
                            messages.push(fallbackMessage);
                        }
                    });

                    if (messages.length) {
                        setCardErrors(Array.from(new Set(messages)));
                    }
                    if (Object.keys(fieldErrors).length) {
                        setCardFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
                    }
                }
                const message =
                    error?.response?.data?.message ||
                    error?.response?.data?.errors?.[0]?.message ||
                    error?.message ||
                    'Não foi possível processar o pagamento. Verifique os dados e tente novamente.';
                setGlobalError(message);
            } finally {
                setIsProcessing(false);
            }
        },
        [ensureDeviceIdAvailable, ensureOrder, ensureSingleItem, finalizeSuccess, handleCardFormValidationErrors, primaryCartItem, selectedDocType, validateCardFormFields],
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

            console.debug('[checkout][pix] requesting deviceId', { hasExisting: Boolean(deviceId) });
            const currentDeviceId = await ensureDeviceIdAvailable(deviceId !== null, 'pix payment');
            if (!currentDeviceId) {
                console.warn('[checkout][pix] deviceId unavailable');
                setGlobalError(
                    'Não foi possível obter o deviceId do Mercado Pago. Recarregue a página (em HTTPS) e tente novamente.',
                );
                return;
            }
            console.debug('[checkout][pix] using deviceId', currentDeviceId);

            try {
                setIsProcessing(true);

                const createdOrder = await ensureOrder();

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
                    const cnpjMessage = 'Informe o CNPJ do titular do cartão (14 dígitos).';
                    return message !== cpfMessage && message !== cnpjMessage && message !== CARD_FIELD_REQUIRED_MESSAGES[field];
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

                {loading ? (
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        Carregando resumo do carrinho...
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
                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
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
                                {cardErrors.length ? (
                                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        <ul className="space-y-2">
                                            {cardErrors.map((errorMessage, index) => (
                                                <li key={`${errorMessage}-${index}`}>{errorMessage}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {selectedTab === 'card' ? (
                                    <CardPaymentForm
                                        onSubmit={handleCardPayment}
                                        isCheckoutReady={isCheckoutReady}
                                        isProcessing={isProcessing}
                                        cardBrandDisplay={cardBrandDisplay}
                                        cardFieldErrors={cardFieldErrors}
                                        cardBrand={cardBrand}
                                        mpSelectReady={mpSelectReady}
                                        selectedDocType={selectedDocType}
                                        customerEmail={customerData.email}
                                        onDocumentTypeChange={handleDocumentTypeSelection}
                                        clearFieldError={clearCardFieldError}
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
