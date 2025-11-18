'use client';

import Image from 'next/image';
import Link from 'next/link';

interface AboutSectionProps {
    images?: Array<{
        src: string;
        alt: string;
    }>;
}

export default function AboutSection({ images = [] }: AboutSectionProps) {
    // Imagens padrão caso não sejam fornecidas
    const defaultImages = [
        {
            src: '/images/about/5521-1.jpg',
            alt: 'Evento 5521 - Experiência única',
        },
        {
            src: '/images/about/5521-2.jpg',
            alt: 'Festival 5521 - Música e cultura',
        },
        {
            src: '/images/about/5521-3.jpg',
            alt: '5521 - A mais carioca do mundo',
        },
    ];

    const displayImages = images.length > 0 ? images : defaultImages;

    return (
        <section className="relative overflow-hidden bg-[#faf7f0] py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                    {/* Conteúdo Textual - Lado Esquerdo */}
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-4">
                            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                                Sobre a 5521
                            </span>
                            <h2 className="text-4xl font-bold uppercase tracking-[0.05em] text-[#1a1a1d] lg:text-5xl">
                                A mais carioca do mundo
                            </h2>
                            <p className="text-base leading-relaxed text-[#6f6b63] lg:text-lg">
                                Nascida no coração do Rio de Janeiro, a 5521 é muito mais que uma banda. É um movimento cultural que celebra a música, a festa e o estilo de vida carioca. Com eventos que vão desde pool parties até bailes de carnaval, criamos experiências únicas que conectam pessoas através da música e da alegria.
                            </p>
                            <p className="text-base leading-relaxed text-[#6f6b63] lg:text-lg">
                                Nossa missão é levar a energia contagiante do Rio para o Brasil e o mundo, criando momentos inesquecíveis em cada evento. Vem com a gente viver essa experiência!
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Link
                                href="/ingressos"
                                className="inline-flex items-center justify-center rounded-full border-2 border-[#1a1a1d] bg-[#1a1a1d] px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#f97316] hover:border-[#f97316] hover:text-[#1a1a1d]"
                            >
                                Ver Eventos
                            </Link>
                            <Link
                                href="/agenda"
                                className="inline-flex items-center justify-center rounded-full border-2 border-[#1a1a1d] bg-transparent px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#1a1a1d] transition hover:bg-[#1a1a1d] hover:text-white"
                            >
                                Nossa Agenda
                            </Link>
                        </div>
                    </div>

                    {/* Grid de Imagens - Lado Direito */}
                    <div className="grid grid-cols-2 gap-4 lg:gap-6">
                        {/* Imagem Principal - Ocupa 2 colunas */}
                        <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-2xl border border-[#ded7ca] bg-[#f5f1e8] shadow-[0_20px_40px_-15px_rgba(26,26,29,0.15)]">
                            {displayImages[0] ? (
                                <Image
                                    src={displayImages[0].src}
                                    alt={displayImages[0].alt}
                                    fill
                                    className="object-cover transition-transform duration-500 hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca]">
                                    <span className="text-sm font-medium text-[#a38f78]">Imagem 1</span>
                                </div>
                            )}
                        </div>

                        {/* Imagem 2 - Canto inferior esquerdo */}
                        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-[#ded7ca] bg-[#f5f1e8] shadow-[0_20px_40px_-15px_rgba(26,26,29,0.15)]">
                            {displayImages[1] ? (
                                <Image
                                    src={displayImages[1].src}
                                    alt={displayImages[1].alt}
                                    fill
                                    className="object-cover transition-transform duration-500 hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#ded7ca] to-[#f5f1e8]">
                                    <span className="text-sm font-medium text-[#a38f78]">Imagem 2</span>
                                </div>
                            )}
                        </div>

                        {/* Imagem 3 - Canto inferior direito */}
                        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-[#ded7ca] bg-[#f5f1e8] shadow-[0_20px_40px_-15px_rgba(26,26,29,0.15)]">
                            {displayImages[2] ? (
                                <Image
                                    src={displayImages[2].src}
                                    alt={displayImages[2].alt}
                                    fill
                                    className="object-cover transition-transform duration-500 hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#f5f1e8] to-[#ded7ca]">
                                    <span className="text-sm font-medium text-[#a38f78]">Imagem 3</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

