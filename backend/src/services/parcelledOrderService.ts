import mongoose from 'mongoose';
import { Event, TicketType, ParcelledOrder, Parcel, Order, Ticket, IParcelledOrder, IParcel } from '../models';
import { calculateOrderValues, createTicketsForOrder } from './orderService';
import { createPixPayment } from './paymentService';

interface CreateParcelledOrderInput {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerCpf: string;
    customerPhone?: string;
    paymentType: 'pix' | 'boleto';
    installmentsCount: number;
}

export interface CreateParcelledOrderResult {
    parcelledOrder: IParcelledOrder;
    parcels: IParcel[];
    entryParcel: IParcel;
    entryPixPayment?: {
        paymentId: string;
        qrCode?: string | null;
        qrCodeBase64?: string | null;
        ticketUrl?: string | null;
        expiresAt?: string | null;
    } | null;
}

/**
 * Cria uma venda parcelada a partir de um "carrinho" simples (event + ticketType + quantity).
 * Ainda não cria Order de ingressos; isso será feito depois, quando definirmos o fluxo completo.
 */
export async function createParcelledOrderFromCart(
    input: CreateParcelledOrderInput
): Promise<CreateParcelledOrderResult> {
    try {
        const { eventId, ticketTypeId, quantity } = input;

        const [event, ticketType] = await Promise.all([
            Event.findOne({ _id: eventId, deletedAt: null, isActive: true }),
            TicketType.findOne({ _id: ticketTypeId, deletedAt: null, isActive: true }),
        ]);

        if (!event) {
            throw new Error('Evento não encontrado ou inativo');
        }
        if (!ticketType) {
            throw new Error('Tipo de ingresso não encontrado ou inativo');
        }

        // Reusar cálculo existente de valores do pedido
        const calc = await calculateOrderValues(ticketType, event, quantity);

        const totalAmount = calc.totalAmount;
        const platformFeeAmount = calc.platformFee;

        if (input.installmentsCount <= 0) {
            throw new Error('Quantidade de parcelas inválida');
        }

        const entryAmount = Number((totalAmount / input.installmentsCount).toFixed(2));

        const parcelledOrder = await ParcelledOrder.create([
            {
                customer: input.customerId,
                event: event._id,
                ticketType: ticketType._id,
                paymentType: input.paymentType,
                totalAmount,
                platformFeeAmount,
                entryAmount,
                installmentsCount: input.installmentsCount,
                overdueToleranceCount: 2,
                autoCancelEnabled: true,
                autoCancelEmailEnabled: true,
                notifyOnEntryCreated: true,
                notifyBeforeDueDays: 3,
                notifyOnDueDate: false,
                notifyOnOverdue: true,
                metadata: {
                    quantity,
                    ticketTypeName: ticketType.name,
                    eventName: event.name,
                    customerName: input.customerName,
                    customerEmail: input.customerEmail,
                    customerCpf: input.customerCpf,
                    customerPhone: input.customerPhone,
                },
            },
        ]);

        const createdParcelledOrder = parcelledOrder[0] as IParcelledOrder & {
            _id: mongoose.Types.ObjectId;
        };

        // Criar parcelas: sequence 0 = entrada, demais são futuras
        const parcelsToCreate: Partial<IParcel>[] = [];

        const now = new Date();

        // Entrada (sequence 0)
        parcelsToCreate.push({
            parcelledOrder: createdParcelledOrder._id,
            sequence: 0,
            amount: entryAmount,
            dueDate: now,
            status: 'pending',
            paymentProvider: 'mercadopago',
            paymentMethod: input.paymentType,
        } as any);

        // Demais parcelas
        for (let i = 1; i < input.installmentsCount; i++) {
            const dueDate = new Date();
            // Por enquanto, intervalo fixo aproximado de 30 dias; depois podemos parametrizar
            dueDate.setDate(dueDate.getDate() + i * 30);

            parcelsToCreate.push({
                parcelledOrder: createdParcelledOrder._id,
                sequence: i,
                amount: entryAmount,
                dueDate,
                status: 'pending',
                paymentProvider: 'mercadopago',
                paymentMethod: input.paymentType,
            } as any);
        }

        const createdParcels = (await Parcel.insertMany(
            parcelsToCreate
        )) as unknown as IParcel[];

        // Gerar pagamento da ENTRADA (sequence 0) se for PIX
        const entryParcel = createdParcels.find((p) => p.sequence === 0) as IParcel;

        if (!entryParcel) {
            throw new Error('Falha ao criar parcela de entrada');
        }

        let entryPixPayment = null;
        if (input.paymentType === 'pix') {
            const pixPayment = await createPixPayment({
                orderId: createdParcelledOrder._id.toString(),
                orderNumber: createdParcelledOrder._id.toString(),
                totalAmount: entryParcel.amount,
                customerData: {
                    name: input.customerName,
                    email: input.customerEmail,
                    cpf: input.customerCpf,
                    phone: input.customerPhone,
                },
                description: `Entrada plano parcelado - ${event.name}`,
                items: [
                    {
                        title: `Entrada ${ticketType.name}`,
                        quantity,
                        unit_price: entryParcel.amount,
                        description: `Entrada plano parcelado para ${event.name}`,
                    },
                ],
            });

            entryParcel.paymentId = pixPayment.paymentId;
            entryParcel.paymentOrderId = pixPayment.orderId; // Salvar orderId do MP para buscar depois
            entryParcel.qrCode = pixPayment.qrCode;
            entryParcel.qrCodeBase64 = pixPayment.qrCodeBase64;
            entryParcel.ticketUrl = pixPayment.ticketUrl;
            entryParcel.generatedAt = new Date();
            entryParcel.status = 'payment_generated';

            await entryParcel.save();

            // Armazenar pixPayment completo para retornar expiresAt
            entryPixPayment = pixPayment;
        }

        return {
            parcelledOrder: createdParcelledOrder,
            parcels: createdParcels,
            entryParcel,
            entryPixPayment, // Incluir pixPayment completo com expiresAt
        };
    } catch (error) {
        throw error;
    }
}

