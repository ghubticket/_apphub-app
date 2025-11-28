'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { EventSummary } from '@/lib/ticketsCatalog';

type UpcomingEventsProps = {
    events: EventSummary[];
    className?: string;
};

export default function UpcomingEvents({ events, className }: UpcomingEventsProps) {
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    if (!events.length) {
        return null;
    }

    const handleImageError = (eventId: string) => {
        setImageErrors((prev) => new Set(prev).add(eventId));
    };

    return (
        <section className={`bg-white py-16 ${className ?? ''}`}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-12">
                    <h2 className="text-3xl font-bold uppercase tracking-normal text-[#1a1a1d] md:text-4xl">
                        Próximos Eventos
                    </h2>
                    <p className="mt-2 text-sm text-[#6f6b63]">
                        Prepare-se para momentos inesquecíveis que estão logo ali, esperando por você!
                    </p>
                </div>

                {/* Grid de eventos */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {events.slice(0, 4).map((event) => {
                        const image = event.coverImage || event.squareImage;
                        const hasError = imageErrors.has(event.id);
                        // Usar a imagem fornecida como fallback se houver erro ou não houver imagem
                        const imageSrc = hasError || !image 
                            ? '/images/31809-20250922180915.webp' 
                            : image;

                        return (
                            <article
                                key={event.id}
                                className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-lg"
                            >
                                {/* Imagem do evento */}
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={imageSrc}
                                        alt={event.name || 'Evento'}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        unoptimized={imageSrc.startsWith('http') || imageSrc.startsWith('https')}
                                        onError={() => handleImageError(event.id)}
                                    />
                                </div>

                                {/* Conteúdo do card */}
                                <div className="flex flex-1 flex-col p-4">
                                    {/* Nome do evento */}
                                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-[#1a1a1d]">
                                        {event.name ?? 'Evento em destaque'}
                                    </h3>

                                    {/* Local e data */}
                                    <div className="mb-4 space-y-1 text-sm text-[#6f6b63]">
                                        {event.location && (
                                            <p className="font-medium">{event.location}</p>
                                        )}
                                        {event.formattedDate && (
                                            <p>{event.formattedDate}</p>
                                        )}
                                    </div>

                                    {/* Botão CTA */}
                                    <Link
                                        href={`/eventos/${event.id}?from=/`}
                                        className="mt-auto inline-flex items-center justify-center rounded-lg bg-[#1a1a1d] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-all hover:bg-[#f97316]"
                                    >
                                        Comprar Ingresso
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* Link para ver todos os eventos */}
                {events.length > 4 && (
                    <div className="mt-12 text-center">
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

