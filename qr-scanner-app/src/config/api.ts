import axios from 'axios';
import { logger } from '../utils/logger';
import { validateToken, isTokenExpired } from '../utils/token';

// Base URL da API - deve terminar com /api
// Exemplo: https://localhost:3443/api
let API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3443/api';

// Se estiver acessando de um dispositivo móvel na rede local ou via ngrok, detectar automaticamente
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  
  // Se for ngrok ou outro túnel HTTPS, usar VITE_API_URL configurado
  if (hostname.includes('ngrok') || hostname.includes('trycloudflare') || hostname.includes('ngrok-free')) {
    // Se estiver via túnel HTTPS, usar o túnel do backend também
    if (!import.meta.env.VITE_API_URL) {
      logger.error('❌ ERRO: VITE_API_URL não configurado!');
      logger.error('🌐 Você está acessando via túnel HTTPS.');
      logger.error('💡 SOLUÇÃO: Crie o arquivo .env na pasta qr-scanner-app com:');
      logger.error('   VITE_API_URL=https://SEU_TUNEL_BACKEND.trycloudflare.com/api');
      logger.error('   OU se usar IP local:');
      logger.error('   VITE_API_URL=http://192.168.18.157:3001/api');
      logger.error('   Depois, REINICIE o servidor (Ctrl+C e npm run dev novamente)');
      // Não tentar usar IP padrão - forçar erro claro
      API_URL = 'http://ERRO-CONFIGURE-ENV:3001/api';
    } else {
      logger.log('✅ Usando VITE_API_URL do .env:', import.meta.env.VITE_API_URL);
    }
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Se estiver em localhost, usar HTTPS na porta 3443
    if (!import.meta.env.VITE_API_URL) {
      API_URL = 'https://localhost:3443/api';
      logger.log('🔗 Usando API local HTTPS:', API_URL);
    }
  } else if (!import.meta.env.VITE_API_URL) {
    // Acesso direto via IP na rede local
    API_URL = `http://${hostname}:3001/api`;
    logger.log('🌐 Detectado acesso via rede local. Usando:', API_URL);
  }
}

// Validar que a URL termina com /api
if (!API_URL.endsWith('/api')) {
  logger.warn('⚠️ VITE_API_URL deve terminar com /api. Exemplo: http://192.168.18.157:3001/api');
}

logger.log('🔗 API URL configurada:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    // Validar token antes de usar
    if (token) {
      if (!validateToken(token)) {
        logger.warn('Token inválido detectado, removendo...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        // Não adicionar token inválido
        return config;
      }
      
      // Verificar se está expirado
      if (isTokenExpired(token)) {
        logger.warn('Token expirado detectado na requisição');
        // Não adicionar token expirado, deixar o interceptor de resposta tratar
        return config;
      }
      
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação e refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se for 401 e não foi tentativa de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      // Tentar refresh se tiver refresh token
      if (refreshToken) {
        try {
          logger.log('Tentando refresh do token...');
          
          // Fazer refresh (sem usar o interceptor para evitar loop)
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.data.success && response.data.data) {
            const { accessToken } = response.data.data;
            
            // Validar novo token antes de armazenar
            if (accessToken && validateToken(accessToken)) {
              localStorage.setItem('auth_token', accessToken);
              // Refresh token não é renovado, mantém o mesmo
              
              // Atualizar header e refazer requisição original
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              logger.log('Token renovado com sucesso');
              return api(originalRequest);
            } else {
              logger.error('Novo token inválido após refresh');
            }
          }
        } catch (refreshError: any) {
          logger.error('Erro ao fazer refresh do token:', refreshError);
          // Refresh falhou, fazer logout
        }
      }

      // Se não tem refresh token ou refresh falhou, fazer logout
      logger.warn('Fazendo logout devido a token inválido/expirado');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      // Redirecionar para login apenas se não estiver já na página de login
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

