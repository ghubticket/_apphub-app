# Plano de Segurança - QR Scanner App (PWA)

> **Data:** Janeiro 2025  
> **Status:** Análise completa do código atual

---

## O QUE JÁ ESTÁ IMPLEMENTADO

### 1. Autenticação e Autorização
- ✅ Autenticação via JWT
- ✅ Token armazenado em `localStorage` como `auth_token`
- ✅ Interceptor Axios adiciona token automaticamente nas requisições
- ✅ Tratamento de 401 (logout automático quando token expira)
- ✅ Validação de autenticação no mount (`App.tsx`)

### 2. Validação de Dispositivo
- ✅ Bloqueio de acesso via desktop (apenas mobile/tablet)
- ✅ Validação de User-Agent (`deviceDetection.ts`)
- ✅ Mensagem clara quando acesso é negado

### 3. Validação de Contexto Seguro
- ✅ Verificação de HTTPS (`isSecureContext()`)
- ✅ Suporte para túneis HTTPS (ngrok, Cloudflare Tunnel)
- ✅ Aviso quando acessando via HTTP (dev)

### 4. Proteção de QR Codes
- ✅ Debounce de 1 segundo para prevenir múltiplas validações do mesmo QR
- ✅ Prevenção de processamento simultâneo (`isProcessingRef`)
- ✅ Validação no backend (não confia apenas no frontend)

### 5. PWA e Offline
- ✅ PWA configurado (VitePWA)
- ✅ Service Worker com cache de API
- ✅ Histórico sincronizado com backend

### 6. Comunicação com Backend
- ✅ Detecção automática de URL da API
- ✅ Suporte para IP local e túneis HTTPS
- ✅ Headers de segurança (Content-Type: application/json)

---

## O QUE PRECISA SER IMPLEMENTADO

### CRÍTICO - Implementar Antes de Produção

#### 1. Validação de Expiração do Token no Frontend

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Token pode estar expirado mas ainda armazenado no localStorage, causando requisições desnecessárias.

**Solução:**
```typescript
// Criar utils/token.ts
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Converter para ms
    return Date.now() >= exp;
  } catch {
    return true; // Se não conseguir decodificar, considerar expirado
  }
};

// No App.tsx, verificar antes de considerar autenticado
const [isAuthenticated, setIsAuthenticated] = useState(() => {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;
  return !isTokenExpired(token);
});
```

**Impacto:** 🔴 **CRÍTICO** - Previne requisições com token expirado

---

#### 2. Refresh Tokens

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Token JWT expira e usuário precisa fazer login novamente durante evento.

**Solução:**
- Backend já tem refresh tokens implementado
- Frontend precisa:
  1. Armazenar `refreshToken` além do `accessToken`
  2. Interceptor detecta 401 e tenta refresh
  3. Se refresh falhar, faz logout

**Implementação:**
```typescript
// No api.ts, interceptor de resposta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('refresh_token', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh falhou, fazer logout
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);
```

**Impacto:** 🔴 **CRÍTICO** - Melhora experiência do usuário durante eventos longos

---

#### 3. Remover Console.logs em Produção

**Status:** ⚠️ **PARCIAL** - Logs ainda presentes no código

**Problema:** Console.logs podem expor informações sensíveis e poluir logs em produção.

**Solução:**
- Criar utilitário de logging que só loga em DEV
- Substituir todos os `console.log/error/warn` por função condicional

**Implementação:**
```typescript
// utils/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
};
```

**Arquivos a atualizar:**
- `config/api.ts` (múltiplos console.log/error)
- `components/Login.tsx` (console.log/error)
- `components/QRScanner.tsx` (console.error)
- `components/ManualSearch.tsx` (console.error)
- `services/validationService.ts` (console.error)
- `store/validationStore.ts` (console.error)

**Impacto:** 🟡 **ALTA** - Previne vazamento de informações em produção

---

### ALTA PRIORIDADE - Implementar em Breve

#### 4. Timeout de Sessão Automático

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Se dispositivo for roubado/perdido, token continua válido até expirar.

**Solução:**
- Implementar timeout de inatividade (ex: 30 minutos)
- Mostrar aviso antes de fazer logout automático
- Resetar timer a cada interação (scan, busca, etc)

**Implementação:**
```typescript
// hooks/useSessionTimeout.ts
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
const WARNING_TIME_MS = 5 * 60 * 1000; // Aviso 5 min antes

export const useSessionTimeout = (onTimeout: () => void) => {
  const [timeRemaining, setTimeRemaining] = useState(SESSION_TIMEOUT_MS);
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const resetTimer = () => {
      setTimeRemaining(SESSION_TIMEOUT_MS);
      setShowWarning(false);
    };
    
    // Resetar timer em qualquer interação
    const events = ['mousedown', 'keydown', 'touchstart', 'scan'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });
    
    interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        
        if (newTime <= WARNING_TIME_MS && !showWarning) {
          setShowWarning(true);
        }
        
        if (newTime <= 0) {
          onTimeout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => {
      clearInterval(interval);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [onTimeout, showWarning]);
  
  return { timeRemaining, showWarning };
};
```

**Impacto:** 🟡 **ALTA** - Reduz risco se dispositivo for comprometido

