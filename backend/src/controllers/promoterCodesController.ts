import { Request, Response } from 'express';
import { PromoterCode, Order, Event } from '../models';
import mongoose from 'mongoose';
import { captureControllerError } from '../utils/sentryErrorHandler';

/**
 * Criar novo código de promotor
 */
export const createPromoterCode = async (req: Request, res: Response) => {
    try {
        const { code, name, cpf, email, whatsapp, discountType, discountValue, events, isActive } =
            req.body;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        // Validações básicas
        if (
            !code ||
            !name ||
            !cpf ||
            !email ||
            !whatsapp ||
            !discountType ||
            discountValue === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos',
                errors: [
                    'Código, nome, CPF, email, WhatsApp, tipo e valor de desconto são obrigatórios',
                ],
            });
        }

        // Validar tipo de desconto
        if (!['percentage', 'fixed'].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de desconto inválido',
                errors: ['Tipo deve ser "percentage" ou "fixed"'],
            });
        }

        // Validar valor do desconto
        if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Valor de desconto inválido',
                errors: ['Desconto percentual deve estar entre 0 e 100'],
            });
        }

        if (discountType === 'fixed' && discountValue < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valor de desconto inválido',
                errors: ['Desconto fixo não pode ser negativo'],
            });
        }

        // Verificar se código já existe
        const existingCode = await PromoterCode.findOne({
            code: code.toUpperCase().trim(),
            deletedAt: null,
        });

        if (existingCode) {
            return res.status(400).json({
                success: false,
                message: 'Código já existe',
                errors: ['Este código já está cadastrado'],
            });
        }

        // Criar código
        const promoterCode = new PromoterCode({
            code: code.toUpperCase().trim(),
            name: name.trim(),
            cpf: cpf.trim(),
            email: email.toLowerCase().trim(),
            whatsapp: whatsapp.trim(),
            discountType,
            discountValue: Number(discountValue),
            currentUses: 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            events: Array.isArray(events)
                ? events.map((id: string) => new mongoose.Types.ObjectId(id))
                : [],
            createdBy: userId,
        });

        await promoterCode.save();

        // Popular eventos para resposta
        const populated = await PromoterCode.findById(promoterCode._id)
            .populate('events', 'name date')
            .populate('createdBy', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Código de promotor criado com sucesso',
            data: populated,
        });
    } catch (error: any) {
        console.error('Erro ao criar código de promotor:', error);
        
        // Se for erro de validação, não enviar ao Sentry
        if (error.name === 'ValidationError' || error.code === 11000) {
            const errorMessage = error.errors
                ? Object.values(error.errors)
                      .map((e: any) => e.message)
                      .join(', ')
                : error.message;
            return res.status(400).json({
                success: false,
                message: 'Erro ao criar código de promotor',
                errors: [errorMessage],
            });
        }
        
        // Erro inesperado - enviar ao Sentry
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'createPromoterCode',
            statusCode: 500,
        });
        
        const errorMessage = error.errors
            ? Object.values(error.errors)
                  .map((e: any) => e.message)
                  .join(', ')
            : error.message;
        res.status(500).json({
            success: false,
            message: 'Erro ao criar código de promotor',
            errors: [errorMessage],
        });
    }
};

/**
 * Listar códigos de promotor (apenas ADMIN)
 */
export const listPromoterCodes = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search = '', eventId, isActive } = req.query;

        const filters: any = { deletedAt: null };

        // Busca por código ou nome
        if (search) {
            filters.$or = [
                { code: { $regex: String(search), $options: 'i' } },
                { name: { $regex: String(search), $options: 'i' } },
                { email: { $regex: String(search), $options: 'i' } },
            ];
        }

        // Filtro por evento
        if (eventId) {
            filters.events = new mongoose.Types.ObjectId(eventId as string);
        }

        // Filtro por status
        if (isActive !== undefined) {
            filters.isActive = isActive === 'true';
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [codes, total] = await Promise.all([
            PromoterCode.find(filters)
                .populate('events', 'name date')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            PromoterCode.countDocuments(filters),
        ]);

        res.json({
            success: true,
            data: {
                codes,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        console.error('Erro ao listar códigos de promotor:', error);
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'listPromoterCodes',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao listar códigos de promotor',
            errors: [error.message],
        });
    }
};

