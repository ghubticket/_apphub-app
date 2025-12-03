/**
 * Utilitário centralizado para capturar erros no Sentry
 * 
 * Diferencia entre:
 * - Erros esperados (do usuário): validação, 404, etc. → NÃO envia ao Sentry
 * - Erros inesperados (do servidor): 500, banco de dados, integrações → ENVIA ao Sentry
 */

import * as Sentry from '@sentry/node';
import { Request } from 'express';

/**
 * Tipos de erros que são esperados e NÃO devem ser enviados ao Sentry
 */
const EXPECTED_ERROR_CODES = [
    400, // Bad Request - validação
    401, // Unauthorized - não autenticado
    403, // Forbidden - sem permissão
    404, // Not Found - recurso não existe
    409, // Conflict - conflito (email já existe, etc)
    422, // Unprocessable Entity - validação de negócio
];

/**
 * Tipos de erros do Mongoose que são esperados
 */
const EXPECTED_MONGOOSE_ERRORS = [
    'ValidationError', // Erro de validação do schema
    'CastError', // Erro de conversão de tipo
];

/**
 * Verifica se um erro é esperado (do usuário) e não deve ser enviado ao Sentry
 */
function isExpectedError(error: any, statusCode?: number): boolean {
    // Se tem status code e é um erro esperado
    if (statusCode && EXPECTED_ERROR_CODES.includes(statusCode)) {
        return true;
    }

    // Se é erro de validação do Mongoose
    if (error?.name && EXPECTED_MONGOOSE_ERRORS.includes(error.name)) {
        return true;
    }

    // Se é erro de índice duplicado (email já existe, etc)
    if (error?.code === 11000) {
        return true;
    }

    // Se é erro de rate limiting
    if (error?.message?.includes('Rate limit') || error?.message?.includes('Too many requests')) {
        return true;
    }

    return false;
}

/**
 * Extrai contexto útil da requisição para adicionar ao erro no Sentry
 */
function extractRequestContext(req: Request): Record<string, any> {
    const context: Record<string, any> = {
        method: req.method,
        path: req.path,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
    };

    // Adicionar dados do usuário se autenticado
    if ((req as any).user) {
        context.userId = (req as any).user._id?.toString();
        context.userEmail = (req as any).user.email;
        context.userRole = (req as any).user.role;
    }

    // Adicionar query params (limitado para não expor dados sensíveis)
    if (req.query && Object.keys(req.query).length > 0) {
        context.queryParams = Object.keys(req.query);
    }

    // Adicionar body (limitado, sem dados sensíveis)
    if (req.body && typeof req.body === 'object') {
        const safeBody: Record<string, any> = {};
        // Incluir apenas campos não sensíveis
        const safeFields = ['eventId', 'ticketTypeId', 'quantity', 'promoterCode'];
        safeFields.forEach(field => {
            if (req.body[field] !== undefined) {
                safeBody[field] = req.body[field];
            }
        });
        if (Object.keys(safeBody).length > 0) {
            context.body = safeBody;
        }
    }

    return context;
}

/**
 * Captura erro no Sentry de forma inteligente
 * 
 * @param error - O erro a ser capturado
 * @param req - Request do Express (opcional, para contexto)
 * @param options - Opções adicionais
 * @returns true se o erro foi enviado ao Sentry, false caso contrário
 */
export function captureErrorToSentry(
    error: any,
    req?: Request,
    options?: {
        statusCode?: number;
        tags?: Record<string, string>;
        extra?: Record<string, any>;
        level?: 'error' | 'warning' | 'info';
    }
): boolean {
    // Não enviar se Sentry não estiver configurado
    if (!process.env.SENTRY_DSN) {
        return false;
    }

    const statusCode = options?.statusCode || error?.statusCode || error?.status;
    
    // Não enviar erros esperados (do usuário)
    if (isExpectedError(error, statusCode)) {
        return false;
    }

    // Preparar tags
    const tags: Record<string, string> = {
        errorType: error?.name || 'UnknownError',
        ...(options?.tags || {}),
    };

    if (statusCode) {
        tags.statusCode = statusCode.toString();
    }

    // Preparar contexto extra
    const extra: Record<string, any> = {
        errorMessage: error?.message,
        errorStack: error?.stack,
        ...(options?.extra || {}),
    };

    // Adicionar contexto da requisição se disponível
    if (req) {
        extra.request = extractRequestContext(req);
    }

    // Capturar no Sentry
    Sentry.captureException(error, {
        tags,
        extra,
        level: options?.level || 'error',
    });

    return true;
}

/**
 * Wrapper para capturar erros em controllers
 * 
 * Uso:
 * ```typescript
 * catch (error: any) {
 *     const sentryId = captureControllerError(error, req, {
 *         controller: 'ordersController',
 *         action: 'createOrder',
 *     });
 *     
 *     return res.status(500).json({
 *         success: false,
 *         message: 'Erro ao criar pedido',
 *         sentryId, // Opcional: retornar ID do Sentry para suporte
 *     });
 * }
 * ```
 */
export function captureControllerError(
    error: any,
    req: Request,
    context: {
        controller: string;
        action: string;
        statusCode?: number;
        extra?: Record<string, any>;
    }
): string | null {
    const wasCaptured = captureErrorToSentry(error, req, {
        statusCode: context.statusCode,
        tags: {
            controller: context.controller,
            action: context.action,
        },
        extra: context.extra,
    });

    if (wasCaptured) {
        // Retornar ID do último evento (útil para suporte)
        return Sentry.lastEventId() || null;
    }

    return null;
}

