/**
 * Utilitários para validação de tipos de dados nos controllers
 * Previne erros de tipo e garante que dados sejam do formato esperado
 */

/**
 * Valida e normaliza string
 * Retorna string normalizada ou null se inválido
 */
export function validateString(
    value: any,
    fieldName: string,
    options?: { required?: boolean; maxLength?: number; minLength?: number; trim?: boolean }
): string | null {
    const { required = false, maxLength, minLength, trim = true } = options || {};

    // Se não é obrigatório e está vazio/null/undefined, retornar null
    if (!required && (value === null || value === undefined || value === '')) {
        return null;
    }

    // Se é obrigatório e está vazio, lançar erro
    if (required && (value === null || value === undefined || value === '')) {
        throw new Error(`${fieldName} é obrigatório`);
    }

    // Converter para string se não for
    const str = typeof value === 'string' ? value : String(value);

    // Trim se solicitado
    const normalized = trim ? str.trim() : str;

    // Validar comprimento mínimo
    if (minLength !== undefined && normalized.length < minLength) {
        throw new Error(`${fieldName} deve ter pelo menos ${minLength} caracteres`);
    }

    // Validar comprimento máximo
    if (maxLength !== undefined && normalized.length > maxLength) {
        throw new Error(`${fieldName} deve ter no máximo ${maxLength} caracteres`);
    }

    return normalized;
}

/**
 * Valida e normaliza email
 */
export function validateEmail(value: any, fieldName: string = 'Email', required: boolean = false): string | null {
    const email = validateString(value, fieldName, { required, trim: true, maxLength: 255 });

    if (!email) {
        return null;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error(`${fieldName} deve ter um formato válido`);
    }

    return email.toLowerCase();
}

/**
 * Valida e normaliza CPF
 * Aceita CPF com ou sem formatação, retorna normalizado (apenas dígitos)
 */
export function validateCPF(value: any, fieldName: string = 'CPF', required: boolean = false): string | null {
    const cpf = validateString(value, fieldName, { required, trim: true });

    if (!cpf) {
        return null;
    }

    // Caso já venha criptografado/hasheado (ex: payload cifrado), não tentar validar formato
    if (cpf.includes(':') || /^[a-f0-9:]+$/i.test(cpf)) {
        return cpf;
    }

    // Remover formatação (pontos e traços)
    const normalized = cpf.replace(/\D/g, '');

    // Validar comprimento (11 dígitos)
    if (normalized.length !== 11) {
        throw new Error(`${fieldName} deve ter 11 dígitos`);
    }

    // Validar dígitos verificadores (importar função se disponível)
    try {
        const { isValidCpf } = require('./cpf');
        if (!isValidCpf(normalized)) {
            throw new Error(`${fieldName} inválido. Verifique os dígitos e tente novamente.`);
        }
    } catch (error) {
        // Se função não disponível, apenas validar formato
    }

    return normalized;
}

/**
 * Valida e normaliza WhatsApp/Telefone
 * Aceita telefone com ou sem formatação, retorna normalizado (apenas dígitos)
 */
export function validatePhone(
    value: any,
    fieldName: string = 'WhatsApp',
    required: boolean = false
): string | null {
    const phone = validateString(value, fieldName, { required, trim: true });

    if (!phone) {
        return null;
    }

    // Caso já venha criptografado/hasheado (ex: payload cifrado), não tentar normalizar
    if (phone.includes(':') || /^[a-f0-9:]+$/i.test(phone)) {
        return phone;
    }

    // Remover formatação
    const normalized = phone.replace(/\D/g, '');

    // Validar comprimento (10 ou 11 dígitos: DDD + número)
    if (normalized.length < 10 || normalized.length > 11) {
        throw new Error(`${fieldName} deve ter 10 ou 11 dígitos (com DDD)`);
    }

    return normalized;
}

/**
 * Valida e normaliza número
 */
export function validateNumber(
    value: any,
    fieldName: string,
    options?: { required?: boolean; min?: number; max?: number; integer?: boolean }
): number | null {
    const { required = false, min, max, integer = false } = options || {};

    // Se não é obrigatório e está vazio/null/undefined, retornar null
    if (!required && (value === null || value === undefined || value === '')) {
        return null;
    }

    // Se é obrigatório e está vazio, lançar erro
    if (required && (value === null || value === undefined || value === '')) {
        throw new Error(`${fieldName} é obrigatório`);
    }

    // Converter para número
    const num = typeof value === 'number' ? value : Number(value);

    // Validar se é número válido
    if (isNaN(num)) {
        throw new Error(`${fieldName} deve ser um número válido`);
    }

    // Validar se é inteiro se solicitado
    if (integer && !Number.isInteger(num)) {
        throw new Error(`${fieldName} deve ser um número inteiro`);
    }

    // Validar mínimo
    if (min !== undefined && num < min) {
        throw new Error(`${fieldName} deve ser no mínimo ${min}`);
    }

    // Validar máximo
    if (max !== undefined && num > max) {
        throw new Error(`${fieldName} deve ser no máximo ${max}`);
    }

    return num;
}

/**
 * Valida e normaliza boolean
 */
export function validateBoolean(value: any, fieldName: string, required: boolean = false): boolean | null {
    // Se não é obrigatório e está vazio/null/undefined, retornar null
    if (!required && (value === null || value === undefined || value === '')) {
        return null;
    }

    // Se é obrigatório e está vazio, lançar erro
    if (required && (value === null || value === undefined || value === '')) {
        throw new Error(`${fieldName} é obrigatório`);
    }

    // Converter para boolean
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
            return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
            return false;
        }
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return Boolean(value);
}

/**
 * Valida texto (string genérica) com sanitização XSS
 */
export function validateText(
    value: any,
    fieldName: string,
    options?: { required?: boolean; maxLength?: number; minLength?: number; allowHtml?: boolean }
): string | null {
    const { required = false, maxLength, minLength, allowHtml = false } = options || {};

    const text = validateString(value, fieldName, { required, maxLength, minLength, trim: true });

    if (!text) {
        return null;
    }

    // Sanitização XSS básica (remover tags perigosas)
    if (!allowHtml) {
        // Remover tags script/style e eventos on*
        let sanitized = text
            .replace(/<\/(?:script|style)>/gi, '')
            .replace(/<(?:script|style)[^>]*>/gi, '')
            .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
            .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
            .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, '')
            .replace(/javascript:\s*/gi, '');

        return sanitized;
    }

    return text;
}

