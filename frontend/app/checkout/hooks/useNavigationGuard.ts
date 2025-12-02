'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface UseNavigationGuardOptions {
    enabled: boolean;
    onNavigationAttempt: () => void;
    allowedPaths?: string[]; // Paths que não devem ser bloqueados
}

/**
 * Hook para interceptar navegação quando há pedido PENDING
 * REFATORADO: Substitui lógica de reserva - agora protege pedidos
 */
export function useNavigationGuard({ enabled, onNavigationAttempt, allowedPaths = [] }: UseNavigationGuardOptions) {
    const router = useRouter();
    const pathname = usePathname();
    const isNavigatingRef = useRef(false);
    const prevPathnameRef = useRef<string | null>(null);

    // Detectar mudança de pathname (navegação interna)
    useEffect(() => {
        if (!enabled) {
            prevPathnameRef.current = pathname;
            return;
        }

        const currentPath = pathname;
        const prevPath = prevPathnameRef.current;

        // Se estava no checkout e agora não está mais
        if (prevPath === '/checkout' && currentPath !== '/checkout') {
            // CRÍTICO: Verificar flag global que permite navegação (ex: QR code PIX gerado)
            if (typeof window !== 'undefined' && (window as any).__ALLOW_NAVIGATION__) {
                prevPathnameRef.current = currentPath;
                return;
            }
            
            // Verificar se o novo path é permitido
            const isAllowed = allowedPaths.some(allowed => currentPath.startsWith(allowed));
            
            
            if (!isAllowed && !isNavigatingRef.current) {
                // Cancelar navegação voltando para checkout
                window.history.pushState(null, '', '/checkout');
                // Pequeno delay para garantir que o estado foi atualizado
                setTimeout(() => {
                    onNavigationAttempt();
                }, 0);
            }
        }

        prevPathnameRef.current = currentPath;
    }, [pathname, enabled, onNavigationAttempt, allowedPaths]);

    // Interceptar cliques em links
    useEffect(() => {
        if (!enabled) return;

        const handleLinkClick = (e: MouseEvent) => {
            // CRÍTICO: Verificar flag global que permite navegação (ex: QR code PIX gerado)
            if (typeof window !== 'undefined' && (window as any).__ALLOW_NAVIGATION__) {
                return; // Permitir navegação sem bloquear
            }
            
            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link) {
                const href = link.getAttribute('href') || link.href;
                
                // Ignorar links externos, protocolos especiais e links permitidos
                if (
                    href &&
                    !href.includes('/checkout') &&
                    !href.startsWith('http') &&
                    !href.startsWith('mailto:') &&
                    !href.startsWith('tel:') &&
                    !href.startsWith('#') &&
                    !allowedPaths.some(allowed => href.startsWith(allowed)) &&
                    !isNavigatingRef.current
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigationAttempt();
                }
            }
        };

        document.addEventListener('click', handleLinkClick, true);

        return () => {
            document.removeEventListener('click', handleLinkClick, true);
        };
    }, [enabled, onNavigationAttempt, allowedPaths]);

    // Interceptar beforeunload (fechar aba/navegador)
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // CRÍTICO: Verificar se há uma flag global que permite navegação
            // Isso é usado quando o pagamento é aprovado e queremos redirecionar sem alerta
            if (typeof window !== 'undefined' && (window as any).__ALLOW_NAVIGATION__) {
                // Não fazer nada - permite navegação sem alerta
                return;
            }
            
            e.preventDefault();
            e.returnValue = 'Você tem um pedido pendente. Deseja realmente sair?';
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [enabled]);

    // Wrapper para router.push que intercepta navegação
    const guardedPush = useCallback((url: string) => {
        // CRÍTICO: Verificar flag global que permite navegação (ex: QR code PIX gerado)
        if (typeof window !== 'undefined' && (window as any).__ALLOW_NAVIGATION__) {
            isNavigatingRef.current = true;
            return router.push(url);
        }
        
        if (!enabled || url.includes('/checkout') || allowedPaths.some(allowed => url.startsWith(allowed))) {
            isNavigatingRef.current = true;
            return router.push(url);
        }
        
        onNavigationAttempt();
        return Promise.resolve();
    }, [enabled, router, onNavigationAttempt, allowedPaths]);

    return {
        guardedPush,
        isNavigating: isNavigatingRef.current,
    };
}

