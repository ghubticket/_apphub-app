import mongoose, { Document, Schema } from 'mongoose';

// Interface para reserva temporária de ingressos
export interface ITicketReservation extends Document {
    event: mongoose.Types.ObjectId; // Referência ao Event
    ticketType: mongoose.Types.ObjectId; // Referência ao TicketType
    quantity: number; // Quantidade de ingressos reservados
    reservedBy?: mongoose.Types.ObjectId; // Usuário que fez a reserva (opcional - pode ser anônimo)
    sessionId: string; // ID da sessão do usuário (para identificar reservas anônimas)
    orderId?: mongoose.Types.ObjectId; // Referência ao Order (opcional - para reservas vinculadas a pedidos PIX)
    expiresAt: Date; // Data de expiração da reserva
    isActive: boolean; // Se a reserva está ativa
    createdAt: Date;
    updatedAt: Date;

    // Virtuals
    isExpired: boolean; // Se a reserva expirou
    timeRemaining: number; // Tempo restante em milissegundos
}

// Interface para métodos estáticos
export interface ITicketReservationModel extends mongoose.Model<ITicketReservation> {
    findActiveByEventAndType(eventId: string, ticketTypeId: string): Promise<ITicketReservation[]>;
    findActiveBySession(sessionId: string): Promise<ITicketReservation[]>;
    cleanExpired(): Promise<any>;
    getTotalReserved(eventId: string, ticketTypeId: string): Promise<number>;
}

// Schema da reserva temporária
const ticketReservationSchema = new Schema<ITicketReservation>(
    {
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Evento é obrigatório'],
            index: true,
        },
        ticketType: {
            type: Schema.Types.ObjectId,
            ref: 'TicketType',
            required: [true, 'Tipo de ingresso é obrigatório'],
            index: true,
        },
        quantity: {
            type: Number,
            required: [true, 'Quantidade é obrigatória'],
            min: [1, 'Quantidade deve ser pelo menos 1'],
            max: [50, 'Quantidade não pode ser maior que 50'],
        },
        reservedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        sessionId: {
            type: String,
            required: [true, 'ID da sessão é obrigatório'],
            trim: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            index: true,
        },
        expiresAt: {
            type: Date,
            required: [true, 'Data de expiração é obrigatória'],
            index: { expireAfterSeconds: 0 }, // MongoDB TTL index - remove automaticamente após expiresAt
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Índices compostos para performance
ticketReservationSchema.index({ event: 1, ticketType: 1, isActive: 1 });
ticketReservationSchema.index({ sessionId: 1, isActive: 1 });
ticketReservationSchema.index({ orderId: 1, isActive: 1 }); // Índice para buscar reservas por pedido
ticketReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual para verificar se expirou
ticketReservationSchema.virtual('isExpired').get(function () {
    return new Date() > this.expiresAt;
});

// Virtual para tempo restante
ticketReservationSchema.virtual('timeRemaining').get(function () {
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, remaining);
});

// Middleware para garantir que expiresAt seja no futuro
ticketReservationSchema.pre('save', function (next) {
    if (this.isNew && !this.expiresAt) {
        // Se não foi definido, criar 15 minutos no futuro
        this.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    }
    next();
});

// Static method para buscar reservas ativas por evento e tipo de ingresso
ticketReservationSchema.statics.findActiveByEventAndType = function (
    eventId: string,
    ticketTypeId: string
) {
    return this.find({
        event: eventId,
        ticketType: ticketTypeId,
        isActive: true,
        expiresAt: { $gt: new Date() }, // Ainda não expirou
    });
};

// Static method para buscar reservas ativas por sessão
ticketReservationSchema.statics.findActiveBySession = function (sessionId: string) {
    return this.find({
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() },
    });
};

// Static method para limpar reservas expiradas
ticketReservationSchema.statics.cleanExpired = function () {
    return this.updateMany(
        {
            expiresAt: { $lt: new Date() },
            isActive: true,
        },
        {
            $set: { isActive: false },
        }
    );
};

// Static method para calcular quantidade total reservada
ticketReservationSchema.statics.getTotalReserved = async function (
    eventId: string,
    ticketTypeId: string
) {
    const reservations = await this.find({
        event: eventId,
        ticketType: ticketTypeId,
        isActive: true,
        expiresAt: { $gt: new Date() },
    });
    return reservations.reduce((total: number, reservation: ITicketReservation) => {
        return total + reservation.quantity;
    }, 0);
};

// Exportar o modelo
export default mongoose.model<ITicketReservation, ITicketReservationModel>(
    'TicketReservation',
    ticketReservationSchema
);

