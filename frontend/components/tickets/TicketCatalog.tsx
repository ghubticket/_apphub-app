'use client';

import { useCallback, useMemo, useState } from 'react';
import {
    HiOutlineBolt,
    HiOutlineShoppingCart,
    HiOutlineMinusSmall,
    HiOutlinePlusSmall,
    HiOutlineTicket,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { addCartItem, emitOpenCart, loadCartItems } from '@/lib/cart';
import type { TicketProduct } from '@/types/ticket';

type ActionState = {
    type: 'success' | 'warning' | 'error';
    message: string;
    at: number;
};

type TicketCatalogProps = {
    tickets: TicketProduct[];
    className?: string;
};

export default function TicketCatalog({ tickets, className }: TicketCatalogProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [actionStates, setActionStates] = useState<Record<string, ActionState | undefined>>({});

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

    const handleAddToCart = useCallback(
        (ticket: TicketProduct) => {
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
                    message: 'Ingresso adicionado ao carrinho.',
                    at: Date.now(),
                });
            }

            emitOpenCart();
        },
        [getQuantityForTicket, resolveMaxAllowed, setFeedback],
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
                const quantity = getQuantityForTicket(ticket);
                const availableStock = ticket.stock ?? undefined;
                const isSoldOut = availableStock !== undefined && availableStock <= 0;
                const maxAllowed = resolveMaxAllowed(ticket);
                const maxReached = maxAllowed !== undefined && quantity >= maxAllowed;
                const feedback = actionStates[ticket.id];

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
                                    <span className="inline-flex items-center gap-2 rounded-full bg-[#f5f1e8] px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                        <HiOutlineTicket className="text-sm" />
                                        {ticket.category ?? 'Ingresso'}
                                    </span>
                                    <h3 className="text-xl font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                        {ticket.name}
                                    </h3>
                                    {ticket.eventName ? (
                                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#7d796c]">
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
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
                                        Valor
                                    </span>
                                    {availableStock !== undefined ? (
                                        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#a38f78]">
                                            {availableStock > 0 ? `${availableStock} disponíveis` : 'Esgotado'}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-[#4c4c55]">
                                    {currencyFormatter.format(ticket.price)}
                                </p>
                                {feesLabel ? (
                                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#a38f78]">
                                        Taxas: {feesLabel}
                                    </p>
                                ) : null}
                            </div>

                            {(ticket.eventDate || ticket.location) && (
                                <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs font-medium text-[#6f6b63]">
                                    {ticket.eventDate ? <p className="uppercase tracking-[0.2em]">{ticket.eventDate}</p> : null}
                                    {ticket.location ? (
                                        <p className="mt-1 uppercase tracking-[0.2em] text-[#a38f78]">{ticket.location}</p>
                                    ) : null}
                                </div>
                            )}

                            <div className="flex items-center justify-between rounded-2xl border border-[#ede5d8] bg-white px-4 py-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">
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
                        </div>

                        <div className="mt-6 space-y-3">
                            <button
                                type="button"
                                onClick={() => handleAddToCart(ticket)}
                                disabled={isSoldOut || quantity <= 0}
                                className={`inline-flex w-full items-center justify-center gap-3 rounded-full border border-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                                    isSoldOut || quantity <= 0
                                        ? 'cursor-not-allowed border-[#c9c3b8] bg-[#f5f1e8] text-[#c9c3b8]'
                                        : 'bg-[#1a1a1d] text-white hover:bg-[#f97316] hover:text-[#1a1a1d]'
                                }`}
                            >
                                <HiOutlineShoppingCart className="text-base" />
                                Adicionar ao carrinho
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddToCart(ticket)}
                                disabled={isSoldOut || quantity <= 0}
                                className={`inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                                    isSoldOut || quantity <= 0
                                        ? 'cursor-not-allowed border border-[#c9c3b8] text-[#c9c3b8]'
                                        : 'border border-[#a38f78] text-[#a38f78] hover:border-[#f97316] hover:text-[#f97316]'
                                }`}
                            >
                                <HiOutlineBolt className="text-base" />
                                Comprar agora
                            </button>

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
                                    <span className="text-xs font-medium uppercase tracking-[0.2em]">{feedback.message}</span>
                                </div>
                            ) : null}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

