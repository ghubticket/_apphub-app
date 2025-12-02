'use client';

import React from 'react';
import Link from 'next/link';
import { HiOutlineTicket } from 'react-icons/hi2';

interface BuyTicketButtonProps {
    href?: string;
    onClick?: () => void;
    className?: string;
    variant?: 'primary' | 'dark';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    children?: React.ReactNode;
}

export default function BuyTicketButton({
    href,
    onClick,
    className = '',
    variant = 'primary',
    size = 'md',
    disabled = false,
    children = 'Comprar Ingresso',
}: BuyTicketButtonProps) {
    // Estilos base
    const baseStyles = 'inline-flex items-center hover:text-white gap-2 rounded-full font-semibold uppercase tracking-normal text-white transition-all';
    
    // Variantes de cor
    const variantStyles = {
        primary: 'border-2 border-[#f97316]/30 bg-[#f97316] hover:bg-[#ea580c] hover:border-[#f97316]/50',
        dark: 'bg-[#1a1a1d] hover:bg-[#f97316] hover:text-white',
    };
    
    // Tamanhos
    const sizeStyles = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-6 py-3.5 text-sm',
    };
    
    // Tamanhos do ícone
    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-4 w-4 md:h-5 md:w-5',
        lg: 'h-5 w-5',
    };
    
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;
    
    const icon = <HiOutlineTicket className={iconSizes[size]} />;
    
    // Se tiver href, renderiza como Link
    if (href) {
        return (
            <Link href={href} className={combinedClassName}>
                {icon}
                <span>{children}</span>
            </Link>
        );
    }
    
    // Caso contrário, renderiza como button
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={combinedClassName}
        >
            {icon}
            <span>{children}</span>
        </button>
    );
}

