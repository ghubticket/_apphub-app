'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineUserCircle, HiOutlineXMark, HiOutlineBars3, HiOutlineArrowRight } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import styles from './Header.module.scss';
import { useAuth } from '@/context/AuthContext';
import { APP_LOGO, APP_LOGO_ALT } from '@/lib/config';

const upcomingEvents = [
    { name: '5521 Summer Vibes', city: 'Rio de Janeiro', state: 'RJ', date: '2025-11-15', venue: 'Morro da Urca' },
    { name: 'Sunset na Praia', city: 'Praia do Rosa', state: 'SC', date: '2025-12-02', venue: 'Beach Club' },
    { name: 'Tour Lisboa', city: 'Lisboa', state: 'Portugal', date: '2026-01-12', venue: 'LX Factory' },
    { name: 'Maracá Festival', city: 'Maracaípe', state: 'PE', date: '2026-02-08', venue: 'Arena 5521' },
];

const navigationLinks = [
    { label: 'Sobre', href: '/sobre' },
    { label: 'Política de Privacidade', href: '/privacidade' },
    { label: 'Termos de Uso', href: '/termos' },
];

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

export default function Header() {
    const headerRef = useRef<HTMLElement>(null);
    const { user, isAuthenticated, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileMenuEntering, setIsMobileMenuEntering] = useState(false);
    const [isFullMenuOpen, setIsFullMenuOpen] = useState(false);
    const [isFullMenuEntering, setIsFullMenuEntering] = useState(false);

    const welcomeName = useMemo(() => {
        if (!user) return '';
        const fullName = user.name || user.email || '';
        const [first] = fullName.split(' ');
        return first || fullName;
    }, [user]);

    useEffect(() => {
        const updateHeaderHeight = () => {
            if (headerRef.current) {
                document.documentElement.style.setProperty(
                    '--app-header-height',
                    `${headerRef.current.offsetHeight}px`
                );
            }
        };

        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);
        return () => {
            window.removeEventListener('resize', updateHeaderHeight);
        };
    }, []);


    const openFullMenu = useCallback(() => {
        setIsFullMenuOpen(true);
        requestAnimationFrame(() => {
            setIsFullMenuEntering(true);
        });
    }, []);

    const closeFullMenu = useCallback(() => {
        setIsFullMenuEntering(false);
        setTimeout(() => {
            setIsFullMenuOpen(false);
        }, 300);
    }, []);

    const openMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(true);
        requestAnimationFrame(() => {
            setIsMobileMenuEntering(true);
        });
    }, []);

    const closeMobileMenu = useCallback(() => {
        setIsMobileMenuEntering(false);
        setTimeout(() => {
            setIsMobileMenuOpen(false);
        }, 300);
    }, []);

    // Fechar menu com ESC
    useEffect(() => {
        if (!isFullMenuOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeFullMenu();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullMenuOpen, closeFullMenu]);

    // Bloquear scroll quando menu estiver aberto
    useEffect(() => {
        if (!isFullMenuOpen && !isMobileMenuOpen) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [isFullMenuOpen, isMobileMenuOpen]);

    // Fechar menu mobile com ESC
    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMobileMenu();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileMenuOpen, closeMobileMenu]);


    return (
        <header ref={headerRef} className="relative z-20 w-full">
            {/* Header antigo - oculto temporariamente */}
            <div className="hidden">
                <div className={`${styles.headerBackground} relative z-20 w-full`}>
                    <div className="overflow-hidden md:py-3 py-2 text-white" aria-hidden="true">
                        <div
                            className={`${styles.marquee} flex gap-12 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/90 md:text-xs`}
                        >
                            {[...upcomingEvents, ...upcomingEvents].map((event, index) => (
                                <span
                                    key={`${event.name}-${index}`}
                                    className={`${styles.marqueeItem} flex items-center gap-5`}
                                >
                                    <span className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-bold tracking-normal text-[#f97316]">
                                        {formatDate(event.date)}
                                    </span>
                                    <span className="tracking-normal text-white">
                                        {event.city} | {event.state}
                                    </span>
                                    <span className="hidden text-white/60 tracking-[0.25em] md:inline">
                                        {event.venue.toUpperCase()}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/10 bg-transparent">
                        <Container>
                            <div className="flex md:py-7 py-5 items-center justify-between gap-6"></div>
                        </Container>
                    </div>
                </div>
            </div>

            {/* Novo header com efeito blur/glassmorphism */}
            <div ref={headerRef as any} className="fixed top-0 left-0 right-0 z-20 pt-4">
                {/* Conteúdo do header com blur apenas no container */}
                <Container>
                    <div className="relative">
                        {/* Backdrop blur com fundo semi-transparente apenas no container */}
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-md border border-white/20 rounded-full shadow-sm"></div>

                        {/* Conteúdo do header */}
                        <div className="relative flex md:py-4 py-3 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
                            <Link href="/" className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                                <Image
                                    src={APP_LOGO}
                                    alt={APP_LOGO_ALT}
                                    width={40}
                                    height={20}
                                    className="h-auto w-9 md:w-20 lg:w-10"
                                    priority
                                />

                                <span className='text-xs md:text-2xl font-bold text-gray-800'>Vicente</span>
                            </Link>

                            <p className='hidden md:block text-base text-gray-600'>
                                <span className="inline-block animate-bounce mr-1">🎯</span>
                                APP do seu Role. Você no Comando!
                                <span className="inline-block animate-pulse ml-1">✨</span>
                                Sem filas, sem concorrência, sem stress!
                            </p>

                            <div className="flex gap-2 items-center md:gap-4">
                                {/* Hamburger Menu Mobile */}
                                <button
                                    type="button"
                                    onClick={isMobileMenuOpen ? closeMobileMenu : openMobileMenu}
                                    className="md:hidden flex flex-col items-center justify-center w-10 h-10 gap-1.5 group transition-all duration-300 border border-[#1a1a1d]/20 rounded-full hover:border-[#f97316]/50"
                                    aria-label="Menu"
                                >
                                    <span
                                        className={`block h-px w-6 bg-[#1a1a1d] transition-all duration-300 ${isMobileMenuOpen
                                                ? 'rotate-45 translate-y-2'
                                                : 'group-hover:bg-[#f97316]'
                                            }`}
                                    />
                                    <span
                                        className={`block h-px w-6 bg-[#1a1a1d] transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'group-hover:bg-[#f97316]'
                                            }`}
                                    />
                                    <span
                                        className={`block h-px w-6 bg-[#1a1a1d] transition-all duration-300 ${isMobileMenuOpen
                                                ? '-rotate-45 -translate-y-2'
                                                : 'group-hover:bg-[#f97316]'
                                            }`}
                                    />
                                </button>

                                {/* Hamburger Menu Desktop */}
                                <button
                                    type="button"
                                    onClick={isFullMenuOpen ? closeFullMenu : openFullMenu}
                                    className="hidden md:flex flex-col items-center justify-center w-10 h-10 gap-1.5 group transition-all duration-300 border border-[#1a1a1d]/20 rounded-full hover:border-[#f97316]/50"
                                    aria-label="Menu"
                                >
                                    <span
                                        className={`block h-px w-6 bg-[#1a1a1d] transition-all duration-300 ${isFullMenuEntering
                                                ? 'rotate-45 translate-y-2 bg-white'
                                                : 'group-hover:bg-[#f97316]'
                                            }`}
                                    />
                                    <span
                                        className={`block h-px w-6 bg-[#1a1a1d] transition-all duration-300 ${isFullMenuEntering ? 'opacity-0' : 'group-hover:bg-[#f97316]'
                                            }`}
                                    />
                                    <span
                                        className={`block h-px w-6 bg-[#1a1a1d] transition-all duration-300 ${isFullMenuEntering
                                                ? '-rotate-45 -translate-y-2 bg-white'
                                                : 'group-hover:bg-[#f97316]'
                                            }`}
                                    />
                                </button>

                                {isAuthenticated && welcomeName ? (
                                    <Link
                                        href="/dashboard"
                                        className="group inline-flex items-center justify-center w-10 h-10 md:w-auto md:h-10 rounded-full gap-2 bg-[#1a1a1d] text-white px-4 md:px-6 text-xs md:text-sm font-semibold uppercase transition hover:bg-[#f97316] hover:text-white"
                                    >
                                        <HiOutlineUserCircle className="text-xl w-5 h-5 flex-shrink-0 group-hover:text-white" />
                                        <span className="hidden md:inline">
                                            Olá, <strong className="font-bold">{welcomeName}</strong>
                                        </span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="group inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#1a1a1d] bg-[#1a1a1d] text-xs font-semibold uppercase text-white transition hover:bg-[#f97316] hover:border-[#f97316] hover:text-white"
                                    >
                                        <HiOutlineUserCircle className="text-xl w-5 h-5 group-hover:text-white" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </Container>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen ? (
                <div
                    className={`md:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuEntering ? 'opacity-100' : 'opacity-0'
                        }`}
                    onClick={closeMobileMenu}
                >
                    <div
                        className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[#1a1a1d] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isMobileMenuEntering ? 'translate-x-0' : 'translate-x-full'
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Menu Mobile */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <Link
                                href="/"
                                onClick={closeMobileMenu}
                                className="flex items-center gap-2"
                            >
                                <Image
                                    src={APP_LOGO}
                                    alt={APP_LOGO_ALT}
                                    width={30}
                                    height={15}
                                    className="h-auto w-8"
                                />
                                <span className="text-xl font-bold text-white">Vicente</span>
                            </Link>
                            <button
                                type="button"
                                onClick={closeMobileMenu}
                                className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-white hover:border-[#f97316] hover:text-[#f97316] transition-all"
                                aria-label="Fechar menu"
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Links Mobile */}
                        <nav className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-1">
                                {navigationLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={closeMobileMenu}
                                        className="block px-3 py-1 text-base font-semibold text-white hover:text-[#f97316] hover:bg-white/5 rounded-lg transition-all"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </nav>

                        {/* Footer do Menu Mobile */}
                        <div className="p-4 border-t border-white/10 space-y-3">
                            {isAuthenticated && welcomeName ? (
                                <div className="space-y-2">
                                    <Link
                                        href="/dashboard"
                                        onClick={closeMobileMenu}
                                        className="block px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all text-center text-sm"
                                    >
                                        Olá, {welcomeName}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeMobileMenu();
                                            logout();
                                            if (typeof window !== 'undefined') {
                                                window.location.href = '/';
                                            }
                                        }}
                                        className="w-full px-4 py-2.5 text-white/80 hover:text-white font-semibold rounded-xl transition-all text-center border border-white/20 hover:border-[#f97316] text-sm"
                                    >
                                        Sair
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={closeMobileMenu}
                                    className="block px-4 py-2.5 bg-[#f97316] hover:bg-[#ea6820] text-white font-semibold rounded-xl transition-all text-center text-sm"
                                >
                                    Entrar
                                </Link>
                            )}

                            <div className="pt-2 space-y-2">
                                <a
                                    href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais! 💬"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-4 py-2.5 bg-[#f97316] hover:bg-[#ea6820] text-white font-semibold rounded-xl transition-all text-center text-sm"
                                >
                                    Fale com o Vicente!
                                </a>
                                <a
                                    href="https://wa.me/5511982631238?text=Olá! Quero começar a usar a Vicente! 🚀"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-4 py-2.5 bg-white text-[#1a1a1d] hover:bg-gray-100 font-semibold rounded-xl transition-all text-center text-sm"
                                >
                                    Começar Agora
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Full Screen Menu Desktop */}
            {isFullMenuOpen ? (
                <div
                    className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-all duration-300 ${isFullMenuEntering ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    onClick={closeFullMenu}
                >
                    <div
                        className="fixed inset-[8px] z-[101] bg-[#1a1a1d] flex border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Left Side - Navigation */}
                        <div
                            className={`flex-1 flex flex-col justify-between p-12 md:p-16 lg:p-20 border-r-2 border-white/10 transition-all duration-500 ${isFullMenuEntering
                                    ? 'translate-x-0 opacity-100'
                                    : '-translate-x-10 opacity-0'
                                }`}
                        >
                            <div>
                                {/* Logo */}
                                <Link
                                    href="/"
                                    onClick={closeFullMenu}
                                    className="inline-flex items-center gap-3 mb-16 group"
                                >
                                    <Image
                                        src={APP_LOGO}
                                        alt={APP_LOGO_ALT}
                                        width={40}
                                        height={20}
                                        className="h-auto w-10  group-hover:opacity-80 transition-opacity"
                                    />
                                    <span className="text-3xl font-bold text-white group-hover:text-[#f97316] transition-colors">
                                        Vicente
                                    </span>
                                </Link>

                                {/* Navigation Links */}
                                <nav className="space-y-2">
                                    {navigationLinks.map((link, index) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={closeFullMenu}
                                            className={`block text-4xl md:text-5xl lg:text-6xl font-bold text-white hover:text-[#f97316] transition-all duration-300 hover:translate-x-2 ${isFullMenuEntering
                                                    ? 'opacity-100 translate-x-0'
                                                    : 'opacity-0 -translate-x-10'
                                                }`}
                                            style={{
                                                transitionDelay: `${index * 50 + 100}ms`,
                                            }}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </nav>
                            </div>

                            {/* Social Links */}
                            <div
                                className={`flex gap-4 transition-all duration-500 ${isFullMenuEntering
                                        ? 'opacity-100 translate-y-0'
                                        : 'opacity-0 translate-y-10'
                                    }`}
                                style={{ transitionDelay: '400ms' }}
                            >
                                <a
                                    href="https://wa.me/5511982631238"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center text-white hover:border-[#f97316] hover:text-[#f97316] transition-all"
                                    aria-label="WhatsApp"
                                >
                                    <span className="text-xl">💬</span>
                                </a>
                            </div>
                        </div>

                        {/* Right Side - Info & CTA */}
                        <div
                            className={`w-full md:w-96 lg:w-[500px] bg-[#2a2a2d] p-12 md:p-16 lg:p-20 flex flex-col justify-between transition-all duration-500 ${isFullMenuEntering
                                    ? 'translate-x-0 opacity-100'
                                    : 'translate-x-10 opacity-0'
                                }`}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={closeFullMenu}
                                className="self-end w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center text-white hover:border-[#f97316] hover:text-[#f97316] transition-all mb-8"
                                aria-label="Fechar menu"
                            >
                                <HiOutlineXMark className="w-6 h-6" />
                            </button>

                            {/* Info Section */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
                                        Quer saber mais?
                                    </h3>
                                    <a
                                        href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre a plataforma! 💬"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-2xl font-bold text-white hover:text-[#f97316] transition-colors inline-flex items-center gap-2"
                                    >
                                        Fale com o Vicente!
                                        <HiOutlineArrowRight className="w-6 h-6" />
                                    </a>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
                                        Pronto para começar?
                                    </h3>
                                    <a
                                        href="https://wa.me/5511982631238?text=Olá! Quero começar a usar a Vicente! 🚀"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-2xl font-bold text-white hover:text-[#f97316] transition-colors inline-flex items-center gap-2"
                                    >
                                        Começar Agora
                                        <HiOutlineArrowRight className="w-6 h-6" />
                                    </a>
                                </div>

                                {/* Botão Sair - apenas se autenticado */}
                                {isAuthenticated && welcomeName ? (
                                    <div className="pt-8 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeFullMenu();
                                                logout();
                                                if (typeof window !== 'undefined') {
                                                    window.location.href = '/';
                                                }
                                            }}
                                            className="text-lg font-semibold text-white/80 hover:text-white transition-colors inline-flex items-center gap-2"
                                        >
                                            Sair
                                            <HiOutlineArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            {/* Footer */}
                            <div className="mt-auto pt-8 border-t border-white/10">
                                <p className="text-sm text-white/40">
                                    © {new Date().getFullYear()} Vicente. Todos os direitos reservados.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </header>
    );
}

