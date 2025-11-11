'use client';

export function registerNumericMask(id: string, maxLength: number, allowSpaces = false) {
    if (typeof document === 'undefined') return () => {};
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return () => {};

    const handler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const digitsOnly = target.value.replace(/[^\d]/g, '');

        if (allowSpaces) {
            const sliced = digitsOnly.slice(0, maxLength);
            let formatted = '';
            if (/^3[47]/.test(sliced)) {
                const part1 = sliced.slice(0, 4);
                const part2 = sliced.slice(4, 10);
                const part3 = sliced.slice(10, 15);
                formatted = [part1, part2, part3].filter(Boolean).join(' ');
            } else {
                formatted = sliced.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            }
            target.value = formatted.trim();
        } else {
            target.value = digitsOnly.slice(0, maxLength);
        }
    };

    input.inputMode = 'numeric';
    input.addEventListener('input', handler);

    return () => {
        input.removeEventListener('input', handler);
    };
}

