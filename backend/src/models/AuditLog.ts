import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    entityType: 'Order' | 'Ticket' | 'Event' | 'User' | 'TicketType';
    entityId: mongoose.Types.ObjectId;
    action:
        | 'create'
        | 'update'
        | 'delete'
        | 'status_change'
        | 'payment_update'
        | 'cancel'
        | 'refund';
    performedBy?: mongoose.Types.ObjectId; // Usuário que fez a ação (null = sistema)
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
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        entityType: {
            type: String,
            enum: ['Order', 'Ticket', 'Event', 'User', 'TicketType'],
            required: true,
            index: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        action: {
            type: String,
            enum: [
                'create',
                'update',
                'delete',
                'status_change',
                'payment_update',
                'cancel',
                'refund',
            ],
            required: true,
            index: true,
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        performedByRole: {
            type: String,
            enum: ['ADMIN', 'CLIENTE', 'QRCODE', 'SYSTEM'],
        },
        changes: [
            {
                field: String,
                oldValue: Schema.Types.Mixed,
                newValue: Schema.Types.Mixed,
            },
        ],
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Apenas createdAt
    }
);

// Índices compostos para queries eficientes
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
