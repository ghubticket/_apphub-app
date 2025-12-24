'use client';

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { HiOutlineTicket, HiOutlineTrash, HiSparkles, HiOutlineMinusSmall, HiOutlinePlusSmall } from 'react-icons/hi2';
import type { CheckoutCartItem } from '../types';
import { usePromoterCode } from '../hooks/usePromoterCode';
import { usePromoterCodeState } from '../hooks/usePromoterCodeState';
import { usePromoterCodeSync } from '../hooks/usePromoterCodeSync';
import { PromoterCodeInput } from './PromoterCodeInput';
import type { AppliedDiscountInfo } from '../hooks/usePromoterCodeState';

type CheckoutCartSummaryProps = {
    items: CheckoutCartItem[];
    totalTickets: number;
    totalAmount: number;
    pixPaymentActive: boolean; // Quando há QR code PIX gerado
    onRemoveItem: (id: string) => void;
    onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
    onPromoterCodeApplied?: (code: string | null) => void;
    onDiscountInfoChange?: (discountInfo: AppliedDiscountInfo | null) => void;
    orderPromoterCode?: string | null; // Código de promotor aplicado no pedido
    orderDiscountAmount?: number; // Valor do desconto aplicado no pedido
    pendingPromoterCode?: string | null; // Código pendente de validação (para pedidos fake)
};

