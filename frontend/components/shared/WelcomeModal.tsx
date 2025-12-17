'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HiOutlineXMark, HiOutlineArrowRight, HiOutlineBolt } from 'react-icons/hi2';

export default function WelcomeModal() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [entering, setEntering] = useState(false);

    // Só mostrar na home
    const isHomePage = pathname === '/';

    useEffect(() => {
        // Só roda no cliente
        if (typeof window === 'undefined') return;
        
        // Só mostrar na home
        if (!isHomePage) return;

        setMounted(true);

        // Aguardar um pouco antes de mostrar para não ser muito agressivo
        const timer = setTimeout(() => {
            setIsOpen(true);
            requestAnimationFrame(() => {
                setEntering(true);
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [isHomePage]);

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

    // Não renderizar se não estiver na home
    if (!isHomePage || !mounted || !isOpen) return null;

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
                <div className="relative w-full max-w-lg bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border max-h-[95vh] flex flex-col">
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="inline-flex absolute top-3 right-3 md:top-4 md:right-4 z-10 items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all"
                        aria-label="Fechar"
                    >
                        <HiOutlineXMark className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    {/* Content - scroll apenas aqui */}
                    <div className="relative flex-1 overflow-y-auto">
                        {/* Header com gradiente - compacto */}
                        <div className="bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
                            <div className="text-left md:text-center">
                                <h2 className="text-lg md:text-xl lg:text-2xl font-bold">
                                    Olá! Eu sou o <span className="text-[#f97316]">Vicente</span>
                                </h2>
                                <p className="text-xs md:text-sm text-gray-300 mt-1">
                                    O app pro seu rolê!
                                </p>
                            </div>
                        </div>

                        {/* Body - conteúdo scrollável */}
                        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                            {/* Mensagem principal - compacta */}
                            <div className="space-y-2 md:space-y-3">
                                <p className="text-xs md:text-sm text-center text-gray-700 leading-relaxed">
                                    Aqui não tem distração de outros eventos, o app <strong className="text-[#1a1a1d]">É SEU</strong>,{' '}
                                    <strong className="text-[#f97316]">ÚNICO</strong>, exclusivo!
                                </p>

                                <div className="bg-gradient-to-r from-[#f97316]/10 to-[#ea6820]/10 rounded-lg md:rounded-xl p-3 md:p-4 border border-[#f97316]/20">
                                    <h3 className="font-bold text-center text-[#1a1a1d] mb-1 text-xs md:text-sm">
                                        Loja Demo
                                        <span className="text-[10px] md:text-xs font-normal text-gray-500 block md:inline md:ml-2">(mas os pedidos são reais!)</span>
                                    </h3>
                                    <p className="text-[10px] md:text-xs text-center text-gray-600 leading-relaxed">
                                        Essa é uma <strong>loja demo</strong> para você conhecer a plataforma. 
                                        Todos os pedidos são <strong>reais</strong>, então pode usar e abusar para testar os limites! 
                                    </p>
                                </div>
                            </div>

                            {/* Features rápidas - compacto */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 rounded-lg p-2 md:p-3 text-center">
                                    <span className="text-base md:text-xl mb-1 block">🎨</span>
                                    <p className="text-[10px] md:text-xs font-semibold text-[#1a1a1d]">Site Exclusivo</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 md:p-3 text-center">
                                    <span className="text-base md:text-xl mb-1 block">🔒</span>
                                    <p className="text-[10px] md:text-xs font-semibold text-[#1a1a1d]">Sem Concorrência</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 md:p-3 text-center">
                                    <span className="text-base md:text-xl mb-1 block">👑</span>
                                    <p className="text-[10px] md:text-xs font-semibold text-[#1a1a1d]">Você no Comando</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 md:p-3 text-center">
                                    <span className="text-base md:text-xl mb-1 block">⚡</span>
                                    <p className="text-[10px] md:text-xs font-semibold text-[#1a1a1d]">Sem Filas</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer fixo - sem scroll */}
                    <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-2 border-t border-gray-100 pt-3 md:pt-4 flex-shrink-0 bg-white">
                        <a
                            href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre a plataforma! 💬"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleClose}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-[#1a1a1d] hover:bg-[#f97316] text-white text-xs md:text-sm font-semibold rounded-full transition-all shadow-lg"
                        >
                            <HiOutlineBolt className="w-4 h-4" />
                            <span>Fale com o Vicente!</span>
                            <HiOutlineArrowRight className="w-4 h-4" />
                        </a>
                        
                        <a
                            href="/sobre"
                            onClick={handleClose}
                            className="w-full inline-flex border border-gray-200 items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm text-gray-600 hover:text-[#1a1a1d] font-medium rounded-full transition-all hover:bg-gray-50"
                        >
                            Quero Saber Mais
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}

