'use client';

import { useEffect, useState, useMemo } from 'react';
import type { CheckoutOrder } from '../hooks/useCheckoutOrder';

interface OrderExitWarningModalProps {
    order: CheckoutOrder;
    onStay: () => void; // Ficar na página
    onLeave: () => void; // Sair mesmo assim
}

/**
 * Modal que aparece quando usuário tenta sair do checkout com pedido PENDING ativo
 * REFATORADO: Substitui a modal de reserva - agora avisa sobre cancelamento de pedido
 */
export function OrderExitWarningModal({ order, onStay, onLeave }: OrderExitWarningModalProps) {
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    // Calcular tempo restante do pedido
    const expiresAtDate = useMemo(() => {
        if (!order.expiresAt) return null;
        return typeof order.expiresAt === 'string' ? new Date(order.expiresAt) : order.expiresAt;
    }, [order.expiresAt]);

    useEffect(() => {
        if (!expiresAtDate) {
            setTimeRemaining(0);
            return;
        }

        const updateTime = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiresAtDate.getTime() - now) / 1000));
            setTimeRemaining(remaining);
        };

        // Atualizar imediatamente
        updateTime();

        // Atualizar contador a cada segundo
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [expiresAtDate]);

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-3xl border-2 border-rose-200 bg-rose-50/95 p-8 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in">
                <div className="flex md:flex-row flex-col md:items-start md:justify-between gap-4 mb-6">
                    <div className="flex-shrink-0">
                        <svg
                            className="h-8 w-8 text-rose-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold uppercase tracking-wide text-rose-900 mb-2">
                            Atenção! Pedido em andamento
                        </h3>
                        <p className="text-sm text-rose-800 leading-relaxed mb-4">
                            Você tem um pedido pendente de pagamento{' '}
                            <span className="font-semibold">({order.orderNumber})</span> que será{' '}
                            <span className="font-bold text-rose-900">cancelado automaticamente</span> se você sair desta página.
                        </p>
                        <div className="rounded-xl border border-rose-200 bg-white/50 p-3 text-xs text-rose-700 mb-4">
                            <p className="font-semibold mb-1">⚠️ Importante:</p>
                            <p>
                                Seu pedido expira em{' '}
                                <span className="font-bold">
                                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                </span>
                                . Ao sair, os ingressos voltarão para o estoque e poderão ser comprados por outras pessoas.
                            </p>
                        </div>
                        <p className="text-xs text-rose-600 italic">
                            Deseja realmente sair e cancelar seu pedido?
                        </p>
                    </div>
                </div>

                <div className="flex md:flex-row flex-col md:justify-end gap-3">
                    <button
                        type="button"
                        onClick={onLeave}
                        className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-rose-700 bg-white border-2 border-rose-200 rounded-full hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
                    >
                        Sair mesmo assim
                    </button>
                    <button
                        type="button"
                        onClick={onStay}
                        className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white bg-rose-600 rounded-full hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 shadow-lg transition-colors"
                    >
                        Continuar pedido
                    </button>
                </div>
            </div>
        </div>
    );
}

