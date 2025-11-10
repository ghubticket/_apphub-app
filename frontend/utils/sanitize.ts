const stripControlChars = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, '');

export const sanitizeInput = (value: string): string => {
    const withoutControl = stripControlChars(value);
    const trimmed = withoutControl.trim();
    const withoutAngleBrackets = trimmed.replace(/[<>]/g, '');
    return withoutAngleBrackets;
};

export const normalizePhone = (value: string): string =>
    value.replace(/[^\d]/g, '').slice(0, 11);

export const normalizeCpf = (value: string): string =>
    value.replace(/[^\d]/g, '').slice(0, 11);

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

