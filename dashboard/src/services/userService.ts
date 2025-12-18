import type { UserRole } from '@/types/roles'

// Tipos para a API
export interface User {
    _id: string
    name: string
    email: string
    role: UserRole
    isActive: boolean
    phone?: string
    cpf?: string

    // Flags de segurança
    suspiciousActivityCount?: number
    isSuspicious?: boolean
    suspiciousReason?: string
    lastSuspiciousActivity?: string
    isBlacklisted?: boolean
    blacklistReason?: string
    blacklistedAt?: string
    createdAt: string
    updatedAt: string
}

export interface UserListResponse {
    success: boolean
    data: {
        users: User[]
        pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
        }
    }
}

export interface UserUpdateStatusRequest {
    isActive: boolean
}

export interface UserUpdateStatusResponse {
    success: boolean
    message: string
    data: User
}

// Configuração da API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

// Função para obter token de autenticação do NextAuth.js
const getAuthToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null

    try {
        // Buscar token do NextAuth.js
        const response = await fetch('/api/auth/session')

        if (response.ok) {
            const session = await response.json()

            
return session?.accessToken || null
        }
    } catch (error) {
        console.error('Erro ao obter token:', error)
    }

    return null
}

// Função para fazer requisições autenticadas
const authenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken()

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

        throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
}

// Serviços de usuário
export const userService = {
    // Listar todos os usuários (apenas ADMIN)
    async getAllUsers(params: {
        page?: number
        limit?: number
        search?: string
        role?: UserRole
        status?: boolean
        suspicious?: boolean
        blacklisted?: boolean
    } = {}): Promise<UserListResponse> {
        const searchParams = new URLSearchParams()

        if (params.page) searchParams.append('page', params.page.toString())
        if (params.limit) searchParams.append('limit', params.limit.toString())
        if (params.search) searchParams.append('search', params.search)
        if (params.role) searchParams.append('role', params.role)
        if (params.status !== undefined) searchParams.append('status', params.status.toString())
        if (params.suspicious !== undefined) searchParams.append('suspicious', params.suspicious.toString())
        if (params.blacklisted !== undefined) searchParams.append('blacklisted', params.blacklisted.toString())

        const queryString = searchParams.toString()
    const url = `/users${queryString ? `?${queryString}` : ''}`

        return authenticatedRequest(url)
    },

    // Atualizar status do usuário (apenas ADMIN)
    async updateUserStatus(
        userId: string,
        status: UserUpdateStatusRequest
    ): Promise<UserUpdateStatusResponse> {
    return authenticatedRequest(`/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify(status),
        })
    },

    // Obter dados do usuário logado
    async getCurrentUser(): Promise<{ success: boolean; data: User }> {
        return authenticatedRequest('/auth/me')
    },

    // Atualizar perfil do usuário
    async updateProfile(profileData: {
        name?: string
        phone?: string
        cpf?: string
    }): Promise<{ success: boolean; message: string; data: User }> {
        return authenticatedRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        })
    },

    // Alterar senha
    async changePassword(passwordData: {
        currentPassword: string
        newPassword: string
        confirmPassword: string
    }): Promise<{ success: boolean; message: string }> {
        return authenticatedRequest('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify(passwordData),
        })
    },

    // Obter sessões ativas
    async getActiveSessions(): Promise<{
        success: boolean
        data: Array<{
            _id: string
            deviceInfo: any
            lastActivity: string
            isActive: boolean
        }>
    }> {
        return authenticatedRequest('/auth/sessions')
    },

    // Invalidar sessão específica
    async invalidateSession(sessionId: string): Promise<{ success: boolean; message: string }> {
        return authenticatedRequest(`/auth/sessions/${sessionId}`, {
            method: 'DELETE',
        })
    },

    // Invalidar todas as sessões
    async invalidateAllSessions(): Promise<{ success: boolean; message: string }> {
        return authenticatedRequest('/auth/sessions/all', {
            method: 'DELETE',
        })
    },

    // Obter estatísticas (apenas ADMIN)
    async getStats(): Promise<{
        success: boolean
        data: {
            totalSessions: number
            activeSessions: number
            totalUsers: number
            todayLogins: number
        }
    }> {
        return authenticatedRequest('/auth/stats')
    },

    // Obter usuário por ID com pedidos (apenas ADMIN)
    async getUserById(userId: string): Promise<{
        success: boolean
        data: {
            user: User
            orders: Array<{
                _id: string
                orderNumber: string
                event: {
                    _id: string
                    name: string
                    date: string
                    location: string
                    coverImage?: string
                } | string
                tickets: Array<{
                    _id: string
                    code: string
                    status: string
                    price: number
                    ticketType?: {
                        _id: string
                        name: string
                    }
                }>
                totalAmount: number
                totalTickets: number
                status: 'pending' | 'paid' | 'cancelled' | 'refunded'
                paymentMethod?: string
                createdAt: string
                updatedAt: string
            }>
        }
    }> {
        return authenticatedRequest(`/users/${userId}`)
    },

    // Marcar/desmarcar usuário como suspeito (apenas ADMIN)
    async toggleSuspicious(
        userId: string,
        data: { isSuspicious?: boolean; reason?: string }
    ): Promise<{ success: boolean; message: string; data: User }> {
        return authenticatedRequest(`/users/${userId}/suspicious`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },

    // Adicionar/remover usuário da blacklist (apenas ADMIN)
    async toggleBlacklist(
        userId: string,
        data: { isBlacklisted?: boolean; reason?: string }
    ): Promise<{ success: boolean; message: string; data: User }> {
        return authenticatedRequest(`/users/${userId}/blacklist`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },
}
