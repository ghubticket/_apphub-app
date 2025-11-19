import { useState, useCallback, useEffect } from 'react';

import * as ticketTypeService from '@/services/ticketTypeService';
import type { TicketTypeItem, CreateTicketTypeData, UpdateTicketTypeData } from '@/services/ticketTypeService';

export const useTicketTypes = (eventId: string | null) => {
    const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTicketTypes = useCallback(async () => {
        if (!eventId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await ticketTypeService.listTicketTypes(eventId);

            setTicketTypes(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar tipos de ingresso');
            console.error('Erro ao buscar tipos de ingresso:', err);
            setTicketTypes([]); // Garantir que é array vazio em caso de erro
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchTicketTypes();
    }, [fetchTicketTypes]);

    const createTicketType = useCallback(
        async (data: CreateTicketTypeData) => {
            if (!eventId) throw new Error('Event ID é obrigatório');

            setLoading(true);
            setError(null);

            try {
                const newTicketType = await ticketTypeService.createTicketType(eventId, data);

                setTicketTypes((prev) => [...prev, newTicketType].sort((a, b) => a.lotNumber - b.lotNumber));
                
return newTicketType;
            } catch (err: any) {
                const errorMessage = err.message || 'Erro ao criar tipo de ingresso';

                setError(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [eventId]
    );

    const updateTicketType = useCallback(async (id: string, data: UpdateTicketTypeData) => {
        setLoading(true);
        setError(null);

        try {
            const updated = await ticketTypeService.updateTicketType(id, data);

            setTicketTypes((prev) =>
                prev.map((tt) => (tt._id === id ? updated : tt)).sort((a, b) => a.lotNumber - b.lotNumber)
            );
            
return updated;
        } catch (err: any) {
            const errorMessage = err.message || 'Erro ao atualizar tipo de ingresso';

            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteTicketType = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);

        try {
            await ticketTypeService.deleteTicketType(id);
            setTicketTypes((prev) => prev.filter((tt) => tt._id !== id));
        } catch (err: any) {
            const errorMessage = err.message || 'Erro ao deletar tipo de ingresso';

            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStatus = useCallback(async (id: string, isActive: boolean) => {
        setLoading(true);
        setError(null);

        try {
            const updated = await ticketTypeService.updateTicketTypeStatus(id, isActive);

            setTicketTypes((prev) =>
                prev.map((tt) => (tt._id === id ? updated : tt))
            );
            
return updated;
        } catch (err: any) {
            const errorMessage = err.message || 'Erro ao atualizar status';

            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        ticketTypes,
        loading,
        error,
        fetchTicketTypes,
        createTicketType,
        updateTicketType,
        deleteTicketType,
        updateStatus,
    };
};

