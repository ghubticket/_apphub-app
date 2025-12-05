'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    HiOutlineCalendar,
    HiOutlineMapPin,
    HiOutlineSparkles,
    HiOutlineCreditCard,
    HiOutlineArrowPath,
    HiOutlineShieldCheck,
    HiOutlineChartBar,
    HiOutlineQrCode,
    HiOutlineEnvelope,
} from 'react-icons/hi2';
import type { EventSummary } from '@/lib/ticketsCatalog';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import BuyTicketButton from '@/components/shared/BuyTicketButton';

type UpcomingEventsProps = {
    events: EventSummary[];
    className?: string;
};

export default function UpcomingEvents({ events, className }: UpcomingEventsProps) {
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    if (!events.length) {
        return null;
    }

    // Usar eventos da API (máximo 4)
    const displayEvents = events.slice(0, 4);

    const handleImageError = (eventId: string) => {
        setImageErrors((prev) => new Set(prev).add(eventId));
    };

    return (
        <section className="py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-0 md:pt-16">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <h2 className="text-3xl text-light tracking-normal text-[#1a1a1d] md:text-4xl">
                        Disponibilizamos evento <strong>teste para você!</strong>
                    </h2>
                    {events.length > 4 && (
                        <Link
                            href="/ingressos"
                            className="hidden items-center text-sm font-semibold uppercase tracking-wide text-[#1a1a1d] transition-colors hover:text-[#f97316] md:inline-flex"
                        >
                            Todos Eventos R2
                            <svg
                                className="ml-2 h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </Link>
                    )}
                </div>

                {/* Grid de eventos com box informativo */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Eventos - ocupam 25% (1 coluna) */}
                    <div className="md:col-span-1 order-1">
                        <div className="grid grid-cols-1 gap-6">
                            {displayEvents.slice(0, 1).map((event) => {
                                // Priorizar coverImage, depois squareImage, depois fallback
                                const image = event.coverImage || event.squareImage;
                                const hasError = imageErrors.has(event.id);
                                const imageSrc = getProxiedImageUrl(image);

                                return (
                                    <Link
                                        key={event.id}
                                        href={`/eventos/${event.id}`}
                                        className="block"
                                    >
                                        <article
                                            className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-all hover:shadow-xl cursor-pointer"
                                        >
                                            {/* Imagem do evento */}
                                            <div className="relative aspect-[07/10] md:aspect-[07/10] w-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                                {hasError || !image ? (
                                                    <p className="text-center text-sm text-[#a38f78] px-4">
                                                        Imagem em construção.
                                                    </p>
                                                ) : (
                                                    <Image
                                                        src={imageSrc}
                                                        alt={event.name || 'Evento'}
                                                        fill
                                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                        sizes="(max-width: 768px) 100vw, 50vw"
                                                        unoptimized={false}
                                                        onError={() => handleImageError(event.id)}
                                                    />
                                                )}
                                            </div>

                                            {/* Conteúdo do card */}
                                            <div className="flex flex-1 flex-col p-6">
                                                {/* Nome do evento */}
                                                <h3 className="mb-4 text-xl font-bold leading-tight text-[#1a1a1d]">
                                                    {event.name ?? 'Evento em destaque'}
                                                </h3>

                                                {/* Local e data - sempre exibir com ícones */}
                                                <div className="mb-6 space-y-3 text-sm text-[#6f6b63]">
                                                    {/* Local com ícone */}
                                                    {event.location || (event.city && event.state) ? (
                                                        <div className="flex items-center gap-2 mt-0">
                                                            <HiOutlineMapPin className="h-4 w-4 flex-shrink-0 text-[#a38f78]" />
                                                            <p>
                                                                {event.location || `${event.city}, ${event.state}`}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {/* Data com ícone */}
                                                    {event.formattedDate || event.date ? (
                                                        <div className="flex items-center gap-2 mt-0">
                                                            <HiOutlineCalendar className="h-4 w-4 flex-shrink-0 text-[#a38f78]" />
                                                            <p>
                                                                {event.formattedDate ||
                                                                    (event.date
                                                                        ? new Date(event.date).toLocaleDateString('pt-BR', {
                                                                            day: 'numeric',
                                                                            month: 'long',
                                                                            year: 'numeric'
                                                                        })
                                                                        : '')}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                {/* Botão CTA - não precisa de href pois o card inteiro é clicável */}
                                                <div className="mt-auto">
                                                    <BuyTicketButton
                                                        variant="primary"
                                                        size="sm"
                                                        className="w-full justify-center pointer-events-none"
                                                    />
                                                </div>
                                            </div>
                                        </article>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Box Informativo - Evento Teste - ocupa 75% (2 colunas) */}
                    <div className="md:col-span-2 order-2">
                        <div className="h-full bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] rounded-2xl p-6 md:p-8 lg:p-10 shadow-xl border border-white/10 relative overflow-hidden">
                            {/* Gradiente de fundo decorativo */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f97316]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#f97316]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex items-start gap-4 mb-8">
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#f97316] to-[#ea6820] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <HiOutlineSparkles className="text-2xl text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                            Evento Teste
                                        </h3>
                                        <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                                            Este é um evento para testar a plataforma e suas funcionalidades!
                                            <span className="inline-block ml-2 animate-pulse">✨</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Grid de features */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {/* Valor Simbólico */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <HiOutlineCreditCard className="text-xl text-[#f97316]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-1">
                                                    Valor Simbólico
                                                </h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    O pagamento é apenas um valor simbólico para testar o sistema.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Devolução Automática */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <HiOutlineArrowPath className="text-xl text-[#f97316]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-1">
                                                    Devolução Automática
                                                </h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    O valor é devolvido automaticamente após a confirmação do pagamento.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Segurança */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <HiOutlineShieldCheck className="text-xl text-[#f97316]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-1">
                                                    Pagamento Seguro
                                                </h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    PIX e cartão com segurança total. Dados protegidos.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR Code */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <HiOutlineQrCode className="text-xl text-[#f97316]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-1">
                                                    QR Code Único
                                                </h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    Cada ingresso tem um QR code único e seguro.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email Automático */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <HiOutlineEnvelope className="text-xl text-[#f97316]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-1">
                                                    Email Automático
                                                </h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    Receba seu ingresso por email instantaneamente.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dashboard */}
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <HiOutlineChartBar className="text-xl text-[#f97316]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-1">
                                                    Dashboard Completo
                                                </h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    Controle total sobre vendas, relatórios e mais.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer com CTA */}
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <div className="bg-gradient-to-r from-[#f97316]/20 to-[#ea6820]/20 rounded-xl p-4 border border-[#f97316]/30">
                                        <p className="text-sm text-white text-center font-semibold mb-2">
                                            <span className="inline-block animate-pulse mr-2">✨</span>
                                            Teste todas as funcionalidades sem riscos!
                                            <span className="inline-block animate-pulse ml-2">🚀</span>
                                        </p>
                                        <p className="text-xs text-gray-400 text-center">
                                            Explore a plataforma completa e veja como ela pode transformar seus eventos!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Link para ver todos os eventos (mobile) */}
                {events.length > 4 && (
                    <div className="mt-12 text-center md:hidden">
                        <Link
                            href="/ingressos"
                            className="inline-flex items-center text-sm font-semibold uppercase tracking-wide text-[#1a1a1d] transition-colors hover:text-[#f97316]"
                        >
                            Ver todos os eventos
                            <svg
                                className="ml-2 h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}

