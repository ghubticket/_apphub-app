'use client';

import Link from 'next/link';
import { HiOutlineHome, HiOutlineArrowLeft } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import BuyTicketButton from '@/components/shared/BuyTicketButton';

export default function NotFound() {
    return (
        <main className="pt-44 bg-gradient-to-br from-[#f5f1e8] via-[#faf7f0] to-[#ded7ca] flex items-center justify-center py-20 px-4">
            <Container className="max-w-2xl">
                <div className="text-center space-y-8">
                    {/* Ícone grande e animado */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="text-9xl md:text-[12rem] animate-bounce">
                                😢
                            </div>
                            <div className="absolute -top-4 -right-4 text-6xl md:text-8xl text-[#a38f78] animate-pulse font-bold">
                                4
                            </div>
                            <div className="absolute top-8 -left-4 text-6xl md:text-8xl text-[#a38f78] animate-pulse font-bold" style={{ animationDelay: '0.15s' }}>
                                0
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-6xl md:text-8xl text-[#a38f78] animate-pulse font-bold" style={{ animationDelay: '0.3s' }}>
                                4
                            </div>
                        </div>
                    </div>

                    {/* Título */}
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight text-[#1a1a1d]">
                            Ops! Página não encontrada
                        </h1>
                        <p className="text-lg md:text-xl text-[#4c4c55] max-w-md mx-auto">
                            Parece que você se perdeu no caminho! 🗺️
                        </p>
                    </div>

                    {/* Texto descontraído */}
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/80 p-8 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] space-y-4">
                        <p className="text-base md:text-lg text-[#1a1a1d] leading-relaxed">
                            Essa página foi para um lugar que não existe mais... ou talvez nunca tenha existido! 😅
                        </p>
                        <p className="text-sm md:text-base text-[#4c4c55]">
                            Mas não se preocupe! Ainda temos muitos eventos incríveis esperando por você.
                        </p>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-full border border-[#ded7ca] bg-white px-6 py-3 text-sm font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:bg-[#f97316] hover:border-[#f97316] hover:text-white"
                        >
                            <HiOutlineHome className="h-5 w-5" />
                            Voltar ao Início
                        </Link>

                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="inline-flex items-center gap-2 rounded-full border border-[#a38f78] bg-transparent px-6 py-3 text-sm font-semibold uppercase tracking-normal text-[#a38f78] transition hover:bg-[#a38f78] hover:text-white"
                        >
                            <HiOutlineArrowLeft className="h-5 w-5" />
                            Voltar
                        </button>
                    </div>

                    {/* Sugestão de eventos */}
                    <div className="">
                        <p className="text-sm text-[#7d796c] mb-4">
                            Ou que tal explorar nossos eventos?
                        </p>
                        <BuyTicketButton
                            href="/"
                            variant="primary"
                            size="md"
                        >
                            Ver Eventos
                        </BuyTicketButton>
                    </div>
                </div>
            </Container>
        </main>
    );
}

