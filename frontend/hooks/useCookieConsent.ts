'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_CONSENT_EXPIRY_DAYS = 365;

export type CookieConsentStatus = 'pending' | 'accepted' | 'rejected';

export interface CookieConsent {
    status: CookieConsentStatus;
    timestamp: number;
}

export function useCookieConsent() {
    const [consent, setConsent] = useState<CookieConsent | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (stored) {
                const parsed: CookieConsent = JSON.parse(stored);
                // Verificar se o consentimento ainda é válido (não expirou)
                const expiryDate = parsed.timestamp + COOKIE_CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                if (Date.now() < expiryDate) {
                    setConsent(parsed);
                } else {
                    // Consentimento expirado, remover
                    localStorage.removeItem(COOKIE_CONSENT_KEY);
                    setConsent(null);
                }
            }
        } catch (error) {
            localStorage.removeItem(COOKIE_CONSENT_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const acceptCookies = () => {
        const newConsent: CookieConsent = {
            status: 'accepted',
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
            setConsent(newConsent);
        } catch (error) {
        }
    };

    const rejectCookies = () => {
        const newConsent: CookieConsent = {
            status: 'rejected',
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
            setConsent(newConsent);
        } catch (error) {
        }
    };

    const showBanner = !isLoading && consent === null;

    // Função para resetar o cookie (útil para desenvolvimento/testes)
    const resetCookieConsent = () => {
        try {
            localStorage.removeItem(COOKIE_CONSENT_KEY);
            setConsent(null);
        } catch (error) {
        }
    };

    return {
        consent,
        isLoading,
        showBanner,
        acceptCookies,
        rejectCookies,
        resetCookieConsent, // Exportar para uso em dev
    };
}

