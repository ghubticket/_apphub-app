'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    HiOutlineEnvelope,
    HiOutlineIdentification,
    HiOutlinePhone,
    HiOutlineUser,
    HiOutlineHome,
    HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2';
import type { CheckoutCustomerData } from '../types';
import { INPUT_BASE_CLASS } from '../constants';

type CustomerDataFormProps = {
    data: CheckoutCustomerData;
    disabled: boolean; // mantido por compatibilidade, mas ignorado (campos sempre editáveis)
    onChange: (field: keyof CheckoutCustomerData, value: string) => void;
    docTypeReady: boolean;
    showEditToggle?: boolean; // legado
    onEditClick?: () => void; // legado
    pixPaymentActive?: boolean;
};

export function CustomerDataForm({
    data,
    disabled, // eslint-disable-line @typescript-eslint/no-unused-vars
    onChange,
    docTypeReady,
    showEditToggle, // eslint-disable-line @typescript-eslint/no-unused-vars
    onEditClick, // eslint-disable-line @typescript-eslint/no-unused-vars
    pixPaymentActive = false,
}: CustomerDataFormProps) {
    // Campos ficam sempre abertos para edição, exceto quando PIX estiver ativo
    const isDisabled = pixPaymentActive ? true : false;
    const sharedClass = `${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${isDisabled ? 'cursor-not-allowed bg-[#f0ece2] text-[#7d796c]' : ''}`;

    // Quando PIX está ativo, forçar readonly e disabled para garantir somente leitura
    const inputProps = pixPaymentActive
        ? {
            readOnly: true,
            disabled: true,
            'aria-readonly': true,
        }
        : {
            readOnly: isDisabled,
            disabled: isDisabled,
            'aria-readonly': isDisabled,
        };

    const [showBillingInfoModal, setShowBillingInfoModal] = useState(false);
    const [billingModalEntering, setBillingModalEntering] = useState(false);
    const [isFetchingCep, setIsFetchingCep] = useState(false);

    // Fechar BillingInfoModal com ESC
    useEffect(() => {
        if (!showBillingInfoModal) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setBillingModalEntering(false);
                setTimeout(() => setShowBillingInfoModal(false), 250);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showBillingInfoModal]);

    // Bloquear scroll quando BillingInfoModal estiver aberta
    useEffect(() => {
        if (!showBillingInfoModal) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [showBillingInfoModal]);

    const handleCepBlur = useCallback(() => {
        if (isDisabled || pixPaymentActive) return;
        const digits = (data.billingZip || '').replace(/\D/g, '');
        if (digits.length !== 8) return;

        try {
            setIsFetchingCep(true);
            fetch(`https://viacep.com.br/ws/${digits}/json/`)
                .then((res) => res.json())
                .then((cepData) => {
                    if (!cepData || cepData.erro) return;
                    if (cepData.logradouro) {
                        onChange('billingStreet', cepData.logradouro);
                    }
                    if (cepData.bairro) {
                        onChange('billingNeighborhood', cepData.bairro);
                    }
                    if (cepData.localidade) {
                        onChange('billingCity', cepData.localidade);
                    }
                    if (cepData.uf) {
                        onChange('billingState', cepData.uf);
                    }
                })
                .finally(() => {
                    setIsFetchingCep(false);
                });
        } catch {
            setIsFetchingCep(false);
        }
    }, [data.billingZip, isDisabled, pixPaymentActive, onChange]);

    return (
        <div className="relative rounded-3xl border border-[#ded7ca] bg-white p-6">
            <div className="pb-5 flex md:flex-row flex-col md:items-center md:justify-between gap-4 border-b border-dashed border-[#ede5d8]">
                <div>
                    <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        Dados do comprador
                    </h2>
                    <p className="text-xs text-[#7d796c]">
                        Usaremos essas informações para gerar o pedido e os ingressos.
                    </p>
                </div>

            </div>

            {/* Dados principais do comprador */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm md:text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    Nome completo
                    <div className="relative">
                        <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="text"
                            value={data.name}
                            onChange={isDisabled ? undefined : (event) => onChange('name', event.target.value)}
                            readOnly={isDisabled}
                            disabled={isDisabled}
                            aria-readonly={isDisabled}
                            className={sharedClass}
                            placeholder="Como aparece no documento"
                        />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-sm md:text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    E-mail
                    <div className="relative">
                        <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="email"
                            value={data.email}
                            onChange={isDisabled ? undefined : (event) => onChange('email', event.target.value)}
                            {...inputProps}
                            className={sharedClass}
                            placeholder="email@exemplo.com"
                        />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-sm md:text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    CPF
                    <div className="relative">
                        <HiOutlineIdentification
                            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${docTypeReady ? 'text-[#a38f78]' : 'text-[#d3c7b5]'}`}
                        />
                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={data.cpf}
                            onChange={isDisabled ? undefined : (event) => onChange('cpf', event.target.value)}
                            {...inputProps}
                            className={sharedClass}
                            placeholder="000.000.000-00"
                        />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-sm md:text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    Celular
                    <div className="relative">
                        <HiOutlinePhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="tel"
                            inputMode="tel"
                            pattern="[0-9]*"
                            value={data.phone}
                            onChange={isDisabled ? undefined : (event) => onChange('phone', event.target.value)}
                            {...inputProps}
                            className={sharedClass}
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                </label>
            </div>

            {/* Endereço de cobrança - abaixo dos dados pessoais */}
            <div className="mt-6 border-t border-dashed border-[#ede5d8] pt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 md:pb-6">
                    <div>
                        <p className="text-xs pb-1 font-semibold uppercase tracking-normal text-[#1a1a1d]">
                            Endereço de cobrança
                        </p>
                        <p className="text-[0.65rem] leading-none text-[#7d796c]">
                            Opcional, mas ajuda o Mercado Pago a aprovar seu pagamento com mais segurança.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-normal text-[#7d796c] hover:text-[#1a1a1d]"
                        onClick={() => {
                            setShowBillingInfoModal(true);
                            requestAnimationFrame(() => {
                                setBillingModalEntering(true);
                            });
                        }}
                    >
                        <HiOutlineQuestionMarkCircle className="text-base" />
                        <span>Por que pedimos?</span>
                    </button>
                </div>

                <div className="mt-2 grid gap-3 md:grid-cols-5">
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-2">
                        Rua / Avenida
                        <div className="relative">
                            <HiOutlineHome className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                            <input
                                type="text"
                                value={data.billingStreet || ''}
                                onChange={isDisabled ? undefined : (event) => onChange('billingStreet', event.target.value)}
                                {...inputProps}
                                className={sharedClass}
                                placeholder="Ex.: Rua Exemplo"
                            />
                        </div>
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        Número
                        <div className="relative">
                            <input
                                type="text"
                                value={data.billingNumber || ''}
                                onChange={isDisabled ? undefined : (event) => onChange('billingNumber', event.target.value)}
                                {...inputProps}
                                className={sharedClass.replace('pl-11', 'pl-4')}
                                placeholder="123"
                            />
                        </div>
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-2">
                        Bairro
                        <div className="relative">
                            <input
                                type="text"
                                value={data.billingNeighborhood || ''}
                                onChange={isDisabled ? undefined : (event) => onChange('billingNeighborhood', event.target.value)}
                                {...inputProps}
                                className={sharedClass.replace('pl-11', 'pl-4')}
                                placeholder="Seu bairro"
                            />
                        </div>
                    </label>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        CEP
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={data.billingZip || ''}
                                onChange={isDisabled ? undefined : (event) => onChange('billingZip', event.target.value)}
                                onBlur={handleCepBlur}
                                {...inputProps}
                                className={sharedClass.replace('pl-11', 'pl-4')}
                                placeholder="00000-000"
                            />
                        </div>
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-2">
                        Cidade
                        <div className="relative">
                            <input
                                type="text"
                                value={data.billingCity || ''}
                                onChange={isDisabled ? undefined : (event) => onChange('billingCity', event.target.value)}
                                {...inputProps}
                                className={sharedClass.replace('pl-11', 'pl-4')}
                                placeholder="São Paulo"
                            />
                        </div>
                    </label>

                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        UF
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={2}
                                value={data.billingState || ''}
                                onChange={isDisabled ? undefined : (event) => onChange('billingState', event.target.value.toUpperCase())}
                                {...inputProps}
                                className={sharedClass.replace('pl-11', 'pl-4')}
                                placeholder="SP"
                            />
                        </div>
                    </label>
                </div>
            </div>

            {/* Modal de explicação de LGPD / endereço de cobrança */}
            {showBillingInfoModal && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 ${billingModalEntering ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => {
                        setBillingModalEntering(false);
                        setTimeout(() => setShowBillingInfoModal(false), 250);
                    }}
                >
                    <div
                        className={`mx-4 w-full max-w-md rounded-2xl bg-white p-6 text-sm text-[#1a1a1d] shadow-2xl transition-all duration-300 ${billingModalEntering ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-3 text-base font-semibold uppercase tracking-normal text-[#1a1a1d]">
                            Por que pedimos o endereço de cobrança?
                        </h3>
                        <div className="space-y-2 text-xs text-[#4c4c55]">
                            <p>
                                - Usamos esses dados apenas para enviar mais informações ao Mercado Pago e
                                ajudar na análise antifraude e aprovação do seu pagamento.
                            </p>
                            <p>
                                - Não usamos essas informações para marketing e não compartilhamos com
                                outros parceiros além do próprio processador de pagamento.
                            </p>
                            <p>
                                - O tratamento segue a LGPD (Lei Geral de Proteção de Dados) e você pode
                                deixar o endereço em branco se preferir, mas informar aumenta a
                                confiabilidade da transação em alguns casos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setBillingModalEntering(false);
                                setTimeout(() => setShowBillingInfoModal(false), 250);
                            }}
                            className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[#1a1a1d] bg-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

