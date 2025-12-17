'use client';

import { useEffect, useState } from 'react';
import { HiOutlineCheckCircle } from 'react-icons/hi2';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderNumber?: string;
    message?: string;
    redirectCountdown?: number | null;
}

/**
 * Modal de sucesso de pagamento padronizado
 * Usado em checkout e dashboard
 */
export default function PaymentSuccessModal({
    isOpen,
    onClose,
    orderNumber,
    message = 'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.',
    redirectCountdown = null,
}: PaymentSuccessModalProps) {
    const [mounted, setMounted] = useState(false);
    const [entering, setEntering] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            
            // Vibrar dispositivo quando modal abrir (iPhone/Android)
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
            
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

    // Fechar com ESC
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Bloquear scroll do body quando modal estiver aberta
    useEffect(() => {
        if (!isOpen) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [isOpen]);

    if (!mounted) return null;

    const activeClass = entering
        ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
        : 'opacity-0 translate-y-3 pointer-events-none scale-95';

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300 overflow-hidden ${entering ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div
                className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl transition-all duration-300 ${activeClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-4 md:gap-6 p-6 md:p-8 text-center">
                    {/* Ícone de sucesso com animação */}
                    <div className={`flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-[#1f5d3d] ${entering ? 'animate-[pulse_1s_ease-in-out_infinite]' : ''}`}>
                        <HiOutlineCheckCircle className="h-10 w-10 md:h-12 md:w-12 text-white" />
                    </div>

                    {/* Título */}
                    <h2 className="text-xl md:text-2xl font-bold uppercase text-[#1f5d3d]">
                        Pagamento aprovado
                    </h2>

                    {/* Mensagem */}
                    <div className="space-y-2 text-sm leading-relaxed text-[#1f5d3d] max-w-sm">
                        <p>{message}</p>
                        {orderNumber && (
                            <p className="text-xs text-[#2b6b47] break-words">
                                Pedido: {orderNumber}
                            </p>
                        )}
                        {redirectCountdown !== null && (
                            <p className="mt-4 text-sm font-semibold text-[#2b6b47]">
                                Redirecionaremos você em {redirectCountdown}s para ver seus pedidos.
                            </p>
                        )}
                        <p className="text-xs text-[#2b6b47]">
                            Você receberá um e-mail com os detalhes do pedido.
                        </p>
                    </div>

                    {/* Botão de fechar */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full md:w-auto rounded-full bg-[#1a1a1d] px-8 py-3 text-sm font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:text-white"
                    >
                        Ver meus pedidos
                    </button>
                </div>
            </div>
        </div>
    );
}

