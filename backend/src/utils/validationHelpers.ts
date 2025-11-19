/**
 * Utilitários de validação e normalização
 */

/**
 * Normaliza CPF removendo formatação (pontos e traços)
 */
export function normalizeCPF(cpf: string | undefined): string | null {
    if (!cpf) return null;
    return cpf.replace(/\D/g, '');
}

/**
 * Normaliza Email para lowercase e trim
 */
export function normalizeEmail(email: string | undefined): string | null {
    if (!email) return null;
    return email.trim().toLowerCase();
}
