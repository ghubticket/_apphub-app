'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import MpSelect from './MpSelect';
import {
    HiOutlineCreditCard,
    HiOutlineCalendar,
    HiOutlineLockClosed,
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlineSquaresPlus,
    HiOutlineDocumentText,
    HiOutlineIdentification,
} from 'react-icons/hi2';
import { INPUT_BASE_CLASS } from '../constants';
import type { CardFieldKey } from '../types';

type PaymentStatusState = 'idle' | 'processing' | 'success' | 'error';

type CardPaymentFormProps = {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    isCheckoutReady: boolean;
    isProcessing: boolean;
    cardBrandDisplay: string;
    cardFieldErrors: Partial<Record<CardFieldKey, string>>;
    cardBrand: string;
    selectedDocType: string;
    customerEmail: string;
    onDocumentTypeChange: (value: string) => void;
    clearFieldError: (field: CardFieldKey, extraMessages?: string[]) => void;
    status: PaymentStatusState;
    statusMessage: string;
    statusDetails: string[];
    isBlocked: boolean;
    redirectCountdown: number | null;
    onStatusDismiss?: () => void;
    onStartNewOrder?: () => void;
    onNavigateToOrders?: () => void;
};

export function CardPaymentForm({
    onSubmit,
    isCheckoutReady,
    isProcessing,
    cardBrandDisplay,
    cardFieldErrors,
    cardBrand,
    selectedDocType,
    customerEmail,
    onDocumentTypeChange,
    clearFieldError,
    status,
    statusMessage,
    statusDetails,
    isBlocked,
    redirectCountdown,
    onStatusDismiss,
    onStartNewOrder,
    onNavigateToOrders,
}: CardPaymentFormProps) {
    const handleInstallmentsSelection = useCallback(() => {
        clearFieldError('installments');
    }, [clearFieldError]);

    const handleDocTypeSelection = useCallback(
        (value: string) => {
            onDocumentTypeChange(value);
            clearFieldError('identificationNumber');
        },
        [onDocumentTypeChange, clearFieldError],
    );

    const monthOptions = useMemo(
        () => [
            { value: '', text: '', disabled: true, hidden: true },
            ...Array.from({ length: 12 }, (_, index) => {
                const value = String(index + 1).padStart(2, '0');
                return { value, text: value };
            }),
        ],
        [],
    );

    const yearOptions = useMemo(() => {
        const startYear = new Date().getFullYear();
        const totalYears = 15;
        const options = Array.from({ length: totalYears + 1 }, (_, index) => {
            const fullYear = startYear + index;
            return {
                value: String(fullYear % 100).padStart(2, '0'),
                text: String(fullYear),
            };
        });
        return [{ value: '', text: '', disabled: true, hidden: true }, ...options];
    }, []);

    const showOverlay = status !== 'idle';
    const processing = status === 'processing';
    const success = status === 'success';
    const error = status === 'error';
    const overlayMessage =
        statusMessage ||
        (processing
            ? 'Estamos processando seu pagamento com segurança...'
            : success
                ? 'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.'
                : 'Não foi possível processar o pagamento. Tente novamente.');
    const errorMessages = statusDetails.length
        ? statusDetails
        : statusMessage
            ? [statusMessage]
            : [];

    const [overlayMounted, setOverlayMounted] = useState(false);
    const [overlayEntering, setOverlayEntering] = useState(false);

    useEffect(() => {
        if (showOverlay) {
            setOverlayMounted(true);
            const frame = requestAnimationFrame(() => setOverlayEntering(true));
            return () => cancelAnimationFrame(frame);
        }
        setOverlayEntering(false);
        const timeout = setTimeout(() => {
            setOverlayMounted(false);
        }, 250);
        return () => clearTimeout(timeout);
    }, [showOverlay]);

    const overlayActiveClass = overlayEntering
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 translate-y-3 pointer-events-none';

    return (
        <div className="mt-6">
            <form id="checkout-card-form" className="space-y-4" onSubmit={onSubmit} aria-busy={processing}>
                <div className="grid gap-4 md:grid-cols-6">
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-6">
                        Número do cartão
                        <div className="relative">
                            <HiOutlineCreditCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                            <input
                                id="form-checkout__cardNumber"
                                name="cardNumber"
                                type="text"
                                inputMode="numeric"
                                maxLength={23}
                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.cardNumber ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                placeholder="0000 0000 0000 0000"
                                onInput={(e) => {
                                    const target = e.currentTarget;
                                    // Padrão ISO 7812: permite cartões com 13 a 19 dígitos (flexível)
                                    // Não limitar a tamanhos específicos, apenas ao range 13-19
                                    let value = target.value.replace(/\D/g, '');
                                    
                                    // Limitar ao range ISO 7812: 13-19 dígitos
                                    if (value.length > 19) {
                                        value = value.slice(0, 19);
                                    }
                                    // Não limitar mínimo durante digitação (permite digitar livremente)
                                    // A validação na submissão verificará se está no range válido
                                    
                                    // Formatar com espaços a cada 4 dígitos
                                    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                                    target.value = formatted;
                                    clearFieldError('cardNumber', ['Número do cartão inválido.']);
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    // Padrão ISO 7812: permite cartões com 13 a 19 dígitos (flexível)
                                    let pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
                                    
                                    // Limitar ao range ISO 7812: 13-19 dígitos
                                    if (pasted.length > 19) {
                                        pasted = pasted.slice(0, 19);
                                    }
                                    // Não limitar mínimo ao colar - a validação na submissão verificará
                                    
                                    const formatted = pasted.replace(/(\d{4})(?=\d)/g, '$1 ');
                                    e.currentTarget.value = formatted;
                                    clearFieldError('cardNumber', ['Número do cartão inválido.']);
                                }}
                            />
                            {cardBrandDisplay ? (
                                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-[#a38f78]/40 bg-[#f5f1e8] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                                    {cardBrandDisplay}
                                </span>
                            ) : null}
                        </div>
                        {cardFieldErrors.cardNumber ? (
                            <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                                {cardFieldErrors.cardNumber}
                            </span>
                        ) : null}
                    </label>
                    <MpSelect
                        label="Mês"
                        selectId="form-checkout__cardExpirationMonth"
                        selectName="cardExpirationMonth"
                        icon={HiOutlineCalendar}
                        placeholder="MM"
                        classNameOverride="md:col-span-2"
                        staticOptions={monthOptions}
                        defaultValue=""
                        onSelectionChange={(value) => {
                            if (value) {
                                clearFieldError('cardExpirationMonth', ['Use dois dígitos para o mês (ex: 09).']);
                            }
                        }}
                        errorText={cardFieldErrors.cardExpirationMonth}
                    />
                    <MpSelect
                        label="Ano"
                        selectId="form-checkout__cardExpirationYear"
                        selectName="cardExpirationYear"
                        icon={HiOutlineCalendar}
                        placeholder="AA"
                        classNameOverride="md:col-span-2"
                        staticOptions={yearOptions}
                        defaultValue=""
                        onSelectionChange={(value) => {
                            if (value) {
                                clearFieldError('cardExpirationYear');
                            }
                        }}
                        errorText={cardFieldErrors.cardExpirationYear}
                    />
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2">
                        CVV
                        <div className="relative">
                            <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                            <input
                                id="form-checkout__securityCode"
                                name="securityCode"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.securityCode ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                placeholder="CVV"
                                onInput={(e) => {
                                    // Mercado Pago: CVV deve ter 3 ou 4 dígitos
                                    // 3 dígitos: Visa, Mastercard
                                    // 4 dígitos: American Express
                                    const target = e.currentTarget;
                                    let value = target.value.replace(/\D/g, '');
                                    // Limitar a 4 dígitos (máximo)
                                    if (value.length > 4) {
                                        value = value.slice(0, 4);
                                    }
                                    target.value = value;
                                    clearFieldError('securityCode', ['Código de segurança inválido.']);
                                }}
                            />
                        </div>
                        {cardFieldErrors.securityCode ? (
                            <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                                {cardFieldErrors.securityCode}
                            </span>
                        ) : null}
                    </label>

                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-6">
                        Nome igual ao cartão
                        <div className="relative">
                            <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                            <input
                                id="form-checkout__cardholderName"
                                name="cardholderName"
                                type="text"
                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.cardholderName ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                placeholder="Nome completo"
                                onInput={() => clearFieldError('cardholderName')}
                            />
                        </div>
                        {cardFieldErrors.cardholderName ? (
                            <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                                {cardFieldErrors.cardholderName}
                            </span>
                        ) : null}
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-6">
                        E-mail para recibo
                        <div className="relative">
                            <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                            <input
                                id="form-checkout__cardholderEmail"
                                name="cardholderEmail"
                                type="email"
                                defaultValue={customerEmail}
                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.cardholderEmail ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                placeholder="email@testuser.com"
                                onInput={() => clearFieldError('cardholderEmail')}
                            />
                        </div>
                        {cardFieldErrors.cardholderEmail ? (
                            <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                                {cardFieldErrors.cardholderEmail}
                            </span>
                        ) : null}
                    </label>
                    <select id="form-checkout__issuer" name="issuer" className="sr-only" aria-hidden="true" />
                    <MpSelect
                        label="Parcelas"
                        selectId="form-checkout__installments"
                        selectName="installments"
                        icon={HiOutlineSquaresPlus}
                        loadingText="Carregando parcelamento disponível"
                        placeholder="Selecione as parcelas"
                        disabled={!cardBrand}
                        classNameOverride="md:col-span-6"
                        errorText={cardFieldErrors.installments}
                        onSelectionChange={handleInstallmentsSelection}
                    />
                    <MpSelect
                        label="Tipo de documento"
                        selectId="form-checkout__identificationType"
                        selectName="identificationType"
                        icon={HiOutlineDocumentText}
                        loadingText="Carregando tipos de documento"
                        placeholder="Selecione o documento"
                        disabled={!cardBrand}
                        classNameOverride="md:col-span-3"
                        onSelectionChange={handleDocTypeSelection}
                    />
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-3">
                        CPF
                        <div className="relative">
                            <HiOutlineIdentification
                                className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${cardBrand ? 'text-[#a38f78]' : 'text-[#d3c7b5]'
                                    }`}
                            />
                            <input
                                id="form-checkout__identificationNumber"
                                name="identificationNumber"
                                type="text"
                                disabled={!cardBrand}
                                className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.identificationNumber ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                placeholder={selectedDocType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                                onInput={() => clearFieldError('identificationNumber')}
                            />
                        </div>
                        {cardFieldErrors.identificationNumber ? (
                            <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                                {cardFieldErrors.identificationNumber}
                            </span>
                        ) : null}
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={!isCheckoutReady || isProcessing}
                    className="flex w-full items-center justify-center gap-3 rounded-full bg-[#1a1a1d] px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_25px_55px_-30px_rgba(20,20,32,0.45)] transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:border-[#c9c3b8] disabled:bg-[#c9c3b8]"
                >
                    {isProcessing ? 'Processando…' : 'Pagar com cartão'}
                </button>
            </form>

            <div
                className={`pointer-events-none absolute inset-0 z-0 rounded-3xl transition-opacity duration-300 ${error ? 'bg-rose-50/80 opacity-100' : success ? 'bg-green-50/80 opacity-100' : 'opacity-0'
                    }`}
                aria-hidden="true"
            />

            {overlayMounted ? (
                <>
                    <div
                        className={`pointer-events-none absolute inset-0 z-0 rounded-3xl transition-opacity duration-300 ${error && overlayEntering ? 'bg-rose-50/90 opacity-100' : success && overlayEntering ? 'bg-green-50/90 opacity-100' : 'opacity-0'
                            }`}
                        aria-hidden="true"
                    />
                    <div
                        className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 rounded-3xl border px-6 py-10 text-center shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] backdrop-blur-sm transition-all duration-300 ease-out ${error ? 'border-rose-200 bg-transparent' : success ? 'border-green-200 bg-transparent' : 'border-[#ded7ca] bg-white/95'
                            } ${overlayActiveClass}`}
                    >
                        {processing ? (
                            <>
                                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1a1a1d]/20 border-t-[#1a1a1d]" aria-hidden="true" />
                                <p className="text-sm font-semibold uppercase tracking-nromal text-[#1a1a1d]">
                                    {overlayMessage}
                                </p>
                            </>
                        ) : null}
                        {success ? (
                            <div className="flex w-full max-w-md flex-col items-center gap-6">
                                <div className="w-full px-6 py-6 text-center text-sm leading-relaxed text-green-700">
                                    <h1 className="text-2xl font-bold uppercase text-green-600">
                                        Pagamento aprovado
                                    </h1>
                                    <div className="mt-4 space-y-2 text-sm leading-relaxed">
                                        {errorMessages.length > 0 ? (
                                            errorMessages.map((msg, index) => {
                                                // Se a mensagem já contém HTML (como <p>), renderizar como HTML
                                                // Caso contrário, envolver em <p>
                                                const hasHTML = /<[^>]+>/.test(msg);
                                                if (hasHTML) {
                                                    // Se já tem <p>, usar dangerouslySetInnerHTML
                                                    return <p key={`${msg}-${index}`} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg }} />;
                                                }
                                                // Se não tem HTML, envolver em <p>
                                                return <p key={`${msg}-${index}`} className="leading-relaxed">{msg}</p>;
                                            })
                                        ) : (
                                            <p className="leading-relaxed">{overlayMessage}</p>
                                        )}
                                    </div>
                                    {redirectCountdown !== null ? (
                                        <p className="mt-4 text-sm font-semibold text-green-600">
                                            Redirecionaremos você em {redirectCountdown}s para ver seus pedidos.
                                        </p>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={onNavigateToOrders}
                                    className="rounded-full border border-[#1a1a1d] px-6 py-3 text-[0.85rem] font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                >
                                    Ver meus pedidos
                                </button>
                            </div>
                        ) : null}
                        {error ? (
                            <div className="flex w-full max-w-md flex-col items-center gap-6">
                                <div className="w-full px-6 py-6 text-center text-sm leading-relaxed text-rose-700">
                                    <h1 className="text-2xl font-bold uppercase text-rose-600">
                                        {isBlocked ? 'Você excedeu o limite de tentativas' : 'Sua compra foi negada'}
                                    </h1>
                                    <div className="mt-4 space-y-2 text-sm leading-relaxed">
                                        {errorMessages.map((msg, index) => {
                                            // Se a mensagem já contém HTML (como <p>), renderizar como HTML
                                            // Caso contrário, envolver em <p>
                                            const hasHTML = /<[^>]+>/.test(msg);
                                            if (hasHTML) {
                                                // Se já tem <p>, usar dangerouslySetInnerHTML
                                                return <p key={`${msg}-${index}`} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg }} />;
                                            }
                                            // Se não tem HTML, envolver em <p>
                                            return <p key={`${msg}-${index}`} className="leading-relaxed">{msg}</p>;
                                        })}
                                    </div>
                                    {isBlocked && redirectCountdown !== null ? (
                                        <p className="mt-4 text-sm font-semibold text-rose-600">
                                            Redirecionaremos você em {redirectCountdown}s para iniciar um novo pedido.
                                        </p>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={isBlocked ? onStartNewOrder ?? onStatusDismiss : onStatusDismiss}
                                    className="rounded-full border border-[#1a1a1d] px-6 py-3 text-[0.85rem] font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                >
                                    {isBlocked ? 'Iniciar novo pedido agora' : 'Vamos revisar seus dados?'}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </>
            ) : null}
        </div>
    );
}

