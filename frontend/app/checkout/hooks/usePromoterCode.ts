'use client';

import { useState, useCallback, useRef } from 'react';
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

interface CacheEntry {
    result: ValidatePromoterCodeResponse;
    timestamp: number;
}

/**
 * Hook para validar código de promotor/cupom
 * REFATORADO: Adicionado debounce, cache e melhor tratamento de erros
 * OTIMIZADO: Evita múltiplas chamadas e re-validações desnecessárias
 */
export function usePromoterCode(): UsePromoterCodeReturn {
    const [isValidating, setIsValidating] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);

    // Limpar cache após 5 minutos
    const CACHE_TTL = 5 * 60 * 1000;
    const DEBOUNCE_DELAY = 300;

    const validateCode = useCallback(
        async (code: string, eventId: string): Promise<ValidatePromoterCodeResponse> => {
            if (!code || !eventId) {
                return {
                    success: false,
                    valid: false,
                    message: 'Código e ID do evento são obrigatórios',
                };
            }

            const normalizedCode = code.toUpperCase().trim();
            const cacheKey = `${normalizedCode}:${eventId}`;

            // Verificar cache
            const cached = cacheRef.current.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return cached.result;
            }

            // Cancelar requisição anterior se existir
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Criar novo AbortController
            abortControllerRef.current = new AbortController();

            // Limpar debounce anterior
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            return new Promise((resolve) => {
                debounceTimerRef.current = setTimeout(async () => {
                    setIsValidating(true);
                    try {
                        const response = await api.get(`/promoters/validate`, {
                            params: {
                                code: normalizedCode,
                                eventId,
                            },
                            signal: abortControllerRef.current?.signal,
                            timeout: 10000, // 10 segundos de timeout
                        });

                        const data = response.data;
                        const result: ValidatePromoterCodeResponse = {
                            success: data.success || false,
                            valid: data.valid || false,
                            data: data.data,
                            message: data.message,
                        };

                        // Salvar no cache
                        cacheRef.current.set(cacheKey, {
                            result,
                            timestamp: Date.now(),
                        });

                        // Limpar cache antigo (manter apenas últimos 10)
                        if (cacheRef.current.size > 10) {
                            const firstKey = cacheRef.current.keys().next().value;
                            if (firstKey) {
                                cacheRef.current.delete(firstKey);
                            }
                        }

                        resolve(result);
                    } catch (error: any) {
                        // Ignorar erros de abort
                        if (error.name === 'AbortError' || error.name === 'CanceledError') {
                            return;
                        }

                        const result: ValidatePromoterCodeResponse = {
                            success: false,
                            valid: false,
                            message: error?.response?.data?.message || error?.message || 'Erro ao validar código',
                        };

                        resolve(result);
                    } finally {
                        setIsValidating(false);
                        abortControllerRef.current = null;
                    }
                }, DEBOUNCE_DELAY);
            });
        },
        []
    );

    return {
        validateCode,
        isValidating,
    };
}

