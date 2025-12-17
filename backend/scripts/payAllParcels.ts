/**
 * Script para pagar todas as parcelas de um pedido parcelado
 * 
 * Uso (da raiz do projeto):
 * npx ts-node backend/scripts/payAllParcels.ts [parcelledOrderId]
 * 
 * Uso (do diretório backend):
 * npx ts-node scripts/payAllParcels.ts [parcelledOrderId]
 * 
 * Exemplos:
 * # Com ID específico:
 * npx ts-node scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0
 * 
 * # Sem ID (pega qualquer pedido ativo):
 * npx ts-node scripts/payAllParcels.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { ParcelledOrder, Parcel } from '../src/models';
import { createOrderFromCompletedParcelledOrder } from '../src/services/parcelledOrderService';

// Usa a mesma URI do backend (via .env). Se não tiver, cai no "eventhub" local.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function payAllParcels(parcelledOrderId?: string) {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        console.log(`URI: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        let finalOrderId: string;
        let parcelledOrder: any;

        // Se não foi passado ID, buscar automaticamente
        if (!parcelledOrderId) {
            console.log('🔍 Nenhum ID informado. Buscando pedido parcelado ativo...\n');
            
            // Buscar primeiro pedido "ativo" (prioridade)
            parcelledOrder = await ParcelledOrder.findOne({
                status: { $in: ['active', 'pending', 'pending_entry'] },
            })
            .populate('event', 'name')
            .sort({ createdAt: -1 }) // Mais recente primeiro
            .lean();

            // Se não encontrou, buscar qualquer um que ainda não foi concluído/cancelado
            if (!parcelledOrder) {
                console.log('⚠️ Nenhum pedido ativo encontrado. Buscando qualquer pedido disponível...\n');
                parcelledOrder = await ParcelledOrder.findOne({
                    status: { $nin: ['completed', 'cancelled'] },
                })
                .populate('event', 'name')
                .sort({ createdAt: -1 })
                .lean();
            }

            if (!parcelledOrder) {
                throw new Error('Nenhum pedido parcelado encontrado no banco de dados.');
            }

            finalOrderId = parcelledOrder._id.toString();
            console.log('✅ Pedido encontrado automaticamente:');
            console.log(`   ID: ${finalOrderId}`);
            console.log(`   Evento: ${(parcelledOrder.event as any)?.name || 'Sem nome'}`);
            console.log(`   Status: ${parcelledOrder.status}`);
            console.log(`   Total de parcelas: ${parcelledOrder.installmentsCount}\n`);
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
            console.log(`   Status atual: ${parcelledOrder.status}`);
            console.log(`   Total de parcelas: ${parcelledOrder.installmentsCount}\n`);
        }

        // Buscar todas as parcelas
        const parcels = await Parcel.find({ parcelledOrder: finalOrderId }).sort({ sequence: 1 });

        console.log(`📦 Encontradas ${parcels.length} parcelas:\n`);
        
        // Pagar todas as parcelas
        let paidCount = 0;
        for (const parcel of parcels) {
            if (parcel.status === 'paid') {
                console.log(`   ✅ Parcela ${parcel.sequence} já está paga - pulando`);
                paidCount++;
                continue;
            }

            console.log(`   💳 Pagando parcela ${parcel.sequence} (R$ ${parcel.amount})...`);
            
            // Atualizar status para pago
            parcel.status = 'paid';
            parcel.paidAt = new Date();
            await parcel.save();
            
            paidCount++;
            console.log(`   ✅ Parcela ${parcel.sequence} paga com sucesso!`);
        }

        console.log(`\n✅ Total de parcelas pagas: ${paidCount}/${parcels.length}\n`);

        // Verificar se todas foram pagas
        if (paidCount === parcels.length) {
            console.log('🎉 Todas as parcelas pagas! Atualizando status do pedido...\n');

            // Buscar o pedido parcelado atualizado
            const parcelledOrderDoc = await ParcelledOrder.findById(finalOrderId);
            
            if (!parcelledOrderDoc) {
                throw new Error('Pedido parcelado não encontrado após pagamento das parcelas');
            }

            // Atualizar status do pedido para completed
            parcelledOrderDoc.status = 'completed';
            await parcelledOrderDoc.save();

            console.log('✅ Status do pedido atualizado para: completed\n');

            // CRÍTICO: Usar a mesma função que é usada em produção!
            // Isso garante que Order e tickets sejam criados/atualizados corretamente
            console.log('🎟️ Criando Order e tickets (usando lógica de produção)...\n');
            
            try {
                const order = await createOrderFromCompletedParcelledOrder(parcelledOrderDoc as any);
                
                // Buscar tickets criados para contar
                const { Ticket } = require('../src/models');
                const ticketsList = await Ticket.find({
                    order: order._id,
                    deletedAt: null,
                });

                const ticketsCount = ticketsList.length;
                console.log(`✅ Order vinculado: ${order._id}`);
                console.log(`✅ Status: ${order.status}`);
                console.log(`✅ Tickets criados: ${ticketsCount}`);
                
                if (ticketsCount > 0) {
                    console.log(`\n🎫 Tickets gerados:`);
                    for (const ticket of ticketsList) {
                        console.log(`   - ${ticket.code} (QR Code: ${ticket.qrCode ? '✅' : '❌'})`);
                    }
                }
            } catch (error: any) {
                console.error('⚠️ Erro ao criar Order/tickets:', error.message);
                throw error;
            }

            console.log('═'.repeat(60));
            console.log('🎉 PEDIDO COMPLETAMENTE PAGO E ATIVADO!');
            console.log('═'.repeat(60));
            // Buscar tickets finais para o resumo
            const { Ticket } = require('../src/models');
            const { Order } = require('../src/models');
            const finalOrder = await Order.findOne({
                parcelledOrder: finalOrderId,
            });
            
            let finalTicketsCount = 0;
            if (finalOrder) {
                const finalTickets = await Ticket.find({
                    order: finalOrder._id,
                    deletedAt: null,
                });
                finalTicketsCount = finalTickets.length;
            }

            console.log(`\n📊 Resumo:`);
            console.log(`   Pedido ID: ${finalOrderId}`);
            console.log(`   Status: completed`);
            console.log(`   Parcelas pagas: ${paidCount}/${parcels.length}`);
            console.log(`   Ingressos gerados: ${finalTicketsCount}`);
            console.log(`\n✨ Tudo pronto! Usuário pode ver os ingressos no dashboard.\n`);
        } else {
            console.log(`⚠️ Algumas parcelas ainda não foram pagas: ${paidCount}/${parcels.length}`);
        }

    } catch (error: any) {
        console.error('\n❌ Erro ao pagar parcelas:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Desconectado do MongoDB');
    }
}

// Pegar ID da linha de comando (opcional)
const parcelledOrderId = process.argv[2] || undefined;

// Executar (pode ser com ou sem ID)
payAllParcels(parcelledOrderId)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });