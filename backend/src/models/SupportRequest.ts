import { Schema, Document, model } from 'mongoose';

export interface ISupportRequest extends Document {
    userId?: string;
    userEmail: string;
    userName: string;
    category: 'general' | 'payment' | 'tickets' | 'account' | 'technical' | 'refund';
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    ipAddress?: string;
    userAgent?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SupportRequestSchema = new Schema<ISupportRequest>(
    {
        userId: {
            type: String,
            trim: true,
            index: true,
        },
        userEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            maxlength: 255,
            index: true,
        },
        userName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        category: {
            type: String,
            required: true,
            enum: ['general', 'payment', 'tickets', 'account', 'technical', 'refund'],
            index: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'resolved', 'closed'],
            default: 'pending',
            index: true,
        },
        ipAddress: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: 512,
        },
        resolvedAt: {
            type: Date,
        },
        resolvedBy: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Índices para otimização de consultas
SupportRequestSchema.index({ userId: 1, createdAt: -1 });
SupportRequestSchema.index({ userEmail: 1, createdAt: -1 });
SupportRequestSchema.index({ status: 1, createdAt: -1 });
SupportRequestSchema.index({ category: 1, status: 1 });

export default model<ISupportRequest>('SupportRequest', SupportRequestSchema);

