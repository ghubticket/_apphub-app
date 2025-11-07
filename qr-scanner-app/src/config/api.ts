import axios from 'axios';

// Base URL da API - deve terminar com /api
// Exemplo: http://192.168.18.157:3001/api
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Se estiver acessando de um dispositivo móvel na rede local ou via ngrok, detectar automaticamente
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  
  // Se for ngrok ou outro túnel HTTPS, usar VITE_API_URL configurado
  if (hostname.includes('ngrok') || hostname.includes('trycloudflare') || hostname.includes('ngrok-free')) {
    // Se estiver via túnel HTTPS, usar o túnel do backend também
    if (!import.meta.env.VITE_API_URL) {
      console.error('❌ ERRO: VITE_API_URL não configurado!');
      console.error('🌐 Você está acessando via túnel HTTPS.');
      console.error('💡 SOLUÇÃO: Crie o arquivo .env na pasta qr-scanner-app com:');
      console.error('   VITE_API_URL=https://SEU_TUNEL_BACKEND.trycloudflare.com/api');
      console.error('   OU se usar IP local:');
      console.error('   VITE_API_URL=http://192.168.18.157:3001/api');
      console.error('   Depois, REINICIE o servidor (Ctrl+C e npm run dev novamente)');
      // Não tentar usar IP padrão - forçar erro claro
      API_URL = 'http://ERRO-CONFIGURE-ENV:3001/api';
    } else {
      // Se VITE_API_URL está configurado, usar ele (pode ser HTTPS ou HTTP)
      console.log('✅ Usando VITE_API_URL do .env:', import.meta.env.VITE_API_URL);
    }
  } else if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !import.meta.env.VITE_API_URL) {
    // Acesso direto via IP na rede local
    API_URL = `http://${hostname}:3001/api`;
    console.log('🌐 Detectado acesso via rede local. Usando:', API_URL);
  }
}

// Validar que a URL termina com /api
if (!API_URL.endsWith('/api')) {
  console.warn('⚠️ VITE_API_URL deve terminar com /api. Exemplo: http://192.168.18.157:3001/api');
}

console.log('🔗 API URL configurada:', API_URL);

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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

