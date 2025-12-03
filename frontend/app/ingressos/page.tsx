'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import TicketCatalog from '@/components/tickets/TicketCatalog';
import PageContainer from '@/components/shared/PageContainer';
import DynamicMetadata from '@/components/seo/DynamicMetadata';
import StructuredData from '@/components/seo/StructuredData';
import type { TicketProduct } from '@/types/ticket';
import { fetchTicketCatalog } from '@/lib/ticketsCatalog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { generateBreadcrumbStructuredData } from '@/lib/seo';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<TicketProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    // OTIMIZAÇÃO: Usar useRef para evitar chamadas duplicadas
    const hasLoadedRef = useRef(false);
    
    const loadTickets = useCallback(async () => {
        // Evitar chamadas duplicadas (React Strict Mode, re-renders)
        if (hasLoadedRef.current) {
            return;
        }
        
        hasLoadedRef.current = true;
        setLoading(true);
        setError('');
        try {
            const catalog = await fetchTicketCatalog({
                limitEvents: 20,
                onlyWithAvailability: false,
            });
            setTickets(catalog);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ??
                    err?.message ??
                    'Não foi possível carregar os ingressos disponíveis. Tente novamente.',
            );
            hasLoadedRef.current = false; // Permitir retry em caso de erro
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const hasTickets = useMemo(() => tickets.length > 0, [tickets]);

    // Breadcrumb structured data
    const breadcrumbData = generateBreadcrumbStructuredData([
        { name: 'Início', url: '/' },
        { name: 'Ingressos', url: '/ingressos' },
    ]);

    return (
        <>
            <DynamicMetadata
                title="Ingressos Disponíveis"
                description="Escolha entre os melhores eventos disponíveis. Compre ingressos online com segurança e receba por email."
                url="/ingressos"
            />
            <StructuredData data={breadcrumbData} />
            <PageContainer 
            bgColor="bg-[#f5f1e8]" 
            fullHeight
            containerClassName="py-12"
        >
                <header className="mb-10 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        Ingressos disponíveis
                    </span>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-[#1a1a1d]">
                            Escolha sua experiência
                        </h1>
                        <p className="text-sm text-[#4c4c55]">
                            Selecione ingressos, ajuste quantidades e finalize a compra com poucos cliques.
                        </p>
                    </div>
                </header>

                <section className="space-y-6">
                    {loading ? (
                        <LoadingSpinner 
                            message="Carregando opções de ingressos..." 
                            submessage="Buscando os melhores eventos disponíveis"
                        />
                    ) : error ? (
                        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                            {error}
                            <button
                                type="button"
                                className="mt-4 inline-flex items-center justify-center rounded-full border border-rose-400 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:border-[#f97316] hover:text-[#f97316]"
                                onClick={loadTickets}
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : hasTickets ? (
                        <TicketCatalog tickets={tickets} />
                    ) : (
                        <div className="rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-8 text-center text-sm text-[#7d796c]">
                            Ainda não temos ingressos liberados. Volte em breve para garantir sua experiência.
                        </div>
                    )}
                </section>
        </PageContainer>
        </>
    );
}

