import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { User } from '../models';
import { authenticate, isAdmin } from '../middleware/auth';
import { captureControllerError } from '../utils/sentryErrorHandler';
import mongoose from 'mongoose';

/**
 * Lista logs de auditoria
 * GET /api/audit-logs
 * Apenas ADMIN pode acessar
 */
export const listAuditLogs = async (req: Request, res: Response) => {
    try {
        // Parâmetros de busca e paginação
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Máximo 100
        const skip = (page - 1) * limit;

        // Filtros
        const filters: any = {};

        // Filtrar por tipo de entidade
        if (req.query.entityType) {
            const validTypes = ['Order', 'Ticket', 'Event', 'User', 'TicketType'];
            if (validTypes.includes(req.query.entityType as string)) {
                filters.entityType = req.query.entityType;
            }
        }

        // Filtrar por ID da entidade
        if (req.query.entityId) {
            try {
                filters.entityId = new mongoose.Types.ObjectId(req.query.entityId as string);
            } catch {
                return res.status(400).json({
                    success: false,
                    message: 'ID da entidade inválido',
                    errors: ['entityId deve ser um ObjectId válido'],
                });
            }
        }

        // Filtrar por ação
        if (req.query.action) {
            const validActions = [
                'create',
                'update',
                'delete',
                'status_change',
                'payment_update',
                'cancel',
                'refund',
            ];
            if (validActions.includes(req.query.action as string)) {
                filters.action = req.query.action;
            }
        }

        // Filtrar por usuário que fez a ação
        if (req.query.performedBy) {
            try {
                filters.performedBy = new mongoose.Types.ObjectId(req.query.performedBy as string);
            } catch {
                return res.status(400).json({
                    success: false,
                    message: 'ID do usuário inválido',
                    errors: ['performedBy deve ser um ObjectId válido'],
                });
            }
        }

        // Filtrar por role
        if (req.query.performedByRole) {
            const validRoles = ['ADMIN', 'CLIENTE', 'QRCODE', 'SYSTEM'];
            if (validRoles.includes(req.query.performedByRole as string)) {
                filters.performedByRole = req.query.performedByRole;
            }
        }

        // Filtrar por data
        if (req.query.startDate || req.query.endDate) {
            filters.createdAt = {};
            if (req.query.startDate) {
                try {
                    filters.createdAt.$gte = new Date(req.query.startDate as string);
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: 'Data inicial inválida',
                        errors: ['startDate deve estar no formato ISO 8601 (ex: 2025-01-15T00:00:00Z)'],
                    });
                }
            }
            if (req.query.endDate) {
                try {
                    filters.createdAt.$lte = new Date(req.query.endDate as string);
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: 'Data final inválida',
                        errors: ['endDate deve estar no formato ISO 8601 (ex: 2025-01-15T23:59:59Z)'],
                    });
                }
            }
        }

        // Buscar logs com paginação
        const [logs, total] = await Promise.all([
            AuditLog.find(filters)
                .populate('performedBy', 'name email role')
                .sort({ createdAt: -1 }) // Mais recentes primeiro
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(filters),
        ]);

        // Calcular paginação
        const totalPages = Math.ceil(total / limit);

        // Formatar resposta
        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'auditController',
            action: 'listAuditLogs',
            extra: {
                query: req.query,
            },
        });

        res.status(500).json({
            success: false,
            message: 'Erro ao buscar logs de auditoria',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};

/**
 * Busca um log de auditoria específico
 * GET /api/audit-logs/:id
 * Apenas ADMIN pode acessar
 */
export const getAuditLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Validar ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID inválido',
                errors: ['ID deve ser um ObjectId válido'],
            });
        }

        // Buscar log
        const log = await AuditLog.findById(id).populate('performedBy', 'name email role').lean();

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log de auditoria não encontrado',
                errors: ['Log não existe'],
            });
        }

        res.json({
            success: true,
            data: { log },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'auditController',
            action: 'getAuditLog',
            extra: {
                id: req.params.id,
            },
        });

        res.status(500).json({
            success: false,
            message: 'Erro ao buscar log de auditoria',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};

/**
 * Busca logs relacionados a uma entidade específica
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Apenas ADMIN pode acessar
 */
export const getEntityAuditLogs = async (req: Request, res: Response) => {
    try {
        const { entityType, entityId } = req.params;

        // Validar tipo de entidade
        const validTypes = ['Order', 'Ticket', 'Event', 'User', 'TicketType'];
        if (!validTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de entidade inválido',
                errors: [`entityType deve ser um dos: ${validTypes.join(', ')}`],
            });
        }

        // Validar ObjectId
        if (!mongoose.Types.ObjectId.isValid(entityId)) {
            return res.status(400).json({
                success: false,
                message: 'ID da entidade inválido',
                errors: ['entityId deve ser um ObjectId válido'],
            });
        }

        // Parâmetros de paginação
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        // Buscar logs da entidade
        const filters = {
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId),
        };

        const [logs, total] = await Promise.all([
            AuditLog.find(filters)
                .populate('performedBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(filters),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                entityType,
                entityId,
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'auditController',
            action: 'getEntityAuditLogs',
            extra: {
                entityType: req.params.entityType,
                entityId: req.params.entityId,
            },
        });

        res.status(500).json({
            success: false,
            message: 'Erro ao buscar logs da entidade',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};
