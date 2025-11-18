'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Container from '@/components/shared/Container';
import TicketCatalog from '@/components/tickets/TicketCatalog';
import AboutSection from '@/components/home/AboutSection';
import { fetchTicketCatalog } from '@/lib/ticketsCatalog';
import type { TicketProduct } from '@/types/ticket';

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
    const [tickets, setTickets] = useState<TicketProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const loadHighlights = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const catalog = await fetchTicketCatalog({
                limitEvents: 6,
                limitTicketsPerEvent: 2,
                onlyWithAvailability: false,
            });
            setTickets(catalog.slice(0, 6));
        } catch (err: any) {
            console.error('Erro ao carregar destaques de ingressos', err);
            setError('Não foi possível carregar os destaques do momento. Tente novamente em instantes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHighlights();
    }, [loadHighlights]);

    const hasTickets = useMemo(() => tickets.length > 0, [tickets]);

    return (
        <main
            className="bg-[#f5f1e8]"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            {/* Seção Institucional Sobre a 5521 */}

            <Container className="py-16">
                <div className="mb-12 space-y-3 text-center md:text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        Experiências 5521
                    </span>
                    <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:justify-between">
                        <h1 className="text-4xl font-bold uppercase tracking-[0.25em] text-[#1a1a1d]">
                            Explore nossos ingressos
                        </h1>
                        <p className="max-w-xl text-sm text-[#4c4c55]">
                            Veja os ingressos em destaque e acompanhe disponibilidade em tempo real diretamente da nossa API.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-sm font-medium text-[#7d796c]">
                        Carregando destaques...
                    </div>
                ) : error ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                        {error}
                        <button
                            type="button"
                            className="mt-4 inline-flex items-center justify-center rounded-full border border-rose-400 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:border-[#f97316] hover:text-[#f97316]"
                            onClick={loadHighlights}
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : hasTickets ? (
                    <TicketCatalog tickets={tickets} />
                ) : (
                    <div className="rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-8 text-center text-sm text-[#7d796c]">
                        No momento não há ingressos em destaque. Retorne em breve para novas experiências.
                    </div>
                )}
            </Container>
        </main>
    );
}
