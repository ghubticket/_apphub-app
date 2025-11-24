import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import Event from '../models/Event';
import TicketType from '../models/TicketType';

/**
 * Script para verificar se os dados de teste foram criados corretamente
 * 
 * Uso:
 * npm run verify-test-data
 * 
 * OU com MONGODB_URI específica:
 * MONGODB_URI="..." npm run verify-test-data
 */

// Permitir passar MONGODB_URI como variável de ambiente
const mongoUriFromEnv = process.env.MONGODB_URI;

if (!mongoUriFromEnv) {
    console.error('❌ MONGODB_URI não encontrada!');
    process.exit(1);
}

process.env.MONGODB_URI = mongoUriFromEnv;
dotenv.config();

const uriDisplay = mongoUriFromEnv.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
const dbName = mongoUriFromEnv.split('/').pop()?.split('?')[0] || 'desconhecido';
console.log('🔍 Verificando dados no banco:');
console.log('   URI:', uriDisplay);
console.log('   Database:', dbName);
console.log('');

async function verifyTestData() {
    try {
        await connectDatabase();
        console.log('✅ Conectado ao MongoDB\n');

        // Buscar evento de teste
        const event = await Event.findOne({
            name: 'Show 5521 - Teste',
            deletedAt: null,
        }).lean();

        if (!event) {
            console.log('❌ Evento de teste NÃO encontrado!');
            console.log('   Execute: npm run populate-test-data-dev');
            process.exit(1);
        }

        console.log('✅ Evento encontrado:');
        console.log(`   Nome: ${event.name}`);
        console.log(`   ID: ${event._id}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Ativo: ${event.isActive}`);
        console.log(`   Data: ${new Date(event.date).toLocaleDateString('pt-BR')}`);
        console.log('');

        // Buscar tipos de ingresso
        const ticketTypes = await TicketType.find({
            event: event._id,
            deletedAt: null,
        }).lean();

        console.log(`📋 Tipos de ingresso encontrados: ${ticketTypes.length}`);

        if (ticketTypes.length === 0) {
            console.log('❌ NENHUM tipo de ingresso encontrado!');
            console.log('   O evento existe, mas não tem tipos de ingresso.');
            console.log('   Execute o script novamente ou crie manualmente via API.');
            process.exit(1);
        }

        console.log('');
        ticketTypes.forEach((tt, idx) => {
            const available = (tt.maxQuantity || 0) - (tt.soldQuantity || 0);
            console.log(`   ${idx + 1}. ${tt.name} - Lote ${tt.lotNumber}`);
            console.log(`      Preço: R$ ${tt.price.toFixed(2)}`);
            console.log(`      Disponível: ${available} de ${tt.maxQuantity}`);
            console.log(`      Ativo: ${tt.isActive}`);
            console.log(`      ID: ${tt._id}`);
            console.log('');
        });

        console.log('✅ Todos os dados estão corretos!');
        console.log(`\n   Para testar via API:`);
        console.log(`   GET /api/events/${event._id}/ticket-types`);

    } catch (error: any) {
        console.error('❌ Erro ao verificar dados:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexão encerrada');
        process.exit(0);
    }
}

verifyTestData();

