'use client';

import React, { useMemo } from 'react';
import type { UsePromoterCodeStateReturn } from '../hooks/usePromoterCodeState';

interface PromoterCodeInputProps {
    state: UsePromoterCodeStateReturn;
    isValidating: boolean;
    pixPaymentActive: boolean;
    orderDiscountAmount?: number;
    onApplyCode: () => void;
    onRemoveCode: () => void;
}

/**
 * Componente isolado para input de código de promotor/cupom
 * REFATORADO: Extraído do CheckoutCartSummary para melhor organização
 * OTIMIZADO: Usa React.memo e useMemo para evitar re-renders desnecessários
 */
export const PromoterCodeInput = React.memo(function PromoterCodeInput({
    state,
    isValidating,
    pixPaymentActive,
    orderDiscountAmount,
    onApplyCode,
    onRemoveCode,
}: PromoterCodeInputProps) {
    const {
        state: { codeInput, appliedCode, invalidCode, codeStatus },
        updateInput,
        clearStatus,
    } = state;

    const hasAppliedCode = appliedCode && orderDiscountAmount && orderDiscountAmount > 0;
    const hasInvalidCode = invalidCode && codeInput.trim() && !appliedCode;

    // Memoizar classes CSS condicionais
    const inputClassName = useMemo(() => {
        const base = 'w-full rounded-2xl border md:px-4 md:py-2.5 p-3 text-sm transition';
        const padding = isValidating ? 'md:pr-32' : 'md:pr-20';

        if (pixPaymentActive || isValidating) {
            return `${base} ${padding} border-[#ded7ca] bg-[#f5f1e8] text-[#7d796c] cursor-not-allowed`;
        }

        if (hasAppliedCode) {
            return `${base} ${padding} border-[#10b981] bg-[#f1fff6] text-[#1f5d3d] focus:border-[#059669] focus:outline-none`;
        }

        if (hasInvalidCode) {
            return `${base} ${padding} border-rose-400 bg-white text-rose-700 focus:border-rose-500 focus:outline-none`;
        }

        return `${base} ${padding} border-[#ded7ca] bg-white text-[#1a1a1d] focus:border-[#a38f78] focus:outline-none`;
    }, [pixPaymentActive, isValidating, hasAppliedCode, hasInvalidCode]);

    const buttonClassName = useMemo(() => {
        const base = 'rounded-2xl border px-4 py-2.5 text-sm font-semibold uppercase tracking-normal transition flex items-center justify-center gap-2 min-w-[80px]';
        const disabled = pixPaymentActive || isValidating || !codeInput.trim();

        if (disabled) {
            return `${base} border-[#ded7ca] bg-[#f5f1e8] text-[#7d796c] cursor-not-allowed`;
        }

        return `${base} border-[#1a1a1d] bg-[#1a1a1d] text-white hover:bg-[#f97316] hover:border-[#f97316] hover:text-[#1a1a1d]`;
    }, [pixPaymentActive, isValidating, codeInput]);

    const placeholder = useMemo(() => {
        if (hasAppliedCode) return 'Cupom aplicado';
        if (hasInvalidCode) return 'Cupom inválido';
        return 'Insira seu Codigo:';
    }, [hasAppliedCode, hasInvalidCode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.toUpperCase();
        updateInput(newValue);

        // Limpar estados apenas quando usuário realmente mudar o código
        if (newValue.trim() === '') {
            state.clearAll();
        } else if (newValue !== appliedCode && newValue !== invalidCode) {
            if (newValue !== invalidCode) {
                clearStatus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isValidating && !pixPaymentActive) {
            onApplyCode();
        }
    };

    return (
        <div className="mt-6 space-y-3">
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={codeInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={pixPaymentActive || isValidating}
                        className={inputClassName}
                    />
                    {isValidating ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a38f78] border-t-transparent" />
                            <span className="text-xs font-medium text-[#7d796c]">Validando...</span>
                        </div>
                    ) : hasAppliedCode ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#10b981]">
                            ✓ Aplicado
                        </span>
                    ) : hasInvalidCode ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-rose-600">
                            ✕ Inválido
                        </span>
                    ) : null}
                </div>
                {(hasAppliedCode || hasInvalidCode) && !pixPaymentActive ? (
                    <button
                        type="button"
                        onClick={onRemoveCode}
                        className="rounded-2xl border border-[#ded7ca] bg-white px-4 py-2.5 text-xs font-medium text-[#7d796c] transition hover:bg-[#f5f1e8] hover:text-[#1a1a1d]"
                    >
                        {hasAppliedCode ? 'Trocar' : 'Limpar'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onApplyCode}
                        disabled={pixPaymentActive || isValidating || !codeInput.trim()}
                        className={buttonClassName}
                    >
                        {isValidating ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7d796c] border-t-transparent" />
                                <span>Validando...</span>
                            </>
                        ) : (
                            'OK'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
});

