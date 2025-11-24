import mongoose from 'mongoose';
import { Order, Ticket, TicketType, Event, User, PromoterCode } from '../models';
import { generateQRCode } from './qrCodeService';
import { generateTicketPDF } from './pdfService';
import { sendCourtesyTicketEmail } from './emailTemplates';
import { normalizeEmail } from '../utils/validationHelpers';

const CHECKOUT_TIMEOUT_MINUTES = Number(process.env.CHECKOUT_TIMEOUT_MINUTES || 30);
const CHECKOUT_TIMEOUT_MS = CHECKOUT_TIMEOUT_MINUTES * 60 * 1000;
const MAX_CARD_PAYMENT_ATTEMPTS = Number(process.env.PAYMENT_MAX_CARD_ATTEMPTS || 3);

/**
 * Valida dados básicos de criação de pedido
 */
export interface OrderValidationResult {
    isValid: boolean;
    error?: { status: number; message: string; errors: string[] };
}

export function validateOrderInput(
    eventId: string | undefined,
    ticketTypeId: string | undefined,
    quantity: number | undefined
): OrderValidationResult {
    if (!eventId || !ticketTypeId || !quantity || quantity <= 0) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Dados inválidos',
                errors: ['eventId, ticketTypeId e quantity são obrigatórios'],
            },
        };
    }

    if (quantity > 10) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Quantidade inválida',
                errors: ['Máximo de 10 ingressos por pedido'],
            },
        };
    }

    return { isValid: true };
}

/**
 * Busca dados relacionados necessários para criar pedido
 */
export interface OrderRelatedData {
    event: any;
    ticketType: any;
    user: any | null;
}

export async function fetchOrderRelatedData(
    eventId: string,
    ticketTypeId: string,
    userId?: string | null
): Promise<{ data?: OrderRelatedData; error?: OrderValidationResult['error'] }> {
    // Paralelizar queries independentes para melhor performance
    const [event, ticketType, user] = await Promise.all([
        Event.findOne({ _id: eventId, deletedAt: null, isActive: true }),
        TicketType.findOne({
            _id: ticketTypeId,
            deletedAt: null,
            isActive: true,
        }),
        userId ? User.findOne({ _id: userId, deletedAt: null }) : Promise.resolve(null),
    ]);

    if (!event) {
        return {
            error: {
                status: 404,
                message: 'Evento não encontrado ou inativo',
                errors: [],
            },
        };
    }

    if (!ticketType) {
        return {
            error: {
                status: 404,
                message: 'Tipo de ingresso não encontrado ou inativo',
                errors: [],
            },
        };
    }

    if (String(ticketType.event) !== String(eventId)) {
        return {
            error: {
                status: 400,
                message: 'Tipo de ingresso não pertence a este evento',
                errors: [],
            },
        };
    }

    if (userId && !user) {
        return {
            error: {
                status: 404,
                message: 'Usuário não encontrado',
                errors: [],
            },
        };
    }

    return { data: { event, ticketType, user } };
}

/**
 * Valida disponibilidade e limites de compra
 */
export interface AvailabilityValidationResult {
    isValid: boolean;
    error?: OrderValidationResult['error'];
}

