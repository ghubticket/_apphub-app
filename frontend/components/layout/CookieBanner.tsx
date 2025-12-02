'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export default function CookieBanner() {
    const { showBanner, acceptCookies, rejectCookies, resetCookieConsent } = useCookieConsent();
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const isDev = process.env.NODE_ENV === 'development';

    useEffect(() => {
        if (showBanner) {
            // Pequeno delay para animação suave
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            setIsClosing(false);
        }
    }, [showBanner]);

    const handleAccept = () => {
        setIsClosing(true);
        setTimeout(() => {
            acceptCookies();
        }, 300); // Duração da animação de fadeout
    };

    const handleReject = () => {
        setIsClosing(true);
        setTimeout(() => {
            rejectCookies();
        }, 300); // Duração da animação de fadeout
    };

    if (!showBanner) return null;

    return (
        <>
            {/* Overlay com blur no fundo */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
                    isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
            />
            
            {/* Banner de cookies */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-300 ease-out ${
                    isVisible && !isClosing ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}
                role="dialog"
                aria-label="Banner de consentimento de cookies"
                aria-modal="true"
            >
                <div className="bg-[#1a1a1d] border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
                            <div className="flex-1 space-y-2">
                                <h3 className="text-base font-semibold text-white uppercase tracking-[0.05em]">
                                    Utilizamos cookies
                                </h3>
                                <p className="text-sm text-white/80 leading-relaxed">
                                    Este site utiliza cookies essenciais e tecnologias similares para melhorar sua experiência de navegação, 
                                    analisar o desempenho do site e personalizar conteúdo. Ao continuar navegando, você concorda com nossa{' '}
                                    <Link 
                                        href="/privacidade" 
                                        className="text-[#f97316] hover:text-[#ff8c42] underline transition-colors"
                                    >
                                        Política de Privacidade
                                    </Link>
                                    {' '}e nossos{' '}
                                    <Link 
                                        href="/termos" 
                                        className="text-[#f97316] hover:text-[#ff8c42] underline transition-colors"
                                    >
                                        Termos de Uso
                                    </Link> <br />
                                    Você pode gerenciar suas preferências a qualquer momento.
                                </p>
                                <p className="text-xs text-white/60">
                                    Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={handleReject}
                                    className="px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-white/70 border border-white/20 rounded-full hover:border-white/40 hover:text-white transition-colors whitespace-nowrap"
                                >
                                    Recusar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAccept}
                                    className="px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] bg-[#f97316] text-white rounded-full hover:bg-[#ff8c42] transition-colors whitespace-nowrap"
                                >
                                    Aceitar todos
                                </button>
                            </div>
                        </div>
                        {/* Botão de reset apenas em desenvolvimento */}
                        {isDev && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={resetCookieConsent}
                                    className="px-4 py-1.5 text-xs font-medium text-white/50 border border-white/10 rounded hover:border-white/30 hover:text-white/70 transition-colors"
                                >
                                    🔄 Reset Cookie (Dev)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

