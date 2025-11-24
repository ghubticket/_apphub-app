import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import Event from '../models/Event';
import TicketType from '../models/TicketType';
import User from '../models/User';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar qual banco está sendo usado
const mongoUri = process.env.MONGODB_URI || '';
if (!mongoUri) {
    console.error('❌ MONGODB_URI não encontrada!');
    console.error('   Configure no .env ou nas variáveis de ambiente');
    process.exit(1);
}

// Mostrar qual banco será usado (sem mostrar credenciais)
const uriDisplay = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log('🔍 Conectando ao banco:', uriDisplay);

/**
 * Script para popular o banco com dados de teste
 * 
 * Uso:
 * npm run populate-test-data
 * 
 * OU
 * 
 * npx ts-node src/scripts/populateTestData.ts
 */

async function populateTestData() {
    try {
        // Conectar ao banco
        await connectDatabase();
        console.log('✅ Conectado ao MongoDB');

        // Buscar ou criar usuário admin como organizador
        let organizer = await User.findOne({ email: 'admin@exemplo.com' });
        
        if (!organizer) {
            console.log('⚠️  Usuário admin não encontrado. Criando...');
            organizer = await User.create({
                name: 'Admin Teste',
                email: 'admin@exemplo.com',
                password: 'SenhaForte123!', // Será hasheado automaticamente
                role: 'ADMIN',
                isActive: true,
            });
            console.log('✅ Usuário admin criado');
        } else {
            console.log('✅ Usuário admin encontrado');
        }

        // Criar evento de teste
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 30); // 30 dias no futuro

        const event = await Event.create({
            name: 'Show 5521 - Teste',
            description: 'Evento de teste para validação do sistema. Este é um evento fictício criado para testar a funcionalidade de compra de ingressos.',
            date: eventDate,
            time: '20:00',
            location: 'Morro da Urca',
            address: 'Praça General Tibúrcio, s/n - Urca',
            city: 'Rio de Janeiro',
            state: 'RJ',
            price: 0, // Preço base (não usado mais, mas mantido por compatibilidade)
            capacity: 500,
            soldTickets: 0,
            platformFeePercentage: 5, // 5% de taxa da plataforma
            status: 'published',
            organizer: organizer._id,
            tags: ['show', 'música', 'teste'],
            isActive: true,
        });

        console.log('✅ Evento criado:', event.name);
        console.log('   ID:', event._id);

        // Criar tipos de ingresso básicos (sem desconto)
        
        // 1. Pista - Lote 1
        const ticketType1 = await TicketType.create({
            name: 'Pista',
            description: 'Ingresso para área de pista',
            event: event._id,
            price: 50.00,
            isVIP: false,
            lotNumber: 1,
            maxQuantity: 200,
            maxPerPurchase: 5,
            soldQuantity: 0,
            isActive: true,
        });
        console.log('✅ Tipo de ingresso criado: Pista - Lote 1 (R$ 50,00)');

        // 2. Pista - Lote 2 (mais caro)
        const ticketType2 = await TicketType.create({
            name: 'Pista',
            description: 'Ingresso para área de pista - Lote 2',
            event: event._id,
            price: 70.00,
            isVIP: false,
            lotNumber: 2,
            maxQuantity: 150,
            maxPerPurchase: 5,
            soldQuantity: 0,
            isActive: true,
        });
        console.log('✅ Tipo de ingresso criado: Pista - Lote 2 (R$ 70,00)');

        // 3. Camarote
        const ticketType3 = await TicketType.create({
            name: 'Camarote',
            description: 'Ingresso para área de camarote',
            event: event._id,
            price: 150.00,
            isVIP: false,
            lotNumber: 1,
            maxQuantity: 50,
            maxPerPurchase: 3,
            soldQuantity: 0,
            isActive: true,
        });
        console.log('✅ Tipo de ingresso criado: Camarote (R$ 150,00)');

        // 4. VIP (gratuito)
        const ticketType4 = await TicketType.create({
            name: 'VIP',
            description: 'Ingresso VIP cortesia',
            event: event._id,
            price: 0,
            isVIP: true,
            lotNumber: 1,
            maxQuantity: 100,
            maxPerPurchase: 2,
            soldQuantity: 0,
            isActive: true,
        });
        console.log('✅ Tipo de ingresso criado: VIP (Gratuito)');

        // Verificar se os tipos de ingresso foram criados corretamente
        console.log('\n🔍 Verificando tipos de ingresso criados...');
        const createdTicketTypes = await TicketType.find({
            event: event._id,
            deletedAt: null,
        }).lean();

        console.log(`✅ Total de tipos de ingresso encontrados: ${createdTicketTypes.length}`);
        createdTicketTypes.forEach((tt, idx) => {
            console.log(`   ${idx + 1}. ${tt.name} - Lote ${tt.lotNumber} - R$ ${tt.price.toFixed(2)} - Ativo: ${tt.isActive} - ID: ${tt._id}`);
        });

        if (createdTicketTypes.length === 0) {
            console.error('❌ ERRO: Nenhum tipo de ingresso foi encontrado!');
            console.error('   Verifique se os tipos de ingresso foram criados corretamente.');
        }

        console.log('\n🎉 Dados de teste criados com sucesso!');
        console.log('\n📋 Resumo:');
        console.log(`   Evento: ${event.name}`);
        console.log(`   Data: ${eventDate.toLocaleDateString('pt-BR')} às ${event.time}`);
        console.log(`   Local: ${event.location}, ${event.city} - ${event.state}`);
        console.log(`   Tipos de ingresso criados: ${createdTicketTypes.length}`);
        createdTicketTypes.forEach((tt) => {
            console.log(`   - ${tt.name} Lote ${tt.lotNumber}: R$ ${tt.price.toFixed(2)} (${tt.maxQuantity} disponíveis)`);
        });
        console.log(`\n   Evento ID: ${event._id}`);
        console.log(`   Organizador: ${organizer.email}`);
        console.log(`\n   Para testar, acesse: GET /api/events/${event._id}/ticket-types`);

    } catch (error: any) {
        console.error('❌ Erro ao popular dados de teste:', error);
        if (error.errors) {
            Object.keys(error.errors).forEach((key) => {
                console.error(`   ${key}: ${error.errors[key].message}`);
            });
        }
        process.exit(1);
    } finally {
        // Fechar conexão
        await mongoose.connection.close();
        console.log('\n🔌 Conexão encerrada');
        process.exit(0);
    }
}

// Executar
populateTestData();