interface SyncParcelPaymentInput {
    paymentId: string;
    status: string;
    statusDetail?: string;
    externalReference?: string;
    transactionAmount?: number;
}

/**
 * Cria um Order e tickets quando um ParcelledOrder é completamente pago
 * CRÍTICO: QR codes só são gerados quando TODAS as parcelas estão pagas
 */
async function createOrderFromCompletedParcelledOrder(parcelledOrder: any) {
    try {
        // Verificar se já existe um Order para este ParcelledOrder
        const existingOrder = await Order.findOne({
            parcelledOrder: parcelledOrder._id,
            deletedAt: null,
        });

        if (existingOrder) {
            // Order já existe, não criar novamente
            return existingOrder;
        }

        const event = await Event.findById(parcelledOrder.event);
        const ticketType = parcelledOrder.ticketType
            ? await TicketType.findById(parcelledOrder.ticketType)
            : null;

        if (!event || !ticketType) {
            throw new Error('Evento ou tipo de ingresso não encontrado');
        }

        const quantity = parcelledOrder.metadata?.quantity || 1;
        const customerId = parcelledOrder.customer?.toString() || null;

        // Criar Order normal (similar ao fluxo de pedidos completos)
        const order = new Order({
            orderNumber: `PARC-${parcelledOrder._id}`,
            customer: customerId,
            event: parcelledOrder.event,
            tickets: [],
            subtotal: parcelledOrder.totalAmount - (parcelledOrder.platformFeeAmount || 0),
            platformFee: parcelledOrder.platformFeeAmount || 0,
            totalAmount: parcelledOrder.totalAmount,
            totalTickets: quantity,
            status: 'paid', // Já está pago (todas as parcelas foram pagas)
            paymentMethod: parcelledOrder.paymentType === 'pix' ? 'pix' : 'bank_slip',
            paidAt: new Date(),
            customerData: {
                name: parcelledOrder.metadata?.customerName || 'Cliente',
                email: parcelledOrder.metadata?.customerEmail || 'email@cliente.com',
                cpf: parcelledOrder.metadata?.customerCpf || '',
                phone: parcelledOrder.metadata?.customerPhone || '',
            },
            parcelledOrder: parcelledOrder._id, // Vincular ao ParcelledOrder
            isActive: true,
        });

        await order.save();

        // Criar tickets com status 'confirmed' e gerar QR codes
        const createdTickets = await createTicketsForOrder(
            order._id as mongoose.Types.ObjectId,
            parcelledOrder.event.toString(),
            parcelledOrder.ticketType?.toString() || '',
            quantity,
            ticketType.price || 0,
            'confirmed', // Status confirmed = QR code será gerado
            customerId || undefined,
            false // Não é VIP
        );

        // Atualizar order com os tickets
        order.tickets = createdTickets.map((t) => t._id as mongoose.Types.ObjectId);
        await order.save();

        return order;
    } catch (error: any) {
        console.error('[createOrderFromCompletedParcelledOrder] Erro ao criar Order:', error);
        throw error;
    }
}

