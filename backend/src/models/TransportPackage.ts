import mongoose, { Document, Schema } from 'mongoose';
import {
    encryptSensitiveData,
    decryptSensitiveData,
    hashCPFForSearch,
    isEncrypted,
} from '../utils/encryption';

// Interface para o documento TransportPackage
export interface ITransportPackage extends Document {
    code: string; // Código único do pacote (similar ao ticket)
    qrCode: string; // QR Code em base64
    event: mongoose.Types.ObjectId; // Referência ao Event
    order: mongoose.Types.ObjectId; // Referência ao Order
    holder: mongoose.Types.ObjectId; // Referência ao User (dono do pacote)
    
    // Informações do pacote
    eventDate: Date; // Data do evento para este pacote
    departureLocation: {
        name: string; // Ex: "São Paulo - Metrô Barra Funda"
        address: string; // Ex: "Rua Tagipuru, 641"
        meetingTime: string; // Ex: "06:00"
        departureTime: string; // Ex: "06:30"
    };
    packageType: string; // Ex: "TRANSPORTE IDA E VOLTA - SEM OPEN BAR"
    price: number; // Preço pago pelo pacote
    
    // Dados do passageiro
    passengerData: {
        name: string;
        phone: string;
        phoneHash?: string; // Hash SHA-256 do telefone para busca eficiente
        rg: string; // RG do passageiro (criptografado)
        cpf: string; // CPF/Passaporte (criptografado)
        cpfHash?: string; // Hash SHA-256 do CPF para busca eficiente
    };
    
    status: 'pending' | 'confirmed' | 'used' | 'cancelled' | 'refunded';
    usedAt?: Date; // Data/hora de uso
    usedBy?: mongoose.Types.ObjectId; // Quem validou o pacote
    validatedAt?: Date; // Data/hora da validação
    isActive: boolean;
    deletedAt?: Date; // Data de soft delete
    createdAt: Date;
    updatedAt: Date;

    // Virtuals
    isUsed: boolean;
    isPending: boolean;
    isConfirmed: boolean;
    isCancelled: boolean;
}

