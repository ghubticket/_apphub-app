'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { HiOutlineChevronDown, HiOutlineTicket } from 'react-icons/hi2';
import {
    getPaymentStatus as getPaymentStatusAction,
    generateParcelPayment as generateParcelPaymentAction
} from '@/app/api/payments/actions';
import ParcelProgressBar from './ParcelProgressBar';
import ParcelStatusBadge from './ParcelStatusBadge';
import PixExpirationTimer from '../PixExpirationTimer';
import { parcelledOrderStatusConfig, parcelAlertMessages } from '../../config/parcelled';
import {
    sortParcelsBySequence,
    getEntryParcel,
    isEntryPaid,
    canGeneratePixForParcel,
    getParcelLabel,
    countOverdueParcels,
    getOrderAlertMessage,
    getAlertColor,
    areAllParcelsPaid,
} from '../../utils/parcelHelpers';
import type { ParcelledOrderWithParcels, ParcelSummary } from '../../types/parcelled';

interface ParcelledOrderCardProps {
    order: ParcelledOrderWithParcels;
    currencyFormatter: Intl.NumberFormat;
    formatDate: (date?: string) => string;
    onPixCodeCopy: (key: string, code: string) => Promise<void>;
    pixCodeCopied: Record<string, boolean>;
    onViewTickets?: (orderId: string) => void;
}

