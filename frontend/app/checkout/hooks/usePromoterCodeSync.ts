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
        setAppliedCode,
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

        // CRÍTICO: Não sincronizar se o código aplicado localmente é diferente do código no pedido
        // mas o código no input corresponde ao aplicado localmente
        // Isso significa que o usuário está aplicando manualmente e o pedido ainda não foi atualizado
        const isUserApplyingManually = appliedCode && 
                                      appliedCode !== orderPromoterCode && 
                                      (codeInput.trim().toUpperCase() === appliedCode.toUpperCase() || 
                                       codeInput.trim().toUpperCase() === orderPromoterCode?.toUpperCase());

        if (isUserApplyingManually) {
            // Usuário está aplicando manualmente - não interferir, aguardar atualização do pedido
            // O pedido será atualizado via handlePromoterCodeChange e depois o sync vai funcionar corretamente
            return;
        }

        // Se há código válido no pedido, sincronizar
        if (orderPromoterCode && orderDiscountAmount && orderDiscountAmount > 0) {
            // Só sincronizar se o código aplicado for diferente OU se não houver código aplicado mas há no pedido
            if (appliedCode !== orderPromoterCode || (!appliedCode && orderPromoterCode)) {
                // Quando vem da API, usar setAppliedCode para configurar corretamente o estado visual
                // Criar um discountInfo mínimo baseado no desconto aplicado
                // Como não temos o tipo exato do desconto da API, assumimos 'fixed' por padrão
                // O valor será o orderDiscountAmount (valor já calculado do desconto)
                state.setAppliedCode(orderPromoterCode, {
                    code: orderPromoterCode,
                    discountType: 'fixed', // Assumir fixed por padrão, pode ser ajustado se a API retornar o tipo
                    discountValue: orderDiscountAmount,
                });
            }
        } else if (!orderPromoterCode && !orderDiscountAmount) {
            // Se código foi removido do pedido, limpar apenas se não houver código inválido persistente
            // E se não houver código sendo aplicado manualmente
            if (appliedCode && !codeInput.trim() && !isUserApplyingManually) {
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

