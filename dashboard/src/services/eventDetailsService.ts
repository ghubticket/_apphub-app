const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const getAuthToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null

    try {
        const res = await fetch('/api/auth/session')

        if (res.ok) {
            const session = await res.json()

            return session?.accessToken || null
        }
    } catch (e) {
        console.error('Erro ao obter token:', e)
    }

    return null
}

const authenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken()

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        }
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Se for erro de token inválido ou não autorizado, disparar evento
        if (response.status === 401 || errorData.message?.includes('Token inválido') || errorData.message?.includes('token')) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('token-expired'))
            }
        }

        throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
}

export interface TransportLocation {
    name: string
    address: string
    meetingTime: string
    departureTime: string
    price?: number
}

export interface TransportInfo {
    departureLocations?: TransportLocation[]
    returnTime?: string
    transportType?: string
    includes?: string[]
}

export interface Attraction {
    name: string
    date?: string
    stage?: string
    order?: number
}

export interface PriceByLocation {
    locationName: string
    pixPrice?: number
    creditCardPrice?: number
    installments?: number
    description?: string
}

export interface FAQ {
    question: string
    answer: string
    order?: number
}

export interface EventDetailsItem {
    _id?: string
    event: string
    about?: {
        richText?: string // Conteúdo HTML do editor de texto rico
    }
    packageIncludes?: {
        title?: string
        items: string[]
    }
    transport?: TransportInfo
    attractions?: {
        title?: string
        items: Attraction[]
        groupedByDate?: boolean
    }
    pricing?: {
        title?: string
        pricesByLocation: PriceByLocation[]
        generalInfo?: string
        pixDiscount?: number
    }
    video?: {
        url: string
        thumbnail?: string
        title?: string
        description?: string
    }
    faq?: {
        title?: string
        items: FAQ[]
    }
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}

export const eventDetailsService = {
    async get(eventId: string): Promise<{ success: boolean; data: EventDetailsItem }> {
        return authenticatedRequest(`/event-details/${eventId}`)
    },

    async upsert(eventId: string, data: Partial<EventDetailsItem>): Promise<{ success: boolean; message: string; data: EventDetailsItem }> {
        return authenticatedRequest(`/event-details/${eventId}`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    async update(eventId: string, data: Partial<EventDetailsItem>): Promise<{ success: boolean; message: string; data: EventDetailsItem }> {
        return authenticatedRequest(`/event-details/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },

    async delete(eventId: string): Promise<{ success: boolean; message: string }> {
        return authenticatedRequest(`/event-details/${eventId}`, {
            method: 'DELETE'
        })
    }
}

