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
import { validators, type ValidationResult } from '../utils/validationRules';

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
    
    // Consolidar todos os erros em um único objeto
    const [errors, setErrors] = useState<Record<string, string>>({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        billingStreet: '',
        billingNumber: '',
        billingNeighborhood: '',
        billingZip: '',
        billingCity: '',
        billingState: '',
    });

    // Helper para atualizar erro de um campo específico
    const setFieldError = useCallback((field: string, error: string) => {
        setErrors(prev => ({ ...prev, [field]: error }));
    }, []);

    // Helper para limpar erro de um campo específico
    const clearFieldError = useCallback((field: string) => {
        setErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    // Helper para limpar múltiplos erros de uma vez
    const clearMultipleErrors = useCallback((fields: string[]) => {
        setErrors(prev => {
            const updated = { ...prev };
            fields.forEach(field => {
                updated[field] = '';
            });
            return updated;
        });
    }, []);

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
        
        // Validar CEP antes de buscar
        const zipResult = validators.billingZip(data.billingZip || '');
        if (!zipResult.isValid) {
            setFieldError('billingZip', zipResult.error);
            return;
        }

        const digits = (data.billingZip || '').replace(/\D/g, '');
        if (digits.length !== 8) return;

        setIsFetchingCep(true);
        
        // Timeout para evitar requisições muito longas
        const timeoutId = setTimeout(() => {
            setIsFetchingCep(false);
            setFieldError('billingZip', 'Tempo limite excedido ao buscar CEP. Tente novamente.');
        }, 10000); // 10 segundos

        fetch(`https://viacep.com.br/ws/${digits}/json/`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((cepData) => {
                clearTimeout(timeoutId);
                
                if (!cepData || cepData.erro) {
                    setFieldError('billingZip', 'CEP não encontrado. Verifique e tente novamente.');
                    setIsFetchingCep(false);
                    return;
                }
                
                // Preencher campos e limpar erros automaticamente
                const fieldsToClear: string[] = ['billingZip'];
                
                if (cepData.logradouro) {
                    onChange('billingStreet', cepData.logradouro);
                    fieldsToClear.push('billingStreet');
                }
                if (cepData.bairro) {
                    onChange('billingNeighborhood', cepData.bairro);
                    fieldsToClear.push('billingNeighborhood');
                }
                if (cepData.localidade) {
                    onChange('billingCity', cepData.localidade);
                    fieldsToClear.push('billingCity');
                }
                if (cepData.uf) {
                    onChange('billingState', cepData.uf);
                    fieldsToClear.push('billingState');
                }
                
                // Limpar todos os erros dos campos preenchidos
                clearMultipleErrors(fieldsToClear);
                setIsFetchingCep(false);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                setIsFetchingCep(false);
                console.error('Erro ao buscar CEP:', error);
                setFieldError('billingZip', 'Erro ao buscar CEP. Verifique sua conexão e tente novamente.');
            });
    }, [data.billingZip, isDisabled, pixPaymentActive, onChange, setFieldError, clearMultipleErrors]);

    // Função para validar todos os campos e mostrar erros
    const validateAll = useCallback(() => {
        const validationResults: Record<string, ValidationResult> = {
            name: validators.name(data.name || ''),
            email: validators.email(data.email || ''),
            cpf: validators.cpf(data.cpf || ''),
            phone: validators.phone(data.phone || ''),
            billingStreet: validators.billingStreet(data.billingStreet || ''),
            billingNumber: validators.billingNumber(data.billingNumber || ''),
            billingNeighborhood: validators.billingNeighborhood(data.billingNeighborhood || ''),
            billingZip: validators.billingZip(data.billingZip || ''),
            billingCity: validators.billingCity(data.billingCity || ''),
            billingState: validators.billingState(data.billingState || ''),
        };

        // Atualizar todos os erros de uma vez
        setErrors(prev => {
            const updated = { ...prev };
            Object.keys(validationResults).forEach(field => {
                updated[field] = validationResults[field].error;
            });
            return updated;
        });

        // Retornar true se todos os campos são válidos
        return Object.values(validationResults).every(result => result.isValid);
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
                                if (errors.name) {
                                    clearFieldError('name');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                const result = validators.name(data.name || '');
                                setFieldError('name', result.error);
                            }}
                            readOnly={isDisabled}
                            disabled={isDisabled}
                            aria-readonly={isDisabled}
                            className={`${sharedClass} ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Como aparece no documento"
                        />
                    </div>
                    {errors.name && (
                        <span className="text-xs text-red-600 mt-1">{errors.name}</span>
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
                                if (errors.email) {
                                    clearFieldError('email');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                const result = validators.email(data.email || '');
                                setFieldError('email', result.error);
                            }}
                            {...inputProps}
                            className={`${sharedClass} ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="email@exemplo.com"
                        />
                    </div>
                    {errors.email && (
                        <span className="text-xs text-red-600 mt-1">{errors.email}</span>
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
                                if (errors.cpf) {
                                    clearFieldError('cpf');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                const result = validators.cpf(data.cpf || '');
                                setFieldError('cpf', result.error);
                            }}
                            {...inputProps}
                            className={`${sharedClass} ${errors.cpf ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="000.000.000-00"
                        />
                    </div>
                    {errors.cpf && (
                        <span className="text-xs text-red-600 mt-1">{errors.cpf}</span>
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
                                if (errors.phone) {
                                    clearFieldError('phone');
                                }
                            }}
                            onBlur={isDisabled ? undefined : () => {
                                const result = validators.phone(data.phone || '');
                                setFieldError('phone', result.error);
                            }}
                            {...inputProps}
                            className={`${sharedClass} ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                    {errors.phone && (
                        <span className="text-xs text-red-600 mt-1">{errors.phone}</span>
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
                                    if (errors.billingStreet) {
                                        clearFieldError('billingStreet');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const result = validators.billingStreet(data.billingStreet || '');
                                    setFieldError('billingStreet', result.error);
                                }}
                                {...inputProps}
                                className={`${sharedClass} ${errors.billingStreet ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Ex.: Rua Exemplo"
                            />
                        </div>
                        {errors.billingStreet && (
                            <span className="text-xs text-red-600 mt-1">{errors.billingStreet}</span>
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
                                    if (errors.billingNumber) {
                                        clearFieldError('billingNumber');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const result = validators.billingNumber(data.billingNumber || '');
                                    setFieldError('billingNumber', result.error);
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${errors.billingNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="123"
                            />
                        </div>
                        {errors.billingNumber && (
                            <span className="text-xs text-red-600 mt-1">{errors.billingNumber}</span>
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
                                    if (errors.billingNeighborhood) {
                                        clearFieldError('billingNeighborhood');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const result = validators.billingNeighborhood(data.billingNeighborhood || '');
                                    setFieldError('billingNeighborhood', result.error);
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${errors.billingNeighborhood ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Seu bairro"
                            />
                        </div>
                        {errors.billingNeighborhood && (
                            <span className="text-xs text-red-600 mt-1">{errors.billingNeighborhood}</span>
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
                                    if (errors.billingZip) {
                                        clearFieldError('billingZip');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const result = validators.billingZip(data.billingZip || '');
                                    setFieldError('billingZip', result.error);
                                    if (result.isValid) {
                                        handleCepBlur();
                                    }
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${errors.billingZip ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="00000-000"
                            />
                        </div>
                        {errors.billingZip && (
                            <span className="text-xs text-red-600 mt-1">{errors.billingZip}</span>
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
                                    if (errors.billingCity) {
                                        clearFieldError('billingCity');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const result = validators.billingCity(data.billingCity || '');
                                    setFieldError('billingCity', result.error);
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${errors.billingCity ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="São Paulo"
                            />
                        </div>
                        {errors.billingCity && (
                            <span className="text-xs text-red-600 mt-1">{errors.billingCity}</span>
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
                                    if (errors.billingState) {
                                        clearFieldError('billingState');
                                    }
                                }}
                                onBlur={isDisabled ? undefined : () => {
                                    const result = validators.billingState(data.billingState || '');
                                    setFieldError('billingState', result.error);
                                }}
                                {...inputProps}
                                className={`${sharedClass.replace('pl-11', 'pl-4')} ${errors.billingState ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="SP"
                            />
                        </div>
                        {errors.billingState && (
                            <span className="text-xs text-red-600 mt-1">{errors.billingState}</span>
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

