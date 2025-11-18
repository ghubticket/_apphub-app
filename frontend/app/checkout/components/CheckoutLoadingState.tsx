'use client';

import React, { useMemo } from 'react';
import Container from '@/components/shared/Container';

interface CheckoutLoadingStateProps {
    cartLoading: boolean;
    orderLoading: boolean;
}

/**
 * Componente para exibir estado de loading no checkout
 * Extraído do CheckoutLayout para melhor organização
 * OTIMIZADO: Usa React.memo e useMemo para evitar re-renders desnecessários
 */
export const CheckoutLoadingState = React.memo(function CheckoutLoadingState({ cartLoading, orderLoading }: CheckoutLoadingStateProps) {
    const loadingMessage = useMemo(() => {
        return cartLoading ? 'Carregando resumo do carrinho...' : 'Criando pedido...';
    }, [cartLoading]);

    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">
                <div className="rounded-3xl border border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                    {loadingMessage}
                </div>
            </Container>
        </main>
    );
});

