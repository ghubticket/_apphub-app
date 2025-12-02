'use client';

import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
    submessage?: string;
    fullscreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente de loading spinner reutilizável
 * Baseado no loading do checkout, mas adaptado para uso geral
 */
export function LoadingSpinner({ 
    message = 'Carregando...', 
    submessage,
    fullscreen = false,
    size = 'md'
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-8 w-8 border-2',
        md: 'h-16 w-16 border-4',
        lg: 'h-24 w-24 border-4'
    };

    const spinner = (
        <div className="flex flex-col items-center gap-6">
            {/* Spinner animado */}
            <div className="relative">
                <div className={`${sizeClasses[size]} animate-spin rounded-full border-[#ded7ca] border-t-[#f97316]`}></div>
                <div className={`absolute inset-0 ${sizeClasses[size]} animate-ping rounded-full border-[#f97316] opacity-20`}></div>
            </div>
            
            {/* Mensagem */}
            <div className="text-center">
                <p className="text-lg font-semibold text-[#1a1a1d]">{message}</p>
                {submessage && (
                    <p className="mt-2 text-sm text-[#7d796c]">{submessage}</p>
                )}
            </div>
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f5f1e8]/95 backdrop-blur-sm">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12">
            {spinner}
        </div>
    );
}

/**
 * Loading simples para uso inline
 */
export function InlineLoading({ message = 'Carregando...' }: { message?: string }) {
    return (
        <div className="flex items-center justify-center gap-3 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#ded7ca] border-t-[#f97316]"></div>
            <p className="text-sm text-[#7d796c]">{message}</p>
        </div>
    );
}

