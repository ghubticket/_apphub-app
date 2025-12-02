'use client';

import api from './api';
import type { TicketProduct } from '@/types/ticket';
import { cacheEvents, cacheTicketTypes, cacheCatalog, generateCacheKey } from './cache';

/**
 * Normaliza URLs de imagem para retornar caminho relativo (será convertido para proxy depois)
 * @param imageUrl - URL da imagem (pode ser completa, relativa ou apenas filename)
 * @returns Caminho relativo normalizado ou undefined se não houver URL
 * 
 * NOTA: URLs completas da API serão convertidas para caminhos relativos
 * que serão processados pelo getProxiedImageUrl para usar o proxy
 */
const normalizeImageUrl = (imageUrl?: string | null): string | undefined => {
    if (!imageUrl || typeof imageUrl !== 'string') return undefined;
    
    const trimmed = imageUrl.trim();
    if (!trimmed) return undefined;
    
    // Se for uma URL completa, extrair o caminho para usar no proxy
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            let path = url.pathname;
            
            // Se for do dashboard ou da API, extrair o caminho
            // O proxy do frontend vai buscar do dashboard
            if (url.hostname.includes('dash.ghubtech.com.br') || 
                url.hostname.includes('api.ghubtech.com.br') ||
                url.hostname.includes('localhost') && (url.port === '3443' || url.port === '3001')) {
                
                // Se a URL já tiver /api/images/, extrair apenas o path após isso
                if (path.startsWith('/api/images/')) {
                    return path.substring(12); // Remover '/api/images/'
                }
                
                // Se for /uploads/..., retornar o caminho completo
                if (path.startsWith('/uploads/')) {
                    return path.substring(1); // Remover / inicial
                }
                
                // Remover /api se estiver presente
                if (path.startsWith('/api/')) {
                    path = path.substring(5);
                } else if (path.startsWith('/')) {
                    path = path.substring(1);
                }
                return path;
            }
            // Se for outra URL externa, retornar como está (será tratada pelo getProxiedImageUrl)
            return trimmed;
        } catch {
            // Se falhar ao parsear, tratar como caminho relativo
        }
    }
    
    // Se começar com /, é um caminho relativo - remover / inicial
    if (trimmed.startsWith('/')) {
        return trimmed.substring(1);
    }
    
    // Caso contrário, assumir que é apenas o filename e construir o caminho
    // Remover qualquer /uploads/events/ que possa estar no início do filename
    const cleanFilename = trimmed.replace(/^\/?uploads\/events\//, '');
    return `uploads/events/${cleanFilename}`;
};

type FetchTicketCatalogOptions = {
    limitEvents?: number;
    limitTicketsPerEvent?: number;
    onlyWithAvailability?: boolean;
    search?: string;
};

type RawEvent = {
    _id: string;
    id?: string;
    name?: string;
    description?: string;
    date?: string;
    location?: string;
    city?: string;
    state?: string;
    coverImage?: string;
    squareImage?: string;
    status?: string;
    isActive?: boolean;
    ticketFee?: number;
    platformFeePercentage?: number;
};

export type EventSummary = {
    id: string;
    name?: string;
    description?: string;
    date?: string;
    formattedDate?: string;
    location?: string;
    city?: string;
    state?: string;
    coverImage?: string;
    squareImage?: string;
    status?: string;
    isActive?: boolean;
};

type RawTicketType = {
    _id: string;
    id?: string;
    name?: string;
    description?: string;
    price?: number;
    lotNumber?: number;
    maxQuantity?: number;
    soldQuantity?: number;
    maxPerPurchase?: number;
    isVIP?: boolean;
    isActive?: boolean;
    isOnSale?: boolean;
    availableQuantity?: number;
    salesStart?: string;
    salesEnd?: string;
};

