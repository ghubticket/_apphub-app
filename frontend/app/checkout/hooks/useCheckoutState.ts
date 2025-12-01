'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useCheckoutStorage } from './useCheckoutStorage';
import { useCheckoutNavigation } from './useCheckoutNavigation';
import { getRemainingSeconds } from '../utils/orderHelpers';
import type { CheckoutOrder } from './useCheckoutOrder';

interface UseCheckoutStateOptions {
    order: CheckoutOrder | null;
    cardPaymentStatus: 'idle' | 'processing' | 'success' | 'error';
    cardPaymentRedirectCountdown: number | null;
    pixPaymentStatus: 'idle' | 'processing' | 'success' | 'error';
    pixPaymentRedirectCountdown: number | null;
    pixResult: any | null;
}

interface UseCheckoutStateReturn {
    selectedTab: 'card' | 'pix';
    setSelectedTab: (tab: 'card' | 'pix') => void;
    showExitWarning: boolean;
    setShowExitWarning: (show: boolean) => void;
    hasPendingOrderInStorage: boolean;
    hasPendingPayment: boolean;
    hasValidTimerInStorage: boolean;
    timerActive: boolean;
    remainingSeconds: number | null;
    isPaymentApproved: boolean;
    hasGeneratedPix: boolean;
}

/**
 * Hook para gerenciar estado consolidado do checkout
 * Consolida lógica de tabs, modais, timers e status de pagamento
 */
export function useCheckoutState({
    order,
    cardPaymentStatus,
    cardPaymentRedirectCountdown,
    pixPaymentStatus,
    pixPaymentRedirectCountdown,
    pixResult,
}: UseCheckoutStateOptions): UseCheckoutStateReturn {
    const storage = useCheckoutStorage();
    const navigation = useCheckoutNavigation();
    
    const [selectedTab, setSelectedTab] = useState<'card' | 'pix'>('card');
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [hasValidTimerInStorage, setHasValidTimerInStorage] = useState(() => {
        if (typeof window === 'undefined') return false;
        const savedStartTime = storage.loadTimer();
        if (savedStartTime) {
            const elapsed = Date.now() - savedStartTime;
            const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
            return remaining > 0;
        }
        return false;
    });

    // Estados derivados
    const hasPendingOrderInStorage = useMemo(() => {
        return !!(order?._id && order.status === 'pending');
    }, [order?._id, order?.status]);

    const hasPendingPayment = useMemo(() => {
        return !!(order?.status === 'pending' && order?._id);
    }, [order?.status, order?._id]);

    const hasGeneratedPix = useMemo(() => {
        // Verificar se há pixResult OU se há flag PIX ativa no sessionStorage
        // Isso garante que mesmo após reload, a navegação seja liberada se o PIX foi gerado
        const hasPixResult = !!pixResult;
        const hasPixFlag = storage.getPixOrderActive() !== null;
        return hasPixResult || hasPixFlag;
    }, [pixResult, storage]);

    const isPaymentApproved = useMemo(() => {
        return cardPaymentStatus === 'success' ||
               cardPaymentRedirectCountdown !== null ||
               pixPaymentStatus === 'success' ||
               pixPaymentRedirectCountdown !== null ||
               false; // manter aprovado apenas por sucesso, não por ter gerado PIX
    }, [cardPaymentStatus, cardPaymentRedirectCountdown, pixPaymentStatus, pixPaymentRedirectCountdown]);

    const timerActive = useMemo(() => {
        return !!(order?.status === 'pending' && order.expiresAt) || 
               (hasPendingOrderInStorage && hasValidTimerInStorage);
    }, [order?.status, order?.expiresAt, hasPendingOrderInStorage, hasValidTimerInStorage]);

    const remainingSeconds = useMemo(() => {
        if (order?.expiresAt) {
            const remaining = getRemainingSeconds(order.expiresAt);
            // Log removido para reduzir ruído - aparece a cada segundo
            return remaining;
        }

        // Fallback: usar timer do localStorage se não temos pedido carregado
        if (hasPendingOrderInStorage && hasValidTimerInStorage) {
            const savedStartTime = storage.loadTimer();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
                const remainingSecs = Math.floor(remaining / 1000);
                console.log('[useCheckoutState] ⏰ Calculando remainingSeconds do localStorage:', {
                    savedStartTime: new Date(savedStartTime).toISOString(),
                    elapsed,
                    remaining,
                    remainingSecs,
                    now: new Date().toISOString(),
                });
                return remainingSecs;
            }
        }

        console.log('[useCheckoutState] ⚠️ Nenhum timer disponível:', {
            hasOrderExpiresAt: !!order?.expiresAt,
            hasPendingOrderInStorage,
            hasValidTimerInStorage,
        });
        return null;
    }, [order?.expiresAt, hasPendingOrderInStorage, hasValidTimerInStorage, storage]);

    // Atualizar estado do timer a cada segundo quando há orderId no storage mas não há pedido carregado
    useEffect(() => {
        if (!hasPendingOrderInStorage || order) {
            if (!hasPendingOrderInStorage) {
                setHasValidTimerInStorage(false);
            }
            return;
        }

        const checkTimer = () => {
            const savedStartTime = storage.loadTimer();
            if (savedStartTime) {
                const elapsed = Date.now() - savedStartTime;
                const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutos
                setHasValidTimerInStorage(remaining > 0);
            } else {
                setHasValidTimerInStorage(false);
            }
        };

        checkTimer();
        const interval = setInterval(checkTimer, 1000);

        return () => clearInterval(interval);
    }, [hasPendingOrderInStorage, order, storage]);

    // Travar aba de cartão quando QR code PIX é gerado
    useEffect(() => {
        if (pixResult && selectedTab === 'card') {
            console.log('[useCheckoutState] 🔒 QR code PIX gerado - travando aba de cartão');
            setSelectedTab('pix');
        }
    }, [pixResult, selectedTab]);

    // Definir flag global quando pagamento é aprovado
    // CRÍTICO: Usar refs para evitar loop infinito
    const lastPaymentApprovedRef = useRef(isPaymentApproved);
    useEffect(() => {
        // Só executar se o estado realmente mudou
        if (lastPaymentApprovedRef.current === isPaymentApproved) {
            return;
        }
        
        lastPaymentApprovedRef.current = isPaymentApproved;
        
        if (isPaymentApproved && typeof window !== 'undefined') {
            navigation.allowNavigation();
        } else if (typeof window !== 'undefined') {
            // Só bloquear se não houver pedido ou se o pedido não estiver pago
            navigation.blockNavigation();
        }
    }, [isPaymentApproved]); // Removido navigation das dependências

    return {
        selectedTab,
        setSelectedTab,
        showExitWarning,
        setShowExitWarning,
        hasPendingOrderInStorage,
        hasPendingPayment,
        hasValidTimerInStorage,
        timerActive,
        remainingSeconds,
        isPaymentApproved,
        hasGeneratedPix,
    };
}

