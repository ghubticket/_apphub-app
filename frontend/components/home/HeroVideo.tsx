'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiArrowRight, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import Container from '@/components/shared/Container';

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
    const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

    const currentSlideData = slides[currentSlide];

    // Construir URL do YouTube com parâmetros para autoplay, mute, sem controles, loop
    const getYoutubeUrl = useCallback((videoId: string) => {
        // Remover origin para evitar mismatch entre servidor e cliente
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3&showinfo=0`;
    }, []);

    // Navegação para slide anterior
    const goToPrevious = useCallback(() => {
        setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    }, [slides.length]);

    // Navegação para próximo slide
    const goToNext = useCallback(() => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, [slides.length]);

    // Ir para slide específico
    const goToSlide = useCallback((index: number) => {
        setCurrentSlide(index);
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
                console.log('Erro ao tentar forçar play:', error);
            }
        }, 1000);

        return () => clearTimeout(playTimer);
    }, [isLoaded, currentSlide, currentSlideData.type]);

    if (!currentSlideData) return null;

    const overlayOpacity = currentSlideData.overlayOpacity ?? 0.5;

    return (
        <section
            className="relative h-screen w-full overflow-hidden"
            onMouseEnter={pauseAutoplay}
            onMouseLeave={resumeAutoplay}
        >
            {/* Slides */}
            <div className="absolute inset-0 z-0">
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
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
                        ) : slide.type === 'image' && slide.imageUrl ? (
                            <div className="absolute inset-0">
                                <Image
                                    src={slide.imageUrl}
                                    alt={`Slide ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    priority={index === currentSlide}
                                    unoptimized={slide.imageUrl.startsWith('http') || slide.imageUrl.startsWith('https')}
                                    sizes="100vw"
                                    onError={(e) => {
                                        console.error('Erro ao carregar imagem do slide:', slide.imageUrl, e);
                                    }}
                                />
                            </div>
                        ) : null}

                        {/* Overlay escuro tipo fumaça para destacar textos */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
                        {/* Overlay adicional com blur para mais refinamento */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                        {/* Camada de fumaça mais intensa na área do texto (lado esquerdo) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                    </div>
                ))}
            </div>

            {/* Conteúdo sobreposto */}
            <div className="relative z-10 flex h-full items-center">
                <Container className="w-full">
                    <div className="text-white">
                        {currentSlideData.content.header && (
                            <p className="mb-2 text-xl font-semibold uppercase tracking-wide text-yellow-400 drop-shadow-md md:text-base">
                                {currentSlideData.content.header}
                            </p>
                        )}
                        <h1 className="leading-none mb-0 text-2xl font-bold uppercase pb-5 tracking-wide drop-shadow-lg md:text-6xl lg:text-6xl">
                            {currentSlideData.content.title}
                        </h1>

                        {currentSlideData.content.subtitle && (
                            <p className="leading-none mb-8 text-sm drop-shadow-md md:text-xl lg:text-2xl">
                                {currentSlideData.content.subtitle}
                            </p>
                        )}

                        {currentSlideData.content.description && (
                            <p className="leading-none pb-5 text-sm md:text-lg drop-shadow-md font-light">
                                {currentSlideData.content.description}
                            </p>
                        )}

                        {currentSlideData.content.ctaText && (
                            <p className="mb-8 text-sm md:text-lg drop-shadow-md font-light">
                                {currentSlideData.content.ctaText}
                            </p>
                        )}

                        {currentSlideData.ctaLink && (
                            <Link
                                href={currentSlideData.ctaLink}
                                className="group inline-flex mt-0 items-center gap-2 rounded-full border-2 border-green-400 bg-green-600 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-all hover:bg-green-700 hover:border-green-300 md:px-10 md:py-5 md:text-lg"
                            >
                                <span>Comprar Ingresso</span>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-500 bg-green-500 transition-all group-hover:bg-green-400 group-hover:border-green-300">
                                    <HiArrowRight className="h-5 w-5 text-white" />
                                </span>
                            </Link>
                        )}
                    </div>
                </Container>
            </div>

            {/* Navegação - Setas e Indicadores */}
            {slides.length > 1 && (
                <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 md:bottom-8">
                    {/* Seta esquerda */}
                    <button
                        type="button"
                        onClick={() => {
                            goToPrevious();
                            pauseAutoplay();
                            setTimeout(resumeAutoplay, 5000);
                        }}
                        className="rounded-full border-2 border-white/50 bg-transparent p-2 text-white transition-all hover:border-white hover:bg-white/10"
                        aria-label="Slide anterior"
                    >
                        <HiChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </button>

                    {/* Indicadores de slide (bullets) */}
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
                                className={`rounded-full transition-all ${index === currentSlide
                                        ? 'h-2 w-8 bg-white'
                                        : 'h-2 w-2 bg-black border-2 border-white/50 hover:border-white hover:bg-white/30'
                                    }`}
                                aria-label={`Ir para slide ${index + 1}`}
                            />
                        ))}
                    </div>

                    {/* Seta direita */}
                    <button
                        type="button"
                        onClick={() => {
                            goToNext();
                            pauseAutoplay();
                            setTimeout(resumeAutoplay, 5000);
                        }}
                        className="rounded-full border-2 border-white/50 bg-transparent p-2 text-white transition-all hover:border-white hover:bg-white/10"
                        aria-label="Próximo slide"
                    >
                        <HiChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
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

