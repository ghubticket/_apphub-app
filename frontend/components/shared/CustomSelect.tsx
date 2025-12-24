'use client';

import { useRef, useEffect, useState } from 'react';

interface CustomSelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: CustomSelectOption[];
    placeholder?: string;
    required?: boolean;
    className?: string;
    label?: string;
    error?: boolean;
    errorMessage?: string;
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Selecione uma opção',
    required = false,
    className = '',
    label,
    error = false,
    errorMessage,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-[0.75rem] font-medium text-[#1a1a1d] mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div ref={selectRef} className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full rounded-lg border bg-white px-3 py-2 text-[0.85rem] text-[#1a1a1d] 
                        focus:outline-none focus:ring-1 transition-all
                        flex items-center justify-between
                        ${error 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                            : 'border-[#ded7ca] focus:border-[#a38f78] focus:ring-[#a38f78]'
                        }
                        ${isOpen ? 'ring-1 ring-[#a38f78] border-[#a38f78]' : ''}
                    `}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span className={selectedOption ? 'text-[#1a1a1d]' : 'text-[#7d796c]'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        className={`w-4 h-4 text-[#a38f78] transition-transform duration-200 ${
                            isOpen ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-[#ded7ca] rounded-lg shadow-lg max-h-60 overflow-auto">
                        <ul
                            role="listbox"
                            className="py-1"
                        >
                            {options.length === 0 ? (
                                <li className="px-3 py-2 text-[0.85rem] text-[#7d796c]">
                                    Nenhuma opção disponível
                                </li>
                            ) : (
                                options.map((option) => (
                                    <li
                                        key={option.value}
                                        role="option"
                                        aria-selected={value === option.value}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`
                                            px-3 py-2 text-[0.85rem] cursor-pointer transition-colors
                                            ${value === option.value
                                                ? 'bg-[#f5f1e8] text-[#1a1a1d] font-medium'
                                                : 'text-[#1a1a1d] hover:bg-[#faf7f0]'
                                            }
                                        `}
                                    >
                                        {option.label}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>
            {error && errorMessage && (
                <p className="text-[0.7rem] text-red-600 mt-1">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}

