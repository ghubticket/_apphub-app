'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlineCalendar, HiOutlineMapPin } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import TicketCatalog from '@/components/tickets/TicketCatalog';
import EventSelectionSummary from '@/components/tickets/EventSelectionSummary';
import type { TicketProduct } from '@/types/ticket';
import { fetchTicketCatalog } from '@/lib/ticketsCatalog';
import api from '@/lib/api';
import { APP_NAME } from '@/lib/config';

type EventTicketsPageProps = {
    params: {
        eventId: string;
    };
};

export default function EventTicketsPage({ params }: EventTicketsPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tickets, setTickets] = useState<TicketProduct[]>([]);
    const [eventData, setEventData] = useState<{ description?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [compactImageError, setCompactImageError] = useState(false);

    const eventId = useMemo(() => params.eventId, [params.eventId]);

    // Ler código de desconto da URL e salvar no sessionStorage
    useEffect(() => {
        const discountCode = searchParams.get('cd');
        if (discountCode && typeof window !== 'undefined') {
            // Salvar código de desconto no sessionStorage com o eventId como chave
            // Isso permite ter códigos diferentes para eventos diferentes
            const storageKey = `promoter_code_${eventId}`;
            window.sessionStorage.setItem(storageKey, discountCode.toUpperCase().trim());
            console.log('[EventTicketsPage] 💾 Código de desconto salvo:', { code: discountCode, eventId });
        }
    }, [searchParams, eventId]);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);

                // Buscar dados do evento diretamente
                try {
                    const eventResponse = await api.get(`/events/${eventId}`);
                    const event = eventResponse.data?.data || eventResponse.data;
                    if (event) {
                        setEventData({
                            description: event.description,
                        });
                    }
                } catch (eventErr) {
                    console.warn('[EventTicketsPage] Erro ao buscar dados do evento:', eventErr);
                }

                // Reaproveita o catálogo existente e filtra por evento
                const catalog = await fetchTicketCatalog({
                    limitEvents: 40,
                    onlyWithAvailability: false,
                });

                const eventTickets = catalog.filter((ticket) => ticket.eventId === eventId);

                if (!eventTickets.length) {
                    setError('Não encontramos ingressos para este evento.');
                }

                setTickets(eventTickets);
            } catch (err: any) {
                console.error('[EventTicketsPage] erro ao carregar ingressos do evento', err);
                setError(
                    err?.response?.data?.message ??
                    err?.message ??
                    'Não foi possível carregar os ingressos deste evento. Tente novamente.',
                );
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            load();
        }
    }, [eventId]);

    const primaryTicket = tickets[0];

    // Calcular total de ingressos disponíveis (soma do stock de todos os tickets)
    const totalAvailableTickets = useMemo(() => {
        return tickets.reduce((total, ticket) => {
            const stock = ticket.stock;
            if (typeof stock === 'number' && stock > 0) {
                return total + stock;
            }
            return total;
        }, 0);
    }, [tickets]);

    const handleBack = () => {
        const from = searchParams.get('from');
        if (from) {
            router.push(from);
        } else {
            router.push('/ingressos');
        }
    };

    const handleShareWhatsApp = () => {
        const eventName = primaryTicket?.eventName ?? primaryTicket?.name ?? 'Evento';
        const eventDate = primaryTicket?.eventDate ?? '';
        const eventLocation = primaryTicket?.location ?? '';
        const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

        const message = `🎫 ${eventName}${eventDate ? `\n📅 ${eventDate}` : ''}${eventLocation ? `\n📍 ${eventLocation}` : ''}\n\n🔗 ${eventUrl}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <main className="bg-[#f5f1e8] pt-24 md:pt-40">
            <div className='bg-white py-6'>
                <Container>
                    <div className="flex flex-col lg:flex-row gap-5 md:gap-10 justify-between">

                        {/* Resumo compacto do evento */}
                        <div className="flex items-center gap-4 lg:justify-center">
                            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#ded7ca] bg-[#e7dfd2]">
                                <Image
                                    src={compactImageError || !primaryTicket?.image ? '/images/anita.jpg' : primaryTicket.image}
                                    alt={primaryTicket?.eventName ?? primaryTicket?.name ?? 'Imagem do evento'}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                    unoptimized={primaryTicket?.image?.startsWith('http')}
                                    onError={() => setCompactImageError(true)}
                                />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-semibold text-[#1a1a1d]">
                                    {primaryTicket?.eventName ?? primaryTicket?.name ?? 'Evento'}
                                </p>

                                <p className="text-[0.7rem] font-semibold uppercase tracking-normal text-[#a38f78]">
                                    Local: {primaryTicket?.location ?? APP_NAME}
                                </p>

                                {primaryTicket?.eventDate && (
                                    <p className="text-[0.7rem] text-[#6f6b63]">
                                        Data:{primaryTicket.eventDate}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Etapas da compra */}
                        <div className="hidden md:flex items-center justify-start gap-3 lg:justify-end">
                            <div className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-normal">
                                <div className="flex items-center gap-1.5 text-[#1a1a1d]">
                                    <span className={`flex items-center justify-center rounded-full bg-[#1a1a1d] font-semibold text-white ${totalAvailableTickets >= 100
                                        ? 'h-7 w-7 text-[0.65rem]'
                                        : totalAvailableTickets >= 10
                                            ? 'h-6 w-6 text-[0.70rem]'
                                            : 'h-6 w-6 text-[0.70rem]'
                                        }`}>
                                        {loading ? '...' : totalAvailableTickets > 0 ? totalAvailableTickets : '0'}
                                    </span>
                                    <span>Ingressos Disponiveis</span>
                                </div>

                            </div>
                        </div>
                    </div>
                </Container>
            </div>

            <Container className="py-8 lg:py-10">
                <div className="flex flex-col gap-10 lg:grid lg:grid-cols-3 lg:items-start">
                    {/* Coluna: Detalhes do evento */}
                    <section className="space-y-6 lg:col-span-2">
                        <div className="overflow-hidden rounded-3xl border border-[#ded7ca] bg-white/80 shadow-[0_30px_60px_-35px_rgba(20,20,32,0.35)]">
                            <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca]">
                                <Image
                                    src={imageError || !primaryTicket?.image ? '/images/anita.jpg' : primaryTicket.image}
                                    alt={primaryTicket?.eventName ?? primaryTicket?.name ?? 'Imagem do evento'}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 768px) 100vw, 66vw"
                                    unoptimized={primaryTicket?.image?.startsWith('http')}
                                    onError={() => setImageError(true)}
                                />
                            </div>

                            <div className="space-y-5 p-6 lg:p-8">
                                <div className="space-y-2">
                                    <h1 className="text-xl font-bold tracking-normal text-[#1a1a1d]">
                                        {primaryTicket?.eventName ?? 'Evento'}
                                    </h1>

                                    <div className="flex flex-wrap items-center md:gap-4 gap-1 pb-4 text-sm text-[#4c4c55]">
                                        {primaryTicket?.eventDate && (
                                            <div className="flex items-center gap-2 ">
                                                <HiOutlineCalendar className="text-base text-[#a38f78]" />
                                                <span className="text-[#1a1a1d]">{primaryTicket.eventDate}</span>
                                            </div>
                                        )}

                                        {primaryTicket?.location && (
                                            <div className="flex items-center gap-2">
                                                <HiOutlineMapPin className="text-base text-[#a38f78]" />
                                                <span className="text-[#1a1a1d]">{primaryTicket.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    <hr />
                                    <div
                                        className="text-sm pt-5 pb-3 text-[#4c4c55] prose prose-sm max-w-none 
                                            prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                            prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                            prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                            prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                            prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                            prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: eventData?.description ||
                                                primaryTicket?.description ||
                                                'Escolha seu ingresso e garanta sua experiência com poucos cliques.'
                                        }}
                                    />
                                </div>

                                <hr />
                                {/* Botão de compartilhar no WhatsApp */}
                                <button
                                    type="button"
                                    onClick={handleShareWhatsApp}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#25D366] bg-[#25D366] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#20BA5A] hover:border-[#20BA5A]"
                                >
                                    <FaWhatsapp className="text-base" />
                                    Compartilhar no WhatsApp
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Coluna: Meus ingressos / detalhes da compra */}
                    <div className="lg:col-span-1">
                        <EventSelectionSummary tickets={tickets} loading={loading} eventId={eventId} />
                    </div>
                </div>
            </Container>
        </main>
    );
}


