// Exportar todos os modelos
export { default as User } from './User';
export { default as Event } from './Event';
export { default as Ticket } from './Ticket';
export { default as TicketType } from './TicketType';
export { default as Order } from './Order';
export { default as Session } from './Session';
export { default as PromoterCode } from './PromoterCode';
export { default as WebhookEvent } from './WebhookEvent';
export { default as QrNonce } from './QrNonce';
export { default as ValidationAttempt } from './ValidationAttempt';
export { default as NewsletterSubscription } from './NewsletterSubscription';
export { default as SuspiciousOrderAlert } from './SuspiciousOrderAlert';
export { default as AuditLog } from './AuditLog';
export { default as PasswordResetToken } from './PasswordResetToken';

// Re-exportar tipos para facilitar importação
export type { IUser } from './User';
export type { IEvent } from './Event';
export type { ITicket } from './Ticket';
export type { ITicketType } from './TicketType';
export type { IOrder } from './Order';
export type { ISession } from './Session';
export type { IPromoterCode } from './PromoterCode';
export type { IWebhookEvent } from './WebhookEvent';
export type { IQrNonce } from './QrNonce';
export type { IValidationAttempt } from './ValidationAttempt';
export type { INewsletterSubscription } from './NewsletterSubscription';
export type { ISuspiciousOrderAlert } from './SuspiciousOrderAlert';
export type { IAuditLog } from './AuditLog';
export type { IPasswordResetToken } from './PasswordResetToken';
