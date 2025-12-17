'use client';

import { useEffect, useState } from 'react';

interface PixExpirationTimerProps {
    expiresAt: string;
}

export default function PixExpirationTimer({ expiresAt }: PixExpirationTimerProps) {
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
                        {hours}h {displayMinutes.toString().padStart(2, '0')}min{' '}
                        {seconds.toString().padStart(2, '0')}s
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
