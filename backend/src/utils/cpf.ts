/**
 * Normaliza CPF removendo formatação e mantendo apenas dígitos
 */
export const normalizeCpf = (value: string): string => value.replace(/[^\d]/g, '').slice(0, 11);

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
