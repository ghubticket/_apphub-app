import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autenticação básica para proteger Swagger/API Docs
 * Usa Basic Authentication com credenciais configuráveis via env
 * 
 * Em desenvolvimento, pode ser desabilitado via SWAGGER_AUTH_ENABLED=false
 */
export const swaggerAuth = (req: Request, res: Response, next: NextFunction) => {
    // Em desenvolvimento, pode desabilitar autenticação
    const isAuthEnabled = process.env.SWAGGER_AUTH_ENABLED !== 'false';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Se autenticação estiver desabilitada OU estiver em desenvolvimento E SWAGGER_AUTH_ENABLED=false
    if (!isAuthEnabled || (isDevelopment && process.env.SWAGGER_AUTH_ENABLED === 'false')) {
        return next();
    }

    // Credenciais do Swagger (configurar via env)
    const swaggerUser = process.env.SWAGGER_USER || 'admin';
    const swaggerPassword = process.env.SWAGGER_PASSWORD || 'changeme';

    // Verificar se há header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        // Solicitar autenticação
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API Documentation"');
        return res.status(401).json({
            success: false,
            message: 'Acesso à documentação requer autenticação',
            errors: ['Basic Authentication necessário'],
        });
    }

    // Decodificar credenciais
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Verificar credenciais
    if (username === swaggerUser && password === swaggerPassword) {
        return next();
    }

    // Credenciais inválidas
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API Documentation"');
    return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        errors: ['Usuário ou senha incorretos'],
    });
};

