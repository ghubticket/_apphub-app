'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineTicket } from 'react-icons/hi';
import { HiOutlineUserCircle, HiOutlineXMark } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import styles from './Header.module.scss';
import { useAuth } from '@/context/AuthContext';
import {
    CART_OPEN_EVENT,
    CART_STORAGE_KEY,
    CART_UPDATED_EVENT,
    CartItem,
    loadCartItems,
    removeCartItem,
} from '@/lib/cart';

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
    const { user, isAuthenticated, isReady, logout } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartDrawerVisible, setIsCartDrawerVisible] = useState(false);
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const cartCloseTimeoutRef = useRef<number | null>(null);

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

    const readCartFromStorage = useCallback(() => {
        setCartItems(loadCartItems());
    }, []);

    useEffect(() => {
        readCartFromStorage();
    }, [readCartFromStorage]);

    const openCartDrawer = useCallback(() => {
        if (cartCloseTimeoutRef.current) {
            window.clearTimeout(cartCloseTimeoutRef.current);
            cartCloseTimeoutRef.current = null;
        }
        setIsCartDrawerVisible(true);
        requestAnimationFrame(() => setIsCartDrawerOpen(true));
    }, []);

    const closeCartDrawer = useCallback(() => {
        if (cartCloseTimeoutRef.current) {
            window.clearTimeout(cartCloseTimeoutRef.current);
            cartCloseTimeoutRef.current = null;
        }
        setIsCartDrawerOpen(false);
        cartCloseTimeoutRef.current = window.setTimeout(() => {
            setIsCartDrawerVisible(false);
            cartCloseTimeoutRef.current = null;
        }, 280);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key === CART_STORAGE_KEY) {
                readCartFromStorage();
            }
        };
        const handleCustomUpdate = () => readCartFromStorage();
        const handleCartOpen = () => openCartDrawer();
        window.addEventListener('storage', handleStorage);
        window.addEventListener(CART_UPDATED_EVENT, handleCustomUpdate);
        window.addEventListener(CART_OPEN_EVENT, handleCartOpen);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(CART_UPDATED_EVENT, handleCustomUpdate);
            window.removeEventListener(CART_OPEN_EVENT, handleCartOpen);
        };
    }, [readCartFromStorage, openCartDrawer]);

    useEffect(
        () => () => {
            if (cartCloseTimeoutRef.current) {
                window.clearTimeout(cartCloseTimeoutRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (!isCartDrawerVisible) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeCartDrawer();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCartDrawerVisible, closeCartDrawer]);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        if (isCartDrawerVisible) {
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = original;
            };
        }
        return undefined;
    }, [isCartDrawerVisible]);

    const cartSubtotal = useMemo(
        () =>
            cartItems.reduce((total, item) => {
                const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
                const price = Number.isFinite(item.price) ? item.price : 0;
                return total + quantity * price;
            }, 0),
        [cartItems],
    );

    const formatCurrency = useMemo(
        () =>
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }),
        [],
    );

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

                        <button
                            type="button"
                            onClick={openCartDrawer}
                            className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-[#f97316] hover:bg-[#f97316]/10"
                            aria-label="Ingressos"
                        >
                            <HiOutlineTicket className="text-xl drop-shadow-[0_0_12px_rgba(249,115,22,0.35)] group-hover:text-[#f97316]" />
                            {cartItems.length ? (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#f97316] px-1 text-[0.6rem] font-semibold text-black">
                                    {cartItems.length}
                                </span>
                            ) : null}
                        </button>

                        {isAuthenticated && welcomeName ? (
                            <div className="flex items-center gap-3 text-white">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center rounded-full gap-2 bg-white text-black px-6 py-2 text-sm font-semibold uppercase  transition "
                                >
                                    <HiOutlineUserCircle className="text-lg" />
                                    <span>
                                        Olá, <strong className="font-bold">{welcomeName}</strong>
                                    </span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Logout limpa apenas autenticação, mantém carrinho
                                        logout();
                                        // Redirecionar para home após logout
                                        if (typeof window !== 'undefined') {
                                            window.location.href = '/';
                                        }
                                    }}
                                    className="font-medium text-white/70 hover:text-white transition underline"
                                >
                                    Sair
                                </button>
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


                    </div>
                </Container>
            </div>

            {isCartDrawerVisible ? (
                <div
                    className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isCartDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCartDrawer();
                        }
                    }}
                >
                    <aside
                        className={`relative flex h-full w-full max-w-md flex-col bg-white text-[#1a1a1d] shadow-[0_30px_60px_-25px_rgba(20,20,32,0.45)] transition-transform duration-300 ${isCartDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                            }`}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <header className="flex items-start justify-between border-b border-[#e5dfd4] px-6 py-6">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                                    Meus ingressos
                                </span>
                                <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                                    Carrinho
                                </h2>
                                <p className="mt-1 text-sm text-[#6f6b63]">
                                    Revise seus ingressos antes de finalizar. Você pode editar quantidades ou
                                    seguir para o checkout.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCartDrawer}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-[#1a1a1d]"
                                aria-label="Fechar carrinho"
                            >
                                <HiOutlineXMark className="text-xl" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {cartItems.length ? (
                                <ul className="space-y-5">
                                    {cartItems.map((item) => (
                                        <li
                                            key={item.id}
                                            className="relative rounded-2xl border border-[#ded7ca] bg-[#faf7f0] p-5 shadow-[0_18px_38px_-28px_rgba(20,20,32,0.35)]"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    removeCartItem(item.id);
                                                    readCartFromStorage();
                                                }}
                                                className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ded7ca] text-[#6f6b63] transition hover:border-rose-300 hover:text-rose-500"
                                                aria-label={`Remover ${item.name} do carrinho`}
                                            >
                                                <HiOutlineXMark className="text-lg" />
                                            </button>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-4 pr-10">
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                                            Evento
                                                        </span>
                                                        <p className="text-base font-semibold uppercase tracking-[0.1em] text-[#1a1a1d]">
                                                            {item.name}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full border border-[#ded7ca] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f6b63]">
                                                        {item.quantity}x
                                                    </span>
                                                </div>
                                                {item.date || item.location ? (
                                                    <p className="text-xs font-medium text-[#6f6b63]">
                                                        {item.date ? (
                                                            <span>{item.date}</span>
                                                        ) : null}
                                                        {item.date && item.location ? ' • ' : ''}
                                                        {item.location ? <span>{item.location}</span> : null}
                                                    </p>
                                                ) : null}
                                                <div className="flex items-center justify-between text-sm font-semibold text-[#1a1a1d]">
                                                    <span>Subtotal</span>
                                                    <span>{formatCurrency.format(item.quantity * item.price)}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-[#ded7ca] bg-white/70 p-6 text-center text-sm text-[#7d796c]">
                                    Seu carrinho está vazio.
                                </div>
                            )}
                        </div>

                        <footer className="border-t border-[#e5dfd4] px-6 py-6">
                            <div className="flex items-center justify-between text-sm font-semibold text-[#1a1a1d]">
                                <span>Total</span>
                                <span>{formatCurrency.format(cartSubtotal)}</span>
                            </div>
                            <div className="mt-4">
                                <Link
                                    href="/checkout"
                                    className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition ${
                                        cartItems.length && isReady && isAuthenticated
                                            ? 'bg-[#1a1a1d] text-white hover:bg-[#f97316] hover:text-[#1a1a1d]'
                                            : 'cursor-not-allowed border border-[#c9c3b8] bg-[#c9c3b8] text-white/70'
                                    }`}
                                    onClick={(event) => {
                                        if (!cartItems.length) {
                                            event.preventDefault();
                                            return;
                                        }

                                        // Verificar se está logado antes de ir para checkout
                                        if (isReady && !isAuthenticated) {
                                            event.preventDefault();
                                            // Redirecionar para login com returnUrl
                                            const returnUrl = '/checkout';
                                            window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
                                            return;
                                        }

                                        // Início de um novo fluxo de checkout a partir do carrinho:
                                        // limpar qualquer pedido/PIX pendente anterior para garantir novo pedido
                                        if (typeof window !== 'undefined') {
                                            try {
                                                window.sessionStorage.removeItem('checkout:active-order-id');
                                                window.sessionStorage.removeItem('__PIX_ORDER_ACTIVE__');
                                                window.localStorage.removeItem('checkout:timer-start-time');
                                            } catch {
                                                // ignore storage errors
                                            }
                                        }

                                        closeCartDrawer();
                                    }}
                                >
                                    Finalizar compra
                                </Link>
                            </div>
                        </footer>
                    </aside>
                </div>
            ) : null}
        </header>
    );
}

