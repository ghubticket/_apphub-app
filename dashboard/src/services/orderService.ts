const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Ticket {
    _id: string;
    code: string;
    qrCode: string;
    status: 'pending' | 'confirmed' | 'used' | 'cancelled' | 'refunded';
    price: number;
    ticketType?: {
        _id: string;
        name: string;
        isVIP: boolean;
    };
}

export interface OrderItem {
    _id: string;
    orderNumber: string;
    customer: {
        _id: string;
        name: string;
        email: string;
    } | string;
    event: {
        _id: string;
        name: string;
        date: string;
        location: string;
        coverImage?: string;
    } | string;
    tickets: Ticket[];
    totalAmount: number;
    totalTickets: number;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free';
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrderListResponse {
    success: boolean;
    data: OrderItem[];
}

export interface OrderDetailResponse {
    success: boolean;
    data: OrderItem;
}

const getAuthToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
            const session = await res.json();
            const token = session?.accessToken || null;
            if (!token) {
                console.warn('⚠️ Token não encontrado na sessão');
            }
            return token;
        } else {
            console.warn('⚠️ Erro ao buscar sessão:', res.status, res.statusText);
        }
    } catch (e) {
        console.error('❌ Erro ao obter token:', e);
    }
    return null;
};

const authenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    
    if (!token) {
        console.error('❌ Token não disponível');
        throw new Error('Token de acesso não fornecido. Por favor, faça login novamente.');
    }

    const fullUrl = `${API_BASE_URL}${url}`;
    console.log(`📡 Fazendo requisição para: ${fullUrl}`);

    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        console.log(`📥 Resposta recebida: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
            console.error('❌ Erro na resposta:', error);
            throw new Error(error.message || `Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Dados recebidos:', data);
        return data;
    } catch (error: any) {
        console.error('❌ Erro na requisição:', error);
        // Se for erro de rede (Failed to fetch)
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            throw new Error(`Erro de conexão: Não foi possível conectar ao servidor em ${API_BASE_URL}. Verifique se o backend está rodando.`);
        }
        throw error;
    }
};

export const orderService = {
    async list(): Promise<OrderListResponse> {
        return authenticatedRequest('/orders');
    },

    async getById(id: string): Promise<OrderDetailResponse> {
        return authenticatedRequest(`/orders/${id}`);
    },
};

