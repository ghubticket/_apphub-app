import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Detectar ambiente (desenvolvimento se NODE_ENV não for 'production')
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Rate limiting para autenticação (login, register)
 * Mais restritivo para prevenir ataques de força bruta
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDevelopment ? 1000 : 100, // máximo 1000 em dev, 100 em produção
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        errors: ['Rate limit excedido para autenticação'],
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
    // Durante o período de testes/demonstração, usar limite mais alto em produção
    // TODO: reduzir para ~100 em produção quando o tráfego real começar
    max: isDevelopment ? 5000 : 2000, // 5000 em dev, 2000 em produção (por IP / 15min)
    message: {
        success: false,
        message: 'Muitas requisições. Tente novamente em 15 minutos.',
        errors: ['Rate limit excedido'],
    },
    standardHeaders: true,
    legacyHeaders: false,
    // CRÍTICO: Pular rate limiting para requisições OPTIONS (preflight CORS)
    // Essas requisições são necessárias para o CORS funcionar corretamente
    skip: (req: Request) => req.method === 'OPTIONS',
});

/**
 * Rate limiting para refresh token
 * Previne abuso do endpoint de renovação
 */
export const refreshRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: isDevelopment ? 500 : 10, // máximo 500 em dev, 10 em produção
    message: {
        success: false,
        message: 'Muitas tentativas de refresh. Tente novamente em 5 minutos.',
        errors: ['Rate limit excedido para refresh token'],
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
    max: isDevelopment ? 1000 : 10, // máximo 1000 em dev, 10 em produção
    message: {
        success: false,
        message: 'Muitas requisições para endpoint sensível. Tente novamente em 1 minuto.',
        errors: ['Rate limit excedido para endpoint sensível'],
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiting por usuário autenticado
 * Usa userId como chave para limitar requisições por usuário
 * Útil para prevenir abuso mesmo quando o IP muda
 */
export const userRateLimit = (windowMs: number, max: number, message?: string) => {
    return rateLimit({
        windowMs,
        max,
        keyGenerator: (req: Request) => {
            // Usar userId se autenticado, senão usar IP como fallback
            const user = (req as any).user;
            return user ? `user:${user._id || user.id}` : `ip:${req.ip}`;
        },
        message: {
            success: false,
            message: message || 'Muitas requisições. Tente novamente mais tarde.',
            errors: ['Rate limit excedido por usuário'],
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req: Request) => {
            // Pular rate limit para usuários não autenticados (já tem rate limit por IP)
            return !(req as any).user;
        },
    });
};

/**
 * Rate limiting para criação de pedidos por usuário autenticado
 * Limita a 10 pedidos por hora por usuário
 * EXCEÇÃO: Pedidos VIP não contam no rate limit (são gratuitos e limitados por CPF)
 */
const orderCreationRateLimitInstance = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // Fixar 10 pedidos por hora (inclusive em produção)
    keyGenerator: (req: Request) => {
        // Usar userId se autenticado, senão usar IP como fallback
        const user = (req as any).user;
        return user ? `user:${user._id || user.id}` : `ip:${req.ip}`;
    },
    message: {
        success: false,
        message: 'Limite de pedidos excedido. Máximo de 10 pedidos por hora.',
        errors: ['Rate limit excedido por usuário'],
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Middleware customizado que verifica se é VIP antes de aplicar rate limit
 */
export const orderCreationUserRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    // Pular rate limit para usuários não autenticados (já tem rate limit por IP)
    if (!(req as any).user) {
        return next();
    }

    // Verificar se é pedido VIP - se for, pular rate limit
    const { ticketTypeId } = req.body;
    if (ticketTypeId) {
        try {
            const { TicketType } = require('../models');
            const ticketType = await TicketType.findById(ticketTypeId).select('isVIP').lean();
            // Se for VIP, pular rate limit
            if (ticketType?.isVIP === true) {
                return next();
            }
        } catch (error) {
            // Se erro ao buscar, aplicar rate limit por segurança
            return orderCreationRateLimitInstance(req, res, next);
        }
    }

    // Aplicar rate limit para pedidos não-VIP
    return orderCreationRateLimitInstance(req, res, next);
};

/**
 * Rate limiting para operações críticas por usuário autenticado
 * Limita a 20 operações por 15 minutos por usuário
 */
export const criticalOperationsUserRateLimit = userRateLimit(
    15 * 60 * 1000, // 15 minutos
    isDevelopment ? 1000 : 20, // 20 operações por 15 minutos em produção
    'Muitas operações. Tente novamente em 15 minutos.'
);

/**
 * Rate limiting específico para leitura/validação de ingressos via QR
 * Limita tentativas por usuário autenticado (validador) em janela curta
 */
export const ticketValidationUserRateLimit = userRateLimit(
    60 * 1000, // 1 minuto
    isDevelopment ? 1000 : 60, // até 60 validações por minuto por usuário em produção
    'Muitas tentativas de validação de ingressos. Aguarde alguns instantes e tente novamente.'
);