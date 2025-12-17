'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { HiOutlineTicket, HiOutlineChevronDown } from 'react-icons/hi2';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import PixExpirationTimer from './PixExpirationTimer';
import ParcelledOrderCard from './parcelled/ParcelledOrderCard';
import { statusConfig, paymentLabels } from '../config';
import type { OrderSummary, OrderGroup, ParcelledOrderWithParcels } from '../types';

interface OrdersListProps {
    orders: Array<OrderSummary | OrderGroup>;
    parcelledOrders: ParcelledOrderWithParcels[];
    loading: boolean;
    error: string;
    isPolling: boolean;
    isPollingParcelled: boolean;
    onViewDetails: (orderId: string) => void;
    onViewGroup: (groupId: string) => void;
    isMobileDevice: () => boolean;
    isMobileViewport: boolean;
    pixCodeCopied: Record<string, boolean>;
    onCopyPixCode: (key: string, code: string) => Promise<void>;
}

export default function OrdersList({
    orders,
    parcelledOrders,
    loading,
    error,
    isPolling,
    isPollingParcelled,
    onViewDetails,
    onViewGroup,
    isMobileDevice,
    isMobileViewport,
    pixCodeCopied,
    onCopyPixCode,
}: OrdersListProps) {
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 2,
            }),
        [],
    );

    const formatDate = useCallback((isoDate?: string) => {
        if (!isoDate) return 'Data não informada';
        const parsed = new Date(isoDate);
        if (Number.isNaN(parsed.getTime())) return 'Data não informada';
        return parsed.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }, []);

    const formatEventDate = useCallback((isoDate?: string) => {
        if (!isoDate) return null;
        const parsed = new Date(isoDate);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }, []);

    const isOrderGroup = (item: OrderSummary | OrderGroup): item is OrderGroup => {
        return 'orders' in item && Array.isArray((item as OrderGroup).orders);
    };

    if (loading) {
        return (
            <LoadingSpinner
                message="Carregando seus pedidos..."
                submessage="Aguarde enquanto buscamos suas informações"
            />
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-[#f2c4c4] bg-[#fbecec] p-6 text-sm text-[#a22d2d]">
                {error}
            </div>
        );
    }

    if (!orders.length && !parcelledOrders.length) {
        return (
            <div className="rounded-2xl border border-dashed border-[#ded7ca] bg-white/50 p-6 text-center text-sm text-[#7d796c]">
                Você ainda não possui pedidos. Assim que comprar seus ingressos, eles aparecerão
                aqui com todos os detalhes, status e QR codes.
            </div>
        );
    }

    // Combinar pedidos normais e parcelados
    // (Filtragem de duplicatas já é feita no page.tsx)
    const allItems = [
        ...orders.map(o => ({ type: 'normal' as const, data: o })),
        ...parcelledOrders.map(p => ({ type: 'parcelled' as const, data: p }))
    ];

    // Ordenar por data (mais recente primeiro)
    allItems.sort((a, b) => {
        const getDate = (item: typeof allItems[0]) => {
            if (item.type === 'normal') {
                const order = item.data as OrderSummary | OrderGroup;
                if ('latestCreatedAt' in order) {
                    return order.latestCreatedAt || '';
                }
                return (order as OrderSummary).createdAt || '';
            } else {
                return (item.data as ParcelledOrderWithParcels).createdAt || '';
            }
        };

        const dateA = getDate(a);
        const dateB = getDate(b);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return (
        <div className="space-y-6">
            {allItems.map((item) => {
                if (item.type === 'parcelled') {
                    // Renderizar pedido parcelado
                    const parcelledOrder = item.data as ParcelledOrderWithParcels;
                    
                    // Verificar se tem tickets para mostrar
                    const hasTickets = parcelledOrder.tickets && parcelledOrder.tickets.length > 0;
                    
                    return (
                        <ParcelledOrderCard
                            key={parcelledOrder._id}
                            order={parcelledOrder}
                            currencyFormatter={currencyFormatter}
                            formatDate={formatDate}
                            onPixCodeCopy={onCopyPixCode}
                            pixCodeCopied={pixCodeCopied}
                            onViewTickets={hasTickets ? onViewDetails : undefined}
                        />
                    );
                }

                // Renderizar pedido normal
                const orderItem = item.data as OrderSummary | OrderGroup;
                // Renderizar grupo consolidado
                if (isOrderGroup(orderItem)) {
                    const group = orderItem;
                    const eventDate = formatEventDate(group.eventDate || undefined);
                    const paymentLabelsList = group.paymentMethods
                        .map((method) => paymentLabels[method] || method)
                        .join(', ');
                    const earliestDate = formatDate(group.earliestCreatedAt);
                    const latestDate = formatDate(group.latestCreatedAt);
                    const groupId = `group-${group.eventId}`;
                    const isExpanded = expandedOrderId === groupId;

                    const allTickets = group.orders.flatMap((o) => {
                        if (Array.isArray(o.tickets)) {
                            return o.tickets;
                        }
                        return [];
                    });
                    const ticketsConfirmed = allTickets.filter(
                        (ticket) => ticket?.status === 'confirmed',
                    ).length;
                    const realTotalTickets = allTickets.length;

                    return (
                        <article
                            key={groupId}
                            className="rounded-2xl border border-[#ded7ca] bg-white/80 p-6 transition"
                        >
                            <header>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedOrderId((current) =>
                                            current === groupId ? null : groupId,
                                        )
                                    }
                                    className="flex w-full flex-col gap-4 text-left transition hover:text-[#1a1a1d] md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                            {group.orders.length} Pedido
                                            {group.orders.length > 1 ? 's' : ''} Consolidado
                                            {group.orders.length > 1 ? 's' : ''}
                                        </span>
                                        <h3 className="text-lg leading-none font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                            {group.eventName}
                                        </h3>
                                        <p className="text-xs text-[#7d796c]">
                                            {eventDate ? `${eventDate}` : 'Data a confirmar'}
                                            {group.eventLocation ? ` • ${group.eventLocation}` : ''}
                                            {statusConfig.paid.label}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="flex flex-col gap-2">
                                            <span
                                                className={`flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-normal ${statusConfig.paid.badgeClass}`}
                                            >
                                                {statusConfig.paid.label}
                                            </span>
                                        </div>
                                        <HiOutlineChevronDown
                                            className={`hidden md:block text-xl text-[#a38f78] transition-transform duration-300 ${
                                                isExpanded ? 'rotate-180' : ''
                                            }`}
                                            aria-hidden
                                        />
                                    </div>
                                </button>
                            </header>

                            <div className="mt-4 flex">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedOrderId((current) =>
                                            current === groupId ? null : groupId,
                                        )
                                    }
                                    className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#fff7ec] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#f97316] transition hover:bg-[#f97316]/20 hover:text-white"
                                >
                                    {isExpanded ? 'Recolher pedido' : 'Expandir pedido'}
                                </button>
                            </div>

                            <div
                                className={`transition-all duration-500 ${
                                    isExpanded
                                        ? 'pt-6 opacity-100'
                                        : 'pointer-events-none max-h-0 opacity-0 overflow-hidden'
                                }`}
                            >
                                <div className="mb-4 space-y-4">
                                    <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                        Pedidos Consolidados ({group.orders.length})
                                    </span>
                                    {group.orders.map((order) => {
                                        const orderCreatedAt = formatDate(order.createdAt);
                                        const orderPaymentLabel =
                                            order.paymentMethod && paymentLabels[order.paymentMethod]
                                                ? paymentLabels[order.paymentMethod]
                                                : 'Pagamento confirmado';

                                        const isOrderVip =
                                            order.paymentMethod === 'vip_free' ||
                                            order.totalAmount === 0;

                                        return (
                                            <div
                                                key={order._id}
                                                className="rounded-xl border border-[#ded7ca]/50 bg-white/50 p-4"
                                            >
                                                <div>
                                                    <span className="text-xs font-semibold text-[#a38f78]">
                                                        Pedido #{order.orderNumber}
                                                    </span>
                                                    <p className="text-xs text-[#7d796c] mt-1">
                                                        {orderCreatedAt} • {orderPaymentLabel}
                                                    </p>
                                                    {isOrderVip ? (
                                                        <p className="text-xs text-[#4c4c55] mt-1 leading-relaxed">
                                                            Esse ingresso é uma cortesia, é proibida
                                                            a venda, e é intransferível.
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs font-medium text-[#4c4c55] mt-1">
                                                            {order.totalTickets} ingresso
                                                            {order.totalTickets > 1 ? 's' : ''} •{' '}
                                                            {currencyFormatter.format(
                                                                order.totalAmount,
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-center mt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onViewGroup(groupId);
                                        }}
                                        className="flex items-center gap-2 w-full md:w-auto justify-center rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-normal text-white shadow-[0_18px_38px_-22px_rgba(20,20,32,0.6)] transition hover:bg-[#f97316] hover:text-white"
                                    >
                                        <HiOutlineTicket className="text-base" />
                                        Visualizar Ingressos ({allTickets.length})
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                }

                // Renderizar pedido individual  
                const order = orderItem as OrderSummary;
                const statusInfo = statusConfig[order.status] ?? statusConfig.pending;
                const eventName = order.event?.name ?? 'Evento não informado';
                const eventDate = formatEventDate(order.event?.date || undefined);
                const eventLocation = order.event?.location || order.event?.address || '';
                const createdAt = formatDate(order.createdAt);
                const paymentLabel =
                    (order.paymentMethod && paymentLabels[order.paymentMethod]) ||
                    (order.status === 'paid' ? 'Pagamento confirmado' : 'Pagamento pendente');

                const ticketsConfirmed = order.tickets.filter(
                    (ticket) => ticket?.status === 'confirmed',
                ).length;
                const isVipOrder = order.paymentMethod === 'vip_free' || order.totalAmount === 0;
                const isExpanded = expandedOrderId === order._id;

                return (
                    <article
                        key={order._id}
                        className="rounded-2xl border border-[#ded7ca] bg-white/80 p-6 transition"
                    >
                        <header>
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedOrderId((current) =>
                                        current === order._id ? null : order._id,
                                    )
                                }
                                className="flex w-full flex-col gap-4 text-left transition hover:text-[#1a1a1d] md:flex-row md:items-center md:justify-between"
                            >
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                        Pedido {order.orderNumber ? `#${order.orderNumber}` : ''}
                                    </span>
                                    <h3 className="text-lg leading-none font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                        {eventName}
                                    </h3>
                                    <p className="text-xs text-[#7d796c]">
                                        {eventDate ? `${eventDate}` : 'Data a confirmar'}
                                        {eventLocation ? ` • ${eventLocation}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-10 w-full md:w-auto">
                                    {isVipOrder ? (
                                        <div className="w-full md:w-auto">
                                            <p className="text-xs text-[#4c4c55] leading-relaxed">
                                                Esse ingresso é uma cortesia, é proibida a venda, e é
                                                intransferível.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3 w-full md:w-auto justify-between">
                                            <p className="text-black">
                                                Seu pedido foi:
                                                <span>
                                                    {' '}
                                                    {currencyFormatter.format(
                                                        order.totalAmount ?? 0,
                                                    )}
                                                </span>
                                            </p>
                                            <span
                                                className={`flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-normal ${statusInfo.badgeClass}`}
                                            >
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>

                            <div className="mt-4 flex">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedOrderId((current) =>
                                            current === order._id ? null : order._id,
                                        )
                                    }
                                    className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#fff7ec] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#f97316] transition hover:bg-[#f97316]/20 hover:text-white"
                                >
                                    {isExpanded ? 'Recolher pedido' : 'Expandir pedido'}
                                </button>
                            </div>
                        </header>

                        <div
                            className={`gap-20 transition-all flex duration-500 ${
                                isExpanded
                                    ? 'pt-6 opacity-100'
                                    : 'pointer-events-none max-h-0 opacity-0 overflow-hidden'
                            }`}
                        >
                            {/* Seção de PIX pendente */}
                            {order.status === 'pending' &&
                                order.paymentMethod === 'pix' &&
                                (order.pixInfo ? (
                                    <div className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                        <div className="mb-3 flex justify-center items-center gap-2">
                                            <svg
                                                className="h-5 w-5 text-emerald-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span className="text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                                Pagamento PIX Pendente
                                            </span>
                                        </div>

                                        {isPolling && (
                                            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-100/80 p-2.5">
                                                <div className="flex flex-col md:flex-row items-center justify-center gap-2">
                                                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-600"></div>
                                                    <p className="text-xs text-center font-semibold text-emerald-800">
                                                        Aguardando confirmação de pagamento em tempo
                                                        real...
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <p className="mb-4 text-center text-sm text-emerald-700">
                                            Seu pedido ainda está pendente. Copie e cole o código
                                            PIX abaixo para finalizar o pagamento.
                                        </p>

                                        {order.pixInfo.qrCodeBase64 && (
                                            <div className="mb-4 flex justify-center">
                                                <img
                                                    src={`data:image/png;base64,${order.pixInfo.qrCodeBase64}`}
                                                    alt="QR Code PIX"
                                                    className="md:h-48 md:w-48 h-full w-full rounded-lg border-2 border-emerald-200 bg-white p-2"
                                                />
                                            </div>
                                        )}

                                        {(order.pixInfo.qrCode || order.pixInfo.ticketUrl) && (
                                            <div className="mb-4">
                                                <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                                    Código PIX (Copiar e Colar)
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={
                                                            order.pixInfo.qrCode ||
                                                            order.pixInfo.ticketUrl ||
                                                            ''
                                                        }
                                                        className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-[#1a1a1d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                        onClick={(e) =>
                                                            (e.target as HTMLInputElement).select()
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onCopyPixCode(
                                                                `order-${order._id}`,
                                                                order.pixInfo!.qrCode ||
                                                                    order.pixInfo!.ticketUrl ||
                                                                    '',
                                                            )
                                                        }
                                                        className="rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-200"
                                                    >
                                                        {pixCodeCopied[`order-${order._id}`]
                                                            ? '✓ Código copiado!'
                                                            : 'Copiar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {order.pixInfo.expiresAt && (
                                            <PixExpirationTimer expiresAt={order.pixInfo.expiresAt} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                        <div className="mb-3 flex items-center gap-2">
                                            <svg
                                                className="h-5 w-5 text-amber-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span className="text-xs font-semibold uppercase tracking-normal text-amber-800">
                                                Pagamento PIX Pendente
                                            </span>
                                        </div>
                                        <p className="mb-2 text-sm text-amber-700">
                                            Seu pedido está aguardando pagamento via PIX.
                                        </p>
                                        <p className="text-xs text-amber-600">
                                            ⚠️ As informações do PIX estão sendo carregadas...
                                        </p>
                                    </div>
                                ))}

                            {order.status === 'paid' && ticketsConfirmed > 0 && (
                                <div className="flex-1 rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                                    <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                                        Ingressos
                                    </span>
                                    <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">
                                        {order.totalTickets}x
                                    </p>
                                    <p className="mt-1 text-xs font-medium tracking-normal text-[#6a6760]">
                                        {ticketsConfirmed} confirmados
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            onViewDetails(order._id);
                                        }}
                                        className="mt-4 flex gap-3 w-full md:w-fit text-center justify-center rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase text-white shadow-[0_18px_38px_-22px_rgba(20,20,32,0.6)] transition hover:bg-[#f97316] hover:text-white"
                                    >
                                        <HiOutlineTicket className="text-base" />
                                        Abrir ingressos
                                    </button>
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
