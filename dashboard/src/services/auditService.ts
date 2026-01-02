const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

export interface AuditLog {
    _id: string
    entityType: 'Order' | 'Ticket' | 'Event' | 'User' | 'TicketType'
    entityId: string
    action: 'create' | 'update' | 'delete' | 'status_change' | 'payment_update' | 'cancel' | 'refund'
    performedBy?: {
        _id: string
        name: string
        email: string
        role?: string
    }
    performedByRole?: 'ADMIN' | 'CLIENTE' | 'QRCODE' | 'SYSTEM'
    changes?: Array<{
        field: string
        oldValue: any
        newValue: any
    }>
    metadata?: {
        ipAddress?: string
        userAgent?: string
        reason?: string
        paymentId?: string
        paymentStatus?: string
        orderNumber?: string
        [key: string]: any
    }
    createdAt: string
}

export interface AuditLogListResponse {
    success: boolean
    data: {
        logs: AuditLog[]
        pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
            hasNextPage: boolean
            hasPrevPage: boolean
        }
    }
}

export interface AuditLogDetailResponse {
    success: boolean
    data: {
        log: AuditLog
    }
}

export interface AuditLogFilters {
    entityType?: 'Order' | 'Ticket' | 'Event' | 'User' | 'TicketType'
    entityId?: string
    action?: 'create' | 'update' | 'delete' | 'status_change' | 'payment_update' | 'cancel' | 'refund'
    performedBy?: string
    performedByRole?: 'ADMIN' | 'CLIENTE' | 'QRCODE' | 'SYSTEM'
    startDate?: string // ISO 8601
    endDate?: string // ISO 8601
    page?: number
    limit?: number
}

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

    if (!token) {
        throw new Error('Token de acesso não fornecido. Por favor, faça login novamente.')
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
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

export const auditService = {
    /**
     * Lista logs de auditoria com filtros e paginação
     */
    async list(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
        const params = new URLSearchParams()

        if (filters.entityType) params.append('entityType', filters.entityType)
        if (filters.entityId) params.append('entityId', filters.entityId)
        if (filters.action) params.append('action', filters.action)
        if (filters.performedBy) params.append('performedBy', filters.performedBy)
        if (filters.performedByRole) params.append('performedByRole', filters.performedByRole)
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.page) params.append('page', filters.page.toString())
        if (filters.limit) params.append('limit', filters.limit.toString())

        const queryString = params.toString()
        const url = `/audit-logs${queryString ? `?${queryString}` : ''}`

        return authenticatedRequest(url)
    },

    /**
     * Busca um log de auditoria específico
     */
    async getById(id: string): Promise<AuditLogDetailResponse> {
        return authenticatedRequest(`/audit-logs/${id}`)
    },

    /**
     * Busca logs relacionados a uma entidade específica
     */
    async getByEntity(
        entityType: 'Order' | 'Ticket' | 'Event' | 'User' | 'TicketType',
        entityId: string,
        page?: number,
        limit?: number
    ): Promise<AuditLogListResponse> {
        const params = new URLSearchParams()
        if (page) params.append('page', page.toString())
        if (limit) params.append('limit', limit.toString())

        const queryString = params.toString()
        const url = `/audit-logs/entity/${entityType}/${entityId}${queryString ? `?${queryString}` : ''}`

        return authenticatedRequest(url)
    },
}
