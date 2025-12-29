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
    countUnpaidParcels,
    isEntryPixExpired,
} from '../../utils/parcelHelpers';
import type { ParcelledOrderWithParcels, ParcelSummary } from '../../types/parcelled';

interface ParcelledOrderCardProps {
    order: ParcelledOrderWithParcels;
    currencyFormatter: Intl.NumberFormat;
    formatDate: (date?: string) => string;
    onPixCodeCopy: (key: string, code: string) => Promise<void>;
    pixCodeCopied: Record<string, boolean>;
    onViewTickets?: (orderId: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: (orderId: string) => void;
}

export default function ParcelledOrderCard({
    order,
    currencyFormatter,
    formatDate,
    onPixCodeCopy,
    pixCodeCopied,
    onViewTickets,
    isExpanded: isExpandedProp,
    onToggleExpand,
}: ParcelledOrderCardProps) {
    // Se receber props de expansão, usar controle externo; caso contrário, usar estado interno
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = isExpandedProp !== undefined ? isExpandedProp : internalExpanded;
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
    
    // Calcular quantas parcelas faltam pagar
    const unpaidParcelsCount = useMemo(() => countUnpaidParcels(sortedParcels), [sortedParcels]);
    
    // Status descritivo para exibição
    const statusLabel = useMemo(() => {
        if (!isEntryPaidValue) {
            return 'Entrada pendente';
        }
        if (allPaid) {
            return 'Pago';
        }
        // Gramática correta: singular "Falta 1 parcela" vs plural "Faltam X parcelas"
        if (unpaidParcelsCount === 1) {
            return 'Falta 1 parcela';
        }
        return `Faltam ${unpaidParcelsCount} parcelas`;
    }, [isEntryPaidValue, allPaid, unpaidParcelsCount]);

    // Estado para controlar se o PIX expirou (atualizado em tempo real)
    const [isPixExpired, setIsPixExpired] = useState(false);

    // Verificar continuamente se o PIX expirou e limpar entryPixInfo se expirar
    // IMPORTANTE: Não limpar quando expiresAt é null (ainda carregando), apenas quando realmente expirou
    useEffect(() => {
        if (!entryPixInfo) {
            setIsPixExpired(false);
            return;
        }

        // Se não tem expiresAt ainda, não verificar expiração (ainda carregando em background)
        if (!entryPixInfo.expiresAt) {
            setIsPixExpired(false);
            return;
        }

        const checkExpiration = () => {
            const expirationDate = new Date(entryPixInfo.expiresAt!);
            const now = new Date();
            const expired = now.getTime() >= expirationDate.getTime();
            
            if (expired) {
                setIsPixExpired(true);
                // Limpar entryPixInfo quando expirar para garantir que o box não apareça
                setEntryPixInfo(null);
            } else {
                setIsPixExpired(false);
            }
        };

        // Verificar imediatamente
        checkExpiration();

        // Verificar a cada segundo para atualizar em tempo real
        const interval = setInterval(checkExpiration, 1000);

        return () => clearInterval(interval);
    }, [entryPixInfo?.expiresAt]);

    // Carregar PIX da entrada IMEDIATAMENTE (sem delay)
    // Mostrar box instantaneamente com dados disponíveis, buscar expiresAt em background
    useEffect(() => {
        if (!isEntryPaidValue && entryParcel && entryParcel.status === 'payment_generated') {
            // Verificar se tem QR code disponível para mostrar imediatamente
            const hasQrCode = entryParcel.qrCode || entryParcel.qrCodeBase64;
            
            if (hasQrCode) {
                // MOSTRAR IMEDIATAMENTE com dados disponíveis (sem esperar expiresAt)
                setEntryPixInfo({
                    qrCode: entryParcel.qrCode || null,
                    qrCodeBase64: entryParcel.qrCodeBase64 || null,
                    expiresAt: null, // Será atualizado em background
                });
                
                // Buscar expiresAt em background (não bloqueia a exibição)
                if (entryParcel.paymentId) {
                    const fetchExpiresAt = async () => {
                        try {
                            const token = localStorage.getItem('accessToken') ||
                                sessionStorage.getItem('accessToken') ||
                                localStorage.getItem('token') ||
                                null;

                            const response = await getPaymentStatusAction(
                                entryParcel.paymentId!,
                                token ? { 'Authorization': `Bearer ${token}` } : {}
                            );
                            const expiresAt = response?.data?.expiresAt || null;

                            // Atualizar expiresAt quando chegar
                            if (expiresAt) {
                                const expirationDate = new Date(expiresAt);
                                const now = new Date();
                                
                                // Se expirou, esconder o box
                                if (now.getTime() >= expirationDate.getTime()) {
                                    setEntryPixInfo(null);
                                    setIsPixExpired(true);
                                    return;
                                }
                                
                                // Atualizar com expiresAt válido
                                setEntryPixInfo(prev => prev ? {
                                    ...prev,
                                    expiresAt,
                                } : null);
                            }
                        } catch {
                            // Se der erro, manter o box visível (já está mostrando)
                            // Não limpar porque já temos os dados do QR code
                        }
                    };
                    
                    // Buscar em background (não bloqueia)
                    fetchExpiresAt();
                }
            } else {
                // Se não tem QR code, não mostrar o box
                setEntryPixInfo(null);
            }
        } else if (isEntryPaidValue || !entryParcel || entryParcel.status !== 'payment_generated') {
            // Limpar se entrada foi paga ou não tem mais PIX
            setEntryPixInfo(null);
        }
    }, [isEntryPaidValue, entryParcel]);

    // Handler para gerar PIX de uma parcela
    const handleGenerateParcelPix = useCallback(
        async (parcel: ParcelSummary) => {
            try {
                setGeneratingPixParcelId(parcel._id);
                setParcelError(null);

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
        if (onToggleExpand) {
            // Controle externo: notificar o componente pai
            onToggleExpand(order._id);
        } else {
            // Controle interno: usar estado local
            setInternalExpanded((prev) => !prev);
        }
    }, [onToggleExpand, order._id]);

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
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-10 w-full md:w-auto">
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <p className="text-black">
                                Seu pedido foi:
                                <span>
                                    {' '}
                                    {currencyFormatter.format(order.totalAmount ?? 0)}
                                </span>
                            </p>
                            <span
                                className={`flex w-fit items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-normal ${
                                    !isEntryPaidValue
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : allPaid
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                            >
                                {statusLabel}
                            </span>
                        </div>
                        <HiOutlineChevronDown
                            className={`hidden md:block text-xl text-[#a38f78] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                                }`}
                            aria-hidden
                        />
                    </div>
                </button>
            </header>

            {/* Botão para expandir (apenas mobile) */}
            <div className="mt-4 flex md:hidden">
                <button
                    type="button"
                    onClick={handleToggleExpand}
                    className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1d]/20 bg-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:border-[#f97316]"
                >
                    {isExpanded ? 'Recolher pedido' : 'Expandir pedido'}
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
                        className={`mb-6 rounded-xl border p-4 text-center text-sm font-medium ${alertColorClasses[alertColor]}`}
                    >
                        {alertMessage}
                    </div>
                )}

                {/* Seção de PIX pendente (se entrada não paga E tem PIX E não expirou) */}
                {/* Mostrar se: entrada não paga, tem PIX info, tem QR code, e não expirou */}
                {/* expiresAt pode ser null inicialmente (será carregado em background) */}
                {!isEntryPaidValue && 
                 entryParcel && 
                 entryPixInfo && 
                 (entryPixInfo.qrCode || entryPixInfo.qrCodeBase64) && 
                 !isPixExpired && (
                    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 md:p-4">
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
                                <div className="flex flex-col md:flex-row gap-2">
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
                            <p className="text-[0.7rem] md:text-sm font-medium text-emerald-700 mb-1">
                                💳 Aguardando pagamento
                            </p>
                            <p className="text-[0.65rem] md:text-xs text-emerald-600 leading-snug">
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
                            // 4. Se for entrada, PIX não pode ter expirado (verificar pelo pedido)
                            //    A função isEntryPixExpired já verifica se passou 30min desde criação
                            const pixExpired = isEntryPixExpired(order);
                            const canShowButton = !entryHasPix &&
                                (parcel.status === 'pending' || parcel.status === 'payment_generated') &&
                                (isEntry || isEntryPaidValue) &&
                                (!isEntry || !pixExpired); // Se for entrada, PIX não pode ter expirado

                            return (
                                <div key={parcel._id} className="rounded-lg border border-[#ded7ca] bg-white p-4">
                                    {/* Layout: Parcela, Valor/Vencimento e Botão na mesma linha */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                        {/* Esquerda: Parcela com Valor e Vencimento */}
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 flex-1">
                                            <p className="text-sm font-semibold text-[#1a1a1d]">
                                                {parcelLabel}
                                            </p>
                                            <p className="text-base md:text-lg text-[#1a1a1d] leading-tight">
                                                <span className="font-bold">{currencyFormatter.format(parcel.amount)}</span>
                                                <span className="font-normal text-[#6a6760]"> - Venc: {dueLabel}</span>
                                            </p>
                                        </div>
                                        
                                        {/* Direita: Status (se pago) ou Botão Gerar PIX */}
                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                            {/* Badge de status apenas se pago ou atrasado */}
                                            {parcel.status === 'paid' ? (
                                                <ParcelStatusBadge status="paid" size="sm" />
                                            ) : parcel.status === 'overdue' ? (
                                                <ParcelStatusBadge status="overdue" size="sm" />
                                            ) : null}

                                            {/* Botão "GERAR PIX" apenas para parcelas pendentes (sem badge de aguardando) */}
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
                                            <div className="mb-3 flex text-center justify-center items-center gap-2">
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
                                                    <div className="flex gap-2 flex-col md:flex-row">
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
