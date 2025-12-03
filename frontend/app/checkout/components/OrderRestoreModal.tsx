'use client';

import { useEffect, useState, useMemo } from 'react';
import type { CheckoutOrder } from '../hooks/useCheckoutOrder';

interface OrderRestoreModalProps {
    order: CheckoutOrder;
    onContinue: () => void;
    onCancel: () => void;
    onClose?: () => void; // Fechar modal sem ação
}

/**
 * Modal que aparece quando usuário retorna à página e há pedido PENDING ativo
 * REFATORADO: Substitui a modal de reserva - agora mostra pedido PENDING
 */
export function OrderRestoreModal({ order, onContinue, onCancel, onClose }: OrderRestoreModalProps) {
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
            
            // Se expirou, chamar onCancel para limpar
            if (remaining === 0) {
                onCancel();
            }
        };

        // Atualizar imediatamente
        updateTime();

        // Atualizar contador a cada segundo
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [expiresAtDate, onCancel]);

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                // Fechar ao clicar fora (se onClose fornecido)
                if (e.target === e.currentTarget && onClose) {
                    onClose();
                }
            }}
        >
            <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-200 bg-amber-50/95 p-8 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in">
                <div className="flex md:flex-row flex-col md:items-start md:justify-between gap-4 mb-6">
                    <div className="flex-shrink-0">
                        <svg
                            className="h-8 w-8 text-amber-600"
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
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold uppercase tracking-wide text-amber-900 mb-2">
                            Pedido em andamento
                        </h3>
                        <p className="text-sm text-amber-800 leading-relaxed mb-4">
                            Você tem um pedido pendente de pagamento. Seu pedido{' '}
                            <span className="font-semibold">{order.orderNumber}</span> está reservado e expira em{' '}
                            <span className="font-bold text-amber-900">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </span>
                            .
                        </p>
                        <div className="rounded-xl border border-amber-200 bg-white/50 p-3 text-xs text-amber-700">
                            <p className="font-semibold mb-1">
                                Seu pedido foi restaurado com sucesso. Você pode continuar de onde parou.
                            </p>
                            <p>Se não finalizar o pagamento a tempo, ele será cancelado automaticamente.</p>
                        </div>
                    </div>
                </div>

                <div className="flex md:flex-row flex-col md:justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-amber-700 bg-white border-2 border-amber-200 rounded-full hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                    >
                        Cancelar pedido
                    </button>
                    <button
                        type="button"
                        onClick={onContinue}
                        className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white bg-amber-600 rounded-full hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 shadow-lg transition-colors"
                    >
                        Continuar pedido
                    </button>
                </div>
            </div>
        </div>
    );
}

