import { Request, Response } from 'express';
import SupportRequest from '../models/SupportRequest';
import { captureControllerError } from '../utils/sentryErrorHandler';
import logger from '../utils/logger';

const extractIpAddress = (req: Request): string | undefined => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0]?.trim();
    }
    if (Array.isArray(forwarded)) {
        return forwarded[0];
    }
    return req.socket?.remoteAddress || undefined;
};

/**
 * Criar uma nova solicitação de suporte
 * POST /api/support/request
 */
export const createSupportRequest = async (req: Request, res: Response) => {
    try {
        const { category, subject, message } = req.body;
        const user = (req as any).user; // Do middleware de autenticação

        // Verificar se o usuário está autenticado
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária',
                errors: ['Você precisa estar logado para criar uma solicitação'],
            });
        }

        // Criar solicitação de suporte
        const supportRequest = await SupportRequest.create({
            userId: user.id || user._id?.toString(),
            userEmail: user.email,
            userName: user.name,
            category,
            subject: subject.trim(),
            message: message.trim(),
            status: 'pending',
            ipAddress: extractIpAddress(req),
            userAgent: req.headers['user-agent'],
        });

        logger.info(`Nova solicitação de suporte criada: ${supportRequest._id} - ${category} - ${user.email}`);

        // TODO: Aqui você pode adicionar envio de email de notificação para a equipe de suporte
        // await sendSupportRequestNotificationEmail(supportRequest);

        return res.status(201).json({
            success: true,
            message: 'Solicitação enviada com sucesso. Nossa equipe entrará em contato em breve.',
            data: {
                id: supportRequest._id,
                category: supportRequest.category,
                subject: supportRequest.subject,
                status: supportRequest.status,
                createdAt: supportRequest.createdAt,
            },
        });
    } catch (error: any) {
        logger.error('Erro ao criar solicitação de suporte:', error);

        // Erro inesperado - enviar ao Sentry
        captureControllerError(error, req, {
            controller: 'supportController',
            action: 'createSupportRequest',
            statusCode: 500,
            extra: {
                category: req.body?.category,
                userEmail: (req as any).user?.email,
            },
        });

        return res.status(500).json({
            success: false,
            message: 'Não foi possível processar sua solicitação. Tente novamente mais tarde.',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};

/**
 * Listar solicitações do usuário autenticado
 * GET /api/support/requests
 */
export const getMySupportRequests = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária',
                errors: ['Você precisa estar logado'],
            });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const userId = user.id || user._id?.toString();
        const userEmail = user.email;

        const [requests, total] = await Promise.all([
            SupportRequest.find({
                $or: [{ userId }, { userEmail }],
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('category subject status createdAt updatedAt')
                .lean(),
            SupportRequest.countDocuments({
                $or: [{ userId }, { userEmail }],
            }),
        ]);

        return res.json({
            success: true,
            data: {
                requests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error: any) {
        logger.error('Erro ao listar solicitações de suporte:', error);

        captureControllerError(error, req, {
            controller: 'supportController',
            action: 'getMySupportRequests',
            statusCode: 500,
        });

        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar solicitações',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};

