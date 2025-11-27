/**
 * Utilitários para manipulação de pedidos e validação de expiração
 */

/**
 * Converte expiresAt para Date (aceita string ou Date)
 * CRÍTICO: Sempre trata como UTC para evitar problemas de timezone do dispositivo
 */
export function parseExpiresAt(expiresAt: string | Date | null | undefined): Date | null {
    if (!expiresAt) return null;
    
    if (typeof expiresAt === 'string') {
        // Se for string ISO sem timezone, adicionar 'Z' para forçar UTC
        // Exemplo: "2025-11-27T21:30:00" -> "2025-11-27T21:30:00Z"
        let isoString = expiresAt.trim();
        if (isoString && !isoString.endsWith('Z') && !isoString.includes('+') && !isoString.includes('-', 10)) {
            // Não tem timezone, assumir UTC
            isoString = isoString.endsWith('Z') ? isoString : isoString + 'Z';
        }
        return new Date(isoString);
    }
    
    return expiresAt;
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
 * CRÍTICO: Usa sempre UTC timestamps para evitar problemas de timezone do dispositivo
 */
export function getRemainingTime(expiresAt: string | Date | null | undefined, now: number = Date.now()): number {
    const expiresAtDate = parseExpiresAt(expiresAt);
    if (!expiresAtDate) {
        console.warn('[getRemainingTime] ⚠️ expiresAt é null/undefined');
        return 0;
    }
    
    // getTime() sempre retorna UTC timestamp (milissegundos desde epoch)
    // Date.now() também sempre retorna UTC timestamp
    // Então a diferença sempre será correta, independente do timezone do dispositivo
    const expiresAtTimestamp = expiresAtDate.getTime();
    const remaining = expiresAtTimestamp - now;
    
    // Log para debug em caso de valores negativos ou muito grandes
    if (remaining < 0) {
        console.warn('[getRemainingTime] ⚠️ Tempo restante negativo (já expirou):', {
            expiresAt: expiresAtDate.toISOString(),
            expiresAtTimestamp,
            now,
            nowISO: new Date(now).toISOString(),
            remaining,
            deviceTimeOffset: new Date().getTimezoneOffset(), // offset em minutos
        });
    } else if (remaining > 31 * 60 * 1000) {
        // Mais de 31 minutos (suspeito se deveria ser 30)
        console.warn('[getRemainingTime] ⚠️ Tempo restante muito grande (suspeito):', {
            expiresAt: expiresAtDate.toISOString(),
            expiresAtTimestamp,
            now,
            nowISO: new Date(now).toISOString(),
            remaining,
            remainingMinutes: Math.floor(remaining / 60000),
            deviceTimeOffset: new Date().getTimezoneOffset(),
        });
    }
    
    return Math.max(0, remaining);
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

