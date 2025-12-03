import type { Metadata } from 'next';
import apiServer from '@/lib/apiServer';
import { generateEventMetadata, getOgImageUrl } from '@/lib/seo';
import EventPageClient from './EventPageClient';

type EventTicketsPageProps = {
    params: {
        eventId: string;
    };
};

/**
 * Busca dados do evento no servidor para metadata
 */
async function fetchEventData(eventId: string) {
    try {
        const response = await apiServer.get(`/events/${eventId}`);
        const event = response.data?.data || response.data;
        
        if (!event) {
            return null;
        }

        // Buscar tickets do evento para obter mais informações
        try {
            const ticketsResponse = await apiServer.get('/tickets', {
                params: {
                    eventId,
                    limit: 1,
                },
            });
            
            const tickets = Array.isArray(ticketsResponse.data?.data?.tickets)
                ? ticketsResponse.data.data.tickets
                : Array.isArray(ticketsResponse.data?.tickets)
                ? ticketsResponse.data.tickets
                : Array.isArray(ticketsResponse.data)
                ? ticketsResponse.data
                : [];

            const primaryTicket = tickets[0];

            return {
                name: event.name || 'Evento',
                description: event.description,
                image: event.coverImage || event.squareImage || primaryTicket?.image,
                date: event.date,
                location: event.location || primaryTicket?.location,
                city: event.city,
                state: event.state,
            };
        } catch {
            // Se não conseguir buscar tickets, usar apenas dados do evento
            return {
                name: event.name || 'Evento',
                description: event.description,
                image: event.coverImage || event.squareImage,
                date: event.date,
                location: event.location,
                city: event.city,
                state: event.state,
            };
        }
    } catch (error) {
        console.error('Erro ao buscar dados do evento para metadata:', error);
        return null;
    }
}

/**
 * Gera metadata server-side para a página do evento
 * Isso garante que WhatsApp, Facebook e outros crawlers vejam as informações corretas
 */
export async function generateMetadata({ params }: EventTicketsPageProps): Promise<Metadata> {
    const { eventId } = params;

    // Buscar dados do evento no servidor
    const eventData = await fetchEventData(eventId);

    if (!eventData) {
        // Fallback: metadata genérica se não conseguir buscar dados
        return generateEventMetadata({
            name: 'Evento',
            id: eventId,
            description: 'Ingressos para eventos',
        });
    }

    // Preparar imagem para OG
    const eventImage = eventData.image
        ? getOgImageUrl(eventData.image)
        : undefined;

    // Gerar metadata específica do evento
    return generateEventMetadata({
        name: eventData.name,
        description: eventData.description,
        image: eventImage,
        date: eventData.date,
        location: eventData.location,
        id: eventId,
    });
}

/**
 * Componente da página (server component)
 * Renderiza o componente client para interatividade
 */
export default function EventTicketsPage({ params }: EventTicketsPageProps) {
    return <EventPageClient eventId={params.eventId} />;
}
