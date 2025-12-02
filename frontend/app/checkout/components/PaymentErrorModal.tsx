'use client';

import { useEffect, useState } from 'react';
import { HiOutlineXCircle } from 'react-icons/hi2';

interface PaymentErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
    onCancel?: () => void;
    onStartNewOrder?: () => void;
    message?: string;
    errorDetails?: string[];
    maxAttemptsReached?: boolean;
    orderNumber?: string;
}

/**
 * Modal de erro de pagamento
 * Similar ao PaymentSuccessModal, mas para erros
 */
export default function PaymentErrorModal({
    isOpen,
    onClose,
    onRetry,
    onCancel,
    onStartNewOrder,
    message = 'Não foi possível processar o pagamento. Tente novamente.',
    errorDetails = [],
    maxAttemptsReached = false,
    orderNumber,
}: PaymentErrorModalProps) {
    const [mounted, setMounted] = useState(false);
    const [entering, setEntering] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            const frame = requestAnimationFrame(() => {
                setEntering(true);
            });
            return () => cancelAnimationFrame(frame);
        } else {
            setEntering(false);
            const timeout = setTimeout(() => {
                setMounted(false);
            }, 250);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    if (!mounted) return null;

    const activeClass = entering
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 translate-y-3 pointer-events-none';

    // Priorizar mensagem de erro do Mercado Pago ou backend
    const displayMessage = errorDetails.length > 0 ? errorDetails[0] : message;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 ${activeClass}`}
            onClick={onClose}
        >
            <div
                className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-6 p-8 text-center">
                    {/* Ícone de erro */}
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500">
                        <HiOutlineXCircle className="h-12 w-12 text-white" />
                    </div>

                    {/* Título */}
                    <h2 className="text-2xl font-bold uppercase text-rose-600">
                        Pagamento negado
                    </h2>

                    {/* Mensagem de erro */}
                    <div className="space-y-2 text-sm leading-relaxed text-rose-700">
                        <p>{displayMessage}</p>
                        {orderNumber && (
                            <p className="text-xs text-rose-600">
                                Pedido: {orderNumber}
                            </p>
                        )}
                        {/* Mostrar detalhes adicionais se houver */}
                        {errorDetails.length > 1 && (
                            <div className="mt-3 space-y-1">
                                {errorDetails.slice(1).map((detail, index) => (
                                    <p key={index} className="text-xs text-rose-600">
                                        {detail}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex w-full flex-col gap-3">
                        {maxAttemptsReached ? (
                            // Esgotou tentativas: mostrar apenas botão para criar novo pedido
                            onStartNewOrder && (
                                <button
                                    type="button"
                                    onClick={onStartNewOrder}
                                    className="rounded-full border border-rose-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-normal text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                                >
                                    Criar novo pedido
                                </button>
                            )
                        ) : (
                            // Ainda há tentativas: mostrar botões normais
                            <div className="flex flex-col gap-3">
                                {onRetry && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="rounded-full border border-rose-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-normal text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                                    >
                                        Tentar novamente
                                    </button>
                                )}
                                {onCancel && (
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="rounded-full border border-[#1a1a1d] bg-[#1a1a1d] px-6 py-3 text-sm font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                                    >
                                        Cancelar pedido
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

