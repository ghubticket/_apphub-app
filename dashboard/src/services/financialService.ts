const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

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

export interface FinancialStats {
    totalSales: number // Total de vendas (subtotal, sem taxa)
    totalFees: number // Total de taxas da plataforma
    totalRevenue: number // Total geral (vendas + taxas)
}

export const financialService = {
    async getStats(): Promise<{ success: boolean; data: FinancialStats }> {
        const token = await getAuthToken()

        const response = await fetch(`${API_BASE_URL}/orders/financial/stats`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            credentials: 'include'
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))

            throw new Error(errorData.message || 'Falha ao buscar estatísticas financeiras')
        }

        
return response.json()
    }
}

