// Exportar todos os modelos
export { default as User } from './User';
export { default as Event } from './Event';
export { default as Ticket } from './Ticket';
export { default as TicketType } from './TicketType';
export { default as TicketReservation } from './TicketReservation';
export { default as Order } from './Order';
export { default as Session } from './Session';

// Re-exportar tipos para facilitar importação
export type { IUser } from './User';
export type { IEvent } from './Event';
export type { ITicket } from './Ticket';
export type { ITicketType } from './TicketType';
export type { ITicketReservation } from './TicketReservation';
export type { IOrder } from './Order';
export type { ISession } from './Session';