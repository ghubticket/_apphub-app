'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineTicket } from 'react-icons/hi';
import { HiOutlineUserCircle } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import styles from './Header.module.scss';

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
                        <Link
                            href="/ingressos"
                            className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-[#f97316] hover:bg-[#f97316]/10"
                            aria-label="Ingressos"
                        >
                            <HiOutlineTicket className="text-xl drop-shadow-[0_0_12px_rgba(249,115,22,0.35)] group-hover:text-[#f97316]" />
                            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-white/70 bg-white px-1 text-[0.65rem] font-semibold text-[#f97316] shadow-[0_0_16px_rgba(255,255,255,0.35)]">
                                0
                            </span>
                        </Link>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1 rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase text-[#1a1a1d]  transition hover:bg-orange-100"
                        >
                            <HiOutlineUserCircle className="text-lg" />
                            Entrar
                        </Link>
                    </div>
                </Container>
            </div>
        </header>
    );
}

