import axios, { AxiosHeaders } from 'axios';
import { shouldTriggerGlobalError, getErrorType, triggerGlobalError } from './globalErrorHandler';

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

// Contador para evitar mostrar múltiplas modais ao mesmo tempo
let globalErrorShown = false;
let globalErrorTimeout: NodeJS.Timeout | null = null;


const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos de timeout
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
  (response) => {
    // Resetar flag quando há resposta bem-sucedida
    if (globalErrorShown) {
      globalErrorShown = false;
      if (globalErrorTimeout) {
        clearTimeout(globalErrorTimeout);
        globalErrorTimeout = null;
      }
    }
    return response;
  },
  (error) => {
    // Tratar erro 401 (não autenticado)
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
      return Promise.reject(error);
    }

    // Verificar se deve disparar erro global (erros críticos: 500+, rede, etc.)
    if (shouldTriggerGlobalError(error) && typeof window !== 'undefined') {
      // Evitar mostrar múltiplas modais ao mesmo tempo
      if (!globalErrorShown) {
        globalErrorShown = true;
        const errorType = getErrorType(error);
        
        // Determinar mensagem baseada no tipo de erro
        let message: string | undefined;
        if (errorType === 'network') {
          message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
        } else if (errorType === 'server') {
          const status = error.response?.status;
          message = status === 500
            ? 'Ocorreu um erro interno no servidor. Nossa equipe já foi notificada e está trabalhando para resolver. Por favor, tente novamente em alguns minutos.'
            : 'Estamos enfrentando uma instabilidade técnica. Nossa equipe já foi notificada. Por favor, tente novamente em alguns minutos.';
        } else if (errorType === 'maintenance') {
          message = 'Estamos realizando uma manutenção programada. O serviço voltará em breve. Agradecemos sua compreensão.';
        }

        triggerGlobalError({
          errorType,
          message,
        });

        // Permitir nova modal após 30 segundos (evitar spam)
        globalErrorTimeout = setTimeout(() => {
          globalErrorShown = false;
          globalErrorTimeout = null;
        }, 30000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

