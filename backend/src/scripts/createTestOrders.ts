/**
 * Script para criar pedidos de teste com QR codes
 * 
 * Este script cria:
 * - 1 evento de teste (se não existir)
 * - 1 tipo de ingresso VIP
 * - 1 tipo de ingresso normal
 * - Vários pedidos com ingressos
 * - Gera QR codes automaticamente
 * 
 * Execute: npm run create-test-orders
 * ou: npx ts-node src/scripts/createTestOrders.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Event, TicketType, Order, Ticket, User } from '../models';
import { generateQRCode } from '../services/qrCodeService';

dotenv.config();

const createTestOrders = async () => {
    try {
        // Conectar ao MongoDB
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        // 1. Buscar ou criar evento de teste
        console.log('📅 Criando/buscando evento de teste...');
        let event = await Event.findOne({ 
            name: 'Show de Teste - QR Codes',
            deletedAt: null 
        });

        if (!event) {
            // Buscar um admin para ser organizador
            const admin = await User.findOne({ role: 'ADMIN', deletedAt: null });
            if (!admin) {
                throw new Error('Nenhum ADMIN encontrado. Execute o script de criação de usuários primeiro.');
            }

            const eventDate = new Date();
            eventDate.setDate(eventDate.getDate() + 30); // Evento em 30 dias

            event = new Event({
                name: 'Show de Teste - QR Codes',
                description: 'Evento de teste para validar QR codes e pedidos. Este é um evento fictício criado pelo script de teste.',
                date: eventDate,
                time: '20:00',
                location: 'Arena de Teste',
                address: 'Rua Teste, 123',
                city: 'São Paulo',
                state: 'SP',
                price: 0,
                capacity: 1000,
                soldTickets: 0,
                ticketFee: 5.00, // Taxa de R$ 5,00 por ingresso
                status: 'published',
                organizer: admin._id,
                isActive: true,
                tags: ['teste', 'qr-code']
            });

            await event.save();
            console.log(`✅ Evento criado: ${event.name} (ID: ${event._id})`);
        } else {
            console.log(`✅ Evento encontrado: ${event.name} (ID: ${event._id})`);
        }

        // 2. Buscar ou criar tipos de ingresso
        console.log('\n🎫 Criando/buscando tipos de ingressos...');
        
        // Tipo VIP
        let ticketTypeVIP = await TicketType.findOne({
            event: event._id,
            name: 'VIP - Teste',
            deletedAt: null
        });

        if (!ticketTypeVIP) {
            ticketTypeVIP = new TicketType({
                name: 'VIP - Teste',
                description: 'Ingresso VIP de teste (grátis)',
                event: event._id,
                price: 0,
                isVIP: true,
                lotNumber: 1,
                maxQuantity: 100,
                maxPerPurchase: 5,
                soldQuantity: 0,
                isActive: true
            });
            await ticketTypeVIP.save();
            console.log(`✅ Tipo VIP criado: ${ticketTypeVIP.name}`);
        } else {
            console.log(`✅ Tipo VIP encontrado: ${ticketTypeVIP.name}`);
        }

        // Tipo Normal
        let ticketTypeNormal = await TicketType.findOne({
            event: event._id,
            name: 'Pista - Teste',
            deletedAt: null
        });

        if (!ticketTypeNormal) {
            ticketTypeNormal = new TicketType({
                name: 'Pista - Teste',
                description: 'Ingresso normal de teste (R$ 50,00)',
                event: event._id,
                price: 50.00,
                isVIP: false,
                lotNumber: 1,
                maxQuantity: 200,
                maxPerPurchase: 10,
                soldQuantity: 0,
                isActive: true
            });
            await ticketTypeNormal.save();
            console.log(`✅ Tipo Normal criado: ${ticketTypeNormal.name}`);
        } else {
            console.log(`✅ Tipo Normal encontrado: ${ticketTypeNormal.name}`);
        }

        // 3. Buscar usuários clientes
        console.log('\n👤 Buscando usuários clientes...');
        const clients = await User.find({ 
            role: 'CLIENTE', 
            deletedAt: null,
            isActive: true 
        }).limit(5);

        if (clients.length === 0) {
            throw new Error('Nenhum usuário CLIENTE encontrado. Execute o script de criação de usuários primeiro.');
        }

        console.log(`✅ Encontrados ${clients.length} clientes`);

        // 4. Criar pedidos de teste
        console.log('\n🛒 Criando pedidos de teste...\n');

        const ordersCreated = [];
        
        for (let i = 0; i < Math.min(5, clients.length); i++) {
            const client = clients[i];
            const quantity = i + 1; // 1, 2, 3, 4, 5 ingressos
            const useVIP = i % 2 === 0; // Alterna entre VIP e normal
            const ticketType = useVIP ? ticketTypeVIP : ticketTypeNormal;

            // Determinar status e método de pagamento
            const isVIP = ticketType.isVIP;
            const ticketPrice = isVIP ? 0 : ticketType.price;
            const eventTicketFee = event.ticketFee || 0;
            const totalAmount = (ticketPrice * quantity) + (eventTicketFee * quantity);
            
            const orderStatus = isVIP ? 'paid' : 'pending';
            const paymentMethod = isVIP ? 'vip_free' : undefined;
            const ticketStatus = isVIP ? 'confirmed' : 'pending';

            // Criar pedido
            // O orderNumber será gerado automaticamente pelo pre-save hook
            // Gerar um orderNumber temporário válido (será substituído pelo hook se necessário)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let tempOrderNumber = '';
            for (let k = 0; k < 10; k++) {
                tempOrderNumber += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const order = new Order({
                customer: client._id,
                event: event._id,
                tickets: [],
                totalAmount: totalAmount,
                totalTickets: quantity,
                status: orderStatus,
                paymentMethod: paymentMethod,
                paidAt: isVIP ? new Date() : undefined,
                customerData: {
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    cpf: client.cpf
                },
                isActive: true,
                orderNumber: tempOrderNumber // Placeholder temporário válido, será substituído pelo hook se já existir
            });

            // Salvar - o pre-save hook verificará se o orderNumber já existe e gerará um novo se necessário
            await order.save();

            // Criar tickets e gerar QR codes
            const createdTickets = [];
            for (let j = 0; j < quantity; j++) {
                // Gerar um código temporário válido (12 caracteres)
                // O pre-save hook verificará se já existe e gerará um novo se necessário
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let tempCode = '';
                for (let k = 0; k < 12; k++) {
                    tempCode += chars.charAt(Math.floor(Math.random() * chars.length));
                }

                // Gerar QR code temporário com o código temporário
                const tempQRCode = await generateQRCode(tempCode);

                const ticket = new Ticket({
                    event: event._id,
                    ticketType: ticketType._id,
                    order: order._id,
                    holder: client._id,
                    price: ticketPrice,
                    status: ticketStatus,
                    code: tempCode, // Código temporário válido, será substituído pelo hook se já existir
                    qrCode: tempQRCode, // QR code temporário, será atualizado após o hook gerar o código real
                    isActive: true
                });

                // Salvar - o pre-save hook verificará se o código já existe e gerará um novo se necessário
                await ticket.save();

                // Se o hook gerou um novo código, atualizar o QR code com o código real
                if (ticket.code !== tempCode) {
                    const realQRCode = await generateQRCode(ticket.code);
                    ticket.qrCode = realQRCode;
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

            // Popular dados para exibição
            const populatedOrder = await Order.findById(order._id)
                .populate('tickets', 'code status price')
                .populate('customer', 'name email')
                .lean();

            ordersCreated.push({
                order,
                tickets: createdTickets,
                populatedOrder
            });

            console.log(`📦 Pedido #${i + 1}:`);
            console.log(`   Cliente: ${client.name} (${client.email})`);
            console.log(`   Tipo: ${ticketType.name} ${isVIP ? '(VIP)' : ''}`);
            console.log(`   Quantidade: ${quantity} ingresso(s)`);
            console.log(`   Valor Total: R$ ${totalAmount.toFixed(2)}`);
            console.log(`   Status: ${orderStatus.toUpperCase()} ${isVIP ? '✅ (VIP - Gerado automaticamente)' : '⏳ (Aguardando pagamento)'}`);
            console.log(`   QR Codes gerados:`);
            createdTickets.forEach((ticket, idx) => {
                console.log(`      ${idx + 1}. Código: ${ticket.code} | Status: ${ticket.status}`);
            });
            console.log('');
        }

        // 5. Estatísticas finais
        console.log('\n📊 Estatísticas:');
        console.log(`   ✅ Pedidos criados: ${ordersCreated.length}`);
        const totalTickets = ordersCreated.reduce((sum, o) => sum + o.tickets.length, 0);
        console.log(`   ✅ Tickets criados: ${totalTickets}`);
        const vipTickets = ordersCreated
            .filter(o => o.order.paymentMethod === 'vip_free')
            .reduce((sum, o) => sum + o.tickets.length, 0);
        console.log(`   ✅ Tickets VIP: ${vipTickets}`);
        console.log(`   ✅ Tickets Normais: ${totalTickets - vipTickets}`);

        // Atualizar estatísticas do evento
        event.soldTickets = totalTickets;
        await event.save();

        console.log('\n🎉 Script executado com sucesso!');
        console.log('\n💡 Dicas para testar:');
        console.log('   1. Busque um pedido: GET /api/orders/:id');
        console.log('   2. Liste seus ingressos: GET /api/tickets/my');
        console.log('   3. Busque por código: GET /api/tickets/code/:code');
        console.log('   4. Valide um ingresso: POST /api/tickets/code/:code/validate (role QRCODE)');
        console.log('\n📋 Exemplo de códigos gerados:');
        if (ordersCreated.length > 0 && ordersCreated[0].tickets.length > 0) {
            console.log(`   Código de exemplo: ${ordersCreated[0].tickets[0].code}`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Erro ao criar pedidos de teste:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Executar
createTestOrders();
