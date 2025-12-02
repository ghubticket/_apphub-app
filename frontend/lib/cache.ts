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
 * Cache para eventos (TTL: 1 minuto - reduzido para atualizações mais rápidas)
 * Stale-while-revalidate atualiza em background após 30 segundos
 */
export const cacheEvents = {
    get: (key: string) => cache.get<any[]>(`events_${key}`),
    set: (key: string, data: any[], ttl: number = 1 * 60 * 1000) => cache.set(`events_${key}`, data, ttl),
    delete: (key: string) => cache.delete(`events_${key}`),
    invalidateEvent: (eventId: string) => {
        // Invalidar cache de um evento específico
        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_events_')) {
                        const cached = sessionStorage.getItem(key);
                        if (cached) {
                            try {
                                const entry = JSON.parse(cached);
                                const events = entry.data;
                                if (Array.isArray(events) && events.some((e: any) => (e._id || e.id) === eventId)) {
                                    sessionStorage.removeItem(key);
                                    cache.delete(key.replace('cache_', ''));
                                }
                            } catch {
                                // Ignorar erros de parse
                            }
                        }
                    }
                });
            } catch (error) {
                // Ignorar
            }
        }
    },
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
 * Cache para ticket types de um evento (TTL: 30 segundos - reduzido para preços atualizados rapidamente)
 * Dados críticos como preços precisam aparecer rápido após atualização
 */
export const cacheTicketTypes = {
    get: (eventId: string) => cache.get<any[]>(`ticket_types_${eventId}`),
    set: (eventId: string, data: any[], ttl: number = 30 * 1000) => cache.set(`ticket_types_${eventId}`, data, ttl),
    delete: (eventId: string) => cache.delete(`ticket_types_${eventId}`),
    invalidateEvent: (eventId: string) => {
        // Invalidar cache de tickets de um evento específico
        cache.delete(`ticket_types_${eventId}`);
    },
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
 * Cache para catálogo completo (TTL: 1 minuto - reduzido)
 * Stale-while-revalidate atualiza em background após 30 segundos
 */
export const cacheCatalog = {
    get: (key: string) => cache.get<any[]>(`catalog_${key}`),
    set: (key: string, data: any[], ttl: number = 1 * 60 * 1000) => cache.set(`catalog_${key}`, data, ttl),
    delete: (key: string) => cache.delete(`catalog_${key}`),
    invalidateEvent: (eventId: string) => {
        // Invalidar cache de catálogo que contém um evento específico
        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('cache_catalog_')) {
                        const cached = sessionStorage.getItem(key);
                        if (cached) {
                            try {
                                const entry = JSON.parse(cached);
                                const tickets = entry.data;
                                if (Array.isArray(tickets) && tickets.some((t: any) => t.eventId === eventId)) {
                                    sessionStorage.removeItem(key);
                                    cache.delete(key.replace('cache_', ''));
                                }
                            } catch {
                                // Ignorar erros de parse
                            }
                        }
                    }
                });
            } catch (error) {
                // Ignorar
            }
        }
    },
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

/**
 * Cache inteligente com stale-while-revalidate
 * Retorna dados do cache imediatamente (mesmo se expirados) e atualiza em background
 */
export async function getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    staleWhileRevalidate: boolean = true
): Promise<T> {
    // Tentar obter do cache
    const cached = cache.get<T>(key);
    
    if (cached) {
        const entry = cache.get<CacheEntry<T>>(`_entry_${key}`);
        if (entry) {
            const age = Date.now() - entry.timestamp;
            const isStale = age >= entry.ttl;
            
            // Se não está expirado, retornar imediatamente
            if (!isStale) {
                return cached;
            }
            
            // Se está expirado mas stale-while-revalidate está ativo, retornar cache e atualizar em background
            if (staleWhileRevalidate) {
                // Atualizar em background (não esperar)
                fetchFn().then((freshData) => {
                    cache.set(key, freshData, ttl);
                }).catch((error) => {
                    console.warn(`[Cache] Erro ao atualizar cache em background para ${key}:`, error);
                });
                
                // Retornar dados stale imediatamente
                return cached;
            }
        }
    }
    
    // Se não há cache ou stale-while-revalidate está desabilitado, buscar dados frescos
    const freshData = await fetchFn();
    cache.set(key, freshData, ttl);
    
    return freshData;
}

/**
 * Invalidar cache por padrão (útil para limpar após atualizações)
 */
export function invalidateCachePattern(pattern: string): void {
    if (typeof window === 'undefined') return;
    
    try {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.includes(pattern)) {
                sessionStorage.removeItem(key);
                // Também limpar da memória
                cache.delete(key.replace('cache_', ''));
            }
        });
    } catch (error) {
        // Ignorar erros
    }
}

/**
 * Invalidar cache de um evento específico após atualização
 * Use isso quando atualizar um evento no dashboard
 */
export function invalidateEventCache(eventId: string): void {
    if (typeof window === 'undefined') return;
    
    console.log(`[Cache] 🗑️ Invalidando cache do evento: ${eventId}`);
    
    // Invalidar eventos
    cacheEvents.invalidateEvent(eventId);
    
    // Invalidar tickets do evento
    cacheTicketTypes.invalidateEvent(eventId);
    
    // Invalidar catálogo que contém o evento
    cacheCatalog.invalidateEvent(eventId);
    
    console.log(`[Cache] ✅ Cache invalidado para evento: ${eventId}`);
}

export default cache;

