import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

// Estender a interface Request para incluir user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

/**
 * Middleware para verificar token JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Verificar se o token existe no header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso não fornecido',
                errors: ['Header Authorization com Bearer token é obrigatório'],
            });
        }

        // Extrair o token
        const token = authHeader.substring(7); // Remove 'Bearer '

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso não fornecido',
                errors: ['Token não pode estar vazio'],
            });
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido',
                errors: ['Token não contém informações válidas do usuário'],
            });
        }

        // Buscar o usuário no banco de dados
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado',
                errors: ['Token válido mas usuário não existe'],
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Usuário inativo',
                errors: ['Conta foi desativada'],
            });
        }

        // Adicionar usuário ao request
        req.user = user;
        next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido',
                errors: ['Token malformado ou expirado'],
            });
        }

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: 'Token expirado',
                errors: ['Faça login novamente'],
            });
        }

        console.error('Erro na autenticação:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao processar autenticação'],
        });
    }
};

/**
 * Middleware para verificar roles específicas
 */
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                errors: ['Token de acesso necessário'],
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: [`Apenas usuários com role: ${roles.join(', ')} podem acessar este recurso`],
            });
        }

        next();
    };
};

/**
 * Middleware para verificar se o usuário é o dono do recurso ou admin
 */
export const authorizeOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Usuário não autenticado',
            errors: ['Token de acesso necessário'],
        });
    }

    const resourceUserId = req.params.userId || req.params.id;
    const isOwner = req.user._id.toString() === resourceUserId;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'TURMA';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado',
            errors: ['Você só pode acessar seus próprios recursos'],
        });
    }

    next();
};

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continua sem usuário
        }

        const token = authHeader.substring(7);

        if (!token) {
            return next(); // Continua sem usuário
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        if (decoded && decoded.userId) {
            // Buscar o usuário no banco de dados
            const user = await User.findById(decoded.userId).select('-password');

            if (user && user.isActive) {
                req.user = user;
            }
        }

        next();

    } catch (error) {
        // Em caso de erro, continua sem usuário
        next();
    }
};

/**
 * Middleware para verificar se o usuário é ADMIN
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso necessário',
                errors: ['Usuário não autenticado']
            });
        }

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas administradores podem acessar esta funcionalidade']
            });
        }

        next();
    } catch (error: any) {
        console.error('Error in isAdmin middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: [error.message]
        });
    }
};
