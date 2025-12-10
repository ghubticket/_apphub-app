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
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}
