'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface ValidatePromoterCodeResponse {
    success: boolean;
    valid: boolean;
    data?: {
        code: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
    };
    message?: string;
}

interface UsePromoterCodeReturn {
    validateCode: (code: string, eventId: string) => Promise<ValidatePromoterCodeResponse>;
    isValidating: boolean;
}

/**
 * Hook para validar código de promotor/cupom
 */
export function usePromoterCode(): UsePromoterCodeReturn {
    const [isValidating, setIsValidating] = useState(false);

    const validateCode = useCallback(async (code: string, eventId: string): Promise<ValidatePromoterCodeResponse> => {
        if (!code || !eventId) {
            return {
                success: false,
                valid: false,
                message: 'Código e ID do evento são obrigatórios',
            };
        }

        setIsValidating(true);
        try {
            const response = await api.get(`/promoters/validate`, {
                params: {
                    code: code.toUpperCase().trim(),
                    eventId,
                },
            });

            const data = response.data;
            return {
                success: data.success || false,
                valid: data.valid || false,
                data: data.data,
                message: data.message,
            };
        } catch (error: any) {
            console.error('[usePromoterCode] ❌ Erro ao validar código:', error);
            return {
                success: false,
                valid: false,
                message: error?.response?.data?.message || error?.message || 'Erro ao validar código',
            };
        } finally {
            setIsValidating(false);
        }
    }, []);

    return {
        validateCode,
        isValidating,
    };
}

