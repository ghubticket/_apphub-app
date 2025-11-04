// Tipos para a API de Eventos
export interface EventItem {
    _id: string
    name: string
    description?: string
    date?: string
    time?: string
    location?: string
    coverImage?: string
    squareImage?: string
    isActive?: boolean
    createdAt: string
    updatedAt: string
}

export interface EventListResponse {
    success: boolean
    data: {
        events: EventItem[]
        pagination?: {
            page: number
            limit: number
            total: number
            totalPages: number
        }
    }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

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
        throw new Error(errorData.message || `HTTP ${response.status}`)
    }
    return response.json()
}

export const eventService = {
    async list(params: { page?: number; limit?: number; search?: string } = {}): Promise<EventListResponse> {
        const sp = new URLSearchParams()
        if (params.page) sp.append('page', String(params.page))
        if (params.limit) sp.append('limit', String(params.limit))
        if (params.search) sp.append('search', params.search)
        const qs = sp.toString()
        const url = `/events${qs ? `?${qs}` : ''}`
        return authenticatedRequest(url)
    },

    async create(payload: FormData): Promise<{ success: boolean; message: string; data: EventItem }> {
        const token = await getAuthToken()
        const response = await fetch(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
                // Content-Type omitted for FormData; browser sets boundary
            } as any,
            body: payload
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.message || errorData.errors?.[0] || `HTTP ${response.status}`
            throw new Error(errorMessage)
        }
        return response.json()
    }
}


