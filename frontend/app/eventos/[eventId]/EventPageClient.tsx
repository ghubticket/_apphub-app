'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { HiOutlineCalendar, HiOutlineMapPin, HiOutlineUser, HiOutlineHeart, HiOutlineArrowLeft, HiOutlineTicket, HiOutlineArrowRight, HiOutlineArrowDownTray } from 'react-icons/hi2';
import Link from 'next/link';
import PageContainer from '@/components/shared/PageContainer';
import EventSelectionSummary from '@/components/tickets/EventSelectionSummary';
import EventDetailsTabs from '@/components/events/EventDetailsTabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import BuyTicketButton from '@/components/shared/BuyTicketButton';
import StructuredData from '@/components/seo/StructuredData';
import type { TicketProduct } from '@/types/ticket';
import { fetchTicketCatalog } from '@/lib/ticketsCatalog';
import api from '@/lib/api';
import { APP_NAME } from '@/lib/config';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { generateEventStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo';

type EventPageClientProps = {
    eventId: string;
};

export default function EventPageClient({ eventId }: EventPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tickets, setTickets] = useState<TicketProduct[]>([]);
    const [eventData, setEventData] = useState<{
        description?: string;
        name?: string;
        date?: string;
        location?: string;
        city?: string;
        state?: string;
        coverImage?: string;
        squareImage?: string;
        salesClosed?: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [compactImageError, setCompactImageError] = useState(false);
    const [eventDetails, setEventDetails] = useState<any>(null);
    const [eventDetailsLoading, setEventDetailsLoading] = useState(false);

    // Ler código de desconto da URL e salvar no sessionStorage
    useEffect(() => {
        const discountCode = searchParams.get('cd');
        if (discountCode && typeof window !== 'undefined') {
            const storageKey = `promoter_code_${eventId}`;
            window.sessionStorage.setItem(storageKey, discountCode.toUpperCase().trim());
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
                            name: event.name,
                            date: event.date,
                            location: event.location,
                            city: event.city,
                            state: event.state,
                            coverImage: event.coverImage,
                            squareImage: event.squareImage,
                            salesClosed: event.salesClosed,
                        });
                    }
                } catch (eventErr) {
                    // Erro silencioso ao buscar dados do evento
                }

                // Reaproveita o catálogo existente e filtra por evento
                const catalog = await fetchTicketCatalog({
                    limitEvents: 40,
                    onlyWithAvailability: false,
                });

                const eventTickets = catalog.filter((ticket) => ticket.eventId === eventId);

                // Não setar erro se não houver ingressos - apenas mostrar mensagem no box
                setTickets(eventTickets);

                // Buscar detalhes do evento (opcional - não bloqueia se falhar)
                try {
                    setEventDetailsLoading(true);
                    const detailsResponse = await api.get(`/event-details/${eventId}`);
                    if (detailsResponse.data?.success && detailsResponse.data?.data) {
                        setEventDetails(detailsResponse.data.data);
                    }
                } catch (detailsErr) {
                    // Erro silencioso - detalhes são opcionais
                    console.debug('Detalhes do evento não encontrados:', detailsErr);
                } finally {
                    setEventDetailsLoading(false);
                }
            } catch (err: any) {
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
        const eventDate = primaryTicket?.eventDate ?? eventData?.date ?? '';
        const eventLocation = primaryTicket?.location ?? eventData?.location ?? '';
        const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

        const message = `🎫 ${eventName}${eventDate ? `\n📅 ${eventDate}` : ''}${eventLocation ? `\n📍 ${eventLocation}` : ''}\n\n🔗 ${eventUrl}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareInstagram = async () => {
        const eventDate = primaryTicket?.eventDate ?? eventData?.date ?? '';
        const eventLocation = primaryTicket?.location ?? eventData?.location ?? '';
        const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

        const text = `🎫 ${eventName}${eventDate ? `\n📅 ${eventDate}` : ''}${eventLocation ? `\n📍 ${eventLocation}` : ''}\n\n🔗 ${eventUrl}`;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            }
        } catch (err) {
        }

        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            window.location.href = `instagram://share?text=${encodeURIComponent(text)}`;
            setTimeout(() => {
                window.open(`https://www.instagram.com/`, '_blank');
            }, 500);
        } else {
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

    // Preparar dados para SEO (ANTES de qualquer return)
    const eventName = useMemo(() =>
        primaryTicket?.eventName ??
        primaryTicket?.name ??
        eventData?.name ??
        'Evento',
        [primaryTicket, eventData]
    );
    const eventImage = useMemo(() => {
        if (primaryTicket?.image) return getProxiedImageUrl(primaryTicket.image);
        if (eventData?.coverImage) return getProxiedImageUrl(eventData.coverImage);
        if (eventData?.squareImage) return getProxiedImageUrl(eventData.squareImage);
        return undefined;
    }, [primaryTicket, eventData]);
    const eventUrl = useMemo(() => `/eventos/${eventId}`, [eventId]);
    // Função auxiliar para formatar data no formato brasileiro
    const formatDateForDisplay = useCallback((date: Date): string => {
        return date.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }, []);
    
    // Calcular intervalo de datas para tickets de transporte
    const eventDateRange = useMemo(() => {
        // Coletar todas as datas dos transportOptions de todos os tickets de transporte
        const allDates: string[] = [];
        
        tickets.forEach(ticket => {
            if (ticket.isTransport && ticket.transportOptions) {
                ticket.transportOptions.forEach(option => {
                    if (option.date) {
                        allDates.push(option.date);
                    }
                });
            }
        });
        
        // Se não houver datas de transporte, usar a data padrão do evento (formatada)
        if (allDates.length === 0) {
            const defaultDate = primaryTicket?.eventDateIso ||
                primaryTicket?.eventDate ||
                eventData?.date ||
                null;
            
            if (!defaultDate) return null;
            
            // Se já estiver formatada (string com texto legível), retornar como está
            if (typeof defaultDate === 'string' && !defaultDate.includes('T') && !defaultDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                return defaultDate;
            }
            
            // Se for ISO string ou formato YYYY-MM-DD, formatar
            try {
                const parsed = new Date(defaultDate);
                if (!isNaN(parsed.getTime())) {
                    // Usar UTC para evitar mudança de dia por timezone
                    const day = parsed.getUTCDate();
                    const month = parsed.getUTCMonth();
                    const year = parsed.getUTCFullYear();
                    const localDate = new Date(year, month, day);
                    return formatDateForDisplay(localDate);
                }
            } catch {
                // Se falhar, retornar como está
            }
            
            return defaultDate;
        }
        
        // Ordenar datas e pegar a primeira e última
        const sortedDates = allDates
            .map(date => {
                // Tentar parsear a data (pode estar em formato DD/MM/YYYY ou ISO)
                let parsed: string;
                if (date.includes('/')) {
                    // Formato DD/MM/YYYY -> YYYY-MM-DD
                    const parts = date.split('/');
                    if (parts.length === 3) {
                        const [day, month, year] = parts;
                        parsed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } else {
                        parsed = date;
                    }
                } else {
                    parsed = date;
                }
                return new Date(parsed);
            })
            .filter(date => !isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
        
        if (sortedDates.length === 0) {
            const defaultDate = primaryTicket?.eventDateIso ||
                primaryTicket?.eventDate ||
                eventData?.date ||
                null;
            
            if (!defaultDate) return null;
            
            // Se já estiver formatada (string com texto legível), retornar como está
            if (typeof defaultDate === 'string' && !defaultDate.includes('T') && !defaultDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                return defaultDate;
            }
            
            // Se for ISO string ou formato YYYY-MM-DD, formatar
            try {
                const parsed = new Date(defaultDate);
                if (!isNaN(parsed.getTime())) {
                    // Usar UTC para evitar mudança de dia por timezone
                    const day = parsed.getUTCDate();
                    const month = parsed.getUTCMonth();
                    const year = parsed.getUTCFullYear();
                    const localDate = new Date(year, month, day);
                    return formatDateForDisplay(localDate);
                }
            } catch {
                // Se falhar, retornar como está
            }
            
            return defaultDate;
        }
        
        const firstDate = sortedDates[0];
        const lastDate = sortedDates[sortedDates.length - 1];
        
        // Se houver apenas uma data ou todas as datas são iguais, retornar apenas uma
        if (firstDate.getTime() === lastDate.getTime()) {
            return formatDateForDisplay(firstDate);
        }
        
        // Formatar como intervalo "de X até Y"
        return `de ${formatDateForDisplay(firstDate)} até ${formatDateForDisplay(lastDate)}`;
    }, [tickets, primaryTicket, eventData, formatDateForDisplay]);
    
    const eventDate = useMemo(() =>
        primaryTicket?.eventDateIso ||
        primaryTicket?.eventDate ||
        eventData?.date,
        [primaryTicket, eventData]
    );

    const eventDescription = useMemo(() => {
        if (eventData?.description) {
            return eventData.description.replace(/<[^>]*>/g, '').substring(0, 155) + '...';
        }
        const eventDate = primaryTicket?.eventDate ?? eventData?.date ?? '';
        const eventLocation = primaryTicket?.location ?? eventData?.location ?? '';
        return `Ingressos para ${eventName}. ${eventDate ? `Data: ${eventDate}.` : ''} ${eventLocation ? `Local: ${eventLocation}.` : ''} Compre agora com ${APP_NAME}!`;
    }, [eventData, eventName, primaryTicket]);

    // Structured data para o evento
    const eventStructuredData = useMemo(() => {
        if (!primaryTicket && !eventData) return null;

        const location = primaryTicket?.location ?? eventData?.location;

        return generateEventStructuredData({
            name: eventName,
            description: eventData?.description?.replace(/<[^>]*>/g, '') || undefined,
            image: eventImage,
            date: eventDate,
            startDate: eventDate,
            location: location,
            price: minPrice > 0 ? minPrice : undefined,
            currency: 'BRL',
            id: eventId,
            url: eventUrl,
        });
    }, [primaryTicket, eventData, eventName, eventImage, eventDate, minPrice, eventId, eventUrl]);

    // Breadcrumb structured data
    const breadcrumbData = useMemo(() => generateBreadcrumbStructuredData([
        { name: 'Início', url: '/' },
        { name: 'Ingressos', url: '/ingressos' },
        { name: eventName, url: eventUrl },
    ]), [eventName, eventUrl]);

    // Mostrar loading enquanto carrega
    if (loading) {
        return (
            <PageContainer
                bgColor="bg-[#f5f1e8]"
                paddingTop={5}
                paddingBottom="pb-8"
                fullHeight
                containerClassName="pb-8"
            >
                <LoadingSpinner
                    message="Carregando evento..."
                    submessage="Aguarde enquanto buscamos as informações"
                    fullscreen={false}
                />
            </PageContainer>
        );
    }

    // Mostrar erro se houver
    if (error) {
        return (
            <PageContainer
                bgColor="bg-[#f5f1e8]"
                paddingTop={0}
                paddingBottom="pb-8"
                fullHeight
                containerClassName="pb-8"
            >
                <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
                    <p className="text-lg font-semibold text-red-800">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-full bg-[#f97316] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#ea580c]"
                    >
                        Tentar novamente
                    </button>
                </div>
            </PageContainer>
        );
    }

    return (
        <>
            {eventStructuredData && <StructuredData data={eventStructuredData} />}
            <StructuredData data={breadcrumbData} />
            <PageContainer
                bgColor="bg-[#f5f1e8]"
                paddingTop={{ mobile: 5, desktop: 8 }}
                paddingBottom="pb-8"
                containerClassName="pb-8"
            >
                <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-10 lg:items-start">
                    {/* Coluna Esquerda: Foto e Sobre - DESKTOP: col-start-1, MOBILE: hidden (foto aparece acima) */}
                    <section className="hidden lg:block space-y-6 lg:col-start-1 lg:col-end-2">
                        {/* Poster do Evento */}
                        <div className="overflow-hidden rounded-3xl border border-[#ded7ca] bg-white">
                            <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca] flex items-center justify-center">
                                {imageError || !eventImage ? (
                                    <p className="text-center text-sm text-[#a38f78] px-4">
                                        Imagem do evento em construção
                                    </p>
                                ) : (
                                    <Image
                                        src={eventImage}
                                        alt={eventName}
                                        fill
                                        className="object-cover"
                                        priority
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        unoptimized={false}
                                        onError={() => setImageError(true)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Box de Compartilhar nas Redes Sociais - Abaixo da foto (Desktop) */}
                        <div className="rounded-3xl border border-[#ded7ca] bg-white p-4">
                            <p className="text-xs uppercase font-medium text-[#7d796c] mb-3 text-center">
                                Compartilhar:
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleShareWhatsApp}
                                    className="flex flex-1 justify-center items-center gap-1.5 rounded-full border border-[#25D366] bg-[#25D366] px-3 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#20BA5A] hover:border-[#20BA5A]"
                                >
                                    <FaWhatsapp className="text-sm" />
                                    <span className="hidden sm:inline">WhatsApp</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShareInstagram}
                                    className="flex flex-1 justify-center items-center gap-1.5 rounded-full border border-[#E4405F] bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] px-3 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:opacity-90"
                                >
                                    <FaInstagram className="text-sm" />
                                    <span className="hidden sm:inline">Instagram</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Coluna Direita: Informações e Ingressos - DESKTOP: col-start-2 */}
                    <section className="space-y-6 lg:col-start-2 lg:col-end-3">
                        {/* Título do Evento com Favoritar */}
                        <div className="flex items-start justify-between gap-4">
                            <h1 className="flex-1 text-2xl md:text-3xl font-bold text-[#1a1a1d] leading-tight">
                                {eventName}
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
                            {eventDateRange && (
                                <div className="flex items-center gap-3 text-sm text-[#4c4c55]">
                                    <HiOutlineCalendar className="text-lg text-[#a38f78] flex-shrink-0" />
                                    <span className="text-[#1a1a1d]">{eventDateRange}</span>
                                </div>
                            )}

                            {(primaryTicket?.location || eventData?.location) && (
                                <div className="flex items-start gap-3 text-sm text-[#4c4c55]">
                                    <HiOutlineMapPin className="text-lg text-[#a38f78] flex-shrink-0 mt-0.5" />
                                    <span className="text-[#1a1a1d]">{primaryTicket?.location || eventData?.location}</span>
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
                            <BuyTicketButton
                                onClick={() => {
                                    const ticketSection = document.getElementById('ticket-selection');
                                    if (ticketSection) {
                                        ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                variant="dark"
                                size="lg"
                                className="w-full items-center justify-center"
                            />
                        </div>

                        {/* Foto do Evento - MOBILE: aparece entre informações e ingressos, DESKTOP: hidden (fica na coluna esquerda) */}
                        <div className="lg:hidden space-y-6">
                            <div className="overflow-hidden rounded-3xl border border-[#ded7ca] bg-white">
                                <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca] flex items-center justify-center">
                                    {compactImageError || !eventImage ? (
                                        <p className="text-center text-sm text-[#a38f78] px-4">
                                            Imagem do evento em construção
                                        </p>
                                    ) : (
                                        <Image
                                            src={eventImage}
                                            alt={eventName}
                                            fill
                                            className="object-cover"
                                            priority
                                            sizes="100vw"
                                            unoptimized={true}
                                            onError={() => setCompactImageError(true)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Box de Compartilhar nas Redes Sociais - Abaixo da foto (Mobile) */}
                            <div className="rounded-3xl border border-[#ded7ca] bg-white p-4">
                                <p className="text-xs font-medium text-[#7d796c] mb-3 text-center">
                                    Compartilhar:
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleShareWhatsApp}
                                        className="flex flex-1 justify-center items-center gap-1.5 rounded-full border border-[#25D366] bg-[#25D366] px-3 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#20BA5A] hover:border-[#20BA5A]"
                                    >
                                        <FaWhatsapp className="text-sm" />
                                        <span className="hidden sm:inline">WhatsApp</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleShareInstagram}
                                        className="flex flex-1 justify-center items-center gap-1.5 rounded-full border border-[#E4405F] bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] px-3 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:opacity-90"
                                    >
                                        <FaInstagram className="text-sm" />
                                        <span className="hidden sm:inline">Instagram</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Seção de Seleção de Ingressos */}
                        <div id="ticket-selection">
                            {eventData?.salesClosed ? (
                                <div className="rounded-3xl border border-[#ded7ca] bg-white/95 p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
                                    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f1e8]">
                                            <HiOutlineTicket className="text-3xl text-[#7d796c]" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-[#1a1a1d] mb-2">
                                                Vendas Finalizadas
                                            </h2>
                                            <p className="text-sm text-[#7d796c]">
                                                As vendas de ingressos para este evento foram temporariamente encerradas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <EventSelectionSummary tickets={tickets} loading={loading} eventId={eventId} />
                            )}
                        </div>
                    </section>
                </div>

                {/* Seção de Informações Gerais (Abas) - 100% da largura, como terceira coluna */}
                {eventDetails && (
                    <section className="w-full mt-8 lg:mt-10">
                        <EventDetailsTabs eventDetails={eventDetails} loading={eventDetailsLoading} />
                    </section>
                )}

                {/* Fallback: Seção Sobre caso não tenha eventDetails - 100% da largura */}
                {!eventDetails && (
                    <section className="w-full mt-8 lg:mt-10">
                        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 lg:p-8">
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
                        </div>
                    </section>
                )}
            </PageContainer>
        </>
    );
}

