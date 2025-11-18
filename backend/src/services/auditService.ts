import { Request } from 'express';
import AuditLog from '../models/AuditLog';

interface AuditContext {
    entityType: 'Order' | 'Ticket' | 'Event' | 'User' | 'TicketType';
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'status_change' | 'payment_update' | 'cancel' | 'refund';
    performedBy?: string; // userId
    performedByRole?: 'ADMIN' | 'CLIENTE' | 'QRCODE' | 'SYSTEM';
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        reason?: string;
        paymentId?: string;
        paymentStatus?: string;
        [key: string]: any;
    };
}

/**
 * Registra uma entrada de auditoria
 * Executa em background para não bloquear a operação principal
 */
export async function logAudit(context: AuditContext): Promise<void> {
    try {
        // Capturar IP e User-Agent do request se disponível
        const ipAddress = context.metadata?.ipAddress;
        const userAgent = context.metadata?.userAgent;

        await AuditLog.create({
            entityType: context.entityType,
            entityId: context.entityId,
            action: context.action,
            performedBy: context.performedBy,
            performedByRole: context.performedByRole || 'SYSTEM',
            changes: context.changes || [],
            metadata: {
                ...context.metadata,
                ipAddress,
                userAgent,
            },
        });
    } catch (error) {
        // Não falhar a operação principal se o log de auditoria der erro
        console.error('Erro ao registrar auditoria (não crítico):', error);
    }
}

/**
 * Helper para criar contexto de auditoria a partir de um Request
 */
export function createAuditContextFromRequest(req: Request): {
    ipAddress: string;
    userAgent: string;
    performedBy?: string;
    performedByRole?: 'ADMIN' | 'CLIENTE' | 'QRCODE' | 'SYSTEM';
} {
    const user = (req as any).user;
    return {
        ipAddress: (req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown').toString(),
        userAgent: req.get('user-agent') || 'unknown',
        performedBy: user?._id?.toString() || user?.id,
        performedByRole: user?.role || 'SYSTEM',
    };
}