/**
 * Sincroniza o pagamento de uma parcela a partir de dados do webhook do Mercado Pago.
 * Deve ser chamado pelo paymentController.handleWebhook.
 */
export async function syncParcelFromMercadoPago(input: SyncParcelPaymentInput) {
    const { paymentId, status, externalReference, transactionAmount } = input;

    // Tentar localizar a parcela pelo paymentId diretamente (ID do Payment dentro da Order)
    let parcel = await Parcel.findOne({ paymentId });
    let foundByPaymentOrderId = false;

    // Fallback 1: tentar buscar pelo paymentOrderId (caso o webhook envie o orderId no lugar do paymentId)
    if (!parcel && paymentId) {
        const foundByOrderId = await Parcel.findOne({ paymentOrderId: paymentId });
        if (foundByOrderId) {
            parcel = foundByOrderId;
            foundByPaymentOrderId = true;
        }
    }

    // Fallback 2: procurar por external_reference (id da ParcelledOrder)
    // Se temos externalReference válido, tentar várias estratégias
    if (!parcel && externalReference && mongoose.Types.ObjectId.isValid(externalReference)) {
        // Estratégia 2a: Buscar entrada (sequence 0) pelo ParcelledOrder + amount (com tolerância decimal)
        if (typeof transactionAmount === 'number' && !Number.isNaN(transactionAmount)) {
            // Buscar todas as parcelas do ParcelledOrder e comparar valores com tolerância
            const allParcels = await Parcel.find({
                parcelledOrder: externalReference,
            });

            // Comparar valores com tolerância de 0.01 (diferenças de arredondamento)
            for (const p of allParcels) {
                const diff = Math.abs(p.amount - transactionAmount);
                if (diff < 0.01) {
                    parcel = p;
                    break;
                }
            }

            // Se ainda não encontrou, tentar buscar especificamente a entrada (sequence 0)
            if (!parcel) {
                const entryParcel = await Parcel.findOne({
                    parcelledOrder: externalReference,
                    sequence: 0,
                });
                if (entryParcel) {
                    const diff = Math.abs(entryParcel.amount - transactionAmount);
                    if (diff < 0.01) {
                        parcel = entryParcel;
                    }
                }
            }
        } else {
            // Sem transactionAmount, buscar a entrada (sequence 0) por padrão
            parcel = await Parcel.findOne({
                parcelledOrder: externalReference,
                sequence: 0,
            });
        }
    }

    if (!parcel) {
        // Log para debug em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[syncParcelFromMercadoPago] Parcela não encontrada:', {
                paymentId,
                externalReference,
                transactionAmount,
            });
        }
        return;
    }

    const parcelledOrder = await ParcelledOrder.findById(parcel.parcelledOrder);
    if (!parcelledOrder) {
        return;
    }

    const normalizedStatus = String(status || '').toLowerCase();

    // Aprovação do pagamento
    if (normalizedStatus === 'approved' || normalizedStatus === 'processed' || normalizedStatus === 'paid') {
        // Atualizar paymentId apenas se não encontramos pelo paymentOrderId
        // (se encontramos pelo paymentOrderId, o paymentId recebido é na verdade o orderId)
        if (paymentId && !parcel.paymentId && !foundByPaymentOrderId) {
            parcel.paymentId = paymentId;
        }
        
        parcel.status = 'paid';
        parcel.paidAt = new Date();
        await parcel.save();
        
        // Log em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log('[syncParcelFromMercadoPago] Parcela marcada como paga:', {
                parcelId: parcel._id,
                sequence: parcel.sequence,
                parcelledOrderId: parcelledOrder._id,
                statusAnterior: parcelledOrder.status,
                encontradoPor: foundByPaymentOrderId ? 'paymentOrderId' : parcel.paymentId ? 'paymentId' : 'externalReference',
            });
        }

        // Atualizar status da venda parcelada
        if (parcel.sequence === 0 && parcelledOrder.status === 'pending_entry') {
            parcelledOrder.status = 'active';
        }

        // Verificar se todas as parcelas estão pagas
        const remaining = await Parcel.countDocuments({
            parcelledOrder: parcel.parcelledOrder,
            status: { $ne: 'paid' },
        });

        const wasCompletedBefore = parcelledOrder.status === 'completed';
        
        if (remaining === 0) {
            parcelledOrder.status = 'completed';
            
            // CRÍTICO: Criar Order e tickets APENAS quando todas as parcelas estiverem pagas
            // Isso garante que QR codes só sejam gerados quando o pedido estiver 100% pago
            if (!wasCompletedBefore) {
                await createOrderFromCompletedParcelledOrder(parcelledOrder as any);
            }
        }

        await parcelledOrder.save();
        return;
    }

    // Cancelamento / expiração
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'refunded') {
        if (parcel.status !== 'paid') {
            parcel.status = 'cancelled';
            parcel.cancelledAt = new Date();
            await parcel.save();
        }
    }
}

