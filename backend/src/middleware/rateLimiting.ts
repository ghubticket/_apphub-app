import rateLimit from 'express-rate-limit';

/**
 * Rate limiting para autenticação (login, register)
 * Mais restritivo para prevenir ataques de força bruta
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 tentativas por IP (desenvolvimento)
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        errors: ['Rate limit excedido para autenticação']
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
});

/**
 * Rate limiting geral para todas as rotas
 * Proteção contra spam e ataques DDoS
 */
export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: {
        success: false,
        message: 'Muitas requisições. Tente novamente em 15 minutos.',
        errors: ['Rate limit excedido']
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiting para refresh token
 * Previne abuso do endpoint de renovação
 */
export const refreshRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10, // máximo 10 tentativas por IP
    message: {
        success: false,
        message: 'Muitas tentativas de refresh. Tente novamente em 5 minutos.',
        errors: ['Rate limit excedido para refresh token']
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiting para APIs sensíveis
 * Proteção adicional para endpoints críticos
 */
export const sensitiveRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // máximo 10 requests por IP
    message: {
        success: false,
        message: 'Muitas requisições para endpoint sensível. Tente novamente em 1 minuto.',
        errors: ['Rate limit excedido para endpoint sensível']
    },
    standardHeaders: true,
    legacyHeaders: false,
});
