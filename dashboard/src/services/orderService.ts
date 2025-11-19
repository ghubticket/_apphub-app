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
    subtotal?: number;
    discountAmount?: number;
    platformFee?: number;
    promoterCode?: string;
    totalTickets: number;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free';
    paymentId?: string;
    paymentStatus?: string;
    paymentStatusDetail?: string;
    paymentMessage?: string;
    paymentAdminMessage?: string;
    paymentErrorCode?: string;
    paymentErrorDescription?: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrderListResponse {
    success: boolean;
    data: OrderItem[] | {
        orders: OrderItem[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
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

            
return session?.accessToken || null;
        }
    } catch (e) {
        console.error('Erro ao obter token:', e);
    }

    
return null;
};

const authenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();

    if (!token) {
        throw new Error('Token de acesso não fornecido. Por favor, faça login novamente.');
    }

    const fullUrl = `${API_BASE_URL}${url}`;

    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));

            throw new Error(error.message || `Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        
return data;
    } catch (error: any) {
        // Se for erro de rede (Failed to fetch)
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            throw new Error(`Erro de conexão: Não foi possível conectar ao servidor em ${API_BASE_URL}. Verifique se o backend está rodando.`);
        }

        throw error;
    }
};

export const orderService = {
    async list(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
    }): Promise<OrderListResponse & { pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
        const searchParams = new URLSearchParams();

        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        if (params?.search) searchParams.append('search', params.search);
        if (params?.status) searchParams.append('status', params.status);

        const queryString = searchParams.toString();
        const url = `/orders${queryString ? `?${queryString}` : ''}`;

        return authenticatedRequest(url);
    },

    async getById(id: string): Promise<OrderDetailResponse> {
        return authenticatedRequest(`/orders/${id}`);
    },
};

