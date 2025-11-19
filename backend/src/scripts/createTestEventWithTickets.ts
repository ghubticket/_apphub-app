import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Event from '../models/Event';
import TicketType from '../models/TicketType';
import User from '../models/User';
import bcrypt from 'bcryptjs';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/apphub';

async function createTestEventWithTickets() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');

        // Limpar eventos e tipos de ingressos existentes
        await Event.deleteMany({});
        await TicketType.deleteMany({});
        console.log('🗑️  Banco limpo');

        // Criar ou buscar usuário organizador
        let organizer = await User.findOne({ email: 'organizador@test.com' });
        if (!organizer) {
            const hashedPassword = await bcrypt.hash('senha123', 10);
            organizer = await User.create({
                name: 'Organizador Teste',
                email: 'organizador@test.com',
                password: hashedPassword,
                role: 'ADMIN',
                cpf: '000.000.000-00',
                phone: '(81) 99999-9999',
                isActive: true,
            });
            console.log(`✅ Organizador criado: ${organizer.email}`);
        } else {
            console.log(`✅ Organizador encontrado: ${organizer.email}`);
        }

        // Criar evento de teste
        const event = await Event.create({
            name: 'Festa de Ano Novo 2026',
            description: 'Celebre a virada do ano com muita música e diversão!',
            date: new Date('2025-12-31T22:00:00.000Z'),
            time: '22:00',
            location: 'Beach Club Carneiros',
            address: 'Praia dos Carneiros, s/n',
            city: 'Tamandaré',
            state: 'PE',
            zipCode: '55578-000',
            price: 0, // Evento gratuito (preço nos ingressos)
            capacity: 500,
            category: 'Festa',
            isActive: true,
            organizer: organizer._id,
        });

        console.log(`✅ Evento criado: ${event.name} (ID: ${event._id})`);

        // 1. Ingresso Normal com Taxa de Plataforma
        const normalTicket = await TicketType.create({
            name: 'Ingresso Normal',
            description: 'Ingresso padrão com taxa de plataforma de 5%',
            event: event._id,
            price: 100, // R$ 100,00
            platformFeePercentage: 5, // 5% de taxa → total R$ 105,00
            isVIP: false,
            lotNumber: 1,
            maxQuantity: 200,
            maxPerPurchase: 10,
            maxPerCPF: null,
            maxPerEmail: null,
            soldQuantity: 0,
            salesStart: new Date('2025-11-01T00:00:00.000Z'),
            salesEnd: new Date('2025-12-31T23:59:59.000Z'),
            isActive: true,
        });

        console.log(`✅ Ingresso Normal criado: ${normalTicket.name} (ID: ${normalTicket._id})`);
        console.log(
            `   Preço: R$ ${normalTicket.price},00 + 5% taxa = R$ ${(normalTicket.price * 1.05).toFixed(2)}`
        );

        // 2. Ingresso VIP (gratuito - apenas para convidados)
        const vipTicket = await TicketType.create({
            name: 'Ingresso VIP',
            description: 'Acesso VIP com área exclusiva e open bar - Cortesia',
            event: event._id,
            price: 0, // VIP deve ser gratuito
            platformFeePercentage: 0,
            isVIP: true,
            lotNumber: 1,
            maxQuantity: 50,
            maxPerPurchase: 2,
            maxPerCPF: 2,
            maxPerEmail: null,
            soldQuantity: 0,
            salesStart: new Date('2025-11-01T00:00:00.000Z'),
            salesEnd: new Date('2025-12-31T23:59:59.000Z'),
            isActive: true,
        });

        console.log(`✅ Ingresso VIP criado: ${vipTicket.name} (ID: ${vipTicket._id})`);
        console.log(`   Preço: Gratuito (cortesia)`);

        // 3. Ingresso Promocional com Desconto
        const promoTicket = await TicketType.create({
            name: 'Ingresso Promocional',
            description: 'Ingresso com desconto de 20% - Promoção limitada!',
            event: event._id,
            price: 80, // R$ 80,00 (20% de desconto do normal)
            platformFeePercentage: 3, // 3% de taxa → total R$ 82,40
            discountPercentage: 20, // 20% de desconto
            isVIP: false,
            lotNumber: 1,
            maxQuantity: 100,
            maxPerPurchase: 5,
            maxPerCPF: 3,
            maxPerEmail: null,
            soldQuantity: 0,
            salesStart: new Date('2025-11-01T00:00:00.000Z'),
            salesEnd: new Date('2025-12-15T23:59:59.000Z'), // Promoção termina antes
            isActive: true,
        });

        console.log(`✅ Ingresso Promocional criado: ${promoTicket.name} (ID: ${promoTicket._id})`);
        console.log(
            `   Preço: R$ ${promoTicket.price},00 + 3% taxa = R$ ${(promoTicket.price * 1.03).toFixed(2)}`
        );
        console.log(`   Desconto: 20%`);

        console.log('\n📊 Resumo:');
        console.log(`Evento: ${event.name}`);
        console.log(`Data: ${event.date.toLocaleDateString('pt-BR')}`);
        console.log(`Local: ${event.location}`);
        console.log(`\nIngressos criados:`);
        console.log(`1. Normal: R$ 100,00 + 5% taxa = R$ 105,00 (200 disponíveis)`);
        console.log(`2. VIP: Gratuito - Cortesia (50 disponíveis, max 2 por CPF)`);
        console.log(
            `3. Promocional: R$ 80,00 + 3% taxa = R$ 82,40 com 20% desconto (100 disponíveis, max 3 por CPF)`
        );
        console.log(`\n✅ Banco de dados populado com sucesso!`);
    } catch (error) {
        console.error('❌ Erro ao criar evento e ingressos:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado do MongoDB');
    }
}

createTestEventWithTickets();
