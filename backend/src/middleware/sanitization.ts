import { Request, Response, NextFunction } from 'express';

// Sanitização robusta: remove tags perigosas e previne XSS
function sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') return input;
    
    let out = input;
    
    // Remove tags script/style e eventos on*
    out = out
        .replace(/<\/(?:script|style|iframe|object|embed|form|input|button)>/gi, '')
        .replace(/<(?:script|style|iframe|object|embed|form|input|button)[^>]*>/gi, '')
        .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
        .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
        .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, '');
    
    // Remove javascript: e data: URLs perigosos
    out = out
        .replace(/javascript:\s*/gi, '')
        .replace(/data:(?!image\/)[^"'\s]*/gi, '');
    
    // Remove caracteres de controle (exceto quebras de linha e tabs)
    out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    
    return out;
}

function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const copy: any = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
        const value = (obj as any)[key];
        if (typeof value === 'string') {
            copy[key] = sanitizeString(value);
        } else if (value && typeof value === 'object') {
            copy[key] = sanitizeObject(value);
        } else {
            copy[key] = value;
        }
    }
    return copy;
}

// Middleware genérico de sanitização do corpo da requisição
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
    // Verificar se há body válido para sanitizar
    // Ignorar body vazio ou undefined para evitar erros
    try {
        // Só sanitizar se body existe, é objeto e tem propriedades
        if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
            const keys = Object.keys(req.body);
            if (keys.length > 0) {
                req.body = sanitizeObject(req.body);
            }
        } else if (req.body && Array.isArray(req.body) && req.body.length > 0) {
            // Também sanitizar arrays
            req.body = req.body.map(item => 
                typeof item === 'object' ? sanitizeObject(item) : item
            );
        }
    } catch (error) {
        // Se houver erro ao acessar body (já foi lido ou outro problema), apenas continuar
        // Isso evita o erro "Body has already been read" e outros erros relacionados
    }
    next();
}
