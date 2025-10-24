import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface para o documento User
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'CLIENTE' | 'QRCODE';
    phone?: string;
    cpf?: string;
    isActive: boolean;
    lastLogin?: Date;
    refreshToken?: string;
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
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Email deve ter um formato válido',
            ],
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
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        refreshToken: {
            type: String,
            select: false, // Não incluir refresh token por padrão nas consultas
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

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function (next) {
    // Só faz hash se a senha foi modificada
    if (!this.isModified('password')) return next();

    try {
        // Hash da senha com salt rounds do .env
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Erro ao comparar senhas');
    }
};

// Método para retornar dados seguros (sem senha)
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    delete userObject.publicData; // Remove o virtual para evitar duplicação
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
