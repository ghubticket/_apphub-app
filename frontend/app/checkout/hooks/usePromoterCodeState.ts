'use client';

import { useReducer, useCallback, useRef } from 'react';

export interface PromoterCodeStatus {
    type: 'success' | 'error' | null;
    message: string;
}

export interface AppliedDiscountInfo {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
}

interface PromoterCodeState {
    codeInput: string;
    codeStatus: PromoterCodeStatus;
    appliedCode: string | null;
    appliedDiscountInfo: AppliedDiscountInfo | null;
    invalidCode: string | null;
}

type PromoterCodeAction =
    | { type: 'SET_CODE_INPUT'; payload: string }
    | { type: 'SET_CODE_STATUS'; payload: PromoterCodeStatus }
    | { type: 'SET_APPLIED_CODE'; payload: { code: string; discountInfo: AppliedDiscountInfo } | null }
    | { type: 'SET_INVALID_CODE'; payload: string | null }
    | { type: 'CLEAR_ALL' }
    | { type: 'CLEAR_STATUS' }
    | { type: 'SYNC_FROM_ORDER'; payload: { code: string } }
    | { type: 'SET_CODE_STATUS_DIRECT'; payload: PromoterCodeStatus };

const initialState: PromoterCodeState = {
    codeInput: '',
    codeStatus: { type: null, message: '' },
    appliedCode: null,
    appliedDiscountInfo: null,
    invalidCode: null,
};

function promoterCodeReducer(state: PromoterCodeState, action: PromoterCodeAction): PromoterCodeState {
    switch (action.type) {
        case 'SET_CODE_INPUT':
            return {
                ...state,
                codeInput: action.payload,
            };

        case 'SET_CODE_STATUS':
            return {
                ...state,
                codeStatus: action.payload,
            };

        case 'SET_APPLIED_CODE':
            if (action.payload === null) {
                return {
                    ...state,
                    appliedCode: null,
                    appliedDiscountInfo: null,
                    invalidCode: null,
                };
            }
            return {
                ...state,
                appliedCode: action.payload.code,
                appliedDiscountInfo: action.payload.discountInfo,
                invalidCode: null,
                codeStatus: {
                    type: 'success',
                    message: 'Você recebeu um desconto!',
                },
            };

        case 'SET_INVALID_CODE':
            return {
                ...state,
                invalidCode: action.payload,
                appliedCode: null,
                appliedDiscountInfo: null,
                codeStatus: action.payload
                    ? {
                          type: 'error',
                          message: 'Código inválido ou não válido para este evento',
                      }
                    : { type: null, message: '' },
            };

        case 'SET_CODE_STATUS':
            return {
                ...state,
                codeStatus: action.payload,
            };

        case 'CLEAR_ALL':
            return initialState;

        case 'CLEAR_STATUS':
            return {
                ...state,
                codeStatus: { type: null, message: '' },
            };

        case 'SYNC_FROM_ORDER':
            return {
                ...state,
                codeInput: action.payload.code,
                appliedCode: action.payload.code,
                invalidCode: null,
                codeStatus: {
                    type: 'success',
                    message: 'Você recebeu um desconto!',
                },
            };

        default:
            return state;
    }
}

export interface UsePromoterCodeStateReturn {
    state: PromoterCodeState;
    updateInput: (value: string) => void;
    setAppliedCode: (code: string, discountInfo: AppliedDiscountInfo) => void;
    setInvalidCode: (code: string | null, message?: string) => void;
    setCodeStatus: (status: PromoterCodeStatus) => void;
    clearAll: () => void;
    clearStatus: () => void;
    syncFromOrder: (code: string) => void;
    invalidCodeRef: React.MutableRefObject<string | null>;
    isSettingInvalidCodeRef: React.MutableRefObject<boolean>;
}

/**
 * Hook para gerenciar estado do código de promotor/cupom
 * REFATORADO: Usa useReducer para consolidar múltiplos useState
 * OTIMIZADO: Estado consolidado e previsível
 */
export function usePromoterCodeState(): UsePromoterCodeStateReturn {
    const [state, dispatch] = useReducer(promoterCodeReducer, initialState);

    // Refs para persistência e controle
    const invalidCodeRef = useRef<string | null>(null);
    const isSettingInvalidCodeRef = useRef(false);

    // Sincronizar ref com state
    if (state.invalidCode) {
        invalidCodeRef.current = state.invalidCode;
    }

    const updateInput = useCallback((value: string) => {
        dispatch({ type: 'SET_CODE_INPUT', payload: value });
    }, []);

    const setAppliedCode = useCallback((code: string, discountInfo: AppliedDiscountInfo) => {
        dispatch({ type: 'SET_APPLIED_CODE', payload: { code, discountInfo } });
        invalidCodeRef.current = null;
    }, []);

    const setInvalidCode = useCallback((code: string | null, message?: string) => {
        if (code) {
            isSettingInvalidCodeRef.current = true;
            invalidCodeRef.current = code;
            // Resetar flag após delay
            setTimeout(() => {
                isSettingInvalidCodeRef.current = false;
            }, 2000);
        } else {
            invalidCodeRef.current = null;
            isSettingInvalidCodeRef.current = false;
        }
        dispatch({ type: 'SET_INVALID_CODE', payload: code });
        if (message) {
            dispatch({ type: 'SET_CODE_STATUS_DIRECT', payload: { type: 'error', message } });
        }
    }, []);

    const setCodeStatus = useCallback((status: PromoterCodeStatus) => {
        dispatch({ type: 'SET_CODE_STATUS', payload: status });
    }, []);

    const clearAll = useCallback(() => {
        dispatch({ type: 'CLEAR_ALL' });
        invalidCodeRef.current = null;
        isSettingInvalidCodeRef.current = false;
    }, []);

    const clearStatus = useCallback(() => {
        dispatch({ type: 'CLEAR_STATUS' });
    }, []);

    const syncFromOrder = useCallback((code: string) => {
        dispatch({ type: 'SYNC_FROM_ORDER', payload: { code } });
        invalidCodeRef.current = null;
    }, []);

    return {
        state,
        updateInput,
        setAppliedCode,
        setInvalidCode,
        setCodeStatus,
        clearAll,
        clearStatus,
        syncFromOrder,
        invalidCodeRef,
        isSettingInvalidCodeRef,
    };
}

