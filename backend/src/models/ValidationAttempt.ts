import mongoose, { Document, Schema } from 'mongoose';

export interface IValidationAttempt extends Document {
    ticketCode: string; // Código do ingresso tentado
    ticketId?: mongoose.Types.ObjectId; // Referência ao Ticket (se encontrado)
    holderId?: mongoose.Types.ObjectId; // Dono do ingresso (se encontrado)
    validatorId?: mongoose.Types.ObjectId; // Quem tentou validar (QRCODE user)
    eventId?: mongoose.Types.ObjectId; // Evento do ingresso (se encontrado)
    success: boolean; // Se a validação foi bem-sucedida
    reason?: string; // Motivo da falha (se houver): 'already_used', 'not_found', 'invalid_status', 'replay_detected', etc.
    ipAddress?: string; // IP de onde veio a tentativa
    userAgent?: string; // User agent
    createdAt: Date;
}

const validationAttemptSchema = new Schema<IValidationAttempt>(
    {
        ticketCode: {
            type: String,
            required: true,
            index: true,
            uppercase: true,
            length: [12, 'Código deve ter 12 caracteres'],
        },
        ticketId: {
            type: Schema.Types.ObjectId,
            ref: 'Ticket',
            index: true,
        },
        holderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true, // Índice para buscar tentativas por usuário
        },
        validatorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        eventId: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            index: true,
        },
        success: {
            type: Boolean,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            enum: [
                'already_used',      // QR já foi usado
                'not_found',         // Ingresso não encontrado
                'invalid_status',     // Status inválido (não confirmado)
                'replay_detected',   // Replay detectado (nonce duplicado)
                'order_not_paid',    // Pedido não pago
                'event_inactive',    // Evento inativo
                'unauthorized',      // Sem permissão
                'expired',           // QR expirado
                'invalid_signature',  // Assinatura inválida
                'other',             // Outro motivo
            ],
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
    },
    {
        timestamps: true, // createdAt e updatedAt
    }
);

// Índices compostos para queries eficientes
validationAttemptSchema.index({ holderId: 1, success: 1, createdAt: -1 });
validationAttemptSchema.index({ ticketCode: 1, success: 1, createdAt: -1 });
validationAttemptSchema.index({ holderId: 1, reason: 1, createdAt: -1 });
validationAttemptSchema.index({ createdAt: -1 }); // Para queries recentes

// Static method para contar tentativas suspeitas de um usuário
validationAttemptSchema.statics.countSuspiciousAttempts = function (
    holderId: string,
    hoursWindow: number = 24
) {
    const since = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
    return this.countDocuments({
        holderId,
        success: false,
        reason: { $in: ['already_used', 'replay_detected'] },
        createdAt: { $gte: since },
    });
};

// Static method para verificar se mesmo QR foi usado em múltiplos eventos
validationAttemptSchema.statics.checkMultiEventUsage = async function (
    ticketCode: string,
    hoursWindow: number = 24
) {
    const since = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
    const attempts = await this.find({
        ticketCode: ticketCode.toUpperCase(),
        success: true,
        createdAt: { $gte: since },
    })
        .populate('eventId', 'name')
        .lean();

    const uniqueEvents = new Set(
        attempts
            .map((a: any) => a.eventId?._id?.toString())
            .filter((id: string) => id)
    );

    return {
        count: attempts.length,
        uniqueEvents: uniqueEvents.size,
        events: Array.from(uniqueEvents),
    };
};

export default mongoose.models.ValidationAttempt ||
    mongoose.model<IValidationAttempt>('ValidationAttempt', validationAttemptSchema);

