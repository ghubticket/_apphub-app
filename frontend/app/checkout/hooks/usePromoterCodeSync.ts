'use client';

import { useEffect } from 'react';
import type { UsePromoterCodeStateReturn } from './usePromoterCodeState';

interface UsePromoterCodeSyncOptions {
    state: UsePromoterCodeStateReturn;
    orderPromoterCode: string | null | undefined;
    orderDiscountAmount: number | undefined;
}

/**
 * Hook para sincronizar estado do código de promotor com o pedido
 * REFATORADO: Extraído do CheckoutCartSummary para melhor organização
 * OTIMIZADO: Lógica de sincronização isolada e testável
 */
export function usePromoterCodeSync({
    state,
    orderPromoterCode,
    orderDiscountAmount,
}: UsePromoterCodeSyncOptions): void {
    const {
        state: { codeInput, invalidCode, appliedCode },
        setInvalidCode,
        syncFromOrder,
        clearAll,
        invalidCodeRef,
        isSettingInvalidCodeRef,
    } = state;

    useEffect(() => {
        // Não interferir se há código inválido OU se estamos definindo código inválido
        // Isso previne que o useEffect limpe o estado durante a atualização do pedido
        const hasInvalidCode = invalidCode || invalidCodeRef.current || isSettingInvalidCodeRef.current;

        if (hasInvalidCode) {
            const persistentInvalidCode = invalidCode || invalidCodeRef.current;

            // Se há código inválido persistente mas não está no state, restaurar
            if (persistentInvalidCode && !invalidCode) {
                setInvalidCode(persistentInvalidCode);
            }

            // Se há código inválido, garantir que ele está no input e no estado
            if (persistentInvalidCode && codeInput.trim() !== persistentInvalidCode) {
                state.updateInput(persistentInvalidCode);
                state.setInvalidCode(persistentInvalidCode);
            }
            return;
        }

        // Se há código válido no pedido, sincronizar
        if (orderPromoterCode && orderDiscountAmount && orderDiscountAmount > 0) {
            if (appliedCode !== orderPromoterCode) {
                state.syncFromOrder(orderPromoterCode);
            }
        } else if (!orderPromoterCode && !orderDiscountAmount) {
            // Se código foi removido do pedido, limpar apenas se não houver código inválido persistente
            if (appliedCode && !codeInput.trim()) {
                state.clearAll();
            }
        }
    }, [
        orderPromoterCode,
        orderDiscountAmount,
        invalidCode,
        appliedCode,
        codeInput,
        invalidCodeRef,
        isSettingInvalidCodeRef,
        setInvalidCode,
        state,
    ]);
}

