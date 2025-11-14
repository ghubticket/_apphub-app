import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import mongoose from 'mongoose';
import { Order, Ticket, TicketType, Event, User, PromoterCode } from '../models';
import { generateQRCode } from '../services/qrCodeService';
import * as reservationService from '../services/reservationService';
import { sendOrderCancelledEmail, sendCourtesyTicketEmail } from '../services/emailTemplates';
import { generateTicketPDF } from '../services/pdfService';

/**
 * Normaliza CPF removendo formatação (pontos e traços)
 */
const normalizeCPF = (cpf: string | undefined): string | null => {
    if (!cpf) return null;
    return cpf.replace(/\D/g, '');
};

/**
 * Normaliza Email para lowercase e trim
 */
const normalizeEmail = (email: string | undefined): string | null => {
    if (!email) return null;
    return email.trim().toLowerCase();
};

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
const countPurchasedTicketsByCPFOrEmail = async (
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

    // Construir filtros para buscar pedidos pagos do evento
    const orderFilters: any = {
        event: eventId,
        status: 'paid',
        deletedAt: null,
    };

    // Adicionar filtro por CPF ou Email
    if (normalizedCPF && normalizedEmail) {
        // Se ambos estão presentes, usar OR
        orderFilters.$or = [
            { 'customerData.cpf': { $regex: normalizedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') } },
            { 'customerData.email': normalizedEmail }
        ];
    } else if (normalizedCPF) {
        // Buscar por CPF (normalizado, mas comparar com formato do DB)
        // CPF no DB está no formato 000.000.000-00, então precisamos buscar de forma flexível
        const cpfFormatted = normalizedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        orderFilters['customerData.cpf'] = cpfFormatted;
    } else if (normalizedEmail) {
        orderFilters['customerData.email'] = normalizedEmail;
    }

    // Buscar pedidos pagos que correspondem ao CPF/Email
    const orders = await Order.find(orderFilters)
        .select('totalTickets customerData')
        .lean();

    // Agora verificar se os tickets desses pedidos são do tipo correto
    let totalPurchased = 0;
    for (const order of orders) {
        // Buscar tickets do pedido que são do tipo específico
        const tickets = await Ticket.countDocuments({
            order: order._id,
            ticketType: ticketTypeId,
            deletedAt: null,
        });

        totalPurchased += tickets;
    }

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

/**
 * Cria um novo pedido com ingressos
 * Para ingressos VIP: status = 'paid', paymentMethod = 'vip_free', tickets = 'confirmed'
 * Para outros: status = 'pending', aguarda pagamento
 */
export const createOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id; // Do middleware authenticate
        const { eventId, ticketTypeId, quantity, promoterCode, customerData, allowReuse } =
            req.body as CreateOrderRequest;

        // Validações básicas
        if (!eventId || !ticketTypeId || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: ['eventId, ticketTypeId e quantity são obrigatórios']
            });
        }

        if (quantity > 10) { // Limite razoável por pedido
            return res.status(400).json({
                success: false,
                message: 'Quantidade inválida',
                errors: ['Máximo de 10 ingressos por pedido']
            });
        }

        // Buscar evento e tipo de ingresso
        const event = await Event.findOne({ _id: eventId, deletedAt: null, isActive: true });
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado ou inativo'
            });
        }

        const ticketType = await TicketType.findOne({ _id: ticketTypeId, deletedAt: null, isActive: true });
        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de ingresso não encontrado ou inativo'
            });
        }

        // Verificar se o tipo de ingresso pertence ao evento
        if (String(ticketType.event) !== String(eventId)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de ingresso não pertence a este evento'
            });
        }

        // Verificar disponibilidade usando o serviço de reservas
        const availableQuantity = await reservationService.getAvailableQuantity(eventId, ticketTypeId);
        if (availableQuantity < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade insuficiente',
                errors: [`Apenas ${availableQuantity} ingressos disponíveis`]
            });
        }

        // Verificar limite por compra
        if (quantity > ticketType.maxPerPurchase) {
            return res.status(400).json({
                success: false,
                message: 'Limite excedido',
                errors: [`Máximo de ${ticketType.maxPerPurchase} ingressos por compra`]
            });
        }

        // Buscar dados do usuário (se autenticado)
        let user = null;
        if (userId) {
            user = await User.findOne({ _id: userId, deletedAt: null });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }
        }

        // Preparar CPF e Email para validação (prioridade: customerData > user > null)
        const cpfToValidate = customerData?.cpf || user?.cpf;
        const emailToValidate = customerData?.email || user?.email;
        const normalizedCustomerEmail = normalizeEmail(customerData?.email);

        // Verificar limite acumulado por CPF (se configurado)
        if (ticketType.maxPerCPF && cpfToValidate) {
            const purchasedByCPF = await countPurchasedTicketsByCPFOrEmail(
                eventId,
                ticketTypeId,
                cpfToValidate,
                undefined
            );
            const totalAfterPurchase = purchasedByCPF + quantity;

            if (totalAfterPurchase > ticketType.maxPerCPF) {
                const remaining = Math.max(0, ticketType.maxPerCPF - purchasedByCPF);
                return res.status(400).json({
                    success: false,
                    message: 'Limite acumulado por CPF excedido',
                    errors: [
                        `Este CPF já comprou ${purchasedByCPF} ingresso(s) deste tipo. ` +
                        `Limite máximo: ${ticketType.maxPerCPF}. ` +
                        `Você pode comprar no máximo mais ${remaining} ingresso(s).`
                    ]
                });
            }
        }

        // Verificar limite acumulado por Email (se configurado)
        if (ticketType.maxPerEmail && emailToValidate) {
            const purchasedByEmail = await countPurchasedTicketsByCPFOrEmail(
                eventId,
                ticketTypeId,
                undefined,
                emailToValidate
            );
            const totalAfterPurchase = purchasedByEmail + quantity;

            if (totalAfterPurchase > ticketType.maxPerEmail) {
                const remaining = Math.max(0, ticketType.maxPerEmail - purchasedByEmail);
                return res.status(400).json({
                    success: false,
                    message: 'Limite acumulado por Email excedido',
                    errors: [
                        `Este Email já comprou ${purchasedByEmail} ingresso(s) deste tipo. ` +
                        `Limite máximo: ${ticketType.maxPerEmail}. ` +
                        `Você pode comprar no máximo mais ${remaining} ingresso(s).`
                    ]
                });
            }
        }

        // Determinar se é VIP e calcular valores
        const isVIP = ticketType.isVIP;
        const ticketPrice = isVIP ? 0 : ticketType.price;
        const subtotal = ticketPrice * quantity; // Valor sem taxa

        // Validar e aplicar desconto de código de promotor (se fornecido e não for VIP)
        let discountAmount = 0;
        let usedPromoterCode: string | undefined = undefined;

        if (promoterCode && !isVIP) {
            const code = await PromoterCode.findOne({
                code: promoterCode.toUpperCase().trim(),
                isActive: true,
                deletedAt: null,
                events: eventId
            });

            if (code) {
                usedPromoterCode = code.code;

                // Calcular desconto
                if (code.discountType === 'percentage') {
                    discountAmount = subtotal * (code.discountValue / 100);
                } else {
                    // Desconto fixo (limitado ao subtotal)
                    discountAmount = Math.min(code.discountValue, subtotal);
                }
            }
        }

        // Calcular taxa da plataforma (percentual sobre subtotal - desconto)
        const platformFeePercentage = event.platformFeePercentage || 0;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const platformFee = isVIP ? 0 : (subtotalAfterDiscount * (platformFeePercentage / 100)); // VIP não paga taxa
        const totalAmount = subtotalAfterDiscount + platformFee; // Total: (subtotal - desconto) + taxa

        // CRÍTICO: Verificar se já existe pedido para o mesmo evento/ticketType (mesma conta)
        // Se existir, SEMPRE adicionar ingressos ao pedido existente em vez de criar um novo
        // Não importa o método de pagamento (PIX ou cartão) ou status (pendente ou pago)
        const existingOrderFilters: any = {
            event: eventId,
            deletedAt: null,
            // CRÍTICO: Incluir pedidos pendentes E pagos (mas não cancelados)
            status: { $in: ['pending', 'paid'] },
        };

        if (userId) {
            existingOrderFilters.customer = userId;
        } else if (normalizedCustomerEmail) {
            existingOrderFilters['customerData.email'] = normalizedCustomerEmail;
        } else {
            const normalizedUserEmail = normalizeEmail(user?.email);
            if (normalizedUserEmail) {
                existingOrderFilters['customerData.email'] = normalizedUserEmail;
            }
        }

        // Buscar pedido existente (qualquer método de pagamento, pendente ou pago)
        const existingOrder = await Order.findOne(existingOrderFilters)
            .populate('tickets', 'ticketType')
            .lean();

        if (existingOrder) {
            // Verificar se os tickets do pedido existente são do mesmo ticketType
            const existingTickets = existingOrder.tickets || [];
            const existingTicketTypeIds = existingTickets.map((t: any) => 
                String(t.ticketType?._id || t.ticketType)
            );
            const isSameTicketType = existingTicketTypeIds.length > 0 && 
                existingTicketTypeIds.every((id: string) => id === ticketTypeId);

            if (isSameTicketType) {
                const orderStatus = existingOrder.status;
                const paymentMethod = existingOrder.paymentMethod;
                console.log(`♻️ [createOrder] Pedido existente encontrado, adicionando ingressos: orderNumber=${existingOrder.orderNumber}, status=${orderStatus}, paymentMethod=${paymentMethod}`);
                
                // CRÍTICO: Se pedido já está pago, mudar status para pending para permitir novo pagamento
                // Isso permite adicionar ingressos a pedidos já pagos e processar novo pagamento
                const needsRepayment = orderStatus === 'paid';
                
                // Buscar pedido completo (não lean) para atualizar
                const orderToUpdate = await Order.findById(existingOrder._id);
                if (!orderToUpdate) {
                    // Se não encontrou, continuar com criação normal
                } else {
                    // CRÍTICO: Se pedido está pago, mudar para pending e limpar paymentId para permitir novo pagamento
                    if (needsRepayment) {
                        console.log(`🔄 [createOrder] Pedido pago encontrado, mudando para pending para permitir novo pagamento: orderNumber=${orderToUpdate.orderNumber}`);
                        orderToUpdate.status = 'pending';
                        orderToUpdate.paymentId = undefined;
                        orderToUpdate.paymentStatus = undefined;
                        orderToUpdate.paymentStatusDetail = undefined;
                        orderToUpdate.paidAt = undefined;
                        // Manter paymentMethod para histórico, mas permitir mudar no próximo pagamento
                    }
                    // Verificar disponibilidade antes de adicionar
                    const availableQuantity = ticketType.maxQuantity - ticketType.soldQuantity;
                    if (availableQuantity < quantity) {
                        return res.status(400).json({
                            success: false,
                            message: 'Estoque insuficiente',
                            errors: [`Disponível: ${availableQuantity}, Solicitado: ${quantity}`]
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
                    
                    // Recalcular valores (considerando desconto e taxa)
                    const newSubtotal = ticketPrice * quantity;
                    let newDiscountAmount = 0;
                    
                    // Aplicar desconto de código de promotor se fornecido
                    if (promoterCode && !isVIP && usedPromoterCode) {
                        const code = await PromoterCode.findOne({
                            code: promoterCode.toUpperCase().trim(),
                            isActive: true,
                            deletedAt: null,
                            events: eventId
                        });
                        
                        if (code) {
                            if (code.discountType === 'percentage') {
                                newDiscountAmount = newSubtotal * (code.discountValue / 100);
                            } else {
                                newDiscountAmount = Math.min(code.discountValue, newSubtotal);
                            }
                        }
                    }
                    
                    const newPlatformFee = isVIP ? 0 : ((newSubtotal - newDiscountAmount) * (platformFeePercentage / 100));
                    const newTotalAmount = (newSubtotal - newDiscountAmount) + newPlatformFee;
                    
                    orderToUpdate.subtotal = (orderToUpdate.subtotal || 0) + newSubtotal;
                    orderToUpdate.discountAmount = (orderToUpdate.discountAmount || 0) + newDiscountAmount;
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

                    // CRÍTICO: Criar NOVA reserva vinculada ao pedido existente
                    // NÃO atualizar reserva existente - criar nova para os novos ingressos
                    // Isso permite múltiplas reservas para o mesmo pedido (cenário: usuário compra mais ingressos depois)
                    // CRÍTICO: Só criar reserva se pedido está pendente (não criar para pedidos pagos que foram mudados para pending)
                    if (orderToUpdate.status === 'pending') {
                        try {
                            const reservationService = await import('../services/reservationService');
                            
                            // Buscar informações do evento e ticketType
                            const populatedOrderForReservation = await Order.findById(orderToUpdate._id)
                                .populate('event', '_id')
                                .populate('tickets', 'ticketType')
                                .lean();
                            
                            if (populatedOrderForReservation && populatedOrderForReservation.tickets && populatedOrderForReservation.tickets.length > 0) {
                                const firstTicket = populatedOrderForReservation.tickets[0] as any;
                                const eventIdForReservation = String(populatedOrderForReservation.event?._id || populatedOrderForReservation.event);
                                const ticketTypeIdForReservation = String(firstTicket.ticketType?._id || firstTicket.ticketType);
                                const sessionId = req.headers['x-session-id'] as string || `order_${orderToUpdate._id}`;
                                
                                // Criar NOVA reserva para os novos ingressos adicionados
                                // A reserva será vinculada ao pedido existente
                                const reservationResult = await reservationService.createReservation({
                                    eventId: eventIdForReservation,
                                    ticketTypeId: ticketTypeIdForReservation,
                                    quantity: quantity, // Quantidade dos NOVOS ingressos adicionados
                                    sessionId,
                                    userId: userId || undefined,
                                    orderId: String(orderToUpdate._id), // Vincular ao pedido existente
                                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos (tempo padrão)
                                });
                                
                                if (reservationResult.success && reservationResult.reservation) {
                                    console.log(`✅ Nova reserva criada para ingressos adicionados ao pedido ${orderToUpdate.orderNumber}:`, {
                                        reservationId: reservationResult.reservation._id,
                                        quantity: quantity,
                                        orderId: orderToUpdate._id,
                                        orderStatus: orderToUpdate.status,
                                        paymentMethod: orderToUpdate.paymentMethod,
                                    });
                                } else {
                                    console.warn(`⚠️ Não foi possível criar reserva para ingressos adicionados:`, reservationResult.message);
                                }
                            }
                        } catch (reservationError: any) {
                            console.warn(`⚠️ Erro ao criar reserva para ingressos adicionados:`, reservationError.message);
                            // Não falhar se não conseguir criar reserva
                        }
                    }

                    // Popular dados para resposta
                    const populatedOrder = await Order.findById(orderToUpdate._id)
                        .populate('event', 'name date location address')
                        .populate('tickets', 'code qrCode status price ticketType holder')
                        .populate('customer', 'name email')
                        .populate('tickets.ticketType', 'name')
                        .lean();

                    return res.status(200).json({
                        success: true,
                        message: needsRepayment 
                            ? 'Ingressos adicionados ao pedido existente. Novo pagamento necessário para todos os ingressos.'
                            : 'Ingressos adicionados ao pedido existente.',
                        data: {
                            order: populatedOrder,
                            isVIP: false,
                            requiresPayment: true,
                            reused: true,
                            addedTickets: true,
                            needsRepayment, // Flag para indicar que precisa pagar novamente
                        },
                    });
                }
            }
        }

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
                console.log(`♻️ [createOrder] Pedido reutilizado: orderNumber=${reusableOrder.orderNumber}, cardAttempts=${reusableOrder.cardAttempts || 0}, MAX=${MAX_CARD_PAYMENT_ATTEMPTS}`);
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
        let orderStatus: 'pending' | 'paid' = 'pending';
        let paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' | 'vip_free' | undefined = undefined;
        let ticketStatus: 'pending' | 'confirmed' = 'pending';

        if (isVIP) {
            // VIP: pedido pago automaticamente, sem gateway
            orderStatus = 'paid';
            paymentMethod = 'vip_free';
            ticketStatus = 'confirmed';
        } else {
            // Outros: aguarda pagamento (será integrado depois)
            orderStatus = 'pending';
            ticketStatus = 'pending';
        }

        const finalCustomerEmail =
            normalizedCustomerEmail || normalizeEmail(user?.email) || customerData?.email || user?.email || 'Não informado';

        try {
            // IMPORTANTE: Cancelar pedidos pendentes anteriores do mesmo usuário/evento/ticketType
            // Isso evita duplicação de reservas quando usuário volta ao carrinho
            if (!allowReuse || !reusableOrder) {
                // Buscar pedidos pendentes E failed separadamente (failed não pode ser cancelado diretamente)
                // CRÍTICO: Não cancelar o pedido que acabamos de encontrar acima (existingOrder)
                const cancelFilters: any = {
                    event: eventId,
                    deletedAt: null,
                    status: 'pending', // Apenas pending pode ser cancelado diretamente
                    paymentMethod: { $in: [null, 'credit_card', 'debit_card'] },
                    _id: { $ne: existingOrder?._id }, // Não cancelar o pedido que acabamos de encontrar
                };

                const failedFilters: any = {
                    event: eventId,
                    deletedAt: null,
                    status: 'failed', // Pedidos failed precisam tratamento especial
                    paymentMethod: { $in: [null, 'credit_card', 'debit_card'] },
                    _id: { $ne: existingOrder?._id }, // Não cancelar o pedido que acabamos de encontrar
                };

                if (userId) {
                    cancelFilters.customer = userId;
                    failedFilters.customer = userId;
                } else if (normalizedCustomerEmail) {
                    cancelFilters['customerData.email'] = normalizedCustomerEmail;
                    failedFilters['customerData.email'] = normalizedCustomerEmail;
                } else {
                    const normalizedUserEmail = normalizeEmail(user?.email);
                    if (normalizedUserEmail) {
                        cancelFilters['customerData.email'] = normalizedUserEmail;
                        failedFilters['customerData.email'] = normalizedUserEmail;
                    }
                }

                const pendingOrdersToCancel = await Order.find(cancelFilters).populate('tickets');
                const failedOrdersToClean = await Order.find(failedFilters).populate('tickets');

                // Processar pedidos PENDING (podem ser cancelados)
                if (pendingOrdersToCancel.length > 0) {
                    console.log(`🔄 [createOrder] Cancelando ${pendingOrdersToCancel.length} pedido(s) pendente(s) anterior(es)`);

                    for (const oldOrder of pendingOrdersToCancel) {
                        await cancelOrderAndReturnStock(oldOrder);
                    }
                }

                // Processar pedidos FAILED (apenas devolver estoque, não cancelar)
                if (failedOrdersToClean.length > 0) {
                    console.log(`🔄 [createOrder] Limpando ${failedOrdersToClean.length} pedido(s) failed anterior(es) - devolvendo estoque`);

                    for (const oldOrder of failedOrdersToClean) {
                        await returnStockFromOrder(oldOrder);
                        // Não mudamos o status de failed (já está em estado final)
                        console.log(`✅ [createOrder] Estoque devolvido do pedido failed ${oldOrder.orderNumber}`);
                    }
                }
            }

            // Função auxiliar para cancelar pedido e devolver estoque
            async function cancelOrderAndReturnStock(oldOrder: any) {
                // Buscar tickets para obter ticketType e quantidade
                const oldTickets = await Ticket.find({ order: oldOrder._id, deletedAt: null }).populate('ticketType');

                // Devolver estoque
                await returnStockFromOrder(oldOrder);

                // Cancelar pedido (apenas se status permitir)
                if (oldOrder.status === 'pending') {
                    oldOrder.status = 'cancelled';
                    oldOrder.cancelledAt = new Date();
                    oldOrder.isActive = false;
                    await oldOrder.save();

                    // Cancelar tickets vinculados
                    await Ticket.updateMany(
                        { order: oldOrder._id, deletedAt: null },
                        { status: 'cancelled', deletedAt: new Date() }
                    );

                    console.log(`✅ [createOrder] Pedido ${oldOrder.orderNumber} cancelado e ingressos devolvidos ao estoque`);
                }
            }

            // Função auxiliar para devolver estoque de um pedido
            async function returnStockFromOrder(oldOrder: any) {
                const oldTickets = await Ticket.find({ order: oldOrder._id, deletedAt: null }).populate('ticketType');

                // Agrupar por ticketType para liberar estoque corretamente
                const ticketTypeCounts = new Map<string, number>();
                for (const ticket of oldTickets) {
                    const ticketTypeId = String((ticket as any).ticketType?._id || (ticket as any).ticketType);
                    if (ticketTypeId) {
                        ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1);
                    }
                }

                // Liberar estoque para cada ticketType
                for (const [ticketTypeId, qty] of ticketTypeCounts.entries()) {
                    const oldTicketType = await TicketType.findById(ticketTypeId);
                    if (oldTicketType && qty > 0) {
                        oldTicketType.soldQuantity = Math.max(0, oldTicketType.soldQuantity - qty);
                        await oldTicketType.save();
                        console.log(`🔄 [createOrder] Devolvendo ${qty} ingressos ao estoque (ticketType: ${ticketTypeId})`);
                    }
                }
            }

            // Criar pedido
            const orderNumber = await generateOrderNumber();
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
                paidAt: isVIP ? new Date() : undefined,
                orderNumber,
                customerData: {
                    name: customerData?.name || user?.name || 'Não informado',
                    email: finalCustomerEmail,
                    phone: customerData?.phone || user?.phone,
                    cpf: customerData?.cpf || user?.cpf,
                },
                cardAttempts: 0,
                isActive: Boolean(isVIP),
            });

            await order.save();

            // Incrementar contador de uso do código de promotor (se usado)
            if (usedPromoterCode) {
                await PromoterCode.updateOne(
                    { code: usedPromoterCode },
                    { $inc: { currentUses: 1 } },
                );
            }

            // Criar tickets
            const createdTickets: any[] = [];
            for (let i = 0; i < quantity; i++) {
                const ticket = new Ticket({
                    event: eventId,
                    ticketType: ticketTypeId,
                    order: order._id,
                    holder: userId || null,
                    price: ticketPrice,
                    status: ticketStatus,
                    qrCode: '', // Será preenchido APENAS se o pedido estiver pago/VIP
                });

                // Salvar para gerar o código único (pre-save hook)
                await ticket.save();

                // ⚠️ SEGURANÇA: Gerar QR Code APENAS se o pedido estiver PAID ou for VIP
                // QR codes só devem ser gerados para ingressos confirmados (pedidos pagos)
                if (orderStatus === 'paid' || isVIP) {
                    const qrCode = await generateQRCode(ticket.code);
                    ticket.qrCode = qrCode;
                    await ticket.save();
                } else {
                    // Para pedidos pendentes, deixar qrCode vazio
                    ticket.qrCode = '';
                    await ticket.save();
                }

                createdTickets.push(ticket);
            }

            // Atualizar pedido com os tickets
            order.tickets = createdTickets.map(t => t._id as mongoose.Types.ObjectId);
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

            // Se for VIP (cortesia), enviar email com PDF dos QR codes
            if (isVIP && populatedOrder) {
                try {
                    const event = populatedOrder.event as any;
                    const customer = populatedOrder.customer as any;
                    const customerData = populatedOrder.customerData as any;
                    const tickets = populatedOrder.tickets as any[];
                    const orderNumber = populatedOrder.orderNumber;
                    const orderId = populatedOrder._id;

                    // Obter email e nome do cliente (prioridade: customerData > customer > null)
                    const customerEmail = customerData?.email || customer?.email;
                    const customerName = customerData?.name || customer?.name;

                    // Debug: Log dos dados disponíveis
                    console.log(`📧 Tentando enviar email de cortesia para pedido ${orderNumber}:`);
                    console.log(`   customerData:`, JSON.stringify(customerData, null, 2));
                    console.log(`   customer:`, customer ? { name: customer.name, email: customer.email } : 'null');
                    console.log(`   customerEmail final: ${customerEmail}`);
                    console.log(`   customerName final: ${customerName}`);

                    // Validar se temos email válido (não pode ser "Não informado" ou vazio)
                    if (!customerEmail || customerEmail === 'Não informado' || customerEmail.trim() === '') {
                        console.warn(`⚠️ Email não informado para cortesia. Pedido: ${orderNumber}`);
                        console.warn(`   customerData.email: ${customerData?.email}`);
                        console.warn(`   customer.email: ${customer?.email}`);
                        console.warn(`   ⚠️ Email não será enviado. Certifique-se de passar customerData.email ao criar a cortesia.`);
                    } else if (event && tickets && tickets.length > 0 && orderNumber) {
                        // Filtrar apenas tickets com QR code
                        const ticketsWithQR = tickets.filter(t => t.qrCode);

                        if (ticketsWithQR.length > 0) {
                            // Gerar PDF com QR codes
                            const pdfBuffer = await generateTicketPDF({
                                event: {
                                    name: event.name,
                                    date: event.date,
                                    location: event.location,
                                    address: event.address
                                },
                                orderNumber,
                                customerName: customerName || 'Cliente',
                                tickets: ticketsWithQR.map(t => ({
                                    code: t.code,
                                    qrCode: t.qrCode,
                                    ticketType: (t.ticketType as any)?.name || 'Ingresso',
                                    holderName: (t.holder as any)?.name || customerName || 'Cliente'
                                }))
                            });

                            // Formatar data do evento
                            const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            // Preparar QR codes para exibição no email
                            const qrCodesForEmail = ticketsWithQR.map(t => ({
                                code: t.code,
                                qrCode: t.qrCode, // Já está em base64 data URL
                                holderName: (t.holder as any)?.name || customerName || 'Cliente'
                            }));

                            // Enviar email de cortesia com PDF e QR codes inline
                            const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
                            const emailResult = await sendCourtesyTicketEmail(
                                customerEmail,
                                {
                                    customerName: customerName || 'Cliente',
                                    orderNumber,
                                    eventName: event.name,
                                    eventDate,
                                    eventLocation: event.location,
                                    eventAddress: event.address,
                                    totalTickets: ticketsWithQR.length,
                                    ticketType: ticketsWithQR[0]?.ticketType?.name || 'VIP',
                                    downloadLink: `${dashboardUrl}/orders/${orderId}`,
                                    qrCodes: qrCodesForEmail
                                },
                                [{
                                    filename: `cortesia-${orderNumber}.pdf`,
                                    content: pdfBuffer,
                                    contentType: 'application/pdf'
                                }]
                            );

                            if (emailResult.success) {
                                console.log(`✅ Email de cortesia com PDF enviado para ${customerEmail}`);
                            } else {
                                console.error(`❌ Erro ao enviar email de cortesia para ${customerEmail}:`, emailResult.error);
                            }
                        }
                    }
                } catch (emailError) {
                    console.error('Erro ao enviar email de cortesia:', emailError);
                    // Não falhar o pedido se o email falhar
                }
            }

            res.status(201).json({
                success: true,
                message: isVIP ? 'Pedido VIP criado com sucesso' : 'Pedido criado com sucesso. Aguardando pagamento.',
                data: {
                    order: populatedOrder,
                    isVIP,
                    requiresPayment: !isVIP,
                }
            });

        } catch (error: any) {
            console.error('Erro ao criar pedido:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar pedido',
                errors: [error?.message || 'Erro desconhecido']
            });
        }
    } catch (outerError: any) {
        console.error('Erro ao criar pedido (pré-transação):', outerError);
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido',
            errors: [outerError?.message || 'Erro desconhecido']
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
                message: 'Usuário não autenticado'
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
                { 'customerData.email': { $regex: search, $options: 'i' } }
            ];
        }

        // Calcular paginação
        const skip = (Number(page) - 1) * Number(limit);

        // Buscar pedidos com paginação
        const orders = await Order.find(filters)
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price',
                match: { deletedAt: null }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Contar total de pedidos
        const total = await Order.countDocuments(filters);

        // Remover QR codes de pedidos pendentes (segurança)
        // IMPORTANTE: Para pedidos pagos, garantir que os tickets tenham QR codes
        const ordersWithFilteredQR = await Promise.all(orders.map(async (order) => {
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
                                match: { deletedAt: null }
                            })
                            .lean();
                        if (updatedOrder) {
                            return {
                                ...updatedOrder,
                                tickets: updatedOrder.tickets.map((ticket: any) => ({
                                    ...ticket,
                                    qrCode: updatedOrder.status === 'paid' ? ticket.qrCode : null
                                }))
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
                const orderDoc = await Order.findById(order._id).select('paymentOrderId paymentId').lean();
                const paymentOrderId = (orderDoc as any)?.paymentOrderId || (order as any).paymentOrderId;
                
                console.log(`[listMyOrders] 🔍 Buscando PIX para pedido ${order.orderNumber}:`, {
                    hasPaymentOrderId: !!paymentOrderId,
                    paymentOrderId,
                    hasPaymentId: !!order.paymentId,
                    paymentId: order.paymentId,
                });
                
                try {
                    // Para PIX, SEMPRE tentar Orders API primeiro (via paymentOrderId)
                    if (paymentOrderId) {
                        try {
                            const mpOrder = await paymentService.getOrderById(paymentOrderId);
                            const mpPayment = mpOrder?.transactions?.payments?.[0];
                            
                            // Log completo para debug
                            console.log(`[listMyOrders] 🔍 Estrutura completa do payment para pedido ${order.orderNumber}:`, {
                                hasMpPayment: !!mpPayment,
                                paymentKeys: mpPayment ? Object.keys(mpPayment) : [],
                                paymentMethod: mpPayment?.payment_method,
                                paymentMethodType: mpPayment?.payment_method?.type,
                                paymentMethodId: mpPayment?.payment_method_id,
                                status: mpPayment?.status,
                                dateOfExpiration: mpPayment?.date_of_expiration,
                            });
                            
                            // Na Orders API, o PIX está em payment_method (não payment_method_id)
                            // Verificar se é PIX: payment_method.type === 'pix' ou payment_method_id === 'pix'
                            const isPix = mpPayment?.payment_method?.type === 'pix' || 
                                         mpPayment?.payment_method_id === 'pix' ||
                                         (mpPayment?.payment_method && !mpPayment?.payment_method_id); // Se tem payment_method mas não payment_method_id, provavelmente é PIX
                            
                            if (mpPayment && isPix) {
                                // Na Orders API, os dados do PIX estão em payment_method, não em point_of_interaction
                                pixInfo = {
                                    qrCode: mpPayment.payment_method?.qr_code || null,
                                    qrCodeBase64: mpPayment.payment_method?.qr_code_base64 || null,
                                    ticketUrl: mpPayment.payment_method?.ticket_url || null,
                                    expiresAt: mpPayment.date_of_expiration ? new Date(mpPayment.date_of_expiration).toISOString() : null,
                                    expirationMinutes: mpPayment.date_of_expiration 
                                        ? Math.round((new Date(mpPayment.date_of_expiration).getTime() - Date.now()) / (60 * 1000))
                                        : null,
                                };
                                console.log(`[listMyOrders] ✅ Informações PIX encontradas via Orders API para pedido ${order.orderNumber}`, {
                                    paymentOrderId,
                                    hasQrCode: !!pixInfo.qrCodeBase64,
                                    hasTicketUrl: !!pixInfo.ticketUrl,
                                    hasQrCodeString: !!pixInfo.qrCode,
                                    expirationMinutes: pixInfo.expirationMinutes,
                                });
                            } else {
                                console.warn(`[listMyOrders] ⚠️ Pedido PIX ${order.orderNumber} não é PIX no Orders API`, {
                                    paymentOrderId,
                                    paymentMethodType: mpPayment?.payment_method?.type,
                                    paymentMethodId: mpPayment?.payment_method_id,
                                    hasMpPayment: !!mpPayment,
                                });
                            }
                        } catch (orderError: any) {
                            console.error(`[listMyOrders] Erro ao buscar order ${paymentOrderId} no MP para pedido ${order.orderNumber}:`, orderError.message);
                            // Não tentar Payment API para PIX - não funciona
                        }
                    } else {
                        console.warn(`[listMyOrders] ⚠️ Pedido PIX ${order.orderNumber} não tem paymentOrderId salvo no banco`, {
                            hasPaymentId: !!order.paymentId,
                            paymentId: order.paymentId,
                        });
                    }
                    
                    if (!pixInfo) {
                        console.warn(`[listMyOrders] ⚠️ Não foi possível obter informações PIX para pedido ${order.orderNumber} - verifique se paymentOrderId está salvo`);
                    }
                } catch (error: any) {
                    console.error(`[listMyOrders] Erro geral ao buscar informações do PIX para pedido ${order.orderNumber}:`, error.message);
                    // Ignorar erro ao buscar informações do PIX
                }
            }

            const orderResponse = {
                ...order,
                tickets: order.tickets.map((ticket: any) => ({
                    ...ticket,
                    qrCode: order.status === 'paid' ? ticket.qrCode : null // Só retorna QR code se pedido estiver pago
                })),
                pixInfo: pixInfo || undefined, // Informações do PIX para pedidos pendentes
            };
            
            // Log para debug
            if (order.status === 'pending' && order.paymentMethod === 'pix') {
                console.log(`[listMyOrders] 📦 Retornando pedido PIX pendente ${order.orderNumber}:`, {
                    hasPixInfo: !!orderResponse.pixInfo,
                    pixInfoKeys: orderResponse.pixInfo ? Object.keys(orderResponse.pixInfo) : [],
                    hasQrCode: !!orderResponse.pixInfo?.qrCodeBase64,
                    hasTicketUrl: !!orderResponse.pixInfo?.ticketUrl,
                });
            }
            
            return orderResponse;
        }));

        res.json({
            success: true,
            data: {
                orders: ordersWithFilteredQR,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error: any) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            errors: [error.message || 'Erro desconhecido']
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
                { 'customerData.email': { $regex: search, $options: 'i' } }
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
                match: { deletedAt: null }
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
        const ordersWithFilteredQR = await Promise.all(orders.map(async (order) => {
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
                                match: { deletedAt: null }
                            })
                            .lean();
                        if (updatedOrder) {
                            return {
                                ...updatedOrder,
                                tickets: updatedOrder.tickets.map((ticket: any) => ({
                                    ...ticket,
                                    qrCode: updatedOrder.status === 'paid' ? ticket.qrCode : null
                                }))
                            };
                        }
                    }
                }
            }
            return {
                ...order,
                tickets: order.tickets.map((ticket: any) => ({
                    ...ticket,
                    qrCode: order.status === 'paid' ? ticket.qrCode : null // Só retorna QR code se pedido estiver pago
                }))
            };
        }));

        res.json({
            success: true,
            data: {
                orders: ordersWithFilteredQR,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error: any) {
        console.error('Erro ao listar todos os pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            errors: [error.message || 'Erro desconhecido']
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
            deletedAt: null
        })
            .populate('event', 'name date location coverImage squareImage')
            .populate({
                path: 'tickets',
                select: 'code qrCode status price ticketType usedAt usedBy',
                match: { deletedAt: null },
                populate: [
                    { path: 'usedBy', select: 'name email' },
                    { path: 'ticketType', select: 'name price isVIP' }
                ]
            })
            .populate('customer', 'name email')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        // Verificar se o usuário tem permissão (admin ou dono do pedido)
        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOwner = String(order.customer) === String(userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false, 
                message: 'Acesso negado'
            });
        }

        // Sincronizar status de pedidos pendentes com Mercado Pago (em background, não bloqueia resposta)
        // REGRA: MP é a fonte de verdade única - sincronizar PIX e cartão
        const isPixOrder = order.paymentMethod === 'pix';
        const isCardOrder = order.paymentMethod === 'credit_card' || order.paymentMethod === 'debit_card';

        if (order.status === 'pending' && (isPixOrder || isCardOrder) && (order.paymentOrderId || order.paymentId)) {
            // Executar em background para não bloquear a resposta
            setImmediate(async () => {
                try {
                    const orderDoc = await Order.findById(order._id);
                    if (!orderDoc || orderDoc.status !== 'pending') return;

                    let paymentInfo: any = null;
                    let mpStatus: string | null = null;
                    let mpExpiration: Date | null = null;

                    // Para PIX, usar Orders API primeiro; para cartão, usar Payment API
                    if (isPixOrder && (orderDoc as any).paymentOrderId) {
                        try {
                            const mpOrder = await paymentService.getOrderById((orderDoc as any).paymentOrderId);
                            const mpPayment = mpOrder?.transactions?.payments?.[0];
                            if (mpPayment) {
                                paymentInfo = mpPayment;
                                mpStatus = (mpPayment.status || mpOrder?.status || '').toLowerCase();
                                if (mpPayment.date_of_expiration) {
                                    mpExpiration = new Date(mpPayment.date_of_expiration);
                                }
                            } else if (mpOrder?.status) {
                                mpStatus = String(mpOrder.status).toLowerCase();
                            }
                        } catch (orderError) {
                            if (process.env.NODE_ENV !== 'production') {
                                console.warn('[getOrderById] Erro ao buscar order no MP:', orderError);
                            }
                            return; // Não continuar se não conseguir buscar
                        }
                    } else if (orderDoc.paymentId) {
                        // Para cartão ou fallback PIX: usar Payment API
                        try {
                            paymentInfo = await (paymentService as any).getPaymentById(orderDoc.paymentId);
                            if (paymentInfo) {
                                mpStatus = (paymentInfo.status || '').toLowerCase();
                                if (paymentInfo.date_of_expiration) {
                                    mpExpiration = new Date(paymentInfo.date_of_expiration);
                                }
                            }
                        } catch (paymentError) {
                            // Payment API pode não funcionar para PIX Orders API, ignorar erro
                            if (process.env.NODE_ENV !== 'production') {
                                console.warn('[getOrderById] Erro ao buscar payment no MP:', paymentError);
                            }
                            return; // Não continuar se não conseguir buscar
                        }
                    }

                    if (!mpStatus) return; // Não temos status, não fazer nada

                    // REGRA: MP é a fonte de verdade única - seguir o status do MP imediatamente
                    // Se o pagamento foi aprovado no MP, atualizar o pedido
                    if (mpStatus === 'approved') {
                        orderDoc.status = 'paid';
                        orderDoc.paymentStatus = 'approved';
                        orderDoc.paymentStatusDetail = paymentInfo?.status_detail || 'accredited';
                        if (paymentInfo?.date_approved) {
                            (orderDoc as any).paidAt = new Date(paymentInfo.date_approved);
                        }
                        await orderDoc.save();

                        // CRÍTICO: Liberar reservas vinculadas ao pedido PIX quando pagamento é confirmado
                        if (isPixOrder) {
                            try {
                                const TicketReservation = (await import('../models/TicketReservation')).default;
                                const reservations = await TicketReservation.find({
                                    orderId: orderDoc._id,
                                    isActive: true,
                                });

                                if (reservations.length > 0) {
                                    await Promise.all(
                                        reservations.map(async (reservation) => {
                                            reservation.isActive = false;
                                            await reservation.save();
                                        })
                                    );
                                    console.log(`✅ ${reservations.length} reserva(s) liberada(s) para pedido PIX pago ${orderDoc.orderNumber}`);
                                }
                            } catch (reservationError: any) {
                                console.error(`⚠️ Erro ao liberar reservas do pedido PIX pago ${orderDoc.orderNumber}:`, reservationError.message);
                                // Não falhar a confirmação de pagamento se a liberação de reservas falhar
                            }
                        }

                        // Atualizar tickets e gerar QR codes se necessário
                        const tickets = await Ticket.find({ order: orderDoc._id, deletedAt: null });
                        for (const ticket of tickets) {
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

                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`[getOrderById] Pedido ${String(orderDoc._id)} (${isPixOrder ? 'PIX' : 'Cartão'}): MP aprovou. Atualizando para paid e gerando QR codes.`);
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
                                console.log(`[getOrderById] ${paymentMethod} pedido ${String(orderDoc._id)}: MP cancelou ANTES da expiração (expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} min). Seguindo MP e cancelando.`);
                            } else {
                                console.log(`[getOrderById] ${paymentMethod} pedido ${String(orderDoc._id)}: MP cancelou (status: ${mpStatus}). Seguindo MP e cancelando.`);
                            }
                        }
                    }
                } catch (syncError) {
                    // Não bloquear a resposta em caso de erro na sincronização
                    if (process.env.NODE_ENV !== 'production') {
                        const paymentMethod = isPixOrder ? 'PIX' : 'Cartão';
                        console.warn(`[getOrderById] Erro ao sincronizar status ${paymentMethod}:`, syncError);
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
                    { path: 'ticketType', select: 'name price isVIP' }
                ]
            })
            .populate('customer', 'name email')
            .lean();

        if (!freshOrder) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        // Para pedidos PIX pendentes, buscar informações do PIX para exibir no frontend
        // CRÍTICO: Para PIX, sempre usar Orders API (paymentOrderId), não Payment API
        let pixInfo: any = null;
        if (freshOrder.status === 'pending' && freshOrder.paymentMethod === 'pix') {
            // Buscar paymentOrderId do banco (pode não estar no lean())
            const orderDocForPix = await Order.findById(freshOrder._id).select('paymentOrderId paymentId').lean();
            const paymentOrderId = (orderDocForPix as any)?.paymentOrderId || (freshOrder as any).paymentOrderId;
            
            console.log(`[getOrderById] 🔍 Buscando PIX para pedido ${freshOrder.orderNumber}:`, {
                hasPaymentOrderId: !!paymentOrderId,
                paymentOrderId,
                hasPaymentId: !!freshOrder.paymentId,
                paymentId: freshOrder.paymentId,
            });
            
            try {
                const paymentService = await import('../services/paymentService');
                // Para PIX, SEMPRE tentar Orders API primeiro (via paymentOrderId)
                if (paymentOrderId) {
                    try {
                        const mpOrder = await paymentService.getOrderById(paymentOrderId);
                        const mpPayment = mpOrder?.transactions?.payments?.[0];
                        
                        // Na Orders API, o PIX está em payment_method (não payment_method_id)
                        // Verificar se é PIX: payment_method.type === 'pix' ou payment_method_id === 'pix'
                        const isPix = mpPayment?.payment_method?.type === 'pix' || 
                                     mpPayment?.payment_method_id === 'pix' ||
                                     (mpPayment?.payment_method && !mpPayment?.payment_method_id); // Se tem payment_method mas não payment_method_id, provavelmente é PIX
                        
                        if (mpPayment && isPix) {
                            // Na Orders API, os dados do PIX estão em payment_method, não em point_of_interaction
                            pixInfo = {
                                qrCode: mpPayment.payment_method?.qr_code || null,
                                qrCodeBase64: mpPayment.payment_method?.qr_code_base64 || null,
                                ticketUrl: mpPayment.payment_method?.ticket_url || null,
                                expiresAt: mpPayment.date_of_expiration ? new Date(mpPayment.date_of_expiration).toISOString() : null,
                                expirationMinutes: mpPayment.date_of_expiration 
                                    ? Math.round((new Date(mpPayment.date_of_expiration).getTime() - Date.now()) / (60 * 1000))
                                    : null,
                            };
                            console.log(`[getOrderById] ✅ Informações PIX encontradas via Orders API para pedido ${freshOrder.orderNumber}`, {
                                paymentOrderId,
                                hasQrCode: !!pixInfo.qrCodeBase64,
                                hasTicketUrl: !!pixInfo.ticketUrl,
                                hasQrCodeString: !!pixInfo.qrCode,
                            });
                        } else {
                            console.warn(`[getOrderById] ⚠️ Pedido PIX ${freshOrder.orderNumber} não é PIX no Orders API`, {
                                paymentOrderId,
                                paymentMethodType: mpPayment?.payment_method?.type,
                                paymentMethodId: mpPayment?.payment_method_id,
                            });
                        }
                    } catch (orderError: any) {
                        console.error(`[getOrderById] Erro ao buscar order ${paymentOrderId} no MP:`, orderError.message);
                        // Não tentar Payment API para PIX - não funciona
                    }
                } else {
                    console.warn(`[getOrderById] ⚠️ Pedido PIX ${freshOrder.orderNumber} não tem paymentOrderId salvo no banco`, {
                        hasPaymentId: !!freshOrder.paymentId,
                        paymentId: freshOrder.paymentId,
                    });
                }
            } catch (error: any) {
                console.error(`[getOrderById] Erro geral ao buscar informações do PIX:`, error.message);
            }
        }

        // Remover QR codes de pedidos pendentes (segurança)
        const orderWithFilteredQR = {
            ...freshOrder,
            tickets: freshOrder.tickets.map((ticket: any) => ({
                ...ticket,
                qrCode: freshOrder.status === 'paid' ? ticket.qrCode : null // Só retorna QR code se pedido estiver pago
            })),
            pixInfo: pixInfo || undefined, // Informações do PIX para pedidos pendentes
        };

        res.json({
            success: true,
            data: orderWithFilteredQR
        });

    } catch (error: any) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedido',
            errors: [error.message || 'Erro desconhecido']
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
            return res.status(400).json({ success: false, message: 'Pedido pago não pode ser cancelado aqui. Use reembolso.' });
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
                        const mpOrder = await paymentService.getOrderById((order as any).paymentOrderId);
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
                    return res.status(400).json({ success: false, message: 'Pedido já aprovado no Mercado Pago; não é possível cancelar.' })
                }

                // Para PIX: verificar se realmente expirou antes de cancelar
                if (isPixOrder && mpExpiration) {
                    const now = new Date();
                    if (now < mpExpiration) {
                        return res.status(400).json({
                            success: false,
                            message: `Pedido PIX ainda não expirou no Mercado Pago. Expira em ${Math.round((mpExpiration.getTime() - now.getTime()) / (60 * 1000))} minutos. Aguarde a expiração ou cancele diretamente no Mercado Pago.`
                        });
                    }
                }

                // Só tentar cancelar se ainda pendente/acionável
                if (mpStatus && ['pending', 'in_process', 'action_required'].includes(mpStatus)) {
                    if (isPixOrder && (order as any).paymentOrderId) {
                        try {
                            await paymentService.cancelOrderById((order as any).paymentOrderId);
                        } catch (cancelError) {
                            console.warn('[cancelOrder] Erro ao cancelar order no MP:', cancelError);
                        }
                    } else if (order.paymentId) {
                        try {
                            await (paymentService as any).cancelPaymentById(order.paymentId);
                        } catch (cancelError) {
                            console.warn('[cancelOrder] Erro ao cancelar payment no MP:', cancelError);
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
            status: 'pending' // APENAS tickets pending
        }).populate('ticketType');

        // Agrupar por ticketType para liberar estoque corretamente (apenas pending)
        const ticketTypeCounts = new Map<string, number>();
        for (const ticket of pendingTickets) {
            const ticketTypeId = String((ticket as any).ticketType?._id || (ticket as any).ticketType);
            if (ticketTypeId) {
                ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1);
            }
        }

        // Liberar estoque para cada ticketType (apenas dos tickets pending)
        for (const [ticketTypeId, quantity] of ticketTypeCounts.entries()) {
            const ticketType = await TicketType.findById(ticketTypeId);
            if (ticketType && quantity > 0) {
                ticketType.soldQuantity = Math.max(0, ticketType.soldQuantity - quantity);
                await ticketType.save();
            }
        }
        
        // Buscar todos os tickets para resposta (incluindo confirmed)
        const allTickets = await Ticket.find({ order: order._id, deletedAt: null }).populate('ticketType');

        // CRÍTICO: Liberar reservas vinculadas ao pedido (reservas de PIX pendentes)
        try {
            const TicketReservation = (await import('../models/TicketReservation')).default;
            const reservations = await TicketReservation.find({
                orderId: order._id,
                isActive: true,
            });

            if (reservations.length > 0) {
                await Promise.all(
                    reservations.map(async (reservation) => {
                        reservation.isActive = false;
                        await reservation.save();
                    })
                );
                console.log(`✅ ${reservations.length} reserva(s) liberada(s) para pedido cancelado ${order.orderNumber}`);
            }
        } catch (reservationError: any) {
            console.error(`⚠️ Erro ao liberar reservas do pedido ${order.orderNumber}:`, reservationError.message);
            // Não falhar o cancelamento se a liberação de reservas falhar
        }

        // Cancelar pedido
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();

        // CRÍTICO: Cancelar APENAS tickets pending (não cancelar tickets já confirmados/pagos)
        // Se o pedido tem tickets confirmados (já pagos) e tickets pending (aguardando pagamento),
        // apenas os pending devem ser cancelados quando o pagamento expira
        await Ticket.updateMany(
            { 
                order: order._id, 
                deletedAt: null,
                status: 'pending' // APENAS tickets pending - não mexer nos confirmados
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
                        minute: '2-digit'
                    }),
                    cancellationReason: 'Pedido cancelado pelo usuário ou sistema',
                    refundInfo: order.paymentId ? 'O valor será estornado em até 5 dias úteis.' : undefined
                });
            }
        } catch (emailError) {
            console.error('Erro ao enviar email de cancelamento:', emailError);
            // Não falhar o cancelamento se o email falhar
        }

        // Segurança extra: nunca retornar QR de tickets não confirmados
        const safeTickets = allTickets.map(t => {
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
        return res.status(500).json({ success: false, message: 'Erro ao cancelar pedido', errors: [error.message || 'Erro desconhecido'] });
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
            deletedAt: null
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        // Verificar se o pedido já está pago
        if (order.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Pedido já está pago'
            });
        }

        // Verificar se o pedido está pendente
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Pedido não pode ser confirmado',
                errors: [`Status atual: ${order.status}. Apenas pedidos pendentes podem ser confirmados.`]
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
            deletedAt: null
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
            data: populatedOrder
        });

    } catch (error: any) {
        console.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao confirmar pagamento',
            errors: [error.message || 'Erro desconhecido']
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
        }).select('subtotal discountAmount platformFee').lean();

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
            }
        });
    } catch (error: any) {
        console.error('Erro ao buscar estatísticas financeiras:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas financeiras',
            errors: [error.message]
        });
    }
};