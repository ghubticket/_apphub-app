import type { CartItem } from '@/lib/cart';

export type CheckoutCustomerData = {
    name: string;
    email: string;
    cpf: string;
    phone: string;
    rg?: string; // RG do passageiro (para pacotes de transporte)
    billingStreet?: string;
    billingNumber?: string;
    billingNeighborhood?: string;
    billingCity?: string;
    billingState?: string;
    billingZip?: string;
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
    expiresAt?: string | Date; // Data de expiração do pedido (quando status='pending')
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

