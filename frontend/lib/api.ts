import axios, { AxiosHeaders } from 'axios';

/**
 * API Client com Proxy Automático
 * Todas as requisições passam pelo proxy Next.js (/api/proxy)
 * Nunca expõe a URL da API backend no cliente
 */

// Determinar se deve usar proxy (sempre true em produção, opcional em dev)
const USE_PROXY = process.env.NEXT_PUBLIC_USE_API_PROXY !== 'false';

// URL base do proxy Next.js (client-side)
const PROXY_BASE_URL = '/api/proxy';

// URL da API backend (apenas para referência, nunca usada diretamente no cliente)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

// URL base que será usada (proxy ou API direta)
const apiBaseURL = USE_PROXY ? PROXY_BASE_URL : API_BASE_URL;


const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    null
  );
};

// Interceptor para adicionar token (se necessário)
api.interceptors.request.use(
  (config) => {
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
      const shouldBypassRedirect = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((endpoint) =>
        requestUrl.includes(endpoint)
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

export default api;

