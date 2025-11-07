export interface Ticket {
  _id: string;
  code: string;
  status: 'confirmed' | 'used' | 'cancelled';
  holder: {
    _id: string;
    name: string;
    email: string;
  };
  event: {
    _id: string;
    name: string;
    date: string;
    location: string;
  };
  ticketType: {
    _id: string;
    name: string;
    price: number;
    isVIP: boolean;
  };
  order: {
    _id: string;
    orderNumber: string;
    status: string;
  };
  usedAt?: string;
  usedBy?: {
    _id: string;
    name: string;
  };
  usedByHolderId?: {
    _id: string;
    name: string;
  };
  validatedAt?: string;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  errors?: string[];
  data?: Ticket;
  alreadyUsed?: boolean;
  usedAt?: string;
  usedBy?: string;
  firstPassedHolder?: string;
  firstPassedHolderId?: string;
  isHolderTryingToReuse?: boolean;
  isDifferentPerson?: boolean;
  reason?: string; // Motivo da falha: 'already_used', 'replay_detected', etc.
}

export interface ValidationHistory {
  id: string;
  ticketCode: string;
  ticketHolder: string;
  eventName: string;
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENTE' | 'QRCODE';
}

