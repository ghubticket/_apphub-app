// Dashboard Types

export type TabKey = 'orders' | 'requests';
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

// Re-export parcelled types
export type { 
    ParcelStatus, 
    ParcelledOrderStatus, 
    ParcelSummary, 
    ParcelledOrderSummary,
    ParcelledOrderWithParcels,
    ParcelPaymentInfo
} from './parcelled';

export type OrderTicketSummary = {
    _id?: string;
    code?: string;
    status?: string;
    qrCode?: string | null;
    price?: number;
};

export type OrderEventSummary = {
    _id?: string;
    id?: string;
    name?: string;
    date?: string;
    location?: string;
    address?: string;
};

export type PixInfo = {
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;
    expiresAt?: string | null;
    expirationMinutes?: number | null;
};

export type OrderSummary = {
    _id: string;
    orderNumber?: string;
    status: OrderStatus;
    totalAmount: number;
    subtotal?: number;
    discountAmount?: number;
    platformFee?: number;
    totalTickets: number;
    paymentMethod?: string;
    createdAt?: string;
    expiresAt?: string;
    customerData?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    event?: OrderEventSummary | null;
    tickets: OrderTicketSummary[];
    pixInfo?: PixInfo;
};

export type OrderGroup = {
    eventId: string;
    eventName: string;
    eventDate?: string;
    eventLocation?: string;
    orders: OrderSummary[];
    totalAmount: number;
    totalTickets: number;
    paymentMethods: string[];
    earliestCreatedAt?: string;
    latestCreatedAt?: string;
};

export type OrderPagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};