/**
 * Buscar código por ID
 */
export const getPromoterCodeById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const code = await PromoterCode.findOne({
            _id: id,
            deletedAt: null,
        })
            .populate('events', 'name date location')
            .populate('createdBy', 'name email')
            .lean();

        if (!code) {
            return res.status(404).json({
                success: false,
                message: 'Código de promotor não encontrado',
            });
        }

        res.json({
            success: true,
            data: code,
        });
    } catch (error: any) {
        console.error('Erro ao buscar código de promotor:', error);
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'getPromoterCode',
            statusCode: 500,
            extra: {
                codeId: req.params?.id,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar código de promotor',
            errors: [error.message],
        });
    }
};

/**
 * Atualizar código de promotor
 */
export const updatePromoterCode = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates: any = { ...req.body };

        // Se código está sendo atualizado, verificar duplicata
        if (updates.code) {
            updates.code = updates.code.toUpperCase().trim();
            const existing = await PromoterCode.findOne({
                code: updates.code,
                deletedAt: null,
                _id: { $ne: id },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Código já existe',
                    errors: ['Este código já está cadastrado'],
                });
            }
        }

        // Validar desconto se fornecido
        if (updates.discountType && updates.discountValue !== undefined) {
            if (
                updates.discountType === 'percentage' &&
                (updates.discountValue < 0 || updates.discountValue > 100)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Valor de desconto inválido',
                    errors: ['Desconto percentual deve estar entre 0 e 100'],
                });
            }
        }

        // Converter eventos para ObjectId se fornecido
        if (updates.events && Array.isArray(updates.events)) {
            updates.events = updates.events.map((id: string) => new mongoose.Types.ObjectId(id));
        }

        const code = await PromoterCode.findOneAndUpdate({ _id: id, deletedAt: null }, updates, {
            new: true,
            runValidators: true,
        })
            .populate('events', 'name date')
            .populate('createdBy', 'name email')
            .lean();

        if (!code) {
            return res.status(404).json({
                success: false,
                message: 'Código de promotor não encontrado',
            });
        }

        res.json({
            success: true,
            message: 'Código de promotor atualizado com sucesso',
            data: code,
        });
    } catch (error: any) {
        console.error('Erro ao atualizar código de promotor:', error);
        
        // Se for erro de validação, não enviar ao Sentry
        if (error.name === 'ValidationError' || error.code === 11000) {
            const errorMessage = error.errors
                ? Object.values(error.errors)
                      .map((e: any) => e.message)
                      .join(', ')
                : error.message;
            return res.status(400).json({
                success: false,
                message: 'Erro ao atualizar código de promotor',
                errors: [errorMessage],
            });
        }
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'updatePromoterCode',
            statusCode: 500,
            extra: {
                codeId: req.params?.id,
            },
        });
        
        const errorMessage = error.errors
            ? Object.values(error.errors)
                  .map((e: any) => e.message)
                  .join(', ')
            : error.message;
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar código de promotor',
            errors: [errorMessage],
        });
    }
};

/**
 * Desativar/Ativar código (toggle)
 */
export const togglePromoterCode = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const code = await PromoterCode.findOne({ _id: id, deletedAt: null });
        if (!code) {
            return res.status(404).json({
                success: false,
                message: 'Código de promotor não encontrado',
            });
        }

        code.isActive = !code.isActive;
        await code.save();

        res.json({
            success: true,
            message: `Código ${code.isActive ? 'ativado' : 'desativado'} com sucesso`,
            data: code,
        });
    } catch (error: any) {
        console.error('Erro ao alterar status do código:', error);
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'togglePromoterCodeStatus',
            statusCode: 500,
            extra: {
                codeId: req.params?.id,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar status do código',
            errors: [error.message],
        });
    }
};

