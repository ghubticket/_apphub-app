'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineTicket, HiOutlineTrash, HiOutlineClipboardDocument, HiOutlineSparkles } from 'react-icons/hi2';
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
    const [deviceId, setDeviceId] = useState<string | null>(null);

    const [customerData, setCustomerData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        cpf: '',
        phone: '',
    });

    const mercadoPago = useMercadoPago(MP_PUBLIC_KEY);
    const cardFormRef = useRef<any>(null);

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
        if (!isReady) return;
        if (!isAuthenticated) {
            router.replace('/login?redirect=/checkout');
        }
    }, [isReady, isAuthenticated, router]);

    useEffect(() => {
        if (!mercadoPago) return;
        try {
            const id = mercadoPago.getDeviceId?.();
            if (id) {
                setDeviceId(id);
            }
        } catch (error) {
            console.warn('Não foi possível obter o deviceId do Mercado Pago:', error);
        }
    }, [mercadoPago]);

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
                            console.warn('Erro ao montar cardForm:', error);
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
        };
    }, [mercadoPago, totalAmount]);

    const handleCustomerChange = (field: keyof typeof customerData, value: string) => {
        setCustomerData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const validateCustomerData = useCallback(() => {
        if (!customerData.name.trim()) {
            setGlobalError('Informe o nome completo.');
            return false;
        }
        if (!customerData.email.trim()) {
            setGlobalError('Informe um e-mail válido.');
            return false;
        }
        if (!customerData.cpf.trim() || customerData.cpf.replace(/\D/g, '').length !== 11) {
            setGlobalError('Informe um CPF válido (11 dígitos).');
            return false;
        }
        if (!customerData.phone.trim() || customerData.phone.replace(/\D/g, '').length < 10) {
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

        const response = await api.post('/orders', {
            eventId: primaryCartItem.eventId,
            ticketTypeId: primaryCartItem.ticketTypeId ?? primaryCartItem.id,
            quantity: primaryCartItem.quantity,
            customerData: {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                cpf: customerData.cpf,
            },
        });

        const createdOrder = response.data?.data?.order;
        if (!createdOrder?._id) {
            throw new Error('Não foi possível criar o pedido.');
        }
        setOrder(createdOrder);
        return createdOrder;
    }, [customerData, order, primaryCartItem, validateCustomerData]);

    const handleRemoveItem = useCallback(
        (id: string) => {
            removeCartItemFromStorage(id);
            setOrder(null);
            setPixResult(null);
            setGlobalSuccess('');
            refreshCart();
        },
        [refreshCart],
    );

    const finalizeSuccess = useCallback(
        (message: string) => {
            clearCartItems();
            refreshCart();
            setGlobalSuccess(message);
            setGlobalError('');
        },
        [refreshCart],
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

            try {
                setIsProcessing(true);
                const cardFormData = cardFormRef.current.getCardFormData();
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
                    headers: deviceId
                        ? {
                              'X-meli-session-id': deviceId,
                          }
                        : undefined,
                });

                finalizeSuccess('Pagamento aprovado! Seus ingressos serão liberados em instantes.');
            } catch (error: any) {
                console.error('Erro no pagamento com cartão:', error);
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
        [deviceId, ensureOrder, ensureSingleItem, finalizeSuccess, primaryCartItem],
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

            try {
                setIsProcessing(true);

                const createdOrder = await ensureOrder();

                const response = await api.post(
                    `/payments/${createdOrder._id}/pix`,
                    {
                        deviceId,
                    },
                    {
                        headers: deviceId
                            ? {
                                  'X-meli-session-id': deviceId,
                              }
                            : undefined,
                    },
                );

                const data = response.data?.data;
                setPixResult(data);
                setGlobalSuccess('Pagamento PIX gerado! Use o QR Code ou código copia e cola.');
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
        [deviceId, ensureOrder, ensureSingleItem, primaryCartItem],
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
                        Seu carrinho está vazio. Explore nossos eventos e selecione os ingressos desejados.
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
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ded7ca] text-[#7d796c] transition hover:border-rose-300 hover:text-rose-500"
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
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                        Nome completo
                                        <input
                                            type="text"
                                            value={customerData.name}
                                            onChange={(event) => handleCustomerChange('name', event.target.value)}
                                            className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                            placeholder="Como aparece no documento"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                        E-mail
                                        <input
                                            type="email"
                                            value={customerData.email}
                                            onChange={(event) => handleCustomerChange('email', event.target.value)}
                                            className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                            placeholder="email@exemplo.com"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                        CPF
                                        <input
                                            type="text"
                                            value={customerData.cpf}
                                            onChange={(event) => handleCustomerChange('cpf', event.target.value)}
                                            className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                            placeholder="000.000.000-00"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                        Celular
                                        <input
                                            type="tel"
                                            value={customerData.phone}
                                            onChange={(event) => handleCustomerChange('phone', event.target.value)}
                                            className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                            placeholder="(11) 99999-9999"
                                        />
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
                                        onClick={() => setSelectedTab('card')}
                                        className={`flex-1 rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                                            selectedTab === 'card'
                                                ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white shadow-[0_20px_45px_-20px_rgba(20,20,32,0.45)]'
                                                : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                                        }`}
                                    >
                                        Cartão de crédito
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTab('pix')}
                                        className={`flex-1 rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                                            selectedTab === 'pix'
                                                ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white shadow-[0_20px_45px_-20px_rgba(20,20,32,0.45)]'
                                                : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                                        }`}
                                    >
                                        Pagamento via PIX
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
                                        <div className="grid gap-4">
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                Número do cartão
                                                <input
                                                    id="form-checkout__cardNumber"
                                                    name="cardNumber"
                                                    type="text"
                                                    className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                    placeholder="0000 0000 0000 0000"
                                                />
                                            </label>
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                    Mês
                                                    <input
                                                        id="form-checkout__cardExpirationMonth"
                                                        name="cardExpirationMonth"
                                                        type="text"
                                                        className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                        placeholder="MM"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                    Ano
                                                    <input
                                                        id="form-checkout__cardExpirationYear"
                                                        name="cardExpirationYear"
                                                        type="text"
                                                        className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                        placeholder="AA"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                    CVV
                                                    <input
                                                        id="form-checkout__securityCode"
                                                        name="securityCode"
                                                        type="text"
                                                        className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                        placeholder="CVV"
                                                    />
                                                </label>
                                            </div>

                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                Nome igual ao cartão
                                                <input
                                                    id="form-checkout__cardholderName"
                                                    name="cardholderName"
                                                    type="text"
                                                    className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                    placeholder="Nome completo"
                                                />
                                            </label>
                                            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                E-mail para recibo
                                                <input
                                                    id="form-checkout__cardholderEmail"
                                                    name="cardholderEmail"
                                                    type="email"
                                                    defaultValue={customerData.email}
                                                    className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                    placeholder="email@testuser.com"
                                                />
                                            </label>
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                    Bandeira
                                                    <select
                                                        id="form-checkout__issuer"
                                                        name="issuer"
                                                        className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                    Parcelas
                                                    <select
                                                        id="form-checkout__installments"
                                                        name="installments"
                                                        className="rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                    Documento
                                                    <div className="flex gap-2">
                                                        <select
                                                            id="form-checkout__identificationType"
                                                            name="identificationType"
                                                            className="w-24 rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-3 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                        />
                                                        <input
                                                            id="form-checkout__identificationNumber"
                                                            name="identificationNumber"
                                                            type="text"
                                                            className="flex-1 rounded-2xl border border-[#ded7ca] bg-[#faf7f0] px-4 py-3 text-sm text-[#1a1a1d] outline-none transition focus:border-[#a38f78]"
                                                            placeholder="Documento"
                                                        />
                                                    </div>
                                                </label>
                                            </div>
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
                                        <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-sm text-[#4c4c55]">
                                            Gere um QR Code instantâneo via Mercado Pago. O pagamento deve ser efetuado em
                                            até {pixResult?.expirationMinutes || 30} minutos.
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!isCheckoutReady || isProcessing}
                                            className="flex w-full items-center justify-center gap-3 rounded-full border border-[#a38f78] px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#a38f78] transition hover:border-[#f97316] hover:text-[#f97316] disabled:cursor-not-allowed disabled:border-[#c9c3b8] disabled:text-[#c9c3b8]"
                                        >
                                            {isProcessing ? 'Gerando PIX…' : 'Gerar PIX'}
                                        </button>

                                        {pixResult ? (
                                            <div className="space-y-4 rounded-2xl border border-[#ded7ca] bg-white p-5">
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
                                                    <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                                            Código copia e cola
                                                        </p>
                                                        <p className="mt-2 break-all text-sm text-[#1a1a1d]">
                                                            {pixResult.ticketUrl}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            className="mt-3 inline-flex items-center justify-center rounded-full border border-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(pixResult.ticketUrl || '');
                                                            }}
                                                        >
                                                            Copiar código
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </form>
                                )}

                                <div className="mt-6 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 text-[#a38f78]">
                                            <HiOutlineSparkles className="text-base" />
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


