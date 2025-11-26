import { useMemo } from 'react';

const EMAIL_DOMAIN_SUGGESTIONS = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'live.com',
    'me.com',
];

/**
 * Hook para sugerir domínios de email comuns enquanto o usuário digita.
 * - Mostra sugestões apenas enquanto o email AINDA não é válido.
 * - Não sugere nada para domínios .com.br (para não atrapalhar emails reais).
 */
export function useEmailSuggestions(email: string): string[] {
    return useMemo(() => {
        const value = email.trim();
        const atIndex = value.indexOf('@');
        if (atIndex === -1) return [];

        const localPart = value.slice(0, atIndex);
        const domainPart = value.slice(atIndex + 1);
        if (!localPart) return [];

        // Se o email já é válido, não sugerir nada
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(value)) return [];

        // Não sugerir para domínios .com.br (muito usados de forma legítima)
        if (domainPart.toLowerCase().includes('.com.br')) return [];

        const matches = EMAIL_DOMAIN_SUGGESTIONS.filter((d) =>
            d.startsWith(domainPart.toLowerCase())
        );
        return matches.slice(0, 5).map((d) => `${localPart}@${d}`);
    }, [email]);
}


