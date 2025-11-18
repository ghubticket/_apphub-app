'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { HiOutlineTicket, HiOutlineTrash } from 'react-icons/hi2';
import type { CheckoutCartItem } from '../types';
import { usePromoterCode } from '../hooks/usePromoterCode';

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

export function CheckoutCartSummary({
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
    const [codeInput, setCodeInput] = useState('');
    const [codeStatus, setCodeStatus] = useState<{
        type: 'success' | 'error' | null;
        message: string;
    }>({ type: null, message: '' });
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [appliedDiscountInfo, setAppliedDiscountInfo] = useState<{
        code: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
    } | null>(null);
    const [invalidCode, setInvalidCode] = useState<string | null>(null);
    // Ref para persistir código inválido mesmo após re-renders causados por atualizações do pedido
    const invalidCodeRef = useRef<string | null>(null);

    // Obter eventId do primeiro item (todos os itens devem ser do mesmo evento)
    const eventId = items[0]?.eventId || null;

    // Ref para rastrear se estamos em processo de validação de código inválido
    const isSettingInvalidCodeRef = useRef(false);
    
    // Sincronizar ref com state
    useEffect(() => {
        if (invalidCode) {
            invalidCodeRef.current = invalidCode;
        }
    }, [invalidCode]);

    // Sincronizar com código do pedido quando mudar - manter estado persistente
    useEffect(() => {
        console.log('[CheckoutCartSummary] 🔄 useEffect sincronização pedido:', {
            orderPromoterCode,
            orderDiscountAmount,
            appliedCode,
            invalidCode,
            codeInput,
            isSettingInvalidCode: isSettingInvalidCodeRef.current,
        });

        // IMPORTANTE: Não interferir se há código inválido OU se estamos definindo código inválido
        // Isso previne que o useEffect limpe o estado durante a atualização do pedido
        // Usar ref para verificar código inválido persistente mesmo se state foi resetado
        const hasInvalidCode = invalidCode || invalidCodeRef.current || isSettingInvalidCodeRef.current;
        
        if (hasInvalidCode) {
            const persistentInvalidCode = invalidCode || invalidCodeRef.current;
            console.log('[CheckoutCartSummary] ⚠️ Há código inválido ou estamos definindo, não interferindo no useEffect:', {
                invalidCode,
                invalidCodeRef: invalidCodeRef.current,
                persistentInvalidCode,
                isSettingInvalidCode: isSettingInvalidCodeRef.current,
                codeInput: codeInput.trim(),
            });
            
            // Se há código inválido persistente mas não está no state, restaurar
            if (persistentInvalidCode && !invalidCode) {
                console.log('[CheckoutCartSummary] 🔄 Restaurando código inválido do ref para o state');
                setInvalidCode(persistentInvalidCode);
            }
            
            // Se há código inválido, garantir que ele está no input e no estado
            if (persistentInvalidCode && codeInput.trim() !== persistentInvalidCode) {
                console.log('[CheckoutCartSummary] 🔄 Restaurando código inválido no input e estado');
                setCodeInput(persistentInvalidCode);
                setCodeStatus({
                    type: 'error',
                    message: 'Código inválido ou não válido para este evento',
                });
            }
            // NÃO resetar a flag aqui - ela será resetada no handleApplyCode após o delay
            return;
        }

        if (orderPromoterCode && orderDiscountAmount && orderDiscountAmount > 0) {
            // Se há código no pedido, manter estado de sucesso persistente
            console.log('[CheckoutCartSummary] ✅ Sincronizando código válido do pedido');
            setAppliedCode(orderPromoterCode);
            setCodeInput(orderPromoterCode);
            setCodeStatus({
                type: 'success',
                message: 'Você recebeu um desconto!',
            });
            setInvalidCode(null);
            invalidCodeRef.current = null; // Limpar ref também quando código válido é sincronizado
        } else if (!orderPromoterCode && !orderDiscountAmount) {
            // Se código foi removido do pedido, limpar apenas se não houver código inválido persistente
            // NÃO limpar invalidCode aqui - ele deve persistir até o usuário interagir
            // IMPORTANTE: Se há código no input que corresponde ao invalidCode, NÃO limpar nada
            // OU se há invalidCode definido (mesmo que o input esteja vazio temporariamente), preservar
            if (invalidCode) {
                console.log('[CheckoutCartSummary] ⚠️ Há código inválido definido, preservando estado:', {
                    invalidCode,
                    codeInput: codeInput.trim(),
                    matches: codeInput.trim() === invalidCode,
                });
                // Se o código inválido ainda está no input, restaurar o input se necessário
                if (codeInput.trim() !== invalidCode && codeInput.trim() === '') {
                    console.log('[CheckoutCartSummary] 🔄 Restaurando código inválido no input');
                    setCodeInput(invalidCode);
                    setCodeStatus({
                        type: 'error',
                        message: 'Código inválido ou não válido para este evento',
                    });
                }
                return;
            }
            if (appliedCode && !codeInput.trim()) {
                console.log('[CheckoutCartSummary] 🧹 Limpando código aplicado (sem código inválido)');
                setAppliedCode(null);
                setCodeStatus({ type: null, message: '' });
                setAppliedDiscountInfo(null);
            }
        }
    }, [orderPromoterCode, orderDiscountAmount, invalidCode, appliedCode, codeInput]);

    const handleApplyCode = useCallback(async () => {
        console.log('[CheckoutCartSummary] 🎯 handleApplyCode chamado:', {
            codeInput: codeInput.trim(),
            eventId,
            pixPaymentActive,
        });

        if (!codeInput.trim() || !eventId) {
            console.log('[CheckoutCartSummary] ⚠️ Validação falhou: código ou eventId vazio');
            setCodeStatus({
                type: 'error',
                message: 'Digite um código válido',
            });
            return;
        }

        if (pixPaymentActive) {
            console.log('[CheckoutCartSummary] ⚠️ Pagamento PIX ativo, bloqueando aplicação de código');
            setCodeStatus({
                type: 'error',
                message: 'Não é possível aplicar código enquanto há um pagamento pendente',
            });
            return;
        }

        try {
            console.log('[CheckoutCartSummary] 🔍 Validando código:', {
                code: codeInput.trim(),
                eventId,
            });
            const result = await validateCode(codeInput.trim(), eventId);
            console.log('[CheckoutCartSummary] 📡 Resultado da validação:', {
                valid: result.valid,
                hasData: !!result.data,
                message: result.message,
            });
            
            if (result.valid && result.data) {
                console.log('[CheckoutCartSummary] ✅ Código válido, aplicando:', {
                    code: result.data.code,
                    discountType: result.data.discountType,
                    discountValue: result.data.discountValue,
                });
                setAppliedCode(result.data.code);
                setAppliedDiscountInfo({
                    code: result.data.code,
                    discountType: result.data.discountType,
                    discountValue: result.data.discountValue,
                });
                setCodeStatus({
                    type: 'success',
                    message: 'Você recebeu um desconto!',
                });
                setInvalidCode(null);
                invalidCodeRef.current = null; // Limpar ref também quando código válido é aplicado
                // Manter código no input
                setCodeInput(result.data.code);
                console.log('[CheckoutCartSummary] 📞 Chamando onPromoterCodeApplied com código:', result.data.code);
                onPromoterCodeApplied?.(result.data.code);
            } else {
                const invalidCodeValue = codeInput.trim();
                console.log('[CheckoutCartSummary] ❌ Código inválido - definindo estado persistente:', {
                    invalidCode: invalidCodeValue,
                    message: result.message,
                    currentCodeInput: codeInput,
                });
                
                // Marcar que estamos definindo código inválido para prevenir que o useEffect interfira
                isSettingInvalidCodeRef.current = true;
                invalidCodeRef.current = invalidCodeValue; // Persistir no ref imediatamente
                console.log('[CheckoutCartSummary] 🔧 Flag isSettingInvalidCode definida como true e invalidCodeRef atualizado');
                
                // Limpar estados de sucesso primeiro
                setAppliedCode(null);
                setAppliedDiscountInfo(null);
                
                // Definir estado de erro - usar função de atualização para garantir que o estado seja atualizado
                setInvalidCode(() => {
                    console.log('[CheckoutCartSummary] 🔧 setInvalidCode chamado com:', invalidCodeValue);
                    return invalidCodeValue;
                });
                
                setCodeStatus({
                    type: 'error',
                    message: result.message || 'Código inválido ou não válido para este evento',
                });
                
                // Manter código inválido no input para mostrar erro persistente
                setCodeInput(() => {
                    console.log('[CheckoutCartSummary] 🔧 setCodeInput chamado com:', invalidCodeValue);
                    return invalidCodeValue;
                });
                
                // IMPORTANTE: NÃO chamar onPromoterCodeApplied(null) quando código é inválido
                // Isso evita que o pedido seja atualizado desnecessariamente e preserve o estado de erro
                // O mesmo fluxo de código válido não atualiza o pedido se o código não mudou
                console.log('[CheckoutCartSummary] ✅ Estado de erro definido, código permanece no input. Estados finais:', {
                    invalidCode: invalidCodeValue,
                    codeInput: invalidCodeValue,
                    skipCallback: true, // Não chamar callback para código inválido
                });
                // Manter flag por mais tempo para garantir que o useEffect não interfira
                // Aumentar o tempo para dar mais margem caso haja alguma atualização do pedido
                setTimeout(() => {
                    isSettingInvalidCodeRef.current = false;
                    console.log('[CheckoutCartSummary] 🔧 Flag isSettingInvalidCode resetada');
                }, 2000); // Aumentado para 2000ms para dar mais margem
            }
        } catch (error: any) {
            const invalidCodeValue = codeInput.trim();
            console.error('[CheckoutCartSummary] ❌ Erro ao validar código - definindo estado persistente:', {
                error: error?.message,
                invalidCode: invalidCodeValue,
                stack: error?.stack,
            });
            
            // Marcar que estamos definindo código inválido para prevenir que o useEffect interfira
            isSettingInvalidCodeRef.current = true;
            invalidCodeRef.current = invalidCodeValue; // Persistir no ref imediatamente
            console.log('[CheckoutCartSummary] 🔧 Flag isSettingInvalidCode definida como true (catch) e invalidCodeRef atualizado');
            
            setAppliedCode(null);
            setAppliedDiscountInfo(null);
            setInvalidCode(invalidCodeValue);
            setCodeStatus({
                type: 'error',
                message: error?.message || 'Erro ao validar código. Tente novamente.',
            });
            // Manter código no input para mostrar erro persistente
            setCodeInput(invalidCodeValue); // Garantir que o código fique no input
            
            // IMPORTANTE: NÃO chamar onPromoterCodeApplied(null) quando código é inválido
            // Isso evita que o pedido seja atualizado desnecessariamente e preserve o estado de erro
            console.log('[CheckoutCartSummary] ✅ Estado de erro definido após catch, código permanece no input');
            // Manter flag por mais tempo para garantir que o useEffect não interfira
            // Aumentar o tempo para dar mais margem caso haja alguma atualização do pedido
            setTimeout(() => {
                isSettingInvalidCodeRef.current = false;
                console.log('[CheckoutCartSummary] 🔧 Flag isSettingInvalidCode resetada após catch');
            }, 2000); // Aumentado para 2000ms para dar mais margem
        }
    }, [codeInput, eventId, pixPaymentActive, validateCode, onPromoterCodeApplied]);

    const handleRemoveCode = useCallback(() => {
        console.log('[CheckoutCartSummary] 🗑️ Removendo código de promotor');
        setCodeInput('');
        setAppliedCode(null);
        setAppliedDiscountInfo(null);
        setInvalidCode(null);
        invalidCodeRef.current = null; // Limpar ref também
        setCodeStatus({ type: null, message: '' });
        onPromoterCodeApplied?.(null);
    }, [onPromoterCodeApplied]);

    // Log de renderização para debug
    useEffect(() => {
        console.log('[CheckoutCartSummary] 🎨 Renderização - Estado atual:', {
            codeInput,
            appliedCode,
            invalidCode,
            codeStatusType: codeStatus.type,
            codeStatusMessage: codeStatus.message,
            orderPromoterCode,
            orderDiscountAmount,
            hasInvalidCodeState: !!invalidCode,
            hasAppliedCodeState: !!appliedCode,
            shouldShowInvalid: invalidCode && codeInput.trim() && !appliedCode,
            shouldShowApplied: appliedCode && orderDiscountAmount && orderDiscountAmount > 0,
        });
    }, [codeInput, appliedCode, invalidCode, codeStatus, orderPromoterCode, orderDiscountAmount]);

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
                {items.map((item) => (
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
                                    <p className="mt-1 text-sm text-[#1a1a1d]">R$ {item.subtotal.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">
                                        Total deste ingresso
                                    </span>
                                    <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">
                                        R$ {item.total.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            </div>
                            {/* Taxas (se houver) */}
                            {item.platformFeeValue > 0 || item.fixedFeeValue > 0 ? (
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Taxas</span>
                                    <p className="mt-1 text-sm text-[#1a1a1d]">
                                        R${' '}
                                        {(item.platformFeeValue + item.fixedFeeValue)
                                            .toFixed(2)
                                            .replace('.', ',')}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Campo de código de cupom/promoter */}
            <div className="mt-6 space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => {
                                const newValue = e.target.value.toUpperCase();
                                console.log('[CheckoutCartSummary] 📝 Input mudou:', {
                                    newValue,
                                    appliedCode,
                                    invalidCode,
                                    currentCodeInput: codeInput,
                                });
                                setCodeInput(newValue);
                                
                                // Limpar estados apenas quando usuário realmente mudar o código
                                if (newValue.trim() === '') {
                                    // Se campo está vazio, limpar tudo
                                    console.log('[CheckoutCartSummary] 🧹 Campo vazio, limpando estados');
                                    setInvalidCode(null);
                                    setAppliedCode(null);
                                    setAppliedDiscountInfo(null);
                                    setCodeStatus({ type: null, message: '' });
                                } else if (newValue !== appliedCode && newValue !== invalidCode) {
                                    // Se código mudou e não é o código aplicado nem o inválido, limpar status
                                    // mas manter invalidCode se ainda for o mesmo valor
                                    if (newValue !== invalidCode) {
                                        console.log('[CheckoutCartSummary] 🔄 Código mudou, limpando status de erro/sucesso');
                                        setCodeStatus({ type: null, message: '' });
                                        // Não limpar invalidCode aqui - só limpar quando campo estiver vazio ou quando aplicar novo código
                                    }
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isValidating && !pixPaymentActive) {
                                    handleApplyCode();
                                }
                            }}
                            placeholder={appliedCode ? 'Cupom aplicado' : invalidCode ? 'Cupom inválido' : 'Código de cupom ou promoter'}
                            disabled={pixPaymentActive || isValidating}
                            className={`w-full rounded-2xl border px-4 py-2.5 ${isValidating ? 'pr-32' : 'pr-20'} text-sm transition ${
                                pixPaymentActive || isValidating
                                    ? 'border-[#ded7ca] bg-[#f5f1e8] text-[#7d796c] cursor-not-allowed'
                                    : appliedCode && orderDiscountAmount && orderDiscountAmount > 0
                                    ? 'border-[#10b981] bg-[#f1fff6] text-[#1f5d3d] focus:border-[#059669] focus:outline-none'
                                    : invalidCode && codeInput.trim() && !appliedCode
                                    ? 'border-rose-400 bg-white text-rose-700 focus:border-rose-500 focus:outline-none'
                                    : 'border-[#ded7ca] bg-white text-[#1a1a1d] focus:border-[#a38f78] focus:outline-none'
                            }`}
                        />
                        {isValidating ? (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a38f78] border-t-transparent" />
                                <span className="text-xs font-medium text-[#7d796c]">Validando...</span>
                            </div>
                        ) : appliedCode && orderDiscountAmount && orderDiscountAmount > 0 ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#10b981]">
                                ✓ Aplicado
                            </span>
                        ) : invalidCode && codeInput.trim() && !appliedCode ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-rose-600">
                                ✕ Inválido
                            </span>
                        ) : null}
                    </div>
                    {(appliedCode || (invalidCode && codeInput.trim())) && !pixPaymentActive ? (
                        <button
                            type="button"
                            onClick={handleRemoveCode}
                            className="rounded-2xl border border-[#ded7ca] bg-white px-4 py-2.5 text-xs font-medium text-[#7d796c] transition hover:bg-[#f5f1e8] hover:text-[#1a1a1d]"
                        >
                            {appliedCode ? 'Trocar' : 'Limpar'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleApplyCode}
                            disabled={pixPaymentActive || isValidating || !codeInput.trim()}
                            className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold uppercase tracking-normal transition flex items-center justify-center gap-2 min-w-[80px] ${
                                pixPaymentActive || isValidating || !codeInput.trim()
                                    ? 'border-[#ded7ca] bg-[#f5f1e8] text-[#7d796c] cursor-not-allowed'
                                    : 'border-[#1a1a1d] bg-[#1a1a1d] text-white hover:bg-[#f97316] hover:border-[#f97316] hover:text-[#1a1a1d]'
                            }`}
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

            <footer className="mt-6 rounded-2xl border border-[#ede5d8] bg-white px-5 py-4">
                <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Total a pagar</span>
                <p className="mt-0 text-2xl font-bold text-[#1a1a1d]">R$ {totalAmount.toFixed(2).replace('.', ',')}</p>
            </footer>
        </div>
    );
}

