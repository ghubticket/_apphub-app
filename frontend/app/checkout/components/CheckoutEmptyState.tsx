'use client';

import React from 'react';
import Container from '@/components/shared/Container';
import { CheckoutHeader } from './CheckoutHeader';

/**
 * Componente para exibir estado vazio do carrinho no checkout
 * Extraído do CheckoutLayout para melhor organização
 * OTIMIZADO: Usa React.memo para evitar re-renders desnecessários
 */
export const CheckoutEmptyState = React.memo(function CheckoutEmptyState() {
    return (
        <main className="bg-[#f5f1e8]" style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">
               
                <div className="rounded-3xl border border-dashed border-[#ded7ca] bg-white/70 p-10 text-center text-sm text-[#7d796c]">
                    <p>Seu carrinho está vazio. Selecione os ingressos desejados.</p>
                </div>
            </Container>
        </main>
    );
});

