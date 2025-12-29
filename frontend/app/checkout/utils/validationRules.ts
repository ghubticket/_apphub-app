import { normalizeCpf, isValidCpf } from '@/utils/sanitize';

export type ValidationResult = {
    isValid: boolean;
    error: string;
};

/**
 * Validadores reutilizáveis para campos do formulário de checkout
 */
export const validators = {
    name: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe o nome completo.' };
        }
        if (value.trim().length < 3) {
            return { isValid: false, error: 'Nome deve ter pelo menos 3 caracteres.' };
        }
        return { isValid: true, error: '' };
    },

    email: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe um e-mail válido.' };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
            return { isValid: false, error: 'E-mail inválido.' };
        }
        return { isValid: true, error: '' };
    },

    cpf: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe seu CPF.' };
        }
        const digits = normalizeCpf(value);
        if (digits.length !== 11) {
            return { isValid: false, error: 'CPF deve ter 11 dígitos.' };
        }
        if (!isValidCpf(value)) {
            return { isValid: false, error: 'CPF inválido. Verifique os dígitos e tente novamente.' };
        }
        return { isValid: true, error: '' };
    },

    phone: (value: string): ValidationResult => {
        const phoneDigits = (value || '').replace(/\D/g, '');
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe um telefone válido com DDD.' };
        }
        if (phoneDigits.length < 10) {
            return { isValid: false, error: 'Telefone deve ter pelo menos 10 dígitos (com DDD).' };
        }
        return { isValid: true, error: '' };
    },

    billingStreet: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe a rua/avenida.' };
        }
        return { isValid: true, error: '' };
    },

    billingNumber: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe o número.' };
        }
        return { isValid: true, error: '' };
    },

    billingNeighborhood: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe o bairro.' };
        }
        return { isValid: true, error: '' };
    },

    billingZip: (value: string): ValidationResult => {
        const zipDigits = (value || '').replace(/\D/g, '');
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe o CEP.' };
        }
        if (zipDigits.length !== 8) {
            return { isValid: false, error: 'CEP deve ter 8 dígitos.' };
        }
        return { isValid: true, error: '' };
    },

    billingCity: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe a cidade.' };
        }
        return { isValid: true, error: '' };
    },

    billingState: (value: string): ValidationResult => {
        if (!value || !value.trim()) {
            return { isValid: false, error: 'Informe o estado (UF).' };
        }
        if (value.trim().length !== 2) {
            return { isValid: false, error: 'UF deve ter 2 caracteres.' };
        }
        return { isValid: true, error: '' };
    },
} as const;

