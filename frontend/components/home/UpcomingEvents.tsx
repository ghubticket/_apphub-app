'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineCalendar, HiOutlineMapPin, HiOutlineTicket } from 'react-icons/hi2';
import type { EventSummary } from '@/lib/ticketsCatalog';
import { getProxiedImageUrl } from '@/lib/imageProxy';

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
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <h2 className="text-3xl font-bold uppercase tracking-normal text-[#1a1a1d] md:text-4xl">
                        Próximos Eventos
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

                {/* Grid de eventos */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {displayEvents.map((event) => {
                        // Priorizar coverImage, depois squareImage, depois fallback
                        const image = event.coverImage || event.squareImage;
                        const hasError = imageErrors.has(event.id);
                        const imageSrc = hasError || !image
                            ? '/images/31809-20250922180915.webp'
                            : image;

                        return (
                            <article
                                key={event.id}
                                className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-all hover:shadow-xl"
                            >
                                {/* Imagem do evento */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={imageSrc}
                                        alt={event.name || 'Evento'}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        unoptimized={false}
                                        onError={() => handleImageError(event.id)}
                                    />
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

                                    {/* Botão CTA */}
                                    <Link
                                        href={`/eventos/${event.id}`}
                                        className="mt-auto inline-flex items-center gap-2 rounded-full hover:text-white color border-2 border-[#f97316]/30 bg-[#f97316] justify-center py-2 text-xs font-semibold uppercase tracking-wide text-white transition-all hover:bg-[#ea580c] hover:border-[#f97316]/50"
                                    >
                                        <HiOutlineTicket className="h-4 w-4 md:h-5 md:w-5" />
                                        Comprar Ingresso
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
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

