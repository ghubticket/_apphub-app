'use client';

import { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
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
import { normalizeCpf, formatCpfDisplay, isValidCpf } from '@/utils/sanitize';

type CustomerDataFormProps = {
    data: CheckoutCustomerData;
    disabled: boolean; // mantido por compatibilidade, mas ignorado (campos sempre editáveis)
    onChange: (field: keyof CheckoutCustomerData, value: string) => void;
    docTypeReady: boolean;
    showEditToggle?: boolean; // legado
    onEditClick?: () => void; // legado
    pixPaymentActive?: boolean;
};

export type CustomerDataFormRef = {
    validateAll: () => boolean;
};

const CustomerDataFormComponent = forwardRef<CustomerDataFormRef, CustomerDataFormProps>(({
    data,
    disabled, // eslint-disable-line @typescript-eslint/no-unused-vars
    onChange,
    docTypeReady,
    showEditToggle, // eslint-disable-line @typescript-eslint/no-unused-vars
    onEditClick, // eslint-disable-line @typescript-eslint/no-unused-vars
    pixPaymentActive = false,
}, ref) => {
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
    const [cpfError, setCpfError] = useState<string>('');
    const [nameError, setNameError] = useState<string>('');
    const [emailError, setEmailError] = useState<string>('');
    const [phoneError, setPhoneError] = useState<string>('');
    const [billingStreetError, setBillingStreetError] = useState<string>('');
    const [billingNumberError, setBillingNumberError] = useState<string>('');
    const [billingNeighborhoodError, setBillingNeighborhoodError] = useState<string>('');
    const [billingZipError, setBillingZipError] = useState<string>('');
    const [billingCityError, setBillingCityError] = useState<string>('');
    const [billingStateError, setBillingStateError] = useState<string>('');

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
                    if (!cepData || cepData.erro) {
                        setIsFetchingCep(false);
                        return;
                    }
                    
                    // Preencher campos e limpar erros automaticamente
                    if (cepData.logradouro) {
                        onChange('billingStreet', cepData.logradouro);
                        setBillingStreetError('');
                    }
                    if (cepData.bairro) {
                        onChange('billingNeighborhood', cepData.bairro);
                        setBillingNeighborhoodError('');
                    }
                    if (cepData.localidade) {
                        onChange('billingCity', cepData.localidade);
                        setBillingCityError('');
                    }
                    if (cepData.uf) {
                        onChange('billingState', cepData.uf);
                        setBillingStateError('');
                    }
                })
                .finally(() => {
                    setIsFetchingCep(false);
                });
        } catch {
            setIsFetchingCep(false);
        }
    }, [data.billingZip, isDisabled, pixPaymentActive, onChange]);

    // Função para validar todos os campos e mostrar erros
    const validateAll = useCallback(() => {
        let hasError = false;

        // Validar nome
        if (!data.name || !data.name.trim()) {
            setNameError('Informe o nome completo.');
            hasError = true;
        } else if (data.name.trim().length < 3) {
            setNameError('Nome deve ter pelo menos 3 caracteres.');
            hasError = true;
        } else {
            setNameError('');
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !data.email.trim()) {
            setEmailError('Informe um e-mail válido.');
            hasError = true;
        } else if (!emailRegex.test(data.email.trim())) {
            setEmailError('E-mail inválido.');
            hasError = true;
        } else {
            setEmailError('');
        }

        // Validar CPF
        const cpfValue = data.cpf || '';
        if (!cpfValue || !cpfValue.trim()) {
            setCpfError('Informe seu CPF.');
            hasError = true;
        } else {
            const digits = normalizeCpf(cpfValue);
            if (digits.length !== 11) {
                setCpfError('CPF deve ter 11 dígitos.');
                hasError = true;
            } else if (!isValidCpf(cpfValue)) {
                setCpfError('CPF inválido. Verifique os dígitos e tente novamente.');
                hasError = true;
            } else {
                setCpfError('');
            }
        }

        // Validar telefone
        const phoneDigits = (data.phone || '').replace(/\D/g, '');
        if (!data.phone || !data.phone.trim()) {
            setPhoneError('Informe um telefone válido com DDD.');
            hasError = true;
        } else if (phoneDigits.length < 10) {
            setPhoneError('Telefone deve ter pelo menos 10 dígitos (com DDD).');
            hasError = true;
        } else {
            setPhoneError('');
        }

        // Validar endereço de cobrança - TODOS obrigatórios
        if (!data.billingStreet || !data.billingStreet.trim()) {
            setBillingStreetError('Informe a rua/avenida.');
            hasError = true;
        } else {
            setBillingStreetError('');
        }

        if (!data.billingNumber || !data.billingNumber.trim()) {
            setBillingNumberError('Informe o número.');
            hasError = true;
        } else {
            setBillingNumberError('');
        }

        if (!data.billingNeighborhood || !data.billingNeighborhood.trim()) {
            setBillingNeighborhoodError('Informe o bairro.');
            hasError = true;
        } else {
            setBillingNeighborhoodError('');
        }

        const zipDigits = (data.billingZip || '').replace(/\D/g, '');
        if (!data.billingZip || !data.billingZip.trim()) {
            setBillingZipError('Informe o CEP.');
            hasError = true;
        } else if (zipDigits.length !== 8) {
            setBillingZipError('CEP deve ter 8 dígitos.');
            hasError = true;
        } else {
            setBillingZipError('');
        }

        if (!data.billingCity || !data.billingCity.trim()) {
            setBillingCityError('Informe a cidade.');
            hasError = true;
        } else {
            setBillingCityError('');
        }

        if (!data.billingState || !data.billingState.trim()) {
            setBillingStateError('Informe o estado (UF).');
            hasError = true;
        } else if (data.billingState.trim().length !== 2) {
            setBillingStateError('UF deve ter 2 caracteres.');
            hasError = true;
        } else {
            setBillingStateError('');
        }

        return !hasError;
    }, [data.name, data.email, data.cpf, data.phone, data.billingStreet, data.billingNumber, data.billingNeighborhood, data.billingZip, data.billingCity, data.billingState]);

    // Expor função de validação via ref
    useImperativeHandle(ref, () => ({
        validateAll,
    }), [validateAll]);

    return (
        <div id="customer-data-form" className="relative rounded-3xl border border-[#ded7ca] bg-white p-6">
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
                            onChange={isDisabled ? undefined : (event) => {
                                onChange('name', event.target.value);
                                if (nameError) {
                                    setNameError('');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                if (!data.name || !data.name.trim()) {
                                    setNameError('Informe o nome completo.');
                                } else if (data.name.trim().length < 3) {
                                    setNameError('Nome deve ter pelo menos 3 caracteres.');
                                } else {
                                    setNameError('');
                                }
                            }}
                            readOnly={isDisabled}
                            disabled={isDisabled}
                            aria-readonly={isDisabled}
                            className={`${sharedClass} ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Como aparece no documento"
                        />
                    </div>
                    {nameError && (
                        <span className="text-xs text-red-600 mt-1">{nameError}</span>
                    )}
                </label>
                <label className="flex flex-col gap-2 text-sm md:text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    E-mail
                    <div className="relative">
                        <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="email"
                            value={data.email}
                            onChange={isDisabled ? undefined : (event) => {
                                onChange('email', event.target.value);
                                if (emailError) {
                                    setEmailError('');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (!data.email || !data.email.trim()) {
                                    setEmailError('Informe um e-mail válido.');
                                } else if (!emailRegex.test(data.email.trim())) {
                                    setEmailError('E-mail inválido.');
                                } else {
                                    setEmailError('');
                                }
                            }}
                            {...inputProps}
                            className={`${sharedClass} ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="email@exemplo.com"
                        />
                    </div>
                    {emailError && (
                        <span className="text-xs text-red-600 mt-1">{emailError}</span>
                    )}
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
                            onChange={isDisabled ? undefined : (event) => {
                                // Aplicar máscara de CPF
                                const normalized = normalizeCpf(event.target.value);
                                const formatted = formatCpfDisplay(normalized);
                                onChange('cpf', formatted);
                                // Limpar erro quando começar a digitar
                                if (cpfError) {
                                    setCpfError('');
                                }
                            }}
                            onBlur={isDisabled ? undefined : (event) => {
                                // Validar CPF quando sair do campo
                                const cpfValue = event.target.value;
                                if (!cpfValue || !cpfValue.trim()) {
                                    setCpfError('Informe seu CPF.');
                                    return;
                                }
                                const digits = normalizeCpf(cpfValue);
                                if (digits.length !== 11) {
                                    setCpfError('CPF deve ter 11 dígitos.');
                                    return;
                                }
                                if (!isValidCpf(cpfValue)) {
                                    setCpfError('CPF inválido. Verifique os dígitos e tente novamente.');
                                    return;
                                }
                                // CPF válido, limpar erro
                                setCpfError('');
                            }}
                            {...inputProps}
                            className={`${sharedClass} ${cpfError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="000.000.000-00"
                        />
                    </div>
                    {cpfError && (
                        <span className="text-xs text-red-600 mt-1">{cpfError}</span>
                    )}
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
                            onChange={isDisabled ? undefined : (event) => {
                                onChange('phone', event.target.value);
                                if (phoneError) {
                                    setPhoneError('');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                const phoneDigits = (data.phone || '').replace(/\D/g, '');
                                if (!data.phone || !data.phone.trim()) {
                                    setPhoneError('Informe um telefone válido com DDD.');
                                } else if (phoneDigits.length < 10) {
                                    setPhoneError('Telefone deve ter pelo menos 10 dígitos (com DDD).');
                                } else {
                                    setPhoneError('');
                                }
                            }}
                            {...inputProps}
                            className={`${sharedClass} ${phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                    {phoneError && (
                        <span className="text-xs text-red-600 mt-1">{phoneError}</span>
                    )}
                </label>
                <label className="flex flex-col gap-2 text-sm md:text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    RG (opcional)
                    <div className="relative">
                        <HiOutlineIdentification className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="text"
                            value={data.rg || ''}
                            onChange={isDisabled ? undefined : (event) => onChange('rg', event.target.value)}
                            {...inputProps}
                            className={sharedClass}
                            placeholder="00.000.000-0"
                        />
                    </div>
                    <p className="text-[0.65rem] text-[#7d796c] mt-1">
                        Necessário apenas para pacotes de transporte
                    </p>
                </label>
            </div>

            {/* Endereço de cobrança - abaixo dos dados pessoais */}
            <div className="mt-6 border-t border-dashed border-[#ede5d8] pt-4 relative">
                {/* Loading overlay quando está buscando CEP */}
                {isFetchingCep && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#a38f78] border-t-transparent" />
                            <p className="text-xs text-[#7d796c]">Buscando endereço...</p>
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 md:pb-6">
                    <div>
                        <p className="text-xs pb-1 font-semibold uppercase tracking-normal text-[#1a1a1d]">
                            Endereço de cobrança
                        </p>
                        <p className="text-[0.65rem] leading-none text-[#7d796c]">
                            Todos os campos são obrigatórios para pagamento com cartão.
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
                                onChange={isDisabled ? undefined : (event) => {
                                    onChange('billingStreet', event.target.value);
                                    if (billingStreetError) {
                                        setBillingStreetError('');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    if (!data.billingStreet || !data.billingStreet.trim()) {
                                        setBillingStreetError('Informe a rua/avenida.');
                                    } else {
                                        setBillingStreetError('');
                                    }
                                }}
                                {...inputProps}
                                className={`${sharedClass} ${billingStreetError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Ex.: Rua Exemplo"
                            />
                        </div>
                        {billingStreetError && (
                            <span className="text-xs text-red-600 mt-1">{billingStreetError}</span>
                        )}
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        Número
                        <div className="relative">
                            <input
                                type="text"
                                value={data.billingNumber || ''}
                                onChange={isDisabled ? undefined : (event) => {
                                    onChange('billingNumber', event.target.value);
                                    if (billingNumberError) {
                                        setBillingNumberError('');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    if (!data.billingNumber || !data.billingNumber.trim()) {
                                        setBillingNumberError('Informe o número.');
                                    } else {
                                        setBillingNumberError('');
                                    }
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${billingNumberError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="123"
                            />
                        </div>
                        {billingNumberError && (
                            <span className="text-xs text-red-600 mt-1">{billingNumberError}</span>
                        )}
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-2">
                        Bairro
                        <div className="relative">
                            <input
                                type="text"
                                value={data.billingNeighborhood || ''}
                                onChange={isDisabled ? undefined : (event) => {
                                    onChange('billingNeighborhood', event.target.value);
                                    if (billingNeighborhoodError) {
                                        setBillingNeighborhoodError('');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    if (!data.billingNeighborhood || !data.billingNeighborhood.trim()) {
                                        setBillingNeighborhoodError('Informe o bairro.');
                                    } else {
                                        setBillingNeighborhoodError('');
                                    }
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${billingNeighborhoodError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Seu bairro"
                            />
                        </div>
                        {billingNeighborhoodError && (
                            <span className="text-xs text-red-600 mt-1">{billingNeighborhoodError}</span>
                        )}
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
                                onChange={isDisabled ? undefined : (event) => {
                                    onChange('billingZip', event.target.value);
                                    if (billingZipError) {
                                        setBillingZipError('');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const zipDigits = (data.billingZip || '').replace(/\D/g, '');
                                    if (!data.billingZip || !data.billingZip.trim()) {
                                        setBillingZipError('Informe o CEP.');
                                    } else if (zipDigits.length !== 8) {
                                        setBillingZipError('CEP deve ter 8 dígitos.');
                                    } else {
                                        setBillingZipError('');
                                    }
                                    handleCepBlur();
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${billingZipError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="00000-000"
                            />
                        </div>
                        {billingZipError && (
                            <span className="text-xs text-red-600 mt-1">{billingZipError}</span>
                        )}
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] md:col-span-2">
                        Cidade
                        <div className="relative">
                            <input
                                type="text"
                                value={data.billingCity || ''}
                                onChange={isDisabled ? undefined : (event) => {
                                    onChange('billingCity', event.target.value);
                                    if (billingCityError) {
                                        setBillingCityError('');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    if (!data.billingCity || !data.billingCity.trim()) {
                                        setBillingCityError('Informe a cidade.');
                                    } else {
                                        setBillingCityError('');
                                    }
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${billingCityError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="São Paulo"
                            />
                        </div>
                        {billingCityError && (
                            <span className="text-xs text-red-600 mt-1">{billingCityError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        UF
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={2}
                                value={data.billingState || ''}
                                onChange={isDisabled ? undefined : (event) => {
                                    onChange('billingState', event.target.value.toUpperCase());
                                    if (billingStateError) {
                                        setBillingStateError('');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    if (!data.billingState || !data.billingState.trim()) {
                                        setBillingStateError('Informe o estado (UF).');
                                    } else if (data.billingState.trim().length !== 2) {
                                        setBillingStateError('UF deve ter 2 caracteres.');
                                    } else {
                                        setBillingStateError('');
                                    }
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${billingStateError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="SP"
                            />
                        </div>
                        {billingStateError && (
                            <span className="text-xs text-red-600 mt-1">{billingStateError}</span>
                        )}
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
                            className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[#1a1a1d] bg-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#f97316] hover:text-white"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

CustomerDataFormComponent.displayName = 'CustomerDataForm';

export const CustomerDataForm = CustomerDataFormComponent;

