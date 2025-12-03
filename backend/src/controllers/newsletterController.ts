import { Request, Response } from 'express';
import NewsletterSubscription from '../models/NewsletterSubscription';
import { captureControllerError } from '../utils/sentryErrorHandler';

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

export const subscribeToNewsletter = async (req: Request, res: Response) => {
    const { email, name, source } = req.body as { email: string; name?: string; source?: string };

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const existing = await NewsletterSubscription.findOne({ email: normalizedEmail });

        if (existing) {
            return res.status(200).json({
                success: true,
                message: 'Email já inscrito na lista de novidades',
                data: {
                    id: existing._id,
                    alreadyRegistered: true,
                },
            });
        }

        const subscription = await NewsletterSubscription.create({
            email: normalizedEmail,
            name: name?.trim() || undefined,
            source: source?.trim() || 'footer',
            ipAddress: extractIpAddress(req),
            userAgent: req.headers['user-agent'],
        });

        return res.status(201).json({
            success: true,
            message: 'Inscrição realizada com sucesso',
            data: {
                id: subscription._id,
                createdAt: subscription.createdAt,
            },
        });
    } catch (error: any) {
        console.error('Erro ao inscrever email em novidades:', error);

        if (error.code === 11000) {
            // Duplicated key - already registered (não é erro)
            return res.status(200).json({
                success: true,
                message: 'Email já inscrito na lista de novidades',
                data: {
                    alreadyRegistered: true,
                },
            });
        }

        // Erro inesperado - enviar ao Sentry
        captureControllerError(error, req, {
            controller: 'newsletterController',
            action: 'subscribeToNewsletter',
            statusCode: 500,
            extra: {
                email: req.body?.email,
            },
        });

        return res.status(500).json({
            success: false,
            message: 'Não foi possível realizar a inscrição nas novidades',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};
