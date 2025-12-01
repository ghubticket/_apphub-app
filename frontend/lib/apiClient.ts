import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Cliente API com proxy automático
 * Todas as requisições passam pelo proxy Next.js, nunca expondo a URL da API
 */

// Determinar se deve usar proxy (sempre true em produção, opcional em dev)
const USE_PROXY = process.env.NEXT_PUBLIC_USE_API_PROXY !== 'false';

// URL base do proxy Next.js (client-side)
const PROXY_BASE_URL = '/api/proxy';

// URL da API backend (apenas para fallback ou server-side)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

/**
 * Converte uma URL da API para usar o proxy
 */
function getProxiedUrl(url: string): string {
    // Se já começar com /api/proxy, retornar como está
    if (url.startsWith('/api/proxy')) {
        return url;
    }

    // Se começar com a URL completa da API, extrair o path
    if (url.startsWith(API_BASE_URL)) {
        const path = url.replace(API_BASE_URL, '').replace(/^\//, '');
        return `${PROXY_BASE_URL}/${path}`;
    }

    // Se começar com /api/, remover /api/ e usar proxy
    if (url.startsWith('/api/')) {
        const path = url.replace('/api/', '');
        return `${PROXY_BASE_URL}/${path}`;
    }

    // Se for um path relativo, assumir que é da API
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${PROXY_BASE_URL}/${cleanPath}`;
}

/**
 * Criar instância do axios com proxy automático
 */
function createApiClient(): AxiosInstance {
    const baseURL = USE_PROXY ? PROXY_BASE_URL : API_BASE_URL;

    const api = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Interceptor para ajustar URLs quando usar proxy
    api.interceptors.request.use(
        (config) => {
            // Se estiver usando proxy e a URL não começar com /api/proxy, converter
            if (USE_PROXY && config.url && !config.url.startsWith('/api/proxy')) {
                // Se baseURL já é /api/proxy, apenas usar a URL como está
                // Caso contrário, converter
                if (!config.baseURL?.includes('/api/proxy')) {
                    config.url = getProxiedUrl(config.url || '');
                }
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

