const stripControlChars = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, '');

export const sanitizeInput = (value: string): string => {
    const withoutControl = stripControlChars(value);
    const trimmed = withoutControl.trim();
    const withoutAngleBrackets = trimmed.replace(/[<>]/g, '');
    return withoutAngleBrackets;
};

export const normalizePhone = (value: string): string =>
    value.replace(/[^\d]/g, '').slice(0, 11);

/**
 * Normaliza CPF removendo formatação e mantendo apenas dígitos
 */
export const normalizeCpf = (value: string): string =>
    value.replace(/[^\d]/g, '').slice(0, 11);

/**
 * Valida CPF brasileiro com algoritmo oficial de dígitos verificadores
 * Baseado na documentação da Receita Federal
 * 
 * @param value - CPF com ou sem formatação
 * @returns true se o CPF é válido
 */
export const isValidCpf = (value: string): boolean => {
    const digits = normalizeCpf(value);
    
    // Deve ter exatamente 11 dígitos
    if (digits.length !== 11) return false;
    
    // Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11, 000.000.000-00)
    const allSame = digits.split('').every((digit) => digit === digits[0]);
    if (allSame) return false;
    
    // Converter string para array de números
    const nums = digits.split('').map(Number);
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += nums[i] * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    const digit1 = remainder === 10 || remainder === 11 ? 0 : remainder;
    
    // Verificar primeiro dígito
    if (digit1 !== nums[9]) return false;
    
    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += nums[i] * (11 - i);
    }
    remainder = (sum * 10) % 11;
    const digit2 = remainder === 10 || remainder === 11 ? 0 : remainder;
    
    // Verificar segundo dígito
    return digit2 === nums[10];
};

export const formatPhoneDisplay = (value: string): string => {
    const digits = normalizePhone(value);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const formatCpfDisplay = (value: string): string => {
    const digits = normalizeCpf(value);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

