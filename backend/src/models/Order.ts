import mongoose, { Document, Schema } from 'mongoose';
import {
    encryptSensitiveData,
    decryptSensitiveData,
    hashCPFForSearch,
    hashPhoneForSearch,
    isEncrypted,
} from '../utils/encryption';

// Interface para o documento Order
export interface IOrder extends Document {
    orderNumber: string; // Número único do pedido
    customer: mongoose.Types.ObjectId; // Referência ao User
    event: mongoose.Types.ObjectId; // Referência ao Event
    tickets: mongoose.Types.ObjectId[]; // Array de referências aos Tickets
    subtotal: number; // Valor do pedido sem taxa (valor dos ingressos)
    discountAmount?: number; // Valor do desconto aplicado (se houver código de promotor)
    platformFee: number; // Taxa da plataforma calculada (sobre subtotal - desconto)
    totalAmount: number; // Valor total do pedido (subtotal - desconto + platformFee)
    promoterCode?: string; // Código de promotor usado (se houver)
    totalTickets: number; // Quantidade total de ingressos
    status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'failed';
    paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free'; // VIP não requer pagamento
    paymentId?: string; // ID do pagamento no Mercado Pago
    paymentOrderId?: string; // ID da Order no Mercado Pago (Orders API)
    paymentStatus?: string; // Status do pagamento (status principal)
    paymentStatusDetail?: string; // Status detalhado (status_detail)
    paymentMessage?: string; // Mensagem amigável para o usuário
    paymentAdminMessage?: string; // Mensagem detalhada para admin
    paymentErrorCode?: string; // Código de erro (se houver)
    paymentErrorDescription?: string; // Descrição do erro (se houver)
    paidAt?: Date; // Data do pagamento
    cancelledAt?: Date; // Data do cancelamento
    refundedAt?: Date; // Data do reembolso
    expiresAt?: Date; // Data de expiração do pedido (quando status='pending', reserva de ingressos)
    customerData: {
        name: string;
        email: string;
        phone?: string;
        phoneHash?: string; // Hash SHA-256 do telefone para busca eficiente
        cpf?: string;
        cpfHash?: string; // Hash SHA-256 do CPF para busca eficiente
    };
    ipAddress?: string; // IP de onde o pedido foi criado (para detecção de padrões suspeitos)
    isActive: boolean;
    cardAttempts: number;
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
        tickets: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Ticket',
            },
        ],
        subtotal: {
            type: Number,
            required: [true, 'Subtotal é obrigatório'],
            min: [0, 'Subtotal não pode ser negativo'],
            default: 0,
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: [0, 'Desconto não pode ser negativo'],
        },
        platformFee: {
            type: Number,
            required: [true, 'Taxa da plataforma é obrigatória'],
            min: [0, 'Taxa da plataforma não pode ser negativa'],
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: [true, 'Valor total é obrigatório'],
            min: [0, 'Valor total não pode ser negativo'],
        },
        promoterCode: {
            type: String,
            trim: true,
            uppercase: true,
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
                values: ['pending', 'paid', 'cancelled', 'refunded', 'failed'],
                message: 'Status deve ser: pending, paid, cancelled ou refunded',
            },
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['credit_card', 'debit_card', 'pix', 'bank_slip', 'vip_free'],
                message:
                    'Método de pagamento deve ser: credit_card, debit_card, pix, bank_slip ou vip_free',
            },
            // Não é obrigatório se for VIP (será 'vip_free' automaticamente)
        },
        paymentId: {
            type: String,
            trim: true,
        },
        paymentOrderId: {
            type: String,
            trim: true,
        },
        paymentStatus: {
            type: String,
            trim: true,
        },
        paymentStatusDetail: {
            type: String,
            trim: true,
        },
        paymentMessage: {
            type: String,
            trim: true,
            maxlength: [500, 'Mensagem deve ter no máximo 500 caracteres'],
        },
        paymentAdminMessage: {
            type: String,
            trim: true,
            maxlength: [1000, 'Mensagem admin deve ter no máximo 1000 caracteres'],
        },
        paymentErrorCode: {
            type: String,
            trim: true,
        },
        paymentErrorDescription: {
            type: String,
            trim: true,
            maxlength: [1000, 'Descrição do erro deve ter no máximo 1000 caracteres'],
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
        expiresAt: {
            type: Date,
            index: true, // Índice para facilitar queries de expiração
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
                match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email deve ter um formato válido'],
            },
            phone: {
                type: String,
                trim: true,
                // IMPORTANTE:
                // Não aplicar regex de validação aqui, pois o valor pode estar criptografado
                // (quando ENCRYPTION_KEY está configurada) ou em formato plain (para compatibilidade).
                // A validação de formato é feita nas camadas de serviço/controlador e no frontend.
            },
            phoneHash: {
                type: String,
                index: true, // Índice para busca eficiente
            },
            cpf: {
                type: String,
                trim: true,
                // IMPORTANTE:
                // Não aplicar regex de validação aqui, pois o valor pode estar criptografado
                // (quando ENCRYPTION_KEY está configurada) ou em formato plain (para compatibilidade).
                // A validação de formato é feita nas camadas de serviço/controlador e no frontend.
            },
            cpfHash: {
                type: String,
                index: true, // Índice para busca eficiente
            },
        },
        ipAddress: {
            type: String,
            trim: true,
            index: true, // Índice para queries de detecção de padrões suspeitos
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        cardAttempts: {
            type: Number,
            default: 0,
            min: 0,
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
orderSchema.index({ status: 1, expiresAt: 1 }); // Índice composto para queries de expiração
// Índice composto otimizado para orderExpirationService (status + deletedAt + expiresAt)
orderSchema.index({ status: 1, deletedAt: 1, expiresAt: 1 });
// Índice composto para busca de pedidos pendentes por evento
orderSchema.index({ event: 1, status: 1, deletedAt: 1 });
// Índice composto para busca de pedidos existentes (event + customer + status)
orderSchema.index({ event: 1, customer: 1, status: 1 });
// Índice composto para busca de pedidos por email e evento
orderSchema.index({ event: 1, 'customerData.email': 1, status: 1 });
orderSchema.index({ paymentId: 1 });
orderSchema.index({ isActive: 1 });
orderSchema.index({ cardAttempts: 1 });
// Índices para validação de limites por CPF/Email (usando hash para busca eficiente)
orderSchema.index({ 'customerData.cpfHash': 1, event: 1, status: 1 });
orderSchema.index({ 'customerData.email': 1, event: 1, status: 1 });

// Regras de transição de status
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ['paid', 'cancelled', 'failed'],
    paid: ['refunded'],
    cancelled: [],
    refunded: [],
    failed: ['pending', 'paid'], // Permitir retentar pagamento: failed -> pending ou failed -> paid
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

orderSchema.virtual('isFailed').get(function () {
    return this.status === 'failed';
});

// Middleware para gerar número único do pedido e criptografar dados sensíveis antes de salvar
orderSchema.pre('save', async function (next) {
    try {
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
            const current = (await mongoose
                .model('Order')
                .findById(this._id)
                .select('status')
                .lean()) as any;
            const fromStatus = current?.status as string | undefined;
            const toStatus = (this as any).status as string;
            if (fromStatus && toStatus && fromStatus !== toStatus) {
                const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
                if (!allowed.includes(toStatus)) {
                    return next(
                        new Error(`Transição de status inválida: ${fromStatus} -> ${toStatus}`)
                    );
                }
            }
        }

        // Criptografar CPF em customerData se foi modificado e não está criptografado
        if (this.isModified('customerData.cpf') && this.customerData?.cpf) {
            // Se já está criptografado, descriptografar temporariamente para gerar hash
            let plainCPF = this.customerData.cpf;
            if (isEncrypted(this.customerData.cpf)) {
                plainCPF = decryptSensitiveData(this.customerData.cpf);
            } else {
                // Se não está criptografado, criptografar agora
                this.customerData.cpf = encryptSensitiveData(this.customerData.cpf);
            }
            // Sempre atualizar hash para busca (usando CPF descriptografado)
            this.customerData.cpfHash = hashCPFForSearch(plainCPF);
        } else if (this.isModified('customerData.cpf') && !this.customerData?.cpf) {
            // Se CPF foi removido, limpar hash também
            if (this.customerData) {
                this.customerData.cpfHash = undefined;
            }
        }

        // Criptografar telefone em customerData se foi modificado e não está criptografado
        if (this.isModified('customerData.phone') && this.customerData?.phone) {
            // Se já está criptografado, descriptografar temporariamente para gerar hash
            let plainPhone = this.customerData.phone;
            if (isEncrypted(this.customerData.phone)) {
                plainPhone = decryptSensitiveData(this.customerData.phone);
            } else {
                // Se não está criptografado, criptografar agora
                this.customerData.phone = encryptSensitiveData(this.customerData.phone);
            }
            // Sempre atualizar hash para busca (usando telefone descriptografado)
            this.customerData.phoneHash = hashPhoneForSearch(plainPhone);
        } else if (this.isModified('customerData.phone') && !this.customerData?.phone) {
            // Se telefone foi removido, limpar hash também
            if (this.customerData) {
                this.customerData.phoneHash = undefined;
            }
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

// Validar transições em operações findOneAndUpdate
orderSchema.pre('findOneAndUpdate', async function (next) {
    const update: any = this.getUpdate() || {};
    const nextStatus = 'status' in update ? update.status : update.$set?.status;
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

// Middleware para descriptografar dados sensíveis ao buscar
orderSchema.post(['find', 'findOne', 'findOneAndUpdate'], function (docs: any) {
    if (!docs) return;

    const documents = Array.isArray(docs) ? docs : [docs];
    documents.forEach((doc: any) => {
        if (doc && doc.customerData) {
            // Descriptografar CPF
            if (doc.customerData.cpf && isEncrypted(doc.customerData.cpf)) {
                try {
                    doc.customerData.cpf = decryptSensitiveData(doc.customerData.cpf);
                } catch (error) {
                    console.error('Erro ao descriptografar CPF do pedido:', error);
                }
            }
            // Descriptografar telefone
            if (doc.customerData.phone && isEncrypted(doc.customerData.phone)) {
                try {
                    doc.customerData.phone = decryptSensitiveData(doc.customerData.phone);
                } catch (error) {
                    console.error('Erro ao descriptografar telefone do pedido:', error);
                }
            }
            // Não expor hashes
            delete doc.customerData.cpfHash;
            delete doc.customerData.phoneHash;
        }
    });
});

// Método toJSON para garantir descriptografia
orderSchema.methods.toJSON = function () {
    const orderObject = this.toObject();

    // Descriptografar dados sensíveis se estiverem criptografados
    if (orderObject.customerData) {
        if (orderObject.customerData.cpf && isEncrypted(orderObject.customerData.cpf)) {
            try {
                orderObject.customerData.cpf = decryptSensitiveData(orderObject.customerData.cpf);
            } catch (error) {
                console.error('Erro ao descriptografar CPF no toJSON:', error);
            }
        }
        if (orderObject.customerData.phone && isEncrypted(orderObject.customerData.phone)) {
            try {
                orderObject.customerData.phone = decryptSensitiveData(
                    orderObject.customerData.phone
                );
            } catch (error) {
                console.error('Erro ao descriptografar telefone no toJSON:', error);
            }
        }
        // Não expor hashes
        delete orderObject.customerData.cpfHash;
        delete orderObject.customerData.phoneHash;
    }

    return orderObject;
};

// Exportar o modelo
export default mongoose.model<IOrder>('Order', orderSchema);
