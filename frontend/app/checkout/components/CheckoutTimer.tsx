'use client';

import { useCheckoutTimer } from '../hooks/useCheckoutTimer';

interface CheckoutTimerProps {
    isActive: boolean;
    onExpire?: () => void;
    initialRemainingSeconds?: number | null;
    expiresAt?: string | Date | null; // Data de expiração do pedido
}

export function CheckoutTimer({ isActive, onExpire, initialRemainingSeconds, expiresAt }: CheckoutTimerProps) {
    const timer = useCheckoutTimer(isActive, onExpire, initialRemainingSeconds, expiresAt);

    // Mostrar timer mesmo se não está ativo mas tem tempo restante (durante loading)
    if (!isActive && timer.timeRemaining === 0) {
        return null;
    }

    return (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex  items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Tempo restante para finalizar</p>
                        <p className="text-xs text-amber-700">Sua reserva será cancelada automaticamente</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className={`text-2xl font-bold ${
                            timer.minutes < 2
                                ? 'text-rose-600'
                                : timer.minutes < 5
                                  ? 'text-amber-600'
                                  : 'text-amber-700'
                        }`}
                    >
                        {String(timer.minutes).padStart(2, '0')}:{String(timer.seconds).padStart(2, '0')}
                    </div>
                </div>
            </div>
            {/* Barra de progresso */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                <div
                    className={`h-full transition-all duration-1000 ${
                        timer.percentageRemaining < 20
                            ? 'bg-rose-500'
                            : timer.percentageRemaining < 50
                              ? 'bg-amber-500'
                              : 'bg-amber-400'
                    }`}
                    style={{ width: `${timer.percentageRemaining}%` }}
                />
            </div>
        </div>
    );
}

