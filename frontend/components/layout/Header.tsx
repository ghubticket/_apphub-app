'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineTicket } from 'react-icons/hi';
import { HiOutlineUserCircle } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import styles from './Header.module.scss';
import { useAuth } from '@/context/AuthContext';

const upcomingEvents = [
    { name: '5521 Summer Vibes', city: 'Rio de Janeiro', state: 'RJ', date: '2025-11-15', venue: 'Morro da Urca' },
    { name: 'Sunset na Praia', city: 'Praia do Rosa', state: 'SC', date: '2025-12-02', venue: 'Beach Club' },
    { name: 'Tour Lisboa', city: 'Lisboa', state: 'Portugal', date: '2026-01-12', venue: 'LX Factory' },
    { name: 'Maracá Festival', city: 'Maracaípe', state: 'PE', date: '2026-02-08', venue: 'Arena 5521' },
];

const navigationLinks = [
    { label: 'Agenda', href: '/agenda' },
    { label: 'Experiências', href: '/experiencias' },
    { label: 'Fotos', href: '/fotos' },
    { label: 'Vídeos', href: '/videos' },
    { label: 'Contato', href: '/contato' },
];

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

export default function Header() {
    const headerRef = useRef<HTMLElement>(null);
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();

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

    return (
        <header ref={headerRef} className={`${styles.headerBackground} relative z-20 w-full`}>
            <div className="overflow-hidden py-3 text-white" aria-hidden="true">
                <div
                    className={`${styles.marquee} flex gap-12 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/90 md:text-xs`}
                >
                    {[...upcomingEvents, ...upcomingEvents].map((event, index) => (
                        <span
                            key={`${event.name}-${index}`}
                            className={`${styles.marqueeItem} flex items-center gap-5`}
                        >
                            <span className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-bold tracking-[0.2em] text-[#f97316]">
                                {formatDate(event.date)}
                            </span>
                            <span className="tracking-[0.25em] text-white">
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
                <Container className="flex py-7  items-center justify-between gap-6">
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/images/5521.avif"
                            alt="Logotipo 5521"
                            width={120}
                            height={48}
                            className=""
                            priority
                        />
                    </Link>

                    <nav className="hidden items-center gap-7  text-white/70 lg:flex">
                        {navigationLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className={`${styles.navItem} text-white uppercase font-bold relative text-xl `}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        {isAuthenticated && welcomeName ? (
                            <div className="flex flex-col items-end gap-1 text-white">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center rounded-full gap-2 bg-white text-black px-6 py-2 text-sm font-semibold uppercase  transition "
                                >
                                    <HiOutlineUserCircle className="text-lg" />
                                    <span>
                                        Olá, <strong className="font-bold">{welcomeName}</strong>
                                    </span>
                                </Link>
                                
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1 rounded-full border border-white/40 px-7 py-3 text-sm font-semibold uppercase text-white transition hover:border-[#f97316] lg:inline-flex"
                            >
                                <HiOutlineUserCircle className="text-lg" />
                                Entrar
                            </Link>
                        )}

                        <Link
                            href="/ingressos"
                            className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-[#f97316] hover:bg-[#f97316]/10"
                            aria-label="Ingressos"
                        >
                            <HiOutlineTicket className="text-xl drop-shadow-[0_0_12px_rgba(249,115,22,0.35)] group-hover:text-[#f97316]" />
                           
                        </Link>
                    </div>
                </Container>
            </div>
        </header>
    );
}