export async function validateAvailabilityAndLimits(
    eventId: string,
    ticketTypeId: string,
    quantity: number,
    ticketType: any,
    cpfToValidate?: string | null,
    emailToValidate?: string | null
): Promise<AvailabilityValidationResult> {
    // Verificar disponibilidade (pedidos PENDING já estão em soldQuantity)
    const availableQuantity = ticketType.availableQuantity;
    if (availableQuantity < quantity) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Quantidade insuficiente',
                errors: [`Apenas ${availableQuantity} ingressos disponíveis`],
            },
        };
    }

    // Verificar limite por compra
    if (quantity > ticketType.maxPerPurchase) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Limite excedido',
                errors: [`Máximo de ${ticketType.maxPerPurchase} ingressos por compra`],
            },
        };
    }

    // Verificar limite acumulado por CPF (se configurado)
    // CRÍTICO: Esta validação deve funcionar para TODOS os tipos de ingresso, incluindo VIP
    if (ticketType.maxPerCPF && cpfToValidate) {
        // Importar função dinamicamente para evitar dependência circular
        const ordersController = await import('../controllers/ordersController');

        console.log('[validateAvailabilityAndLimits] 🔍 Validando limite por CPF:', {
            eventId,
            ticketTypeId,
            ticketTypeName: ticketType.name,
            isVIP: ticketType.isVIP,
            maxPerCPF: ticketType.maxPerCPF,
            cpfToValidate: cpfToValidate ? `${cpfToValidate.substring(0, 3)}.***.***-**` : 'null',
            quantity,
        });

        const purchasedByCPF = await ordersController.countPurchasedTicketsByCPFOrEmail(
            eventId,
            ticketTypeId,
            cpfToValidate,
            undefined
        );

        console.log('[validateAvailabilityAndLimits] 📊 Contagem de ingressos já comprados:', {
            purchasedByCPF,
            quantity,
            totalAfterPurchase: purchasedByCPF + quantity,
            maxPerCPF: ticketType.maxPerCPF,
        });

        const totalAfterPurchase = purchasedByCPF + quantity;

        if (totalAfterPurchase > ticketType.maxPerCPF) {
            const remaining = Math.max(0, ticketType.maxPerCPF - purchasedByCPF);
            console.log('[validateAvailabilityAndLimits] ❌ Limite por CPF excedido:', {
                purchasedByCPF,
                quantity,
                totalAfterPurchase,
                maxPerCPF: ticketType.maxPerCPF,
                remaining,
            });
            return {
                isValid: false,
                error: {
                    status: 400,
                    message: 'Limite acumulado por CPF excedido',
                    errors: [
                        `Este CPF já comprou ${purchasedByCPF} ingresso(s) deste tipo. ` +
                            `Limite máximo: ${ticketType.maxPerCPF}. ` +
                            `Você pode comprar no máximo mais ${remaining} ingresso(s).`,
                    ],
                },
            };
        }

        console.log('[validateAvailabilityAndLimits] ✅ Limite por CPF OK:', {
            purchasedByCPF,
            quantity,
            totalAfterPurchase,
            maxPerCPF: ticketType.maxPerCPF,
        });
    } else if (ticketType.maxPerCPF && !cpfToValidate) {
        // CRÍTICO: Se há limite por CPF mas CPF não foi fornecido, bloquear
        console.warn(
            '[validateAvailabilityAndLimits] ⚠️ Limite por CPF configurado mas CPF não fornecido:',
            {
                ticketTypeName: ticketType.name,
                maxPerCPF: ticketType.maxPerCPF,
            }
        );
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'CPF obrigatório',
                errors: [
                    `Este tipo de ingresso requer CPF para validação de limite. ` +
                        `Limite máximo: ${ticketType.maxPerCPF} ingresso(s) por CPF.`,
                ],
            },
        };
    }

    // Verificar limite acumulado por Email (se configurado)
    if (ticketType.maxPerEmail && emailToValidate) {
        // Importar função dinamicamente para evitar dependência circular
        const ordersController = await import('../controllers/ordersController');
        const purchasedByEmail = await ordersController.countPurchasedTicketsByCPFOrEmail(
            eventId,
            ticketTypeId,
            undefined,
            emailToValidate
        );
        const totalAfterPurchase = purchasedByEmail + quantity;

        if (totalAfterPurchase > ticketType.maxPerEmail) {
            const remaining = Math.max(0, ticketType.maxPerEmail - purchasedByEmail);
            return {
                isValid: false,
                error: {
                    status: 400,
                    message: 'Limite acumulado por Email excedido',
                    errors: [
                        `Este Email já comprou ${purchasedByEmail} ingresso(s) deste tipo. ` +
                            `Limite máximo: ${ticketType.maxPerEmail}. ` +
                            `Você pode comprar no máximo mais ${remaining} ingresso(s).`,
                    ],
                },
            };
        }
    }

    return { isValid: true };
}

/**
 * Calcula valores do pedido (subtotal, desconto, taxa, total)
 */
export interface OrderCalculationResult {
    isVIP: boolean;
    ticketPrice: number;
    subtotal: number;
    discountAmount: number;
    platformFee: number;
    totalAmount: number;
    usedPromoterCode?: string;
}

export async function calculateOrderValues(
    ticketType: any,
    event: any,
    quantity: number,
    promoterCode?: string
): Promise<OrderCalculationResult> {
    // CRÍTICO: Validação rigorosa - APENAS boolean true explícito
    // Evitar que undefined, null, ou valores truthy sejam tratados como VIP
    const isVIP = Boolean(ticketType?.isVIP === true);
    const ticketPrice = isVIP ? 0 : ticketType.price;
    const subtotal = ticketPrice * quantity;

    // Validar e aplicar desconto de código de promotor
    let discountAmount = 0;
    let usedPromoterCode: string | undefined = undefined;

    if (promoterCode && !isVIP) {
        const code = await PromoterCode.findOne({
            code: promoterCode.toUpperCase().trim(),
            isActive: true,
            deletedAt: null,
            events: event._id,
        });

        if (code) {
            usedPromoterCode = code.code;
            if (code.discountType === 'percentage') {
                discountAmount = subtotal * (code.discountValue / 100);
            } else {
                discountAmount = Math.min(code.discountValue, subtotal);
            }
        }
    }

    // Calcular taxa da plataforma
    const platformFeePercentage = event.platformFeePercentage || 0;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const platformFee = isVIP ? 0 : subtotalAfterDiscount * (platformFeePercentage / 100);
    const totalAmount = subtotalAfterDiscount + platformFee;

    return {
        isVIP,
        ticketPrice,
        subtotal,
        discountAmount,
        platformFee,
        totalAmount,
        usedPromoterCode,
    };
}