// Schema do pacote de transporte
const transportPackageSchema = new Schema<ITransportPackage>(
    {
        code: {
            type: String,
            required: [true, 'Código do pacote é obrigatório'],
            unique: true,
            trim: true,
            length: [12, 'Código deve ter exatamente 12 caracteres'],
            match: [/^[A-Z0-9]{12}$/, 'Código deve conter apenas letras maiúsculas e números'],
        },
        qrCode: {
            type: String,
            required: false,
            default: '',
            trim: true,
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Evento é obrigatório'],
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Pedido é obrigatório'],
        },
        holder: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Portador do pacote é obrigatório'],
        },
        eventDate: {
            type: Date,
            required: [true, 'Data do evento é obrigatória'],
        },
        departureLocation: {
            name: {
                type: String,
                required: [true, 'Nome do local de saída é obrigatório'],
                trim: true,
                maxlength: [200, 'Nome do local deve ter no máximo 200 caracteres'],
            },
            address: {
                type: String,
                required: [true, 'Endereço do local de saída é obrigatório'],
                trim: true,
                maxlength: [500, 'Endereço deve ter no máximo 500 caracteres'],
            },
            meetingTime: {
                type: String,
                required: [true, 'Horário de concentração é obrigatório'],
                trim: true,
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'],
            },
            departureTime: {
                type: String,
                required: [true, 'Horário de saída é obrigatório'],
                trim: true,
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'],
            },
        },
        packageType: {
            type: String,
            required: [true, 'Tipo de pacote é obrigatório'],
            trim: true,
            maxlength: [200, 'Tipo de pacote deve ter no máximo 200 caracteres'],
        },
        price: {
            type: Number,
            required: [true, 'Preço é obrigatório'],
            min: [0, 'Preço não pode ser negativo'],
        },
        passengerData: {
            name: {
                type: String,
                required: [true, 'Nome do passageiro é obrigatório'],
                trim: true,
                maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
            },
            phone: {
                type: String,
                required: [true, 'Telefone do passageiro é obrigatório'],
                trim: true,
            },
            phoneHash: {
                type: String,
                index: true,
            },
            rg: {
                type: String,
                required: [true, 'RG do passageiro é obrigatório'],
                trim: true,
            },
            cpf: {
                type: String,
                required: [true, 'CPF/Passaporte do passageiro é obrigatório'],
                trim: true,
            },
            cpfHash: {
                type: String,
                index: true,
            },
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
transportPackageSchema.index({ code: 1 }, { unique: true });
transportPackageSchema.index({ event: 1 });
transportPackageSchema.index({ order: 1 });
transportPackageSchema.index({ holder: 1 });
transportPackageSchema.index({ status: 1 });
transportPackageSchema.index({ eventDate: 1 });
transportPackageSchema.index({ isActive: 1 });
transportPackageSchema.index({ 'passengerData.cpfHash': 1, event: 1 });
transportPackageSchema.index({ 'passengerData.phoneHash': 1, event: 1 });

// Virtual para verificar se foi usado
transportPackageSchema.virtual('isUsed').get(function () {
    return this.status === 'used';
});

// Virtual para verificar se está pendente
transportPackageSchema.virtual('isPending').get(function () {
    return this.status === 'pending';
});

// Virtual para verificar se está confirmado
transportPackageSchema.virtual('isConfirmed').get(function () {
    return this.status === 'confirmed';
});

// Virtual para verificar se foi cancelado
transportPackageSchema.virtual('isCancelled').get(function () {
    return this.status === 'cancelled';
});

// Middleware para gerar código único antes da validação
transportPackageSchema.pre('validate', async function (next) {
    if (this.isNew) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';

        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const existingPackage = await mongoose.model('TransportPackage').findOne({
            code,
            deletedAt: null,
        });
        if (existingPackage) {
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

// Middleware para criptografar dados sensíveis antes de salvar
transportPackageSchema.pre('save', async function (next) {
    try {
        // Criptografar CPF se foi modificado e não está criptografado
        if (this.isModified('passengerData.cpf') && this.passengerData?.cpf) {
            let plainCPF = this.passengerData.cpf;
            if (isEncrypted(this.passengerData.cpf)) {
                plainCPF = decryptSensitiveData(this.passengerData.cpf);
            } else {
                this.passengerData.cpf = encryptSensitiveData(this.passengerData.cpf);
            }
            this.passengerData.cpfHash = hashCPFForSearch(plainCPF);
        }

        // Criptografar RG se foi modificado e não está criptografado
        if (this.isModified('passengerData.rg') && this.passengerData?.rg) {
            if (!isEncrypted(this.passengerData.rg)) {
                this.passengerData.rg = encryptSensitiveData(this.passengerData.rg);
            }
        }

        // Criptografar telefone se foi modificado e não está criptografado
        if (this.isModified('passengerData.phone') && this.passengerData?.phone) {
            let plainPhone = this.passengerData.phone;
            if (isEncrypted(this.passengerData.phone)) {
                plainPhone = decryptSensitiveData(this.passengerData.phone);
            } else {
                this.passengerData.phone = encryptSensitiveData(this.passengerData.phone);
            }
            const { hashPhoneForSearch } = require('../utils/encryption');
            this.passengerData.phoneHash = hashPhoneForSearch(plainPhone);
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

// Middleware para descriptografar dados sensíveis ao buscar
transportPackageSchema.post(['find', 'findOne', 'findOneAndUpdate'], function (docs: any) {
    if (!docs) return;

    const documents = Array.isArray(docs) ? docs : [docs];
    documents.forEach((doc: any) => {
        if (doc && doc.passengerData) {
            if (doc.passengerData.cpf && isEncrypted(doc.passengerData.cpf)) {
                try {
                    doc.passengerData.cpf = decryptSensitiveData(doc.passengerData.cpf);
                } catch (error) {}
            }
            if (doc.passengerData.rg && isEncrypted(doc.passengerData.rg)) {
                try {
                    doc.passengerData.rg = decryptSensitiveData(doc.passengerData.rg);
                } catch (error) {}
            }
            if (doc.passengerData.phone && isEncrypted(doc.passengerData.phone)) {
                try {
                    doc.passengerData.phone = decryptSensitiveData(doc.passengerData.phone);
                } catch (error) {}
            }
            delete doc.passengerData.cpfHash;
            delete doc.passengerData.phoneHash;
        }
    });
});

// Método toJSON para garantir descriptografia
transportPackageSchema.methods.toJSON = function () {
    const packageObject = this.toObject();

    if (packageObject.passengerData) {
        if (packageObject.passengerData.cpf && isEncrypted(packageObject.passengerData.cpf)) {
            try {
                packageObject.passengerData.cpf = decryptSensitiveData(packageObject.passengerData.cpf);
            } catch (error) {}
        }
        if (packageObject.passengerData.rg && isEncrypted(packageObject.passengerData.rg)) {
            try {
                packageObject.passengerData.rg = decryptSensitiveData(packageObject.passengerData.rg);
            } catch (error) {}
        }
        if (packageObject.passengerData.phone && isEncrypted(packageObject.passengerData.phone)) {
            try {
                packageObject.passengerData.phone = decryptSensitiveData(packageObject.passengerData.phone);
            } catch (error) {}
        }
        delete packageObject.passengerData.cpfHash;
        delete packageObject.passengerData.phoneHash;
    }

    return packageObject;
};

// Static methods
transportPackageSchema.statics.findByEvent = function (eventId: string) {
    return this.find({ event: eventId, isActive: true, deletedAt: null });
};

transportPackageSchema.statics.findByOrder = function (orderId: string) {
    return this.find({ order: orderId, isActive: true, deletedAt: null });
};

transportPackageSchema.statics.findByCode = function (code: string) {
    return this.findOne({ code, isActive: true, deletedAt: null });
};

export default mongoose.model<ITransportPackage>('TransportPackage', transportPackageSchema);

