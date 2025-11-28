'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Container from '@/components/shared/Container';
import AboutSection from '@/components/home/AboutSection';
import EventCarousel from '@/components/home/EventCarousel';
import { fetchEventsList, type EventSummary } from '@/lib/ticketsCatalog';
import { APP_NAME } from '@/lib/config';

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

    return (
        <main
            className="h-full pt-36 bg-[#f5f1e8]"
        >
            {/* Seção Institucional Sobre a {APP_NAME} */}


            <Container className="py-16">
                <div className="mb-12 space-y-3 text-center md:text-left"><h1>teste</h1></div>
            </Container>

            <Container className="py-16 hidden">
                <div className="mb-12 space-y-3 text-center md:text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        {APP_NAME}
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
                        Carregando eventos...
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
                ) : hasEvents ? (
                    <EventCarousel events={events} />
                ) : (
                    <div className="rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-8 text-center text-sm text-[#7d796c]">
                        No momento não há eventos disponíveis. Retorne em breve para novas experiências.
                    </div>
                )}
            </Container>
        </main>
    );
}
