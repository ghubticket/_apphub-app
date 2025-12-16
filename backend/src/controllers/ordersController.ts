import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import mongoose from 'mongoose';
import { Order, Ticket, TicketType, Event, User, PromoterCode } from '../models';
import { sendOrderCancelledEmail, sendTicketConfirmationEmail } from '../services/emailTemplates';
import { normalizeCPF, normalizeEmail } from '../utils/validationHelpers';
import * as orderService from '../services/orderService';
import { generateQRCode } from '../services/qrCodeService';
import { generateTicketPDF } from '../services/pdfService';
import { logAudit, createAuditContextFromRequest } from '../services/auditService';
import { captureControllerError } from '../utils/sentryErrorHandler';

const MAX_CARD_PAYMENT_ATTEMPTS = Number(process.env.PAYMENT_MAX_CARD_ATTEMPTS || 3);
const ORDER_NUMBER_LENGTH = 10;

const generateOrderNumber = async (): Promise<string> => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const buildCode = () =>
        Array.from({ length: ORDER_NUMBER_LENGTH })
            .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
            .join('');

    let orderNumber = buildCode();
    // Garantir unicidade
    // Em casos raros de colisão, tenta novamente
    // Limite de 5 tentativas para evitar loop infinito
    for (let attempts = 0; attempts < 5; attempts += 1) {
        const exists = await Order.findOne({ orderNumber }).select('_id').lean();
        if (!exists) {
            return orderNumber;
        }
        orderNumber = buildCode();
    }
    return orderNumber;
};

/**
 * Conta quantos ingressos um CPF/Email já comprou para um tipo específico
 * Considera apenas pedidos pagos (status = 'paid')
 */
export const countPurchasedTicketsByCPFOrEmail = async (
    eventId: string,
    ticketTypeId: string,
    cpf?: string,
    email?: string
): Promise<number> => {
    const normalizedCPF = normalizeCPF(cpf);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedCPF && !normalizedEmail) {
        return 0;
    }

    // Tentar obter do cache primeiro (cache de 1 minuto)
    const { cacheTicketCounts, generateTicketCountCacheKey } = await import('../services/cacheService');
    const cacheKey = generateTicketCountCacheKey(eventId, ticketTypeId, normalizedCPF || undefined, normalizedEmail || undefined);
    const cachedCount = cacheTicketCounts.get(cacheKey);
    if (cachedCount !== null && cachedCount !== undefined) {
        return cachedCount;
    }

    // Construir filtros para buscar pedidos pagos do evento
    // OTIMIZADO: Usar índices compostos criados anteriormente
    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const ticketTypeObjectId = new mongoose.Types.ObjectId(ticketTypeId);
    
    const orderFilters: any = {
        event: eventObjectId,
        status: 'paid',
        deletedAt: null,
    };

    // Adicionar filtro por CPF ou Email usando índices otimizados
    const { hashCPFForSearch } = await import('../utils/encryption');

    if (normalizedCPF && normalizedEmail) {
        // Se ambos estão presentes, usar OR (usa índices compostos)
        const cpfHash = hashCPFForSearch(normalizedCPF);
        if (cpfHash) {
            orderFilters.$or = [
                { 'customerData.cpfHash': cpfHash },
                { 'customerData.email': normalizedEmail },
            ];
        } else {
            // Se hash falhou, buscar apenas por email
            orderFilters['customerData.email'] = normalizedEmail;
        }
    } else if (normalizedCPF) {
        // Buscar por CPF usando hash (usa índice composto: cpfHash + event + status)
        const cpfHash = hashCPFForSearch(normalizedCPF);
        if (cpfHash) {
            orderFilters['customerData.cpfHash'] = cpfHash;
        } else {
            // Se hash falhou, retornar 0
            return 0;
        }
    } else if (normalizedEmail) {
        // Buscar por email (usa índice composto: email + event + status)
        orderFilters['customerData.email'] = normalizedEmail;
    }

    // OTIMIZADO: Agregação simplificada usando índices
    // Removidos logs de debug e queries de teste desnecessárias
    const result = await Order.aggregate([
        // Match usa índices compostos para busca rápida
        { $match: orderFilters },
        {
            // Lookup apenas tickets do tipo específico
            $lookup: {
                from: 'tickets',
                let: { orderId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$order', '$$orderId'] },
                                    { $eq: ['$ticketType', ticketTypeObjectId] },
                                    { $eq: ['$deletedAt', null] },
                                    // Apenas tickets confirmados/usados (não pendentes)
                                    { $in: ['$status', ['confirmed', 'used']] },
                                ],
                            },
                        },
                    },
                ],
                as: 'matchingTickets',
            },
        },
        // Filtrar apenas pedidos que têm tickets do tipo correto
        {
            $match: {
                'matchingTickets.0': { $exists: true },
            },
        },
        // Somar quantidade de tickets
        {
            $group: {
                _id: null,
                totalPurchased: { $sum: { $size: '$matchingTickets' } },
            },
        },
    ]);

    const totalPurchased = result.length > 0 && result[0].totalPurchased ? result[0].totalPurchased : 0;

    // Armazenar no cache (1 minuto)
    cacheTicketCounts.set(cacheKey, totalPurchased, 60 * 1000);

    return totalPurchased;
};

interface CreateOrderRequest {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    promoterCode?: string; // Código de promotor (opcional)
    customerData?: {
        name?: string;
        email?: string;
        phone?: string;
        cpf?: string;
    };
    allowReuse?: boolean;
}

// Constantes para timeout de pedidos
const CHECKOUT_TIMEOUT_MINUTES = Number(process.env.CHECKOUT_TIMEOUT_MINUTES || 30); // 30 minutos padrão para checkout
const CHECKOUT_TIMEOUT_MS = CHECKOUT_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Cria um novo pedido com ingressos
 * REFATORADO: Pedido PENDING = Reserva de ingressos
 * - Cria pedido PENDING imediatamente ao entrar no checkout
 * - Bloqueia estoque (soldQuantity++)
 * - Define expiresAt = agora + 30min
 * - Para ingressos VIP: status = 'paid', paymentMethod = 'vip_free', tickets = 'confirmed'
 * - Para outros: status = 'pending', aguarda pagamento
 */
