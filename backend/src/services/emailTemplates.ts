import { renderTemplate } from '../utils/templateRenderer';
import { sendEmail, EmailData, EmailAttachment } from './emailService';
import type { Order } from '../models';
import { APP_NAME, SUPPORT_EMAIL } from '../config/appConfig';

/**
 * Interface para dados de confirmação de ingresso
 */
export interface TicketConfirmationData {
    customerName: string;
    orderNumber: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    eventAddress?: string;
    totalTickets: number;
    ticketType: string;
    downloadLink?: string;
    qrCodes?: Array<{
        code: string;
        qrCode: string; // Base64 data URL
        holderName?: string;
    }>;
}

/**
 * Envia email de confirmação de compra com ingressos
 */
export const sendTicketConfirmationEmail = async (
    to: string,
    data: TicketConfirmationData,
    attachments?: EmailAttachment[]
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('ticket-confirmation', {
        ...data,
        subject: `Seus ingressos - ${data.eventName}`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `✅ Seus ingressos - ${data.eventName}`,
        html,
        attachments,
    });
};

/**
 * Interface para dados de pagamento pendente
 */
export interface PaymentPendingData {
    customerName: string;
    orderNumber: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    totalAmount: string;
    paymentMethod: string;
    expirationMinutes: number;
    pixQrCode?: string;
    pixCode?: string;
    paymentLink?: string;
}

/**
 * Envia email de pagamento pendente
 */
export const sendPaymentPendingEmail = async (
    to: string,
    data: PaymentPendingData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('payment-pending', {
        ...data,
        subject: `Pagamento pendente - Pedido #${data.orderNumber}`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `⏳ Pagamento pendente - Pedido #${data.orderNumber}`,
        html,
    });
};

/**
 * Interface para dados de pagamento confirmado
 */
export interface PaymentConfirmedData {
    customerName: string;
    orderNumber: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    totalAmount: string;
    paymentMethod: string;
    paymentDate: string;
    ticketsLink?: string;
}

/**
 * Envia email de pagamento confirmado
 */
export const sendPaymentConfirmedEmail = async (
    to: string,
    data: PaymentConfirmedData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('payment-confirmed', {
        ...data,
        subject: `Pagamento confirmado - Pedido #${data.orderNumber}`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `✅ Pagamento confirmado - Pedido #${data.orderNumber}`,
        html,
    });
};

/**
 * Interface para dados de pedido cancelado
 */
export interface OrderCancelledData {
    customerName: string;
    orderNumber: string;
    eventName: string;
    cancelledAt: string;
    cancellationReason?: string;
    refundInfo?: string;
}

/**
 * Envia email de pedido cancelado
 */
export const sendOrderCancelledEmail = async (
    to: string,
    data: OrderCancelledData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('order-cancelled', {
        ...data,
        subject: `Pedido cancelado - #${data.orderNumber}`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `❌ Pedido cancelado - #${data.orderNumber}`,
        html,
    });
};

/**
 * Interface para dados de boas-vindas
 */
export interface WelcomeData {
    customerName: string;
    customerEmail: string;
    customerRole?: string;
    loginLink?: string;
}

/**
 * Envia email de boas-vindas para novo usuário
 */
export const sendWelcomeEmail = async (
    to: string,
    data: WelcomeData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('welcome', {
        ...data,
        subject: `Bem-vindo ao ${APP_NAME}!`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `🎉 Bem-vindo ao ${APP_NAME}!`,
        html,
    });
};

/**
 * Interface para dados de redefinição de senha
 */
export interface PasswordResetData {
    customerName: string;
    resetLink?: string;
    resetCode?: string;
    expirationMinutes?: number;
}

/**
 * Envia email de redefinição de senha
 */
export const sendPasswordResetEmail = async (
    to: string,
    data: PasswordResetData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('password-reset', {
        ...data,
        expirationMinutes: data.expirationMinutes || 30,
        subject: 'Redefinição de senha',
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `🔐 Redefinição de senha - ${APP_NAME}`,
        html,
    });
};

/**
 * Interface para dados de pagamento recusado
 */
export interface PaymentRejectedData {
    customerName: string;
    orderNumber: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    totalAmount: string;
    paymentMethod: string;
    rejectionReason?: string;
    retryLink?: string;
}

/**
 * Envia email de pagamento recusado
 */
export const sendPaymentRejectedEmail = async (
    to: string,
    data: PaymentRejectedData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('payment-rejected', {
        ...data,
        subject: `Pagamento recusado - Pedido #${data.orderNumber}`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `❌ Pagamento recusado - Pedido #${data.orderNumber}`,
        html,
    });
};

/**
 * Interface para dados de cortesia
 */
export interface CourtesyTicketData {
    customerName: string;
    orderNumber: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    eventAddress?: string;
    totalTickets: number;
    ticketType: string;
    downloadLink?: string;
    qrCodes?: Array<{
        code: string;
        qrCode: string; // Base64 data URL
        holderName?: string;
    }>;
}

/**
 * Envia email de cortesia com PDF dos ingressos
 */
export const sendCourtesyTicketEmail = async (
    to: string,
    data: CourtesyTicketData,
    attachments?: EmailAttachment[]
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const html = renderTemplate('courtesy-ticket', {
        ...data,
        subject: `🎁 Cortesia - ${data.eventName}`,
        supportEmail: SUPPORT_EMAIL,
    });

    return sendEmail({
        to,
        subject: `🎁 Você recebeu uma cortesia para ${data.eventName}!`,
        html,
        attachments,
    });
};
