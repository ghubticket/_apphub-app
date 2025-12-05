'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HiOutlineXMark, HiOutlineArrowRight, HiOutlineBolt } from 'react-icons/hi2';

export default function WelcomeModal() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [entering, setEntering] = useState(false);

    useEffect(() => {
        // Só roda no cliente
        if (typeof window === 'undefined') return;

        setMounted(true);

        // Aguardar um pouco antes de mostrar para não ser muito agressivo
        const timer = setTimeout(() => {
            setIsOpen(true);
            requestAnimationFrame(() => {
                setEntering(true);
            });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setEntering(false);
        setTimeout(() => {
            setIsOpen(false);
        }, 250);
    };

    // Fechar com ESC
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Bloquear scroll do body quando modal estiver aberta
    useEffect(() => {
        if (!isOpen) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const activeClass = entering
        ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
        : 'opacity-0 translate-y-3 pointer-events-none scale-95';

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                    entering ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className={`fixed inset-0 z-[61] flex items-center justify-center p-4 transition-all duration-300 ${activeClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative w-full max-w-lg bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col">
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="hidden md:inline-flex absolute top-3 right-3 md:top-4 md:right-4 z-10 items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all"
                        aria-label="Fechar"
                    >
                        <HiOutlineXMark className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    {/* Content */}
                    <div className="relative">
                        {/* Header com gradiente - faixa compacta */}
                        <div className="bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white px-4 py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-4 flex-shrink-0">
                            <div className="text-center">
                                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                                    Olá! Eu sou o <span className="text-[#f97316]">Vicente</span>
                                    <span className="ml-1 md:ml-2"></span>
                                </h2>
                                <p className="text-xs md:text-sm text-gray-300 mt-0.5 md:mt-1">
                                    O app pro seu rolê!
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {/* Mensagem principal */}
                            <div className="space-y-3 md:space-y-4">
                                <p className="text-sm text-center md:text-base lg:text-lg text-gray-700 leading-relaxed">
                                    Aqui não tem distração de outros eventos, o app <br /> <strong className="text-[#1a1a1d]">É SEU</strong>,{' '}
                                    <strong className="text-[#f97316]">ÚNICO</strong>, exclusivo!
                                </p>

                                <div className="bg-gradient-to-r from-[#f97316]/10 to-[#ea6820]/10 rounded-xl md:rounded-2xl p-4 md:p-5 border border-[#f97316]/20">
                                    <div className="flex items-start gap-2 md:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-center text-[#1a1a1d] mb-1 md:mb-2 text-sm md:text-base">
                                                Loja Demo
                                                <span className="text-xs md:text-sm font-normal text-gray-500 block md:inline md:ml-2">(mas os pedidos são reais!)</span>
                                            </h3>
                                            <p className="text-xs text-center md:text-sm lg:text-base text-gray-600 leading-relaxed">
                                                Essa é uma <strong>loja demo</strong> para você conhecer a plataforma. 
                                                Todos os pedidos são <strong>reais</strong>, então pode usar e abusar para testar os limites! 
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Features rápidas - ocultar em mobile muito pequeno */}
                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                                    <span className="text-xl md:text-2xl mb-1 md:mb-2 block">🎨</span>
                                    <p className="text-xs md:text-sm font-semibold text-[#1a1a1d]">Site Exclusivo</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                                    <span className="text-xl md:text-2xl mb-1 md:mb-2 block">🔒</span>
                                    <p className="text-xs md:text-sm font-semibold text-[#1a1a1d]">Sem Concorrência</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                                    <span className="text-xl md:text-2xl mb-1 md:mb-2 block">👑</span>
                                    <p className="text-xs md:text-sm font-semibold text-[#1a1a1d]">Você no Comando</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                                    <span className="text-xl md:text-2xl mb-1 md:mb-2 block">⚡</span>
                                    <p className="text-xs md:text-sm font-semibold text-[#1a1a1d]">Sem Filas</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer com CTAs */}
                        <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 space-y-2 md:space-y-3">
                            <a
                                href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre a plataforma! 💬"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleClose}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-[#1a1a1d] hover:bg-[#f97316] text-white text-sm md:text-base font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <HiOutlineBolt className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="text-xs md:text-base">Fale com o Vicente!</span>
                                <HiOutlineArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            
                            <a
                                href="/sobre"
                                onClick={handleClose}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base text-gray-600 hover:text-[#1a1a1d] font-medium rounded-full transition-all hover:bg-gray-50"
                            >
                                Quero Saber Mais
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