export const CheckoutCartSummary = React.memo(function CheckoutCartSummary({
    items,
    totalTickets,
    totalAmount,
    pixPaymentActive,
    onRemoveItem,
    onUpdateQuantity,
    onPromoterCodeApplied,
    onDiscountInfoChange,
    orderPromoterCode,
    orderDiscountAmount,
    pendingPromoterCode,
}: CheckoutCartSummaryProps) {
    const { validateCode, isValidating } = usePromoterCode();
    const promoterCodeState = usePromoterCodeState();

    // Memoizar eventId (derivado de items[0])
    const eventId = useMemo(() => items[0]?.eventId || null, [items]);

    // Preencher campo de cupom com código do sessionStorage (vindo da URL dos eventos)
    // Usar ref para rastrear se o usuário já removeu o código manualmente
    const userRemovedCodeRef = useRef(false);

    useEffect(() => {
        // Só preencher do sessionStorage se:
        // 1. Há eventId
        // 2. Campo está vazio
        // 3. Não há código aplicado no pedido
        // 4. Usuário NÃO removeu o código manualmente
        if (
            eventId &&
            typeof window !== 'undefined' &&
            !promoterCodeState.state.codeInput &&
            !orderPromoterCode &&
            !userRemovedCodeRef.current
        ) {
            const storageKey = `promoter_code_${eventId}`;
            const savedCode = window.sessionStorage.getItem(storageKey);
            if (savedCode) {
                // Preencher o campo de input com o código, mas não aplicar automaticamente
                // O usuário pode ver o código e decidir aplicar ou não
                promoterCodeState.updateInput(savedCode);
            }
        }
    }, [eventId, promoterCodeState, orderPromoterCode]);

    // Sincronizar estado do código com o pedido
    usePromoterCodeSync({
        state: promoterCodeState,
        orderPromoterCode,
        orderDiscountAmount,
    });

    // Notificar o CheckoutLayout sobre mudanças no desconto aplicado
    // Para cálculo local do total antes do pedido ser criado
    useEffect(() => {
        // Se há um desconto aplicado no pedido, não usar o desconto local
        if (orderDiscountAmount && orderDiscountAmount > 0 && orderPromoterCode) {
            onDiscountInfoChange?.(null);
            return;
        }

        // Se há um desconto aplicado localmente (cupom aplicado mas pedido ainda não criado)
        if (promoterCodeState.state.appliedDiscountInfo) {
            onDiscountInfoChange?.(promoterCodeState.state.appliedDiscountInfo);
        } else {
            onDiscountInfoChange?.(null);
        }
    }, [promoterCodeState.state.appliedDiscountInfo, orderDiscountAmount, orderPromoterCode, onDiscountInfoChange]);

    // Validar código automaticamente quando é aplicado via onPromoterCodeApplied mas o pedido ainda é fake
    // Isso garante feedback visual mesmo quando o pedido ainda não foi criado no backend
    const lastValidatedCodeRef = useRef<string | null>(null);
    const isValidatingRef = useRef(false);

    // Quando há um código pendente (vindo do handlePromoterCodeChange quando pedido é fake),
    // atualizar o input e validar
    useEffect(() => {
        if (pendingPromoterCode && eventId && !orderPromoterCode) {
            const codeToValidate = pendingPromoterCode.trim();
            if (codeToValidate && codeToValidate !== lastValidatedCodeRef.current && !isValidatingRef.current) {
                // Atualizar o input primeiro
                promoterCodeState.updateInput(codeToValidate);

                // Validar o código
                isValidatingRef.current = true;
                lastValidatedCodeRef.current = codeToValidate;

                validateCode(codeToValidate, eventId)
                    .then((result) => {
                        if (result.valid && result.data) {
                            promoterCodeState.setAppliedCode(result.data.code, {
                                code: result.data.code,
                                discountType: result.data.discountType,
                                discountValue: result.data.discountValue,
                            });
                            promoterCodeState.updateInput(result.data.code);
                        } else {
                            promoterCodeState.setInvalidCode(codeToValidate);
                            promoterCodeState.updateInput(codeToValidate);
                        }
                    })
                    .catch(() => {
                        promoterCodeState.setInvalidCode(codeToValidate);
                        promoterCodeState.updateInput(codeToValidate);
                    })
                    .finally(() => {
                        isValidatingRef.current = false;
                    });
            }
        }
    }, [pendingPromoterCode, eventId, orderPromoterCode, validateCode, promoterCodeState]);

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
        const { appliedCode, invalidCode } = promoterCodeState.state;

        // Marcar que o usuário removeu o código manualmente
        // Isso impede que o useEffect preencha novamente do sessionStorage
        userRemovedCodeRef.current = true;

        // Sempre limpar o estado local do input/cupom
        promoterCodeState.clearAll();

        // Remover também do sessionStorage para não preencher novamente
        if (eventId && typeof window !== 'undefined') {
            const storageKey = `promoter_code_${eventId}`;
            window.sessionStorage.removeItem(storageKey);
        }

        // Só avisar o backend (remover cupom do pedido) se havia um código realmente aplicado.
        // Quando era apenas inválido, não precisamos tocar no pedido nem disparar loaders.
        if (appliedCode && !invalidCode) {
            onPromoterCodeApplied?.(null);
        }
    }, [onPromoterCodeApplied, promoterCodeState, eventId]);

    // Calcular total formatado
    const formattedTotal = useMemo(() => {
        return `R$ ${totalAmount.toFixed(2).replace('.', ',')}`;
    }, [totalAmount]);

    return (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6">
            <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d] mb-3">
                Resumo do seus Ingressos
            </h2>

            <div className="space-y-4 border-t border-dashed border-[#ede5d8] pt-4 ">
                {items.map((item) => {
                    const formattedItemPrice = `R$ ${item.total.toFixed(2).replace('.', ',')}`;
                    const itemName = item.name || 'Ingresso';

                    // Construir detalhes do item (lote, se disponível)
                    const lotInfo = item.metadata?.lotName
                        ? `Lote ${item.metadata.lotName}`
                        : item.metadata?.lotNumber
                            ? `Lote ${item.metadata.lotNumber}`
                            : null;

                    const itemDisplayName = lotInfo
                        ? `${itemName} · ${lotInfo} x${item.quantity}`
                        : `${itemName} x${item.quantity}`;

                    const maxQuantity = item.maxQuantity;
                    const canIncrease = !maxQuantity || item.quantity < maxQuantity;
                    const canDecrease = item.quantity > 1;

                    // Extrair dados de transporte se disponível
                    let transportInfo = null;
                    if (item.metadata?.isTransport && item.metadata?.transportOption) {
                        try {
                            const transportOption = JSON.parse(item.metadata.transportOption as string);
                            transportInfo = {
                                date: transportOption.date,
                                attraction: transportOption.attraction,
                                departureLocation: transportOption.departureLocation
                            };
                        } catch (e) {
                            // Fallback para estrutura antiga
                            if (item.metadata?.departureLocation) {
                                transportInfo = {
                                    date: '',
                                    attraction: '',
                                    departureLocation: item.metadata.departureLocation as string
                                };
                            }
                        }
                    } else if (item.metadata?.isTransport && item.metadata?.departureLocation) {
                        // Compatibilidade: estrutura antiga
                        transportInfo = {
                            date: '',
                            attraction: '',
                            departureLocation: item.metadata.departureLocation as string
                        };
                    }

                    return (
                        <div key={item.id} className="flex flex-col bg-slate-100 px-5 py-3 rounded-2xl gap-2">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <HiOutlineTicket className="text-[#7d796c] hidden md:block flex-shrink-0" size={25} />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-[#1a1a1d]">
                                            {itemDisplayName}
                                        </p>
                                        <p className="text-xs text-[#7d796c]">
                                            {item.quantity} ingresso{item.quantity > 1 ? 's' : ''} - {formattedItemPrice}
                                        </p>
                                        {/* Exibir dados de transporte se disponível */}
                                        {transportInfo && (
                                            <div className="mt-2 space-y-1">
                                                {transportInfo.date && transportInfo.attraction && (
                                                    <p className="text-xs text-[#6a6760]">
                                                        📅 {transportInfo.date} - {transportInfo.attraction}
                                                    </p>
                                                )}
                                                {transportInfo.departureLocation && (
                                                    <p className="text-xs text-[#6a6760]">
                                                        🚌 Local de Embarque: {transportInfo.departureLocation}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Controles de quantidade e remover - abaixo no mobile, ao lado no desktop */}
                                <div className="flex items-center gap-2 md:flex-shrink-0">
                                    {/* Controles de quantidade */}
                                    {onUpdateQuantity && !pixPaymentActive && (
                                        <div className="flex items-center rounded-[100rem] bg-white px-[0.8rem] py-[0.5rem]">
                                            <button
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                                disabled={!canDecrease}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                                                aria-label="Diminuir quantidade"
                                            >
                                                <HiOutlineMinusSmall className="text-sm" />
                                            </button>
                                            
                                            <span className="min-w-[24px] text-center text-[0.75rem] font-semibold text-[#1a1a1d]">
                                                {item.quantity}
                                            </span>
                                            
                                            <button
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                disabled={!canIncrease}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                                                aria-label="Aumentar quantidade"
                                            >
                                                <HiOutlinePlusSmall className="text-sm" />
                                            </button>
                                        </div>
                                    )}
                                    
                                    {/* Botão para remover item */}
                                    {!pixPaymentActive && (
                                        <button
                                            type="button"
                                            onClick={() => onRemoveItem(item.id)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-300 text-red-600 transition hover:bg-red-50 hover:border-red-400"
                                            aria-label="Remover item"
                                        >
                                            <HiOutlineTrash className="text-sm" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Campo de código de cupom/promoter - Esconder quando PIX está ativo */}
            {!pixPaymentActive && (
                <PromoterCodeInput
                    state={promoterCodeState}
                    isValidating={isValidating}
                    pixPaymentActive={pixPaymentActive}
                    orderDiscountAmount={orderDiscountAmount}
                    onApplyCode={handleApplyCode}
                    onRemoveCode={handleRemoveCode}
                />
            )}

            {/* Mensagem de desconto aplicado */}
            {(orderDiscountAmount && orderDiscountAmount > 0 && orderPromoterCode) ||
                (promoterCodeState.state.appliedCode && !orderPromoterCode) ? (
                <div className="mt-3 rounded-2xl border border-[#10b981] bg-[#f1fff6] p-3">
                    <div className="flex gap-2 items-center justify-center">
                        <HiSparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10b981]" />
                        <div className="space-y-1">

                            <p className="text-sm mt-0 pt-0 leading-0 text-[#059669]">
                                {orderDiscountAmount && orderDiscountAmount > 0 ? (
                                    <>
                                        O código <span className="font-semibold">{orderPromoterCode}</span> foi aplicado com sucesso. O promoter disponibilizou este desconto de{' '}
                                        <span className="font-semibold">
                                            R$ {orderDiscountAmount.toFixed(2).replace('.', ',')}
                                        </span>
                                        .
                                    </>
                                ) : (
                                    <>
                                        O código <span className="font-semibold">{promoterCodeState.state.appliedCode}</span> foi aplicado no Pagamento Final
                                        {promoterCodeState.state.appliedDiscountInfo?.discountValue && promoterCodeState.state.appliedDiscountInfo.discountValue > 0 && (
                                            <>
                                                {' '}{' '}
                                                {promoterCodeState.state.appliedDiscountInfo.discountType === 'percentage' ? (
                                                    <span className="font-semibold">{promoterCodeState.state.appliedDiscountInfo.discountValue}%</span>
                                                ) : (
                                                    <span className="font-semibold">
                                                        R$ {promoterCodeState.state.appliedDiscountInfo.discountValue.toFixed(2).replace('.', ',')}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
});

