'use client';

import { ReactNode, useEffect, useState } from 'react';
import Container from './Container';

type ResponsivePaddingTop = number | { mobile: number; desktop: number };

interface PageContainerProps {
    children: ReactNode;
    /** Cor de fundo da página. Padrão: bg-[#faf7f0] */
    bgColor?: string;
    /**
     * Padding top adicional em rem além do espaço do header fixo.
     * - number: mesmo valor para todas as larguras (comportamento antigo)
     * - { mobile, desktop }: valores diferentes para mobile (<1024px) e desktop (>=1024px)
     * Padrão responsivo: { mobile: 5, desktop: 8 }
     */
    paddingTop?: ResponsivePaddingTop;
    /** Padding bottom. Padrão: pb-20 (80px) */
    paddingBottom?: string;
    /** Classes adicionais para o elemento main */
    className?: string;
    /** Classes adicionais para o Container interno */
    containerClassName?: string;
    /** Se true, usa minHeight baseado no header height. Padrão: false */
    fullHeight?: boolean;
}

/**
 * Container base para todas as páginas do frontend.
 * Gerencia automaticamente o padding-top para o header fixo e inclui o Container interno.
 * 
 * O padding-top é calculado dinamicamente: header height + padding adicional.
 * A variável CSS --app-header-height é definida pelo Header component.
 * 
 * @example
 * <PageContainer bgColor="bg-[#f5f1e8]" paddingTop={2}>
 *   <h1>Conteúdo da página</h1>
 * </PageContainer>
 */
export default function PageContainer({
    children,
    bgColor = 'bg-[#faf7f0]',
    paddingTop,
    paddingBottom = 'pb-20',
    className = '',
    containerClassName = '',
    fullHeight = false,
}: PageContainerProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updateIsMobile = () => {
            if (typeof window !== 'undefined') {
                setIsMobile(window.innerWidth < 1024);
            }
        };

        updateIsMobile();
        window.addEventListener('resize', updateIsMobile);

        return () => {
            window.removeEventListener('resize', updateIsMobile);
        };
    }, []);

    const resolvePaddingTop = (value: ResponsivePaddingTop | undefined): number => {
        // Sem valor explícito: usar padrão responsivo global
        if (value === undefined) {
            return isMobile ? 5 : 8;
        }

        // Valor numérico: mesmo padding em todas as larguras (comportamento antigo)
        if (typeof value === 'number') {
            return value;
        }

        // Objeto responsivo
        return isMobile ? value.mobile : value.desktop;
    };

    const effectivePaddingTop = resolvePaddingTop(paddingTop);

    // Padding-top dinâmico: header height + padding adicional em rem
    // A variável CSS --app-header-height é definida pelo Header component
    const mainStyles: React.CSSProperties = {
        paddingTop: `calc(var(--app-header-height, 120px) + ${effectivePaddingTop}rem)`,
    };

    if (fullHeight) {
        mainStyles.minHeight = 'calc(100vh - var(--app-header-height, 0px))';
    }

    return (
        <main
            className={`${bgColor} ${paddingBottom} ${className}`}
            style={mainStyles}
        >
            <Container className={containerClassName}>
                {children}
            </Container>
        </main>
    );
}