/**
 * Gera (ou regenera) o pagamento para uma parcela específica.
 * Usado tanto para antecipação manual quanto pelo robô de geração automática.
 */
export async function generatePaymentForParcel(parcelId: string) {
    if (!mongoose.Types.ObjectId.isValid(parcelId)) {
        throw new Error('ID da parcela inválido');
    }

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
        throw new Error('Parcela não encontrada');
    }

    const parcelledOrder = await ParcelledOrder.findById(parcel.parcelledOrder);
    if (!parcelledOrder) {
        throw new Error('Venda parcelada não encontrada');
    }

    if (parcel.status === 'paid') {
        throw new Error('Esta parcela já está paga');
    }

    if (parcelledOrder.paymentType !== 'pix') {
        throw new Error('Geração automática de pagamento implementada apenas para PIX');
    }

    // REGRA DE NEGÓCIO: Só liberar parcelas futuras DEPOIS da entrada paga
    // A entrada (sequence 0) pode ser gerada sempre
    if (parcel.sequence > 0) {
        // Verificar se a entrada (sequence 0) está paga
        const entryParcel = await Parcel.findOne({
            parcelledOrder: parcelledOrder._id,
            sequence: 0,
        });

        if (!entryParcel || entryParcel.status !== 'paid') {
            throw new Error(
                'A entrada precisa ser paga antes de gerar o pagamento das próximas parcelas'
            );
        }
    }

    const event = await Event.findById(parcelledOrder.event);
    const ticketType = parcelledOrder.ticketType
        ? await TicketType.findById(parcelledOrder.ticketType)
        : null;

    if (!event) {
        throw new Error('Evento não encontrado');
    }

    // Por enquanto usamos dados básicos do cliente armazenados na própria ParcelledOrder.metadata
    const customerName =
        (parcelledOrder.metadata && parcelledOrder.metadata.customerName) || 'Cliente';
    const customerEmail =
        (parcelledOrder.metadata && parcelledOrder.metadata.customerEmail) || 'email@cliente.com';
    const customerCpf =
        (parcelledOrder.metadata && parcelledOrder.metadata.customerCpf) || '00000000000';
    const customerPhone =
        (parcelledOrder.metadata && parcelledOrder.metadata.customerPhone) || undefined;

    const description = `Parcela ${parcel.sequence + 1}/${parcelledOrder.installmentsCount} - ${
        event.name
    }`;

    const pixPayment = await createPixPayment({
        orderId: String(parcelledOrder._id),
        orderNumber: String(parcelledOrder._id),
        totalAmount: parcel.amount,
        customerData: {
            name: customerName,
            email: customerEmail,
            cpf: customerCpf,
            phone: customerPhone,
        },
        description,
        items: [
            {
                title: ticketType
                    ? `${ticketType.name} - Parcela ${parcel.sequence + 1}`
                    : `Parcela ${parcel.sequence + 1}`,
                quantity: 1,
                unit_price: parcel.amount,
            },
        ],
    });

    parcel.paymentId = pixPayment.paymentId;
    parcel.paymentOrderId = pixPayment.orderId; // Salvar orderId do MP para buscar depois
    parcel.qrCode = pixPayment.qrCode;
    parcel.qrCodeBase64 = pixPayment.qrCodeBase64;
    parcel.ticketUrl = pixPayment.ticketUrl;
    parcel.generatedAt = new Date();
    parcel.status = 'payment_generated';

    await parcel.save();

    return {
        parcel,
        pixPayment,
    };
}

