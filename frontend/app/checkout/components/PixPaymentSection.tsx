'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { HiOutlineClipboardDocument, HiOutlineTicket } from 'react-icons/hi2';
import type { PixPaymentResult } from '../types';
import PaymentSuccessModal from '@/components/shared/PaymentSuccessModal';

// Componente para exibir timer de expiração do PIX
function PixExpirationTimer({ expiresAt }: { expiresAt: string }) {
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const expirationDate = new Date(expiresAt);
            const now = new Date();
            const diff = expirationDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining(0);
                setIsExpired(true);
                return;
            }

            setIsExpired(false);
            setTimeRemaining(Math.floor(diff / 1000)); // segundos restantes
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    if (timeRemaining === null) {
        return (
            <p className="text-xs text-emerald-600">
                ⏰ Carregando tempo restante...
            </p>
        );
    }

    if (isExpired || timeRemaining <= 0) {
        return (
            <p className="text-xs font-semibold text-red-600">
                ⚠️ Código PIX expirado
            </p>
        );
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;

    return (
        <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2">
            <p className="text-xs text-center font-semibold text-emerald-800">
                ⏰ Você tem:{' '}
                {hours > 0 && (
                    <span className="text-emerald-900">
                        {hours}h {displayMinutes.toString().padStart(2, '0')}min {seconds.toString().padStart(2, '0')}s
                    </span>
                )}
                {hours === 0 && (
                    <span className="text-emerald-900">
                        {displayMinutes}min {seconds.toString().padStart(2, '0')}s
                    </span>
                )}
                {' '}para pagar
            </p>
        </div>
    );
}

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
    orderNumber?: string;
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
    orderNumber,
}: PixPaymentSectionProps) {
    // Scroll para o topo quando o PIX for gerado (especialmente no mobile)
    useEffect(() => {
        if (pixResult) {
            // Pequeno delay para garantir que o DOM foi atualizado
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    }, [pixResult]);

    return (
        <div className="relative">
            {/* Modal padronizada de sucesso */}
            <PaymentSuccessModal
                isOpen={pixStatus === 'success'}
                onClose={onNavigateToOrders}
                orderNumber={orderNumber}
                message={pixStatusMessage || 'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.'}
                redirectCountdown={redirectCountdown}
            />
            <form className="mt-0 space-y-4" onSubmit={onSubmit}>
                {!pixResult ? (
                    <>
                        <div className="text-center mt-4 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-sm text-[#4c4c55]">
                            Gere um QR Code instantâneo via Mercado Pago. <br className='hidden md:block' />O pagamento deve ser efetuado em até{' '}
                            {pixGenerationDeadlineMinutes} minutos.
                        </div>

                        <button
                            type="submit"
                            disabled={!isCheckoutReady || isProcessing || pixPaymentActive}
                            className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-[#32BCAD] bg-[#32BCAD] px-6 py-4 text-xs font-semibold uppercase text-white transition hover:border-[#2a9d8f] hover:bg-[#2a9d8f] disabled:cursor-not-allowed disabled:border-[#c9c3b8] disabled:bg-[#c9c3b8] disabled:text-white/60"
                        >
                            <HiOutlineTicket className="text-base" />
                            {isProcessing ? 'Gerando PIX…' : 'Garantir meu Ingresso via PIX'}
                        </button>
                    </>
                ) : null}

                {pixResult ? (
                    <div className="space-y-4 rounded-2xl border border-[#ded7ca] bg-white p-5">
                        {/* Topo: Ícone + Instruções */}
                        <div className="flex items-center text-center flex-col gap-3">
                            <div className="flex h-10 w-10 md:h-10 md:w-10 items-center justify-center rounded-full bg-[#f5f1e8] text-[#a38f78]">
                                <HiOutlineClipboardDocument className="text-xl" />
                            </div>
                            <div>
                                <p className="pb-3 md:pb-0 text-sm font-semibold text-[#1a1a1d]">
                                    Escaneie o QR Code ou copie o código PIX abaixo.
                                </p>
                                <p className="text-xs text-[#7d796c]">O pagamento é processado pelo Mercado Pago.</p>
                            </div>
                        </div>

                        {/* QR Code e Código copia-e-cola */}
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            <div className="flex-1 flex justify-center">
                                {pixResult.qrCodeBase64 ? (
                                    <img
                                        src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                                        alt="QR Code PIX"
                                        className="mx-auto flex-1 rounded-2xl border border-[#ded7ca] bg-white p-3"
                                    />
                                ) : null}
                            </div>

                            {pixResult.ticketUrl ? (
                                <div className="flex-1 flex items-center flex-col justify-center text-center space-y-3 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3">
                                    <p className="text-center text-xs  font-semibold uppercase tracking-normal text-[#7d796c]">
                                        Código copia e cola
                                    </p>
                                    <p className="mt-2 break-all  text-center text-sm text-[#1a1a1d]">{pixResult.ticketUrl}</p>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col w-full items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                className="inline-flex w-full items-center justify-center rounded-full border border-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                onClick={onCopyCode}
                            >
                                Copiar código
                            </button>
                            {pixCopySuccess ? (
                                <span className="w-full rounded-full border border-emerald-200 bg-emerald-50 px-6 py-3 text-xs font-semibold uppercase tracking-normal text-center text-emerald-700">
                                    Código copiado!
                                </span>
                            ) : null}
                        </div>

                            {/* Box verde de status - movido para baixo */}
                            {pixStatus !== 'success' && pixStatus !== 'error' ? (
                                <>
                                    <div className="flex items-center gap-3 flex-col text-center rounded-2xl border border-[#b6f0d2] bg-[#f1fff6] px-4 py-3">
                                        <div className="flex-shrink-0">
                                            <div className="relative h-5 w-5">
                                                <div className="absolute inset-0 animate-spin rounded-full border-2 border-[#1f5d3d] border-t-transparent"></div>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#1f5d3d]">
                                                Seu pedido está criado e aguardando pagamento via PIX. <br />
                                                {pixExpirationDescription ? (
                                                    <span className="font-normal">
                                                        {' '}(Pagar até: {pixExpirationDescription.replace('Você pode pagar até: ', '')})
                                                    </span>
                                                ) : null}
                                            </p>
                                            <p className="mt-1 text-xs text-[#2b6b47]">Atualizado em tempo real...</p>
                                        </div>
                                    </div>
                                    {/* Timer de expiração dinâmico - abaixo do box verde */}
                                    {pixResult.expiresAt && (
                                        <div className="mt-2">
                                            <PixExpirationTimer expiresAt={pixResult.expiresAt} />
                                        </div>
                                    )}
                                </>
                            ) : null}
                    </div>
                ) : null}
            </form>
        </div>
    );
}

