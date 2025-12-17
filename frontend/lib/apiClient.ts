import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Cliente API
 * Requisições vão direto para o backend
 */

// URL da API backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

/**
 * Criar instância do axios
 */
function createApiClient(): AxiosInstance {
    const baseURL = API_BASE_URL;

    const api = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 segundos de timeout padrão
    });

    // Interceptor para adicionar token e ajustar timeout
    api.interceptors.request.use(
        (config) => {
            // CRÍTICO: Aumentar timeout para requisições que envolvem fake orders
            // Essas requisições precisam criar o pedido primeiro, então podem demorar mais
            const url = config.url || '';
            if (url.includes('fake-') || url.includes('/payments/') || url.includes('/parcelled-orders')) {
                config.timeout = 90000; // 90 segundos para operações que criam pedidos
            }

            // Adicionar token se existir
            const token = getStoredToken();
            if (token) {
                if (config.headers instanceof AxiosHeaders) {
                    config.headers.set('Authorization', `Bearer ${token}`);
                } else {
                    const headers = AxiosHeaders.from(config.headers ?? {});
                    headers.set('Authorization', `Bearer ${token}`);
                    config.headers = headers;
                }
            }

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Interceptor para tratar erros
    api.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                const requestUrl: string = error.config?.url || '';
                const shouldBypassRedirect = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some(
                    (endpoint) => requestUrl.includes(endpoint)
                );

                if (shouldBypassRedirect) {
                    return Promise.reject(error);
                }

                // Redirecionar para login se não autenticado
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('user');
                    sessionStorage.removeItem('accessToken');
                    sessionStorage.removeItem('refreshToken');
                    sessionStorage.removeItem('sessionId');
                    sessionStorage.removeItem('user');
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error);
        }
    );

    return api;
}

function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        null
    );
}

// Exportar instância do cliente
const apiClient = createApiClient();

export default apiClient;

