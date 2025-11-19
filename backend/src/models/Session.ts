import mongoose, { Document, Schema } from 'mongoose';

// Interface para o documento Session
export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    refreshToken: string;
    deviceInfo?: {
        userAgent: string;
        ip: string;
        device: string;
        browser: string;
        os: string;
    };
    isActive: boolean;
    lastActivity: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Schema da sessão
const sessionSchema = new Schema<ISession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        refreshToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        deviceInfo: {
            userAgent: {
                type: String,
                required: true,
            },
            ip: {
                type: String,
                required: true,
            },
            device: {
                type: String,
                default: 'Unknown',
            },
            browser: {
                type: String,
                default: 'Unknown',
            },
            os: {
                type: String,
                default: 'Unknown',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        lastActivity: {
            type: Date,
            default: Date.now,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 }, // TTL index
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Índices para performance
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ expiresAt: 1 });

// Middleware para atualizar lastActivity
sessionSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.lastActivity = new Date();
    }
    next();
});

// Static method para buscar sessões ativas de um usuário
sessionSchema.statics.findActiveByUserId = function (userId: string) {
    return this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: -1 });
};

// Static method para invalidar todas as sessões de um usuário
sessionSchema.statics.invalidateAllByUserId = function (userId: string) {
    return this.updateMany({ userId, isActive: true }, { isActive: false });
};

// Static method para invalidar uma sessão específica
sessionSchema.statics.invalidateByRefreshToken = function (refreshToken: string) {
    return this.updateOne({ refreshToken, isActive: true }, { isActive: false });
};

// Static method para limpar sessões expiradas
sessionSchema.statics.cleanupExpired = function () {
    return this.deleteMany({
        $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
    });
};

// Virtual para verificar se a sessão está expirada
sessionSchema.virtual('isExpired').get(function () {
    return this.expiresAt < new Date();
});

// Virtual para tempo restante da sessão
sessionSchema.virtual('timeRemaining').get(function () {
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, remaining);
});

// Interface para métodos estáticos
interface ISessionModel extends mongoose.Model<ISession> {
    findActiveByUserId(userId: string): Promise<ISession[]>;
    invalidateAllByUserId(userId: string): Promise<any>;
    invalidateByRefreshToken(refreshToken: string): Promise<any>;
    cleanupExpired(): Promise<any>;
}

// Exportar o modelo
export default mongoose.model<ISession, ISessionModel>('Session', sessionSchema);
