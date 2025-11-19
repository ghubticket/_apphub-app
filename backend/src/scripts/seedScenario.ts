/*
 Seed de cenário completo:
 - Cria 1 evento
 - Cria 3 tipos de ingresso:
   1) VIP (sem taxa, sem código) -> price=0, isVIP=true
   2) PISTA (com taxa, sem código)
   3) PISTA_PROMO (com taxa, com código de promotor)
 - Cria 1 pedido PIX para um usuário existente (inicia pagamento PIX e imprime QR)
 - Cria 1 pedido Cartão para um usuário existente (imprime endpoint para pagar via API)
*/

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User, Event, TicketType, PromoterCode, Order, Ticket } from '../models';
import type { IPromoterCode } from '../models';
import * as paymentService from '../services/paymentService';

async function main() {
    await connectDatabase();

    const existingEmail = process.env.SEED_USER_EMAIL || process.env.ADMIN_EMAIL;
    const user = await (async () => {
        if (existingEmail) {
            const u = await User.findOne({ email: existingEmail.toLowerCase(), deletedAt: null });
            if (u) return u;
        }
        // pega o primeiro usuário ativo
        const any = await User.findOne({ deletedAt: null });
        if (!any)
            throw new Error(
                'Nenhum usuário encontrado. Crie um usuário antes de rodar este script.'
            );
        return any;
    })();

    console.log('👤 Usuário para seed:', user.email);

    function generateOrderNumber(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let out = '';
        for (let i = 0; i < 10; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
        return out;
    }

    // 1) Evento
    const event = new Event({
        name: 'Show de Teste – EventHub',
        description: 'Evento de teste automatizado para fluxo de pagamentos e validações.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: 'Auditório Central',
        address: 'Av. Teste, 123',
        city: 'São Paulo',
        state: 'SP',
        price: 0,
        capacity: 500,
        soldTickets: 0,
        platformFeePercentage: 10, // taxa para ingressos pagos
        status: 'published',
        organizer: user._id,
        isActive: true,
    });
    await event.save();
    console.log('📌 Evento criado:', String(event._id));

    // 2) Ingressos
    const vip = await TicketType.create({
        name: 'VIP (Free) – sem taxa',
        description: 'Ingresso VIP gratuito para testes',
        event: event._id as unknown as mongoose.Types.ObjectId,
        price: 0,
        isVIP: true,
        lotNumber: 1,
        maxQuantity: 50,
        maxPerPurchase: 2,
        soldQuantity: 0,
        isActive: true,
    });

    const pista = await TicketType.create({
        name: 'Pista – com taxa',
        description: 'Ingresso pago com taxa de plataforma',
        event: event._id as unknown as mongoose.Types.ObjectId,
        price: 100,
        isVIP: false,
        lotNumber: 1,
        maxQuantity: 200,
        maxPerPurchase: 4,
        soldQuantity: 0,
        isActive: true,
    });

    const pistaPromo = await TicketType.create({
        name: 'Pista Promo – com taxa + código',
        description: 'Ingresso pago com taxa e aplicável a código de promotor',
        event: event._id as unknown as mongoose.Types.ObjectId,
        price: 120,
        isVIP: false,
        lotNumber: 1,
        maxQuantity: 200,
        maxPerPurchase: 4,
        soldQuantity: 0,
        isActive: true,
    });

    console.log('🎫 Ingressos criados:', {
        vip: String(vip._id),
        pista: String(pista._id),
        pistaPromo: String(pistaPromo._id),
    });

    // 3) Código de Promotor para pistaPromo
    let promo: IPromoterCode | null;
    try {
        promo = await PromoterCode.create({
            code: 'PROMO10',
            name: 'Promotor Teste',
            cpf: '123.456.789-09',
            email: 'promotor@testuser.com',
            whatsapp: '(11) 99999-9999',
            discountType: 'percentage',
            discountValue: 10,
            currentUses: 0,
            isActive: true,
            events: [event._id as unknown as mongoose.Types.ObjectId],
            createdBy: user._id,
        });
        console.log('🏷️  Código de promotor criado:', promo.code);
    } catch (e: any) {
        if (String(e?.message || '').includes('Código já existe') || String(e?.code) === '11000') {
            promo = (await PromoterCode.findOne({
                code: 'PROMO10',
                deletedAt: null,
            })) as unknown as IPromoterCode | null;
            if (!promo) throw e;
            // garantir associação ao evento
            const hasEvent = (promo!.events || []).some(
                (ev: any) => String(ev) === String(event._id)
            );
            if (!hasEvent) {
                (promo!.events as any).push(event._id as unknown as mongoose.Types.ObjectId);
                await (promo as any).save();
            }
            console.log('🏷️  Código de promotor reutilizado:', promo!.code);
        } else {
            throw e;
        }
    }

    // Helper para criar pedido com 1 ingresso e tickets
    async function createOrderOneTicket(
        tt: any,
        promoterCode?: string,
        intendedMethod?: 'pix' | 'credit_card' | 'debit_card' | 'bank_slip' | 'vip_free'
    ) {
        const subtotal = tt.price;
        const discount = promoterCode
            ? promo!.discountType === 'percentage'
                ? Math.round((subtotal * promo!.discountValue) / 100)
                : promo!.discountValue
            : 0;
        const platformFee = Math.round(
            ((subtotal - discount) * (event.platformFeePercentage || 0)) / 100
        );
        const total = subtotal - discount + platformFee;

        const order = new Order({
            orderNumber: generateOrderNumber(),
            customer: user._id,
            event: event._id as unknown as mongoose.Types.ObjectId,
            tickets: [],
            subtotal,
            discountAmount: discount,
            platformFee,
            totalAmount: total,
            promoterCode: promoterCode,
            totalTickets: 1,
            status: tt.isVIP ? 'paid' : 'pending',
            paymentMethod: tt.isVIP ? 'vip_free' : intendedMethod,
            customerData: {
                name: user.name || 'Usuário Teste',
                email: user.email,
                phone: user.phone,
                cpf: user.cpf,
            },
        });
        await order.save();

        const ticket = new Ticket({
            event: event._id as unknown as mongoose.Types.ObjectId,
            ticketType: tt._id,
            order: order._id,
            holder: user._id,
            price: tt.price,
            status: tt.isVIP ? 'confirmed' : 'pending',
            qrCode: '',
        });
        await ticket.save();

        order.tickets = [ticket._id as any];
        if (tt.isVIP) {
            // marca pago agora
            order.paidAt = new Date();
        }
        await order.save();

        return { order, ticket };
    }

    // 4) Pedido para PIX (pista – sem código)
    const { order: pixOrder } = await createOrderOneTicket(pista, undefined, 'pix');
    console.log('🧾 Pedido PIX criado (pendente):', pixOrder.orderNumber);

    // Iniciar pagamento PIX via service
    try {
        const deviceId = 'seed-device-' + Date.now();
        // Sandbox exige email *@testuser.com
        const isProd = (process.env.NODE_ENV || 'development') === 'production';
        const originalEmail = (pixOrder.customerData as any)?.email || user.email;
        const sandboxEmail =
            !isProd && originalEmail && !originalEmail.endsWith('@testuser.com')
                ? `${originalEmail.split('@')[0] || 'test'}@testuser.com`
                : originalEmail;
        const pix = await paymentService.createPixPayment(
            {
                orderId: String(pixOrder._id),
                orderNumber: pixOrder.orderNumber,
                totalAmount: pixOrder.totalAmount,
                customerData: { ...(pixOrder.customerData as any), email: sandboxEmail },
                description: 'Pedido ' + pixOrder.orderNumber,
                items: [
                    {
                        title: pista.name,
                        description: pista.description,
                        quantity: 1,
                        unit_price: pista.price,
                        category: 'tickets',
                    },
                ],
            },
            deviceId
        );

        pixOrder.paymentId = pix.paymentId;
        pixOrder.paymentStatus = pix.status;
        pixOrder.paymentStatusDetail = pix.statusDetail;
        pixOrder.paymentMethod = 'pix';
        await pixOrder.save();

        console.log('💳 PIX iniciado:', {
            paymentId: pix.paymentId,
            status: pix.status,
            statusDetail: pix.statusDetail,
            expiresAt: pix.expiresAt,
            ticketUrl: pix.ticketUrl,
        });
    } catch (e) {
        console.warn(
            '⚠️ Não foi possível iniciar PIX automaticamente. Você pode usar a rota /api/payments/{orderId}/pix'
        );
    }

    // 5) Pedido para Cartão (pistaPromo – com código)
    const { order: cardOrder } = await createOrderOneTicket(pistaPromo, promo.code, 'credit_card');
    console.log('🧾 Pedido Cartão criado (pendente):', cardOrder.orderNumber);
    console.log(
        '👉 Para pagar via cartão use a rota: POST /api/payments/' +
            cardOrder._id +
            '/card com { token, paymentMethodId, installments }'
    );

    console.log('\nResumo:');
    console.log({
        eventId: String(event._id),
        ticketTypes: {
            vip: String(vip._id),
            pista: String(pista._id),
            pistaPromo: String(pistaPromo._id),
        },
        promoterCode: promo.code,
        pixOrderId: String(pixOrder._id),
        cardOrderId: String(cardOrder._id),
    });
}

main()
    .then(() => {
        console.log('✅ Seed concluído');
        return mongoose.disconnect();
    })
    .catch(async (err) => {
        console.error('❌ Erro no seed:', err);
        try {
            await mongoose.disconnect();
        } catch {}
        process.exit(1);
    });