/**
 * Busca pedido existente para reutilizar
 * CRÍTICO: NÃO incluir pedidos PIX - pedidos PIX têm 30 minutos para pagamento
 * e não devem ser reutilizados para permitir criar novo pedido (que pode ser com cartão)
 */
export async function findExistingOrder(
    eventId: string,
    userId?: string | null,
    normalizedCustomerEmail?: string | null,
    normalizedUserEmail?: string | null
) {
    const existingOrderFilters: any = {
        event: eventId,
        deletedAt: null,
        status: { $in: ['pending', 'failed'] },
        // CRÍTICO: Excluir pedidos PIX - não devem ser reutilizados
        paymentMethod: { $in: [null, 'credit_card', 'debit_card'] },
    };

    if (userId) {
        existingOrderFilters.customer = userId;
    } else if (normalizedCustomerEmail) {
        existingOrderFilters['customerData.email'] = normalizedCustomerEmail;
    } else if (normalizedUserEmail) {
        existingOrderFilters['customerData.email'] = normalizedUserEmail;
    }

    return await Order.findOne(existingOrderFilters).populate('tickets', 'ticketType').lean();
}

/**
 * Devolve estoque de um pedido
 */
export async function returnStockFromOrder(oldOrder: any) {
    const oldTickets = await Ticket.find({ order: oldOrder._id, deletedAt: null }).populate(
        'ticketType'
    );
    const ticketTypeCounts = new Map<string, number>();

    for (const ticket of oldTickets) {
        const ticketTypeId = String((ticket as any).ticketType?._id || (ticket as any).ticketType);
        if (ticketTypeId) {
            ticketTypeCounts.set(ticketTypeId, (ticketTypeCounts.get(ticketTypeId) || 0) + 1);
        }
    }

    for (const [ticketTypeId, qty] of ticketTypeCounts.entries()) {
        const oldTicketType = await TicketType.findById(ticketTypeId);
        if (oldTicketType && qty > 0) {
            oldTicketType.soldQuantity = Math.max(0, oldTicketType.soldQuantity - qty);
            await oldTicketType.save();
            console.log(
                `🔄 [orderService] Devolvendo ${qty} ingressos ao estoque (ticketType: ${ticketTypeId})`
            );
        }
    }
}

/**
 * Cancela pedido e devolve estoque
 */
export async function cancelOrderAndReturnStock(oldOrder: any) {
    await returnStockFromOrder(oldOrder);

    if (oldOrder.status === 'pending') {
        oldOrder.status = 'cancelled';
        oldOrder.cancelledAt = new Date();
        oldOrder.isActive = false;
        await oldOrder.save();

        await Ticket.updateMany(
            { order: oldOrder._id, deletedAt: null },
            { status: 'cancelled', deletedAt: new Date() }
        );

        console.log(
            `✅ [orderService] Pedido ${oldOrder.orderNumber} cancelado e ingressos devolvidos ao estoque`
        );
    }
}

/**
 * Cancela pedidos pendentes anteriores do mesmo usuário/evento
 */
export async function cancelPreviousPendingOrders(
    eventId: string,
    userId?: string | null,
    normalizedCustomerEmail?: string | null,
    normalizedUserEmail?: string | null,
    excludeOrderId?: string
) {
    // CRÍTICO: NÃO incluir 'pix' aqui - pedidos PIX têm 30 minutos para pagamento
    // e devem ser cancelados apenas por expiração de tempo, não por criação de novo pedido
    // O serviço orderExpirationService já cuida do cancelamento de PIX expirados
    const cancelFilters: any = {
        event: eventId,
        deletedAt: null,
        status: 'pending',
        paymentMethod: { $in: [null, 'credit_card', 'debit_card'] },
    };

    const failedFilters: any = {
        event: eventId,
        deletedAt: null,
        status: 'failed',
        paymentMethod: { $in: [null, 'credit_card', 'debit_card'] },
    };

    if (excludeOrderId) {
        cancelFilters._id = { $ne: excludeOrderId };
        failedFilters._id = { $ne: excludeOrderId };
    }

    if (userId) {
        cancelFilters.customer = userId;
        failedFilters.customer = userId;
    } else if (normalizedCustomerEmail) {
        cancelFilters['customerData.email'] = normalizedCustomerEmail;
        failedFilters['customerData.email'] = normalizedCustomerEmail;
    } else if (normalizedUserEmail) {
        cancelFilters['customerData.email'] = normalizedUserEmail;
        failedFilters['customerData.email'] = normalizedUserEmail;
    }

    // Executar cancelamento em background (não bloquear criação de pedido)
    // Usar setImmediate para executar após a resposta ser enviada
    setImmediate(async () => {
        const pendingOrdersToCancel = await Order.find(cancelFilters).populate('tickets');
        const failedOrdersToClean = await Order.find(failedFilters).populate('tickets');

        if (pendingOrdersToCancel.length > 0) {
            console.log(
                `🔄 [orderService] Cancelando ${pendingOrdersToCancel.length} pedido(s) pendente(s) anterior(es)`
            );
            // Executar cancelamentos em paralelo
            await Promise.all(
                pendingOrdersToCancel.map((oldOrder) => cancelOrderAndReturnStock(oldOrder))
            );
        }

        if (failedOrdersToClean.length > 0) {
            console.log(
                `🔄 [orderService] Limpando ${failedOrdersToClean.length} pedido(s) failed anterior(es) - devolvendo estoque`
            );
            // Executar limpeza em paralelo
            await Promise.all(
                failedOrdersToClean.map(async (oldOrder) => {
                    await returnStockFromOrder(oldOrder);
                    console.log(
                        `✅ [orderService] Estoque devolvido do pedido failed ${oldOrder.orderNumber}`
                    );
                })
            );
        }
    });
}