/**
 * Deletar código (soft delete)
 */
export const deletePromoterCode = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const code = await PromoterCode.findOne({ _id: id, deletedAt: null });
        if (!code) {
            return res.status(404).json({
                success: false,
                message: 'Código de promotor não encontrado',
            });
        }

        code.deletedAt = new Date();
        await code.save();

        res.json({
            success: true,
            message: 'Código de promotor removido com sucesso',
        });
    } catch (error: any) {
        console.error('Erro ao deletar código de promotor:', error);
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'deletePromoterCode',
            statusCode: 500,
            extra: {
                codeId: req.params?.id,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar código de promotor',
            errors: [error.message],
        });
    }
};

/**
 * Validar código para evento (público - usado no checkout)
 */
export const validatePromoterCode = async (req: Request, res: Response) => {
    try {
        const { code, eventId } = req.query;

        if (!code || !eventId) {
            return res.status(400).json({
                success: false,
                message: 'Código e ID do evento são obrigatórios',
            });
        }

        const promoterCode = await PromoterCode.findOne({
            code: String(code).toUpperCase().trim(),
            isActive: true,
            deletedAt: null,
            events: new mongoose.Types.ObjectId(String(eventId)),
        }).lean();

        if (!promoterCode) {
            return res.json({
                success: false,
                valid: false,
                message: 'Código inválido ou não válido para este evento',
            });
        }

        // Calcular valor do desconto (será aplicado no frontend/backend)
        // Por enquanto, retornar apenas os dados do desconto
        res.json({
            success: true,
            valid: true,
            data: {
                code: promoterCode.code,
                discountType: promoterCode.discountType,
                discountValue: promoterCode.discountValue,
                // O cálculo do desconto será feito no backend quando criar o pedido
            },
        });
    } catch (error: any) {
        console.error('Erro ao validar código:', error);
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'validatePromoterCode',
            statusCode: 500,
            extra: {
                code: req.body?.code,
            },
        });
        
        res.status(500).json({
            success: false,
            valid: false,
            message: 'Erro ao validar código',
            errors: [error.message],
        });
    }
};

/**
 * Estatísticas de código de promotor
 */
export const getPromoterCodeStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const code = await PromoterCode.findOne({ _id: id, deletedAt: null });
        if (!code) {
            return res.status(404).json({
                success: false,
                message: 'Código de promotor não encontrado',
            });
        }

        // Buscar pedidos com este código
        const orders = await Order.find({
            promoterCode: code.code,
            deletedAt: null,
            status: 'paid', // Apenas pedidos pagos
        }).lean();

        // Calcular estatísticas
        const totalOrders = orders.length;
        let totalSales = 0; // Vendas brutas (subtotal original)
        let totalDiscount = 0; // Total de desconto aplicado
        let totalRevenue = 0; // Receita líquida (totalAmount)

        for (const order of orders) {
            // Subtotal original (sem desconto) - para comissão
            const originalSubtotal = (order.subtotal || 0) + (order.discountAmount || 0);
            totalSales += originalSubtotal;
            totalDiscount += order.discountAmount || 0;
            totalRevenue += order.totalAmount || 0;
        }

        // Comissão sobre vendas brutas (futuro - por enquanto apenas cálculo)
        const commissionPercentage = 0; // Configurável no futuro
        const commission = totalSales * (commissionPercentage / 100);

        res.json({
            success: true,
            data: {
                code: code.code,
                name: code.name,
                currentUses: code.currentUses,
                totalOrders,
                totalSales, // Vendas brutas (para comissão)
                totalDiscount,
                totalRevenue, // Receita líquida
                commission, // Comissão (futuro)
            },
        });
    } catch (error: any) {
        console.error('Erro ao buscar estatísticas:', error);
        
        captureControllerError(error, req, {
            controller: 'promoterCodesController',
            action: 'getPromoterCodeStats',
            statusCode: 500,
            extra: {
                codeId: req.params?.id,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            errors: [error.message],
        });
    }
};
