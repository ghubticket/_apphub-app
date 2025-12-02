/**
 * Utilitários para invalidar cache quando houver atualizações
 * Use essas funções quando atualizar dados no dashboard
 */

import { invalidateEventCache, cacheEvents, cacheTicketTypes, cacheCatalog } from './cache';

/**
 * Invalidar todo o cache relacionado a um evento
 * Use isso após atualizar um evento no dashboard
 * 
 * @param eventId - ID do evento que foi atualizado
 * 
 * @example
 * // No dashboard, após atualizar um evento:
 * await eventService.update(eventId, formData);
 * invalidateEventCacheInFrontend(eventId); // Invalidar cache do frontend
 */
export function invalidateEventCacheInFrontend(eventId: string): void {
    if (typeof window === 'undefined') {
        console.warn('[Cache] Tentativa de invalidar cache no servidor (não suportado)');
        return;
    }
    
    invalidateEventCache(eventId);
}

/**
 * Invalidar todo o cache de eventos
 * Use isso quando quiser forçar refresh completo
 */
export function invalidateAllEventsCache(): void {
    if (typeof window === 'undefined') return;
    
    console.log('[Cache] 🗑️ Invalidando todo o cache de eventos');
    cacheEvents.clear();
    cacheTicketTypes.clear();
    cacheCatalog.clear();
    console.log('[Cache] ✅ Todo o cache foi invalidado');
}

/**
 * Hook para usar no dashboard após atualizar eventos
 * Retorna função para invalidar cache
 */
export function useCacheInvalidation() {
    return {
        invalidateEvent: (eventId: string) => {
            if (typeof window !== 'undefined') {
                invalidateEventCache(eventId);
            }
        },
        invalidateAll: () => {
            if (typeof window !== 'undefined') {
                invalidateAllEventsCache();
            }
        },
    };
}

