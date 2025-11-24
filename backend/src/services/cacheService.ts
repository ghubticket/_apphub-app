/**
 * Serviço de cache simples em memória para o backend
 * Usa Map para armazenar dados com TTL (Time To Live)
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

class SimpleCacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Limpar entradas expiradas a cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * Obtém um valor do cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        // Verificar se expirou
        if (Date.now() - entry.timestamp >= entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Armazena um valor no cache
     */
    set<T>(key: string, data: T, ttl: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
        };
        this.cache.set(key, entry);
    }

    /**
     * Remove um valor do cache
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Remove entradas expiradas
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Limpa recursos (para shutdown graceful)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
    }
}

// Instância global do cache
const cacheService = new SimpleCacheService();

/**
 * Cache para eventos (TTL: 5 minutos)
 */
export const cacheEvents = {
    get: (key: string) => cacheService.get<any[]>(`events_${key}`),
    set: (key: string, data: any[], ttl: number = 5 * 60 * 1000) =>
        cacheService.set(`events_${key}`, data, ttl),
    delete: (key: string) => cacheService.delete(`events_${key}`),
    clear: () => {
        // Limpar todos os eventos
        const keys = Array.from(cacheService['cache'].keys());
        keys.forEach(key => {
            if (String(key).startsWith('events_')) {
                cacheService.delete(String(key));
            }
        });
    },
};

/**
 * Cache para ticket types de um evento (TTL: 2 minutos)
 */
export const cacheTicketTypes = {
    get: (eventId: string) => cacheService.get<any[]>(`ticket_types_${eventId}`),
    set: (eventId: string, data: any[], ttl: number = 2 * 60 * 1000) =>
        cacheService.set(`ticket_types_${eventId}`, data, ttl),
    delete: (eventId: string) => cacheService.delete(`ticket_types_${eventId}`),
    clear: () => {
        // Limpar todos os ticket types
        const keys = Array.from(cacheService['cache'].keys());
        keys.forEach(key => {
            if (String(key).startsWith('ticket_types_')) {
                cacheService.delete(String(key));
            }
        });
    },
};

/**
 * Cache para catálogo completo (TTL: 3 minutos)
 */
export const cacheCatalog = {
    get: (key: string) => cacheService.get<any[]>(`catalog_${key}`),
    set: (key: string, data: any[], ttl: number = 3 * 60 * 1000) =>
        cacheService.set(`catalog_${key}`, data, ttl),
    delete: (key: string) => cacheService.delete(`catalog_${key}`),
    clear: () => {
        // Limpar todo o catálogo
        const keys = Array.from(cacheService['cache'].keys());
        keys.forEach(key => {
            if (String(key).startsWith('catalog_')) {
                cacheService.delete(String(key));
            }
        });
    },
};

/**
 * Cache para contagens de tickets comprados (TTL: 1 minuto)
 * Usado para otimizar validação de limites por CPF/Email
 */
export const cacheTicketCounts = {
    get: (key: string) => cacheService.get<number>(`ticket_count_${key}`),
    set: (key: string, count: number, ttl: number = 60 * 1000) =>
        cacheService.set(`ticket_count_${key}`, count, ttl),
    delete: (key: string) => cacheService.delete(`ticket_count_${key}`),
    // Invalidar cache quando um pedido é criado/pago para este evento/ticketType
    invalidateForEvent: (eventId: string, ticketTypeId: string) => {
        const keys = Array.from(cacheService['cache'].keys());
        keys.forEach(key => {
            const keyStr = String(key);
            if (keyStr.startsWith('ticket_count_') && 
                (keyStr.includes(eventId) || keyStr.includes(ticketTypeId))) {
                cacheService.delete(keyStr);
            }
        });
    },
};

/**
 * Função auxiliar para gerar chave de cache baseada em opções
 */
export const generateCacheKey = (options: {
    limitEvents?: number;
    limitTicketsPerEvent?: number;
    search?: string;
    onlyWithAvailability?: boolean;
}): string => {
    return JSON.stringify({
        limitEvents: options.limitEvents ?? 12,
        limitTicketsPerEvent: options.limitTicketsPerEvent,
        search: options.search || '',
        onlyWithAvailability: options.onlyWithAvailability || false,
    });
};

/**
 * Gerar chave de cache para contagem de tickets
 */
export const generateTicketCountCacheKey = (
    eventId: string,
    ticketTypeId: string,
    cpf?: string,
    email?: string
): string => {
    return `event_${eventId}_ticket_${ticketTypeId}_${cpf ? `cpf_${cpf.substring(0, 3)}` : ''}_${email ? `email_${email.substring(0, 3)}` : ''}`;
};

export default cacheService;

