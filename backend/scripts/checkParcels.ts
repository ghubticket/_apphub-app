/**
 * Script para verificar e diagnosticar parcelas de um pedido parcelado
 * 
 * Uso:
 * npx ts-node backend/scripts/checkParcels.ts [parcelledOrderId]
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { ParcelledOrder, Parcel } from '../src/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function checkParcels(parcelledOrderId?: string) {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        let parcelledOrder: any;

        if (!parcelledOrderId) {
            // Buscar qualquer pedido
            parcelledOrder = await ParcelledOrder.findOne({})
                .populate('event', 'name')
                .sort({ createdAt: -1 })
                .lean();

            if (!parcelledOrder) {
                throw new Error('Nenhum pedido parcelado encontrado');
            }

            parcelledOrderId = parcelledOrder._id.toString();
            console.log(`✅ Pedido encontrado automaticamente: ${(parcelledOrder.event as any)?.name || 'Sem nome'}`);
        } else {
            if (!mongoose.Types.ObjectId.isValid(parcelledOrderId)) {
                throw new Error('ID inválido');
            }

            parcelledOrder = await ParcelledOrder.findById(parcelledOrderId)
                .populate('event', 'name')
                .lean();

            if (!parcelledOrder) {
                throw new Error('Pedido não encontrado');
            }
        }

        console.log(`\n📦 Pedido: ${parcelledOrderId}`);
        console.log(`   Evento: ${(parcelledOrder.event as any)?.name || 'N/A'}`);
        console.log(`   Status: ${parcelledOrder.status}`);
        console.log(`   InstallmentsCount (esperado): ${parcelledOrder.installmentsCount}`);
        console.log(`   Total Amount: R$ ${parcelledOrder.totalAmount.toFixed(2)}`);
        console.log(`   Entry Amount: R$ ${parcelledOrder.entryAmount.toFixed(2)}\n`);

        // Buscar todas as parcelas
        const parcels = await Parcel.find({ 
            parcelledOrder: parcelledOrderId 
        }).sort({ sequence: 1 });

        console.log(`📊 Parcelas encontradas: ${parcels.length}`);
        console.log(`   Esperado: ${parcelledOrder.installmentsCount}`);
        console.log(`   Diferença: ${parcels.length - parcelledOrder.installmentsCount}\n`);

        if (parcels.length !== parcelledOrder.installmentsCount) {
            console.log('⚠️  ATENÇÃO: Número de parcelas não corresponde ao installmentsCount!\n');
        }

        console.log('📋 Detalhes das parcelas:\n');
        parcels.forEach((parcel, index) => {
            const label = parcel.sequence === 0 ? 'Entrada' : `Parcela ${parcel.sequence + 1}`;
            const statusIcon = parcel.status === 'paid' ? '✅' : parcel.status === 'overdue' ? '⚠️' : '⏳';
            const statusText = parcel.status === 'paid' 
                ? 'PAGA' 
                : parcel.status === 'overdue' 
                ? 'ATRASADA' 
                : parcel.status === 'payment_generated'
                ? 'PIX GERADO'
                : 'PENDENTE';
            
            console.log(`   ${index + 1}. ${statusIcon} ${label} (sequence ${parcel.sequence})`);
            console.log(`      Valor: R$ ${parcel.amount.toFixed(2)}`);
            console.log(`      Status: ${statusText}`);
            console.log(`      Vencimento: ${parcel.dueDate ? new Date(parcel.dueDate).toLocaleDateString('pt-BR') : 'N/A'}`);
            if (parcel.paidAt) {
                console.log(`      Paga em: ${new Date(parcel.paidAt).toLocaleString('pt-BR')}`);
            }
            console.log('');
        });

        // Verificar sequências esperadas
        const expectedSequences = Array.from({ length: parcelledOrder.installmentsCount }, (_, i) => i);
        const actualSequences = parcels.map(p => p.sequence).sort((a, b) => a - b);
        const missingSequences = expectedSequences.filter(seq => !actualSequences.includes(seq));
        const extraSequences = actualSequences.filter(seq => !expectedSequences.includes(seq));

        if (missingSequences.length > 0) {
            console.log(`❌ Sequências faltando: ${missingSequences.join(', ')}\n`);
        }

        if (extraSequences.length > 0) {
            console.log(`⚠️  Sequências extras: ${extraSequences.join(', ')}\n`);
        }

        if (missingSequences.length === 0 && extraSequences.length === 0) {
            console.log('✅ Todas as sequências estão corretas!\n');
        }

        // Contar parcelas pagas
        const paidCount = parcels.filter(p => p.status === 'paid').length;
        console.log(`💰 Resumo:`);
        console.log(`   Parcelas pagas: ${paidCount}/${parcels.length}`);
        console.log(`   Parcelas pendentes: ${parcels.length - paidCount}/${parcels.length}`);

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
checkParcels(parcelledOrderId);

