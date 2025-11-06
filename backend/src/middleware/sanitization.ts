import { Request, Response, NextFunction } from 'express';

// Sanitização simples: remove tags <script> e atributos perigosos
function sanitizeString(input: string): string {
    if (!input) return input;
    // Remove tags script/style e eventos on*
    let out = input.replace(/<\/(?:script|style)>/gi, '')
                   .replace(/<(?:script|style)[^>]*>/gi, '')
                   .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
                   .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
                   .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, '');
    // Remove javascript: URLs
    out = out.replace(/javascript:\s*/gi, '');
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


