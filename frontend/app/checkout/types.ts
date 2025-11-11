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

