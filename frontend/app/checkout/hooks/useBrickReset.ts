'use client';

import { useCallback } from 'react';

interface UseBrickResetReturn {
    resetBrick: () => void;
    isBrickAvailable: () => boolean;
}

/**
 * Hook para gerenciar reset do Mercado Pago Brick
 * Consolida lógica de reset espalhada em vários arquivos
 */
export function useBrickReset(): UseBrickResetReturn {
    // Verificar se o Brick está disponível
    const isBrickAvailable = useCallback((): boolean => {
        if (typeof window === 'undefined') {
            return false;
        }
        return typeof (window as any).__MP_BRICK_RESET__ === 'function';
    }, []);

    // Resetar Mercado Pago Brick
    const resetBrick = useCallback(() => {
        if (typeof window === 'undefined' || !window.__MP_BRICK_RESET__) {
            console.log('[useBrickReset] ⚠️ Brick não está disponível para reset');
            return;
        }

        try {
            console.log('[useBrickReset] 🧹 Resetando Brick');
            window.__MP_BRICK_RESET__();
        } catch (brickErr) {
            console.warn('[useBrickReset] ⚠️ Erro ao resetar Brick:', brickErr);
        }
    }, []);

    return {
        resetBrick,
        isBrickAvailable,
    };
}

