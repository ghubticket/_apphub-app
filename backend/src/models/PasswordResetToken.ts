import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPasswordResetToken extends Document {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    usedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string;
    userAgent?: string;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        usedAt: {
            type: Date,
            default: null,
            index: true,
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Índice composto para limpeza/consultas eficientes
passwordResetTokenSchema.index({ userId: 1, expiresAt: 1 });

export default mongoose.model<IPasswordResetToken>(
    'PasswordResetToken',
    passwordResetTokenSchema
);


