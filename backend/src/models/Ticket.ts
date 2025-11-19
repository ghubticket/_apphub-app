import mongoose, { Document, Schema } from 'mongoose';

// Interface para o documento Ticket
export interface ITicket extends Document {
    code: string; // Código único do ingresso
    qrCode: string; // QR Code em base64
    event: mongoose.Types.ObjectId; // Referência ao Event
    ticketType: mongoose.Types.ObjectId; // Referência ao TicketType (tipo de ingresso)
    order: mongoose.Types.ObjectId; // Referência ao Order
    holder: mongoose.Types.ObjectId; // Referência ao User (dono do ingresso)
    price: number; // Preço pago pelo ingresso (0 para VIP)
    status: 'pending' | 'confirmed' | 'used' | 'cancelled' | 'refunded';
    usedAt?: Date; // Data/hora de uso
    usedBy?: mongoose.Types.ObjectId; // Quem validou o ingresso (usuário QRCODE)
    usedByHolderId?: mongoose.Types.ObjectId; // Qual holder estava presente na validação (quem passou fisicamente)
    validatedAt?: Date; // Data/hora da validação
    isActive: boolean;
    deletedAt?: Date; // Data de soft delete (para limpeza periódica)
    createdAt: Date;
    updatedAt: Date;

    // Virtuals
    isUsed: boolean;
    isPending: boolean;
    isConfirmed: boolean;
    isCancelled: boolean;
}

// Schema do ingresso
const ticketSchema = new Schema<ITicket>(
    {
        code: {
            type: String,
            required: [true, 'Código do ingresso é obrigatório'],
            unique: true,
            trim: true,
            length: [12, 'Código deve ter exatamente 12 caracteres'],
            match: [/^[A-Z0-9]{12}$/, 'Código deve conter apenas letras maiúsculas e números'],
        },
        qrCode: {
            type: String,
            required: false, // QR Code só é gerado após pagamento (não obrigatório para pedidos pendentes)
            default: '',
            trim: true,
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Evento é obrigatório'],
        },
        ticketType: {
            type: Schema.Types.ObjectId,
            ref: 'TicketType',
            required: [true, 'Tipo de ingresso é obrigatório'],
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Pedido é obrigatório'],
        },
        holder: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Portador do ingresso é obrigatório'],
        },
        price: {
            type: Number,
            required: [true, 'Preço é obrigatório'],
            min: [0, 'Preço não pode ser negativo'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'confirmed', 'used', 'cancelled', 'refunded'],
                message: 'Status deve ser: pending, confirmed, used, cancelled ou refunded',
            },
            default: 'pending',
        },
        usedAt: {
            type: Date,
        },
        usedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        usedByHolderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null, // Se null, assume que foi o holder do ticket
        },
        validatedAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
            default: null,
            index: true, // Índice para facilitar queries de limpeza
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Índices para performance
ticketSchema.index({ code: 1 }, { unique: true });
ticketSchema.index({ event: 1 });
ticketSchema.index({ order: 1 });
ticketSchema.index({ holder: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ isActive: 1 });

// Virtual para verificar se foi usado
ticketSchema.virtual('isUsed').get(function () {
    return this.status === 'used';
});

// Virtual para verificar se está pendente
ticketSchema.virtual('isPending').get(function () {
    return this.status === 'pending';
});

// Virtual para verificar se está confirmado
ticketSchema.virtual('isConfirmed').get(function () {
    return this.status === 'confirmed';
});

// Virtual para verificar se foi cancelado
ticketSchema.virtual('isCancelled').get(function () {
    return this.status === 'cancelled';
});

// Middleware para gerar código único antes da validação (garante que o campo obrigatório exista)
ticketSchema.pre('validate', async function (next) {
    if (this.isNew) {
        // Gerar código único de 12 caracteres
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';

        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Verificar se o código já existe (apenas em ingressos não deletados)
        const existingTicket = await mongoose.model('Ticket').findOne({
            code,
            deletedAt: null,
        });
        if (existingTicket) {
            // Se existir, gerar novo código recursivamente
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newCode = '';

            for (let i = 0; i < 12; i++) {
                newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            this.code = newCode;
        } else {
            this.code = code;
        }
    }
    next();
});

// Static method para buscar ingressos por evento
ticketSchema.statics.findByEvent = function (eventId: string) {
    return this.find({ event: eventId, isActive: true, deletedAt: null });
};

// Static method para buscar ingressos por portador
ticketSchema.statics.findByHolder = function (holderId: string) {
    return this.find({ holder: holderId, isActive: true, deletedAt: null });
};

// Static method para buscar ingressos por status
ticketSchema.statics.findByStatus = function (status: string) {
    return this.find({ status, isActive: true, deletedAt: null });
};

// Static method para buscar ingresso por código
ticketSchema.statics.findByCode = function (code: string) {
    return this.findOne({ code, isActive: true, deletedAt: null });
};

// Exportar o modelo
export default mongoose.model<ITicket>('Ticket', ticketSchema);
