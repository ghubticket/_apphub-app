import mongoose, { Document, Schema } from 'mongoose';

// Interface para o documento Order
export interface IOrder extends Document {
    orderNumber: string; // Número único do pedido
    customer: mongoose.Types.ObjectId; // Referência ao User
    event: mongoose.Types.ObjectId; // Referência ao Event
    tickets: mongoose.Types.ObjectId[]; // Array de referências aos Tickets
    totalAmount: number; // Valor total do pedido
    totalTickets: number; // Quantidade total de ingressos
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free'; // VIP não requer pagamento
    paymentId?: string; // ID do pagamento no Mercado Pago
    paymentStatus?: string; // Status do pagamento
    paidAt?: Date; // Data do pagamento
    cancelledAt?: Date; // Data do cancelamento
    refundedAt?: Date; // Data do reembolso
    customerData: {
        name: string;
        email: string;
        phone?: string;
        cpf?: string;
    };
    isActive: boolean;
    deletedAt?: Date; // Data de soft delete (para limpeza periódica)
    createdAt: Date;
    updatedAt: Date;

    // Virtuals
    isPaid: boolean;
    isPending: boolean;
    isCancelled: boolean;
    isRefunded: boolean;
}

// Schema do pedido
const orderSchema = new Schema<IOrder>(
    {
        orderNumber: {
            type: String,
            required: [true, 'Número do pedido é obrigatório'],
            unique: true,
            trim: true,
            length: [10, 'Número do pedido deve ter exatamente 10 caracteres'],
            match: [
                /^[A-Z0-9]{10}$/,
                'Número do pedido deve conter apenas letras maiúsculas e números',
            ],
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Cliente é obrigatório'],
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Evento é obrigatório'],
        },
        tickets: [{
            type: Schema.Types.ObjectId,
            ref: 'Ticket',
        }],
        totalAmount: {
            type: Number,
            required: [true, 'Valor total é obrigatório'],
            min: [0, 'Valor total não pode ser negativo'],
        },
        totalTickets: {
            type: Number,
            required: [true, 'Quantidade de ingressos é obrigatória'],
            min: [1, 'Deve ter pelo menos 1 ingresso'],
            max: [20, 'Máximo de 20 ingressos por pedido'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'paid', 'cancelled', 'refunded'],
                message: 'Status deve ser: pending, paid, cancelled ou refunded',
            },
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['credit_card', 'debit_card', 'pix', 'bank_slip', 'vip_free'],
                message: 'Método de pagamento deve ser: credit_card, debit_card, pix, bank_slip ou vip_free',
            },
            // Não é obrigatório se for VIP (será 'vip_free' automaticamente)
        },
        paymentId: {
            type: String,
            trim: true,
        },
        paymentStatus: {
            type: String,
            trim: true,
        },
        paidAt: {
            type: Date,
        },
        cancelledAt: {
            type: Date,
        },
        refundedAt: {
            type: Date,
        },
        customerData: {
            name: {
                type: String,
                required: [true, 'Nome do cliente é obrigatório'],
                trim: true,
                maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
            },
            email: {
                type: String,
                required: [true, 'Email do cliente é obrigatório'],
                trim: true,
                lowercase: true,
                match: [
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    'Email deve ter um formato válido',
                ],
            },
            phone: {
                type: String,
                trim: true,
                match: [
                    /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                    'Telefone deve estar no formato (11) 99999-9999',
                ],
            },
            cpf: {
                type: String,
                trim: true,
                match: [
                    /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
                    'CPF deve estar no formato 000.000.000-00',
                ],
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
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customer: 1 });
orderSchema.index({ event: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentId: 1 });
orderSchema.index({ isActive: 1 });

// Regras de transição de status
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ['paid', 'cancelled'],
    paid: ['refunded'],
    cancelled: [],
    refunded: [],
};

// Virtual para verificar se foi pago
orderSchema.virtual('isPaid').get(function () {
    return this.status === 'paid';
});

// Virtual para verificar se está pendente
orderSchema.virtual('isPending').get(function () {
    return this.status === 'pending';
});

// Virtual para verificar se foi cancelado
orderSchema.virtual('isCancelled').get(function () {
    return this.status === 'cancelled';
});

// Virtual para verificar se foi reembolsado
orderSchema.virtual('isRefunded').get(function () {
    return this.status === 'refunded';
});

// Middleware para gerar número único do pedido antes de salvar
orderSchema.pre('save', async function (next) {
    if (this.isNew) {
        // Gerar número único do pedido (10 caracteres)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let orderNumber = '';

        for (let i = 0; i < 10; i++) {
            orderNumber += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Verificar se o número já existe (apenas em pedidos não deletados)
        const existingOrder = await mongoose.model('Order').findOne({ 
            orderNumber,
            deletedAt: null,
        });
        if (existingOrder) {
            // Se existir, gerar novo número recursivamente
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newOrderNumber = '';

            for (let i = 0; i < 10; i++) {
                newOrderNumber += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            this.orderNumber = newOrderNumber;
        } else {
            this.orderNumber = orderNumber;
        }
    }
    // Validar transição de status quando não é novo
    if (!this.isNew && this.isModified('status')) {
        const current = await mongoose.model('Order').findById(this._id).select('status').lean() as any;
        const fromStatus = current?.status as string | undefined;
        const toStatus = (this as any).status as string;
        if (fromStatus && toStatus && fromStatus !== toStatus) {
            const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
            if (!allowed.includes(toStatus)) {
                return next(new Error(`Transição de status inválida: ${fromStatus} -> ${toStatus}`));
            }
        }
    }
    next();
});

// Validar transições em operações findOneAndUpdate
orderSchema.pre('findOneAndUpdate', async function (next) {
    const update: any = this.getUpdate() || {};
    const nextStatus = ('status' in update) ? update.status : (update.$set?.status);
    if (!nextStatus) return next();

    const current = await (this as any).model.findOne(this.getQuery()).select('status').lean();
    const fromStatus = current?.status as string | undefined;
    const toStatus = nextStatus as string;
    if (fromStatus && toStatus && fromStatus !== toStatus) {
        const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
        if (!allowed.includes(toStatus)) {
            return next(new Error(`Transição de status inválida: ${fromStatus} -> ${toStatus}`));
        }
    }
    next();
});

// Static method para buscar pedidos por cliente
orderSchema.statics.findByCustomer = function (customerId: string) {
    return this.find({ customer: customerId, isActive: true, deletedAt: null });
};

// Static method para buscar pedidos por evento
orderSchema.statics.findByEvent = function (eventId: string) {
    return this.find({ event: eventId, isActive: true, deletedAt: null });
};

// Static method para buscar pedidos por status
orderSchema.statics.findByStatus = function (status: string) {
    return this.find({ status, isActive: true, deletedAt: null });
};

// Static method para buscar pedido por número
orderSchema.statics.findByOrderNumber = function (orderNumber: string) {
    return this.findOne({ orderNumber, isActive: true, deletedAt: null });
};

// Exportar o modelo
export default mongoose.model<IOrder>('Order', orderSchema);
