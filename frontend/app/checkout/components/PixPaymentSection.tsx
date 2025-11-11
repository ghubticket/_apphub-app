'use client';

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
}: PixPaymentSectionProps) {
    return (
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
                            <p className="text-xs text-[#7d796c]">O pagamento é processado pelo Mercado Pago.</p>
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
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d796c]">Código copia e cola</p>
                            <p className="mt-2 break-all text-sm text-[#1a1a1d]">{pixResult.ticketUrl}</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full border border-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                    onClick={onCopyCode}
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
    );
}