const formatEventDate = (date?: string) => {
    if (!date) return undefined;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const formatLocation = (event: RawEvent) => {
    const parts = [event.location, event.city, event.state].filter(Boolean);
    if (!parts.length) return undefined;
    if (parts.length === 3) {
        const [venue, city, state] = parts;
        return `${venue} • ${city}${state ? `/${state}` : ''}`;
    }
    if (parts.length === 2) {
        const [city, state] = parts.slice(-2);
        return `${city}${state ? `/${state}` : ''}`;
    }
    return parts.join(' • ');
};

const normalizeTicketType = (
    ticket: RawTicketType,
    event: RawEvent,
    options: FetchTicketCatalogOptions,
): TicketProduct | null => {
    if (!ticket || !event) return null;
    const effectivePrice = Number(ticket.price ?? 0);
    const maxQuantity = Number.isFinite(ticket.maxQuantity) ? Number(ticket.maxQuantity) : undefined;
    const soldQuantity = Number.isFinite(ticket.soldQuantity) ? Number(ticket.soldQuantity) : 0;
    const availableQuantity =
        typeof ticket.availableQuantity === 'number'
            ? ticket.availableQuantity
            : maxQuantity !== undefined
              ? Math.max(0, maxQuantity - soldQuantity)
              : undefined;
    const isSoldOut = availableQuantity !== undefined && availableQuantity <= 0;

    if (options.onlyWithAvailability && isSoldOut) {
        return null;
    }

    if (ticket.isActive === false) {
        return null;
    }

    const nameSegments = [ticket.name ?? 'Ingresso'];
    if (ticket.lotNumber) {
        nameSegments.push(`Lote ${ticket.lotNumber}`);
    }

    const eventDateIso = event.date ?? undefined;
    const sortTimestamp = event.date ? new Date(event.date).getTime() : undefined;

    return {
        id: ticket._id ?? ticket.id ?? `${event._id}-${ticket.name ?? 'ticket'}`,
        ticketTypeId: ticket._id ?? ticket.id,
        eventId: event._id ?? event.id,
        eventName: event.name,
        eventDate: formatEventDate(event.date),
        eventDateIso,
        location: formatLocation(event),
        name: nameSegments.join(' • '),
        description: ticket.description || event.description,
        category: ticket.isVIP ? 'VIP' : ticket.name || 'Ingresso',
        lotNumber: ticket.lotNumber,
        price: effectivePrice,
        currency: 'BRL',
        image: normalizeImageUrl(event.coverImage || event.squareImage),
        stock: availableQuantity,
        maxPerOrder: ticket.maxPerPurchase ?? undefined,
        isVip: ticket.isVIP ?? false,
        isOnSale: ticket.isOnSale ?? true,
        sortTimestamp: Number.isFinite(sortTimestamp) ? sortTimestamp : undefined,
        ticketFee:
            event.ticketFee !== undefined && event.ticketFee !== null ? Number(event.ticketFee) : undefined,
        platformFeePercentage:
            event.platformFeePercentage !== undefined && event.platformFeePercentage !== null
                ? Number(event.platformFeePercentage)
                : undefined,
    };
};

// Cache de promises em andamento para evitar chamadas duplicadas simultâneas
const pendingRequests = new Map<string, Promise<TicketProduct[]>>();

type FetchEventsListOptions = {
    limitEvents?: number;
    search?: string;
};

export const fetchEventsList = async (
    options: FetchEventsListOptions = {},
): Promise<EventSummary[]> => {
    const { limitEvents = 12, search } = options;

    const eventsCacheKey = `page_1_limit_${limitEvents}_search_${search || ''}`;
    const cachedEvents = cacheEvents.get(eventsCacheKey);

    let eventsRaw: RawEvent[];

    if (cachedEvents && Array.isArray(cachedEvents)) {
        eventsRaw = cachedEvents;
    } else {
        const eventsResponse = await api.get('/events', {
            params: {
                page: 1,
                limit: limitEvents,
                search,
            },
        });

        eventsRaw = Array.isArray(eventsResponse.data?.data?.events)
            ? eventsResponse.data.data.events
            : Array.isArray(eventsResponse.data?.events)
              ? eventsResponse.data.events
              : Array.isArray(eventsResponse.data)
                ? eventsResponse.data
                : [];

        if (eventsRaw.length > 0) {
            cacheEvents.set(eventsCacheKey, eventsRaw, 1 * 60 * 1000);
        }
    }

    const filteredEvents = eventsRaw.filter(
        (event) => event && event.isActive !== false && (event.status ?? 'published') !== 'cancelled',
    );

    return filteredEvents.map((event) => ({
        id: event._id ?? event.id ?? '',
        name: event.name,
        description: event.description,
        date: event.date,
        formattedDate: formatEventDate(event.date),
        location: formatLocation(event),
        city: event.city,
        state: event.state,
        coverImage: normalizeImageUrl(event.coverImage),
        squareImage: normalizeImageUrl(event.squareImage),
        status: event.status,
        isActive: event.isActive,
    }));
};

export const fetchTicketCatalog = async (options: FetchTicketCatalogOptions = {}): Promise<TicketProduct[]> => {
    const { limitEvents = 12, limitTicketsPerEvent, search, onlyWithAvailability = false } = options;

    // Gerar chave de cache
    const cacheKey = generateCacheKey(options);

    // Tentar obter do cache primeiro
    const cachedCatalog = cacheCatalog.get(cacheKey);
    if (cachedCatalog) {
        // Stale-while-revalidate: retornar cache imediatamente e atualizar em background
        // Isso melhora a performance sem bloquear a UI
        // Atualizar mais agressivamente (após 30 segundos) para dados mais frescos
        const scheduleUpdate = typeof window !== 'undefined' && 'requestIdleCallback' in window
            ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 1000 })
            : (cb: () => void) => setTimeout(cb, 50);
        
        scheduleUpdate(async () => {
            try {
                // Buscar dados frescos em background (sem bloquear)
                // Re-executar a busca completa, mas sem usar o cache do catálogo
                const freshCatalog = await fetchTicketCatalogFresh(options);
                // Atualizar cache com dados frescos (TTL: 1 minuto)
                cacheCatalog.set(cacheKey, freshCatalog, 1 * 60 * 1000);
            } catch (error) {
                // Erro silencioso ao atualizar cache em background
            }
        });
        
        return cachedCatalog;
    }

    // Verificar se já existe uma requisição em andamento com os mesmos parâmetros
    // Isso evita chamadas duplicadas simultâneas (React Strict Mode, re-renders, etc)
    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {
        return pendingRequest;
    }

    // Criar promise para a requisição
    const requestPromise = (async () => {
        try {
            // Buscar eventos (com cache)
            const eventsCacheKey = `page_1_limit_${limitEvents}_search_${search || ''}`;
            const cachedEvents = cacheEvents.get(eventsCacheKey);
            let eventsRaw: RawEvent[];
            
            if (cachedEvents && Array.isArray(cachedEvents)) {
                eventsRaw = cachedEvents;
            } else {
                const eventsResponse = await api.get('/events', {
                    params: {
                        page: 1,
                        limit: limitEvents,
                        search,
                    },
                });

                eventsRaw = Array.isArray(eventsResponse.data?.data?.events)
                    ? eventsResponse.data.data.events
                    : Array.isArray(eventsResponse.data?.events)
                      ? eventsResponse.data.events
                      : Array.isArray(eventsResponse.data)
                        ? eventsResponse.data
                        : [];

                // Armazenar eventos no cache (1 minuto - reduzido para atualizações mais rápidas)
                if (eventsRaw.length > 0) {
                    cacheEvents.set(eventsCacheKey, eventsRaw, 1 * 60 * 1000);
                }
            }

            const filteredEvents = eventsRaw.filter(
                (event) => event && event.isActive !== false && (event.status ?? 'published') !== 'cancelled',
            );

            const ticketsNested = await Promise.all(
                filteredEvents.map(async (event) => {
                    try {
                        const eventId = event._id ?? event.id;
                        
                        // Tentar obter do cache primeiro
                        const cachedTicketTypes = cacheTicketTypes.get(eventId);
                        let ticketTypes: RawTicketType[];
                        
                        if (cachedTicketTypes && Array.isArray(cachedTicketTypes)) {
                            ticketTypes = cachedTicketTypes;
                        } else {
                            const ticketTypesResponse = await api.get(`/events/${eventId}/ticket-types`, {
                                params: {
                                    includeInactive: false,
                                },
                            });
                            ticketTypes = Array.isArray(ticketTypesResponse.data?.data)
                                ? ticketTypesResponse.data.data
                                : Array.isArray(ticketTypesResponse.data)
                                  ? ticketTypesResponse.data
                                  : [];
                            
                            // Armazenar no cache (30 segundos - reduzido para preços atualizados rapidamente)
                            if (ticketTypes.length > 0) {
                                cacheTicketTypes.set(eventId, ticketTypes, 30 * 1000);
                            }
                        }

                        const normalizedTickets = ticketTypes
                            .map((ticket) => {
                                return normalizeTicketType(ticket, event, { onlyWithAvailability });
                            })
                            .filter((ticket): ticket is TicketProduct => Boolean(ticket));

                        if (limitTicketsPerEvent !== undefined && limitTicketsPerEvent > 0) {
                            return normalizedTickets.slice(0, limitTicketsPerEvent);
                        }
                        return normalizedTickets;
                    } catch (error) {
                        return [];
                    }
                }),
            );

            const flattened = ticketsNested.flat();

            const sorted = flattened.sort((a, b) => {
                const dateA = a.sortTimestamp ?? Number.POSITIVE_INFINITY;
                const dateB = b.sortTimestamp ?? Number.POSITIVE_INFINITY;
                if (dateA === dateB) return 0;
                return dateA - dateB;
            });

            // Armazenar catálogo completo no cache (1 minuto - reduzido para atualizações mais rápidas)
            cacheCatalog.set(cacheKey, sorted, 1 * 60 * 1000);

            return sorted;
        } finally {
            // Remover da lista de requisições pendentes após conclusão
            pendingRequests.delete(cacheKey);
        }
    })();

    // Armazenar promise em andamento
    pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
};

