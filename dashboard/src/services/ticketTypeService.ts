import { getSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export interface TicketTypeItem {
    _id: string;
    name: string;
    description?: string;
    event: string;
    price: number;
    isVIP: boolean;
    lotNumber: number;
    maxQuantity: number;
    maxPerPurchase: number;
    soldQuantity: number;
    salesStart?: string;
    salesEnd?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    availableQuantity?: number;
    isSoldOut?: boolean;
    isOnSale?: boolean;
    allowInstallments?: boolean;
    minInstallments?: number | null;
    maxInstallments?: number | null;
}

export interface CreateTicketTypeData {
    name: string;
    description?: string;
    price: number;
    isVIP: boolean;
    lotNumber: number;
    maxQuantity: number;
    maxPerPurchase: number;
    salesStart?: string;
    salesEnd?: string;
    allowInstallments?: boolean;
    minInstallments?: number | null;
    maxInstallments?: number | null;
}

export interface UpdateTicketTypeData extends Partial<CreateTicketTypeData> {
    isActive?: boolean;
}

// Helper para obter token de autenticação
const getAuthToken = async (): Promise<string> => {
    const session = await getSession() as any;

    if (!session?.accessToken) {
        throw new Error('Token de acesso não fornecido');
    }

    
return session.accessToken as string;
};

// Helper para fazer requisições autenticadas
const authenticatedRequest = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = await getAuthToken();

    
return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
};

// Listar tipos de ingresso por evento
export const listTicketTypes = async (
    eventId: string,
    includeInactive = false
): Promise<TicketTypeItem[]> => {
    try {
        const url = `${API_BASE_URL}/events/${eventId}/ticket-types${includeInactive ? '?includeInactive=true' : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(errorData.message || `Erro ao listar tipos de ingresso: ${response.statusText}`);
        }

        const data = await response.json();

        
return data.data || [];
    } catch (error: any) {
        console.error('Erro ao listar tipos de ingresso:', error);
        throw error;
    }
};

// Obter tipo de ingresso por ID
export const getTicketType = async (id: string): Promise<TicketTypeItem> => {
    try {
        const response = await authenticatedRequest(`${API_BASE_URL}/ticket-types/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(errorData.message || `Erro ao obter tipo de ingresso: ${response.statusText}`);
        }

        const data = await response.json();

        
return data.data;
    } catch (error: any) {
        console.error('Erro ao obter tipo de ingresso:', error);
        throw error;
    }
};

// Criar tipo de ingresso
export const createTicketType = async (
    eventId: string,
    ticketTypeData: CreateTicketTypeData
): Promise<TicketTypeItem> => {
    try {
        const response = await authenticatedRequest(`${API_BASE_URL}/events/${eventId}/ticket-types`, {
            method: 'POST',
            body: JSON.stringify(ticketTypeData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));


            // Criar erro customizado com erros de validação
            const error = new Error(
                errorData.errors
                    ? Object.values(errorData.errors).flat().join(', ')
                    : errorData.message || `Erro ao criar tipo de ingresso: ${response.statusText}`
            ) as any;

            error.validationErrors = errorData.errors || {};
            throw error;
        }

        const data = await response.json();

        
return data.data;
    } catch (error: any) {
        console.error('Erro ao criar tipo de ingresso:', error);
        throw error;
    }
};

// Atualizar tipo de ingresso
export const updateTicketType = async (
    id: string,
    ticketTypeData: UpdateTicketTypeData
): Promise<TicketTypeItem> => {
    try {
        const response = await authenticatedRequest(`${API_BASE_URL}/ticket-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(ticketTypeData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));


            // Criar erro customizado com erros de validação
            const error = new Error(
                errorData.errors
                    ? Object.values(errorData.errors).flat().join(', ')
                    : errorData.message || `Erro ao atualizar tipo de ingresso: ${response.statusText}`
            ) as any;

            error.validationErrors = errorData.errors || {};
            throw error;
        }

        const data = await response.json();

        
return data.data;
    } catch (error: any) {
        console.error('Erro ao atualizar tipo de ingresso:', error);
        throw error;
    }
};

// Deletar tipo de ingresso
export const deleteTicketType = async (id: string): Promise<void> => {
    try {
        const response = await authenticatedRequest(`${API_BASE_URL}/ticket-types/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(errorData.message || `Erro ao deletar tipo de ingresso: ${response.statusText}`);
        }
    } catch (error: any) {
        console.error('Erro ao deletar tipo de ingresso:', error);
        throw error;
    }
};

// Atualizar status do tipo de ingresso
export const updateTicketTypeStatus = async (
    id: string,
    isActive: boolean
): Promise<TicketTypeItem> => {
    try {
        const response = await authenticatedRequest(`${API_BASE_URL}/ticket-types/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(errorData.message || `Erro ao atualizar status: ${response.statusText}`);
        }

        const data = await response.json();

        
return data.data;
    } catch (error: any) {
        console.error('Erro ao atualizar status do tipo de ingresso:', error);
        throw error;
    }
};

