'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiArrowRight, HiChevronLeft, HiChevronRight, HiOutlineCalendar, HiOutlineMapPin } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import BuyTicketButton from '@/components/shared/BuyTicketButton';

export type SlideType = 'video' | 'image';

export interface HeroSlide {
    type: SlideType;
    videoId?: string;
    imageUrl?: string;
    content: {
        header?: string | React.ReactNode;
        title: string | React.ReactNode;
        subtitle?: string | React.ReactNode;
        description?: string | React.ReactNode;
        ctaText?: string | React.ReactNode;
    };
    date?: string;
    formattedDate?: string;
    location?: string;
    city?: string;
    state?: string;
    ctaLink?: string;
    overlayOpacity?: number;
}

interface HeroCarouselProps {
    /**
     * Array de slides para o carrossel
     */
    slides: HeroSlide[];

    /**
     * Intervalo em milissegundos para autoplay (0 = desabilitado)
     * @default 5000
     */
    autoplayInterval?: number;
}

/**
 * Componente Hero Carousel com suporte para vídeo e imagens
 * Suporta múltiplos slides com navegação e autoplay
 */
export default function HeroCarousel({
    slides,
    autoplayInterval = 5000,
}: HeroCarouselProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isTextTransitioning, setIsTextTransitioning] = useState(false);
    // Usar array em vez de Set para evitar problemas de hidratação
    const [imageErrors, setImageErrors] = useState<number[]>([]);
    const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Obter URL base do site (client-side only)
    const getBaseUrl = useCallback(() => {
        if (typeof window === 'undefined') return '';
        return window.location.origin;
    }, []);
    
    // Estados para touch/swipe
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const minSwipeDistance = 50; // Distância mínima para considerar um swipe

    const currentSlideData = slides[currentSlide];

    // Construir URL do YouTube com parâmetros para autoplay, mute, sem controles, loop
    const getYoutubeUrl = useCallback((videoId: string) => {
        // Remover origin para evitar mismatch entre servidor e cliente
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3&showinfo=0`;
    }, []);

    // Navegação para slide anterior
    const goToPrevious = useCallback(() => {
        setIsTextTransitioning(true);
        setTimeout(() => {
            setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
            setTimeout(() => setIsTextTransitioning(false), 50);
        }, 300);
    }, [slides.length]);

    // Navegação para próximo slide
    const goToNext = useCallback(() => {
        setIsTextTransitioning(true);
        setTimeout(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
            setTimeout(() => setIsTextTransitioning(false), 50);
        }, 300);
    }, [slides.length]);

    // Ir para slide específico
    const goToSlide = useCallback((index: number) => {
        setIsTextTransitioning(true);
        setTimeout(() => {
            setCurrentSlide(index);
            setTimeout(() => setIsTextTransitioning(false), 50);
        }, 300);
    }, []);

    // Autoplay
    useEffect(() => {
        if (autoplayInterval <= 0 || slides.length <= 1) return;

        autoplayTimerRef.current = setInterval(() => {
            goToNext();
        }, autoplayInterval);

        return () => {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
            }
        };
    }, [autoplayInterval, goToNext, slides.length]);

    // Pausar autoplay ao interagir
    const pauseAutoplay = useCallback(() => {
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
    }, []);

    // Retomar autoplay após 5 segundos de inatividade
    const resumeAutoplay = useCallback(() => {
        if (autoplayInterval <= 0 || slides.length <= 1) return;
        pauseAutoplay();
        autoplayTimerRef.current = setInterval(() => {
            goToNext();
        }, autoplayInterval);
    }, [autoplayInterval, goToNext, pauseAutoplay, slides.length]);

    // Handlers para touch/swipe
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!touchStartX.current || !touchEndX.current) return;
        
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            goToNext();
            pauseAutoplay();
            setTimeout(resumeAutoplay, 5000);
        } else if (isRightSwipe) {
            goToPrevious();
            pauseAutoplay();
            setTimeout(resumeAutoplay, 5000);
        }
    }, [goToNext, goToPrevious, pauseAutoplay, resumeAutoplay]);

    useEffect(() => {
        // Marcar como carregado após um pequeno delay
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, [currentSlide]);

    // Tentar forçar o play no mobile após o iframe carregar (apenas para slides de vídeo)
    useEffect(() => {
        if (!isLoaded || currentSlideData.type !== 'video') return;

        const iframe = document.querySelector(`iframe[data-slide-index="${currentSlide}"]`) as HTMLIFrameElement;
        if (!iframe) return;

        const playTimer = setTimeout(() => {
            try {
                iframe.contentWindow?.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: 'playVideo',
                    }),
                    'https://www.youtube.com'
                );
            } catch (error) {
                // Erro silencioso ao tentar forçar play
            }
        }, 1000);

        return () => clearTimeout(playTimer);
    }, [isLoaded, currentSlide, currentSlideData.type]);

    if (!currentSlideData) return null;

    const overlayOpacity = currentSlideData.overlayOpacity ?? 0.5;

    return (
        <section
            className="relative md:hidden h-screen w-full overflow-hidden"
            onMouseEnter={pauseAutoplay}
            onMouseLeave={resumeAutoplay}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Slides */}
            <div className="absolute inset-0 z-0">
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity ease-in-out duration-700 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                            }`}
                    >
                        {slide.type === 'video' && slide.videoId ? (
                            <iframe
                                src={getYoutubeUrl(slide.videoId)}
                                data-slide-index={index}
                                className="absolute top-1/2 left-1/2 h-[56.25vw] w-[177.78vh] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    pointerEvents: 'none',
                                }}
                                allow="autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                title={`Vídeo de fundo - Slide ${index + 1}`}
                                loading={index === currentSlide ? 'eager' : 'lazy'}
                            />
                        ) : slide.type === 'image' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca]">
                                {!slide.imageUrl || imageErrors.includes(index) ? (
                                    <p className="text-center text-sm text-[#a38f78] px-4">
                                        IMAGEM em construção.
                                    </p>
                                ) : slide.imageUrl.startsWith('/api/images/') ? (
                                    // Para URLs do proxy, usar img normal (Next.js Image não funciona bem com rotas de API)
                                    <img
                                        src={slide.imageUrl}
                                        alt={`Slide ${index + 1}`}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        loading={index === currentSlide ? 'eager' : 'lazy'}
                                        onError={() => {
                                            setImageErrors((prev) => 
                                                prev.includes(index) ? prev : [...prev, index]
                                            );
                                        }}
                                    />
                                ) : (
                                    <Image
                                        src={slide.imageUrl}
                                        alt={`Slide ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        priority={index === currentSlide}
                                        sizes="100vw"
                                        onError={() => {
                                            setImageErrors((prev) => 
                                                prev.includes(index) ? prev : [...prev, index]
                                            );
                                        }}
                                    />
                                )}
                            </div>
                        ) : null}

                        {/* Overlay escuro tipo fumaça - gradiente de cima para baixo */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/90 " />
                    </div>
                ))}
            </div>

            {/* Conteúdo sobreposto */}
            <div className="relative z-10 flex h-full items-center">
                <Container className="w-full">
                    <div className={`flex flex-col text-white transition-opacity duration-500 ease-in-out ${isTextTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                        {/* Nome do evento */}
                        {currentSlideData.content.title && (
                            <h1 className="text-2xl font-bold uppercase leading-tight sm:text-3xl pb-4">
                                {currentSlideData.content.title}
                            </h1>
                        )}
                        
                        {/* Data e Local com ícones */}
                        <div className="mb-6 flex flex-wrap items-center gap-1 text-sm text-white drop-shadow-md md:text-base">
                            {/* Local */}
                            {(currentSlideData.location || (currentSlideData.city && currentSlideData.state)) && (
                                <div className="flex items-center gap-2 mt-0">
                                    <HiOutlineMapPin className="h-5 w-5 flex-shrink-0" />
                                    <span>
                                        {currentSlideData.location || `${currentSlideData.city}, ${currentSlideData.state}`}
                                    </span>
                                </div>
                            )}
                            {/* Data */}
                            {(currentSlideData.formattedDate || currentSlideData.date) && (
                                <div className="flex items-center gap-2 mt-0">
                                    <HiOutlineCalendar className="h-5 w-5 flex-shrink-0" />
                                    <span>
                                        {currentSlideData.formattedDate ||
                                            (currentSlideData.date
                                                ? new Date(currentSlideData.date).toLocaleDateString('pt-BR', {
                                                      day: 'numeric',
                                                      month: 'long',
                                                      year: 'numeric',
                                                  })
                                                : '')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Botão para ingressos */}
                        {currentSlideData.ctaLink && (
                            <BuyTicketButton
                                href={currentSlideData.ctaLink}
                                variant="primary"
                                size="md"
                                className="max-w-fit"
                            />
                        )}
                    </div>
                </Container>
            </div>

            {/* Navegação - Setas e Indicadores */}
            {slides.length > 1 && (
                <div className="absolute bottom-6 right-6 z-10 flex items-center gap-4 md:bottom-8 md:right-8">
                    {/* Indicadores de slide (bullets) - estilo bullseye */}
                    <div className="flex items-center gap-2">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => {
                                    goToSlide(index);
                                    pauseAutoplay();
                                    setTimeout(resumeAutoplay, 5000);
                                }}
                                className="relative h-3 w-3 rounded-full border-2 border-white bg-white transition-all hover:scale-110"
                                aria-label={`Ir para slide ${index + 1}`}
                            >
                                {/* Centro branco (bullseye) */}
                                <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                            </button>
                        ))}
                    </div>

                    {/* Setas de navegação */}
                    <div className="flex items-center gap-2">
                        {/* Seta esquerda */}
                        <button
                            type="button"
                            onClick={() => {
                                goToPrevious();
                                pauseAutoplay();
                                setTimeout(resumeAutoplay, 5000);
                            }}
                            className="rounded-full border-2 border-white bg-transparent p-2 text-white transition-all hover:bg-white/20"
                            aria-label="Slide anterior"
                        >
                            <HiChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                        </button>

                        {/* Seta direita */}
                        <button
                            type="button"
                            onClick={() => {
                                goToNext();
                                pauseAutoplay();
                                setTimeout(resumeAutoplay, 5000);
                            }}
                            className="rounded-full border-2 border-white bg-transparent p-2 text-white transition-all hover:bg-white/20"
                            aria-label="Próximo slide"
                        >
                            <HiChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Indicador de carregamento */}
            {!isLoaded && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                </div>
            )}
        </section>
    );
}

