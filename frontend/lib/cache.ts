'use client';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

/**
 * Cache simples em memória com TTL (Time To Live)
 * Usa sessionStorage como fallback para persistência entre recarregamentos
 */
class SimpleCache {
    private memoryCache: Map<string, CacheEntry<any>> = new Map();
    private useSessionStorage: boolean;

    constructor(useSessionStorage: boolean = true) {
        this.useSessionStorage = typeof window !== 'undefined' && useSessionStorage;
    }

    /**
     * Obtém um valor do cache
     */
    get<T>(key: string): T | null {
        // Tentar memória primeiro
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry) {
            if (Date.now() - memoryEntry.timestamp < memoryEntry.ttl) {
                return memoryEntry.data as T;
            } else {
                // Expirou, remover
                this.memoryCache.delete(key);
            }
        }

        // Tentar sessionStorage
        if (this.useSessionStorage) {
            try {
                const stored = sessionStorage.getItem(`cache_${key}`);
                if (stored) {
                    const entry: CacheEntry<T> = JSON.parse(stored);
                    if (Date.now() - entry.timestamp < entry.ttl) {
                        // Atualizar cache em memória
                        this.memoryCache.set(key, entry);
                        return entry.data;
                    } else {
                        // Expirou, remover
                        sessionStorage.removeItem(`cache_${key}`);
                    }
                }
            } catch (error) {
                // Ignorar erros de sessionStorage (pode estar desabilitado)
            }
        }

        return null;
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

        // Armazenar em memória
        this.memoryCache.set(key, entry);

        // Armazenar em sessionStorage
        if (this.useSessionStorage) {
            try {
                sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
            } catch (error) {
                // Ignorar erros (pode estar cheio ou desabilitado)
            }
        }
    }

    /**
     * Remove um valor do cache
     */
    delete(key: string): void {
        this.memoryCache.delete(key);
        if (this.useSessionStorage) {
            try {
                sessionStorage.removeItem(`cache_${key}`);
            } catch (error) {
                // Ignorar erros
            }
        }
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.memoryCache.clear();
        if (this.useSessionStorage) {
            try {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (error) {
                // Ignorar erros
            }
        }
    }

    /**
     * Remove entradas expiradas
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.timestamp >= entry.ttl) {
                this.memoryCache.delete(key);
            }
        }
    }
}

// Instância global do cache
const cache = new SimpleCache(true);

// Limpar cache expirado a cada 5 minutos
if (typeof window !== 'undefined') {
    setInterval(() => {
        cache.cleanup();
    }, 5 * 60 * 1000);
}

/**
 * Cache para eventos (TTL: 5 minutos)
 */
export const cacheEvents = {
    get: (key: string) => cache.get<any[]>(`events_${key}`),
    set: (key: string, data: any[], ttl: number = 5 * 60 * 1000) => cache.set(`events_${key}`, data, ttl),
    delete: (key: string) => cache.delete(`events_${key}`),
    clear: () => {
        // Limpar todos os eventos
        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_events_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (error) {
                // Ignorar
            }
        }
    },
};

/**
 * Cache para ticket types de um evento (TTL: 2 minutos)
 */
export const cacheTicketTypes = {
    get: (eventId: string) => cache.get<any[]>(`ticket_types_${eventId}`),
    set: (eventId: string, data: any[], ttl: number = 2 * 60 * 1000) => cache.set(`ticket_types_${eventId}`, data, ttl),
    delete: (eventId: string) => cache.delete(`ticket_types_${eventId}`),
    clear: () => {
        // Limpar todos os ticket types
        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_ticket_types_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (error) {
                // Ignorar
            }
        }
    },
};

/**
 * Cache para catálogo completo (TTL: 3 minutos)
 */
export const cacheCatalog = {
    get: (key: string) => cache.get<any[]>(`catalog_${key}`),
    set: (key: string, data: any[], ttl: number = 3 * 60 * 1000) => cache.set(`catalog_${key}`, data, ttl),
    delete: (key: string) => cache.delete(`catalog_${key}`),
    clear: () => {
        // Limpar todo o catálogo
        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_catalog_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (error) {
                // Ignorar
            }
        }
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

export default cache;

