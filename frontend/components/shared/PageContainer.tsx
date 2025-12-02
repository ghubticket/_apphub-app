import { ReactNode } from 'react';
import Container from './Container';

interface PageContainerProps {
    children: ReactNode;
    /** Cor de fundo da página. Padrão: bg-[#faf7f0] */
    bgColor?: string;
    /** Padding top adicional em rem além do espaço do header fixo. Padrão: 2 (equivale a pt-8) */
    paddingTop?: number;
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
    paddingTop = 8,
    paddingBottom = 'pb-20',
    className = '',
    containerClassName = '',
    fullHeight = false,
}: PageContainerProps) {
    // Padding-top dinâmico: header height + padding adicional em rem
    // O header tem pt-4 (16px) + altura do conteúdo
    // A variável CSS --app-header-height é definida pelo Header component
    const mainStyles: React.CSSProperties = {
        paddingTop: `calc(var(--app-header-height, 120px) + ${paddingTop}rem)`,
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

