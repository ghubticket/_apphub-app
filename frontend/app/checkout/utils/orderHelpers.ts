/**
 * Utilitários para manipulação de pedidos e validação de expiração
 */

/**
 * Converte expiresAt para Date (aceita string ou Date)
 */
export function parseExpiresAt(expiresAt: string | Date | null | undefined): Date | null {
    if (!expiresAt) return null;
    return typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
}

/**
 * Verifica se um pedido expirou baseado no expiresAt
 */
export function isOrderExpired(expiresAt: string | Date | null | undefined, now: number = Date.now()): boolean {
    const expiresAtDate = parseExpiresAt(expiresAt);
    if (!expiresAtDate) return false;
    return expiresAtDate.getTime() <= now;
}

/**
 * Calcula o tempo restante em milissegundos até a expiração
 * Retorna 0 se já expirou
 */
export function getRemainingTime(expiresAt: string | Date | null | undefined, now: number = Date.now()): number {
    const expiresAtDate = parseExpiresAt(expiresAt);
    if (!expiresAtDate) return 0;
    return Math.max(0, expiresAtDate.getTime() - now);
}

/**
 * Calcula o tempo restante em segundos até a expiração
 * Retorna null se não há expiresAt ou já expirou
 */
export function getRemainingSeconds(expiresAt: string | Date | null | undefined, now: number = Date.now()): number | null {
    const remaining = getRemainingTime(expiresAt, now);
    if (remaining === 0) return null;
    return Math.floor(remaining / 1000);
}

/**
 * Calcula o tempo restante em minutos até a expiração
 */
export function getRemainingMinutes(expiresAt: string | Date | null | undefined, now: number = Date.now()): number {
    const remaining = getRemainingTime(expiresAt, now);
    return Math.floor(remaining / 60000);
}