export default function ParcelledOrderCard({
    order,
    currencyFormatter,
    formatDate,
    onPixCodeCopy,
    pixCodeCopied,
    onViewTickets,
}: ParcelledOrderCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [generatingPixParcelId, setGeneratingPixParcelId] = useState<string | null>(null);
    const [parcelError, setParcelError] = useState<{ parcelId: string; message: string } | null>(null);
    const [entryPixInfo, setEntryPixInfo] = useState<{
        qrCode?: string | null;
        qrCodeBase64?: string | null;
        expiresAt?: string | null;
    } | null>(null);

    // Estado para armazenar PIX de parcelas individuais
    const [parcelPixInfo, setParcelPixInfo] = useState<Record<string, {
        qrCode?: string | null;
        qrCodeBase64?: string | null;
        expiresAt?: string | null;
    }>>({});

    const statusConfig = parcelledOrderStatusConfig[order.status];
    const eventName = order.event?.name || order.metadata?.eventName || 'Evento não informado';
    const createdAt = formatDate(order.createdAt);
    const sortedParcels = useMemo(() => sortParcelsBySequence(order.parcels), [order.parcels]);
    const entryParcel = useMemo(() => getEntryParcel(sortedParcels), [sortedParcels]);
    const isEntryPaidValue = useMemo(() => isEntryPaid(sortedParcels), [sortedParcels]);
    const overdueCount = useMemo(() => countOverdueParcels(sortedParcels), [sortedParcels]);
    const alertMessage = useMemo(() => getOrderAlertMessage(order), [order]);
    const alertColor = useMemo(() => getAlertColor(order), [order]);
    const allPaid = useMemo(() => areAllParcelsPaid(sortedParcels), [sortedParcels]);

    // Carregar PIX da entrada IMEDIATAMENTE ao montar (sem delay)
    useEffect(() => {
        if (!isEntryPaidValue && entryParcel && entryParcel.status === 'payment_generated') {
            // Setar dados do PIX imediatamente (já vêm do backend)
            setEntryPixInfo({
                qrCode: entryParcel.qrCode,
                qrCodeBase64: entryParcel.qrCodeBase64,
                expiresAt: null, // Será buscado em background
            });

            // Buscar expiresAt em background (não bloqueia)
            if (entryParcel.paymentId) {
                // Obter token de autenticação
                const token = localStorage.getItem('accessToken') ||
                    sessionStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    null;

                // Usar Server Action para buscar status (nunca expõe URL da API)
                getPaymentStatusAction(
                    entryParcel.paymentId,
                    token ? { 'Authorization': `Bearer ${token}` } : {}
                )
                    .then(response => {
                        const expiresAt = response?.data?.expiresAt || null;
                        setEntryPixInfo(prev => ({
                            ...prev!,
                            expiresAt,
                        }));
                    })
                    .catch(() => {
                        // Ignorar erro - PIX sem expiração é aceitável
                    });
            }
        }
    }, [isEntryPaidValue, entryParcel]);

    // Handler para gerar PIX de uma parcela
    const handleGenerateParcelPix = useCallback(
        async (parcel: ParcelSummary) => {
            try {
                setGeneratingPixParcelId(parcel._id);
                setParcelError(null);

                console.log('[ParcelledOrderCard] Gerando PIX da parcela', {
                    orderId: order._id,
                    parcelId: parcel._id,
                    sequence: parcel.sequence,
                });

                // Obter token de autenticação
                const token = localStorage.getItem('accessToken') ||
                    sessionStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    null;

                // Usar Server Action para gerar pagamento da parcela (nunca expõe URL da API)
                const response = await generateParcelPaymentAction(
                    order._id,
                    parcel._id,
                    token ? { 'Authorization': `Bearer ${token}` } : {}
                );

                console.log('[ParcelledOrderCard] Resposta do generate-payment', {
                    success: response?.success,
                    hasPixPayment: !!response?.data?.pixPayment,
                });

                const pixData = response?.data?.pixPayment;

                // Se for entrada, atualizar entryPixInfo
                if (parcel.sequence === 0) {
                    setEntryPixInfo({
                        qrCode: pixData?.qrCode || pixData?.ticketUrl || null,
                        qrCodeBase64: pixData?.qrCodeBase64 || null,
                        expiresAt: pixData?.expiresAt || null,
                    });
                } else {
                    // Para outras parcelas, armazenar no parcelPixInfo
                    setParcelPixInfo(prev => ({
                        ...prev,
                        [parcel._id]: {
                            qrCode: pixData?.qrCode || pixData?.ticketUrl || null,
                            qrCodeBase64: pixData?.qrCodeBase64 || null,
                            expiresAt: pixData?.expiresAt || null,
                        }
                    }));
                }

                console.log('[ParcelledOrderCard] PIX gerado com sucesso', {
                    parcelId: parcel._id,
                    hasQrCode: !!pixData?.qrCode,
                    hasQrCodeBase64: !!pixData?.qrCodeBase64,
                });
            } catch (error: any) {
                const errorMessage =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Erro ao gerar pagamento PIX desta parcela.';

                setParcelError({
                    parcelId: parcel._id,
                    message: errorMessage,
                });
            } finally {
                setGeneratingPixParcelId(null);
            }
        },
        [order._id],
    );

    // Expandir (PIX já foi carregado no mount)
    const handleToggleExpand = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const alertColorClasses = {
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-rose-200 bg-rose-50 text-rose-700',
        blue: 'border-sky-200 bg-sky-50 text-sky-700',
    };

    return (
        <article className="rounded-2xl border border-[#ded7ca] bg-white/80 p-6 transition">
            <header>
                <button
                    type="button"
                    onClick={handleToggleExpand}
                    className="flex w-full flex-col gap-4 text-left transition hover:text-[#1a1a1d] md:flex-row md:items-center md:justify-between"
                >
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                            Pedido Parcelado {order.orderNumber ? `#${order.orderNumber}` : ''}
                        </span>
                        <h3 className="text-lg leading-none font-semibold uppercase tracking-normal text-[#1a1a1d]">
                            {eventName}
                        </h3>
                        <p className="text-xs text-[#7d796c]">Criado em {createdAt}</p>
                    </div>
                    <div className="flex items-center gap-10">
                        <HiOutlineChevronDown
                            className={`hidden md:block text-xl text-[#a38f78] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                                }`}
                            aria-hidden
                        />
                    </div>
                </button>
            </header>

            {/* Botão para expandir */}
            <div className="md:mt-6 flex">
                <button
                    type="button"
                    onClick={handleToggleExpand}
                    className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#fff7ec] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#f97316] transition hover:bg-[#f97316]/20 hover:text-white"
                >
                    {isExpanded ? 'Recolher detalhes' : 'Ver detalhes'}
                </button>
            </div>

            {/* Conteúdo expandido */}
            <div
                className={`transition-all duration-500 ${isExpanded
                        ? 'pt-6 opacity-100'
                        : 'pointer-events-none max-h-0 opacity-0 overflow-hidden'
                    }`}
            >
                {/* Barra de progresso */}
                <div className="mb-6">
                    <ParcelProgressBar parcels={sortedParcels} />
                </div>

                {/* Alerta */}
                {alertMessage && (
                    <div
                        className={`mb-6 rounded-xl border p-4 text-sm font-medium ${alertColorClasses[alertColor]}`}
                    >
                        {alertMessage}
                    </div>
                )}

                {/* Seção de PIX pendente (se entrada não paga E tem PIX) */}
                {!isEntryPaidValue && entryParcel && entryPixInfo && (entryPixInfo.qrCode || entryPixInfo.qrCodeBase64) && (
                    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="mb-3 flex justify-center items-center gap-2">
                            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                Pagamento PIX da Entrada
                            </span>
                        </div>

                        {entryPixInfo.expiresAt && (
                            <div className="mb-3">
                                <PixExpirationTimer expiresAt={entryPixInfo.expiresAt} />
                            </div>
                        )}

                        {entryPixInfo.qrCodeBase64 && (
                            <div className="mb-4 flex justify-center">
                                <img
                                    src={`data:image/png;base64,${entryPixInfo.qrCodeBase64}`}
                                    alt="QR Code PIX Entrada"
                                    className="h-48 w-48 rounded-lg border-2 border-emerald-200 bg-white p-2"
                                />
                            </div>
                        )}

                        {entryPixInfo.qrCode && (
                            <div className="mb-3">
                                <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                    Código PIX (Copiar e Colar)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={entryPixInfo.qrCode}
                                        className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-[#1a1a1d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onPixCodeCopy(`entry-${order._id}`, entryPixInfo.qrCode!)}
                                        className="rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-200"
                                    >
                                        {pixCodeCopied[`entry-${order._id}`] ? '✓ Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mensagem de aguardando pagamento */}
                        <div className="text-center">
                            <p className="text-sm font-medium text-emerald-700">
                                💳 Aguardando pagamento
                            </p>
                            <p className="text-xs text-emerald-600 mt-1">
                                Pague a entrada para efetivar seu pedido e liberar as demais parcelas.
                            </p>
                        </div>
                    </div>
                )}

                {/* Lista simplificada de parcelas */}
                <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                        Parcelas ({sortedParcels.length})
                    </span>
                    {sortedParcels
                        .filter((parcel) => {
                            // Se entrada não paga, mostrar APENAS a entrada
                            if (!isEntryPaidValue) {
                                return parcel.sequence === 0;
                            }
                            // Se entrada paga, mostrar todas
                            return true;
                        })
                        .map((parcel) => {
                            const parcelLabel = getParcelLabel(parcel, sortedParcels.length);
                            const dueLabel = formatDate(parcel.dueDate);
                            const isEntry = parcel.sequence === 0;
                            const entryHasPix = isEntry && entryPixInfo && (entryPixInfo.qrCode || entryPixInfo.qrCodeBase64);

                            // Mostrar botão "Gerar PIX" se:
                            // 1. Não for entrada com PIX já mostrado acima
                            // 2. Status seja 'pending' OU 'payment_generated' (PIX gerado mas ainda não vencido)
                            // 3. Entrada esteja paga (se não for a própria entrada)
                            const canShowButton = !entryHasPix &&
                                (parcel.status === 'pending' || parcel.status === 'payment_generated') &&
                                (isEntry || isEntryPaidValue);

                            return (
                                <div key={parcel._id} className="rounded-lg border border-[#ded7ca] bg-white p-4">
                                    {/* Layout mobile: informações verticais */}
                                    <div className="flex flex-col gap-3">
                                        {/* Cabeçalho: Parcela X/Y */}
                                        <p className="text-sm font-bold text-[#1a1a1d]">
                                            {parcelLabel}
                                        </p>
                                        
                                        {/* Valor */}
                                        <p className="text-lg font-bold text-[#1a1a1d]">
                                            {currencyFormatter.format(parcel.amount)}
                                        </p>
                                        
                                        {/* Vencimento */}
                                        <p className="text-xs text-[#6a6760]">
                                            Venc: {dueLabel}
                                        </p>
                                        
                                        {/* Status e Botão */}
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-2 mt-1 w-full md:w-auto">
                                            {/* Badge de status da parcela */}
                                            {parcel.status === 'paid' ? (
                                                <ParcelStatusBadge status="paid" size="sm" />
                                            ) : parcel.status === 'overdue' ? (
                                                <ParcelStatusBadge status="overdue" size="sm" />
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-400/30 bg-gray-400/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-normal text-gray-600">
                                                    <span>📅</span>
                                                    <span>Aguardando Pagamento</span>
                                                </span>
                                            )}

                                            {/* Botão "GERAR PIX" apenas para parcelas pendentes */}
                                            {canShowButton && (
                                                <button
                                                    type="button"
                                                    disabled={generatingPixParcelId === parcel._id}
                                                    onClick={() => handleGenerateParcelPix(parcel)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a1a1d] px-6 py-2.5 text-sm font-bold uppercase tracking-normal text-white shadow-sm transition hover:bg-[#f97316] disabled:cursor-not-allowed disabled:opacity-60 w-full md:w-auto"
                                                >
                                                    {generatingPixParcelId === parcel._id ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Gerando...
                                                        </>
                                                    ) : (
                                                        'Gerar Pix dessa Parcela'
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mensagem de erro */}
                                    {parcelError && parcelError.parcelId === parcel._id && (
                                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-xs font-semibold text-red-800 flex-1">
                                                    {parcelError.message}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setParcelError(null)}
                                                    className="text-red-600 hover:text-red-800 transition flex-shrink-0"
                                                    aria-label="Fechar erro"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* PIX gerado da parcela (não entrada) */}
                                    {!isEntry && parcelPixInfo[parcel._id] && (parcelPixInfo[parcel._id].qrCode || parcelPixInfo[parcel._id].qrCodeBase64) && (
                                        <div className="mt-3 pt-3 border-t border-emerald-200 rounded-lg bg-emerald-50/30 p-3">
                                            <div className="mb-2 flex items-center gap-2">
                                                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                                    PIX para Pagamento desta Parcela
                                                </span>
                                            </div>

                                            {parcelPixInfo[parcel._id].expiresAt && (
                                                <div className="mb-2">
                                                    <PixExpirationTimer expiresAt={parcelPixInfo[parcel._id].expiresAt!} />
                                                </div>
                                            )}

                                            {parcelPixInfo[parcel._id].qrCodeBase64 && (
                                                <div className="mb-3 flex justify-center">
                                                    <img
                                                        src={`data:image/png;base64,${parcelPixInfo[parcel._id].qrCodeBase64}`}
                                                        alt="QR Code PIX Parcela"
                                                        className="h-40 w-40 rounded-lg border-2 border-emerald-200 bg-white p-2"
                                                    />
                                                </div>
                                            )}

                                            {parcelPixInfo[parcel._id].qrCode && (
                                                <div>
                                                    <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-normal text-emerald-800">
                                                        Código PIX (Copiar e Colar)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={parcelPixInfo[parcel._id].qrCode!}
                                                            className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-[#1a1a1d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => onPixCodeCopy(`parcel-${parcel._id}`, parcelPixInfo[parcel._id].qrCode!)}
                                                            className="rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-200"
                                                        >
                                                            {pixCodeCopied[`parcel-${parcel._id}`] ? '✓ Copiado!' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-2 text-center">
                                                <p className="text-xs text-emerald-600">
                                                    💳 Aguardando pagamento da parcela
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>

                {/* Box de ingressos padronizado (igual aos pedidos normais) */}
                {onViewTickets && order.tickets && order.tickets.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-[#ded7ca] bg-white/70 p-4">
                        <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">
                            Ingressos
                        </span>
                        <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">
                            {order.tickets.length}x
                        </p>
                        <p className="mt-1 text-xs font-medium tracking-normal text-[#6a6760]">
                            {order.tickets.filter((t: any) => t.status === 'confirmed').length} confirmados
                        </p>

                        <button
                            type="button"
                            onClick={() => onViewTickets(order._id)}
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
}
