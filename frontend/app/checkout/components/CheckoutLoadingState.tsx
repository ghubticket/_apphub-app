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
    const hasShownLoadingRef = useRef(false);
    const orderLoadingRef = useRef(orderLoading);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Logs para debug
    useEffect(() => {
        console.log('[CheckoutLoadingState] 🔄 Props mudaram:', {
            cartLoading,
            orderLoading,
            showLoading,
            timestamp: new Date().toISOString(),
        });
    }, [cartLoading, orderLoading, showLoading]);

    // Efeito para manter o loading visível quando orderLoading for true
    useEffect(() => {
        console.log('[CheckoutLoadingState] ⚙️ useEffect executado:', {
            orderLoading,
            previousOrderLoading: orderLoadingRef.current,
            showLoading,
            hasShownLoading: hasShownLoadingRef.current,
        });

        // Se orderLoading mudou para true, ativar loading
        if (orderLoading && !orderLoadingRef.current) {
            console.log('[CheckoutLoadingState] ✅ orderLoading mudou para TRUE - ativando loading');
            setShowLoading(true);
            hasShownLoadingRef.current = true;
            
            // Limpar timer anterior se existir
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            
            // Timer de 10 segundos para visualização
            timerRef.current = setTimeout(() => {
                console.log('[CheckoutLoadingState] ⏰ Timer de 10s expirado - desativando loading');
                setShowLoading(false);
                timerRef.current = null;
            }, 10000);
        }
        
        // Se orderLoading mudou para false, mas ainda não passou o tempo mínimo
        if (!orderLoading && orderLoadingRef.current && hasShownLoadingRef.current) {
            console.log('[CheckoutLoadingState] ⚠️ orderLoading mudou para FALSE, mas mantendo loading por mais tempo');
            // Não desativar imediatamente, deixar o timer gerenciar
        }

        // Atualizar ref
        orderLoadingRef.current = orderLoading;

        return () => {
            if (timerRef.current) {
                console.log('[CheckoutLoadingState] 🧹 Limpando timer no cleanup');
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [orderLoading]);

    // Determinar qual loading mostrar
    const shouldShowFullscreen = orderLoading || showLoading;
    
    console.log('[CheckoutLoadingState] 🎨 Renderizando:', {
        shouldShowFullscreen,
        orderLoading,
        showLoading,
        cartLoading,
    });

    // Se estiver criando pedido, mostrar loading fullscreen
    if (shouldShowFullscreen) {
        console.log('[CheckoutLoadingState] 📺 Mostrando FullscreenOrderLoading');
        return <FullscreenOrderLoading />;
    }

    // Se estiver carregando carrinho, mostrar loading normal
    if (cartLoading) {
        console.log('[CheckoutLoadingState] 📺 Mostrando loading normal do carrinho');
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
    console.log('[CheckoutLoadingState] ⚠️ Nenhum loading ativo - retornando null');
    return null;
});

