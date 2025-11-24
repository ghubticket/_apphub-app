import mongoose, { Document, Schema } from 'mongoose';

// Interface para o documento TicketType (Tipo de Ingresso)
export interface ITicketType extends Document {
    name: string; // Nome do tipo de ingresso (ex: "VIP", "Pista", "Meia-entrada")
    description?: string; // Descrição opcional
    event: mongoose.Types.ObjectId; // Referência ao Event
    price: number; // Preço do ingresso (0 para VIP)
    isVIP: boolean; // Flag para ingressos VIP (sem valor nem taxa)
    lotNumber: number; // Número do lote (ex: 1, 2, 3)
    maxQuantity: number; // Quantidade máxima por lote (ex: 200)
    maxPerPurchase: number; // Limite de ingressos por compra
    maxPerCPF?: number; // Limite acumulado de ingressos por CPF para este tipo (opcional)
    maxPerEmail?: number; // Limite acumulado de ingressos por Email para este tipo (opcional)
    soldQuantity: number; // Quantidade já vendida
    salesStart?: Date; // Data de início da venda (opcional)
    salesEnd?: Date; // Data de fim da venda (opcional)
    isActive: boolean;
    deletedAt?: Date; // Data de soft delete (para limpeza periódica)
    createdAt: Date;
    updatedAt: Date;

    // Virtuals
    availableQuantity: number; // Quantidade disponível
    isSoldOut: boolean; // Se está esgotado
    isOnSale: boolean; // Se está em período de venda
}

// Schema do tipo de ingresso
const ticketTypeSchema = new Schema<ITicketType>(
    {
        name: {
            type: String,
            required: [true, 'Nome do tipo de ingresso é obrigatório'],
            trim: true,
            minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
            maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Descrição deve ter no máximo 500 caracteres'],
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Evento é obrigatório'],
            index: true,
        },
        price: {
            type: Number,
            required: [true, 'Preço é obrigatório'],
            min: [0, 'Preço não pode ser negativo'],
            max: [10000, 'Preço não pode ser maior que R$ 10.000'],
            validate: {
                validator: function (value: number) {
                    // Se for VIP, o preço deve ser 0
                    if ((this as any).isVIP && value !== 0) {
                        return false;
                    }
                    return true;
                },
                message: 'Ingressos VIP devem ter preço 0',
            },
        },
        isVIP: {
            type: Boolean,
            default: false,
        },
        lotNumber: {
            type: Number,
            required: [true, 'Número do lote é obrigatório'],
            min: [1, 'Número do lote deve ser pelo menos 1'],
        },
        maxQuantity: {
            type: Number,
            required: [true, 'Quantidade máxima é obrigatória'],
            min: [1, 'Quantidade máxima deve ser pelo menos 1'],
            max: [100000, 'Quantidade máxima não pode ser maior que 100.000'],
        },
        maxPerPurchase: {
            type: Number,
            required: [true, 'Limite por compra é obrigatório'],
            min: [1, 'Limite por compra deve ser pelo menos 1'],
            max: [50, 'Limite por compra não pode ser maior que 50'],
        },
        maxPerCPF: {
            type: Number,
            default: null,
            min: [1, 'Limite por CPF deve ser pelo menos 1'],
            max: [100, 'Limite por CPF não pode ser maior que 100'],
        },
        maxPerEmail: {
            type: Number,
            default: null,
            min: [1, 'Limite por Email deve ser pelo menos 1'],
            max: [100, 'Limite por Email não pode ser maior que 100'],
        },
        soldQuantity: {
            type: Number,
            default: 0,
            min: [0, 'Quantidade vendida não pode ser negativa'],
        },
        salesStart: {
            type: Date,
        },
        salesEnd: {
            type: Date,
            validate: {
                validator: function (this: ITicketType, value?: Date) {
                    if (this.salesStart && value && value <= this.salesStart) {
                        return false;
                    }
                    return true;
                },
                message: 'Data de fim da venda deve ser posterior à data de início',
            },
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
// Índice único: mesmo evento + mesmo nome de tipo + mesmo número de lote não pode repetir
// Permite: Pista Lote 1, Pista Lote 2, VIP Lote 1 (mesmo número de lote para tipos diferentes)
ticketTypeSchema.index({ event: 1, name: 1, lotNumber: 1 }, { unique: true });
ticketTypeSchema.index({ event: 1 });
// Índice composto para buscar tickets por evento, ativos e não deletados
ticketTypeSchema.index({ event: 1, isActive: 1, deletedAt: 1 });
// Índice composto para queries de disponibilidade
ticketTypeSchema.index({ event: 1, soldQuantity: 1 });
ticketTypeSchema.index({ isActive: 1 });
ticketTypeSchema.index({ salesStart: 1, salesEnd: 1 });

// Virtual para quantidade disponível
ticketTypeSchema.virtual('availableQuantity').get(function () {
    return Math.max(0, this.maxQuantity - this.soldQuantity);
});

// Virtual para verificar se está esgotado
ticketTypeSchema.virtual('isSoldOut').get(function () {
    return this.soldQuantity >= this.maxQuantity;
});

// Virtual para verificar se está em período de venda
ticketTypeSchema.virtual('isOnSale').get(function () {
    const now = new Date();
    if (this.salesStart && now < this.salesStart) {
        return false;
    }
    if (this.salesEnd && now > this.salesEnd) {
        return false;
    }
    return true;
});

// Middleware para validar quantidade vendida vs máxima
ticketTypeSchema.pre('save', function (next) {
    if (this.soldQuantity > this.maxQuantity) {
        next(new Error('Quantidade vendida não pode ser maior que a quantidade máxima'));
    } else {
        next();
    }
});

// Middleware para garantir que VIP tenha preço 0
ticketTypeSchema.pre('save', function (next) {
    if (this.isVIP && this.price !== 0) {
        this.price = 0;
    }
    next();
});

// Static method para buscar tipos de ingresso por evento
ticketTypeSchema.statics.findByEvent = function (eventId: string) {
    return this.find({ event: eventId, isActive: true }).sort({ lotNumber: 1 });
};

// Static method para buscar tipos de ingresso disponíveis
ticketTypeSchema.statics.findAvailable = function (eventId: string) {
    return this.find({
        event: eventId,
        isActive: true,
    }).then((ticketTypes: ITicketType[]) => {
        // Filtrar apenas os que têm estoque disponível
        return ticketTypes.filter((tt: ITicketType) => {
            const available = tt.maxQuantity - tt.soldQuantity;
            return available > 0;
        });
    });
};

// Exportar o modelo
export default mongoose.model<ITicketType>('TicketType', ticketTypeSchema);
