import { Request, Response } from 'express';
import { User } from '../models';
import ValidationAttempt from '../models/ValidationAttempt';
import { captureControllerError } from '../utils/sentryErrorHandler';

/**
 * Lista usuários suspeitos (com tentativas suspeitas)
 */
export const listSuspiciousUsers = async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).user?.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas ADMIN pode listar usuários suspeitos'],
            });
        }

        const users = await User.find({
            $or: [
                { isSuspicious: true },
                { isBlacklisted: true },
                { suspiciousActivityCount: { $gte: 1 } },
            ],
            deletedAt: null,
        })
            .select(
                'name email phone cpf role isActive suspiciousActivityCount isSuspicious suspiciousReason lastSuspiciousActivity isBlacklisted blacklistReason blacklistedAt createdAt'
            )
            .sort({ lastSuspiciousActivity: -1, suspiciousActivityCount: -1 })
            .lean();

        // Enriquecer com estatísticas de tentativas
        const enrichedUsers = await Promise.all(
            users.map(async (user) => {
                const attempts = await ValidationAttempt.find({
                    holderId: user._id,
                    success: false,
                    reason: { $in: ['already_used', 'replay_detected'] },
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Últimos 7 dias
                })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .populate('eventId', 'name')
                    .lean();

                return {
                    ...user,
                    recentAttempts: attempts,
                    attemptsCount: attempts.length,
                };
            })
        );

        res.json({
            success: true,
            data: enrichedUsers,
        });
    } catch (error: any) {
        console.error('Erro ao listar usuários suspeitos:', error);
        
        captureControllerError(error, req, {
            controller: 'usersController',
            action: 'listSuspiciousUsers',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao listar usuários suspeitos',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Marca/desmarca usuário como suspeito
 */
export const toggleSuspicious = async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).user?.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas ADMIN pode marcar usuários como suspeitos'],
            });
        }

        const { userId } = req.params;
        const { isSuspicious, reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
            });
        }

        user.isSuspicious = isSuspicious !== undefined ? isSuspicious : !user.isSuspicious;
        if (reason) {
            user.suspiciousReason = reason;
        }
        if (user.isSuspicious) {
            user.lastSuspiciousActivity = new Date();
        }

        await user.save();

        res.json({
            success: true,
            message: `Usuário ${user.isSuspicious ? 'marcado como suspeito' : 'removido da lista de suspeitos'}`,
            data: user,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar status de suspeito:', error);
        
        captureControllerError(error, req, {
            controller: 'usersController',
            action: 'toggleSuspicious',
            statusCode: 500,
            extra: {
                userId: req.params?.userId,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status de suspeito',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Adiciona/remove usuário da blacklist
 */
export const toggleBlacklist = async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).user?.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas ADMIN pode gerenciar blacklist'],
            });
        }

        const { userId } = req.params;
        const { isBlacklisted, reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
            });
        }

        user.isBlacklisted = isBlacklisted !== undefined ? isBlacklisted : !user.isBlacklisted;
        if (reason) {
            user.blacklistReason = reason;
        }
        if (user.isBlacklisted) {
            user.blacklistedAt = new Date();
            // Se está na blacklist, também marcar como suspeito
            user.isSuspicious = true;
        } else {
            user.blacklistedAt = undefined;
        }

        await user.save();

        res.json({
            success: true,
            message: `Usuário ${user.isBlacklisted ? 'adicionado à blacklist' : 'removido da blacklist'}`,
            data: user,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar blacklist:', error);
        
        captureControllerError(error, req, {
            controller: 'usersController',
            action: 'toggleBlacklist',
            statusCode: 500,
            extra: {
                userId: req.params?.userId,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar blacklist',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Verifica se usuário está bloqueado antes de permitir validação
 */
export const checkUserBlocked = async (
    userId: string
): Promise<{ blocked: boolean; reason?: string }> => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { blocked: false };
        }

        if (user.isBlacklisted) {
            return {
                blocked: true,
                reason: user.blacklistReason || 'Usuário está na blacklist',
            };
        }

        return { blocked: false };
    } catch (error: any) {
        console.error('Erro ao verificar bloqueio:', error);
        return { blocked: false };
    }
};
