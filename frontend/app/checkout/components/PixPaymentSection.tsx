'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { HiOutlineClipboardDocument } from 'react-icons/hi2';
import type { PixPaymentResult } from '../types';

type PixPaymentSectionProps = {
    pixResult: PixPaymentResult | null;
    pixExpirationDescription: string;
    pixGenerationDeadlineMinutes: number;
    isCheckoutReady: boolean;
    isProcessing: boolean;
    pixPaymentActive: boolean;
    pixCopySuccess: boolean;
    onCopyCode: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pixStatus: 'idle' | 'processing' | 'success' | 'error';
    pixStatusMessage: string;
    redirectCountdown: number | null;
    onNavigateToOrders: () => void;
};

export function PixPaymentSection({
    pixResult,
    pixExpirationDescription,
    pixGenerationDeadlineMinutes,
    isCheckoutReady,
    isProcessing,
    pixPaymentActive,
    pixCopySuccess,
    onCopyCode,
    onSubmit,
    pixStatus,
    pixStatusMessage,
    redirectCountdown,
    onNavigateToOrders,
}: PixPaymentSectionProps) {
    const showOverlay = pixStatus === 'success';
    const [overlayMounted, setOverlayMounted] = useState(false);
    const [overlayEntering, setOverlayEntering] = useState(false);

    useEffect(() => {
        if (showOverlay) {
            setOverlayMounted(true);
            const frame = requestAnimationFrame(() => setOverlayEntering(true));
            return () => cancelAnimationFrame(frame);
        }
        setOverlayEntering(false);
        const timeout = setTimeout(() => {
            setOverlayMounted(false);
        }, 250);
        return () => clearTimeout(timeout);
    }, [showOverlay]);

    const overlayActiveClass = overlayEntering
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 translate-y-3 pointer-events-none';
    return (
        <div className="relative">
            {overlayMounted ? (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-all duration-300 ${overlayActiveClass}`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget && pixStatus === 'success') {
                            onNavigateToOrders();
                        }
                    }}
                >
                    <div className="relative w-full max-w-md rounded-3xl border border-[#b6f0d2] bg-[#f1fff6] p-8 shadow-2xl">
                        {pixStatus === 'success' ? (
                            <div className="flex w-full max-w-md flex-col items-center gap-6">
                                <div className="w-full px-6 py-6 text-center text-sm leading-relaxed text-[#1f5d3d]">
                                    <h1 className="text-2xl font-bold uppercase text-[#1f5d3d]">
                                        Pagamento aprovado
                                    </h1>
                                    <div className="mt-4 space-y-2 text-sm leading-relaxed">
                                        <p className="leading-relaxed">{pixStatusMessage}</p>
                                    </div>
                                    {redirectCountdown !== null ? (
                                        <p className="mt-4 text-sm font-semibold text-[#2b6b47]">
                                            Redirecionaremos você em {redirectCountdown}s para ver seus pedidos.
                                        </p>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={onNavigateToOrders}
                                    className="rounded-full bg-[#1a1a1d] px-6 py-3 text-[0.65rem] font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                                >
                                    Ver meus pedidos
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                {!pixResult ? (
                    <>
                        <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-sm text-[#4c4c55]">
                            Gere um QR Code instantâneo via Mercado Pago. O pagamento deve ser efetuado em até{' '}
                            {pixGenerationDeadlineMinutes} minutos.
                        </div>

                        <button
                            type="submit"
                            disabled={!isCheckoutReady || isProcessing || pixPaymentActive}
                            className="flex w-full items-center justify-center gap-3 rounded-full border border-[#a38f78] px-6 py-4 text-xs font-semibold uppercase text-[#a38f78] transition hover:border-[#f97316] hover:text-[#f97316] disabled:cursor-not-allowed disabled:border-[#c9c3b8] disabled:text-[#c9c3b8]"
                        >
                            {isProcessing ? 'Gerando PIX…' : 'Garantir meu Ingresso via Vip'}
                        </button>
                    </>
                ) : null}

                {pixResult ? (
                    <div className="space-y-4 rounded-2xl border border-[#ded7ca] bg-white p-5">
                        <div className="rounded-2xl text-center md:text-left border border-[#b6f0d2] bg-[#f1fff6] px-4 py-3 text-sm text-[#1f5d3d]">
                            <p className="font-semibold">Seu pedido está criado e aguardando pagamento via PIX.</p>
                            {pixExpirationDescription ? (
                                <p className="mt-1 text-xs text-[#2b6b47]">{pixExpirationDescription}</p>
                            ) : (
                                <p className="mt-1 text-xs text-[#2b6b47]">O QR Code expira em 30 minutos.</p>
                            )}
                        </div>
                        <div className="flex items-center text-center md:text-left md:flex-row flex-col gap-3">
                            <div className="flex h-10 w-10 md:h-10 md:w-10 items-center justify-center rounded-full bg-[#f5f1e8] text-[#a38f78]">
                                <HiOutlineClipboardDocument className="text-xl" />
                            </div>
                            <div>
                                <p className="pb-3 md:pb-0 text-sm font-semibold text-[#1a1a1d]">
                                    Escaneie o QR Code <br /> ou copie o código PIX abaixo.
                                </p>
                                <p className="text-xs text-[#7d796c]">O pagamento é processado pelo Mercado Pago.</p>
                            </div>
                        </div>

                        {pixResult.qrCodeBase64 ? (
                            <img
                                src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                                alt="QR Code PIX"
                                className="mx-auto md:h-48 md:w-48 h-full w-full rounded-2xl border border-[#ded7ca] bg-white p-3"
                            />
                        ) : null}

                        {pixResult.ticketUrl ? (
                            <div className="text-center md:text-left space-y-3 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3">
                                <p className="text-center md:text-left text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Código copia e cola</p>
                                <p className="mt-2 break-all text-sm text-[#1a1a1d]">{pixResult.ticketUrl}</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                        onClick={onCopyCode}
                                    >
                                        Copiar código
                                    </button>
                                    {pixCopySuccess ? (
                                        <span className=" w-full  rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-center text-emerald-700">
                                            Código copiado!
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </form>
        </div>
    );
}

