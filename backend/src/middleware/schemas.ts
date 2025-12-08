import Joi from 'joi';

/**
 * Schemas de validação para autenticação
 */

// Schema para registro de usuário
export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório',
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório',
    }),
    password: Joi.string().min(6).max(128).required().messages({
        'string.min': 'Senha deve ter pelo menos 6 caracteres',
        'string.max': 'Senha deve ter no máximo 128 caracteres',
        'any.required': 'Senha é obrigatória',
    }),
    phone: Joi.string()
        .pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Telefone deve estar no formato (11) 99999-9999',
        }),
    cpf: Joi.string()
        .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
        .optional()
        .messages({
            'string.pattern.base': 'CPF deve estar no formato 000.000.000-00',
        }),
});

// Schema para login
export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Senha é obrigatória',
    }),
});

// Schema para atualização de perfil
export const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(100).trim().optional().messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
    }),
    phone: Joi.string()
        .pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
        .optional()
        .allow('')
        .messages({
            'string.pattern.base': 'Telefone deve estar no formato (11) 99999-9999',
        }),
    cpf: Joi.string()
        .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
        .optional()
        .allow('')
        .messages({
            'string.pattern.base': 'CPF deve estar no formato 000.000.000-00',
        }),
});

// Schema para mudança de senha
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Senha atual é obrigatória',
    }),
    newPassword: Joi.string().min(6).max(128).required().messages({
        'string.min': 'Nova senha deve ter pelo menos 6 caracteres',
        'string.max': 'Nova senha deve ter no máximo 128 caracteres',
        'any.required': 'Nova senha é obrigatória',
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Confirmação de senha deve ser igual à nova senha',
        'any.required': 'Confirmação de senha é obrigatória',
    }),
});

// Schema para esqueci minha senha (iniciar reset)
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório',
    }),
});

// Schema para redefinir senha com token
export const resetPasswordSchema = Joi.object({
    token: Joi.string().min(16).max(256).required().messages({
        'string.min': 'Token inválido',
        'any.required': 'Token é obrigatório',
    }),
    newPassword: Joi.string().min(6).max(128).required().messages({
        'string.min': 'Nova senha deve ter pelo menos 6 caracteres',
        'string.max': 'Nova senha deve ter no máximo 128 caracteres',
        'any.required': 'Nova senha é obrigatória',
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Confirmação de senha deve ser igual à nova senha',
        'any.required': 'Confirmação de senha é obrigatória',
    }),
});

// Schema para parâmetros de URL (ID)
export const idParamSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'ID deve ser um ObjectId válido',
            'any.required': 'ID é obrigatório',
        }),
});

// Schema para paginação
export const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Página deve ser um número',
        'number.integer': 'Página deve ser um número inteiro',
        'number.min': 'Página deve ser pelo menos 1',
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
        'number.base': 'Limite deve ser um número',
        'number.integer': 'Limite deve ser um número inteiro',
        'number.min': 'Limite deve ser pelo menos 1',
        'number.max': 'Limite deve ser no máximo 100',
    }),
});

// Schema para busca
export const searchSchema = Joi.object({
    q: Joi.string().min(1).max(100).trim().optional().messages({
        'string.min': 'Termo de busca deve ter pelo menos 1 caractere',
        'string.max': 'Termo de busca deve ter no máximo 100 caracteres',
    }),
    sort: Joi.string()
        .valid('name', 'email', 'createdAt', '-name', '-email', '-createdAt')
        .default('-createdAt')
        .messages({
            'any.only': 'Ordenação deve ser: name, email, createdAt, -name, -email ou -createdAt',
        }),
});

export const newsletterSubscriptionSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório',
    }),
    name: Joi.string().max(120).trim().optional().allow('', null).messages({
        'string.max': 'Nome não pode ultrapassar 120 caracteres',
    }),
    source: Joi.string().max(60).trim().optional().messages({
        'string.max': 'Fonte não pode ultrapassar 60 caracteres',
    }),
});

// Schema para solicitação de suporte
export const supportRequestSchema = Joi.object({
    category: Joi.string()
        .valid('general', 'payment', 'tickets', 'account', 'technical', 'refund')
        .required()
        .messages({
            'any.only': 'Categoria deve ser: general, payment, tickets, account, technical ou refund',
            'any.required': 'Categoria é obrigatória',
        }),
    subject: Joi.string().min(3).max(200).trim().required().messages({
        'string.min': 'Assunto deve ter pelo menos 3 caracteres',
        'string.max': 'Assunto deve ter no máximo 200 caracteres',
        'any.required': 'Assunto é obrigatório',
    }),
    message: Joi.string().min(10).max(5000).trim().required().messages({
        'string.min': 'Mensagem deve ter pelo menos 10 caracteres',
        'string.max': 'Mensagem deve ter no máximo 5000 caracteres',
        'any.required': 'Mensagem é obrigatória',
    }),
});
