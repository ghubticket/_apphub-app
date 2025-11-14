'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { HiOutlineChevronDown } from 'react-icons/hi2';
import { SELECT_BASE_CLASS } from '../constants';

type StaticOption = {
    value: string;
    text: string;
    disabled?: boolean;
    hidden?: boolean;
};

type MpSelectProps = {
    label: string;
    selectId: string;
    selectName: string;
    icon: IconType;
    badgeLabel?: string;
    loadingText?: string;
    placeholder?: string;
    disabled?: boolean;
    classNameOverride?: string;
    onSelectionChange?: (value: string) => void;
    errorText?: string;
    staticOptions?: StaticOption[];
    defaultValue?: string;
};

type MpSelectOption = {
    value: string;
    text: string;
    disabled: boolean;
    hidden: boolean;
};

export default function MpSelect({
    label,
    selectId,
    selectName,
    icon: Icon,
    badgeLabel,
    loadingText,
    placeholder,
    disabled,
    classNameOverride,
    onSelectionChange,
    errorText,
    staticOptions,
    defaultValue = '',
}: MpSelectProps) {
    const [displayText, setDisplayText] = useState('');
    const [selectedValue, setSelectedValue] = useState('');
    const [options, setOptions] = useState<MpSelectOption[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLLabelElement | null>(null);
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const selectElement = document.getElementById(selectId) as HTMLSelectElement | null;
        selectRef.current = selectElement;
        if (!selectElement) {
            setDisplayText('');
            setOptions([]);
            setSelectedValue('');
            return;
        }

        const syncFromSelect = () => {
            const option = selectElement.options[selectElement.selectedIndex];
            const nextValue = selectElement.value || '';
            setDisplayText(option ? option.text : '');
            setSelectedValue(nextValue);
            const mappedOptions: MpSelectOption[] = Array.from(selectElement.options).map((opt) => ({
                value: opt.value,
                text: opt.text,
                disabled: opt.disabled,
                hidden: opt.hidden,
            }));
            setOptions(mappedOptions);
            if (onSelectionChange) {
                onSelectionChange(nextValue);
            }
        };

        syncFromSelect();
        selectElement.addEventListener('change', syncFromSelect);

        const observer = new MutationObserver(() => {
            syncFromSelect();
            // Forçar atualização do estado de opções no DOM após mudanças
            if (selectRef.current) {
                const domOptions = Array.from(selectRef.current.options).filter(
                    (opt) => !opt.hidden && !opt.disabled && opt.value !== ''
                );
                setHasOptionsInDOM(domOptions.length > 0);
            }
        });
        observer.observe(selectElement, { childList: true, subtree: true, attributes: true });

        return () => {
            selectElement.removeEventListener('change', syncFromSelect);
            observer.disconnect();
        };
    }, [selectId, onSelectionChange]);

    // Para selects controlados pelo Mercado Pago (como installments), não manipular options
    // Apenas para selects estáticos (como docType) podemos popular
    useEffect(() => {
        if (!selectRef.current || !staticOptions) return;
        
        // Se o select tem atributo data-mp-element, é controlado pelo Mercado Pago - não manipular
        const selectElement = selectRef.current;
        if (selectElement.hasAttribute('data-mp-element')) {
            return;
        }

        const shouldUpdateOptions =
            selectElement.options.length !== staticOptions.length ||
            Array.from(selectElement.options).some((option, index) => {
                const staticOption = staticOptions[index];
                if (!staticOption) return true;
                return (
                    option.value !== staticOption.value ||
                    option.text !== staticOption.text ||
                    option.disabled !== Boolean(staticOption.disabled) ||
                    option.hidden !== Boolean(staticOption.hidden)
                );
            });

        if (shouldUpdateOptions) {
            selectElement.innerHTML = '';
            staticOptions.forEach((option) => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.text = option.text;
                optionElement.disabled = Boolean(option.disabled);
                optionElement.hidden = Boolean(option.hidden);
                selectElement.appendChild(optionElement);
            });
        }

        const targetValue =
            defaultValue ??
            (staticOptions.find((option) => !option.disabled && !option.hidden)?.value ?? '');
        if (selectElement.value !== targetValue) {
            selectElement.value = targetValue;
        }
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }, [staticOptions, defaultValue]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (disabled && isOpen) {
            setIsOpen(false);
        }
    }, [disabled, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            triggerRef.current?.blur();
        }
    }, [isOpen]);

    const visibleOptions = useMemo(
        () => options.filter((option) => !option.hidden && !option.disabled),
        [options],
    );
    const hasOptions = visibleOptions.length > 0;

    // Verificar também diretamente no DOM se há opções (mais confiável)
    // Isso garante que mesmo se o estado não estiver sincronizado, verificamos o DOM real
    const [hasOptionsInDOM, setHasOptionsInDOM] = useState(false);

    // Verificar opções no DOM sempre que as opções mudarem ou quando o componente montar
    useEffect(() => {
        if (!selectRef.current) {
            setHasOptionsInDOM(false);
            return;
        }
        const checkDOMOptions = () => {
            const domOptions = Array.from(selectRef.current!.options).filter(
                (opt) => !opt.hidden && !opt.disabled && opt.value !== ''
            );
            setHasOptionsInDOM(domOptions.length > 0);
        };
        
        checkDOMOptions();
        
        // Verificar periodicamente também para garantir sincronização
        const interval = setInterval(checkDOMOptions, 100);
        
        return () => clearInterval(interval);
    }, [options, selectId]);

    // Mostrar loading APENAS quando:
    // 1. Está desabilitado (campo não habilitado ainda)
    // 2. OU quando não há opções disponíveis (nem no estado nem no DOM) e não está desabilitado (aguardando Mercado Pago)
    // NUNCA mostrar loading se já há opções disponíveis (no estado OU no DOM)
    const isLoading = disabled || (!hasOptions && !hasOptionsInDOM && !disabled && loadingText);
    const fallbackText = isLoading ? loadingText ?? '' : '';
    const rawDisplay = (displayText || fallbackText || '').trim();
    const effectivePlaceholder = placeholder || 'Selecione uma opção';
    const textToShow =
        !rawDisplay
            ? (isLoading && loadingText ? loadingText : effectivePlaceholder)
            : placeholder && rawDisplay === placeholder
                ? placeholder
                : rawDisplay;
    const IconColor = disabled ? 'text-[#d3c7b5]' : 'text-[#a38f78]';
    const ArrowColor = disabled ? 'text-[#d3c7b5]' : 'text-[#a38f78]';
    const errorClass = errorText ? 'border-rose-400 focus:border-rose-500 text-[#1a1a1d]' : '';

    const toggleDropdown = () => {
        if (disabled || !hasOptions) return;
        setIsOpen((prev) => !prev);
    };

    const handleOptionSelect = (option: MpSelectOption) => {
        if (option.disabled) return;
        const selectElement = selectRef.current;
        if (!selectElement) return;
        selectElement.value = option.value;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        setDisplayText(option.text);
        setSelectedValue(option.value);
        if (onSelectionChange) {
            onSelectionChange(option.value);
        }
        setTimeout(() => setIsOpen(false), 0);
    };

    return (
        <label
            ref={containerRef}
            className={`relative flex flex-col gap-2 text-xs font-500 uppercase tracking-normal text-[#1a1a1d] md:col-span-2 ${classNameOverride || ''
                }`}
        >
            <span className="flex items-center justify-between">
                <span>{label}</span>
                {badgeLabel ? (
                    <span className="rounded-full border border-[#a38f78]/40 bg-[#f5f1e8] px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                        {badgeLabel}
                    </span>
                ) : null}
            </span>
            <div className="relative">
                <Icon className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${IconColor}`} />
                <button
                    type="button"
                    disabled={disabled || !hasOptions}
                    onClick={toggleDropdown}
                    ref={triggerRef}
                    className={`${SELECT_BASE_CLASS} flex w-full items-center justify-between py-3 pl-11 pr-10 text-left ${disabled ? 'text-[#b5aa92]' : 'text-[#1a1d]'
                        } ${disabled || !hasOptions ? 'cursor-not-allowed' : 'cursor-pointer'} ${errorClass}`}
                >
                    <span className="block w-full truncate">{textToShow || '\u00A0'}</span>
                    <HiOutlineChevronDown className={`ml-3 shrink-0 transition-transform ${ArrowColor} ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* 
                    IMPORTANTE: Este select é controlado pelo Mercado Pago SDK.
                    Não adicionar value controlado pelo React, options manuais, ou onChange.
                    O Mercado Pago popula as opções dinamicamente.
                    O MpSelect apenas observa mudanças no DOM via MutationObserver.
                */}
                <select
                    id={selectId}
                    name={selectName}
                    disabled={disabled}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                />
                {isOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-[#ded7ca] bg-white shadow-[0_25px_50px_-25px_rgba(26,26,29,0.4)]">
                        <ul className="max-h-64 overflow-y-auto py-2">
                            {options.map((option) => {
                                const isSelected = option.value === selectedValue;
                                return (
                                    <li key={`${selectId}-${option.value}`}>
                                        <button
                                            type="button"
                                            disabled={option.disabled}
                                            onClick={() => handleOptionSelect(option)}
                                            className={`flex w-full items-center tracking-normal justify-between px-4 py-2 text-sm text-left transition ${option.disabled
                                                ? 'cursor-not-allowed text-[#c5bcaa]'
                                                : 'cursor-pointer text-[#1a1a1d] hover:bg-[#f5f1e8]'
                                                } ${isSelected ? 'bg-[#f5f1e8] font-semibold text-[#a38f78]' : ''}`}
                                        >
                                            <span className="truncate">{option.text}</span>
                                            {isSelected ? (
                                                <span className="ml-3 text-[0.65rem] uppercase tracking-normal text-[#a38f78]">
                                                    Selecionado
                                                </span>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : null}
                {errorText ? (
                    <span className="mt-1 block text-[0.65rem] font-normal uppercase tracking-normal text-rose-600">{errorText}</span>
                ) : null}
            </div>
        </label>
    );
}

