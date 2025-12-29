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

        const responseData = await response.json().catch(() => ({}));

        // Se não foi OK, retornar objeto de erro estruturado em vez de lançar exceção
        if (!response.ok) {
            return {
                success: false,
                error: true,
                message: responseData.message || 'Erro ao criar pagamento PIX',
                statusCode: response.status,
                data: responseData.data || null,
                errors: responseData.errors || null,
            };
        }

        return responseData;
    } catch (error: any) {
        console.error('[Server Action] Erro ao criar PIX:', error);
        // Retornar objeto de erro em vez de lançar exceção
        return {
            success: false,
            error: true,
            message: error.message || 'Erro ao criar pagamento PIX',
            statusCode: 500,
            data: null,
            errors: null,
        };
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

        const responseData = await response.json().catch(() => ({}));

        // Se não foi OK, retornar objeto de erro estruturado em vez de lançar exceção
        if (!response.ok) {
            return {
                success: false,
                error: true,
                message: responseData.message || 'Erro ao processar pagamento com cartão',
                statusCode: response.status,
                data: responseData.data || null,
                errors: responseData.errors || null,
            };
        }

        return responseData;
    } catch (error: any) {
        console.error('[Server Action] Erro ao processar cartão:', error);
        // Retornar objeto de erro em vez de lançar exceção
        return {
            success: false,
            error: true,
            message: error.message || 'Erro ao processar pagamento com cartão',
            statusCode: 500,
            data: null,
            errors: null,
        };
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

        // Adicionar timeout e melhor tratamento de erro
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        try {
            const response = await fetch(`${API_URL}/parcelled-orders`, {
                method: 'GET',
                headers: requestHeaders,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Erro ao listar pedidos parcelados' }));
                throw new Error(error.message || 'Erro ao listar pedidos parcelados');
            }

            return await response.json();
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            
            // Se foi abortado por timeout
            if (fetchError.name === 'AbortError') {
                throw new Error('Timeout ao listar pedidos parcelados. Tente novamente.');
            }
            
            // Se foi erro de conexão
            if (fetchError.code === 'ECONNRESET' || fetchError.message?.includes('ECONNRESET')) {
                throw new Error('Erro de conexão com o servidor. Verifique se o backend está rodando.');
            }
            
            throw fetchError;
        }
    } catch (error: any) {
        console.error('[Server Action] Erro ao listar pedidos parcelados:', error);
        
        // Retornar resposta vazia em caso de erro de conexão para não quebrar a UI
        if (error.message?.includes('conexão') || error.message?.includes('ECONNRESET') || error.message?.includes('fetch failed')) {
            console.warn('[Server Action] Retornando lista vazia devido a erro de conexão');
            return {
                success: true,
                data: {
                    orders: [],
                    parcelsByOrder: {},
                },
            };
        }
        
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

        const responseData = await response.json().catch(() => ({}));

        // Se não foi OK, retornar objeto de erro estruturado em vez de lançar exceção
        if (!response.ok) {
            return {
                success: false,
                error: true,
                message: responseData.message || 'Erro ao gerar pagamento da parcela',
                statusCode: response.status,
                data: responseData.data || null,
                errors: responseData.errors || null,
            };
        }

        return responseData;
    } catch (error: any) {
        console.error('[Server Action] Erro ao gerar pagamento da parcela:', error);
        // Retornar objeto de erro em vez de lançar exceção
        return {
            success: false,
            error: true,
            message: error.message || 'Erro ao gerar pagamento da parcela',
            statusCode: 500,
            data: null,
            errors: null,
        };
    }
}

