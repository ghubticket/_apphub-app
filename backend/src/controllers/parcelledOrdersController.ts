import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event, TicketType, ParcelledOrder, Parcel } from '../models';
import {
    validateOrderInput,
    fetchOrderRelatedData,
    validateAvailabilityAndLimits,
    calculateOrderValues,
} from '../services/orderService';
import {
    createParcelledOrderFromCart,
    generatePaymentForParcel,
    cancelParcelledOrder,
} from '../services/parcelledOrderService';

/**
 * Cria uma venda parcelada a partir de um carrinho simples.
 * POST /api/parcelled-orders
 */
export const createParcelledOrder = async (req: Request, res: Response) => {
    try {
        const {
            eventId,
            ticketTypeId,
            quantity,
            installmentsCount,
            paymentType,
            customerData,
        } = req.body || {};

        const userId = (req as any).user?._id?.toString() || (req as any).user?.id || null;

        // Validação básica
        const basicValidation = validateOrderInput(eventId, ticketTypeId, quantity);
        if (!basicValidation.isValid && basicValidation.error) {
            return res.status(basicValidation.error.status).json({
                success: false,
                message: basicValidation.error.message,
                errors: basicValidation.error.errors,
            });
        }

        if (!installmentsCount || installmentsCount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade de parcelas inválida',
                errors: ['installmentsCount deve ser >= 1'],
            });
        }

        if (!paymentType || !['pix', 'boleto'].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de pagamento inválido',
                errors: ['paymentType deve ser "pix" ou "boleto"'],
            });
        }

        if (!customerData || !customerData.name || !customerData.email || !customerData.cpf) {
            return res.status(400).json({
                success: false,
                message: 'Dados do cliente são obrigatórios',
                errors: ['name, email e cpf são obrigatórios em customerData'],
            });
        }

        // Buscar dados relacionados (evento, ticketType, user)
        const related = await fetchOrderRelatedData(eventId, ticketTypeId, userId);
        if (related.error) {
            return res.status(related.error.status).json({
                success: false,
                message: related.error.message,
                errors: related.error.errors,
            });
        }

        const { event, ticketType, user } = related.data!;

        // Verificar se o tipo de ingresso permite parcelamento.
        // Regra: considera parcelamento habilitado se:
        // - allowInstallments === true
        //   OU
        // - minInstallments/maxInstallments estiverem definidos com valor >= 2
        const ticketAllowsInstallments =
            ticketType.allowInstallments === true ||
            (typeof ticketType.minInstallments === 'number' &&
                ticketType.minInstallments >= 2) ||
            (typeof ticketType.maxInstallments === 'number' &&
                ticketType.maxInstallments >= 2);

        if (!ticketAllowsInstallments) {
            return res.status(400).json({
                success: false,
                message: 'Este tipo de ingresso não permite compra parcelada',
                errors: ['Parcelamento não habilitado para este tipo de ingresso'],
            });
        }

        // Validar disponibilidade e limites (reuso do fluxo normal)
        const availability = await validateAvailabilityAndLimits(
            eventId,
            ticketTypeId,
            quantity,
            ticketType,
            customerData.cpf,
            customerData.email
        );
        if (!availability.isValid && availability.error) {
            return res.status(availability.error.status).json({
                success: false,
                message: availability.error.message,
                errors: availability.error.errors,
            });
        }

        // Calcular valores usando serviço existente
        const calc = await calculateOrderValues(ticketType, event, quantity);

        // Criar venda parcelada + parcelas + pagamento da entrada
        const result = await createParcelledOrderFromCart({
            eventId,
            ticketTypeId,
            quantity,
            customerId: user?._id?.toString() || customerData.userId || 'anonymous',
            customerName: customerData.name,
            customerEmail: customerData.email,
            customerCpf: customerData.cpf,
            customerPhone: customerData.phone,
            paymentType,
            installmentsCount,
        });

        // Buscar parcelas atualizadas para retorno mais enxuto
        const parcels = await Parcel.find({
            parcelledOrder: result.parcelledOrder._id,
        })
            .sort({ sequence: 1 })
            .lean();

        // Incluir pixPayment da entrada com expiresAt se disponível
        const responseData: any = {
            parcelledOrder: result.parcelledOrder,
            parcels,
        };

        if (result.entryPixPayment && paymentType === 'pix') {
            responseData.entryPixPayment = {
                paymentId: result.entryPixPayment.paymentId,
                expiresAt: result.entryPixPayment.expiresAt || null,
            };
        }

        return res.status(201).json({
            success: true,
            data: responseData,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Erro ao criar venda parcelada',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Retorna detalhes de uma venda parcelada (resumo + parcelas)
 * GET /api/parcelled-orders/:id
 */
export const getParcelledOrderDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID inválido',
                errors: ['ID informado não é um ObjectId válido'],
            });
        }

        const parcelledOrder = await ParcelledOrder.findById(id)
            .populate('event', 'name date location')
            .populate('ticketType', 'name')
            .lean();

        if (!parcelledOrder) {
            return res.status(404).json({
                success: false,
                message: 'Venda parcelada não encontrada',
            });
        }

        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOwner = String(parcelledOrder.customer) === String(userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar esta venda parcelada',
            });
        }

        const parcels = await Parcel.find({ parcelledOrder: parcelledOrder._id })
            .sort({ sequence: 1 })
            .lean();

        return res.json({
            success: true,
            data: {
                parcelledOrder,
                parcels,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar venda parcelada',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Gera (ou regenera) pagamento para uma parcela específica.
 * POST /api/parcelled-orders/:id/parcels/:parcelId/generate-payment
 */
export const generateParcelPayment = async (req: Request, res: Response) => {
    const requestId = (req as any).requestId || 'unknown';
    const startTime = Date.now();
    
    try {
        // Log inicial da requisição
        console.log(`[generateParcelPayment] ${requestId} - Início`, {
            method: req.method,
            path: req.path,
            params: req.params,
            headers: {
                'content-length': req.get('content-length'),
                'content-type': req.get('content-type'),
            },
            body: req.body,
            bodyType: typeof req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
        });
        
        // Este endpoint não usa body, apenas params
        const { id, parcelId } = req.params;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        const parcel = await Parcel.findById(parcelId).lean();
        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: 'Parcela não encontrada',
            });
        }

        if (String(parcel.parcelledOrder) !== String(id)) {
            return res.status(400).json({
                success: false,
                message: 'Parcela não pertence a esta venda parcelada',
            });
        }

        const parcelledOrder = await ParcelledOrder.findById(id).lean();
        if (!parcelledOrder) {
            return res.status(404).json({
                success: false,
                message: 'Venda parcelada não encontrada',
            });
        }

        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOwner = String(parcelledOrder.customer) === String(userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para gerar pagamento desta parcela',
            });
        }

        const result = await generatePaymentForParcel(parcelId);

        return res.json({
            success: true,
            data: {
                parcel: result.parcel,
                pixPayment: result.pixPayment,
            },
        });
    } catch (error: any) {
        // Log do erro para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
            console.error('Erro ao gerar pagamento da parcela:', error);
            console.error('Stack:', error.stack);
        }
        
        // Tratar erros específicos relacionados a body
        const errorMessage = error?.message || '';
        const errorString = String(errorMessage).toLowerCase();
        
        if (errorString.includes('body has already been read') || 
            errorString.includes('body is unusable') ||
            errorString.includes('cannot read') && errorString.includes('body')) {
            // Este erro geralmente indica que algum middleware tentou ler o body múltiplas vezes
            // Retornar erro mais específico e logar para investigação
            console.error('Erro de body já lido detectado. Endpoint não usa body, pode ser problema de middleware.');
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao processar requisição. Tente novamente.',
                errors: ['Erro ao processar requisição'],
            });
        }
        
        return res.status(400).json({
            success: false,
            message: error.message || 'Erro ao gerar pagamento da parcela',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Cancela venda parcelada manualmente (admin).
 * POST /api/parcelled-orders/:id/cancel
 */
export const cancelParcelledOrderController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const reason = (req.body?.reason ||
            'manual') as 'entry_not_paid' | 'overdue_installments' | 'manual';

        const isAdmin = (req as any).user?.role === 'ADMIN';
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem cancelar vendas parceladas manualmente',
            });
        }

        const updated = await cancelParcelledOrder(id, reason);

        return res.json({
            success: true,
            data: updated,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || 'Erro ao cancelar venda parcelada',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Lista vendas parceladas do usuário autenticado (resumo).
 * GET /api/parcelled-orders
 */
export const listMyParcelledOrders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
            });
        }

        const orders = await ParcelledOrder.find({
            customer: userId,
        })
            .sort({ createdAt: -1 })
            .populate('event', 'name date location')
            .populate('ticketType', 'name')
            .lean();

        if (!orders.length) {
            return res.json({
                success: true,
                data: {
                    orders: [],
                    parcelsByOrder: {},
                },
            });
        }

        const orderIds = orders.map((o) => o._id);

        const parcels = await Parcel.find({
            parcelledOrder: { $in: orderIds },
        })
            .sort({ sequence: 1 })
            .lean();

        const parcelsByOrder: Record<string, any[]> = {};
        parcels.forEach((p) => {
            const key = String(p.parcelledOrder);
            if (!parcelsByOrder[key]) {
                parcelsByOrder[key] = [];
            }
            parcelsByOrder[key].push(p);
        });

        return res.json({
            success: true,
            data: {
                orders,
                parcelsByOrder,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Erro ao listar vendas parceladas',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};