/**
 * Busca catálogo fresco sem usar cache do catálogo (mas ainda usa cache de eventos/tickets)
 * Usado para stale-while-revalidate
 */
async function fetchTicketCatalogFresh(options: FetchTicketCatalogOptions = {}): Promise<TicketProduct[]> {
    const { limitEvents = 12, limitTicketsPerEvent, search, onlyWithAvailability = false } = options;
    
    // Buscar eventos (pode usar cache de eventos, mas força refresh se necessário)
    const eventsCacheKey = `page_1_limit_${limitEvents}_search_${search || ''}`;
    const cachedEvents = cacheEvents.get(eventsCacheKey);
    let eventsRaw: RawEvent[];
    
    if (cachedEvents && Array.isArray(cachedEvents)) {
        eventsRaw = cachedEvents;
    } else {
        const eventsResponse = await api.get('/events', {
            params: {
                page: 1,
                limit: limitEvents,
                search,
            },
        });

        eventsRaw = Array.isArray(eventsResponse.data?.data?.events)
            ? eventsResponse.data.data.events
            : Array.isArray(eventsResponse.data?.events)
              ? eventsResponse.data.events
              : Array.isArray(eventsResponse.data)
                ? eventsResponse.data
                : [];

        if (eventsRaw.length > 0) {
            cacheEvents.set(eventsCacheKey, eventsRaw, 1 * 60 * 1000);
        }
    }

    const filteredEvents = eventsRaw.filter(
        (event) => event && event.isActive !== false && (event.status ?? 'published') !== 'cancelled',
    );

    const ticketsNested = await Promise.all(
        filteredEvents.map(async (event) => {
            try {
                const eventId = event._id ?? event.id;
                
                // Buscar tickets (pode usar cache, mas força refresh se necessário)
                const cachedTicketTypes = cacheTicketTypes.get(eventId);
                let ticketTypes: RawTicketType[];
                
                if (cachedTicketTypes && Array.isArray(cachedTicketTypes)) {
                    ticketTypes = cachedTicketTypes;
                } else {
                    const ticketTypesResponse = await api.get(`/events/${eventId}/ticket-types`, {
                        params: {
                            includeInactive: false,
                        },
                    });
                    ticketTypes = Array.isArray(ticketTypesResponse.data?.data)
                        ? ticketTypesResponse.data.data
                        : Array.isArray(ticketTypesResponse.data)
                          ? ticketTypesResponse.data
                          : [];
                    
                    if (ticketTypes.length > 0) {
                        cacheTicketTypes.set(eventId, ticketTypes, 30 * 1000);
                    }
                }

                const normalizedTickets = ticketTypes
                    .map((ticket) => normalizeTicketType(ticket, event, { onlyWithAvailability }))
                    .filter((ticket): ticket is TicketProduct => Boolean(ticket));

                if (limitTicketsPerEvent !== undefined && limitTicketsPerEvent > 0) {
                    return normalizedTickets.slice(0, limitTicketsPerEvent);
                }
                return normalizedTickets;
            } catch (error) {
                return [];
            }
        }),
    );

    const flattened = ticketsNested.flat();

    const sorted = flattened.sort((a, b) => {
        const dateA = a.sortTimestamp ?? Number.POSITIVE_INFINITY;
        const dateB = b.sortTimestamp ?? Number.POSITIVE_INFINITY;
        if (dateA === dateB) return 0;
        return dateA - dateB;
    });

    return sorted;
}

export type { FetchTicketCatalogOptions };


