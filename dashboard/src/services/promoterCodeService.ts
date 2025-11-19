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
        },
        credentials: 'include'
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    
return response.json()
}

export interface PromoterCodeItem {
    _id: string
    code: string
    name: string
    cpf: string
    email: string
    whatsapp: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    currentUses: number
    isActive: boolean
    events: Array<{ _id: string; name: string; date?: string }>
    createdBy: { _id: string; name: string; email: string }
    createdAt: string
    updatedAt: string
}

export interface PromoterCodeListResponse {
    success: boolean
    data: {
        codes: PromoterCodeItem[]
        pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
        }
    }
}

export interface PromoterCodeStats {
    code: string
    name: string
    currentUses: number
    totalOrders: number
    totalSales: number // Vendas brutas
    totalDiscount: number
    totalRevenue: number // Receita líquida
    commission: number // Futuro
}

export const promoterCodeService = {
    async list(params?: {
        page?: number
        limit?: number
        search?: string
        eventId?: string
        isActive?: boolean
    }): Promise<PromoterCodeListResponse> {
        const searchParams = new URLSearchParams()

        if (params?.page) searchParams.append('page', params.page.toString())
        if (params?.limit) searchParams.append('limit', params.limit.toString())
        if (params?.search) searchParams.append('search', params.search)
        if (params?.eventId) searchParams.append('eventId', params.eventId)
        if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString())
        const queryString = searchParams.toString()
        const url = `/promoters${queryString ? `?${queryString}` : ''}`

        
return authenticatedRequest(url)
    },

    async getById(id: string): Promise<{ success: boolean; data: PromoterCodeItem }> {
        return authenticatedRequest(`/promoters/${id}`)
    },

    async create(payload: {
        code: string
        name: string
        cpf: string
        email: string
        whatsapp: string
        discountType: 'percentage' | 'fixed'
        discountValue: number
        events?: string[]
        isActive?: boolean
    }): Promise<{ success: boolean; message: string; data: PromoterCodeItem }> {
        return authenticatedRequest('/promoters', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    },

    async update(id: string, payload: Partial<{
        code: string
        name: string
        cpf: string
        email: string
        whatsapp: string
        discountType: 'percentage' | 'fixed'
        discountValue: number
        events?: string[]
        isActive?: boolean
    }>): Promise<{ success: boolean; message: string; data: PromoterCodeItem }> {
        return authenticatedRequest(`/promoters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        })
    },

    async toggle(id: string): Promise<{ success: boolean; message: string; data: PromoterCodeItem }> {
        return authenticatedRequest(`/promoters/${id}/toggle`, {
            method: 'POST'
        })
    },

    async delete(id: string): Promise<{ success: boolean; message: string }> {
        return authenticatedRequest(`/promoters/${id}`, {
            method: 'DELETE'
        })
    },

    async getStats(id: string): Promise<{ success: boolean; data: PromoterCodeStats }> {
        return authenticatedRequest(`/promoters/${id}/stats`)
    },

    // Validação pública (sem autenticação)
    async validate(code: string, eventId: string): Promise<{
        success: boolean
        valid: boolean
        data?: {
            code: string
            discountType: 'percentage' | 'fixed'
            discountValue: number
        }
        message?: string
    }> {
        const response = await fetch(`${API_BASE_URL}/promoters/validate?code=${encodeURIComponent(code)}&eventId=${encodeURIComponent(eventId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao validar código')
        }

        
return data
    }
}

