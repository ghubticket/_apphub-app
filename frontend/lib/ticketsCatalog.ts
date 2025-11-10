'use client';

import api from './api';
import type { TicketProduct } from '@/types/ticket';

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
        image: event.coverImage || event.squareImage,
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

export const fetchTicketCatalog = async (options: FetchTicketCatalogOptions = {}): Promise<TicketProduct[]> => {
    const { limitEvents = 12, limitTicketsPerEvent, search, onlyWithAvailability = false } = options;

    const eventsResponse = await api.get('/events', {
        params: {
            page: 1,
            limit: limitEvents,
            search,
        },
    });

    const eventsRaw: RawEvent[] = Array.isArray(eventsResponse.data?.data?.events)
        ? eventsResponse.data.data.events
        : Array.isArray(eventsResponse.data?.events)
          ? eventsResponse.data.events
          : Array.isArray(eventsResponse.data)
            ? eventsResponse.data
            : [];

    const filteredEvents = eventsRaw.filter(
        (event) => event && event.isActive !== false && (event.status ?? 'published') !== 'cancelled',
    );

    const ticketsNested = await Promise.all(
        filteredEvents.map(async (event) => {
            try {
                const ticketTypesResponse = await api.get(`/events/${event._id ?? event.id}/ticket-types`, {
                    params: {
                        includeInactive: false,
                    },
                });
                const ticketTypes: RawTicketType[] = Array.isArray(ticketTypesResponse.data?.data)
                    ? ticketTypesResponse.data.data
                    : Array.isArray(ticketTypesResponse.data)
                      ? ticketTypesResponse.data
                      : [];

                const normalizedTickets = ticketTypes
                    .map((ticket) => normalizeTicketType(ticket, event, { onlyWithAvailability }))
                    .filter((ticket): ticket is TicketProduct => Boolean(ticket));

                if (limitTicketsPerEvent !== undefined && limitTicketsPerEvent > 0) {
                    return normalizedTickets.slice(0, limitTicketsPerEvent);
                }
                return normalizedTickets;
            } catch (error) {
                console.error('Erro ao carregar ingressos do evento', event._id ?? event.id, error);
                return [];
            }
        }),
    );

    const flattened = ticketsNested.flat();

    return flattened.sort((a, b) => {
        const dateA = a.sortTimestamp ?? Number.POSITIVE_INFINITY;
        const dateB = b.sortTimestamp ?? Number.POSITIVE_INFINITY;
        if (dateA === dateB) return 0;
        return dateA - dateB;
    });
};

export type { FetchTicketCatalogOptions };


