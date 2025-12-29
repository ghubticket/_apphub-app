'use client';

import api from './api';
import type { TicketProduct } from '@/types/ticket';
import { cacheEvents, cacheTicketTypes, cacheCatalog, generateCacheKey } from './cache';

/**
 * Normaliza URLs de imagem para retornar URL completa (R2, API, etc)
 * @param imageUrl - URL da imagem (pode ser completa, relativa ou apenas filename)
 * @returns URL completa normalizada ou undefined se não houver URL
 * 
 * NOTA: URLs do R2 são retornadas diretamente. URLs antigas da API são mantidas para compatibilidade.
 */
const IS_DEV = process.env.NODE_ENV !== 'production';

const normalizeImageUrl = (imageUrl?: string | null): string | undefined => {
    if (!imageUrl || typeof imageUrl !== 'string') return undefined;
    
    const trimmed = imageUrl.trim();
    if (!trimmed) return undefined;
    
    // Se for uma URL completa (R2, API, etc), retornar como está
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    
    // Se começar com /, retornar como está (caminho relativo)
    if (trimmed.startsWith('/')) {
        return trimmed;
    }
    
    // Caso contrário, assumir que é apenas o filename e construir o caminho
    // Isso é para compatibilidade com dados antigos
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
    maxPerCPF?: number;
    isVIP?: boolean;
    isActive?: boolean;
    isOnSale?: boolean;
    availableQuantity?: number;
    salesStart?: string;
    salesEnd?: string;
    allowInstallments?: boolean;
    minInstallments?: number | null;
    maxInstallments?: number | null;
    isTransport?: boolean;
    departureLocationId?: string;
    transportOptions?: Array<{
        date: string;
        attraction: string;
        departureLocations: string[];
    }>;
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

    const eventDateIso = event.date ?? undefined;
    const sortTimestamp = event.date ? new Date(event.date).getTime() : undefined;

    const normalized: TicketProduct = {
        id: ticket._id ?? ticket.id ?? `${event._id}-${ticket.name ?? 'ticket'}`,
        ticketTypeId: ticket._id ?? ticket.id,
        eventId: event._id ?? event.id,
        eventName: event.name,
        eventDate: formatEventDate(event.date),
        eventDateIso,
        location: formatLocation(event),
        name: ticket.name ?? 'Ingresso',
        description: ticket.description || event.description,
        category: ticket.isVIP ? 'VIP' : ticket.name || 'Ingresso',
        lotNumber: ticket.lotNumber,
        price: effectivePrice,
        currency: 'BRL',
        image: normalizeImageUrl(event.coverImage || event.squareImage),
        stock: availableQuantity,
        maxPerOrder: ticket.maxPerPurchase ?? undefined,
        maxPerCPF: ticket.maxPerCPF ?? undefined,
        isVip: ticket.isVIP ?? false,
        isOnSale: ticket.isOnSale ?? true,
        sortTimestamp: Number.isFinite(sortTimestamp) ? sortTimestamp : undefined,
        ticketFee:
            event.ticketFee !== undefined && event.ticketFee !== null ? Number(event.ticketFee) : undefined,
        platformFeePercentage:
            event.platformFeePercentage !== undefined && event.platformFeePercentage !== null
                ? Number(event.platformFeePercentage)
                : undefined,
        allowInstallments: ticket.allowInstallments ?? false,
        minInstallments:
            typeof ticket.minInstallments === 'number' ? ticket.minInstallments : ticket.minInstallments ?? null,
        maxInstallments:
            typeof ticket.maxInstallments === 'number' ? ticket.maxInstallments : ticket.maxInstallments ?? null,
        isTransport: ticket.isTransport ?? false,
        departureLocationId: ticket.departureLocationId ?? undefined,
        transportOptions: ticket.transportOptions && Array.isArray(ticket.transportOptions) && ticket.transportOptions.length > 0
            ? ticket.transportOptions.map((opt: any) => ({
                date: opt.date || '',
                attraction: opt.attraction || '',
                departureLocations: Array.isArray(opt.departureLocations) ? opt.departureLocations : []
            }))
            : undefined,
    };

    return normalized;
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

    // Em desenvolvimento, ignorar o cache de catálogo para sempre buscar dados frescos
    if (IS_DEV) {
        return fetchTicketCatalogFresh(options);
    }

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

                let ticketTypes: RawTicketType[];

                if (IS_DEV) {
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
                } else {
                    // Em produção, usar cache para reduzir chamadas
                    const cachedTicketTypes = cacheTicketTypes.get(eventId);
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


