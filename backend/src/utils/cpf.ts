export const normalizeCpf = (value: string): string => value.replace(/[^\d]/g, '').slice(0, 11);

export const isValidCpf = (value: string): boolean => {
    const digits = normalizeCpf(value);
    if (digits.length !== 11) return false;
    if (/^([0-9])\1+$/.test(digits)) return false;

    const calcCheckDigit = (slice: number) => {
        const total = digits
            .split('')
            .slice(0, slice)
            .reduce((acc, digit, index) => acc + Number(digit) * (slice + 1 - index), 0);
        const remainder = (total * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const digit1 = calcCheckDigit(9);
    const digit2 = calcCheckDigit(10);

    return digit1 === Number(digits[9]) && digit2 === Number(digits[10]);
};
