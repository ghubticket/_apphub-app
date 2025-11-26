'use client';

import { useEffect, useState } from 'react';
import { useSessionExpiration } from '@/hooks/useSessionExpiration';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SessionExpirationModal() {
    const { sessionInfo, showWarning, isRefreshing, refreshSession, dismissWarning } = useSessionExpiration();
    const { logout } = useAuth();
    const router = useRouter();
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    useEffect(() => {
        if (!showWarning || !sessionInfo || !sessionInfo.expiresAt) {
            setTimeRemaining(0);
            return;
        }

        // Calcular tempo restante baseado na data de expiração
        const updateTime = () => {
            const expiresAtTime = new Date(sessionInfo.expiresAt!).getTime();
            const now = Date.now();
            const remaining = Math.max(0, expiresAtTime - now);
            setTimeRemaining(Math.floor(remaining / 1000));

            // Se expirou, fazer logout
            if (remaining === 0) {
                logout();
                router.push('/login');
            }
        };

        // Atualizar imediatamente
        updateTime();

        // Atualizar contador a cada segundo
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [showWarning, sessionInfo, logout, router]);

    if (!showWarning || !sessionInfo) {
        return null;
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in">
                <div className="flex items-start mb-4">
                    <div className="flex-shrink-0">
                        <svg
                            className="h-6 w-6 text-yellow-500"
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
                    <div className="ml-3 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Sua sessão está expirando
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Você será desconectado em{' '}
                            <span className="font-bold text-yellow-600">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </span>
                            . Deseja continuar conectado?
                        </p>
                    </div>
                </div>

                <div className="flex md:flex-row flex-col md:justify-end gap-3">
                    <button
                        onClick={() => {
                            dismissWarning();
                            logout();
                            router.push('/login');
                        }}
                        disabled={isRefreshing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Sair agora
                    </button>
                    <button
                        onClick={refreshSession}
                        disabled={isRefreshing}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isRefreshing ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Renovando...
                            </>
                        ) : (
                            'Continuar conectado'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

