import api from '../config/api';
import { ValidationResult, Ticket } from '../types';

/**
 * Escaneia um QR code seguro e retorna os dados do ingresso
 */
export const scanQRCode = async (qrCode: string): Promise<{ success: boolean; data?: Ticket; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; data?: { ticket: Ticket; ts: number }; message?: string }>(
      '/tickets/scan',
      { qr: qrCode }
    );
    
    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data.ticket,
      };
    }
    
    return {
      success: false,
      message: response.data.message || 'Erro ao escanear QR code',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Erro ao escanear QR code',
    };
  }
};

/**
 * Valida um ingresso (marca como usado)
 */
export const validateTicket = async (
  code: string,
  holderId?: string
): Promise<ValidationResult> => {
  try {
    const response = await api.post<ValidationResult>(
      `/tickets/code/${code}/validate`,
      holderId ? { holderId } : {}
    );
    
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Erro ao validar ingresso',
      errors: error.response?.data?.errors || [],
      alreadyUsed: error.response?.data?.data?.alreadyUsed || false,
      usedAt: error.response?.data?.data?.usedAt,
      usedBy: error.response?.data?.data?.usedBy,
      firstPassedHolder: error.response?.data?.data?.firstPassedHolder,
      firstPassedHolderId: error.response?.data?.data?.firstPassedHolderId,
      isHolderTryingToReuse: error.response?.data?.data?.isHolderTryingToReuse,
      isDifferentPerson: error.response?.data?.data?.isDifferentPerson,
    };
  }
};

/**
 * Busca um ingresso por código
 */
export const getTicketByCode = async (code: string): Promise<Ticket | null> => {
  try {
    const response = await api.get<{ success: boolean; data?: Ticket }>(
      `/tickets/code/${code}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    return null;
  } catch (error: any) {
    console.error('Erro ao buscar ingresso:', error);
    return null;
  }
};

