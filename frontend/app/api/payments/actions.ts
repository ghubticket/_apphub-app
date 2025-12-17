'use server';

/**
 * Server Actions para pagamentos
 * Executa no servidor - nunca expõe a URL da API no cliente
 * 
 * VANTAGENS:
 * - 100% seguro: URL da API nunca aparece no cliente
 * - Simples: não precisa de proxy
 * - Nativo do Next.js 13+
 */

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

/**
 * Obter token de autenticação do cookie/header
 */
function getAuthToken(): string | null {
    // Server Actions podem acessar cookies via headers
    // Mas precisamos passar o token como parâmetro
    return null; // Será passado como parâmetro
}

/**
 * Cria um pagamento PIX
 * @param orderId - ID do pedido
 * @param data - Dados do pagamento (body)
 * @param headers - Headers customizados (ex: X-meli-session-id, Authorization)
 */
export async function createPixPayment(
    orderId: string, 
    data: any,
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(`${API_URL}/payments/${orderId}/pix`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao criar pagamento PIX' }));
            throw new Error(error.message || 'Erro ao criar pagamento PIX');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao criar PIX:', error);
        throw error;
    }
}

/**
 * Cria um pagamento com cartão
 * @param orderId - ID do pedido
 * @param data - Dados do pagamento (body)
 * @param headers - Headers customizados (ex: X-meli-session-id, Authorization)
 */
export async function createCardPayment(
    orderId: string, 
    data: any,
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(`${API_URL}/payments/${orderId}/card`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao processar pagamento com cartão' }));
            throw new Error(error.message || 'Erro ao processar pagamento com cartão');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao processar cartão:', error);
        throw error;
    }
}

/**
 * Busca status de um pagamento
 * @param paymentId - ID do pagamento
 * @param headers - Headers customizados (ex: Authorization)
 */
export async function getPaymentStatus(
    paymentId: string,
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(`${API_URL}/payments/${paymentId}/status`, {
            method: 'GET',
            headers: requestHeaders,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao buscar status do pagamento' }));
            throw new Error(error.message || 'Erro ao buscar status do pagamento');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao buscar status:', error);
        throw error;
    }
}

/**
 * Cria um pedido parcelado
 * @param data - Dados do pedido parcelado
 * @param headers - Headers customizados (ex: Authorization)
 */
export async function createParcelledOrder(
    data: any,
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(`${API_URL}/parcelled-orders`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao criar pedido parcelado' }));
            throw new Error(error.message || 'Erro ao criar pedido parcelado');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao criar pedido parcelado:', error);
        throw error;
    }
}

/**
 * Busca detalhes de um pedido parcelado
 * @param parcelledOrderId - ID do pedido parcelado
 * @param headers - Headers customizados (ex: Authorization)
 */
export async function getParcelledOrder(
    parcelledOrderId: string,
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(`${API_URL}/parcelled-orders/${parcelledOrderId}`, {
            method: 'GET',
            headers: requestHeaders,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao buscar pedido parcelado' }));
            throw new Error(error.message || 'Erro ao buscar pedido parcelado');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao buscar pedido parcelado:', error);
        throw error;
    }
}

/**
 * Lista pedidos parcelados do usuário
 * @param headers - Headers customizados (ex: Authorization)
 */
export async function listParcelledOrders(
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(`${API_URL}/parcelled-orders`, {
            method: 'GET',
            headers: requestHeaders,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao listar pedidos parcelados' }));
            throw new Error(error.message || 'Erro ao listar pedidos parcelados');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao listar pedidos parcelados:', error);
        throw error;
    }
}

/**
 * Gera pagamento para uma parcela
 * @param parcelledOrderId - ID do pedido parcelado
 * @param parcelId - ID da parcela
 * @param headers - Headers customizados (ex: Authorization)
 */
export async function generateParcelPayment(
    parcelledOrderId: string,
    parcelId: string,
    headers?: Record<string, string>
) {
    try {
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(
            `${API_URL}/parcelled-orders/${parcelledOrderId}/parcels/${parcelId}/generate-payment`,
            {
                method: 'POST',
                headers: requestHeaders,
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erro ao gerar pagamento da parcela' }));
            throw new Error(error.message || 'Erro ao gerar pagamento da parcela');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[Server Action] Erro ao gerar pagamento da parcela:', error);
        throw error;
    }
}

