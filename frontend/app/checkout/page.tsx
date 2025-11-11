'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    HiOutlineTicket,
    HiOutlineTrash,
    HiOutlineClipboardDocument,
    HiOutlineCreditCard,
    HiOutlineCalendar,
    HiOutlineLockClosed,
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineIdentification,
    HiOutlineDocumentText,
    HiOutlineSquaresPlus,
    HiOutlineChevronDown,
} from 'react-icons/hi2';
import { SiPix } from 'react-icons/si';
import type { IconType } from 'react-icons';
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

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
    }
}

type CheckoutCartItem = CartItem & {
    subtotal: number;
    platformFeeValue: number;
    fixedFeeValue: number;
    total: number;
};

type CreatedOrder = {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    totalTickets: number;
    status: string;
    event?: {
        name?: string;
        date?: string;
        location?: string;
    };
    customerData?: {
        name?: string;
        email?: string;
        cpf?: string;
        phone?: string;
    };
};

type PixPaymentResult = {
    paymentId: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    expiresAt?: string;
    expirationMinutes?: number;
    status: string;
    statusDetail?: string;
    statusInfo?: {
        userMessage?: string;
        adminMessage?: string;
        color?: string;
        requiresAction?: boolean;
        canRetry?: boolean;
        internalStatus?: string;
    };
};

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
const CHECKOUT_CUSTOMER_STORAGE_KEY = 'checkout:customer-data';
const CHECKOUT_DEVICE_STORAGE_KEY = 'checkout:mp-device';

const INPUT_BASE_CLASS =
    "w-full font-[var(--font-quicksand)] rounded-2xl border border-[#ded7ca] bg-[#faf7f0] text-sm text-[#1a1a1d] font-normal tracking-normal outline-none transition focus:border-[#a38f78] placeholder:text-[#b5aa92] placeholder:font-normal placeholder:tracking-normal disabled:cursor-not-allowed disabled:opacity-60";
const SELECT_BASE_CLASS =
    "w-full appearance-none font-[var(--font-quicksand)] rounded-2xl border border-[#ded7ca] bg-[#faf7f0] text-sm text-[#1a1a1d] font-normal tracking-normal outline-none transition focus:border-[#a38f78] disabled:cursor-not-allowed disabled:opacity-60";

const CARD_ERROR_MESSAGES: Record<string, string> = {
    '205': 'Informe o número do cartão.',
    '208': 'Informe o mês de validade do cartão.',
    '209': 'Informe o ano de validade do cartão.',
    '212': 'Informe o código de segurança (CVV).',
    '214': 'Informe o nome exatamente como aparece no cartão.',
    '221': 'Informe o CPF do titular do cartão.',
    '224': 'Informe o código de segurança (CVV).',
    'E301': 'Número do cartão inválido.',
    'E302': 'Código de segurança inválido.',
};

type CheckoutCustomerData = {
    name: string;
    email: string;
    cpf: string;
    phone: string;
};

type MpSelectProps = {
    label: string;
    selectId: string;
    selectName: string;
    icon: IconType;
    badgeLabel?: string;
    loadingText?: string;
    placeholder?: string;
    disabled?: boolean;
    classNameOverride?: string;
};

type MpSelectOption = {
    value: string;
    text: string;
    disabled: boolean;
};

