import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validar se a requisição vem de dispositivo móvel
 * Aplica apenas para rotas de validação de QR codes
 */
export const validateMobileDevice = (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('user-agent') || '';

    // Padrões de dispositivos móveis
    const mobilePatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Mobile/i,
    ];

    // Verificar se é mobile ou tablet
    const isMobile = mobilePatterns.some((pattern) => pattern.test(userAgent));
    const isTablet = /iPad|Android|Tablet/i.test(userAgent) && !/Mobile/i.test(userAgent);

    // Permitir mobile e tablets
    if (isMobile || isTablet) {
        return next();
    }

    // Em desenvolvimento, permitir acesso de qualquer dispositivo (para testes)
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // Em produção, bloquear acesso de desktop
    return res.status(403).json({
        success: false,
        message: 'Acesso negado',
        errors: [
            'Este endpoint é exclusivo para dispositivos móveis e tablets. Por favor, acesse de um celular ou tablet.',
        ],
    });
};

/**
 * Middleware para validar User-Agent e prevenir ataques automatizados
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('user-agent');

    // Bloquear User-Agents suspeitos (bots, scrapers, etc)
    const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /postman/i,
        /insomnia/i,
        /httpie/i,
        /^$/i, // User-Agent vazio
    ];

    // Em desenvolvimento, ser mais permissivo
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // Em produção, bloquear User-Agents suspeitos
    if (!userAgent || suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado',
            errors: ['User-Agent não permitido'],
        });
    }

    next();
};

/**
 * Middleware para validar origem da requisição (prevenir DNS spoofing)
 */
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const host = req.get('host');

    // Lista de origens permitidas
    const allowedOrigins = [
        process.env.QR_SCANNER_URL,
        process.env.FRONTEND_URL,
        process.env.DASHBOARD_URL,
    ].filter(Boolean);

    // Em desenvolvimento, ser mais permissivo
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // Validar origem apenas em produção
    if (origin && !allowedOrigins.some((allowed) => origin.startsWith(allowed || ''))) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado',
            errors: ['Origem da requisição não permitida'],
        });
    }

    next();
};
