'use client';

import { useCallback } from 'react';
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

type CardPaymentFormProps = {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    isCheckoutReady: boolean;
    isProcessing: boolean;
    cardBrandDisplay: string;
    cardFieldErrors: Partial<Record<CardFieldKey, string>>;
    cardBrand: string;
    mpSelectReady: { installments: boolean; docType: boolean };
    selectedDocType: string;
    customerEmail: string;
    onDocumentTypeChange: (value: string) => void;
    clearFieldError: (field: CardFieldKey, extraMessages?: string[]) => void;
};

export function CardPaymentForm({
    onSubmit,
    isCheckoutReady,
    isProcessing,
    cardBrandDisplay,
    cardFieldErrors,
    cardBrand,
    mpSelectReady,
    selectedDocType,
    customerEmail,
    onDocumentTypeChange,
    clearFieldError,
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

    return (
        <form id="checkout-card-form" className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-6">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-6">
                    Número do cartão
                    <div className="relative">
                        <HiOutlineCreditCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            id="form-checkout__cardNumber"
                            name="cardNumber"
                            type="text"
                            className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.cardNumber ? 'border-rose-400 focus:border-rose-500' : ''}`}
                            placeholder="0000 0000 0000 0000"
                            onInput={() => clearFieldError('cardNumber', ['Número do cartão inválido.'])}
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
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2">
                    Mês
                    <div className="relative">
                        <HiOutlineCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            id="form-checkout__cardExpirationMonth"
                            name="cardExpirationMonth"
                            type="text"
                            className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.cardExpirationMonth ? 'border-rose-400 focus:border-rose-500' : ''}`}
                            placeholder="MM"
                            onInput={() => clearFieldError('cardExpirationMonth', ['Use dois dígitos para o mês (ex: 09).'])}
                        />
                    </div>
                    {cardFieldErrors.cardExpirationMonth ? (
                        <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                            {cardFieldErrors.cardExpirationMonth}
                        </span>
                    ) : null}
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2">
                    Ano
                    <div className="relative">
                        <HiOutlineCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            id="form-checkout__cardExpirationYear"
                            name="cardExpirationYear"
                            type="text"
                            className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.cardExpirationYear ? 'border-rose-400 focus:border-rose-500' : ''}`}
                            placeholder="AA"
                            onInput={() => clearFieldError('cardExpirationYear')}
                        />
                    </div>
                    {cardFieldErrors.cardExpirationYear ? (
                        <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                            {cardFieldErrors.cardExpirationYear}
                        </span>
                    ) : null}
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-2">
                    CVV
                    <div className="relative">
                        <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            id="form-checkout__securityCode"
                            name="securityCode"
                            type="text"
                            className={`${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${cardFieldErrors.securityCode ? 'border-rose-400 focus:border-rose-500' : ''}`}
                            placeholder="CVV"
                            onInput={() => clearFieldError('securityCode', ['Código de segurança inválido.'])}
                        />
                    </div>
                    {cardFieldErrors.securityCode ? (
                        <span className="text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">
                            {cardFieldErrors.securityCode}
                        </span>
                    ) : null}
                </label>

                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-6">
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
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-6">
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
                    loadingText="Carregando…"
                    placeholder="Selecione as parcelas"
                    disabled={!cardBrand || !mpSelectReady.installments}
                    classNameOverride="md:col-span-6"
                    errorText={cardFieldErrors.installments}
                    onSelectionChange={handleInstallmentsSelection}
                />
                <MpSelect
                    label="Tipo de documento"
                    selectId="form-checkout__identificationType"
                    selectName="identificationType"
                    icon={HiOutlineDocumentText}
                    loadingText="Carregando…"
                    placeholder="Selecione o documento"
                    disabled={!cardBrand || !mpSelectReady.docType}
                    classNameOverride="md:col-span-3"
                    onSelectionChange={handleDocTypeSelection}
                />
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d] md:col-span-3">
                    CPF
                    <div className="relative">
                        <HiOutlineIdentification
                            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${mpSelectReady.docType ? 'text-[#a38f78]' : 'text-[#d3c7b5]'
                                }`}
                        />
                        <input
                            id="form-checkout__identificationNumber"
                            name="identificationNumber"
                            type="text"
                            disabled={!cardBrand || !mpSelectReady.docType}
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
    );
}