/**
 * Cancela uma venda parcelada manualmente (admin) ou por regra de negócio.
 * Não há tickets vinculados ainda, então é cancelamento lógico apenas.
 */
export async function cancelParcelledOrder(
    parcelledOrderId: string,
    reason: 'entry_not_paid' | 'overdue_installments' | 'manual'
) {
    if (!mongoose.Types.ObjectId.isValid(parcelledOrderId)) {
        throw new Error('ID da venda parcelada inválido');
    }

    const parcelledOrder = await ParcelledOrder.findById(parcelledOrderId);
    if (!parcelledOrder) {
        throw new Error('Venda parcelada não encontrada');
    }

    parcelledOrder.status = 'cancelled';
    parcelledOrder.cancellationReason = reason;
    await parcelledOrder.save();

    await Parcel.updateMany(
        {
            parcelledOrder: parcelledOrder._id,
            status: { $in: ['pending', 'payment_generated', 'overdue'] },
        },
        {
            $set: {
                status: 'cancelled',
                cancelledAt: new Date(),
            },
        }
    );

    return parcelledOrder;
}

/**
 * Job: gerar automaticamente pagamentos PIX para parcelas cujo vencimento está
 * a X dias (ex: 30) e ainda não têm pagamento gerado.
 */
export async function generateUpcomingParcelPayments(daysBeforeDue: number = 30) {
    const now = new Date();
    const from = new Date(now.getTime());
    const to = new Date(now.getTime() + daysBeforeDue * 24 * 60 * 60 * 1000);

    const parcelledOrders = await ParcelledOrder.find({
        status: 'active',
        paymentType: 'pix',
    }).select('_id');

    if (parcelledOrders.length === 0) {
        return { checked: 0, generated: 0 };
    }

    const orderIds = parcelledOrders.map(
        (o) => o._id as unknown as mongoose.Types.ObjectId
    );

    // Buscar parcelas futuras (sequence > 0) que estão pendentes e próximas do vencimento
    // IMPORTANTE: O job só gera para ParcelledOrder com status 'active',
    // que só acontece quando a entrada (sequence 0) está paga (ver syncParcelFromMercadoPago)
    const parcels = await Parcel.find({
        parcelledOrder: { $in: orderIds },
        sequence: { $gt: 0 }, // ignorar entrada
        status: 'pending',
        dueDate: { $gte: from, $lte: to },
    }).select('_id');

    let generated = 0;

    for (const p of parcels as Array<IParcel & { _id: mongoose.Types.ObjectId }>) {
        try {
            await generatePaymentForParcel(p._id.toString());
            generated++;
        } catch {
            // ignorar erros individuais, job continua
        }
    }

    return { checked: parcels.length, generated };
}

/**
 * Job: aplicar regras de atraso/cancelamento em vendas parceladas.
 * - Cancela pedidos com entrada não paga quando o PIX expira (30 minutos).
 * - Marca parcelas como overdue quando dueDate < hoje e ainda pendentes.
 * - Cancela venda se quantidade de parcelas overdue >= overdueToleranceCount.
 */
