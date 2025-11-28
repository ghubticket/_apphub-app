'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HiArrowRight } from 'react-icons/hi2';
import Container from '@/components/shared/Container';

interface HeroVideoProps {
    /**
     * ID do vídeo do YouTube (ex: "dQw4w9WgXcQ" de https://www.youtube.com/watch?v=dQw4w9WgXcQ)
     */
    videoId: string;

    /**
     * Link do botão CTA
     */
    ctaLink?: string;

    /**
     * Overlay escuro para melhorar legibilidade do texto (0-1)
     * @default 0.4
     */
    overlayOpacity?: number;
}

/**
 * Componente Hero com vídeo de fundo do YouTube
 * Vídeo roda automaticamente, sem som, sem controles, em loop
 */
export default function HeroVideo({
    videoId,
    ctaLink = '/ingressos',
    overlayOpacity = 0.4,
}: HeroVideoProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    // Construir URL do YouTube com parâmetros para autoplay, mute, sem controles, loop
    const youtubeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3&showinfo=0`;

    useEffect(() => {
        // Marcar como carregado após um pequeno delay para garantir que o iframe está pronto
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="relative h-screen w-full overflow-hidden">
            {/* Vídeo de fundo do YouTube */}
            <div className="absolute inset-0 z-0">
                <iframe
                    src={youtubeUrl}
                    className="absolute top-1/2 left-1/2 h-[56.25vw] w-[177.78vh] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                        // Garantir que o vídeo cubra toda a área (cover effect)
                        // Para telas largas (landscape): altura = 56.25vw (mantém 16:9)
                        // Para telas altas (portrait): largura = 177.78vh (mantém 16:9)
                        // min-h-full e min-w-full garantem cobertura total
                        pointerEvents: 'none',
                    }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Vídeo de fundo"
                    loading="eager"
                />

                {/* Overlay escuro com blur para melhorar legibilidade */}
                <div
                    className="absolute inset-0 bg-black/70 backdrop-blur-lg"
                    style={{ opacity: overlayOpacity }}
                />
                {/* Camada adicional de blur para mais refinamento */}
                <div
                    className="absolute inset-0 backdrop-blur-sm"
                />
            </div>

            {/* Conteúdo sobreposto */}
            <div className="relative z-10 flex h-full items-center">
                <Container className="w-full">
                    <div className="text-white">
                        <h1 className="leading-none mb-0 text-4xl uppercase pb-5 tracking-wide drop-shadow-lg md:text-6xl lg:text-6xl">
                            <span className="font-light text-white">Pagode do</span>{' '}
                            <span className="font-bold text-[#f97316]">Príncipe</span>{' '}
                            <span className="font-light text-white">Apresenta:</span>
                        </h1>

                        <p className="leading-none mb-8 text-lg drop-shadow-md md:text-xl lg:text-2xl">
                            <span className="font-bold">Festa do Branco</span> com <span className="font-light">Suel,</span> <br /> 
                            <span className="font-light">Bruno Diegues, BG e Davi Quaresma</span> 😍
                        </p>

                        <p className="leading-none pb-5 text-base md:text-lg drop-shadow-md font-light">
                            Só quem viveu o 1º Bloquinho sabe!
                            Agora imagina <span className="font-bold">Nattan, Felipe Amorim e Léo Foguete</span> no mesmo palco?
                            Dia 31 de janeiro, o caos tá liberado, diversão, energia e aquela baguncinha boa que a gente ama.
                        </p>

                        <p className="mb-8 text-base md:text-lg drop-shadow-md font-light">
                            Garante teu ingresso e vem pro Bloquinho 😎
                        </p>

                        {ctaLink && (
                            <Link
                                href={ctaLink}
                                className="group inline-flex mt-0 items-center gap-4 rounded-full border-2 border-green-400 bg-green-600 px-8 py-2 text-base font-semibold uppercase tracking-wide text-white transition-all hover:bg-green-700 hover:border-green-300 md:px-10 md:py-5 md:text-lg"
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

            {/* Indicador de carregamento (opcional) */}
            {!isLoaded && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                </div>
            )}
        </section>
    );
}

