/**
 * Script para pagar a PRÓXIMA parcela de um pedido parcelado (uma de cada vez)
 * 
 * Uso (da raiz do projeto):
 * npx ts-node backend/scripts/payNextParcel.ts [parcelledOrderId]
 * 
 * Uso (do diretório backend):
 * npx ts-node scripts/payNextParcel.ts [parcelledOrderId]
 * 
 * Exemplos:
 * # Com ID específico:
 * npx ts-node scripts/payNextParcel.ts 6942c08ffdf39be7c0950eb0
 * 
 * # Sem ID (pega qualquer pedido ativo):
 * npx ts-node scripts/payNextParcel.ts
 * 
 * Este script:
 * 1. Encontra o pedido parcelado (por ID ou automaticamente)
 * 2. Encontra a PRÓXIMA parcela não paga (em ordem de sequência)
 * 3. Marca apenas essa parcela como paga
 * 4. Atualiza status do pedido se necessário
 * 5. Permite testar o fluxo parcela por parcela
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { ParcelledOrder, Parcel } from '../src/models';
import { createOrderFromCompletedParcelledOrder } from '../src/services/parcelledOrderService';

// Usa a mesma URI do backend (via .env). Se não tiver, cai no "eventhub" local.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function payNextParcel(parcelledOrderId?: string) {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        let finalOrderId: string;
        let parcelledOrder: any;

        // Se não foi passado ID, buscar automaticamente
        if (!parcelledOrderId) {
            console.log('🔍 Nenhum ID informado. Buscando pedido parcelado ativo...\n');
            
            // Buscar primeiro pedido "ativo" (prioridade)
            parcelledOrder = await ParcelledOrder.findOne({
                status: { $in: ['active', 'pending_entry'] },
            })
            .populate('event', 'name')
            .sort({ createdAt: -1 }) // Mais recente primeiro
            .lean();

            // Se não encontrou, buscar qualquer um que ainda não foi concluído/cancelado
            if (!parcelledOrder) {
                console.log('⚠️  Nenhum pedido ativo encontrado. Buscando qualquer pedido disponível...\n');
                parcelledOrder = await ParcelledOrder.findOne({
                    status: { $nin: ['completed', 'cancelled'] },
                })
                .populate('event', 'name')
                .sort({ createdAt: -1 })
                .lean();
            }

            if (!parcelledOrder) {
                throw new Error('Nenhum pedido parcelado encontrado. Crie um pedido primeiro!');
            }

            finalOrderId = parcelledOrder._id.toString();
            console.log(`✅ Pedido encontrado automaticamente: ${(parcelledOrder.event as any)?.name || 'Sem nome'}`);
            console.log(`   ID: ${finalOrderId}`);
            console.log(`   Status atual: ${parcelledOrder.status}\n`);
        } else {
            // Validar ID se foi fornecido
            if (!mongoose.Types.ObjectId.isValid(parcelledOrderId)) {
                throw new Error('ID inválido. Use um ObjectId válido.');
            }

            // Buscar pedido parcelado pelo ID
            console.log(`🔍 Buscando pedido parcelado: ${parcelledOrderId}`);
            parcelledOrder = await ParcelledOrder.findById(parcelledOrderId)
                .populate('event', 'name')
                .lean();

            if (!parcelledOrder) {
                throw new Error('Pedido parcelado não encontrado');
            }

            finalOrderId = parcelledOrderId;
            console.log(`✅ Pedido encontrado: ${(parcelledOrder.event as any)?.name || 'Sem nome'}`);
            console.log(`   Status atual: ${parcelledOrder.status}\n`);
        }

        // Buscar todas as parcelas ordenadas por sequência
        const parcels = await Parcel.find({ 
            parcelledOrder: finalOrderId 
        }).sort({ sequence: 1 });

        if (parcels.length === 0) {
            throw new Error('Nenhuma parcela encontrada para este pedido');
        }

        console.log(`📦 Encontradas ${parcels.length} parcelas:\n`);
        
        // Mostrar status de todas as parcelas
        parcels.forEach((parcel) => {
            const statusIcon = parcel.status === 'paid' ? '✅' : parcel.status === 'overdue' ? '⚠️' : '⏳';
            const statusText = parcel.status === 'paid' 
                ? 'PAGA' 
                : parcel.status === 'overdue' 
                ? 'ATRASADA' 
                : parcel.status === 'payment_generated'
                ? 'PIX GERADO'
                : 'PENDENTE';
            
            const label = parcel.sequence === 0 ? 'Entrada' : `Parcela ${parcel.sequence}`;
            const paidAtStr = parcel.paidAt 
                ? new Date(parcel.paidAt).toLocaleString('pt-BR')
                : '';
            
            console.log(`   ${statusIcon} ${label}: R$ ${parcel.amount.toFixed(2)} - ${statusText}${paidAtStr ? ` (paga em: ${paidAtStr})` : ''}`);
        });

        // Encontrar a PRÓXIMA parcela não paga (em ordem de sequência)
        const nextParcel = parcels.find(p => p.status !== 'paid');

        if (!nextParcel) {
            console.log('\n🎉 Todas as parcelas já estão pagas!');
            
            // Verificar se precisa atualizar status para 'completed'
            if (parcelledOrder.status !== 'completed') {
                console.log('\n🔄 Atualizando status do pedido para "completed"...');
                await ParcelledOrder.updateOne(
                    { _id: finalOrderId },
                    { status: 'completed' }
                );
                console.log('✅ Status atualizado para: completed');

                // Gerar ingressos se necessário - buscar pedido completo antes de passar
                try {
                    console.log('\n🎟️  Gerando ingressos...');
                    // Buscar pedido completo com todos os campos necessários
                    const completedOrder = await ParcelledOrder.findById(finalOrderId)
                        .populate('event', 'name')
                        .populate('ticketType', 'name')
                        .lean();
                    
                    if (!completedOrder) {
                        throw new Error('Pedido parcelado não encontrado após atualização');
                    }
                    
                    await createOrderFromCompletedParcelledOrder(completedOrder as any);
                    console.log('✅ Ingressos gerados com sucesso!');
                } catch (error: any) {
                    console.log(`⚠️  Aviso ao gerar ingressos: ${error.message}`);
                }
            }
            
            await mongoose.disconnect();
            console.log('\n👋 Desconectado do MongoDB');
            process.exit(0);
        }

        const parcelLabel = nextParcel.sequence === 0 ? 'Entrada' : `Parcela ${nextParcel.sequence}`;
        
        console.log(`\n💳 Próxima parcela a pagar: ${parcelLabel}`);
        console.log(`   Parcela ID: ${nextParcel._id}`);
        console.log(`   Valor: R$ ${nextParcel.amount.toFixed(2)}`);
        console.log(`   Status atual: ${nextParcel.status}`);
        console.log(`   Vencimento: ${nextParcel.dueDate ? new Date(nextParcel.dueDate).toLocaleDateString('pt-BR') : 'Não informado'}\n`);

        // Marcar parcela como paga
        console.log(`💳 Pagando ${parcelLabel}...`);
        nextParcel.status = 'paid';
        nextParcel.paidAt = new Date();
        await nextParcel.save();
        console.log(`✅ ${parcelLabel} paga com sucesso!`);

        // Se era pending_entry e pagou a entrada, mudar para active
        if (parcelledOrder.status === 'pending_entry' && nextParcel.sequence === 0) {
            console.log('\n🔄 Atualizando status do pedido de "pending_entry" para "active"...');
            await ParcelledOrder.updateOne(
                { _id: finalOrderId },
                { status: 'active' }
            );
            console.log('✅ Status atualizado para: active');
        }
        // Verificar se TODAS as parcelas estão pagas (buscar do banco novamente para garantir)
        else {
            // Buscar TODAS as parcelas novamente do banco para verificar status real
            const allParcels = await Parcel.find({ 
                parcelledOrder: finalOrderId 
            });
            
            const totalParcels = allParcels.length;
            const paidParcels = allParcels.filter(p => p.status === 'paid').length;
            const allPaid = paidParcels === totalParcels && totalParcels > 0;
            
            console.log(`\n📊 Verificando status: ${paidParcels}/${totalParcels} parcelas pagas`);
            
            // Só atualizar para completed se TODAS as parcelas estiverem realmente pagas
            if (allPaid) {
                console.log('\n🎉 Todas as parcelas pagas! Atualizando status do pedido...');
                await ParcelledOrder.updateOne(
                    { _id: finalOrderId },
                    { status: 'completed' }
                );
                console.log('✅ Status do pedido atualizado para: completed');

                // Gerar ingressos - buscar pedido completo antes de passar
                try {
                    console.log('\n🎟️  Gerando ingressos...');
                    // Buscar pedido completo com todos os campos necessários
                    const completedOrder = await ParcelledOrder.findById(finalOrderId)
                        .populate('event', 'name')
                        .populate('ticketType', 'name')
                        .lean();
                    
                    if (!completedOrder) {
                        throw new Error('Pedido parcelado não encontrado após atualização');
                    }
                    
                    await createOrderFromCompletedParcelledOrder(completedOrder as any);
                    console.log('✅ Ingressos gerados com sucesso!');
                } catch (error: any) {
                    console.log(`⚠️  Aviso ao gerar ingressos: ${error.message}`);
                }
            } else {
                console.log(`\n⏳ Ainda faltam ${totalParcels - paidParcels} parcela(s) para pagar.`);
            }
        }

        // Buscar status atualizado do pedido e parcelas para resumo preciso
        const updatedOrder = await ParcelledOrder.findById(finalOrderId).lean();
        const allParcelsForSummary = await Parcel.find({ 
            parcelledOrder: finalOrderId 
        }).sort({ sequence: 1 });
        
        const totalParcelsSummary = allParcelsForSummary.length;
        const paidCountSummary = allParcelsForSummary.filter(p => p.status === 'paid').length;
        const nextUnpaidParcel = allParcelsForSummary.find(p => p.status !== 'paid');
        
        console.log('\n════════════════════════════════════════════════════════════');
        console.log('📊 Resumo:');
        console.log(`   Pedido ID: ${finalOrderId}`);
        console.log(`   Status: ${updatedOrder?.status || parcelledOrder.status}`);
        console.log(`   Parcelas pagas: ${paidCountSummary}/${totalParcelsSummary}`);
        console.log(`   Próxima parcela: ${nextUnpaidParcel ? `Parcela ${nextUnpaidParcel.sequence + 1}/${totalParcelsSummary}` : 'Todas pagas!'}`);
        console.log('════════════════════════════════════════════════════════════');

        console.log('\n💡 Dica: Execute o script novamente para pagar a próxima parcela!');
        console.log(`   npx ts-node scripts/payNextParcel.ts ${finalOrderId}\n`);

        await mongoose.disconnect();
        console.log('👋 Desconectado do MongoDB');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Erro:', error.message);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Pegar ID da linha de comando (opcional)
const parcelledOrderId = process.argv[2] || undefined;

// Executar
payNextParcel(parcelledOrderId)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });

