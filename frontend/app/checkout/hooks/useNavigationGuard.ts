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
            // Verificar se o novo path é permitido
            const isAllowed = allowedPaths.some(allowed => currentPath.startsWith(allowed));
            
            console.log('[useNavigationGuard] 🚫 Tentativa de sair do checkout detectada:', {
                prevPath,
                currentPath,
                isAllowed,
                isNavigating: isNavigatingRef.current,
            });
            
            if (!isAllowed && !isNavigatingRef.current) {
                // Cancelar navegação voltando para checkout
                console.log('[useNavigationGuard] ⛔ Bloqueando navegação, voltando para checkout');
                window.history.pushState(null, '', '/checkout');
                // Pequeno delay para garantir que o estado foi atualizado
                setTimeout(() => {
                    console.log('[useNavigationGuard] 🔔 Chamando onNavigationAttempt para mostrar modal');
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
                    console.log('[useNavigationGuard] 🔗 Link clicado bloqueado:', {
                        href,
                        enabled,
                    });
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

