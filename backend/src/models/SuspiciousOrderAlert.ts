import mongoose, { Schema, Document } from 'mongoose';

export interface ISuspiciousOrderAlert extends Document {
    orderId: mongoose.Types.ObjectId;
    alertType:
        | 'multiple_orders_same_ip'
        | 'same_cpf_different_emails'
        | 'multiple_orders_short_time';
    severity: 'low' | 'medium' | 'high';
    description: string;
    metadata: {
        ipAddress?: string;
        cpf?: string;
        emails?: string[];
        orderCount?: number;
        timeWindow?: number; // em minutos
        userId?: mongoose.Types.ObjectId;
    };
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const suspiciousOrderAlertSchema = new Schema<ISuspiciousOrderAlert>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        alertType: {
            type: String,
            enum: [
                'multiple_orders_same_ip',
                'same_cpf_different_emails',
                'multiple_orders_short_time',
            ],
            required: true,
            index: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            required: true,
            default: 'medium',
        },
        description: {
            type: String,
            required: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        resolved: {
            type: Boolean,
            default: false,
            index: true,
        },
        resolvedAt: {
            type: Date,
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        resolvedReason: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Índices para queries eficientes
suspiciousOrderAlertSchema.index({ alertType: 1, resolved: 1, createdAt: -1 });
suspiciousOrderAlertSchema.index({ 'metadata.ipAddress': 1, createdAt: -1 });
suspiciousOrderAlertSchema.index({ 'metadata.cpf': 1, createdAt: -1 });
suspiciousOrderAlertSchema.index({ orderId: 1 });

export default mongoose.models.SuspiciousOrderAlert ||
    mongoose.model<ISuspiciousOrderAlert>('SuspiciousOrderAlert', suspiciousOrderAlertSchema);
