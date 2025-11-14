import type { CartItem } from '@/lib/cart';

export type CheckoutCustomerData = {
    name: string;
    email: string;
    cpf: string;
    phone: string;
};

export type CheckoutCartItem = CartItem & {
    subtotal: number;
    platformFeeValue: number;
    fixedFeeValue: number;
    total: number;
};

export type CreatedOrder = {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    totalTickets: number;
    status: string;
    paymentMethod?: string; // Método de pagamento: 'pix', 'credit_card', 'debit_card', etc.
    cardAttempts?: number;
    maxCardAttempts?: number;
    createdAt?: string | Date; // Data de criação do pedido (para calcular tempo restante)
    event?: {
        name?: string;
        date?: string;
        location?: string;
    };
    customerData?: {
        name?: string;
        email?: string;
        cpf?: string;
        phone?: string;
    };
};

export type PixPaymentResult = {
    paymentId: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    expiresAt?: string;
    expirationMinutes?: number;
    status: string;
    statusDetail?: string;
    statusInfo?: {
        userMessage?: string;
        adminMessage?: string;
        color?: string;
        requiresAction?: boolean;
        canRetry?: boolean;
        internalStatus?: string;
    };
};

export type CardFieldKey =
    | 'cardNumber'
    | 'cardExpirationMonth'
    | 'cardExpirationYear'
    | 'securityCode'
    | 'cardholderName'
    | 'cardholderEmail'
    | 'installments'
    | 'identificationNumber';

export type Reservation = {
    _id: string;
    event: string | { _id: string; [key: string]: any }; // Pode ser ID ou objeto populado
    ticketType: string | { _id: string; [key: string]: any }; // Pode ser ID ou objeto populado
    quantity: number;
    sessionId: string;
    expiresAt: string | Date;
    isActive: boolean;
    createdAt?: string | Date;
    timeRemaining?: number; // em segundos
    orderId?: string; // ID do pedido vinculado (opcional - para reservas vinculadas a pedidos PIX)
};

