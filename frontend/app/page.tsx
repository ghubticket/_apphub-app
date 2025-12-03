'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Container from '@/components/shared/Container';
import EventCarousel from '@/components/home/EventCarousel';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import PhotosCarousel from '@/components/home/PhotosCarousel';
import HeroCarousel, { type HeroSlide } from '@/components/home/HeroVideo';
import StructuredData from '@/components/seo/StructuredData';
import { fetchEventsList, type EventSummary } from '@/lib/ticketsCatalog';
import { APP_NAME } from '@/lib/config';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { generateBreadcrumbStructuredData } from '@/lib/seo';

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

                        {/* Seção Fotos */}
                        <PhotosCarousel />
                    </>
                )}
            </main>
        </>
    );
}