function MpSelect({
    label,
    selectId,
    selectName,
    icon: Icon,
    badgeLabel,
    loadingText,
    placeholder,
    disabled,
    classNameOverride,
}: MpSelectProps) {
    const [displayText, setDisplayText] = useState('');
    const [selectedValue, setSelectedValue] = useState('');
    const [options, setOptions] = useState<MpSelectOption[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLLabelElement | null>(null);
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const selectElement = document.getElementById(selectId) as HTMLSelectElement | null;
        selectRef.current = selectElement;
        if (!selectElement) {
            setDisplayText('');
            setOptions([]);
            setSelectedValue('');
            return;
        }

        const syncFromSelect = () => {
            const option = selectElement.options[selectElement.selectedIndex];
            setDisplayText(option ? option.text : '');
            setSelectedValue(selectElement.value || '');
            const mappedOptions: MpSelectOption[] = Array.from(selectElement.options).map((opt) => ({
                value: opt.value,
                text: opt.text,
                disabled: opt.disabled,
            }));
            setOptions(mappedOptions);
        };

        syncFromSelect();
        selectElement.addEventListener('change', syncFromSelect);

        const observer = new MutationObserver(syncFromSelect);
        observer.observe(selectElement, { childList: true, subtree: true, attributes: true });

        return () => {
            selectElement.removeEventListener('change', syncFromSelect);
            observer.disconnect();
        };
    }, [selectId]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (disabled && isOpen) {
            setIsOpen(false);
        }
    }, [disabled, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            triggerRef.current?.blur();
        }
    }, [isOpen]);

    const fallbackText = disabled ? loadingText ?? '' : '';
    const rawDisplay = (displayText || fallbackText || '').trim();
    const hideLoadingText = /carregando|detectando/i.test(rawDisplay);
    const effectivePlaceholder = placeholder || 'Selecione uma opção';
    const textToShow = !rawDisplay || hideLoadingText ? effectivePlaceholder : rawDisplay;
    const IconColor = disabled ? 'text-[#d3c7b5]' : 'text-[#a38f78]';
    const ArrowColor = disabled ? 'text-[#d3c7b5]' : 'text-[#a38f78]';
    const hasOptions = options.length > 0;

    const toggleDropdown = () => {
        if (disabled || !hasOptions) return;
        setIsOpen((prev) => !prev);
    };

    const handleOptionSelect = (option: MpSelectOption) => {
        if (option.disabled) return;
        const selectElement = selectRef.current;
        if (!selectElement) return;
        requestAnimationFrame(() => {
            selectElement.value = option.value;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            setDisplayText(option.text);
            setSelectedValue(option.value);
        });
        setIsOpen(false);
    };

    return (
        <label
            ref={containerRef}
            className={`relative flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2 ${classNameOverride || ''
                }`}
        >
            <span className="flex items-center justify-between">
                <span>{label}</span>
            </span>
            <div className="relative">
                <Icon className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${IconColor}`} />
                <button
                    type="button"
                    disabled={disabled || !hasOptions}
                    onClick={toggleDropdown}
                    ref={triggerRef}
                    className={`${SELECT_BASE_CLASS} flex w-full items-center justify-between py-3 pl-11 pr-10 text-left ${
                        disabled ? 'text-[#b5aa92]' : 'text-[#1a1a1d]'
                        } ${disabled || !hasOptions ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className="block w-full truncate">{textToShow || '\u00A0'}</span>
                    <HiOutlineChevronDown
                        className={`ml-3 shrink-0 transition-transform ${ArrowColor} ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
                <select
                    id={selectId}
                    name={selectName}
                    disabled={disabled}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                />
                {isOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-[#ded7ca] bg-white shadow-[0_25px_50px_-25px_rgba(26,26,29,0.4)]">
                        <ul className="max-h-64 overflow-y-auto py-2">
                            {options.map((option) => {
                                const isSelected = option.value === selectedValue;
                                return (
                                    <li key={`${selectId}-${option.value}`}>
                                        <button
                                            type="button"
                                            disabled={option.disabled}
                                            onClick={() => handleOptionSelect(option)}
                                            className={`flex w-full items-center tracking-normal justify-between px-4 py-2 text-sm text-left transition ${option.disabled
                                                ? 'cursor-not-allowed text-[#c5bcaa]'
                                                : 'cursor-pointer text-[#1a1a1d] hover:bg-[#f5f1e8]'
                                                } ${isSelected ? 'bg-[#f5f1e8] font-semibold text-[#a38f78]' : ''}`}
                                        >
                                            <span className="truncate">{option.text}</span>
                                            {isSelected ? (
                                                <span className="ml-3 text-[0.65rem] uppercase tracking-[0.2em] text-[#a38f78]">
                                                    Selecionado
                                                </span>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : null}
            </div>
        </label>
    );
}

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
    const [mpSelectReady, setMpSelectReady] = useState({ issuer: false, installments: false, docType: false });
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

    const attachNumericMask = useCallback((id: string, maxLength: number, allowSpaces = false) => {
        if (typeof document === 'undefined') return () => { };
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (!input) return () => { };

        const handler = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const digitsOnly = target.value.replace(/[^\d]/g, '');
            if (allowSpaces) {
                target.value = digitsOnly
                    .slice(0, maxLength)
                    .replace(/(\d{4})(?=\d)/g, '$1 ')
                    .trim();
            } else {
                target.value = digitsOnly.slice(0, maxLength);
            }
        };

        input.inputMode = 'numeric';
        input.addEventListener('input', handler);

        return () => {
            input.removeEventListener('input', handler);
        };
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
        if (selectedTab !== 'card') return;

        setMpSelectReady({ issuer: false, installments: false, docType: false });

        let attempts = 0;
        const maxAttempts = 50;

        const interval = setInterval(() => {
            attempts += 1;

            const issuerSelect = document.getElementById('form-checkout__issuer') as HTMLSelectElement | null;
            const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement | null;
            const docTypeSelect = document.getElementById('form-checkout__identificationType') as HTMLSelectElement | null;

            const issuerReady = Boolean(issuerSelect && issuerSelect.options.length > 0);
            const installmentsReady = Boolean(installmentsSelect && installmentsSelect.options.length > 0);
            const docTypeReady = Boolean(docTypeSelect && docTypeSelect.options.length > 0);

            const nextState = {
                issuer: issuerReady,
                installments: installmentsReady,
                docType: docTypeReady,
            };

            setMpSelectReady((prev) => {
                if (
                    prev.issuer === nextState.issuer &&
                    prev.installments === nextState.installments &&
                    prev.docType === nextState.docType
                ) {
                    return prev;
                }
                return nextState;
            });

            if ((issuerReady && installmentsReady && docTypeReady) || attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [selectedTab, deviceChecks, mercadoPago]);

    useEffect(() => {
        const detachCard = attachNumericMask('form-checkout__cardNumber', 16, true);
        const detachMonth = attachNumericMask('form-checkout__cardExpirationMonth', 2);
        const detachYear = attachNumericMask('form-checkout__cardExpirationYear', 2);
        const detachCvv = attachNumericMask('form-checkout__securityCode', 4);
        const detachDocument = attachNumericMask('form-checkout__identificationNumber', 11);

        return () => {
            detachCard();
            detachMonth();
            detachYear();
            detachCvv();
            detachDocument();
        };
    }, [attachNumericMask, selectedTab]);

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

    useEffect(() => {
        setCardErrors([]);
    }, [selectedTab]);

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

    const handleCardFormValidationErrors = useCallback((cardFormData: any): boolean => {
        const rawErrors =
            cardFormData?.errorMessages ||
            cardFormData?.formErrors ||
            cardFormData?.fieldErrors ||
            cardFormData?.errors ||
            [];

        if (!Array.isArray(rawErrors) || rawErrors.length === 0) {
            return false;
        }

        const translated = rawErrors
            .map((item: any) => {
                const code = typeof item === 'object' ? item?.code : undefined;
                const message = typeof item === 'object' ? item?.message : item;
                if (code && CARD_ERROR_MESSAGES[code]) {
                    return CARD_ERROR_MESSAGES[code];
                }
                if (typeof message === 'string' && message.toLowerCase().includes('cardnumber')) {
                    return 'Informe o número do cartão.';
                }
                if (typeof message === 'string' && message.toLowerCase().includes('cardexpirationmonth')) {
                    return 'Informe o mês de validade do cartão.';
                }
                if (typeof message === 'string' && message.toLowerCase().includes('cardexpirationyear')) {
                    return 'Informe o ano de validade do cartão.';
                }
                if (typeof message === 'string' && message.toLowerCase().includes('securitycode')) {
                    return 'Informe o código de segurança (CVV).';
                }
                return message || 'Existem campos obrigatórios não preenchidos.';
            })
            .filter(Boolean);

        if (translated.length) {
            const uniqueErrors = Array.from(new Set(translated));
            setCardErrors(uniqueErrors);
            return true;
        }

        return false;
    }, []);

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

        const cardNumberDigits = cardNumberInput?.value.replace(/\D/g, '') || '';
        if (cardNumberDigits.length < 13 || cardNumberDigits.length > 19) {
            errors.push('Número do cartão inválido.');
        }

        if (!cardholderNameInput?.value.trim()) {
            errors.push('Informe o nome exatamente como aparece no cartão.');
        }

        const emailValue = cardholderEmailInput?.value.trim() || '';
        if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            errors.push('Informe um e-mail válido para o recibo.');
        }

        const monthValue = Number(expirationMonthInput?.value || 0);
        if (monthValue < 1 || monthValue > 12) {
            errors.push('Informe o mês de validade do cartão (01-12).');
        }

        const yearValue = Number(expirationYearInput?.value || 0);
        if (yearValue < 0) {
            errors.push('Informe o ano de validade do cartão.');
        }

        if (!securityCodeInput?.value || securityCodeInput.value.length < 3) {
            errors.push('Informe o código de segurança (CVV).');
        }

        const documentDigits = documentInput?.value.replace(/\D/g, '') || '';
        if (documentDigits.length !== 11) {
            errors.push('Informe o CPF do titular do cartão (11 dígitos).');
        }

        if (!installmentsSelect?.value) {
            errors.push('Selecione o número de parcelas.');
        }

        setCardErrors(errors);
        return errors.length === 0;
    }, []);

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
                    const errorList = Array.isArray(error.response.data.errors)
                        ? error.response.data.errors.map((err: any) => String(err))
                        : [String(error.response.data.errors)];
                    setCardErrors(errorList);
                }
                const message =
                    error?.response?.data?.message ||
                    error?.response?.data?.errors?.[0] ||
                    error?.message ||
                    'Não foi possível processar o pagamento. Verifique os dados e tente novamente.';
                setGlobalError(message);
            } finally {
                setIsProcessing(false);
            }
        },
        [ensureDeviceIdAvailable, ensureOrder, ensureSingleItem, finalizeSuccess, handleCardFormValidationErrors, primaryCartItem, validateCardFormFields],
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
        MP_PUBLIC_KEY;

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
                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
                                <header className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                            Resumo do pedido
                                        </h2>
                                        <p className="text-xs text-[#7d796c]">
                                            Revise os ingressos antes de finalizar o pagamento.
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-[#ded7ca] bg-[#f5f1e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6f6b63]">
                                        {totalTickets} ingresso(s)
                                    </span>
                                </header>

                                <div className="mt-6 space-y-4">
                                    {summarizedCart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] p-5 shadow-[0_15px_35px_-30px_rgba(20,20,32,0.35)]"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                                        <HiOutlineTicket className="text-sm" />
                                                        {item.metadata?.category ?? 'Ingresso'}
                                                    </span>
                                                    <p className="text-base font-semibold uppercase tracking-[0.15em] text-[#1a1a1d]">
                                                        {item.name}
                                                    </p>
                                                    {item.date || item.location ? (
                                                        <p className="text-xs text-[#7d796c]">
                                                            {item.date}
                                                            {item.date && item.location ? ' • ' : ''}
                                                            {item.location}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={pixPaymentActive}
                                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${pixPaymentActive
                                                        ? 'border-[#ded7ca] text-[#b5aa92] opacity-60 cursor-not-allowed'
                                                        : 'border-[#ded7ca] text-[#7d796c] hover:border-rose-300 hover:text-rose-500'
                                                        }`}
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    aria-label="Remover do carrinho"
                                                >
                                                    <HiOutlineTrash className="text-sm" />
                                                </button>
                                            </div>

                                            <div className="mt-4 grid gap-3 text-sm text-[#4c4c55] md:grid-cols-2">
                                                <div>
                                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                        Quantidade
                                                    </span>
                                                    <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">
                                                        {item.quantity} ingresso(s)
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                        Subtotal
                                                    </span>
                                                    <p className="mt-1 text-sm text-[#1a1a1d]">
                                                        R$ {item.subtotal.toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                                {item.platformFeeValue > 0 || item.fixedFeeValue > 0 ? (
                                                    <div className="md:col-span-2">
                                                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                            Taxas
                                                        </span>
                                                        <p className="mt-1 text-sm text-[#1a1a1d]">
                                                            R${' '}
                                                            {(
                                                                item.platformFeeValue + item.fixedFeeValue
                                                            ).toFixed(2).replace('.', ',')}
                                                        </p>
                                                    </div>
                                                ) : null}
                                                <div className="md:col-span-2">
                                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                        Total deste ingresso
                                                    </span>
                                                    <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">
                                                        R$ {item.total.toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <footer className="mt-6 rounded-2xl border border-[#ede5d8] bg-white px-5 py-4">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                        Total a pagar
                                    </span>
                                    <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">
                                        R$ {totalAmount.toFixed(2).replace('.', ',')}
                                    </p>
                                </footer>
                            </div>

                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
                                <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                    Dados do comprador
                                </h2>
                                <p className="text-xs text-[#7d796c]">
                                    Usaremos essas informações para gerar o pedido e os ingressos.
                                </p>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                        Nome completo
                                        <div className="relative">
                                            <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                            <input
                                                type="text"
                                                value={customerData.name}
                                                onChange={(event) => handleCustomerChange('name', event.target.value)}
                                                readOnly={pixPaymentActive}
                                                aria-readonly={pixPaymentActive}
                                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${pixPaymentActive ? 'cursor-not-allowed bg-[#f0ece2] text-[#7d796c]' : ''
                                                    }`}
                                                placeholder="Como aparece no documento"
                                            />
                                        </div>
                                    </label>
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                        E-mail
                                        <div className="relative">
                                            <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                            <input
                                                type="email"
                                                value={customerData.email}
                                                onChange={(event) => handleCustomerChange('email', event.target.value)}
                                                readOnly={pixPaymentActive}
                                                aria-readonly={pixPaymentActive}
                                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${pixPaymentActive ? 'cursor-not-allowed bg-[#f0ece2] text-[#7d796c]' : ''
                                                    }`}
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>
                                    </label>
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                        CPF
                                        <div className="relative">
                                            <HiOutlineIdentification
                                                className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${mpSelectReady.docType ? 'text-[#a38f78]' : 'text-[#d3c7b5]'
                                                    }`}
                                            />
                                            <input
                                                type="text"
                                                value={customerData.cpf}
                                                onChange={(event) => handleCustomerChange('cpf', event.target.value)}
                                                readOnly={pixPaymentActive}
                                                aria-readonly={pixPaymentActive}
                                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${pixPaymentActive ? 'cursor-not-allowed bg-[#f0ece2] text-[#7d796c]' : ''
                                                    }`}
                                                placeholder="000.000.000-00"
                                            />
                                        </div>
                                    </label>
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                        Celular
                                        <div className="relative">
                                            <HiOutlinePhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                            <input
                                                type="tel"
                                                value={customerData.phone}
                                                onChange={(event) => handleCustomerChange('phone', event.target.value)}
                                                readOnly={pixPaymentActive}
                                                aria-readonly={pixPaymentActive}
                                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${pixPaymentActive ? 'cursor-not-allowed bg-[#f0ece2] text-[#7d796c]' : ''
                                                    }`}
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                    </label>
                                </div>
                            </div>
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
                                        Configure a variável <code className="font-mono text-xs">NEXT_PUBLIC_MP_PUBLIC_KEY</code>{' '}
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

                                {selectedTab === 'card' ? (
                                    <form
                                        id="checkout-card-form"
                                        className="mt-6 space-y-4"
                                        onSubmit={handleCardPayment}
                                    >
                                        <div className="grid gap-4 md:grid-cols-4">
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-4">
                                                Número do cartão
                                                <div className="relative">
                                                    <HiOutlineCreditCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                                    <input
                                                        id="form-checkout__cardNumber"
                                                        name="cardNumber"
                                                        type="text"
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="0000 0000 0000 0000"
                                                    />
                                                    {cardBrandDisplay ? (
                                                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-[#a38f78]/40 bg-[#f5f1e8] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                                            {cardBrandDisplay}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </label>
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-1">
                                                Mês
                                                <div className="relative">
                                                    <HiOutlineCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                                    <input
                                                        id="form-checkout__cardExpirationMonth"
                                                        name="cardExpirationMonth"
                                                        type="text"
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="MM"
                                                    />
                                                </div>
                                            </label>
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-1">
                                                Ano
                                                <div className="relative">
                                                    <HiOutlineCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                                    <input
                                                        id="form-checkout__cardExpirationYear"
                                                        name="cardExpirationYear"
                                                        type="text"
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="AA"
                                                    />
                                                </div>
                                            </label>
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2">
                                                CVV
                                                <div className="relative">
                                                    <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                                    <input
                                                        id="form-checkout__securityCode"
                                                        name="securityCode"
                                                        type="text"
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="CVV"
                                                    />
                                                </div>
                                            </label>

                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-4">
                                                Nome igual ao cartão
                                                <div className="relative">
                                                    <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                                    <input
                                                        id="form-checkout__cardholderName"
                                                        name="cardholderName"
                                                        type="text"
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="Nome completo"
                                                    />
                                                </div>
                                            </label>
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-4">
                                                E-mail para recibo
                                                <div className="relative">
                                                    <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                                                    <input
                                                        id="form-checkout__cardholderEmail"
                                                        name="cardholderEmail"
                                                        type="email"
                                                        defaultValue={customerData.email}
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="email@testuser.com"
                                                    />
                                                </div>
                                            </label>
                                            <select
                                                id="form-checkout__issuer"
                                                name="issuer"
                                                className="sr-only"
                                                aria-hidden="true"
                                            />
                                            <MpSelect
                                                label="Parcelas"
                                                selectId="form-checkout__installments"
                                                selectName="installments"
                                                icon={HiOutlineSquaresPlus}
                                                loadingText="Carregando…"
                                                placeholder="Selecione as parcelas"
                                                disabled={!cardBrand || !mpSelectReady.installments}
                                                classNameOverride="md:col-span-4"
                                            />
                                            <MpSelect
                                                label="Tipo de documento"
                                                selectId="form-checkout__identificationType"
                                                selectName="identificationType"
                                                icon={HiOutlineDocumentText}
                                                loadingText="Carregando…"
                                                placeholder="Selecione o documento"
                                                disabled={!cardBrand || !mpSelectReady.docType}
                                            />
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2">
                                                CPF
                                                <div className="relative">
                                                    <HiOutlineIdentification
                                                        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${mpSelectReady.docType ? 'text-[#a38f78]' : 'text-[#d3c7b5]'
                                                            }`}
                                                    />
                                                    <input
                                                        id="form-checkout__identificationNumber"
                                                        name="identificationNumber"
                                                        type="text"
                                                        disabled={!cardBrand || !mpSelectReady.docType}
                                                        className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4`}
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                            </label>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!isCheckoutReady || isProcessing}
                                            className="flex w-full items-center justify-center gap-3 rounded-full bg-[#1a1a1d] px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_25px_55px_-30px_rgba(20,20,32,0.45)] transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:border-[#c9c3b8] disabled:bg-[#c9c3b8]"
                                        >
                                            {isProcessing ? 'Processando…' : 'Pagar com cartão'}
                                        </button>
                                    </form>
                                ) : (
                                    <form className="mt-6 space-y-4" onSubmit={handlePixPayment}>
                                        {!pixResult ? (
                                            <>
                                                <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-sm text-[#4c4c55]">
                                                    Gere um QR Code instantâneo via Mercado Pago. O pagamento deve ser efetuado em
                                                    até {pixGenerationDeadlineMinutes} minutos.
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={!isCheckoutReady || isProcessing || pixPaymentActive}
                                                    className="flex w-full items-center justify-center gap-3 rounded-full border border-[#a38f78] px-6 py-4 text-xs font-semibold uppercase  text-[#a38f78] transition hover:border-[#f97316] hover:text-[#f97316] disabled:cursor-not-allowed disabled:border-[#c9c3b8] disabled:text-[#c9c3b8]"
                                                >
                                                    {isProcessing ? 'Gerando PIX…' : 'Garantir meu Ingresso via Vip'}
                                                </button>
                                            </>
                                        ) : null}

                                        {pixResult ? (
                                            <div className="space-y-4 rounded-2xl border border-[#ded7ca] bg-white p-5">
                                                <div className="rounded-2xl border border-[#b6f0d2] bg-[#f1fff6] px-4 py-3 text-sm text-[#1f5d3d]">
                                                    <p className="font-semibold">Seu pedido está criado e aguardando pagamento via PIX.</p>
                                                    {pixExpirationDescription ? (
                                                        <p className="mt-1 text-xs text-[#2b6b47]">{pixExpirationDescription}</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f1e8] text-[#a38f78]">
                                                        <HiOutlineClipboardDocument className="text-xl" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#1a1a1d]">
                                                            Escaneie o QR Code ou copie o código PIX abaixo.
                                                        </p>
                                                        <p className="text-xs text-[#7d796c]">
                                                            O pagamento é processado pelo Mercado Pago.
                                                        </p>
                                                    </div>
                                                </div>

                                                {pixResult.qrCodeBase64 ? (
                                                    <img
                                                        src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                                                        alt="QR Code PIX"
                                                        className="mx-auto h-48 w-48 rounded-2xl border border-[#ded7ca] bg-white p-3"
                                                    />
                                                ) : null}

                                                {pixResult.ticketUrl ? (
                                                    <div className="space-y-3 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                            Código copia e cola
                                                        </p>
                                                        <p className="mt-2 break-all text-sm text-[#1a1a1d]">
                                                            {pixResult.ticketUrl}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center rounded-full border border-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                                                onClick={async () => {
                                                                    try {
                                                                        await navigator.clipboard.writeText(pixResult.ticketUrl || '');
                                                                        setPixCopySuccess(true);
                                                                        setTimeout(() => setPixCopySuccess(false), 5000);
                                                                    } catch (clipboardError) {
                                                                        console.error('Não foi possível copiar código PIX:', clipboardError);
                                                                    }
                                                                }}
                                                            >
                                                                Copiar código
                                                            </button>
                                                            {pixCopySuccess ? (
                                                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                                                                    Código copiado!
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </form>
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


