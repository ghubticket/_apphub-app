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

        // Preparar CPF e Email para validação
        // CRÍTICO: Para ingressos VIP com maxPerCPF, CPF é OBRIGATÓRIO
        const cpfToValidate = customerData?.cpf || user?.cpf;
        const emailToValidate = customerData?.email || user?.email;
        const normalizedCustomerEmail = normalizeEmail(customerData?.email);
        const normalizedUserEmail = normalizeEmail(user?.email);

        // Log para debug - verificar se CPF está sendo passado
        console.log('[createOrder] 🔍 Dados do cliente para validação:', {
            hasCustomerDataCPF: !!customerData?.cpf,
            hasUserCPF: !!user?.cpf,
            cpfToValidate: cpfToValidate ? `${cpfToValidate.substring(0, 3)}.***.***-**` : 'null',
            hasCustomerDataEmail: !!customerData?.email,
            hasUserEmail: !!user?.email,
            emailToValidate: emailToValidate ? `${emailToValidate.substring(0, 3)}***@***` : 'null',
            ticketTypeName: ticketType?.name,
            ticketTypeIsVIP: ticketType?.isVIP,
            ticketTypeMaxPerCPF: ticketType?.maxPerCPF,
        });

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

        if (isVIP && !isReallyVIP) {
            console.error(
                '[createOrder] ⚠️ ATENÇÃO: isVIP calculado como true mas ticketType.isVIP não é explicitamente true!',
                {
                    calculatedIsVIP: isVIP,
                    ticketTypeIsVIP: ticketType?.isVIP,
                    ticketTypeId: ticketType?._id,
                    ticketTypeName: ticketType?.name,
                }
            );
        }

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
            console.log(
                `♻️ [createOrder] Pedido existente encontrado para mesmo evento/cliente, adicionando ingressos: orderNumber=${existingOrder.orderNumber}, status=${orderStatus}, paymentMethod=${paymentMethod}`
            );

            // CRÍTICO: Se o pedido existente tem status 'failed', verificar se ainda pode ser reutilizado
            // Permitir reutilização até esgotar tentativas (MAX_CARD_PAYMENT_ATTEMPTS)
            if (orderStatus === 'failed') {
                const cardAttempts = existingOrder.cardAttempts || 0;
                if (cardAttempts >= MAX_CARD_PAYMENT_ATTEMPTS) {
                    // Esgotou tentativas: cancelar pedido e criar novo
                    console.log(
                        `⚠️ [createOrder] Pedido failed esgotou tentativas (${cardAttempts}/${MAX_CARD_PAYMENT_ATTEMPTS}), cancelando e criando novo pedido`
                    );
                    try {
                        await orderService.cancelOrderAndReturnStock(existingOrder);
                        console.log(
                            `✅ [createOrder] Pedido failed cancelado (tentativas esgotadas), criando novo pedido`
                        );
                    } catch (cancelError) {
                        console.error(
                            `❌ [createOrder] Erro ao cancelar pedido failed:`,
                            cancelError
                        );
                    }
                    // Não reutilizar - continuar para criar novo pedido
                } else {
                    // Ainda pode tentar: reutilizar o pedido failed
                    console.log(
                        `♻️ [createOrder] Pedido failed pode ser reutilizado (${cardAttempts}/${MAX_CARD_PAYMENT_ATTEMPTS} tentativas), resetando status para pending`
                    );
                    const orderToUpdate = await Order.findById(existingOrder._id);
                    if (orderToUpdate) {
                        // Resetar status para pending para permitir nova tentativa
                        // CRÍTICO: Manter expiresAt original, não renovar o tempo
                        orderToUpdate.status = 'pending';
                        orderToUpdate.isActive = true;
                        // Não alterar expiresAt - manter o tempo original do pedido
                        await orderToUpdate.save();
                        console.log(
                            `✅ [createOrder] Pedido resetado para pending (mantendo expiresAt original: ${orderToUpdate.expiresAt}), pode tentar pagamento novamente`
                        );
                        // Continuar para reutilizar o pedido (código abaixo)
                    } else {
                        // Não encontrou pedido, continuar para criar novo
                        console.log(
                            `⚠️ [createOrder] Pedido não encontrado no banco, criando novo`
                        );
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
                    orderToUpdate.platformFee = (orderToUpdate.platformFee || 0) + newPlatformFee;
                    orderToUpdate.totalAmount = (orderToUpdate.totalAmount || 0) + newTotalAmount;

                    if (usedPromoterCode && !orderToUpdate.promoterCode) {
                        orderToUpdate.promoterCode = usedPromoterCode;
                    }

                    await orderToUpdate.save();

                    // Atualizar quantidade vendida
                    ticketType.soldQuantity += quantity;
                    await ticketType.save();

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

            if (reusableOrder) {
                console.log(
                    `♻️ [createOrder] Pedido reutilizado: orderNumber=${reusableOrder.orderNumber}, cardAttempts=${reusableOrder.cardAttempts || 0}, MAX=${MAX_CARD_PAYMENT_ATTEMPTS}`
                );
                return res.status(200).json({
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
            console.log(
                '[createOrder] ✅ Criando pedido VIP (status=paid, paymentMethod=vip_free)'
            );
        } else {
            // Outros: aguarda pagamento (será integrado depois)
            // CRÍTICO: PIX, cartão, etc. SEMPRE começam como pending
            orderStatus = 'pending';
            ticketStatus = 'pending';
            console.log(
                '[createOrder] ✅ Criando pedido normal (status=pending, aguardando pagamento)'
            );
        }

        const finalCustomerEmail =
            normalizedCustomerEmail ||
            normalizeEmail(user?.email) ||
            customerData?.email ||
            user?.email ||
            'Não informado';

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
                    name: customerData?.name || user?.name || 'Não informado',
                    email: finalCustomerEmail,
                    phone: customerData?.phone || user?.phone,
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
                console.error('Erro ao registrar auditoria (não crítico):', error);
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
                    console.error('Erro ao detectar padrões suspeitos (não crítico):', error);
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

            // Atualizar quantidade vendida do tipo de ingresso
            ticketType.soldQuantity += quantity;
            await ticketType.save();

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
            console.error('Erro ao criar pedido:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar pedido',
                errors: [error?.message || 'Erro desconhecido'],
            });
        }
    } catch (outerError: any) {
        console.error('Erro ao criar pedido (pré-transação):', outerError);
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
    try {
        const user = (req as any).user;
        const userId = user?._id?.toString() || user?.id;

        if (!userId) {
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
        const orders = await Order.find(filters)
            .populate('event', '_id name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price',
                match: { deletedAt: null },
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

                    console.log(
                        `[listMyOrders] 🔍 Buscando PIX para pedido ${order.orderNumber}:`,
                        {
                            hasPaymentOrderId: !!paymentOrderId,
                            paymentOrderId,
                            hasPaymentId: !!order.paymentId,
                            paymentId: order.paymentId,
                            orderId: order._id,
                            environment: process.env.NODE_ENV,
                        }
                    );

                    try {
                        // Para PIX, SEMPRE tentar Orders API primeiro (via paymentOrderId)
                        if (paymentOrderId) {
                            try {
                                const mpOrder = await paymentService.getOrderById(paymentOrderId);
                                const mpPayment = mpOrder?.transactions?.payments?.[0];

                                // Log completo para debug
                                console.log(
                                    `[listMyOrders] 🔍 Estrutura completa do payment para pedido ${order.orderNumber}:`,
                                    {
                                        hasMpPayment: !!mpPayment,
                                        paymentKeys: mpPayment ? Object.keys(mpPayment) : [],
                                        paymentMethod: mpPayment?.payment_method,
                                        paymentMethodType: mpPayment?.payment_method?.type,
                                        paymentMethodId: mpPayment?.payment_method_id,
                                        status: mpPayment?.status,
                                        dateOfExpiration: mpPayment?.date_of_expiration,
                                        hasQrCode: !!mpPayment?.payment_method?.qr_code,
                                        hasQrCodeBase64: !!mpPayment?.payment_method?.qr_code_base64,
                                        hasTicketUrl: !!mpPayment?.payment_method?.ticket_url,
                                        pointOfInteraction: mpPayment?.point_of_interaction,
                                        environment: process.env.NODE_ENV,
                                    }
                                );

                                // Na Orders API, o PIX está em payment_method (não payment_method_id)
                                // Verificar se é PIX: payment_method.type === 'pix' ou payment_method_id === 'pix'
                                // OU payment_method.id === 'pix' (algumas versões da API)
                                const isPix =
                                    mpPayment?.payment_method?.type === 'pix' ||
                                    mpPayment?.payment_method?.id === 'pix' ||
                                    mpPayment?.payment_method_id === 'pix' ||
                                    (mpPayment?.payment_method && !mpPayment?.payment_method_id); // Se tem payment_method mas não payment_method_id, provavelmente é PIX
                                
                                // Log adicional para debug em dev
                                if (process.env.NODE_ENV !== 'production') {
                                    console.log(`[listMyOrders] 🔍 Verificação PIX para pedido ${order.orderNumber}:`, {
                                        isPix,
                                        paymentMethodType: mpPayment?.payment_method?.type,
                                        paymentMethodId: mpPayment?.payment_method?.id,
                                        paymentMethodIdField: mpPayment?.payment_method_id,
                                        hasPaymentMethod: !!mpPayment?.payment_method,
                                    });
                                }

                                if (mpPayment && isPix) {
                                    // Na Orders API, os dados do PIX podem estar em payment_method OU em point_of_interaction.transaction_data
                                    const txData: any =
                                        (mpPayment as any).point_of_interaction?.transaction_data || {};

                                    const qrCode =
                                        mpPayment.payment_method?.qr_code ||
                                        txData.qr_code ||
                                        null;
                                    const qrCodeBase64 =
                                        mpPayment.payment_method?.qr_code_base64 ||
                                        txData.qr_code_base64 ||
                                        null;
                                    const ticketUrl =
                                        mpPayment.payment_method?.ticket_url ||
                                        txData.ticket_url ||
                                        null;

                                    pixInfo = {
                                        qrCode,
                                        qrCodeBase64,
                                        ticketUrl,
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
                                    console.log(
                                        `[listMyOrders] ✅ Informações PIX encontradas via Orders API para pedido ${order.orderNumber}`,
                                        {
                                            paymentOrderId,
                                            hasQrCode: !!pixInfo.qrCodeBase64,
                                            hasTicketUrl: !!pixInfo.ticketUrl,
                                            hasQrCodeString: !!pixInfo.qrCode,
                                            expirationMinutes: pixInfo.expirationMinutes,
                                        }
                                    );
                                } else {
                                    console.warn(
                                        `[listMyOrders] ⚠️ Pedido PIX ${order.orderNumber} não é PIX no Orders API`,
                                        {
                                            paymentOrderId,
                                            paymentMethodType: mpPayment?.payment_method?.type,
                                            paymentMethodId: mpPayment?.payment_method_id,
                                            hasMpPayment: !!mpPayment,
                                            mpPaymentKeys: mpPayment ? Object.keys(mpPayment) : [],
                                            environment: process.env.NODE_ENV,
                                        }
                                    );
                                }
                            } catch (orderError: any) {
                                console.error(
                                    `[listMyOrders] ❌ Erro ao buscar order ${paymentOrderId} no MP para pedido ${order.orderNumber}:`,
                                    {
                                        message: orderError.message,
                                        status: orderError.response?.status,
                                        statusText: orderError.response?.statusText,
                                        responseData: orderError.response?.data,
                                        stack: orderError.stack,
                                        environment: process.env.NODE_ENV,
                                    }
                                );
                                // Não tentar Payment API para PIX - não funciona
                            }
                        } else {
                            console.warn(
                                `[listMyOrders] ⚠️ Pedido PIX ${order.orderNumber} não tem paymentOrderId salvo no banco`,
                                {
                                    hasPaymentId: !!order.paymentId,
                                    paymentId: order.paymentId,
                                }
                            );
                        }

                        if (!pixInfo) {
                            console.warn(
                                `[listMyOrders] ⚠️ Não foi possível obter informações PIX para pedido ${order.orderNumber}`,
                                {
                                    hasPaymentOrderId: !!paymentOrderId,
                                    paymentOrderId,
                                    hasPaymentId: !!order.paymentId,
                                    paymentId: order.paymentId,
                                    environment: process.env.NODE_ENV,
                                }
                            );
                        }
                    } catch (error: any) {
                        console.error(
                            `[listMyOrders] Erro geral ao buscar informações do PIX para pedido ${order.orderNumber}:`,
                            error.message
                        );
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

                // Log para debug
                if (order.status === 'pending' && order.paymentMethod === 'pix') {
                    console.log(
                        `[listMyOrders] 📦 Retornando pedido PIX pendente ${order.orderNumber}:`,
                        {
                            hasPixInfo: !!orderResponse.pixInfo,
                            pixInfoKeys: orderResponse.pixInfo
                                ? Object.keys(orderResponse.pixInfo)
                                : [],
                            hasQrCode: !!orderResponse.pixInfo?.qrCodeBase64,
                            hasTicketUrl: !!orderResponse.pixInfo?.ticketUrl,
                        }
                    );
                }

                return orderResponse;
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
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
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
        console.error('Erro ao listar todos os pedidos:', error);
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

        // OTIMIZAÇÃO: Reduzir logs verbosos - só logar se não estiver em produção ou se for primeira vez
        const shouldLogPermission = process.env.NODE_ENV !== 'production' || !(global as any).__lastPermissionLogTime || Date.now() - (global as any).__lastPermissionLogTime > 10000;
        if (shouldLogPermission) {
            console.log('[getOrderById] 🔍 Verificando permissão:', {
                orderId: id,
                orderCustomerId,
                requestUserId,
                isAdmin,
                isOwner,
                orderCustomerType: typeof order.customer,
                requestUserType: typeof userId,
                orderCustomerValue: order.customer,
                requestUserValue: userId,
            });
            (global as any).__lastPermissionLogTime = Date.now();
        }

        if (!isAdmin && !isOwner) {
            console.log('[getOrderById] ❌ Acesso negado:', {
                orderId: id,
                reason:
                    !isAdmin && !isOwner
                        ? 'Usuário não é admin nem dono do pedido'
                        : 'Desconhecido',
                orderCustomerId,
                requestUserId,
            });
            return res.status(403).json({
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
                        console.log(`⏭️ [getOrderById] Pulando sincronização:`, {
                            orderId: order._id,
                            orderNumber: order.orderNumber,
                            reason: !orderDoc ? 'orderDoc não encontrado' : 'status não é pending',
                            currentStatus: orderDoc?.status,
                        });
                        return;
                    }
                    
                    console.log(`🔄 [getOrderById] Iniciando sincronização com MP:`, {
                        orderId: orderDoc._id,
                        orderNumber: orderDoc.orderNumber,
                        paymentMethod: orderDoc.paymentMethod,
                        paymentOrderId: (orderDoc as any).paymentOrderId,
                        paymentId: orderDoc.paymentId,
                    });

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
                                
                                // DEBUG: Log detalhado do que veio do MP
                                console.log(`📦 [getOrderById] Dados do MP recebidos:`, {
                                    orderId: orderDoc._id,
                                    orderNumber: orderDoc.orderNumber,
                                    mpPaymentStatus: mpPayment.status,
                                    mpPaymentStatusDetail: mpPayment.status_detail,
                                    mpOrderStatus: mpOrder?.status,
                                    mpOrderStatusDetail: mpOrder?.status_detail,
                                    finalMpStatus: mpStatus,
                                    paymentInfoStatusDetail: paymentInfo.status_detail,
                                });
                                
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
                            if (process.env.NODE_ENV !== 'production') {
                                console.warn(
                                    '[getOrderById] Erro ao buscar order no MP:',
                                    orderError
                                );
                            }
                            return; // Não continuar se não conseguir buscar
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
                            if (process.env.NODE_ENV !== 'production') {
                                console.warn(
                                    '[getOrderById] Erro ao buscar payment no MP:',
                                    paymentError
                                );
                            }
                            return; // Não continuar se não conseguir buscar
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
                            .includes('accredited');

                    console.log(`🔍 [getOrderById] Verificando status do MP para sincronização:`, {
                        orderId: orderDoc._id,
                        orderNumber: orderDoc.orderNumber,
                        mpStatus,
                        paymentStatusDetail: paymentInfo?.status_detail,
                        isProcessedAccredited,
                        currentOrderStatus: orderDoc.status,
                    });

                    if (mpStatus === 'approved' || isProcessedAccredited) {
                        console.log(`✅ [getOrderById] Pagamento APROVADO detectado! Atualizando pedido ${orderDoc.orderNumber}:`, {
                            mpStatus,
                            paymentStatusDetail: paymentInfo?.status_detail,
                            isProcessedAccredited,
                            previousStatus: orderDoc.status,
                        });
                        orderDoc.status = 'paid';
                        orderDoc.paymentStatus = 'approved';
                        orderDoc.paymentStatusDetail = paymentInfo?.status_detail || 'accredited';
                        if (paymentInfo?.date_approved) {
                            (orderDoc as any).paidAt = new Date(paymentInfo.date_approved);
                        }
                        await orderDoc.save();
                        console.log(`✅ [getOrderById] Pedido ${orderDoc.orderNumber} atualizado para 'paid' com sucesso!`);

                        // REFATORADO: Não liberar reservas - pedidos não usam mais reservas separadas
                        // O pedido PENDING já funciona como reserva e quando pago, o estoque já está bloqueado corretamente

                        // CRÍTICO: Confirmar APENAS tickets deste pedido específico
                        // NUNCA confirmar tickets de outros pedidos, mesmo que sejam do mesmo cliente
                        const tickets = await Ticket.find({
                            _id: { $in: orderDoc.tickets }, // Usar apenas tickets do pedido
                            order: orderDoc._id, // VALIDAÇÃO EXTRA: garantir que o ticket pertence ao pedido
                            deletedAt: null,
                        });

                        console.log(
                            `📋 [getOrderById] Confirmando ${tickets.length} ticket(s) do pedido ${orderDoc.orderNumber} (${orderDoc._id})`
                        );

                        for (const ticket of tickets) {
                            // VALIDAÇÃO EXTRA: garantir que o ticket realmente pertence ao pedido
                            if (String(ticket.order) !== String(orderDoc._id)) {
                                console.error(
                                    `⚠️ [getOrderById] ERRO CRÍTICO: Ticket ${ticket._id} não pertence ao pedido ${orderDoc._id}! Pulando...`
                                );
                                continue;
                            }

                            if (ticket.status === 'pending') {
                                ticket.status = 'confirmed';
                                ticket.isActive = true;
                                // Gerar QR code se ainda não tiver
                                if (!ticket.qrCode) {
                                    ticket.qrCode = await generateQRCode(ticket.code);
                                }
                                await ticket.save();
                                console.log(
                                    `✅ [getOrderById] Ticket ${ticket._id} confirmado para pedido ${orderDoc.orderNumber}`
                                );
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

                                        const dashboardUrl =
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
                                                downloadLink: `${dashboardUrl}/orders/${populatedOrder._id}`,
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

                                        console.log(
                                            `✅ [getOrderById] Email de confirmação (PIX) enviado para ${customer.email}`
                                        );
                                    }
                                }
                            } catch (emailError) {
                                console.error(
                                    '[getOrderById] Erro ao enviar email de confirmação (PIX):',
                                    emailError
                                );
                            }
                        }

                        if (process.env.NODE_ENV !== 'production') {
                            console.log(
                                `[getOrderById] Pedido ${String(orderDoc._id)} (${
                                    isPixOrder ? 'PIX' : 'Cartão'
                                }): MP aprovou. Atualizando para paid e gerando QR codes.`
                            );
                        }
                    }
                    // REGRA: Se o MP cancelou, SEMPRE seguir o MP (100% alinhamento)
                    else if (['cancelled', 'rejected', 'expired'].includes(mpStatus)) {
                        // Se o MP cancelou, seguir o MP independente da data de expiração
                        orderDoc.status = 'cancelled';
                        orderDoc.paymentStatus = mpStatus;
                        orderDoc.paymentStatusDetail = paymentInfo?.status_detail || mpStatus;
                        await orderDoc.save();

                        if (process.env.NODE_ENV !== 'production') {
                            const now = new Date();
                            const paymentMethod = isPixOrder ? 'PIX' : 'Cartão';
                            if (isPixOrder && mpExpiration && now < mpExpiration) {
                                console.log(
                                    `[getOrderById] ${paymentMethod} pedido ${String(orderDoc._id)}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min). Seguindo MP e cancelando.`
                                );
                            } else {
                                console.log(
                                    `[getOrderById] ${paymentMethod} pedido ${String(orderDoc._id)}: MP cancelou (status: ${mpStatus}). Seguindo MP e cancelando.`
                                );
                            }
                        }
                    }
                } catch (syncError) {
                    // Não bloquear a resposta em caso de erro na sincronização
                    if (process.env.NODE_ENV !== 'production') {
                        const paymentMethod = isPixOrder ? 'PIX' : 'Cartão';
                        console.warn(
                            `[getOrderById] Erro ao sincronizar status ${paymentMethod}:`,
                            syncError
                        );
                    }
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

            // OTIMIZAÇÃO: Reduzir logs verbosos - só logar se não estiver em produção ou se for primeira vez
            const shouldLog = process.env.NODE_ENV !== 'production' || !(global as any).__lastPixLogTime || Date.now() - (global as any).__lastPixLogTime > 10000;
            if (shouldLog) {
                console.log(`[getOrderById] 🔍 Buscando PIX para pedido ${freshOrder.orderNumber}:`, {
                    hasPaymentOrderId: !!paymentOrderId,
                    paymentOrderId,
                    hasPaymentId: !!freshOrder.paymentId,
                    paymentId: freshOrder.paymentId,
                });
                (global as any).__lastPixLogTime = Date.now();
            }

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
                            // OTIMIZAÇÃO: Reduzir logs verbosos - só logar se não estiver em produção ou se for primeira vez
                            const shouldLogPixInfo = process.env.NODE_ENV !== 'production' || !(global as any).__lastPixInfoLogTime || Date.now() - (global as any).__lastPixInfoLogTime > 10000;
                            if (shouldLogPixInfo) {
                                console.log(
                                    `[getOrderById] ✅ Informações PIX encontradas via Orders API para pedido ${freshOrder.orderNumber}`,
                                    {
                                        paymentOrderId,
                                        hasQrCode: !!pixInfo.qrCodeBase64,
                                        hasTicketUrl: !!pixInfo.ticketUrl,
                                        hasQrCodeString: !!pixInfo.qrCode,
                                    }
                                );
                                (global as any).__lastPixInfoLogTime = Date.now();
                            }
                        } else {
                            console.warn(
                                `[getOrderById] ⚠️ Pedido PIX ${freshOrder.orderNumber} não é PIX no Orders API`,
                                {
                                    paymentOrderId,
                                    paymentMethodType: mpPayment?.payment_method?.type,
                                    paymentMethodId: mpPayment?.payment_method_id,
                                }
                            );
                        }
                    } catch (orderError: any) {
                        console.error(
                            `[getOrderById] Erro ao buscar order ${paymentOrderId} no MP:`,
                            orderError.message
                        );
                        // Não tentar Payment API para PIX - não funciona
                    }
                } else {
                    console.warn(
                        `[getOrderById] ⚠️ Pedido PIX ${freshOrder.orderNumber} não tem paymentOrderId salvo no banco`,
                        {
                            hasPaymentId: !!freshOrder.paymentId,
                            paymentId: freshOrder.paymentId,
                        }
                    );
                }
            } catch (error: any) {
                console.error(
                    `[getOrderById] Erro geral ao buscar informações do PIX:`,
                    error.message
                );
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
        console.error('Erro ao buscar pedido:', error);
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
                    } catch (orderError) {
                        console.warn('[cancelOrder] Erro ao buscar order no MP:', orderError);
                    }
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
                    } catch (paymentError) {
                        console.warn('[cancelOrder] Erro ao buscar payment no MP:', paymentError);
                    }
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
                        } catch (cancelError) {
                            console.warn(
                                '[cancelOrder] Erro ao cancelar order no MP:',
                                cancelError
                            );
                        }
                    } else if (order.paymentId) {
                        try {
                            await (paymentService as any).cancelPaymentById(order.paymentId);
                        } catch (cancelError) {
                            console.warn(
                                '[cancelOrder] Erro ao cancelar payment no MP:',
                                cancelError
                            );
                        }
                    }
                    order.paymentStatus = 'cancelled';
                    order.paymentStatusDetail = order.paymentStatusDetail || 'cancelled';
                    order.paymentMessage = 'Pagamento cancelado no Mercado Pago.';
                }
            } catch (e) {
                // Se não conseguir cancelar no MP, prosseguir com cancel local
                console.warn('Não foi possível cancelar no Mercado Pago:', e);
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
                console.log(
                    `✅ [cancelOrder] Estoque devolvido: ${quantity} ingressos do tipo ${ticketTypeId} (${oldSoldQuantity} -> ${ticketType.soldQuantity})`
                );
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
            console.error('Erro ao registrar auditoria (não crítico):', error);
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
            console.error('Erro ao enviar email de cancelamento:', emailError);
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
        console.error('Erro ao cancelar pedido:', error);
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
        console.error('Erro ao confirmar pagamento:', error);
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
        console.error('Erro ao buscar estatísticas financeiras:', error);
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
        console.log('[updateOrderPromoterCode] 🎯 Requisição recebida:', {
            orderId: req.params.id,
            promoterCode: req.body.promoterCode,
            userId: (req as any).user?._id?.toString(),
            method: req.method,
            url: req.url,
        });

        const userId = (req as any).user?._id?.toString();
        const { id: orderId } = req.params;
        const { promoterCode } = req.body;

        if (!orderId) {
            console.log('[updateOrderPromoterCode] ❌ OrderId não fornecido');
            return res.status(400).json({
                success: false,
                message: 'ID do pedido é obrigatório',
            });
        }

        // Buscar pedido
        console.log('[updateOrderPromoterCode] 🔍 Buscando pedido:', orderId);
        const order = await Order.findById(orderId).populate('event').populate('tickets').lean();

        if (!order) {
            console.log('[updateOrderPromoterCode] ❌ Pedido não encontrado:', orderId);
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado',
            });
        }

        console.log('[updateOrderPromoterCode] ✅ Pedido encontrado:', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            subtotal: order.subtotal,
            currentDiscountAmount: order.discountAmount,
            currentTotalAmount: order.totalAmount,
            currentPromoterCode: order.promoterCode,
        });

        // Verificar se o pedido pertence ao usuário (se autenticado)
        if (userId) {
            const orderUserId = order.customer?.toString() || order.customer;
            console.log('[updateOrderPromoterCode] 🔐 Verificando propriedade do pedido:', {
                userId,
                orderUserId,
                match: orderUserId === userId,
            });
            if (orderUserId !== userId) {
                console.log(
                    '[updateOrderPromoterCode] ❌ Acesso negado - pedido não pertence ao usuário'
                );
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado',
                });
            }
        }

        // Verificar se o pedido está pendente
        if (order.status !== 'pending') {
            console.log('[updateOrderPromoterCode] ❌ Pedido não está pendente:', {
                status: order.status,
            });
            return res.status(400).json({
                success: false,
                message: 'Apenas pedidos pendentes podem ter código de promotor atualizado',
            });
        }

        // Buscar evento e ticketType
        const eventId = typeof order.event === 'object' ? (order.event as any)._id : order.event;
        console.log('[updateOrderPromoterCode] 🔍 Buscando evento:', eventId);
        const event = await Event.findById(eventId).lean();
        if (!event) {
            console.log('[updateOrderPromoterCode] ❌ Evento não encontrado:', eventId);
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
            });
        }
        console.log('[updateOrderPromoterCode] ✅ Evento encontrado:', {
            eventId: event._id,
            name: event.name,
            platformFeePercentage: event.platformFeePercentage,
        });

        // Buscar tickets do pedido para obter ticketType
        console.log('[updateOrderPromoterCode] 🔍 Buscando tickets do pedido');
        const tickets = await Ticket.find({ order: orderId, deletedAt: null })
            .populate('ticketType')
            .lean();

        if (tickets.length === 0) {
            console.log('[updateOrderPromoterCode] ❌ Pedido não possui tickets');
            return res.status(400).json({
                success: false,
                message: 'Pedido não possui tickets',
            });
        }
        console.log('[updateOrderPromoterCode] ✅ Tickets encontrados:', tickets.length);

        // Usar o primeiro ticket para obter ticketType (todos devem ser do mesmo tipo)
        const ticketType = tickets[0].ticketType as any;
        if (!ticketType) {
            console.log('[updateOrderPromoterCode] ❌ Tipo de ingresso não encontrado no ticket');
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado',
            });
        }
        console.log('[updateOrderPromoterCode] ✅ Tipo de ingresso encontrado:', {
            ticketTypeId: ticketType._id,
            isVIP: ticketType.isVIP,
        });

        // Validar código de promotor se fornecido
        let usedPromoterCode: string | undefined = undefined;
        let discountAmount = 0;

        if (promoterCode) {
            const codeToSearch = String(promoterCode).toUpperCase().trim();
            console.log('[updateOrderPromoterCode] 🔍 Buscando código de promotor:', {
                code: codeToSearch,
                eventId,
            });

            const code = await PromoterCode.findOne({
                code: codeToSearch,
                isActive: true,
                deletedAt: null,
                events: eventId,
            }).lean();

            if (!code) {
                console.log(
                    '[updateOrderPromoterCode] ❌ Código de promotor não encontrado ou inválido:',
                    {
                        code: codeToSearch,
                        eventId,
                    }
                );
                return res.status(400).json({
                    success: false,
                    message: 'Código de promotor inválido ou não válido para este evento',
                });
            }

            console.log('[updateOrderPromoterCode] ✅ Código de promotor encontrado:', {
                code: code.code,
                discountType: code.discountType,
                discountValue: code.discountValue,
            });

            usedPromoterCode = code.code;

            // Recalcular desconto baseado no subtotal atual do pedido
            const isVIP = ticketType.isVIP;
            if (!isVIP) {
                if (code.discountType === 'percentage') {
                    discountAmount = (order.subtotal || 0) * (code.discountValue / 100);
                    console.log('[updateOrderPromoterCode] 💰 Desconto percentual calculado:', {
                        subtotal: order.subtotal,
                        percentage: code.discountValue,
                        discountAmount,
                    });
                } else {
                    discountAmount = Math.min(code.discountValue, order.subtotal || 0);
                    console.log('[updateOrderPromoterCode] 💰 Desconto fixo calculado:', {
                        subtotal: order.subtotal,
                        fixedValue: code.discountValue,
                        discountAmount,
                    });
                }
            } else {
                console.log('[updateOrderPromoterCode] ℹ️ Ticket VIP - desconto não aplicado');
            }
        } else {
            console.log(
                '[updateOrderPromoterCode] ℹ️ Removendo código de promotor (promoterCode é null/undefined)'
            );
        }

        // Recalcular valores do pedido
        const isVIP = ticketType.isVIP;
        const subtotal = order.subtotal || 0;
        const platformFeePercentage = event.platformFeePercentage || 0;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const platformFee = isVIP ? 0 : subtotalAfterDiscount * (platformFeePercentage / 100);
        const totalAmount = subtotalAfterDiscount + platformFee;

        console.log('[updateOrderPromoterCode] 💰 Valores recalculados:', {
            subtotal,
            discountAmount,
            subtotalAfterDiscount,
            platformFeePercentage,
            platformFee,
            totalAmount,
            isVIP,
        });

        // Atualizar pedido
        console.log('[updateOrderPromoterCode] 💾 Atualizando pedido no banco:', {
            orderId,
            promoterCode: usedPromoterCode || null,
            discountAmount,
            platformFee,
            totalAmount,
        });

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

        if (!updatedOrder) {
            console.log(
                '[updateOrderPromoterCode] ❌ Erro ao atualizar pedido - pedido não encontrado após update'
            );
            return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar pedido',
            });
        }

        console.log('[updateOrderPromoterCode] ✅ Pedido atualizado com sucesso:', {
            orderId: updatedOrder._id,
            orderNumber: updatedOrder.orderNumber,
            promoterCode: updatedOrder.promoterCode,
            discountAmount: updatedOrder.discountAmount,
            totalAmount: updatedOrder.totalAmount,
        });

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
        console.error('Erro ao atualizar código de promotor:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar código de promotor',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};
