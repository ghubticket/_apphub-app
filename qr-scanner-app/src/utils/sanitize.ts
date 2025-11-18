/**
 * Utilitários para sanitização de inputs
 */

/**
 * Sanitiza código de ingresso (apenas letras e números, max 12 caracteres)
 */
export const sanitizeTicketCode = (input: string): string => {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Apenas letras maiúsculas e números
    .substring(0, 12); // Max 12 caracteres
};

/**
 * Sanitiza CPF (apenas números, max 11 caracteres)
 */
export const sanitizeCPF = (input: string): string => {
  return input
    .trim()
    .replace(/\D/g, '') // Apenas números
    .substring(0, 11); // Max 11 caracteres
};

/**
 * Sanitiza string genérica (remove caracteres perigosos)
 */
export const sanitizeString = (input: string, maxLength?: number): string => {
  let sanitized = input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, ''); // Remove eventos on*

  if (maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

