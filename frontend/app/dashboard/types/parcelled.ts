// Tipos para Pedidos Parcelados (PIX Parcelado)

export type ParcelStatus = 'pending' | 'payment_generated' | 'paid' | 'overdue' | 'cancelled';

export type ParcelledOrderStatus = 
    | 'pending_entry'    // Aguardando pagamento da entrada
    | 'active'           // Entrada paga, parcelas em andamento
    | 'completed'        // Todas as parcelas pagas
    | 'cancelled';       // Cancelado (2+ parcelas atrasadas ou entrada não paga)

export type ParcelSummary = {
    _id: string;
    sequence: number;        // 0 = entrada, 1+ = parcelas
    amount: number;
    dueDate: string;
    status: ParcelStatus;
    paymentId?: string;
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;
    paidAt?: string;         // Data de pagamento
};

export type ParcelledOrderSummary = {
    _id: string;
    orderNumber?: string;
    event?: {
        _id?: string;
        id?: string;
        name?: string;
        date?: string;
        location?: string;
        address?: string;
    } | null;
    ticketType?: { 
        name?: string;
        _id?: string;
    } | null;
    totalAmount: number;
    entryAmount: number;
    installmentsCount: number;
    status: ParcelledOrderStatus;
    paymentType: 'pix' | 'boleto';
    createdAt?: string;
    metadata?: {
        eventName?: string;
        ticketTypeName?: string;
        totalTickets?: number;
    };
    tickets?: Array<{
        _id?: string;
        code?: string;
        status?: string;
        qrCode?: string | null;
        price?: number;
    }>;
    // Parcelas associadas (preenchido no frontend)
    parcels?: ParcelSummary[];
};

// Helper types
export type ParcelledOrderWithParcels = ParcelledOrderSummary & {
    parcels: ParcelSummary[];
};

export type ParcelPaymentInfo = {
    parcelId: string;
    orderId: string;
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    expiresAt?: string | null;
};
