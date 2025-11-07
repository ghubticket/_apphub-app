import api from '../config/api';
import { ValidationResult, Ticket, ValidationHistory } from '../types';

/**
 * Escaneia um QR code seguro e retorna os dados do ingresso
 */
export const scanQRCode = async (qrCode: string): Promise<{
    success: boolean;
    data?: Ticket;
    message?: string;
    reason?: string;
    firstPassedHolder?: string;
    usedAt?: string;
    alreadyUsed?: boolean;
}> => {
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
 * Busca histórico de validações do backend com busca, paginação e filtro
 */
export const getValidationHistory = async (
  page: number = 1,
  limit: number = 20,
  search: string = '',
  filter: string = 'validated'
): Promise<{ data: ValidationHistory[]; totalValidations: number; validValidations: number; duplicateAttempts: number; pagination: any }> => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (search) {
            params.append('search', search);
        }

        if (filter && filter !== 'all') {
            params.append('filter', filter);
        }

    const response = await api.get<{ 
      success: boolean; 
      data?: ValidationHistory[]; 
      totalValidations?: number;
      validValidations?: number;
      duplicateAttempts?: number;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      }
    }>(`/tickets/validation-history?${params.toString()}`);

        if (response.data.success && response.data.data) {
            // Converter timestamps para Date
            const data = response.data.data.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }));

      return {
        data,
        totalValidations: response.data.totalValidations || 0,
        validValidations: response.data.validValidations || 0,
        duplicateAttempts: response.data.duplicateAttempts || 0,
        pagination: response.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
        }

        return {
            data: [],
            totalValidations: 0,
            validValidations: 0,
            duplicateAttempts: 0,
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    } catch (error: any) {
        console.error('Erro ao buscar histórico de validações:', error);
        return {
            data: [],
            totalValidations: 0,
            validValidations: 0,
            duplicateAttempts: 0,
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }
};