---

#### 5. Validação de Integridade do Token

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Token pode ser modificado manualmente no localStorage.

**Solução:**
- Validar estrutura do token antes de usar
- Verificar assinatura (se possível no frontend)
- Validar payload (role, exp, etc)

**Implementação:**
```typescript
// utils/token.ts
export const validateToken = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Validar estrutura
    if (!payload.exp || !payload.iat || !payload.userId) return false;
    
    // Validar role (deve ser QRCODE)
    if (payload.role !== 'QRCODE') return false;
    
    // Validar expiração
    if (Date.now() >= payload.exp * 1000) return false;
    
    return true;
  } catch {
    return false;
  }
};

// Usar antes de considerar autenticado
const token = localStorage.getItem('auth_token');
if (!token || !validateToken(token)) {
  localStorage.removeItem('auth_token');
  setIsAuthenticated(false);
}
```

**Impacto:** 🟡 **ALTA** - Previne uso de tokens inválidos ou modificados

---

#### 6. Sanitização de Inputs

**Status:** ⚠️ **PARCIAL** - ManualSearch aceita qualquer input

**Problema:** Campo de busca manual pode receber inputs maliciosos.

**Solução:**
- Sanitizar input antes de enviar
- Validar formato (apenas alfanuméricos, max 12 chars)
- Prevenir XSS

**Implementação:**
```typescript
// utils/sanitize.ts
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Apenas letras e números
    .substring(0, 12); // Max 12 caracteres
};

// No ManualSearch.tsx
const code = sanitizeInput(searchTerm);
```

**Impacto:** 🟡 **ALTA** - Previne injeção de código malicioso

---

### MÉDIA PRIORIDADE - Melhorias Futuras

#### 7. Criptografia do Token no localStorage

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Token em texto plano no localStorage é vulnerável a XSS.

**Solução:**
- Criptografar token antes de armazenar
- Descriptografar ao recuperar
- Usar biblioteca como `crypto-js` ou Web Crypto API

**Impacto:** 🟢 **MÉDIA** - Reduz risco de XSS (mas não elimina)

**Nota:** A melhor proteção é usar httpOnly cookies, mas isso requer mudanças no backend.

---

#### 8. Proteção contra Screenshots/Gravação

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** QR codes podem ser capturados via screenshot durante validação.

**Solução:**
- Bloquear screenshots (não suportado em todos os browsers)
- Adicionar aviso visual sobre não compartilhar QR codes
- Limitar tempo de exibição do resultado

**Impacto:** 🟢 **MÉDIA** - Reduz risco de compartilhamento de QR codes

---

#### 9. Rate Limiting no Frontend

**Status:** ⚠️ **PARCIAL** - Debounce existe, mas pode melhorar

**Problema:** Usuário pode tentar validar muitos QRs rapidamente.

**Solução:**
- Limitar número de validações por minuto
- Mostrar aviso quando limite é atingido
- Backend já tem rate limiting, mas frontend pode ajudar

**Impacto:** 🟢 **MÉDIA** - Reduz carga no backend

---

#### 10. Content Security Policy (CSP)

**Status:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Sem CSP, app é vulnerável a XSS.

**Solução:**
- Adicionar meta tag CSP no `index.html`
- Configurar diretivas restritivas
- Testar em dev antes de produção

**Implementação:**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https: http://localhost:* http://192.168.*:*;">
```

**Impacto:** 🟢 **MÉDIA** - Proteção adicional contra XSS

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Crítico (Antes de Produção)
- [x] Validação de expiração do token no frontend ✅
- [x] Implementar refresh tokens ✅
- [x] Remover console.logs em produção ✅

### Alta Prioridade (Primeira Semana)
- [x] Timeout de sessão automático ✅
- [x] Validação de integridade do token ✅
- [x] Sanitização de inputs ✅

### Média Prioridade (Melhorias Contínuas)
- [ ] Criptografia do token no localStorage
- [ ] Proteção contra screenshots
- [ ] Rate limiting no frontend
- [ ] Content Security Policy

---

## RESUMO

**Implementado:** ~95% ✅  
**Crítico:** ✅ **TODOS IMPLEMENTADOS**  
**Alta prioridade:** ✅ **TODOS IMPLEMENTADOS**  
**Média prioridade faltando:** 4 itens 🟢

**Status:** ✅ **PRONTO PARA TESTES EM DEV**

**Arquivos criados/modificados:**
- ✅ `src/utils/token.ts` - Validação e decodificação de tokens
- ✅ `src/utils/logger.ts` - Logger que só funciona em DEV
- ✅ `src/utils/sanitize.ts` - Sanitização de inputs
- ✅ `src/hooks/useSessionTimeout.ts` - Timeout de sessão
- ✅ `src/config/api.ts` - Refresh tokens e validação
- ✅ `src/App.tsx` - Integração de todas as melhorias
- ✅ `src/components/Login.tsx` - Suporte a refresh tokens
- ✅ `src/components/ManualSearch.tsx` - Sanitização de inputs
- ✅ `src/components/QRScanner.tsx` - Logger
- ✅ `src/services/validationService.ts` - Logger
- ✅ `src/store/validationStore.ts` - Logger

---

**Última atualização:** Janeiro 2025

