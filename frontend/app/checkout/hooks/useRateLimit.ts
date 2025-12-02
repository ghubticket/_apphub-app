'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseRateLimitOptions {
    lastCreateTimeRef: React.MutableRefObject<number>;
    setError: (error: string | null) => void;
}

interface UseRateLimitReturn {
    isBlocked: () => boolean;
    getRemainingSeconds: () => number | null;
    handleRateLimitError: (statusCode: number, orderIdRef: React.MutableRefObject<string | null>, cachedOrderIdFromStorageRef: React.MutableRefObject<string | null>, setOrder: (order: any) => null, clearOrderRelated: () => void) => void;
    resetBlock: () => void;
    rateLimitRemainingSeconds: number | null;
}

/**
 * Hook para gerenciar rate limiting de criação de pedidos
 * Inclui verificação de bloqueio, tratamento de erro 429 e cálculo de tempo restante
 */
export function useRateLimit({
    lastCreateTimeRef,
    setError,
}: UseRateLimitOptions): UseRateLimitReturn {
    const [rateLimitRemainingSeconds, setRateLimitRemainingSeconds] = useState<number | null>(null);

    // Verificar se está bloqueado
    const isBlocked = useCallback((): boolean => {
        const now = Date.now();
        const lastCreateTime = lastCreateTimeRef.current;
        return lastCreateTime > now;
    }, [lastCreateTimeRef]);

    // Obter segundos restantes do bloqueio
    const getRemainingSeconds = useCallback((): number | null => {
        const now = Date.now();
        const lastCreateTime = lastCreateTimeRef.current;
        
        if (lastCreateTime > now) {
            const remainingSeconds = Math.ceil((lastCreateTime - now) / 1000);
            return remainingSeconds;
        }
        
        return null;
    }, [lastCreateTimeRef]);

    // Resetar bloqueio
    const resetBlock = useCallback(() => {
        lastCreateTimeRef.current = 0;
        setError(null);
    }, [lastCreateTimeRef, setError]);

    // Tratar erro de rate limit (429)
    const handleRateLimitError = useCallback((
        statusCode: number,
        orderIdRef: React.MutableRefObject<string | null>,
        cachedOrderIdFromStorageRef: React.MutableRefObject<string | null>,
        setOrder: (order: any) => null,
        clearOrderRelated: () => void
    ) => {
        if (statusCode !== 429) {
            return;
        }

        // Em desenvolvimento, bloqueio mais curto para facilitar testes
        const isDevelopment = typeof window !== 'undefined' && (
            process.env.NODE_ENV !== 'production' || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1'
        );
        const blockDuration = isDevelopment ? 10 * 1000 : 5 * 60 * 1000; // 10 segundos em dev, 5 minutos em produção
        const blockUntil = Date.now() + blockDuration;
        lastCreateTimeRef.current = blockUntil;
        
        const blockSeconds = isDevelopment ? 10 : 300;
        const blockMinutes = Math.floor(blockSeconds / 60);
        const errorMessage = `Muitas tentativas de criar pedido. O sistema está temporariamente bloqueado. Aguarde ${isDevelopment ? `${blockSeconds} segundos` : `${blockMinutes} minutos`} ou recarregue a página para tentar novamente.`;
        
        // Limpar qualquer pedido inválido do storage
        const savedOrderId = orderIdRef.current || cachedOrderIdFromStorageRef.current;
        if (savedOrderId) {
            orderIdRef.current = null;
            cachedOrderIdFromStorageRef.current = null;
            clearOrderRelated();
            setOrder(null);
        }

        setError(errorMessage);
    }, [lastCreateTimeRef, setError]);

    // Atualizar tempo restante do bloqueio em tempo real
    useEffect(() => {
        const updateRemainingTime = () => {
            const remaining = getRemainingSeconds();
            setRateLimitRemainingSeconds(remaining);
        };
        
        // Atualizar imediatamente
        updateRemainingTime();
        
        // Atualizar a cada segundo se houver bloqueio
        const interval = setInterval(() => {
            updateRemainingTime();
        }, 1000);
        
        return () => clearInterval(interval);
    }, [getRemainingSeconds]);

    return {
        isBlocked,
        getRemainingSeconds,
        handleRateLimitError,
        resetBlock,
        rateLimitRemainingSeconds,
    };
}

