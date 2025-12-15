'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import PhotosCarousel from '@/components/home/PhotosCarousel';
import HeroCarousel, { type HeroSlide } from '@/components/home/HeroVideo';
import StructuredData from '@/components/seo/StructuredData';
import { fetchEventsList, type EventSummary } from '@/lib/ticketsCatalog';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { generateBreadcrumbStructuredData } from '@/lib/seo';
import WelcomeModal from '@/components/shared/WelcomeModal';

export default function Home() {
    // Limpar qualquer estado de processamento de pagamento ao entrar na HOME
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Limpar dados do Brick se existirem
            const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
            if (form) {
                delete (form as any).__brickData;
            }

            // Limpar qualquer flag de processamento no sessionStorage/localStorage
            // (se houver algum estado persistido)
            try {
                // Não limpar activeOrderId aqui pois pode ser necessário para restaurar pedido
                // Mas garantir que o estado de processamento seja limpo
            } catch (error) {
                // Ignorar erros de limpeza
            }
        }
    }, []);
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // OTIMIZAÇÃO: Usar useRef para evitar chamadas duplicadas
    const hasLoadedRef = useRef(false);

    const loadHighlights = useCallback(async () => {
        // Evitar chamadas duplicadas (React Strict Mode, re-renders)
        if (hasLoadedRef.current) {
            return;
        }

        hasLoadedRef.current = true;
        setLoading(true);
        setError('');
        try {
            const highlights = await fetchEventsList({
                limitEvents: 10,
            });
            setEvents(highlights);
        } catch (err: any) {
            setError('Não foi possível carregar os eventos disponíveis. Tente novamente em instantes.');
            hasLoadedRef.current = false; // Permitir retry em caso de erro
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHighlights();
    }, [loadHighlights]);

    const hasEvents = useMemo(() => events.length > 0, [events]);

    // Gerar slides do carrossel hero a partir dos eventos da API
    const heroSlides: HeroSlide[] = useMemo(() => {
        if (!hasEvents) {
            // Fallback: slide sem imagem (mostrará "IMAGEM em construção.")
            return [
                {
                    type: 'image',
                    imageUrl: '', // Sem imagem para mostrar o texto de construção
                    content: {
                        title: 'Próximos Eventos',
                        description: 'Aguarde, em breve teremos novidades incríveis para você!',
                    },
                    ctaLink: '/ingressos',
                    overlayOpacity: 0.5,
                },
            ];
        }

        // Criar slides a partir dos eventos da API (máximo 4)
        return events.slice(0, 4).map((event) => {
            // Usar a imagem do backend (coverImage ou squareImage), mesma da página de ingressos
            const eventImage = event.coverImage || event.squareImage;
            // Se houver imagem do evento, usar a URL direta (R2); caso contrário, usar fallback
            const imageUrl = eventImage ? getProxiedImageUrl(eventImage) : '/images/Banner-4-1600x838-5.png';
            
            return {
                type: 'image',
                imageUrl: imageUrl,
                content: {
                    title: event.name || 'Evento',
                    description: event.description
                        ? event.description.replace(/<[^>]*>/g, '').trim()
                        : undefined,
                },
                date: event.date,
                formattedDate: event.formattedDate,
                location: event.location,
                city: event.city,
                state: event.state,
                ctaLink: `/eventos/${event.id}?from=/`,
                overlayOpacity: 0.5,
            } as HeroSlide;
        });
    }, [events, hasEvents]);

    // Breadcrumb structured data
    const breadcrumbData = generateBreadcrumbStructuredData([
        { name: 'Início', url: '/' },
    ]);

    return (
        <>
            <StructuredData data={breadcrumbData} />
            <main className="bg-[#f5f1e8]">
                {loading ? (
                    <LoadingSpinner 
                        message="Carregando eventos..." 
                        submessage="Aguarde enquanto buscamos os melhores eventos para você"
                    />
                ) : (
                    <>
                        {/* Hero com carrossel - ocupa 100% da tela */}
                        <HeroCarousel slides={heroSlides} autoplayInterval={6000} />

                        {/* Seção Próximos Eventos */}
                        <UpcomingEvents events={events} />

                        {/* CTA Venda a Longo Prazo */}
                        <section className="px-4 py-12 bg-white">
                            <div className="max-w-6xl mx-auto">
                                <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white shadow-xl">
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,_#f97316_0,_transparent_50%)]"></div>
                                    <div className="relative z-10 flex flex-col gap-6 p-8 md:p-12">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 w-fit text-sm font-semibold uppercase tracking-wide">
                                            <span className="text-lg">💳</span>
                                            Venda a Longo Prazo
                                        </div>
                                        <div className="space-y-3">
                                            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                                                Precisa vender a longo prazo, disponibilizar PIX ou boleto parcelado?
                                            </h2>
                                            <p className="text-lg text-gray-200 max-w-3xl">
                                                Essa sessão é pra você. Seus eventos podem ser o que você quiser: na Vicente você configura
                                                pacotes, define parcelamento no PIX e no boleto e acompanha tudo no dashboard.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <Link
                                                href="/venda-parcelada-no-boleto-e-no-pix"
                                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#f97316] hover:bg-[#ea6820] text-white hover:text-white font-semibold shadow-lg transition-all"
                                            >
                                                Conhecer venda parcelada
                                            </Link>
                                            <Link
                                                href="/venda-parcelada-no-boleto-e-no-pix#como-funciona"
                                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white   hover:text-white  font-semibold transition-all"
                                            >
                                                Ver como funciona
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Seção Fotos */}
                        <PhotosCarousel />
                    </>
                )}
            </main>
            <WelcomeModal />
        </>
    );
}
