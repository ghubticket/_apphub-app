'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    HiOutlineBolt,
    HiOutlineShoppingCart,
    HiOutlineMinusSmall,
    HiOutlinePlusSmall,
    HiOutlineTicket,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineLockClosed,
} from 'react-icons/hi2';
import { addCartItem, emitOpenCart, loadCartItems } from '@/lib/cart';
import type { TicketProduct } from '@/types/ticket';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

type ActionState = {
    type: 'success' | 'warning' | 'error';
    message: string;
    at: number;
    isLimitExceeded?: boolean; // Flag para esconder o botão quando limite for atingido
};

type TicketCatalogProps = {
    tickets: TicketProduct[];
    className?: string;
};

export default function TicketCatalog({ tickets, className }: TicketCatalogProps) {
    const router = useRouter();
    const { isAuthenticated, isReady, user } = useAuth();
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [actionStates, setActionStates] = useState<Record<string, ActionState | undefined>>({});
    const [isCreatingVipOrder, setIsCreatingVipOrder] = useState<Record<string, boolean>>({});

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }),
        [],
    );

    const resolveMaxAllowed = useCallback((ticket: TicketProduct) => {
        const limits = [ticket.maxPerOrder, ticket.stock]
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
        if (!limits.length) return undefined;
        return Math.min(...limits);
    }, []);

    const getQuantityForTicket = useCallback(
        (ticket: TicketProduct) => {
            // VIP: sempre quantidade 1 (fixo)
            if (ticket.isVip) {
                return 1;
            }
            const stored = quantities[ticket.id];
            const baseQuantity = typeof stored === 'number' && stored >= 0 ? stored : 0;
            const maxAllowed = resolveMaxAllowed(ticket);
            if (maxAllowed !== undefined) {
                return Math.min(baseQuantity, maxAllowed);
            }
            return baseQuantity;
        },
        [quantities, resolveMaxAllowed],
    );

    const setFeedback = useCallback((ticketId: string, feedback: ActionState) => {
        setActionStates((prev) => ({
            ...prev,
            [ticketId]: feedback,
        }));
    }, []);

    const updateQuantity = useCallback(
        (ticket: TicketProduct, delta: number) => {
            // VIP: não permite alterar quantidade (sempre 1)
            if (ticket.isVip) {
                return;
            }
            const maxAllowed = resolveMaxAllowed(ticket);
            const current = quantities[ticket.id] ?? 0;
            if (delta > 0 && maxAllowed !== undefined && current >= maxAllowed) {
                setFeedback(ticket.id, {
                    type: 'warning',
                    message: `Você só pode comprar ${maxAllowed} deste ingresso.`,
                    at: Date.now(),
                });
                return;
            }
            setQuantities((prev) => {
                const prevValue = prev[ticket.id] ?? 0;
                const next = prevValue + delta;
                if (next < 0) {
                    return { ...prev, [ticket.id]: 0 };
                }
                if (maxAllowed !== undefined && next > maxAllowed) {
                    return { ...prev, [ticket.id]: maxAllowed };
                }
                return { ...prev, [ticket.id]: next };
            });
        },
        [resolveMaxAllowed, quantities, setFeedback],
    );

    const handleCreateVipOrder = useCallback(
        async (ticket: TicketProduct) => {
            // Verificar autenticação
            if (!isReady) {
                setFeedback(ticket.id, {
                    type: 'warning',
                    message: 'Verificando autenticação...',
                    at: Date.now(),
                });
                return;
            }
            if (!isAuthenticated || !user) {
                setFeedback(ticket.id, {
                    type: 'error',
                    message: 'É necessário estar logado para solicitar ingressos VIP.',
                    at: Date.now(),
                });
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
                return;
            }

            // Verificar se já está criando
            if (isCreatingVipOrder[ticket.id]) {
                return;
            }

            setIsCreatingVipOrder((prev) => ({ ...prev, [ticket.id]: true }));
            setFeedback(ticket.id, {
                type: 'success',
                message: 'Criando pedido VIP...',
                at: Date.now(),
            });

            try {
                if (!ticket.eventId || !ticket.ticketTypeId) {
                    throw new Error('Dados do ingresso incompletos');
                }

                const orderPayload = {
                    eventId: ticket.eventId,
                    ticketTypeId: ticket.ticketTypeId,
                    quantity: 1, // VIP sempre 1
                    customerData: {
                        name: user.name || '',
                        email: user.email,
                        cpf: user.cpf || undefined,
                        phone: user.phone || undefined,
                    },
                };

                console.log('[TicketCatalog] 🚀 Criando pedido VIP diretamente:', {
                    eventId: orderPayload.eventId,
                    ticketTypeId: orderPayload.ticketTypeId,
                    customerEmail: orderPayload.customerData.email,
                });

                const response = await api.post('/orders', orderPayload);
                const orderData = response.data?.data?.order;

                if (orderData) {
                    console.log('[TicketCatalog] ✅ Pedido VIP criado com sucesso:', {
                        orderId: orderData._id,
                        orderNumber: orderData.orderNumber,
                        status: orderData.status,
                    });

                    setFeedback(ticket.id, {
                        type: 'success',
                        message: 'Ingresso VIP solicitado com sucesso! Redirecionando...',
                        at: Date.now(),
                    });

                    // Redirecionar para dashboard após 1s
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 1000);
                } else {
                    throw new Error('Resposta inválida do servidor');
                }
            } catch (error: any) {
                console.error('[TicketCatalog] ❌ Erro ao criar pedido VIP:', error);
                
                const errorMessage = error?.response?.data?.message || 
                                   error?.response?.data?.errors?.[0] ||
                                   error?.message ||
                                   'Erro ao criar pedido VIP. Tente novamente.';

                // Verificar se é erro de limite excedido
                const isLimitExceeded = errorMessage.includes('Limite acumulado por CPF excedido') ||
                                      errorMessage.includes('limite') ||
                                      error?.response?.data?.message === 'Limite acumulado por CPF excedido';

                setFeedback(ticket.id, {
                    type: 'error',
                    message: isLimitExceeded ? 'Limite acumulado por CPF excedido' : errorMessage,
                    at: Date.now(),
                    isLimitExceeded, // Flag para esconder o botão
                });
            } finally {
                setIsCreatingVipOrder((prev) => {
                    const newState = { ...prev };
                    delete newState[ticket.id];
                    return newState;
                });
            }
        },
        [isReady, isAuthenticated, user, router],
    );

    const handleAddToCart = useCallback(
        (ticket: TicketProduct) => {
            // VIP: usar fluxo direto de criação de pedido
            if (ticket.isVip) {
                handleCreateVipOrder(ticket);
                return;
            }

            const quantity = getQuantityForTicket(ticket);
            const maxAllowed = resolveMaxAllowed(ticket);
            if (ticket.stock !== undefined && ticket.stock <= 0) {
                setFeedback(ticket.id, {
                    type: 'warning',
                    message: 'Ingressos esgotados no momento.',
                    at: Date.now(),
                });
                return;
            }

            const itemId = ticket.ticketTypeId ?? ticket.id;
            const cartBefore = loadCartItems();
            const previousQuantity = cartBefore.find((item) => item.id === itemId)?.quantity ?? 0;
            const desiredTotal = previousQuantity + quantity;
            if (maxAllowed !== undefined && desiredTotal > maxAllowed) {
                const remaining = Math.max(0, maxAllowed - previousQuantity);
                setFeedback(ticket.id, {
                    type: 'warning',
                    message:
                        remaining > 0
                            ? `Você só pode adicionar mais ${remaining} deste ingresso.`
                            : `Você já atingiu o limite de ${maxAllowed} deste ingresso.`,
                    at: Date.now(),
                });
                return;
            }

            if (quantity <= 0) {
                setFeedback(ticket.id, {
                    type: 'warning',
                    message: 'Selecione pelo menos 1 ingresso.',
                    at: Date.now(),
                });
                return;
            }

            addCartItem({
                id: itemId,
                ticketTypeId: itemId,
                eventId: ticket.eventId,
                name: ticket.name,
                price: ticket.price,
                quantity,
                date: ticket.eventDate,
                location: ticket.location,
                image: ticket.image,
                maxQuantity: maxAllowed,
                ticketFee: ticket.ticketFee,
                platformFeePercentage: ticket.platformFeePercentage,
                metadata: {
                    eventName: ticket.eventName,
                    category: ticket.category,
                },
            });

            const cartAfter = loadCartItems();
            const updatedQuantity = cartAfter.find((item) => item.id === itemId)?.quantity ?? previousQuantity + quantity;

            if (maxAllowed !== undefined && updatedQuantity >= maxAllowed) {
                setFeedback(ticket.id, {
                    type: 'warning',
                    message: `Você atingiu o limite de ${maxAllowed} unidades para este ingresso.`,
                    at: Date.now(),
                });
            } else {
                setFeedback(ticket.id, {
                    type: 'success',
                    message: ticket.isVip ? 'Ingresso VIP adicionado ao carrinho.' : 'Ingresso adicionado ao carrinho.',
                    at: Date.now(),
                });
            }

            emitOpenCart();
        },
        [getQuantityForTicket, resolveMaxAllowed, setFeedback, handleCreateVipOrder],
    );

    if (!tickets.length) {
        return (
            <div
                className={`rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-8 text-center text-sm text-[#7d796c] ${
                    className ?? ''
                }`}
            >
                Nenhum ingresso disponível no momento.
            </div>
        );
    }

    return (
        <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${className ?? ''}`}>
            {tickets.map((ticket) => {
                const isVip = ticket.isVip ?? false;
                const quantity = getQuantityForTicket(ticket);
                const availableStock = ticket.stock ?? undefined;
                const isSoldOut = availableStock !== undefined && availableStock <= 0;
                const maxAllowed = resolveMaxAllowed(ticket);
                const maxReached = maxAllowed !== undefined && quantity >= maxAllowed;
                const feedback = actionStates[ticket.id];
                const canPurchaseVip = isVip && isReady && isAuthenticated;

                const feeParts: string[] = [];
                if (ticket.platformFeePercentage && ticket.platformFeePercentage > 0) {
                    feeParts.push(`${ticket.platformFeePercentage}%`);
                }
                if (ticket.ticketFee && ticket.ticketFee > 0) {
                    feeParts.push(currencyFormatter.format(ticket.ticketFee));
                }
                const feesLabel = feeParts.length ? feeParts.join(' + ') : null;

                return (
                    <article
                        key={ticket.id}
                        className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#ded7ca] bg-white/80 p-6 shadow-[0_30px_60px_-35px_rgba(20,20,32,0.35)] transition hover:-translate-y-1 hover:shadow-[0_45px_65px_-35px_rgba(20,20,32,0.4)]"
                    >
                        <div className="flex flex-col gap-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-[#f5f1e8] px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-normal text-[#a38f78]">
                                        <HiOutlineTicket className="text-sm" />
                                        {ticket.category ?? 'Ingresso'}
                                    </span>
                                    <h3 className="text-xl font-semibold uppercase  text-[#1a1a1d]">
                                        {ticket.name}
                                    </h3>
                                    {ticket.eventName ? (
                                        <p className="text-xs font-medium uppercase  text-[#7d796c]">
                                            {ticket.eventName}
                                        </p>
                                    ) : null}
                                </div>

                            </div>

                            {ticket.description ? (
                                <p className="text-sm leading-relaxed text-[#4c4c55]">{ticket.description}</p>
                            ) : null}

                            <div className="rounded-2xl border border-[#ede5d8] bg-white px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs font-semibold uppercase  text-[#7d796c]">
                                        {isVip ? 'Status' : 'Valor'}
                                    </span>
                                    {availableStock !== undefined ? (
                                        <span className="text-[0.65rem] uppercase  text-[#a38f78]">
                                            {availableStock > 0 ? `${availableStock} disponíveis` : 'Esgotado'}
                                        </span>
                                    ) : null}
                                </div>
                                {isVip ? (
                                    <p className="mt-2 text-sm font-semibold leading-relaxed text-[#10b981]">
                                        Cortesia
                                    </p>
                                ) : (
                                    <>
                                        <p className="mt-2 text-sm leading-relaxed text-[#4c4c55]">
                                            {currencyFormatter.format(ticket.price)}
                                        </p>
                                        {feesLabel ? (
                                            <p className="mt-1 text-xs font-medium uppercase  text-[#a38f78]">
                                                Taxas: {feesLabel}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>

                            {(ticket.eventDate || ticket.location) && (
                                <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs font-medium text-[#6f6b63]">
                                    {ticket.eventDate ? <p className="uppercase ">{ticket.eventDate}</p> : null}
                                    {ticket.location ? (
                                        <p className="mt-1 uppercase  text-[#a38f78]">{ticket.location}</p>
                                    ) : null}
                                </div>
                            )}

                            {!isVip ? (
                                <div className="flex items-center justify-between rounded-2xl border border-[#ede5d8] bg-white px-4 py-3">
                                    <span className="text-xs font-semibold uppercase  text-[#7d796c]">
                                        Quantidade
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-[#1a1a1d]"
                                            onClick={() => updateQuantity(ticket, -1)}
                                            aria-label={`Remover um ingresso de ${ticket.name}`}
                                            disabled={quantity <= 0}
                                        >
                                            <HiOutlineMinusSmall className="text-lg" />
                                        </button>
                                        <span className="min-w-[32px] text-center text-sm font-semibold text-[#1a1a1d]">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-[#1a1a1d]"
                                            onClick={() => updateQuantity(ticket, 1)}
                                            aria-label={`Adicionar ingresso de ${ticket.name}`}
                                            disabled={isSoldOut || maxReached}
                                        >
                                            <HiOutlinePlusSmall className="text-lg" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs font-medium text-[#6f6b63]">
                                    <p className="uppercase ">
                                        {isReady && !isAuthenticated
                                            ? 'Login necessário para solicitar'
                                            : 'Limite: 1 ingresso por CPF'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-3">
                            {/* Esconder botão VIP se limite foi atingido */}
                            {!(isVip && feedback?.isLimitExceeded) && (
                                <button
                                    type="button"
                                    onClick={() => handleAddToCart(ticket)}
                                    disabled={isSoldOut || quantity <= 0 || (isVip && !canPurchaseVip) || (isVip && isCreatingVipOrder[ticket.id])}
                                    className={`inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-3 text-xs font-semibold uppercase  transition ${
                                        isSoldOut || quantity <= 0 || (isVip && !canPurchaseVip) || (isVip && isCreatingVipOrder[ticket.id])
                                            ? 'cursor-not-allowed border border-[#c9c3b8] text-[#c9c3b8]'
                                            : 'border border-[#a38f78] text-[#a38f78] hover:border-[#f97316] hover:text-[#f97316]'
                                    }`}
                                >
                                    {isVip && !isAuthenticated ? (
                                        <>
                                            <HiOutlineLockClosed className="text-base" />
                                            Login necessário
                                        </>
                                    ) : isVip && isCreatingVipOrder[ticket.id] ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a38f78] border-t-transparent" />
                                            Criando pedido...
                                        </>
                                    ) : (
                                        <>
                                            <HiOutlineBolt className="text-base" />
                                            {isVip ? 'Solicitar ingresso VIP' : 'Comprar agora'}
                                        </>
                                    )}
                                </button>
                            )}

                            {feedback ? (
                                <div
                                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                                        feedback.type === 'success'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : feedback.type === 'warning'
                                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                                              : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }`}
                                >
                                    {feedback.type === 'success' ? (
                                        <HiOutlineCheckCircle className="text-lg" />
                                    ) : (
                                        <HiOutlineExclamationTriangle className="text-lg" />
                                    )}
                                    <span className="text-xs font-medium uppercase ">{feedback.message}</span>
                                </div>
                            ) : null}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

