/**
 * Utilitários para gerenciamento e validação de tokens JWT
 */

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Decodifica o payload de um token JWT sem verificar assinatura
 * (Verificação de assinatura deve ser feita no backend)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * Verifica se um token está expirado
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true; // Se não conseguir decodificar, considerar expirado
  }

  const exp = payload.exp * 1000; // Converter para milissegundos
  return Date.now() >= exp;
};

/**
 * Valida a integridade e estrutura de um token
 */
export const validateToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false; // Token JWT deve ter 3 partes
    }

    const payload = decodeToken(token);
    if (!payload) {
      return false;
    }

    // Validar campos obrigatórios
    if (!payload.exp || !payload.iat || !payload.userId) {
      return false;
    }

    // Validar role (deve ser QRCODE para este app)
    if (payload.role !== 'QRCODE') {
      return false;
    }

    // Validar expiração
    if (isTokenExpired(token)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Obtém informações do token (payload decodificado)
 */
export const getTokenInfo = (token: string): TokenPayload | null => {
  if (!validateToken(token)) {
    return null;
  }

  return decodeToken(token);
};

/**
 * Obtém tempo restante até expiração (em milissegundos)
 */
export const getTokenTimeRemaining = (token: string): number => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const exp = payload.exp * 1000;
  const remaining = exp - Date.now();
  return Math.max(0, remaining);
};

