import api from '../config/api';
import { ValidationResult, Ticket, ValidationHistory } from '../types';

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
    // Se for replay detectado (409), retornar informações detalhadas
    if (error.response?.status === 409 && error.response?.data) {
      return {
        success: false,
        message: error.response.data.message || 'QR já utilizado (replay detectado)',
        reason: error.response.data.reason || 'replay_detected',
        firstPassedHolder: error.response.data.firstPassedHolder,
        usedAt: error.response.data.usedAt,
        alreadyUsed: error.response.data.alreadyUsed,
      };
    }
    
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
    // Quando há erro, o backend pode retornar dados do ticket no data
    const errorData = error.response?.data?.data;
    
    return {
      success: false,
      message: error.response?.data?.message || 'Erro ao validar ingresso',
      errors: error.response?.data?.errors || [],
      alreadyUsed: errorData?.alreadyUsed || false,
      usedAt: errorData?.usedAt,
      usedBy: errorData?.usedBy,
      firstPassedHolder: errorData?.firstPassedHolder,
      firstPassedHolderId: errorData?.firstPassedHolderId,
      isHolderTryingToReuse: errorData?.isHolderTryingToReuse,
      isDifferentPerson: errorData?.isDifferentPerson,
      // Tentar pegar dados do ticket se disponível no erro
      data: errorData?.ticket || (errorData?.holder ? {
        holder: typeof errorData.holder === 'string' 
          ? { name: errorData.holder } 
          : errorData.holder,
        event: errorData.event || undefined,
      } : undefined) as any,
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

/**
 * Busca histórico de validações do backend
 */
export const getValidationHistory = async (limit: number = 100): Promise<ValidationHistory[]> => {
  try {
    const response = await api.get<{ success: boolean; data?: ValidationHistory[]; count?: number }>(
      `/tickets/validation-history?limit=${limit}`
    );
    
    if (response.data.success && response.data.data) {
      // Converter timestamps para Date
      return response.data.data.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    }
    
    return [];
  } catch (error: any) {
    console.error('Erro ao buscar histórico de validações:', error);
    return [];
  }
};

