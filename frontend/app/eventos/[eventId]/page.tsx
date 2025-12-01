'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { HiOutlineCalendar, HiOutlineMapPin, HiOutlineUser, HiOutlineHeart } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import TicketCatalog from '@/components/tickets/TicketCatalog';
import EventSelectionSummary from '@/components/tickets/EventSelectionSummary';
import type { TicketProduct } from '@/types/ticket';
import { fetchTicketCatalog } from '@/lib/ticketsCatalog';
import api from '@/lib/api';
import { APP_NAME } from '@/lib/config';
import { getProxiedImageUrl } from '@/lib/imageProxy';

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

    const handleShareInstagram = async () => {
        const eventName = primaryTicket?.eventName ?? primaryTicket?.name ?? 'Evento';
        const eventDate = primaryTicket?.eventDate ?? '';
        const eventLocation = primaryTicket?.location ?? '';
        const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

        const text = `🎫 ${eventName}${eventDate ? `\n📅 ${eventDate}` : ''}${eventLocation ? `\n📍 ${eventLocation}` : ''}\n\n🔗 ${eventUrl}`;

        // Tentar copiar para área de transferência e abrir Instagram
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            }
        } catch (err) {
            console.log('Erro ao copiar para área de transferência:', err);
        }

        // Abrir Instagram - tenta abrir o app se estiver instalado, senão abre o site
        // Para mobile, tenta abrir o app diretamente
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            // Mobile: tenta abrir o app do Instagram
            window.location.href = `instagram://share?text=${encodeURIComponent(text)}`;
            // Fallback: se o app não abrir em 500ms, abre o site
            setTimeout(() => {
                window.open(`https://www.instagram.com/`, '_blank');
            }, 500);
        } else {
            // Desktop: abre o site do Instagram
            window.open('https://www.instagram.com/', '_blank');
        }
    };

    // Calcular preço mínimo
    const minPrice = useMemo(() => {
        if (!tickets.length) return 0;
        const prices = tickets
            .filter(t => !t.isVip && typeof t.price === 'number' && t.price > 0)
            .map(t => t.price);
        return prices.length > 0 ? Math.min(...prices) : 0;
    }, [tickets]);

    return (
        <main className="bg-[#f5f1e8] pt-24 md:pt-28">
            <Container className="pb-8">
                <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-10 lg:items-start">
                    {/* Coluna Esquerda: Foto e Sobre - DESKTOP: col-start-1, MOBILE: hidden (foto aparece acima) */}
                    <section className="hidden lg:block space-y-6 lg:col-start-1 lg:col-end-2">
                        {/* Poster do Evento */}
                        <div className="overflow-hidden rounded-3xl border border-[#ded7ca] bg-white shadow-[0_30px_60px_-35px_rgba(20,20,32,0.35)]">
                            <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca] flex items-center justify-center">
                                {imageError || !primaryTicket?.image ? (
                                    <p className="text-center text-sm text-[#a38f78] px-4">
                                        Imagem do evento em construção
                                    </p>
                                ) : (
                                    <Image
                                        src={getProxiedImageUrl(primaryTicket.image)}
                                        alt={primaryTicket?.eventName ?? primaryTicket?.name ?? 'Imagem do evento'}
                                        fill
                                        className="object-cover"
                                        priority
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        unoptimized={true}
                                        onError={() => setImageError(true)}
                                    />
                                )}
                            </div>
                        </div>
                      
                        {/* Seção Sobre */}
                        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 lg:p-8 shadow-[0_30px_60px_-35px_rgba(20,20,32,0.35)]">
                            <h2 className="mb-4 text-lg font-bold text-[#1a1a1d]">Sobre</h2>
                            <div
                                className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
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
                            <hr />
                            {/* Botões de compartilhar */}
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleShareWhatsApp}
                                    className="flex flex-1 justify-center items-center gap-2 rounded-full border border-[#25D366] bg-[#25D366] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#20BA5A] hover:border-[#20BA5A]"
                                >
                                    <FaWhatsapp className="text-base" />
                                    Compartilhar no WhatsApp
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShareInstagram}
                                    className="flex flex-1 justify-center  items-center gap-2 rounded-full border border-[#E4405F] bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:opacity-90"
                                >
                                    <FaInstagram className="text-base" />
                                    Compartilhar no Instagram
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Coluna Direita: Informações e Ingressos - DESKTOP: col-start-2 */}
                    <section className="space-y-6 lg:col-start-2 lg:col-end-3">
                        {/* Título do Evento com Favoritar */}
                        <div className="flex items-start justify-between gap-4">
                            <h1 className="flex-1 text-2xl md:text-3xl font-bold text-[#1a1a1d] leading-tight">
                                {primaryTicket?.eventName ?? primaryTicket?.name ?? 'Evento'}
                            </h1>
                            <button
                                type="button"
                                className="flex-shrink-0 rounded-full border border-[#ded7ca] bg-white p-2.5 text-[#a38f78] transition hover:border-[#f97316] hover:text-[#f97316]"
                                aria-label="Favoritar evento"
                            >
                                <HiOutlineHeart className="text-xl" />
                            </button>
                        </div>

                        {/* Detalhes do Evento */}
                        <div className="space-y-4 rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
                            {primaryTicket?.eventDate && (
                                <div className="flex items-center gap-3 text-sm text-[#4c4c55]">
                                    <HiOutlineCalendar className="text-lg text-[#a38f78] flex-shrink-0" />
                                    <span className="text-[#1a1a1d]">{primaryTicket.eventDate}</span>
                                </div>
                            )}

                            {primaryTicket?.location && (
                                <div className="flex items-start gap-3 text-sm text-[#4c4c55]">
                                    <HiOutlineMapPin className="text-lg text-[#a38f78] flex-shrink-0 mt-0.5" />
                                    <span className="text-[#1a1a1d]">{primaryTicket.location}</span>
                                </div>
                            )}

                            {/* Classificação etária (se disponível) */}
                            <div className="flex items-center gap-3 text-sm text-[#4c4c55]">
                                <HiOutlineUser className="text-lg text-[#a38f78] flex-shrink-0" />
                                <span className="text-[#1a1a1d]">Classificação livre</span>
                            </div>

                            {/* Preço mínimo */}
                            {minPrice > 0 && (
                                <div className="pt-2 border-t border-[#e2ddd1]">
                                    <p className="text-base font-semibold text-[#1a1a1d]">
                                        A partir de <span className="text-[#f97316]">R$ {minPrice.toFixed(2).replace('.', ',')}</span>
                                    </p>
                                </div>
                            )}

                            {/* Botão Comprar Ingresso */}
                            <button
                                type="button"
                                onClick={() => {
                                    const ticketSection = document.getElementById('ticket-selection');
                                    if (ticketSection) {
                                        ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="w-full rounded-full bg-[#1a1a1d] px-6 py-3.5 text-sm font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:text-white"
                            >
                                Comprar Ingresso
                            </button>
                        </div>

                        {/* Foto do Evento - MOBILE: aparece entre informações e ingressos, DESKTOP: hidden (fica na coluna esquerda) */}
                        <div className="lg:hidden">
                            <div className="overflow-hidden rounded-3xl border border-[#ded7ca] bg-white shadow-[0_30px_60px_-35px_rgba(20,20,32,0.35)]">
                                <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca] flex items-center justify-center">
                                    {imageError || !primaryTicket?.image ? (
                                        <p className="text-center text-sm text-[#a38f78] px-4">
                                            Imagem do evento em construção
                                        </p>
                                    ) : (
                                        <Image
                                            src={getProxiedImageUrl(primaryTicket.image)}
                                            alt={primaryTicket?.eventName ?? primaryTicket?.name ?? 'Imagem do evento'}
                                            fill
                                            className="object-cover"
                                            priority
                                            sizes="100vw"
                                            unoptimized={true}
                                            onError={() => setImageError(true)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Seção de Seleção de Ingressos */}
                        <div id="ticket-selection">
                            <EventSelectionSummary tickets={tickets} loading={loading} eventId={eventId} />
                        </div>

                        {/* Seção Sobre - MOBILE: aparece abaixo dos ingressos, DESKTOP: hidden (fica na coluna esquerda) */}
                        <div className="lg:hidden">
                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_30px_60px_-35px_rgba(20,20,32,0.35)]">
                                <h2 className="mb-4 text-lg font-bold text-[#1a1a1d]">Sobre</h2>
                                <div
                                    className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
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
                                
                                {/* Botões de compartilhar */}
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleShareWhatsApp}
                                        className="flex flex-1 justify-center items-center gap-2 rounded-full border border-[#25D366] bg-[#25D366] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#20BA5A] hover:border-[#20BA5A]"
                                    >
                                        <FaWhatsapp className="text-base" />
                                        Compartilhar no WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleShareInstagram}
                                        className="flex flex-1 justify-center  items-center gap-2 rounded-full border border-[#E4405F] bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:opacity-90"
                                    >
                                        <FaInstagram className="text-base" />
                                        Compartilhar no Instagram
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </Container>
        </main>
    );
}
