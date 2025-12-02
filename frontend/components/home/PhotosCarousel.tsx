'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

type PhotosCarouselProps = {
    photos?: string[];
    title?: string;
    subtitle?: string;
    viewAllLink?: string;
    className?: string;
};

// Fotos padrão se não forem fornecidas
const DEFAULT_PHOTOS = [
    '/images/03.02cdmbrunocavaalcanti-shakeitbsb-18.jpg',
    '/images/03.02cdmbrunocavaalcanti-shakeitbsb-197.jpg',
    '/images/Copia-de-22.04-meskla-brunocavaalcanti-shakeit-57.jpg',
    '/images/Copia-de-22.04-meskla-fercoutinho-shakeit-270.jpg',
    '/images/_ (1).jpg',
    '/images/_ (2).jpg',
    '/images/_ (3).jpg',
    '/images/_ (4).jpg',
];

export default function PhotosCarousel({
    photos = DEFAULT_PHOTOS,
    title = 'Fotos do Rolê!',
    subtitle = 'Navegue pela galeria para reviver esses momentos e compartilhar o espírito dos nossos eventos!',
    viewAllLink = '/fotos',
    className = '',
}: PhotosCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);

    // Número de fotos visíveis por vez
    const photosPerView = 4;
    const totalSlides = Math.ceil(photos.length / photosPerView);

    // Autoplay
    useEffect(() => {
        if (totalSlides > 1) {
            autoplayRef.current = setInterval(() => {
                setIsTransitioning(true);
                setTimeout(() => {
                    setCurrentIndex((prev) => (prev + 1) % totalSlides);
                    setTimeout(() => setIsTransitioning(false), 50);
                }, 300);
            }, 5000);
        }

        return () => {
            if (autoplayRef.current) {
                clearInterval(autoplayRef.current);
            }
        };
    }, [totalSlides]);

    const goToSlide = (index: number) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setTimeout(() => setIsTransitioning(false), 50);
        }, 300);
        if (autoplayRef.current) {
            clearInterval(autoplayRef.current);
        }
        autoplayRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % totalSlides);
        }, 5000);
    };

    const goToPrevious = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
            setTimeout(() => setIsTransitioning(false), 50);
        }, 300);
        if (autoplayRef.current) {
            clearInterval(autoplayRef.current);
        }
        autoplayRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % totalSlides);
        }, 5000);
    };

    const goToNext = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % totalSlides);
            setTimeout(() => setIsTransitioning(false), 50);
        }, 300);
        if (autoplayRef.current) {
            clearInterval(autoplayRef.current);
        }
        autoplayRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % totalSlides);
        }, 5000);
    };

    // Touch handlers para mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            goToNext();
        }
        if (isRightSwipe) {
            goToPrevious();
        }
    };

    // Calcular quais fotos mostrar no slide atual
    const getVisiblePhotos = () => {
        const start = currentIndex * photosPerView;
        const end = start + photosPerView;
        return photos.slice(start, end);
    };

    const visiblePhotos = getVisiblePhotos();

    return (
        <section className={`bg-gradient-to-b from-[#1a1a1d] to-[#0a0a0d] py-16 ${className}`}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <h2 className="text-4xl font-bold uppercase tracking-wide text-white md:text-5xl">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="max-w-md text-sm leading-relaxed text-white/80 md:text-base">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Carrossel Container */}
                <div className="relative">
                    {/* Fotos Grid */}
                    <div
                        className="relative overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 transition-opacity duration-500 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                            {visiblePhotos.map((photo, index) => {
                                const globalIndex = currentIndex * photosPerView + index;
                                return (
                                    <div
                                        key={`${globalIndex}-${photo}`}
                                        className="group relative aspect-square overflow-hidden rounded-lg bg-gray-800"
                                    >
                                        <Image
                                            src={photo}
                                            alt={`Foto ${globalIndex + 1}`}
                                            fill
                                            className="object-cover transition-all duration-500 group-hover:scale-110"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                            unoptimized={photo.startsWith('http') || photo.startsWith('https')}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    {totalSlides > 1 && (
                        <>
                            <button
                                onClick={goToPrevious}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full border-2 border-white/50 bg-black/50 p-2 text-white transition-all hover:border-white hover:bg-black/70 md:-translate-x-6"
                                aria-label="Foto anterior"
                            >
                                <HiChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                                onClick={goToNext}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full border-2 border-white/50 bg-black/50 p-2 text-white transition-all hover:border-white hover:bg-black/70 md:translate-x-6"
                                aria-label="Próxima foto"
                            >
                                <HiChevronRight className="h-6 w-6" />
                            </button>
                        </>
                    )}
                </div>

                {/* Pagination Dots */}
                {totalSlides > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        {Array.from({ length: totalSlides }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-3 w-3 rounded-full border-2 transition-all ${
                                    index === currentIndex
                                        ? 'border-white bg-white'
                                        : 'border-white/50 bg-transparent hover:border-white/75'
                                }`}
                                aria-label={`Ir para slide ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