export async function applyOverdueAndCancellationRules() {
    const now = new Date();

    // 1. Verificar e cancelar pedidos com entrada não paga (PIX expirado)
    const pendingEntryOrders = await ParcelledOrder.find({
        status: 'pending_entry',
        autoCancelEnabled: true,
    });

    let cancelledByEntry = 0;

    for (const order of pendingEntryOrders as Array<IParcelledOrder & { _id: mongoose.Types.ObjectId }>) {
        // Buscar parcela de entrada (sequence 0)
        const entryParcel = await Parcel.findOne({
            parcelledOrder: order._id,
            sequence: 0,
        });

        if (!entryParcel) {
            continue;
        }

        // Se a entrada está com status 'payment_generated', verificar se o PIX expirou
        if (entryParcel.status === 'payment_generated' && entryParcel.paymentOrderId) {
            try {
                // Buscar informações do pagamento no Mercado Pago para verificar expiração
                const paymentService = await import('./paymentService');
                const mpOrder = await paymentService.getOrderById(entryParcel.paymentOrderId);
                const mpPayment = mpOrder?.transactions?.payments?.[0];

                if (mpPayment?.date_of_expiration) {
                    const expirationDate = new Date(mpPayment.date_of_expiration);
                    
                    // Se expirou e ainda não foi pago, cancelar pedido
                    if (now >= expirationDate && mpPayment.status !== 'approved') {
                        await cancelParcelledOrder(order._id.toString(), 'entry_not_paid');
                        cancelledByEntry++;
                    }
                } else if (entryParcel.generatedAt) {
                    // Fallback: se não temos date_of_expiration do MP, usar 30 minutos a partir de generatedAt
                    const expirationDate = new Date(entryParcel.generatedAt.getTime() + 30 * 60 * 1000);
                    if (now >= expirationDate) {
                        // Verificar status no MP antes de cancelar
                        const status = String(mpPayment?.status || '').toLowerCase();
                        if (status !== 'approved' && status !== 'paid') {
                            await cancelParcelledOrder(order._id.toString(), 'entry_not_paid');
                            cancelledByEntry++;
                        }
                    }
                }
            } catch (error) {
                // Erro ao consultar MP - ignorar e continuar
                // Em caso de erro, não cancelar (segurança)
            }
        }
    }

    // 2. Marcar parcelas vencidas (baseado em dueDate)
    await Parcel.updateMany(
        {
            status: 'pending',
            dueDate: { $lt: now },
        },
        {
            $set: {
                status: 'overdue',
            },
        }
    );

    // Também marcar parcelas com payment_generated que já passaram do vencimento
    await Parcel.updateMany(
        {
            status: 'payment_generated',
            dueDate: { $lt: now },
        },
        {
            $set: {
                status: 'overdue',
            },
        }
    );

    // 3. Buscar vendas ativas para avaliar cancelamento por múltiplas parcelas atrasadas
    const activeOrders = await ParcelledOrder.find({
        status: 'active',
        autoCancelEnabled: true,
    });

    let cancelledByOverdue = 0;

    for (const o of activeOrders as Array<IParcelledOrder & { _id: mongoose.Types.ObjectId }>) {
        const overdueCount = await Parcel.countDocuments({
            parcelledOrder: o._id,
            status: 'overdue',
        });

        if (overdueCount >= o.overdueToleranceCount) {
            await cancelParcelledOrder(o._id.toString(), 'overdue_installments');
            cancelledByOverdue++;
        }
    }

    return { 
        evaluated: activeOrders.length, 
        cancelledByEntry,
        cancelledByOverdue,
        totalCancelled: cancelledByEntry + cancelledByOverdue
    };
}

export function startParcelledOrderSchedulers() {
    const generateIntervalMs = Number(
        process.env.PARCELLED_GENERATE_INTERVAL_MS || 60 * 60 * 1000
    ); // 1h
    const overdueIntervalMs = Number(
        process.env.PARCELLED_OVERDUE_INTERVAL_MS || 60 * 60 * 1000
    ); // 1h

    setInterval(() => {
        generateUpcomingParcelPayments().catch(() => {});
    }, generateIntervalMs);

    setInterval(() => {
        applyOverdueAndCancellationRules().catch(() => {});
    }, overdueIntervalMs);
}




