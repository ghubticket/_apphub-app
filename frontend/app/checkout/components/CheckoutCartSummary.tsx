'use client';

import React, { useCallback, useMemo } from 'react';
import { HiOutlineTicket, HiOutlineTrash } from 'react-icons/hi2';
import type { CheckoutCartItem } from '../types';
import { usePromoterCode } from '../hooks/usePromoterCode';
import { usePromoterCodeState } from '../hooks/usePromoterCodeState';
import { usePromoterCodeSync } from '../hooks/usePromoterCodeSync';
import { PromoterCodeInput } from './PromoterCodeInput';

type CheckoutCartSummaryProps = {
    items: CheckoutCartItem[];
    totalTickets: number;
    totalAmount: number;
    pixPaymentActive: boolean; // Quando há QR code PIX gerado
    onRemoveItem: (id: string) => void;
    onPromoterCodeApplied?: (code: string | null) => void;
    orderPromoterCode?: string | null; // Código de promotor aplicado no pedido
    orderDiscountAmount?: number; // Valor do desconto aplicado no pedido
};

export const CheckoutCartSummary = React.memo(function CheckoutCartSummary({
    items,
    totalTickets,
    totalAmount,
    pixPaymentActive,
    onRemoveItem,
    onPromoterCodeApplied,
    orderPromoterCode,
    orderDiscountAmount,
}: CheckoutCartSummaryProps) {
    const { validateCode, isValidating } = usePromoterCode();
    const promoterCodeState = usePromoterCodeState();

    // Memoizar eventId (derivado de items[0])
    const eventId = useMemo(() => items[0]?.eventId || null, [items]);

    // Sincronizar estado do código com o pedido
    usePromoterCodeSync({
        state: promoterCodeState,
        orderPromoterCode,
        orderDiscountAmount,
    });

    const handleApplyCode = useCallback(async () => {
        const { state } = promoterCodeState;
        const codeInputValue = state.codeInput.trim();

        if (!codeInputValue || !eventId) {
            promoterCodeState.setCodeStatus({
                type: 'error',
                message: 'Digite um código válido',
            });
            return;
        }

        if (pixPaymentActive) {
            promoterCodeState.setCodeStatus({
                type: 'error',
                message: 'Não é possível aplicar código enquanto há um pagamento pendente',
            });
            return;
        }

        try {
            const result = await validateCode(codeInputValue, eventId);

            if (result.valid && result.data) {
                promoterCodeState.setAppliedCode(result.data.code, {
                    code: result.data.code,
                    discountType: result.data.discountType,
                    discountValue: result.data.discountValue,
                });
                promoterCodeState.updateInput(result.data.code);
                onPromoterCodeApplied?.(result.data.code);
            } else {
                const invalidCodeValue = codeInputValue;
                promoterCodeState.setInvalidCode(invalidCodeValue);
                promoterCodeState.updateInput(invalidCodeValue);
                // NÃO chamar onPromoterCodeApplied(null) quando código é inválido
            }
        } catch (error: any) {
            const invalidCodeValue = codeInputValue;
            promoterCodeState.setInvalidCode(invalidCodeValue);
            promoterCodeState.updateInput(invalidCodeValue);
            // NÃO chamar onPromoterCodeApplied(null) quando código é inválido
        }
    }, [eventId, pixPaymentActive, validateCode, onPromoterCodeApplied, promoterCodeState]);

    const handleRemoveCode = useCallback(() => {
        promoterCodeState.clearAll();
        onPromoterCodeApplied?.(null);
    }, [onPromoterCodeApplied, promoterCodeState]);

    return (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] relative">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">Resumo do pedido</h2>
                    <p className="text-xs text-[#7d796c]">Revise os ingressos antes de finalizar o pagamento.</p>
                </div>
                <span className="rounded-full border border-[#ded7ca] bg-[#f5f1e8] px-3 py-1 text-xs font-semibold uppercase tracking-normal text-[#6f6b63]">
                    {totalTickets} ingresso(s)
                </span>
            </header>

            <div className="mt-6 space-y-4">
                {items.map((item) => {
                    // OTIMIZADO: Memoizar valores formatados para evitar recálculos
                    const formattedSubtotal = useMemo(() => `R$ ${item.subtotal.toFixed(2).replace('.', ',')}`, [item.subtotal]);
                    const formattedTotal = useMemo(() => `R$ ${item.total.toFixed(2).replace('.', ',')}`, [item.total]);
                    const formattedFees = useMemo(
                        () => `R$ ${(item.platformFeeValue + item.fixedFeeValue).toFixed(2).replace('.', ',')}`,
                        [item.platformFeeValue, item.fixedFeeValue]
                    );

                    return (
                        <div
                            key={item.id}
                            className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] p-5 shadow-[0_15px_35px_-30px_rgba(20,20,32,0.35)]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-normal text-[#a38f78]">
                                        <HiOutlineTicket className="text-sm" />
                                        {item.metadata?.category ?? 'Ingresso'}
                                    </span>
                                    <p className="text-base font-semibold uppercase tracking-normal text-[#1a1a1d]">{item.name}</p>
                                    {item.date || item.location ? (
                                        <p className="text-xs text-[#7d796c]">
                                            {item.date}
                                            {item.date && item.location ? ' • ' : ''}
                                            {item.location}
                                        </p>
                                    ) : null}
                                </div>
                                
                                <button
                                    type="button"
                                    disabled={pixPaymentActive}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                        pixPaymentActive
                                            ? 'border-[#ded7ca] text-[#b5aa92] opacity-60 cursor-not-allowed'
                                            : 'border-[#ded7ca] text-[#7d796c] hover:border-rose-300 hover:text-rose-500'
                                    }`}
                                    onClick={() => onRemoveItem(item.id)}
                                    aria-label={pixPaymentActive ? 'Não é possível remover itens enquanto há um pagamento pendente' : 'Remover do carrinho'}
                                    title={pixPaymentActive ? 'Não é possível remover itens enquanto há um pagamento pendente' : 'Remover do carrinho'}
                                >
                                    <HiOutlineTrash className="text-sm" />
                                </button>
                            </div>
                            <hr className="border-gray-200 mt-4 flex" />
                            <div className="mt-4 space-y-3">
                                {/* Quantidade, Subtotal e Total na mesma linha */}
                                <div className="grid grid-cols-3 gap-3 text-sm text-[#4c4c55]">
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Quantidade</span>
                                        <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">{item.quantity} ingresso(s)</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Subtotal</span>
                                        <p className="mt-1 text-sm text-[#1a1a1d]">{formattedSubtotal}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">
                                            Total deste ingresso
                                        </span>
                                        <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">{formattedTotal}</p>
                                    </div>
                                </div>
                                {/* Taxas (se houver) */}
                                {item.platformFeeValue > 0 || item.fixedFeeValue > 0 ? (
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Taxas</span>
                                        <p className="mt-1 text-sm text-[#1a1a1d]">{formattedFees}</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Campo de código de cupom/promoter */}
            <PromoterCodeInput
                state={promoterCodeState}
                isValidating={isValidating}
                pixPaymentActive={pixPaymentActive}
                orderDiscountAmount={orderDiscountAmount}
                onApplyCode={handleApplyCode}
                onRemoveCode={handleRemoveCode}
            />

            <footer className="mt-6 rounded-2xl border border-[#ede5d8] bg-white px-5 py-4">
                <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Total a pagar</span>
                <p className="mt-0 text-2xl font-bold text-[#1a1a1d]">
                    {useMemo(() => `R$ ${totalAmount.toFixed(2).replace('.', ',')}`, [totalAmount])}
                </p>
            </footer>
        </div>
    );
});

