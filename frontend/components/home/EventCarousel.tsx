'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { EventSummary } from '@/lib/ticketsCatalog';
import { APP_NAME } from '@/lib/config';
import { getProxiedImageUrl } from '@/lib/imageProxy';

type EventCarouselProps = {
    events: EventSummary[];
    className?: string;
};

export default function EventCarousel({ events, className }: EventCarouselProps) {
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    if (!events.length) {
        return null;
    }

    const handleImageError = (eventId: string) => {
        setImageErrors((prev) => new Set(prev).add(eventId));
    };

    return (
        <div className={`relative ${className ?? ''}`}>
            <div className="flex gap-6 overflow-x-auto pb-20 pt-2">
                {events.map((event) => {
                    const image = event.coverImage || event.squareImage;
                    const hasError = imageErrors.has(event.id);
                    const imageSrc = getProxiedImageUrl(image);

                    return (
                        <article
                            key={event.id}
                            className="group relative flex min-w-[280px] max-w-sm flex-col overflow-hidden rounded-3xl border border-[#ded7ca] bg-white/80 shadow-[0_24px_45px_-30px_rgba(20,20,32,0.55)] transition hover:-translate-y-1 hover:shadow-[0_40px_60px_-35px_rgba(20,20,32,0.6)]"
                        >
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#e7dfd2] flex items-center justify-center">
                                {hasError || !image ? (
                                    <p className="text-center text-sm text-[#a38f78] px-4">
                                        Imagem em construção.
                                    </p>
                                ) : imageSrc.startsWith('/api/images/') ? (
                                    // Para URLs do proxy, usar img normal (Next.js Image não funciona bem com rotas de API)
                                    <img
                                        src={imageSrc}
                                        alt={event.name || 'Evento'}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={() => handleImageError(event.id)}
                                    />
                                ) : (
                                    <Image
                                        src={imageSrc}
                                        alt={event.name || 'Evento'}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 768px) 80vw, 360px"
                                        unoptimized={false}
                                        onError={() => handleImageError(event.id)}
                                    />
                                )}
                            </div>

                            <div className="flex flex-1 flex-col justify-between p-5">
                                <div className="space-y-2">
                                    <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[#a38f78]">
                                        {APP_NAME}
                                    </span>
                                    <h3 className="lh-0 font-semibold uppercase tracking-normal text-[#1a1a1d]">
                                        {event.name ?? 'Evento em destaque'}
                                    </h3>
                                    {event.location && (
                                        <p className="text-[0.7rem] font-medium uppercase text-[#a38f78]">
                                            {event.location}
                                        </p>
                                    )}
                                    {event.formattedDate && (
                                        <p className="text-xs text-[#4c4c55]">{event.formattedDate}</p>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-4">
                                    <p className="text-[0.72rem] text-[#6f6b63]">
                                        Selecione os ingressos deste evento e finalize sua compra com segurança.
                                    </p>
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-3">
                                    <Link
                                        href={`/eventos/${event.id}?from=/`}
                                        className="inline-flex flex-1 items-center justify-center rounded-full border border-[#1a1a1d] bg-[#1a1a1d] px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-normal text-white transition group-hover:bg-[#f97316] group-hover:border-[#f97316] group-hover:text-[#1a1a1d]"
                                    >
                                        Ver ingressos
                                    </Link>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}


