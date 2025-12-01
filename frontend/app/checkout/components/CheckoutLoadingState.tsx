'use client';

import React, { useState, useEffect, useRef } from 'react';
import Container from '@/components/shared/Container';

interface CheckoutLoadingStateProps {
    cartLoading: boolean;
    orderLoading: boolean;
}

/**
 * Componente de loading fullscreen para criação de pedido
 */
function FullscreenOrderLoading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f5f1e8]/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
                {/* Spinner animado */}
                <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#ded7ca] border-t-[#f97316]"></div>
                    <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-[#f97316] opacity-20"></div>
                </div>
                
                {/* Mensagem */}
                <div className="text-center">
                    <p className="text-lg font-semibold text-[#1a1a1d]">Criando pedido...</p>
                    <p className="mt-2 text-sm text-[#7d796c]">Aguarde enquanto processamos sua solicitação</p>
                </div>
            </div>
        </div>
    );
}

/**
 * Componente para exibir estado de loading no checkout
 * Extraído do CheckoutLayout para melhor organização
 * OTIMIZADO: Usa React.memo e useMemo para evitar re-renders desnecessários
 * 
 * Quando orderLoading é true, exibe um loading fullscreen
 * Quando cartLoading é true, exibe o loading normal
 * 
 * TEMPORÁRIO: setTimeout de 10 segundos para visualização
 */
export const CheckoutLoadingState = React.memo(function CheckoutLoadingState({ cartLoading, orderLoading }: CheckoutLoadingStateProps) {
    const [showLoading, setShowLoading] = useState(false);
    const orderLoadingRef = useRef(orderLoading);

    // Efeito para manter o loading visível somente enquanto orderLoading for true
    // Sem timeouts adicionais: o backend é a fonte de verdade
    useEffect(() => {
        // Se orderLoading mudou para true, ativar loading
        if (orderLoading) {
            setShowLoading(true);
        } else {
            setShowLoading(false);
        }

        // Atualizar ref
        orderLoadingRef.current = orderLoading;
    }, [orderLoading]);

    // Determinar qual loading mostrar
    // Mostrar loading somente enquanto o pedido está efetivamente sendo criado
    const shouldShowFullscreen = orderLoading && showLoading;

    // Se estiver criando pedido, mostrar loading fullscreen
    if (shouldShowFullscreen) {
        return <FullscreenOrderLoading />;
    }

    // Se estiver carregando carrinho, mostrar loading normal
    if (cartLoading) {
        return (
            <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
                <Container className="py-12">
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                        Carregando resumo do carrinho...
                    </div>
                </Container>
            </main>
        );
    }

    // Não deveria chegar aqui, mas por segurança
    return null;
});

