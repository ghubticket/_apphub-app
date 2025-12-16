/**
 * Script para marcar a primeira parcela (entrada) como paga
 * 
 * Uso: npx ts-node scripts/mark-first-parcel-as-paid.ts
 * 
 * Este script:
 * 1. Encontra todas as vendas parceladas com status 'pending_entry'
 * 2. Marca a primeira parcela (sequence === 0) de cada uma como paga
 * 3. Atualiza o status da venda parcelada para 'active'
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importar modelos
import ParcelledOrder from '../src/models/ParcelledOrder';
import Parcel from '../src/models/Parcel';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function markFirstParcelAsPaid() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        // Encontrar todas as vendas parceladas com entrada não paga
        const parcelledOrders = await ParcelledOrder.find({
            status: 'pending_entry',
        }).lean();

        console.log(`📦 Encontradas ${parcelledOrders.length} venda(s) parcelada(s) com entrada não paga\n`);

        if (parcelledOrders.length === 0) {
            console.log('✅ Nenhuma venda parcelada para processar');
            await mongoose.disconnect();
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        for (const order of parcelledOrders) {
            try {
                // Encontrar a primeira parcela (entrada - sequence === 0)
                const entryParcel = await Parcel.findOne({
                    parcelledOrder: order._id,
                    sequence: 0,
                });

                if (!entryParcel) {
                    console.log(`⚠️  Venda parcelada ${order._id} não tem parcela de entrada (sequence 0)`);
                    errorCount++;
                    continue;
                }

                // Verificar se já está paga
                if (entryParcel.status === 'paid') {
                    console.log(`⏭️  Venda parcelada ${order._id} já tem entrada paga`);
                    continue;
                }

                // Marcar entrada como paga
                entryParcel.status = 'paid';
                entryParcel.paidAt = new Date();
                await entryParcel.save();

                // Atualizar status da venda parcelada para 'active'
                await ParcelledOrder.updateOne(
                    { _id: order._id },
                    { status: 'active' }
                );

                console.log(`✅ Entrada da venda parcelada ${order._id} marcada como paga`);
                updatedCount++;
            } catch (error: any) {
                console.error(`❌ Erro ao processar venda parcelada ${order._id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Resumo:');
        console.log(`   ✅ Atualizadas: ${updatedCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);
        console.log(`   📦 Total: ${parcelledOrders.length}`);

        await mongoose.disconnect();
        console.log('\n✅ Script finalizado com sucesso!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Erro fatal:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Executar script
markFirstParcelAsPaid();
