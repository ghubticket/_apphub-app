import mongoose, { Document, Schema } from 'mongoose';

// Interface para o documento PromoterCode
export interface IPromoterCode extends Document {
    code: string; // Código único (ex: "GUILHERME123")
    name: string; // Nome do promotor
    cpf: string; // CPF do promotor
    email: string; // Email de contato
    whatsapp: string; // WhatsApp de contato
    discountType: 'percentage' | 'fixed'; // Tipo de desconto
    discountValue: number; // Valor do desconto (5 = 5% ou R$ 5,00)
    currentUses: number; // Contador de usos
    isActive: boolean; // Ativo/Desativado
    events: mongoose.Types.ObjectId[]; // Array de eventos associados
    createdBy: mongoose.Types.ObjectId; // Admin que criou
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date; // Soft delete
}

// Schema do código de promotor
const promoterCodeSchema = new Schema<IPromoterCode>(
    {
        code: {
            type: String,
            required: [true, 'Código é obrigatório'],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [3, 'Código deve ter pelo menos 3 caracteres'],
            maxlength: [50, 'Código deve ter no máximo 50 caracteres'],
            match: [/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números'],
        },
        name: {
            type: String,
            required: [true, 'Nome do promotor é obrigatório'],
            trim: true,
            minlength: [3, 'Nome deve ter pelo menos 3 caracteres'],
            maxlength: [200, 'Nome deve ter no máximo 200 caracteres'],
        },
        cpf: {
            type: String,
            required: [true, 'CPF é obrigatório'],
            trim: true,
            match: [/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00'],
        },
        email: {
            type: String,
            required: [true, 'Email é obrigatório'],
            trim: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Email deve ter um formato válido',
            ],
        },
        whatsapp: {
            type: String,
            required: [true, 'WhatsApp é obrigatório'],
            trim: true,
            match: [
                /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
                'WhatsApp deve estar no formato (11) 99999-9999',
            ],
        },
        discountType: {
            type: String,
            enum: {
                values: ['percentage', 'fixed'],
                message: 'Tipo de desconto deve ser: percentage ou fixed',
            },
            required: [true, 'Tipo de desconto é obrigatório'],
        },
        discountValue: {
            type: Number,
            required: [true, 'Valor do desconto é obrigatório'],
            min: [0, 'Valor do desconto não pode ser negativo'],
            validate: {
                validator: function (value: number) {
                    if (this.discountType === 'percentage') {
                        return value >= 0 && value <= 100;
                    }
                    return value >= 0;
                },
                message: 'Desconto percentual deve ser entre 0 e 100, desconto fixo deve ser >= 0',
            },
        },
        currentUses: {
            type: Number,
            default: 0,
            min: [0, 'Contador de usos não pode ser negativo'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        events: [{
            type: Schema.Types.ObjectId,
            ref: 'Event',
        }],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Usuário que criou é obrigatório'],
        },
        deletedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Índices para performance
promoterCodeSchema.index({ code: 1 }, { unique: true });
promoterCodeSchema.index({ isActive: 1 });
promoterCodeSchema.index({ events: 1 });
promoterCodeSchema.index({ createdBy: 1 });
promoterCodeSchema.index({ deletedAt: 1 });

// Middleware para garantir código único (incluindo soft delete)
promoterCodeSchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('code')) {
        const existing = await mongoose.model('PromoterCode').findOne({
            code: this.code,
            deletedAt: null,
            _id: { $ne: this._id },
        });
        if (existing) {
            return next(new Error('Código já existe'));
        }
    }
    next();
});

// Tipos para métodos estáticos (opcional, não são usados no código atual)
// interface PromoterCodeModel extends mongoose.Model<IPromoterCode> {
//     findByCode(code: string): Promise<IPromoterCode | null>;
//     validateForEvent(code: string, eventId: string): Promise<IPromoterCode | null>;
// }

// Exportar o modelo
export default mongoose.model<IPromoterCode>('PromoterCode', promoterCodeSchema);