export const createOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;
        const { eventId, ticketTypeId, quantity, promoterCode, customerData, allowReuse } =
            req.body as CreateOrderRequest;

        // REFATORADO: Validação de entrada usando serviço
        const validation = orderService.validateOrderInput(eventId, ticketTypeId, quantity);
        if (!validation.isValid) {
            return res.status(validation.error!.status).json({
                success: false,
                message: validation.error!.message,
                errors: validation.error!.errors,
            });
        }

        // REFATORADO: Buscar dados relacionados usando serviço
        const relatedDataResult = await orderService.fetchOrderRelatedData(
            eventId!,
            ticketTypeId!,
            userId
        );
        if (relatedDataResult.error) {
            return res.status(relatedDataResult.error.status).json({
                success: false,
                message: relatedDataResult.error.message,
                errors: relatedDataResult.error.errors,
            });
        }
        const { event, ticketType, user } = relatedDataResult.data!;

        // Validação e sanitização de customerData (se fornecido)
        let validatedCustomerData: any = null;
        if (customerData) {
            try {
                const { validateString, validateEmail, validateCPF, validatePhone, validateText } = await import('../utils/typeValidation');
                
                validatedCustomerData = {
                    name: customerData.name ? validateText(customerData.name, 'Nome', { maxLength: 100, minLength: 2 }) : undefined,
                    email: customerData.email ? validateEmail(customerData.email, 'Email', false) : undefined,
                    phone: customerData.phone ? validatePhone(customerData.phone, 'Telefone', false) : undefined,
                    cpf: customerData.cpf ? validateCPF(customerData.cpf, 'CPF', false) : undefined,
                };
            } catch (validationError: any) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do cliente inválidos',
                    errors: [validationError.message || 'Erro na validação dos dados do cliente'],
                });
            }
        }

        // Preparar CPF e Email para validação
        // CRÍTICO: Para ingressos VIP com maxPerCPF, CPF é OBRIGATÓRIO
        const cpfToValidate = validatedCustomerData?.cpf || user?.cpf;
        const emailToValidate = validatedCustomerData?.email || user?.email;
        const normalizedCustomerEmail = normalizeEmail(validatedCustomerData?.email || customerData?.email);
        const normalizedUserEmail = normalizeEmail(user?.email);

        // CRÍTICO: Validação especial para VIPs - verificar se já tem pedido VIP pago ANTES de validar limites
        // Isso previne que cache ou timing permitam criar múltiplos VIPs
        if (ticketType.isVIP && ticketType.maxPerCPF && cpfToValidate) {
            const { hashCPFForSearch } = await import('../utils/encryption');
            const cpfHash = hashCPFForSearch(cpfToValidate);
            
            if (cpfHash) {
                // Buscar diretamente no banco usando agregação para contar tickets VIP confirmados
                const eventObjectId = new mongoose.Types.ObjectId(eventId);
                const ticketTypeObjectId = new mongoose.Types.ObjectId(ticketTypeId);
                
                const vipCountResult = await Order.aggregate([
                    {
                        $match: {
                            event: eventObjectId,
                            status: 'paid',
                            paymentMethod: 'vip_free',
                            deletedAt: null,
                            'customerData.cpfHash': cpfHash,
                        },
                    },
                    {
                        $lookup: {
                            from: 'tickets',
                            let: { orderId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$order', '$$orderId'] },
                                                { $eq: ['$ticketType', ticketTypeObjectId] },
                                                { $in: ['$status', ['confirmed', 'used']] },
                                                { $eq: ['$deletedAt', null] },
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'vipTickets',
                        },
                    },
                    {
                        $match: {
                            'vipTickets.0': { $exists: true },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalVipTickets: { $sum: { $size: '$vipTickets' } },
                        },
                    },
                ]);

                const totalVipTickets = vipCountResult.length > 0 && vipCountResult[0].totalVipTickets 
                    ? vipCountResult[0].totalVipTickets 
                    : 0;

                // Se já tem VIP, bloquear
                const maxAllowed = ticketType.maxPerCPF || 1;
                if (totalVipTickets >= maxAllowed) {
                    return res.status(400).json({
                        success: false,
                        message: 'Limite acumulado por CPF excedido',
                        errors: [
                            `Você já possui ${totalVipTickets} cortesia(s) VIP para este evento. ` +
                            `Limite máximo: ${ticketType.maxPerCPF} ingresso(s) por CPF.`,
                        ],
                    });
                }
            }
        }

        // REFATORADO: Validação de disponibilidade e limites usando serviço
        const availabilityValidation = await orderService.validateAvailabilityAndLimits(
            eventId!,
            ticketTypeId!,
            quantity!,
            ticketType,
            cpfToValidate,
            emailToValidate
        );
        if (!availabilityValidation.isValid) {
            return res.status(availabilityValidation.error!.status).json({
                success: false,
                message: availabilityValidation.error!.message,
                errors: availabilityValidation.error!.errors,
            });
        }

        // REFATORADO: Calcular valores usando serviço
        const calculation = await orderService.calculateOrderValues(
            ticketType,
            event,
            quantity!,
            promoterCode
        );
        const {
            isVIP,
            ticketPrice,
            subtotal,
            discountAmount,
            platformFee,
            totalAmount,
            usedPromoterCode,
        } = calculation;

        // CRÍTICO: Validação rigorosa - APENAS ingressos VIP explícitos podem ser marcados como paid
        // Garantir que isVIP seja boolean true E que ticketType.isVIP seja explicitamente true
        const isReallyVIP = Boolean(isVIP) && Boolean(ticketType?.isVIP === true);

        // Reserva atômica de estoque para evitar oversell em pico
        const reserveStockIfAvailable = async (qty: number) => {
            return TicketType.findOneAndUpdate(
                {
                    _id: ticketTypeId,
                    isActive: true,
                    deletedAt: null,
                    $expr: { $lte: [{ $add: ['$soldQuantity', qty] }, '$maxQuantity'] },
                },
                { $inc: { soldQuantity: qty } },
                { new: true }
            );
        };

        // REFATORADO: Buscar pedido existente usando serviço
        const existingOrder = await orderService.findExistingOrder(
            eventId!,
            userId,
            normalizedCustomerEmail,
            normalizedUserEmail
        );

        if (existingOrder) {
            // CRÍTICO: Reutilizar pedido do mesmo evento/cliente, independente do ticketType
            // Um pedido pode conter múltiplos tipos de ingressos do mesmo evento
            // Isso evita criar múltiplos pedidos para o mesmo evento/cliente
            const orderStatus = existingOrder.status;
            const paymentMethod = existingOrder.paymentMethod;
            
            // CRÍTICO: Se o pedido existente tem status 'failed', verificar se ainda pode ser reutilizado
            // Permitir reutilização até esgotar tentativas (MAX_CARD_PAYMENT_ATTEMPTS)
            if (orderStatus === 'failed') {
                const cardAttempts = existingOrder.cardAttempts || 0;
                if (cardAttempts >= MAX_CARD_PAYMENT_ATTEMPTS) {
                    // Esgotou tentativas: cancelar pedido e criar novo
                    try {
                        await orderService.cancelOrderAndReturnStock(existingOrder);
                    } catch (cancelError) {
                        // Erro ao cancelar - continuar mesmo assim
                    }
                    // Não reutilizar - continuar para criar novo pedido
                } else {
                    // Ainda pode tentar: reutilizar o pedido failed, resetando status para pending
                    const orderToUpdate = await Order.findById(existingOrder._id);
                    if (orderToUpdate) {
                        // Resetar status para pending para permitir nova tentativa
                        // CRÍTICO: Manter expiresAt original, não renovar o tempo
                        orderToUpdate.status = 'pending';
                        orderToUpdate.isActive = true;
                        // Não alterar expiresAt - manter o tempo original do pedido
                        await orderToUpdate.save();
                        // Continuar para reutilizar o pedido (código abaixo)
                    } else {
                        // Não encontrou pedido, continuar para criar novo
                    }
                }
            }

            // Reutilizar pedido (se não foi cancelado acima e ainda tem tentativas)
            const canReuse =
                orderStatus !== 'failed' ||
                (existingOrder.cardAttempts || 0) < MAX_CARD_PAYMENT_ATTEMPTS;
            if (canReuse) {
                // Buscar pedido completo (não lean) para atualizar
                const orderToUpdate = await Order.findById(existingOrder._id);
                if (orderToUpdate) {
                    // CRÍTICO: Validar limites ANTES de adicionar ingressos ao pedido existente
                    // Isso é especialmente importante para VIPs com maxPerCPF
                    const reuseAvailabilityValidation = await orderService.validateAvailabilityAndLimits(
                        eventId!,
                        ticketTypeId!,
                        quantity!,
                        ticketType,
                        cpfToValidate,
                        emailToValidate
                    );
                    if (!reuseAvailabilityValidation.isValid) {
                        return res.status(reuseAvailabilityValidation.error!.status).json({
                            success: false,
                            message: reuseAvailabilityValidation.error!.message,
                            errors: reuseAvailabilityValidation.error!.errors,
                        });
                    }

                    // Pedido já está pending ou failed, pode ser atualizado normalmente
                    // Não precisa mudar status - já está em estado válido para adicionar ingressos
                    // Verificar disponibilidade antes de adicionar
                    const availableQuantity = ticketType.maxQuantity - ticketType.soldQuantity;
                    if (availableQuantity < quantity) {
                        return res.status(400).json({
                            success: false,
                            message: 'Estoque insuficiente',
                            errors: [`Disponível: ${availableQuantity}, Solicitado: ${quantity}`],
                        });
                    }

                    // CRÍTICO: Para VIPs, não permitir adicionar a pedidos existentes
                    // VIPs devem ser pedidos únicos, não podem ser adicionados a pedidos anteriores
                    if (isReallyVIP) {
                        return res.status(400).json({
                            success: false,
                            message: 'Ingresso VIP já solicitado',
                            errors: [
                                'Você já possui um pedido VIP para este evento. Não é possível adicionar mais ingressos VIP ao pedido existente.',
                            ],
                        });
                    }

                    // Reserva atômica de estoque para adicionar ingressos ao pedido existente
                    let reuseStockReserved = false;
                    try {
                        const reservedTicketType = await reserveStockIfAvailable(quantity);
                        if (!reservedTicketType) {
                            return res.status(400).json({
                                success: false,
                                message: 'Estoque insuficiente',
                                errors: [
                                    `Ingressos indisponíveis para este lote. Quantidade solicitada: ${quantity}`,
                                ],
                            });
                        }
                        reuseStockReserved = true;

                        // Criar novos tickets para o pedido existente
                        // CRÍTICO: Novos tickets SEMPRE são 'pending' (precisam pagar)
                        // Tickets antigos continuam com seu status original (confirmed se já pagos)
                        const newTickets: any[] = [];
                        for (let i = 0; i < quantity; i++) {
                            const ticket = new Ticket({
                                event: eventId,
                                ticketType: ticketTypeId,
                                order: orderToUpdate._id,
                                holder: userId || null,
                                price: ticketPrice,
                                status: 'pending', // SEMPRE pending - novos ingressos precisam pagar
                                qrCode: '', // QR code só será gerado quando pagar
                            });
                            await ticket.save();
                            newTickets.push(ticket._id);
                        }

                        // Atualizar pedido com novos tickets
                        orderToUpdate.tickets = [...(orderToUpdate.tickets || []), ...newTickets];
                        orderToUpdate.totalTickets = (orderToUpdate.totalTickets || 0) + quantity;

                        // Atualizar expiresAt se pedido está PENDING (renovar reserva)
                        if (orderToUpdate.status === 'pending') {
                            orderToUpdate.expiresAt = new Date(Date.now() + CHECKOUT_TIMEOUT_MS);
                        }

                        // Recalcular valores (considerando desconto e taxa)
                        const newSubtotal = ticketPrice * quantity;
                        let newDiscountAmount = 0;

                        // Aplicar desconto de código de promotor se fornecido
                        if (promoterCode && !isVIP && usedPromoterCode) {
                            const code = await PromoterCode.findOne({
                                code: promoterCode.toUpperCase().trim(),
                                isActive: true,
                                deletedAt: null,
                                events: eventId,
                            });

                            if (code) {
                                if (code.discountType === 'percentage') {
                                    newDiscountAmount = newSubtotal * (code.discountValue / 100);
                                } else {
                                    newDiscountAmount = Math.min(code.discountValue, newSubtotal);
                                }
                            }
                        }

                        const platformFeePercentage = event.platformFeePercentage || 0;
                        const newPlatformFee = isVIP
                            ? 0
                            : (newSubtotal - newDiscountAmount) * (platformFeePercentage / 100);
                        const newTotalAmount = newSubtotal - newDiscountAmount + newPlatformFee;

                        orderToUpdate.subtotal = (orderToUpdate.subtotal || 0) + newSubtotal;
                        orderToUpdate.discountAmount =
                            (orderToUpdate.discountAmount || 0) + newDiscountAmount;
                        orderToUpdate.platformFee =
                            (orderToUpdate.platformFee || 0) + newPlatformFee;
                        orderToUpdate.totalAmount =
                            (orderToUpdate.totalAmount || 0) + newTotalAmount;

                        if (usedPromoterCode && !orderToUpdate.promoterCode) {
                            orderToUpdate.promoterCode = usedPromoterCode;
                        }

                        await orderToUpdate.save();

                    // Incrementar contador de uso do código de promotor (se usado)
                    if (usedPromoterCode) {
                        await PromoterCode.updateOne(
                            { code: usedPromoterCode },
                            { $inc: { currentUses: 1 } }
                        );
                    }

                    // REFATORADO: Não criar reservas separadas - o pedido PENDING já funciona como reserva
                    // O pedido já tem expiresAt definido e bloqueia estoque (soldQuantity++)

                    // Popular dados para resposta
                    const populatedOrder = await Order.findById(orderToUpdate._id)
                        .populate('event', 'name date location address')
                        .populate('tickets', 'code qrCode status price ticketType holder')
                        .populate('customer', 'name email')
                        .populate('tickets.ticketType', 'name')
                        .lean();

                    return res.status(200).json({
                        success: true,
                        message: 'Ingressos adicionados ao pedido existente.',
                        data: {
                            order: populatedOrder,
                            isVIP: false,
                            requiresPayment: true,
                            reused: true,
                            addedTickets: true,
                        },
                    });
                    } catch (reuseError) {
                        // rollback da reserva de estoque em caso de falha
                        if (reuseStockReserved) {
                            await TicketType.updateOne(
                                { _id: ticketTypeId },
                                { $inc: { soldQuantity: -quantity } }
                            );
                        }
                        throw reuseError;
                    }
                }
            } // Fechar else do if (orderStatus === 'failed')
        } // Fechar if (existingOrder)

        // Tentar reaproveitar pedido pendente/falho existente (somente para cartão)
        // CRÍTICO: Esta lógica só é executada se não encontrou pedido existente acima
        // e se allowReuse está habilitado (para tentar reutilizar pedidos falhos de cartão)
        let reusableOrder: any = null;
        if (allowReuse) {
            const reusableOrderFilters: any = {
                event: eventId,
                deletedAt: null,
                isActive: false,
                status: { $in: ['pending', 'failed'] },
                paymentMethod: { $in: [null, 'credit_card', 'debit_card'] },
                cardAttempts: { $lt: MAX_CARD_PAYMENT_ATTEMPTS },
                totalTickets: quantity,
                totalAmount,
            };

            if (userId) {
                reusableOrderFilters.customer = userId;
            } else if (normalizedCustomerEmail) {
                reusableOrderFilters['customerData.email'] = normalizedCustomerEmail;
            } else {
                const normalizedUserEmail = normalizeEmail(user?.email);
                if (normalizedUserEmail) {
                    reusableOrderFilters['customerData.email'] = normalizedUserEmail;
                }
            }

            reusableOrder = await Order.findOne(reusableOrderFilters).lean();

            if (reusableOrder) {return res.status(200).json({
                    success: true,
                    message: 'Pedido pendente reutilizado. Continue com o pagamento.',
                    data: {
                        order: reusableOrder,
                        isVIP: reusableOrder.paymentMethod === 'vip_free',
                        requiresPayment: reusableOrder.paymentMethod !== 'vip_free',
                        reused: true,
                    },
                });
            }
        }

        // Determinar status e método de pagamento
        // CRÍTICO: APENAS ingressos VIP explícitos podem ser marcados como paid
        // NUNCA marcar pedidos PIX ou outros como paid na criação
        let orderStatus: 'pending' | 'paid' = 'pending';
        let paymentMethod:
            | 'credit_card'
            | 'debit_card'
            | 'pix'
            | 'bank_slip'
            | 'vip_free'
            | undefined = undefined;
        let ticketStatus: 'pending' | 'confirmed' = 'pending';

        // CRÍTICO: Validação dupla - usar isReallyVIP ao invés de isVIP
        if (isReallyVIP) {
            // VIP: pedido pago automaticamente, sem gateway
            // CRÍTICO: Apenas VIP pode ser paid na criação
            orderStatus = 'paid';
            paymentMethod = 'vip_free';
            ticketStatus = 'confirmed';
        } else {
            // Outros: aguarda pagamento (será integrado depois)
            // CRÍTICO: PIX, cartão, etc. SEMPRE começam como pending
            orderStatus = 'pending';
            ticketStatus = 'pending';
        }

        const finalCustomerEmail =
            normalizedCustomerEmail ||
            normalizeEmail(user?.email) ||
            customerData?.email ||
            user?.email ||
            'Não informado';

        let creationStockReserved = false;

        try {
            // REFATORADO: Cancelar pedidos pendentes anteriores usando serviço
            if (!allowReuse || !reusableOrder) {
                await orderService.cancelPreviousPendingOrders(
                    eventId!,
                    userId,
                    normalizedCustomerEmail,
                    normalizedUserEmail,
                    existingOrder?._id?.toString()
                );
            }

            // Reserva atômica de estoque antes de criar pedido
            const reservedTicketType = await reserveStockIfAvailable(quantity!);
            if (!reservedTicketType) {
                return res.status(400).json({
                    success: false,
                    message: 'Estoque insuficiente',
                    errors: [
                        `Ingressos indisponíveis para este lote. Quantidade solicitada: ${quantity}`,
                    ],
                });
            }
            creationStockReserved = true;

            // Criar pedido
            const orderNumber = await generateOrderNumber();
            const now = new Date();
            // Para pedidos PENDING: definir expiresAt = agora + 30min (reserva de ingressos)
            const CHECKOUT_TIMEOUT_MS =
                Number(process.env.CHECKOUT_TIMEOUT_MINUTES || 30) * 60 * 1000;
            const expiresAt =
                orderStatus === 'pending'
                    ? new Date(now.getTime() + CHECKOUT_TIMEOUT_MS)
                    : undefined;

            // Capturar IP do cliente para detecção de padrões suspeitos
            const ipAddress = (
                req.ip ||
                req.socket?.remoteAddress ||
                req.headers['x-forwarded-for'] ||
                'unknown'
            ).toString();

            const order = new Order({
                customer: userId || null,
                event: eventId,
                tickets: [], // Será preenchido após criar os tickets
                subtotal: subtotal,
                discountAmount: discountAmount,
                platformFee: platformFee,
                totalAmount: totalAmount,
                promoterCode: usedPromoterCode,
                totalTickets: quantity,
                status: orderStatus,
                paymentMethod: paymentMethod,
                paidAt: isReallyVIP ? now : undefined,
                expiresAt, // Data de expiração para pedidos PENDING (reserva de ingressos)
                orderNumber,
                customerData: {
                    name: validatedCustomerData?.name || user?.name || 'Não informado',
                    email: finalCustomerEmail,
                    phone: validatedCustomerData?.phone || user?.phone,
                    // CRÍTICO: Normalizar CPF antes de salvar para garantir consistência
                    // Salvar no formato 000.000.000-00 para facilitar busca
                    cpf: cpfToValidate
                        ? (() => {
                              const normalized = normalizeCPF(cpfToValidate);
                              return normalized
                                  ? normalized.replace(
                                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                        '$1.$2.$3-$4'
                                    )
                                  : undefined;
                          })()
                        : undefined,
                },
                ipAddress, // IP para detecção de padrões suspeitos
                cardAttempts: 0,
                isActive: Boolean(isReallyVIP),
            });

            await order.save();

            // Registrar auditoria (executar em background, não bloquear criação)
            const auditContext = createAuditContextFromRequest(req);
            logAudit({
                entityType: 'Order',
                entityId: String(order._id),
                action: 'create',
                performedBy: auditContext.performedBy,
                performedByRole: auditContext.performedByRole,
                changes: [
                    {
                        field: 'status',
                        oldValue: null,
                        newValue: order.status,
                    },
                    {
                        field: 'totalAmount',
                        oldValue: null,
                        newValue: order.totalAmount,
                    },
                    {
                        field: 'totalTickets',
                        oldValue: null,
                        newValue: order.totalTickets,
                    },
                ],
                metadata: {
                    ipAddress: auditContext.ipAddress,
                    userAgent: auditContext.userAgent,
                    orderNumber: order.orderNumber,
                    eventId: String(eventId),
                    ticketTypeId: String(ticketTypeId),
                    quantity,
                    paymentMethod: order.paymentMethod,
                },
            }).catch((error) => {
                // Erro ao registrar auditoria - não bloquear criação
            });

            // Detectar padrões suspeitos (executar em background, não bloquear criação)
            import('../services/suspiciousOrderDetection').then(({ detectSuspiciousPatterns }) => {
                detectSuspiciousPatterns({
                    orderId: String(order._id),
                    ipAddress,
                    cpf: cpfToValidate,
                    email: finalCustomerEmail,
                    userId: userId || undefined,
                }).catch((error) => {
                    // Erro ao detectar padrões suspeitos - não bloquear criação
                });
            });

            // Incrementar contador de uso do código de promotor (se usado)
            if (usedPromoterCode) {
                await PromoterCode.updateOne(
                    { code: usedPromoterCode },
                    { $inc: { currentUses: 1 } }
                );
            }

            // REFATORADO: Criar tickets usando serviço
            const createdTickets = await orderService.createTicketsForOrder(
                order._id as mongoose.Types.ObjectId,
                eventId!,
                ticketTypeId!,
                quantity!,
                ticketPrice,
                ticketStatus,
                userId,
                isReallyVIP
            );

            // Atualizar pedido com os tickets
            order.tickets = createdTickets.map((t) => t._id as mongoose.Types.ObjectId);
            await order.save();

            // CRÍTICO: Invalidar cache de contagem de tickets quando VIP é criado
            // Isso garante que a próxima validação de maxPerCPF use dados atualizados
            if (isReallyVIP && cpfToValidate) {
                const { cacheTicketCounts, generateTicketCountCacheKey } = await import('../services/cacheService');
                const cacheKey = generateTicketCountCacheKey(
                    eventId!,
                    ticketTypeId!,
                    cpfToValidate,
                    emailToValidate || undefined
                );
                cacheTicketCounts.delete(cacheKey);
            }

            // Popular dados para resposta
            const populatedOrder = await Order.findById(order._id)
                .populate('event', 'name date location address')
                .populate('tickets', 'code qrCode status price ticketType holder')
                .populate('customer', 'name email')
                .populate('tickets.ticketType', 'name')
                .lean();

            // REFATORADO: Enviar email VIP usando serviço
            // CRÍTICO: Usar isReallyVIP para garantir que apenas VIPs reais recebam email
            if (isReallyVIP && populatedOrder) {
                await orderService.sendVIPOrderEmail(populatedOrder);
            }

            res.status(201).json({
                success: true,
                message: isReallyVIP
                    ? 'Pedido VIP criado com sucesso'
                    : 'Pedido criado com sucesso. Aguardando pagamento.',
                data: {
                    order: populatedOrder,
                    isVIP: isReallyVIP,
                    requiresPayment: !isReallyVIP,
                },
            });
        } catch (error: any) {
            // rollback da reserva de estoque se falhar após reservar
            if (creationStockReserved) {
                await TicketType.updateOne(
                    { _id: ticketTypeId },
                    { $inc: { soldQuantity: -quantity! } }
                );
            }
            captureControllerError(error, req, {
                controller: 'ordersController',
                action: 'createOrder',
                statusCode: 500,
                extra: {
                    eventId: req.body?.eventId,
                    ticketTypeId: req.body?.ticketTypeId,
                    quantity: req.body?.quantity,
                },
            });
            
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar pedido',
                errors: [error?.message || 'Erro desconhecido'],
            });
        }
    } catch (outerError: any) {
        captureControllerError(outerError, req, {
            controller: 'ordersController',
            action: 'createOrder',
            statusCode: 500,
            extra: {
                stage: 'pre-transaction',
            },
        });
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido',
            errors: [outerError?.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Lista pedidos do usuário autenticado com paginação
 */
export const listMyOrders = async (req: Request, res: Response) => {
    const requestId = (req as any).requestId || 'unknown';
    const startTime = Date.now();
    
    try {
        console.log(`[listMyOrders] ${requestId} - Início`, {
            method: req.method,
            path: req.path,
            query: req.query,
            userId: (req as any).user?._id || (req as any).user?.id,
        });
        
        const user = (req as any).user;
        const userId = user?._id?.toString() || user?.id;

        if (!userId) {
            console.warn(`[listMyOrders] ${requestId} - Usuário não autenticado`);
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
            });
        }

        const { page = 1, limit = 10, search = '', status } = req.query as any;

        // Construir filtros
        const filters: any = {
            customer: userId,
            deletedAt: null,
            isActive: true,
        };

        // CRÍTICO: Por padrão, mostrar APENAS pedidos pending e paid no dashboard do usuário
        // Pedidos cancelled/refunded são importantes para relatórios/admin, mas não precisam aparecer no frontend do usuário
        if (status && ['pending', 'paid', 'cancelled', 'refunded'].includes(String(status))) {
            // Se o usuário especificou um status, respeitar (permite buscar cancelados se necessário)
            filters.status = String(status);
        } else {
            // Por padrão: apenas pending e paid
            filters.status = { $in: ['pending', 'paid'] };
        }

        if (search) {
            filters.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'customerData.name': { $regex: search, $options: 'i' } },
                { 'customerData.email': { $regex: search, $options: 'i' } },
            ];
        }

        // Calcular paginação
        const skip = (Number(page) - 1) * Number(limit);

        // Buscar pedidos com paginação
        // IMPORTANTE: Incluir _id do evento para permitir agrupamento no frontend
        // CRÍTICO: Popular ticketType dentro dos tickets para permitir verificação de VIP no frontend
        const orders = await Order.find(filters)
            .populate('event', '_id name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType',
                match: { deletedAt: null },
                populate: {
                    path: 'ticketType',
                    select: '_id name isVIP',
                },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Contar total de pedidos
        const total = await Order.countDocuments(filters);

        // Remover QR codes de pedidos pendentes (segurança)
        // IMPORTANTE: Para pedidos pagos, garantir que os tickets tenham QR codes
        const ordersWithFilteredQR = await Promise.all(
            orders.map(async (order) => {
                try {
                    // Se o pedido está pago mas os tickets não têm QR codes, gerar
                    if (order.status === 'paid') {
                        const orderDoc = await Order.findById(order._id);
                    if (orderDoc) {
                        const tickets = await Ticket.find({ order: orderDoc._id, deletedAt: null });
                        let needsQRGeneration = false;
                        for (const ticket of tickets) {
                            if (ticket.status === 'confirmed' && !ticket.qrCode) {
                                needsQRGeneration = true;
                                ticket.qrCode = await generateQRCode(ticket.code);
                                await ticket.save();
                            }
                        }
                        if (needsQRGeneration) {
                            // Re-popular para pegar os QR codes atualizados
                            const updatedOrder = await Order.findById(order._id)
                                .populate({
                                    path: 'tickets',
                                    select: 'code qrCode status price',
                                    match: { deletedAt: null },
                                })
                                .lean();
                            if (updatedOrder) {
                                return {
                                    ...updatedOrder,
                                    tickets: updatedOrder.tickets.map((ticket: any) => ({
                                        ...ticket,
                                        qrCode:
                                            updatedOrder.status === 'paid' ? ticket.qrCode : null,
                                    })),
                                };
                            }
                        }
                    }
                }

                // Para pedidos PIX pendentes, buscar informações do PIX para exibir no frontend
                let pixInfo: any = null;
                // CRÍTICO: Para PIX, sempre usar Orders API (paymentOrderId), não Payment API
                // Payment API não funciona para PIX criado via Orders API
                if (order.status === 'pending' && order.paymentMethod === 'pix') {
                    // Buscar paymentOrderId do banco (pode não estar no lean())
                    const orderDoc = await Order.findById(order._id)
                        .select('paymentOrderId paymentId')
                        .lean();
                    const paymentOrderId =
                        (orderDoc as any)?.paymentOrderId || (order as any).paymentOrderId;

                    try {
                        // Para PIX, SEMPRE tentar Orders API primeiro (via paymentOrderId)
                        if (paymentOrderId) {
                            try {
                                const mpOrder = await paymentService.getOrderById(paymentOrderId);
                                const mpPayment = mpOrder?.transactions?.payments?.[0];

                                // Na Orders API, o PIX está em payment_method (não payment_method_id)
                                // Verificar se é PIX: payment_method.type === 'pix' ou payment_method_id === 'pix'
                                // OU payment_method.id === 'pix' (algumas versões da API)
                                // OU se point_of_interaction.type é 'pix'
                                const isPix =
                                    mpPayment?.payment_method?.type === 'pix' ||
                                    mpPayment?.payment_method?.id === 'pix' ||
                                    mpPayment?.payment_method_id === 'pix' ||
                                    (mpPayment as any)?.point_of_interaction?.type === 'pix' ||
                                    (mpPayment?.payment_method && !mpPayment?.payment_method_id); // Se tem payment_method mas não payment_method_id, provavelmente é PIX

                                if (mpPayment && isPix) {
                                    // Na Orders API, os dados do PIX estão em payment_method, não em point_of_interaction
                                    // (mesma lógica do getOrderById que funciona)
                                    pixInfo = {
                                        qrCode: mpPayment.payment_method?.qr_code || null,
                                        qrCodeBase64: mpPayment.payment_method?.qr_code_base64 || null,
                                        ticketUrl: mpPayment.payment_method?.ticket_url || null,
                                        expiresAt: mpPayment.date_of_expiration
                                            ? new Date(mpPayment.date_of_expiration).toISOString()
                                            : null,
                                        expirationMinutes: mpPayment.date_of_expiration
                                            ? Math.round(
                                                  (new Date(
                                                      mpPayment.date_of_expiration
                                                  ).getTime() -
                                                      Date.now()) /
                                                      (60 * 1000)
                                              )
                                            : null,
                                    };
                                }
                            } catch (orderError: any) {
                                // Não tentar Payment API para PIX - não funciona
                                // Ignorar erro silenciosamente
                            }
                        }
                    } catch (error: any) {
                        // Ignorar erro ao buscar informações do PIX
                    }
                }

                const orderResponse = {
                    ...order,
                    tickets: order.tickets.map((ticket: any) => ({
                        ...ticket,
                        qrCode: order.status === 'paid' ? ticket.qrCode : null, // Só retorna QR code se pedido estiver pago
                    })),
                    pixInfo: pixInfo || undefined, // Informações do PIX para pedidos pendentes
                };

                return orderResponse;
                } catch (orderError: any) {
                    // Se houver erro ao processar um pedido individual, logar mas não quebrar tudo
                    console.error(`[listMyOrders] ${requestId} - Erro ao processar pedido ${order._id}`, {
                        error: orderError?.message,
                        orderId: order._id,
                    });
                    // Retornar pedido sem processamento adicional em caso de erro
                    return {
                        ...order,
                        tickets: order.tickets || [],
                        pixInfo: undefined,
                    };
                }
            })
        );
        
        const duration = Date.now() - startTime;
        console.log(`[listMyOrders] ${requestId} - Sucesso`, {
            duration: `${duration}ms`,
            userId,
            ordersCount: ordersWithFilteredQR.length,
            total,
            page,
            limit,
        });
        
        // Verificar se a resposta já foi enviada antes de tentar enviar
        if (res.headersSent) {
            console.error(`[listMyOrders] ${requestId} - Tentativa de enviar resposta após headers já enviados`);
            return;
        }
        
        return res.json({
            success: true,
            data: {
                orders: ordersWithFilteredQR,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[listMyOrders] ${requestId} - Erro`, {
            duration: `${duration}ms`,
            error: error.message,
            stack: error.stack,
            userId: (req as any).user?._id || (req as any).user?.id,
        });
        
        // Verificar se a resposta já foi enviada antes de tentar enviar erro
        if (res.headersSent) {
            console.error(`[listMyOrders] ${requestId} - Tentativa de enviar erro após headers já enviados`);
            return;
        }
        
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'listMyOrders',
            statusCode: 500,
        });
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Lista TODOS os pedidos (apenas ADMIN) com paginação
 */
export const listAllOrders = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search = '', status } = req.query as any;

        // Construir filtros
        const filters: any = { deletedAt: null };

        if (search) {
            filters.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'customerData.name': { $regex: search, $options: 'i' } },
                { 'customerData.email': { $regex: search, $options: 'i' } },
            ];
        }
        if (status && ['pending', 'paid', 'cancelled', 'refunded'].includes(String(status))) {
            filters.status = String(status);
        }

        // Calcular paginação
        const skip = (Number(page) - 1) * Number(limit);

        // Buscar pedidos com paginação
        const orders = await Order.find(filters)
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType',
                match: { deletedAt: null },
            })
            .populate('customer', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Contar total de pedidos
        const total = await Order.countDocuments(filters);

        // Remover QR codes de pedidos pendentes (segurança)
        // IMPORTANTE: Para pedidos pagos, garantir que os tickets tenham QR codes
        const ordersWithFilteredQR = await Promise.all(
            orders.map(async (order) => {
                try {
                    // Se o pedido está pago mas os tickets não têm QR codes, gerar
                    if (order.status === 'paid') {
                        const orderDoc = await Order.findById(order._id);
                        if (orderDoc) {
                            const tickets = await Ticket.find({ order: orderDoc._id, deletedAt: null });
                            let needsQRGeneration = false;
                            for (const ticket of tickets) {
                                if (ticket.status === 'confirmed' && !ticket.qrCode) {
                                    needsQRGeneration = true;
                                    ticket.qrCode = await generateQRCode(ticket.code);
                                    await ticket.save();
                                }
                            }
                            if (needsQRGeneration) {
                                // Re-popular para pegar os QR codes atualizados
                                const updatedOrder = await Order.findById(order._id)
                                    .populate({
                                        path: 'tickets',
                                        select: 'code qrCode status price ticketType',
                                        match: { deletedAt: null },
                                    })
                                    .lean();
                                if (updatedOrder) {
                                    return {
                                        ...updatedOrder,
                                        tickets: updatedOrder.tickets.map((ticket: any) => ({
                                            ...ticket,
                                            qrCode:
                                                updatedOrder.status === 'paid' ? ticket.qrCode : null,
                                        })),
                                    };
                                }
                            }
                        }
                    }
                    return {
                        ...order,
                        tickets: order.tickets.map((ticket: any) => ({
                            ...ticket,
                            qrCode: order.status === 'paid' ? ticket.qrCode : null, // Só retorna QR code se pedido estiver pago
                        })),
                    };
                } catch (orderError: any) {
                    // Se houver erro ao processar um pedido individual, logar mas não quebrar tudo
                    console.error(`[listAllOrders] Erro ao processar pedido ${order._id}`, {
                        error: orderError?.message,
                        orderId: order._id,
                    });
                    // Retornar pedido sem processamento adicional em caso de erro
                    return {
                        ...order,
                        tickets: order.tickets || [],
                    };
                }
            })
        );

        res.json({
            success: true,
            data: {
                orders: ordersWithFilteredQR,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'listAllOrders',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Busca um pedido por ID
 */
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        const order = await Order.findOne({
            _id: id,
            deletedAt: null,
        })
            .populate('event', 'name date location coverImage squareImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType usedAt usedBy',
                match: { deletedAt: null },
                populate: [
                    { path: 'usedBy', select: 'name email' },
                    { path: 'ticketType', select: 'name price isVIP' },
                ],
            })
            .populate('customer', 'name email')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado',
            });
        }

        // Verificar se o usuário tem permissão (admin ou dono do pedido)
        const isAdmin = (req as any).user?.role === 'ADMIN';

        // IMPORTANTE: order.customer pode estar populado (objeto) ou não populado (ObjectId)
        // Se estiver populado, extrair o _id. Se não, usar diretamente
        let orderCustomerId: string | null = null;
        if (order.customer) {
            if (typeof order.customer === 'object' && (order.customer as any)._id) {
                // Está populado, extrair o _id
                orderCustomerId = String((order.customer as any)._id);
            } else {
                // Não está populado, é um ObjectId direto
                orderCustomerId = String(order.customer);
            }
        }

        const requestUserId = userId ? String(userId) : null;
        const isOwner = orderCustomerId && requestUserId && orderCustomerId === requestUserId;

        // Verificar permissões

        if (!isAdmin && !isOwner) {return res.status(403).json({
                success: false,
                message: 'Acesso negado',
            });
        }

        // Sincronizar status de pedidos pendentes com Mercado Pago (em background, não bloqueia resposta)
        // REGRA: MP é a fonte de verdade única - sincronizar PIX e cartão
        const isPixOrder = order.paymentMethod === 'pix';
        const isCardOrder =
            order.paymentMethod === 'credit_card' || order.paymentMethod === 'debit_card';

        if (
            order.status === 'pending' &&
            (isPixOrder || isCardOrder) &&
            (order.paymentOrderId || order.paymentId)
        ) {
            // Executar em background para não bloquear a resposta
            setImmediate(async () => {
                try {
                    const orderDoc = await Order.findById(order._id);
                    if (!orderDoc || orderDoc.status !== 'pending') {
                        return;
                    }

                    let paymentInfo: any = null;
                    let mpStatus: string | null = null;
                    let mpExpiration: Date | null = null;

                    // Para PIX, usar Orders API primeiro; para cartão, usar Payment API
                    if (isPixOrder && (orderDoc as any).paymentOrderId) {
                        try {
                            const mpOrder = await paymentService.getOrderById(
                                (orderDoc as any).paymentOrderId
                            );
                            const mpPayment = mpOrder?.transactions?.payments?.[0];
                            if (mpPayment) {
                                paymentInfo = mpPayment;
                                // CRÍTICO: Priorizar status do payment, depois do order
                                mpStatus = (
                                    mpPayment.status ||
                                    mpOrder?.status ||
                                    ''
                                ).toLowerCase();
                                
                                // CRÍTICO: Garantir que status_detail seja capturado do payment
                                if (!paymentInfo.status_detail && mpPayment.status_detail) {
                                    paymentInfo.status_detail = mpPayment.status_detail;
                                }
                                // Se não tiver no payment, tentar do order
                                if (!paymentInfo.status_detail && mpOrder?.status_detail) {
                                    paymentInfo.status_detail = mpOrder.status_detail;
                                }
                                if (mpPayment.date_of_expiration) {
                                    mpExpiration = new Date(mpPayment.date_of_expiration);
                                }
                            } else if (mpOrder?.status) {
                                mpStatus = String(mpOrder.status).toLowerCase();
                                // Se não tem payment, usar status_detail do order
                                if (mpOrder.status_detail) {
                                    paymentInfo = { status_detail: mpOrder.status_detail };
                                }
                            }
                        } catch (orderError) {
                            // Erro ao buscar order do MP - não continuar
                            return;
                        }
                    } else if (orderDoc.paymentId) {
                        // Para cartão ou fallback PIX: usar Payment API
                        try {
                            paymentInfo = await (paymentService as any).getPaymentById(
                                orderDoc.paymentId
                            );
                            if (paymentInfo) {
                                mpStatus = (paymentInfo.status || '').toLowerCase();
                                if (paymentInfo.date_of_expiration) {
                                    mpExpiration = new Date(paymentInfo.date_of_expiration);
                                }
                            }
                        } catch (paymentError) {
                            // Payment API pode não funcionar para PIX Orders API, ignorar erro
                            return;
                        }
                    }

                    if (!mpStatus) return; // Não temos status, não fazer nada

                    // REGRA: MP é a fonte de verdade única - seguir o status do MP imediatamente
                    // Se o pagamento foi aprovado no MP, atualizar o pedido
                    // IMPORTANTE: na Orders API, PIX aprovado vem como status "processed" + status_detail "accredited"
                    const isProcessedAccredited =
                        mpStatus === 'processed' &&
                        String(paymentInfo?.status_detail || '')
                            .toLowerCase()
                            .includes('accredited');if (mpStatus === 'approved' || isProcessedAccredited) {orderDoc.status = 'paid';
                        orderDoc.paymentStatus = 'approved';
                        orderDoc.paymentStatusDetail = paymentInfo?.status_detail || 'accredited';
                        if (paymentInfo?.date_approved) {
                            (orderDoc as any).paidAt = new Date(paymentInfo.date_approved);
                        }
                        await orderDoc.save();// REFATORADO: Não liberar reservas - pedidos não usam mais reservas separadas
                        // O pedido PENDING já funciona como reserva e quando pago, o estoque já está bloqueado corretamente

                        // CRÍTICO: Confirmar APENAS tickets deste pedido específico
                        // NUNCA confirmar tickets de outros pedidos, mesmo que sejam do mesmo cliente
                        const tickets = await Ticket.find({
                            _id: { $in: orderDoc.tickets }, // Usar apenas tickets do pedido
                            order: orderDoc._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                            deletedAt: null,
                        });

                        for (const ticket of tickets) {
                            // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                            if (String(ticket.order) !== String(orderDoc._id)) {continue;
                            }

                            if (ticket.status === 'pending') {
                                ticket.status = 'confirmed';
                                ticket.isActive = true;
                                // Gerar QR code se ainda não tiver
                                if (!ticket.qrCode) {
                                    ticket.qrCode = await generateQRCode(ticket.code);
                                }
                                await ticket.save();
                            }
                        }

                        // Enviar email de confirmação com PDF para pedidos PIX que viraram paid via sincronização
                        if (isPixOrder) {
                            try {
                                const populatedOrder = await Order.findById(orderDoc._id)
                                    .populate('event', 'name date location address')
                                    .populate('tickets', 'code qrCode ticketType holder')
                                    .populate('customer', 'name email')
                                    .populate('tickets.ticketType', 'name')
                                    .lean();

                                if (populatedOrder && populatedOrder.customer) {
                                    const event: any = populatedOrder.event;
                                    const customer: any = populatedOrder.customer;
                                    const ticketsWithQR = (populatedOrder.tickets as any[]).filter(
                                        (t) => t.qrCode
                                    );

                                    if (ticketsWithQR.length > 0) {
                                        const pdfBuffer = await generateTicketPDF({
                                            event: {
                                                name: event.name,
                                                date: event.date,
                                                location: event.location,
                                                address: event.address,
                                            },
                                            orderNumber: populatedOrder.orderNumber,
                                            customerName: customer.name,
                                            tickets: ticketsWithQR.map((t) => ({
                                                code: t.code,
                                                qrCode: t.qrCode,
                                                ticketType: (t.ticketType as any)?.name || 'Ingresso',
                                                holderName: (t.holder as any)?.name || customer.name,
                                            })),
                                        });

                                        const eventDate = new Date(event.date).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            }
                                        );

                                        const frontendUrl =
                                            process.env.FRONTEND_URL ||
                                            process.env.DASHBOARD_URL ||
                                            'http://localhost:3000';

                                        await sendTicketConfirmationEmail(
                                            customer.email,
                                            {
                                                customerName: customer.name,
                                                orderNumber: populatedOrder.orderNumber,
                                                eventName: event.name,
                                                eventDate,
                                                eventLocation: event.location,
                                                eventAddress: event.address,
                                                totalTickets: ticketsWithQR.length,
                                                ticketType:
                                                    ticketsWithQR[0]?.ticketType?.name || 'Ingresso',
                                                downloadLink: `${frontendUrl}/dashboard`,
                                                qrCodes: ticketsWithQR.map((t) => ({
                                                    code: t.code,
                                                    qrCode: t.qrCode,
                                                    holderName:
                                                        (t.holder as any)?.name || customer.name,
                                                })),
                                            },
                                            [
                                                {
                                                    filename: `ingressos-${populatedOrder.orderNumber}.pdf`,
                                                    content: pdfBuffer,
                                                    contentType: 'application/pdf',
                                                },
                                            ]
                                        );
                                    }
                                }
                            } catch (emailError) {
                                // Erro ao enviar email - não bloquear processo
                            }
                        }
                    }
                    // REGRA: Se o MP cancelou, SEMPRE seguir o MP (100% alinhamento)
                    else if (['cancelled', 'rejected', 'expired'].includes(mpStatus)) {
                        // Se o MP cancelou, seguir o MP independente da data de expiração
                        orderDoc.status = 'cancelled';
                        orderDoc.paymentStatus = mpStatus;
                        orderDoc.paymentStatusDetail = paymentInfo?.status_detail || mpStatus;
                        await orderDoc.save();

                        // MP cancelou - seguir status do MP
                    }
                } catch (syncError) {
                    // Não bloquear a resposta em caso de erro na sincronização
                    // Erro silencioso - não é crítico para a resposta
                }
            });
        }

        // Buscar tickets atualizados (pode ter sido atualizado em background)
        // Re-popular para garantir que temos os QR codes mais recentes
        const freshOrder = await Order.findById(order._id)
            .populate('event', 'name date location coverImage squareImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType usedAt usedBy',
                match: { deletedAt: null },
                populate: [
                    { path: 'usedBy', select: 'name email' },
                    { path: 'ticketType', select: 'name price isVIP' },
                ],
            })
            .populate('customer', 'name email')
            .lean();

        if (!freshOrder) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado',
            });
        }

        // Para pedidos PIX pendentes, buscar informações do PIX para exibir no frontend
        // CRÍTICO: Para PIX, sempre usar Orders API (paymentOrderId), não Payment API
        let pixInfo: any = null;
        if (freshOrder.status === 'pending' && freshOrder.paymentMethod === 'pix') {
            // Buscar paymentOrderId do banco (pode não estar no lean())
            const orderDocForPix = await Order.findById(freshOrder._id)
                .select('paymentOrderId paymentId')
                .lean();
            const paymentOrderId =
                (orderDocForPix as any)?.paymentOrderId || (freshOrder as any).paymentOrderId;

            // Buscar informações do PIX

            try {
                const paymentService = await import('../services/paymentService');
                // Para PIX, SEMPRE tentar Orders API primeiro (via paymentOrderId)
                if (paymentOrderId) {
                    try {
                        const mpOrder = await paymentService.getOrderById(paymentOrderId);
                        const mpPayment = mpOrder?.transactions?.payments?.[0];

                        // Na Orders API, o PIX está em payment_method (não payment_method_id)
                        // Verificar se é PIX: payment_method.type === 'pix' ou payment_method_id === 'pix'
                        const isPix =
                            mpPayment?.payment_method?.type === 'pix' ||
                            mpPayment?.payment_method_id === 'pix' ||
                            (mpPayment?.payment_method && !mpPayment?.payment_method_id); // Se tem payment_method mas não payment_method_id, provavelmente é PIX

                        if (mpPayment && isPix) {
                            // Na Orders API, os dados do PIX estão em payment_method, não em point_of_interaction
                            pixInfo = {
                                qrCode: mpPayment.payment_method?.qr_code || null,
                                qrCodeBase64: mpPayment.payment_method?.qr_code_base64 || null,
                                ticketUrl: mpPayment.payment_method?.ticket_url || null,
                                expiresAt: mpPayment.date_of_expiration
                                    ? new Date(mpPayment.date_of_expiration).toISOString()
                                    : null,
                                expirationMinutes: mpPayment.date_of_expiration
                                    ? Math.round(
                                          (new Date(mpPayment.date_of_expiration).getTime() -
                                              Date.now()) /
                                              (60 * 1000)
                                      )
                                    : null,
                            };
                        }
                    } catch (orderError: any) {
                        // Não tentar Payment API para PIX - não funciona
                    }
                }
            } catch (error: any) {
                // Erro ao buscar informações do PIX - ignorar
            }
        }

        // Remover QR codes de pedidos pendentes (segurança)
        const orderWithFilteredQR = {
            ...freshOrder,
            tickets: freshOrder.tickets.map((ticket: any) => ({
                ...ticket,
                qrCode: freshOrder.status === 'paid' ? ticket.qrCode : null, // Só retorna QR code se pedido estiver pago
            })),
            pixInfo: pixInfo || undefined, // Informações do PIX para pedidos pendentes
        };

        res.json({
            success: true,
            data: orderWithFilteredQR,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'getOrderById',
            statusCode: 500,
            extra: {
                orderId: req.params?.id,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedido',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Cancela um pedido pendente e libera recursos (tickets/reservas)
 * Regras:
 * - Somente ADMIN ou dono do pedido
 * - Somente pedidos 'pending' podem ser cancelados aqui
 * - Pedidos 'paid' devem seguir fluxo de reembolso (não tratado aqui)
 */
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUser = (req as any).user;
        const userId = authUser?._id?.toString() || authUser?.id;

        // Buscar pedido
        const order = await Order.findOne({ _id: id, deletedAt: null });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        // Permissões: admin ou dono do pedido
        const isAdmin = authUser?.role === 'ADMIN';
        const isOwner = String(order.customer) === String(userId);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        if (order.status === 'cancelled') {
            return res.json({ success: true, message: 'Pedido já está cancelado' });
        }
        if (order.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Pedido pago não pode ser cancelado aqui. Use reembolso.',
            });
        }

        // Se houver pagamento, primeiro consultar status no MP para evitar falso positivo
        // Para PIX: verificar date_of_expiration antes de cancelar (garantir 100% alinhamento com MP)
        const isPixOrder = order.paymentMethod === 'pix';

        if (order.paymentId || (order as any).paymentOrderId) {
            try {
                let payment: any = null;
                let mpStatus: string | null = null;
                let mpExpiration: Date | null = null;

                // Para PIX, tentar Orders API primeiro
                if (isPixOrder && (order as any).paymentOrderId) {
                    try {
                        const mpOrder = await paymentService.getOrderById(
                            (order as any).paymentOrderId
                        );
                        const mpPayment = mpOrder?.transactions?.payments?.[0];
                        if (mpPayment) {
                            payment = mpPayment;
                            mpStatus = (mpPayment.status || mpOrder?.status || '').toLowerCase();
                            if (mpPayment.date_of_expiration) {
                                mpExpiration = new Date(mpPayment.date_of_expiration);
                            }
                        } else if (mpOrder?.status) {
                            mpStatus = String(mpOrder.status).toLowerCase();
                        }
                    } catch (orderError) {}
                }

                // Fallback: tentar Payment API
                if (!mpStatus && order.paymentId) {
                    try {
                        payment = await (paymentService as any).getPaymentById(order.paymentId);
                        if (payment) {
                            mpStatus = (payment?.status || '').toLowerCase();
                            if (payment?.date_of_expiration) {
                                mpExpiration = new Date(payment.date_of_expiration);
                            }
                        }
                    } catch (paymentError) {}
                }

                if (mpStatus === 'approved') {
                    return res.status(400).json({
                        success: false,
                        message: 'Pedido já aprovado no Mercado Pago; não é possível cancelar.',
                    });
                }

                // Para PIX: verificar se realmente expirou antes de cancelar
                if (isPixOrder && mpExpiration) {
                    const now = new Date();
                    if (now < mpExpiration) {
                        return res.status(400).json({
                            success: false,
                            message: `Pedido PIX ainda não expirou no Mercado Pago. Expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} minutos. Aguarde a expiração ou cancele diretamente no Mercado Pago.`,
                        });
                    }
                }

                // Só tentar cancelar se ainda pendente/acionável
                if (mpStatus && ['pending', 'in_process', 'action_required'].includes(mpStatus)) {
                    if (isPixOrder && (order as any).paymentOrderId) {
                        try {
                            await paymentService.cancelOrderById((order as any).paymentOrderId);
                        } catch (cancelError) {}
                    } else if (order.paymentId) {
                        try {
                            await (paymentService as any).cancelPaymentById(order.paymentId);
                        } catch (cancelError) {}
                    }
                    order.paymentStatus = 'cancelled';
                    order.paymentStatusDetail = order.paymentStatusDetail || 'cancelled';
                    order.paymentMessage = 'Pagamento cancelado no Mercado Pago.';
                }
            } catch (e) {
                // Se não conseguir cancelar no MP, prosseguir com cancel local
            }
        }

        // Buscar tickets para obter ticketType e quantidade
        // CRÍTICO: Buscar APENAS tickets pending para liberar estoque
        // Tickets confirmed já foram pagos e não devem ter estoque liberado
        const pendingTickets = await Ticket.find({
            order: order._id,
            deletedAt: null,
            status: 'pending', // APENAS tickets pending
        }).populate('ticketType');

        // Agrupar por ticketType para liberar estoque corretamente (apenas pending)
        const ticketTypeCounts = new Map<string, number>();
        for (const ticket of pendingTickets) {
            const ticketTypeId = String(
                (ticket as any).ticketType?._id || (ticket as any).ticketType
            );
            if (ticketTypeId) {
                ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1);
            }
        }

        // CRÍTICO: Liberar estoque IMEDIATAMENTE para cada ticketType (apenas dos tickets pending)
        // Isso garante que os ingressos fiquem disponíveis assim que o pedido é cancelado
        for (const [ticketTypeId, quantity] of ticketTypeCounts.entries()) {
            const ticketType = await TicketType.findById(ticketTypeId);
            if (ticketType && quantity > 0) {
                const oldSoldQuantity = ticketType.soldQuantity;
                ticketType.soldQuantity = Math.max(0, ticketType.soldQuantity - quantity);
                await ticketType.save();
            }
        }

        // Buscar todos os tickets para resposta (incluindo confirmed)
        const allTickets = await Ticket.find({ order: order._id, deletedAt: null }).populate(
            'ticketType'
        );

        // REFATORADO: Não liberar reservas - pedidos não usam mais reservas separadas
        // O pedido PENDING já funciona como reserva e quando cancelado, o estoque é liberado automaticamente

        // Cancelar pedido
        const oldStatus = order.status;
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();

        // Registrar auditoria
        const auditContext = createAuditContextFromRequest(req);
        logAudit({
            entityType: 'Order',
            entityId: String(order._id),
            action: 'cancel',
            performedBy: auditContext.performedBy,
            performedByRole: auditContext.performedByRole,
            changes: [
                {
                    field: 'status',
                    oldValue: oldStatus,
                    newValue: 'cancelled',
                },
            ],
            metadata: {
                ipAddress: auditContext.ipAddress,
                userAgent: auditContext.userAgent,
                orderNumber: order.orderNumber,
                reason: 'Cancelamento manual',
                paymentMethod: order.paymentMethod,
            },
        }).catch((error) => {
            // Erro ao registrar auditoria - não bloquear cancelamento
        });

        // CRÍTICO: Cancelar APENAS tickets pending (não cancelar tickets já confirmados/pagos)
        // Se o pedido tem tickets confirmados (já pagos) e tickets pending (aguardando pagamento),
        // apenas os pending devem ser cancelados quando o pagamento expira
        await Ticket.updateMany(
            {
                order: order._id,
                deletedAt: null,
                status: 'pending', // APENAS tickets pending - não mexer nos confirmados
            },
            { $set: { status: 'cancelled', isActive: false, qrCode: '' } }
        );

        // Se ainda há tickets confirmados, o pedido não deveria estar cancelado
        // Mas como o PIX expirou, mantemos o pedido como cancelled
        // Os tickets confirmados continuam válidos mesmo com pedido cancelled

        // Enviar email de cancelamento (não bloquear resposta se falhar)
        try {
            const populatedOrder = await Order.findById(order._id)
                .populate('event', 'name date location')
                .populate('customer', 'name email')
                .lean();

            if (populatedOrder && populatedOrder.customer) {
                const event = populatedOrder.event as any;
                const customer = populatedOrder.customer as any;

                await sendOrderCancelledEmail(customer.email, {
                    customerName: customer.name,
                    orderNumber: populatedOrder.orderNumber,
                    eventName: event.name,
                    cancelledAt: new Date().toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    cancellationReason: 'Pedido cancelado pelo usuário ou sistema',
                    refundInfo: order.paymentId
                        ? 'O valor será estornado em até 5 dias úteis.'
                        : undefined,
                });
            }
        } catch (emailError) {
            // Não falhar o cancelamento se o email falhar
        }

        // Segurança extra: nunca retornar QR de tickets não confirmados
        const safeTickets = allTickets.map((t) => {
            const ticketObj = t.toObject();
            // Manter QR code apenas se ticket está confirmed
            if (ticketObj.status !== 'confirmed') {
                ticketObj.qrCode = ''; // String vazia em vez de null
            }
            return ticketObj;
        });

        return res.json({
            success: true,
            message: 'Pedido cancelado com sucesso',
            data: {
                order: { ...order.toObject(), status: 'cancelled' },
                tickets: safeTickets,
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'cancelOrder',
            statusCode: 500,
            extra: {
                orderId: req.params?.id,
            },
        });
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao cancelar pedido',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Confirma pagamento de um pedido e gera QR codes para os ingressos
 * Este endpoint será chamado após confirmação de pagamento do gateway
 */
export const confirmPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { paymentId, paymentStatus } = req.body;

        // Buscar pedido
        const order = await Order.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado',
            });
        }

        // Verificar se o pedido já está pago
        if (order.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Pedido já está pago',
            });
        }

        // Verificar se o pedido está pendente
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Pedido não pode ser confirmado',
                errors: [
                    `Status atual: ${order.status}. Apenas pedidos pendentes podem ser confirmados.`,
                ],
            });
        }

        // Atualizar status do pedido para pago
        order.status = 'paid';
        order.paidAt = new Date();
        if (paymentId) order.paymentId = paymentId;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        await order.save();

        // Buscar todos os tickets do pedido
        const tickets = await Ticket.find({
            order: order._id,
            deletedAt: null,
        });
        
        // Invalidar cache de contagens de tickets quando pedido é pago
        // Buscar ticket types únicos do pedido para invalidar cache específico
        const uniqueTicketTypeIds = [...new Set(tickets.map((t: any) => String(t.ticketType)))];
        const { cacheTicketCounts } = await import('../services/cacheService');
        uniqueTicketTypeIds.forEach(ticketTypeId => {
            cacheTicketCounts.invalidateForEvent(String(order.event), ticketTypeId);
        });

        // Gerar QR codes para todos os tickets pendentes
        for (const ticket of tickets) {
            if (ticket.status === 'pending' && !ticket.qrCode) {
                // Atualizar status do ticket para confirmado
                ticket.status = 'confirmed';

                // Gerar QR Code
                const qrCode = await generateQRCode(ticket.code);
                ticket.qrCode = qrCode;

                await ticket.save();
            }
        }

        // Popular dados para resposta
        const populatedOrder = await Order.findById(order._id)
            .populate('event', 'name date location coverImage')
            .populate('tickets', 'code qrCode status price ticketType')
            .populate('customer', 'name email')
            .lean();

        res.json({
            success: true,
            message: 'Pagamento confirmado e QR codes gerados com sucesso',
            data: populatedOrder,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'confirmPayment',
            statusCode: 500,
            extra: {
                orderId: req.params?.id,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao confirmar pagamento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Obter estatísticas financeiras (apenas ADMIN)
 * Retorna: total de vendas (subtotal, sem taxa) e total de taxas da plataforma
 */
export const getFinancialStats = async (req: Request, res: Response) => {
    try {
        // Buscar todos os pedidos pagos (excluindo VIPs)
        const paidOrders = await Order.find({
            status: 'paid',
            paymentMethod: { $ne: 'vip_free' },
            deletedAt: null,
        })
            .select('subtotal discountAmount platformFee')
            .lean();

        // Calcular totais
        let totalSales = 0; // Total de vendas para repassar ao dono (subtotal - desconto, SEM taxa)
        let totalFees = 0; // Total de taxas da plataforma

        for (const order of paidOrders) {
            // Subtotal após desconto = subtotal original - desconto
            // Esse é o valor que deve ser repassado ao dono do evento
            const subtotalAfterDiscount = (order.subtotal || 0) - (order.discountAmount || 0);
            totalSales += subtotalAfterDiscount;
            totalFees += Number(order.platformFee || 0);
        }

        return res.json({
            success: true,
            data: {
                totalSales, // Valor total das vendas (sem taxa)
                totalFees, // Valor total das taxas (recebível da plataforma)
                totalRevenue: totalSales + totalFees, // Total geral (para referência)
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'getFinancialStats',
            statusCode: 500,
        });
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas financeiras',
            errors: [error.message],
        });
    }
};

/**
 * Atualiza código de promotor em pedido existente
 * Recalcula valores do pedido sem resetar timer ou status
 */
export const updateOrderPromoterCode = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString();
        const { id: orderId } = req.params;
        const { promoterCode } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'ID do pedido é obrigatório',
            });
        }

        // Buscar pedido
        const order = await Order.findById(orderId).populate('event').populate('tickets').lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado',
            });
        }
        
        // Verificar se o pedido pertence ao usuário (se autenticado)
        if (userId) {
            const orderUserId = order.customer?.toString() || order.customer;
            if (orderUserId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado',
                });
            }
        }

        // Verificar se o pedido está pendente
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Apenas pedidos pendentes podem ter código de promotor atualizado',
            });
        }

        // Buscar evento e ticketType
        const eventId = typeof order.event === 'object' ? (order.event as any)._id : order.event;
        const event = await Event.findById(eventId).lean();
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
            });
        }
        
        // Buscar tickets do pedido para obter ticketType
        const tickets = await Ticket.find({ order: orderId, deletedAt: null })
            .populate('ticketType')
            .lean();

        if (tickets.length === 0) {return res.status(400).json({
                success: false,
                message: 'Pedido não possui tickets',
            });
        }// Usar o primeiro ticket para obter ticketType (todos devem ser do mesmo tipo)
        const ticketType = tickets[0].ticketType as any;
        if (!ticketType) {return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }// Validar código de promotor se fornecido
        let usedPromoterCode: string | undefined = undefined;
        let discountAmount = 0;

        if (promoterCode) {
            const codeToSearch = String(promoterCode).toUpperCase().trim();const code = await PromoterCode.findOne({
                code: codeToSearch,
                isActive: true,
                deletedAt: null,
                events: eventId,
            }).lean();

            if (!code) {return res.status(400).json({
                    success: false,
                    message: 'Código de promotor inválido ou não válido para este evento',
                });
            }
            usedPromoterCode = code.code;

            // Recalcular desconto baseado no subtotal atual do pedido
            const ticketIsVIP = ticketType.isVIP;
            if (!ticketIsVIP) {
                if (code.discountType === 'percentage') {
                    discountAmount = (order.subtotal || 0) * (code.discountValue / 100);
                } else {
                    discountAmount = Math.min(code.discountValue, order.subtotal || 0);
                }
            }
        } else {
            // Sem código de promotor
        }

        // Recalcular valores do pedido
        const isVIP = ticketType.isVIP;
        const subtotal = order.subtotal || 0;
        const platformFeePercentage = event.platformFeePercentage || 0;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const platformFee = isVIP ? 0 : subtotalAfterDiscount * (platformFeePercentage / 100);
        const totalAmount = subtotalAfterDiscount + platformFee;
        
        // Atualizar pedido
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                promoterCode: usedPromoterCode || null,
                discountAmount,
                platformFee,
                totalAmount,
            },
            { new: true }
        )
            .populate('event', 'name date location address')
            .populate('tickets', 'code qrCode status price ticketType holder')
            .populate('customer', 'name email')
            .populate('tickets.ticketType', 'name')
            .lean();

        if (!updatedOrder) {return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar pedido',
            });
        }
        
        return res.json({
            success: true,
            message: promoterCode
                ? 'Código de promotor aplicado com sucesso'
                : 'Código de promotor removido com sucesso',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'ordersController',
            action: 'updatePromoterCode',
            statusCode: 500,
            extra: {
                orderId: req.params?.id,
                promoterCode: req.body?.promoterCode,
            },
        });
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar código de promotor',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};
