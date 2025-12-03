import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
    encryptSensitiveData,
    decryptSensitiveData,
    hashCPFForSearch,
    hashPhoneForSearch,
    isEncrypted,
} from '../utils/encryption';

// Interface para o documento User
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'CLIENTE' | 'QRCODE';
    phone?: string;
    phoneHash?: string; // Hash SHA-256 do telefone para busca eficiente
    cpf?: string;
    cpfHash?: string; // Hash SHA-256 do CPF para busca eficiente
    isActive: boolean;
    deletedAt?: Date; // Data de soft delete (para limpeza periódica)
    lastLogin?: Date;
    refreshToken?: string;
    // Flags de segurança e suspeita
    suspiciousActivityCount?: number; // Contador de tentativas suspeitas
    isSuspicious?: boolean; // Flag manual de usuário suspeito
    suspiciousReason?: string; // Motivo da marcação como suspeito
    lastSuspiciousActivity?: Date; // Última atividade suspeita detectada
    isBlacklisted?: boolean; // Se está na blacklist (bloqueado)
    blacklistReason?: string; // Motivo do bloqueio
    blacklistedAt?: Date; // Quando foi bloqueado
    createdAt: Date;
    updatedAt: Date;

    // Métodos
    comparePassword(candidatePassword: string): Promise<boolean>;
    toJSON(): any;
}

// Schema do usuário
const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Nome é obrigatório'],
            trim: true,
            minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
            maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
        },
        email: {
            type: String,
            required: [true, 'Email é obrigatório'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email deve ter um formato válido'],
        },
        password: {
            type: String,
            required: [true, 'Senha é obrigatória'],
            minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
            select: false, // Não incluir senha por padrão nas consultas
        },
        role: {
            type: String,
            enum: {
                values: ['ADMIN', 'CLIENTE', 'QRCODE'],
                message: 'Role deve ser: ADMIN, CLIENTE ou QRCODE',
            },
            default: 'CLIENTE',
        },
        phone: {
            type: String,
            trim: true,
            match: [/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (11) 99999-9999'],
            select: false, // Não incluir por padrão (dados sensíveis)
        },
        phoneHash: {
            type: String,
            index: true, // Índice para busca eficiente
            select: false, // Não incluir por padrão
        },
        cpf: {
            type: String,
            trim: true,
            match: [/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00'],
            select: false, // Não incluir por padrão (dados sensíveis)
        },
        cpfHash: {
            type: String,
            index: true, // Índice para busca eficiente
            select: false, // Não incluir por padrão
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
        lastLogin: {
            type: Date,
        },
        refreshToken: {
            type: String,
            select: false, // Não incluir refresh token por padrão nas consultas
        },
        // Flags de segurança e suspeita
        suspiciousActivityCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        isSuspicious: {
            type: Boolean,
            default: false,
            index: true, // Índice para buscar usuários suspeitos
        },
        suspiciousReason: {
            type: String,
        },
        lastSuspiciousActivity: {
            type: Date,
        },
        isBlacklisted: {
            type: Boolean,
            default: false,
            index: true, // Índice para buscar usuários bloqueados
        },
        blacklistReason: {
            type: String,
        },
        blacklistedAt: {
            type: Date,
        },
    },
    {
        timestamps: true, // Adiciona createdAt e updatedAt automaticamente
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Índices para performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ cpfHash: 1 }); // Índice para busca por CPF via hash
userSchema.index({ phoneHash: 1 }); // Índice para busca por telefone via hash

// Middleware para hash da senha e criptografia de dados sensíveis antes de salvar
userSchema.pre('save', async function (next) {
    try {
        // Hash da senha se foi modificada
        if (this.isModified('password')) {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
            this.password = await bcrypt.hash(this.password, saltRounds);
        }

        // Criptografar CPF se foi modificado e não está criptografado
        if (this.isModified('cpf') && this.cpf) {
            // Se já está criptografado, descriptografar temporariamente para gerar hash
            let plainCPF = this.cpf;
            if (isEncrypted(this.cpf)) {
                plainCPF = decryptSensitiveData(this.cpf);
            } else {
                // Se não está criptografado, criptografar agora
                this.cpf = encryptSensitiveData(this.cpf);
            }
            // Sempre atualizar hash para busca (hashCPFForSearch aceita qualquer formato e normaliza internamente)
            this.cpfHash = hashCPFForSearch(plainCPF);
        } else if (this.isModified('cpf') && !this.cpf) {
            // Se CPF foi removido, limpar hash também
            this.cpfHash = undefined;
        }

        // Criptografar telefone se foi modificado e não está criptografado
        if (this.isModified('phone') && this.phone) {
            // Se já está criptografado, descriptografar temporariamente para gerar hash
            let plainPhone = this.phone;
            if (isEncrypted(this.phone)) {
                plainPhone = decryptSensitiveData(this.phone);
            } else {
                // Se não está criptografado, criptografar agora
                this.phone = encryptSensitiveData(this.phone);
            }
            // Sempre atualizar hash para busca (hashPhoneForSearch aceita qualquer formato e normaliza internamente)
            this.phoneHash = hashPhoneForSearch(plainPhone);
        } else if (this.isModified('phone') && !this.phone) {
            // Se telefone foi removido, limpar hash também
            this.phoneHash = undefined;
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Erro ao comparar senhas');
    }
};

// Middleware para descriptografar dados sensíveis ao buscar
userSchema.post(['find', 'findOne', 'findOneAndUpdate'], function (docs: any) {
    if (!docs) return;

    const documents = Array.isArray(docs) ? docs : [docs];
    documents.forEach((doc: any) => {
        if (doc && doc.cpf && isEncrypted(doc.cpf)) {
            try {
                doc.cpf = decryptSensitiveData(doc.cpf);
            } catch (error) {}
        }
        if (doc && doc.phone && isEncrypted(doc.phone)) {
            try {
                doc.phone = decryptSensitiveData(doc.phone);
            } catch (error) {}
        }
    });
});

// Método para retornar dados seguros (sem senha e com dados sensíveis descriptografados)
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    delete userObject.publicData; // Remove o virtual para evitar duplicação
    delete userObject.cpfHash; // Não expor hash
    delete userObject.phoneHash; // Não expor hash

    // Descriptografar dados sensíveis se estiverem criptografados
    if (userObject.cpf && isEncrypted(userObject.cpf)) {
        try {
            userObject.cpf = decryptSensitiveData(userObject.cpf);
        } catch (error) {}
    }
    if (userObject.phone && isEncrypted(userObject.phone)) {
        try {
            userObject.phone = decryptSensitiveData(userObject.phone);
        } catch (error) {}
    }

    return userObject;
};

// Virtual para dados públicos do usuário
userSchema.virtual('publicData').get(function () {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        phone: this.phone,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt,
    };
});

// Middleware para atualizar lastLogin
userSchema.methods.updateLastLogin = function () {
    this.lastLogin = new Date();
    return this.save();
};

// Static method para buscar usuário por email
userSchema.statics.findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

// Static method para buscar usuários ativos
userSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};

// Exportar o modelo
export default mongoose.model<IUser>('User', userSchema);
