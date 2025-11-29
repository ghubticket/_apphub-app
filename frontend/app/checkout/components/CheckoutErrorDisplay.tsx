'use client';

import React, { useMemo } from 'react';
import Container from '@/components/shared/Container';
import { CheckoutHeader } from './CheckoutHeader';

interface CheckoutErrorDisplayProps {
    error: string;
    rateLimitRemainingSeconds: number | null;
    orderLoading: boolean;
    onRetry: () => void;
    onResetRateLimit: () => void;
    onGoHome: () => void;
}

/**
 * Componente para exibir erros no checkout
 * Extraído do CheckoutLayout para melhor organização
 * OTIMIZADO: Usa React.memo e useMemo para evitar re-renders desnecessários
 */
export const CheckoutErrorDisplay = React.memo(function CheckoutErrorDisplay({
    error,
    rateLimitRemainingSeconds,
    orderLoading,
    onRetry,
    onResetRateLimit,
    onGoHome,
}: CheckoutErrorDisplayProps) {
    const isRateLimitError = useMemo(() => {
        return error.includes('Muitas tentativas') || error.includes('aguarde');
    }, [error]);

    const formatRemainingTime = useMemo(() => {
        if (rateLimitRemainingSeconds === null || rateLimitRemainingSeconds <= 0) return '';
        const mins = Math.floor(rateLimitRemainingSeconds / 60);
        const secs = rateLimitRemainingSeconds % 60;
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs}s`;
    }, [rateLimitRemainingSeconds]);

    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">
             
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
                    <p className="font-semibold">Erro ao criar pedido</p>
                    <p className="mt-2">{error}</p>
                    {isRateLimitError && rateLimitRemainingSeconds !== null && rateLimitRemainingSeconds > 0 && (
                        <div className="mt-4">
                            <p className="text-base font-medium">
                                Tempo restante: <span className="font-bold text-rose-800">{formatRemainingTime}</span>
                            </p>
                        </div>
                    )}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        {isRateLimitError ? (
                            <button
                                onClick={() => {
                                    onResetRateLimit();
                                    window.location.reload();
                                }}
                                className="rounded-lg bg-rose-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                            >
                                Recarregar página para tentar novamente
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onRetry}
                                    disabled={orderLoading}
                                    className="rounded-lg bg-rose-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {orderLoading ? 'Criando pedido...' : 'Tentar novamente'}
                                </button>
                                <button
                                    onClick={onGoHome}
                                    className="rounded-lg border border-rose-300 bg-white px-6 py-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
                                >
                                    Voltar para início
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </Container>
        </main>
    );
});

