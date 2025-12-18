/**
 * Script para corrigir status 'completed' incorreto de pedidos parcelados
 * Verifica se todas as parcelas estão pagas e corrige o status se necessário
 * 
 * Uso:
 * npx ts-node backend/scripts/fixCompletedStatus.ts [parcelledOrderId]
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { ParcelledOrder, Parcel } from '../src/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function fixCompletedStatus(parcelledOrderId?: string) {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        let orders: any[];

        if (!parcelledOrderId) {
            // Buscar todos os pedidos com status 'completed'
            orders = await ParcelledOrder.find({ status: 'completed' })
                .populate('event', 'name')
                .lean();
            
            console.log(`🔍 Encontrados ${orders.length} pedido(s) com status 'completed'\n`);
        } else {
            if (!mongoose.Types.ObjectId.isValid(parcelledOrderId)) {
                throw new Error('ID inválido');
            }

            const order = await ParcelledOrder.findById(parcelledOrderId)
                .populate('event', 'name')
                .lean();

            if (!order) {
                throw new Error('Pedido não encontrado');
            }

            orders = [order];
        }

        let fixedCount = 0;
        let correctCount = 0;

        for (const order of orders) {
            const orderId = order._id.toString();
            
            // Buscar todas as parcelas
            const parcels = await Parcel.find({ 
                parcelledOrder: orderId 
            });

            const totalParcels = parcels.length;
            const paidParcels = parcels.filter(p => p.status === 'paid').length;
            const allPaid = paidParcels === totalParcels && totalParcels > 0;

            console.log(`📦 Pedido: ${orderId}`);
            console.log(`   Evento: ${(order.event as any)?.name || 'N/A'}`);
            console.log(`   Status atual: ${order.status}`);
            console.log(`   Parcelas pagas: ${paidParcels}/${totalParcels}`);
            console.log(`   Todas pagas? ${allPaid ? '✅ SIM' : '❌ NÃO'}`);

            // Se status é 'completed' mas nem todas as parcelas estão pagas, corrigir
            if (order.status === 'completed' && !allPaid) {
                console.log(`   ⚠️  Status incorreto! Corrigindo para 'active'...`);
                
                await ParcelledOrder.updateOne(
                    { _id: orderId },
                    { status: 'active' }
                );
                
                console.log(`   ✅ Status corrigido para 'active'\n`);
                fixedCount++;
            } else if (order.status === 'completed' && allPaid) {
                console.log(`   ✅ Status correto (todas as parcelas pagas)\n`);
                correctCount++;
            } else {
                console.log(`   ℹ️  Status não é 'completed', nada a fazer\n`);
            }
        }

        console.log('════════════════════════════════════════════════════════════');
        console.log('📊 Resumo:');
        console.log(`   ✅ Corrigidos: ${fixedCount}`);
        console.log(`   ✅ Já corretos: ${correctCount}`);
        console.log(`   📦 Total verificados: ${orders.length}`);
        console.log('════════════════════════════════════════════════════════════');

        await mongoose.disconnect();
        console.log('\n👋 Desconectado do MongoDB');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Erro:', error.message);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

const parcelledOrderId = process.argv[2] || undefined;
fixCompletedStatus(parcelledOrderId);

