import mongoose, { Document, Schema } from 'mongoose';

// Interface para o documento Event
export interface IEvent extends Document {
    name: string;
    description: string;
    date: Date;
    time?: string; // optional textual time e.g. '20:00'
    location: string;
    address: string;
    city: string;
    state: string;
    price: number;
    capacity: number;
    soldTickets: number;
    ticketFee?: number; // DEPRECATED: Taxa fixa do ingresso (usar platformFeePercentage)
    platformFeePercentage: number; // Taxa percentual da plataforma sobre cada ingresso (ex: 5 = 5%)
    status: 'draft' | 'published' | 'cancelled' | 'finished';
    organizer: mongoose.Types.ObjectId; // Referência ao User
    image?: string;
    coverImage?: string; // 1200x500 PNG URL
    squareImage?: string; // 300x300 PNG URL
    tags: string[];
    isActive: boolean;
    salesClosed: boolean; // Indica se as vendas estão temporariamente desativadas
    deletedAt?: Date; // Data de soft delete (para limpeza periódica)
    createdAt: Date;
    updatedAt: Date;

    // Virtuals
    availableTickets: number;
    isSoldOut: boolean;
    isUpcoming: boolean;
    isPast: boolean;
}

// Schema do evento
const eventSchema = new Schema<IEvent>(
    {
        name: {
            type: String,
            required: [true, 'Nome do evento é obrigatório'],
            trim: true,
            minlength: [3, 'Nome deve ter pelo menos 3 caracteres'],
            maxlength: [200, 'Nome deve ter no máximo 200 caracteres'],
        },
        description: {
            type: String,
            required: [true, 'Descrição é obrigatória'],
            trim: true,
            minlength: [10, 'Descrição deve ter pelo menos 10 caracteres'],
            maxlength: [2000, 'Descrição deve ter no máximo 2000 caracteres'],
        },
        date: {
            type: Date,
            required: [true, 'Data do evento é obrigatória'],
            validate: {
                validator: function (date: Date) {
                    // Comparar apenas a data (sem hora) para permitir eventos no mesmo dia
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const eventDate = new Date(date);
                    eventDate.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                },
                message: 'Data do evento deve ser hoje ou futura',
            },
        },
        location: {
            type: String,
            required: [true, 'Local do evento é obrigatório'],
            trim: true,
            maxlength: [200, 'Local deve ter no máximo 200 caracteres'],
        },
        address: {
            type: String,
            required: [true, 'Endereço é obrigatório'],
            trim: true,
            maxlength: [300, 'Endereço deve ter no máximo 300 caracteres'],
        },
        city: {
            type: String,
            required: [true, 'Cidade é obrigatória'],
            trim: true,
            maxlength: [100, 'Cidade deve ter no máximo 100 caracteres'],
        },
        state: {
            type: String,
            required: [true, 'Estado é obrigatório'],
            trim: true,
            maxlength: [2, 'Estado deve ter 2 caracteres'],
            uppercase: true,
        },
        price: {
            type: Number,
            required: [true, 'Preço é obrigatório'],
            min: [0, 'Preço não pode ser negativo'],
            max: [10000, 'Preço não pode ser maior que R$ 10.000'],
        },
        capacity: {
            type: Number,
            required: [true, 'Capacidade é obrigatória'],
            min: [1, 'Capacidade deve ser pelo menos 1'],
            max: [50000, 'Capacidade não pode ser maior que 50.000'],
        },
        soldTickets: {
            type: Number,
            default: 0,
            min: [0, 'Ingressos vendidos não pode ser negativo'],
        },
        ticketFee: {
            type: Number,
            default: 0,
            min: [0, 'Taxa do ingresso não pode ser negativa'],
            max: [1000, 'Taxa do ingresso não pode ser maior que R$ 1.000'],
            // DEPRECATED: Manter por compatibilidade, usar platformFeePercentage
        },
        platformFeePercentage: {
            type: Number,
            default: 0,
            min: [0, 'Taxa percentual não pode ser negativa'],
            max: [100, 'Taxa percentual não pode ser maior que 100%'],
            validate: {
                validator: function (value: number) {
                    // Validação adicional: garantir que é um número válido e dentro do range
                    if (value === null || value === undefined) return true; // Permite undefined/null (optional)
                    if (typeof value !== 'number' || isNaN(value)) return false;
                    if (value < 0 || value > 100) return false;
                    return true;
                },
                message: 'Taxa percentual deve ser um número entre 0 e 100',
            },
            // Taxa percentual da plataforma sobre cada ingresso (ex: 5 = 5%)
        },
        status: {
            type: String,
            enum: {
                values: ['draft', 'published', 'cancelled', 'finished'],
                message: 'Status deve ser: draft, published, cancelled ou finished',
            },
            default: 'draft',
        },
        organizer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Organizador é obrigatório'],
        },
        image: {
            type: String,
            trim: true,
            match: [/^https?:\/\/.+/, 'URL da imagem deve ser válida'],
        },
        coverImage: {
            type: String,
            trim: true,
            match: [/^https?:\/\/.+/, 'URL da imagem deve ser válida'],
        },
        squareImage: {
            type: String,
            trim: true,
            match: [/^https?:\/\/.+/, 'URL da imagem deve ser válida'],
        },
        tags: [
            {
                type: String,
                trim: true,
                maxlength: [50, 'Tag deve ter no máximo 50 caracteres'],
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        salesClosed: {
            type: Boolean,
            default: false,
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
eventSchema.index({ name: 'text', description: 'text' }); // Text search
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ city: 1, state: 1 });
eventSchema.index({ isActive: 1 });

// Virtual para ingressos disponíveis
eventSchema.virtual('availableTickets').get(function () {
    return Math.max(0, this.capacity - this.soldTickets);
});

// Virtual para verificar se está esgotado
eventSchema.virtual('isSoldOut').get(function () {
    return this.soldTickets >= this.capacity;
});

// Virtual para verificar se é um evento futuro
eventSchema.virtual('isUpcoming').get(function () {
    return this.date > new Date();
});

// Virtual para verificar se é um evento passado
eventSchema.virtual('isPast').get(function () {
    return this.date < new Date();
});

// Middleware para validar capacidade vs vendidos
eventSchema.pre('save', function (next) {
    if (this.soldTickets > this.capacity) {
        next(new Error('Ingressos vendidos não podem ser maiores que a capacidade'));
    } else {
        next();
    }
});

// Static method para buscar eventos por status
eventSchema.statics.findByStatus = function (status: string) {
    return this.find({ status, isActive: true });
};

// Static method para buscar eventos por organizador
eventSchema.statics.findByOrganizer = function (organizerId: string) {
    return this.find({ organizer: organizerId, isActive: true });
};

// Static method para buscar eventos próximos
eventSchema.statics.findUpcoming = function () {
    return this.find({
        date: { $gt: new Date() },
        status: 'published',
        isActive: true,
    }).sort({ date: 1 });
};

// Exportar o modelo
export default mongoose.model<IEvent>('Event', eventSchema);
