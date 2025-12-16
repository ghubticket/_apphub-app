'use client';

export type TicketProduct = {
    id: string;
    ticketTypeId?: string;
    eventId?: string;
    eventName?: string;
    eventDate?: string;
    eventDateIso?: string;
    location?: string;
    name: string;
    description?: string;
    category?: string;
    lotNumber?: number;
    price: number;
    currency?: string;
    image?: string;
    stock?: number;
    maxPerOrder?: number;
    maxPerCPF?: number;
    isVip?: boolean;
    isOnSale?: boolean;
    sortTimestamp?: number;
    ticketFee?: number;
    platformFeePercentage?: number;
    allowInstallments?: boolean;
    minInstallments?: number | null;
    maxInstallments?: number | null;
};


