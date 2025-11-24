import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event';
import TicketType from '../models/TicketType';
import User from '../models/User';

/**
 * Script para popular o banco LOCAL (MongoDB localhost)
 * 
 * IMPORTANTE: Este script usa o banco LOCAL (mongodb://localhost:27017)
 * 
 * Para usar:
 * npm run populate-test-data-local
 * 
 * OU configure MONGODB_URI no .env apontando para localhost:
 * MONGODB_URI="mongodb://localhost:27017/eventhub"
 */

// IMPORTANTE: Forçar uso do banco LOCAL, ignorando qualquer configuração do .env
// Sempre usar localhost:27017 para garantir que é o banco local
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/eventhub';

// Sobrescrever MONGODB_URI para garantir que é local (ignora .env)
process.env.MONGODB_URI = LOCAL_MONGODB_URI;

// Carregar outras variáveis de ambiente (mas MONGODB_URI já foi sobrescrito)
dotenv.config();

// Garantir novamente que está usando LOCAL (caso dotenv tenha sobrescrito)
process.env.MONGODB_URI = LOCAL_MONGODB_URI;

const dbName = LOCAL_MONGODB_URI.split('/').pop()?.split('?')[0] || 'eventhub';
console.log('🔍 Conectando ao banco LOCAL (FORÇADO):');
console.log('   URI: mongodb://localhost:27017/' + dbName);
console.log('   Database:', dbName);
console.log('   ⚠️  IGNORANDO MONGODB_URI do .env para garantir uso do banco LOCAL');
console.log('');

async function populateLocalDatabase() {
    try {
        // Conectar ao MongoDB LOCAL
        await mongoose.connect(LOCAL_MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ Conectado ao MongoDB LOCAL\n');

        // Verificar se usuário admin existe
        const adminUser = await User.findOne({ email: 'admin@exemplo.com' });
        if (!adminUser) {
            console.error('❌ Usuário admin não encontrado!');
            console.error('   Execute primeiro: npm run create-dashboard-user');
            await mongoose.disconnect();
            process.exit(1);
        }
        console.log('✅ Usuário admin encontrado');

        // Criar nome único para o evento (com timestamp para facilitar identificação)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const eventName = `[TESTE LOCAL] Show Performance Test - ${timestamp}`;
        
        // Verificar se evento de teste já existe (buscar por padrão)
        const existingEvent = await Event.findOne({ 
            name: { $regex: /\[TESTE LOCAL\]/ } 
        });
        if (existingEvent) {
            console.log('⚠️  Evento de teste LOCAL já existe!');
            console.log('   Nome:', existingEvent.name);
            console.log('   ID:', existingEvent._id);
            console.log('   Removendo evento antigo...');
            await Event.deleteOne({ _id: existingEvent._id });
            await TicketType.deleteMany({ event: existingEvent._id });
            console.log('✅ Evento antigo removido');
        }

        // Criar evento de teste
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 30); // 30 dias no futuro

        const event = new Event({
            name: eventName,
            description: '🎯 EVENTO DE TESTE LOCAL - Criado automaticamente para testes de performance. Este evento pode ser removido a qualquer momento.',
            date: eventDate,
            time: '20:00',
            location: 'Morro da Urca',
            address: 'Praça General Tibúrcio, s/n - Urca',
            city: 'Rio de Janeiro',
            state: 'RJ',
            price: 0, // Preço base do evento (os tipos de ingresso têm preços específicos)
            capacity: 500, // Capacidade total do evento
            soldTickets: 0,
            platformFeePercentage: 5,
            status: 'published',
            organizer: adminUser._id,
            tags: ['show', 'música', 'teste'],
            isActive: true,
        });

        await event.save();
        console.log('✅ Evento criado:', event.name);
        console.log('   ID:', event._id);

        // Criar tipos de ingresso com nomes únicos
        const ticketTypesData = [
            {
                name: '[TESTE] Pista - Lote 1',
                description: 'Ingresso de teste para área de pista - Lote 1',
                price: 50.00,
                isVIP: false,
                lotNumber: 1,
                maxQuantity: 200,
                maxPerPurchase: 5,
                soldQuantity: 0,
                event: event._id,
                salesStart: new Date('2024-01-01'),
                salesEnd: new Date('2025-12-23'),
                isActive: true,
            },
            {
                name: '[TESTE] Pista - Lote 2',
                description: 'Ingresso de teste para área de pista - Lote 2',
                price: 70.00,
                isVIP: false,
                lotNumber: 2,
                maxQuantity: 150,
                maxPerPurchase: 5,
                soldQuantity: 0,
                event: event._id,
                salesStart: new Date('2024-01-01'),
                salesEnd: new Date('2025-12-23'),
                isActive: true,
            },
            {
                name: '[TESTE] Camarote VIP',
                description: 'Ingresso de teste para camarote',
                price: 150.00,
                isVIP: false,
                lotNumber: 1,
                maxQuantity: 50,
                maxPerPurchase: 3,
                soldQuantity: 0,
                event: event._id,
                salesStart: new Date('2024-01-01'),
                salesEnd: new Date('2025-12-23'),
                isActive: true,
            },
            {
                name: '[TESTE] VIP Gratuito',
                description: 'Ingresso VIP de teste - gratuito',
                price: 0.00,
                isVIP: true,
                lotNumber: 1,
                maxQuantity: 100,
                maxPerPurchase: 2,
                soldQuantity: 0,
                event: event._id,
                salesStart: new Date('2024-01-01'),
                salesEnd: new Date('2025-12-23'),
                isActive: true,
            },
        ];

        for (const ticketTypeData of ticketTypesData) {
            const ticketType = new TicketType(ticketTypeData);
            await ticketType.save();
            console.log(`✅ Tipo de ingresso criado: ${ticketType.name} (R$ ${ticketType.price.toFixed(2)})`);
        }

        // Verificar tipos de ingresso criados
        const ticketTypes = await TicketType.find({ event: event._id });
        console.log('\n🔍 Verificando tipos de ingresso criados...');
        console.log(`✅ Total de tipos de ingresso encontrados: ${ticketTypes.length}`);
        ticketTypes.forEach((tt, index) => {
            console.log(
                `   ${index + 1}. ${tt.name} - R$ ${tt.price.toFixed(2)} - Ativo: ${tt.isActive} - ID: ${tt._id}`
            );
        });

        console.log('\n🎉 Dados de teste criados com sucesso no banco LOCAL!');
        console.log('\n📋 Resumo:');
        console.log('   Evento:', event.name);
        console.log('   Data:', event.date.toLocaleDateString('pt-BR'));
        console.log('   Local:', event.location);
        console.log('   Tipos de ingresso criados:', ticketTypes.length);
        ticketTypes.forEach((tt) => {
            const maxQuantity = (tt as any).maxQuantity || 0;
            const soldQuantity = (tt as any).soldQuantity || 0;
            const available = maxQuantity - soldQuantity;
            console.log(`   - ${tt.name} (Lote ${(tt as any).lotNumber}): R$ ${tt.price.toFixed(2)} (${available} disponíveis de ${maxQuantity})`);
        });
        console.log('\n   Evento ID:', event._id);
        console.log('   Organizador: admin@exemplo.com');
        console.log('   Database: LOCAL (localhost:27017)');
        console.log('\n   Para testar, acesse: GET /api/events/' + event._id + '/ticket-types');

        await mongoose.disconnect();
        console.log('\n🔌 Conexão encerrada');
    } catch (error: any) {
        console.error('❌ Erro ao popular banco LOCAL:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

populateLocalDatabase();