/**
 * Cria tickets para um pedido
 * Otimizado: usa insertMany para criar todos os tickets de uma vez
 */
export async function createTicketsForOrder(
    orderId: mongoose.Types.ObjectId,
    eventId: string,
    ticketTypeId: string,
    quantity: number,
    ticketPrice: number,
    ticketStatus: 'pending' | 'confirmed',
    userId?: string | null,
    isVIP: boolean = false
): Promise<any[]> {
    // Criar todos os tickets de uma vez usando insertMany (mais rápido)
    const ticketsData = Array.from({ length: quantity }, () => ({
        event: eventId,
        ticketType: ticketTypeId,
        order: orderId,
        holder: userId || null,
        price: ticketPrice,
        status: ticketStatus,
        qrCode: '',
    }));

    const createdTickets = await Ticket.insertMany(ticketsData);

    // Gerar QR Codes em paralelo APENAS se o pedido estiver PAID ou for VIP
    if (ticketStatus === 'confirmed' || isVIP) {
        const qrCodePromises = createdTickets.map(async (ticket) => {
            const qrCode = await generateQRCode(ticket.code);
            ticket.qrCode = qrCode;
            return ticket.save();
        });
        await Promise.all(qrCodePromises);
    }

    return createdTickets;
}

/**
 * Envia email de cortesia para pedidos VIP
 */
export async function sendVIPOrderEmail(populatedOrder: any) {
    try {
        const event = populatedOrder.event as any;
        const customer = populatedOrder.customer as any;
        const customerData = populatedOrder.customerData as any;
        const tickets = populatedOrder.tickets as any[];
        const orderNumber = populatedOrder.orderNumber;
        const orderId = populatedOrder._id;

        const customerEmail = customerData?.email || customer?.email;
        const customerName = customerData?.name || customer?.name;

        if (!customerEmail || customerEmail === 'Não informado' || customerEmail.trim() === '') {
            console.warn(`⚠️ Email não informado para cortesia. Pedido: ${orderNumber}`);
            return;
        }

        if (!event || !tickets || tickets.length === 0 || !orderNumber) {
            return;
        }

        const ticketsWithQR = tickets.filter((t) => t.qrCode);
        if (ticketsWithQR.length === 0) {
            return;
        }

        const pdfBuffer = await generateTicketPDF({
            event: {
                name: event.name,
                date: event.date,
                location: event.location,
                address: event.address,
            },
            orderNumber,
            customerName: customerName || 'Cliente',
            tickets: ticketsWithQR.map((t) => ({
                code: t.code,
                qrCode: t.qrCode,
                ticketType: (t.ticketType as any)?.name || 'Ingresso',
                holderName: (t.holder as any)?.name || customerName || 'Cliente',
            })),
        });

        const eventDate = new Date(event.date).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const qrCodesForEmail = ticketsWithQR.map((t) => ({
            code: t.code,
            qrCode: t.qrCode,
            holderName: (t.holder as any)?.name || customerName || 'Cliente',
        }));

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
                qrCodes: qrCodesForEmail,
            },
            [
                {
                    filename: `cortesia-${orderNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ]
        );

        if (emailResult.success) {
            console.log(`✅ Email de cortesia com PDF enviado para ${customerEmail}`);
        } else {
            console.error(
                `❌ Erro ao enviar email de cortesia para ${customerEmail}:`,
                emailResult.error
            );
        }
    } catch (emailError) {
        console.error('Erro ao enviar email de cortesia:', emailError);
    }
}
