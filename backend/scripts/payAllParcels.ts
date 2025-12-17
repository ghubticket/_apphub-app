/**
 * Script para pagar todas as parcelas de um pedido parcelado
 * 
 * Uso:
 * npx ts-node backend/scripts/payAllParcels.ts <parcelledOrderId>
 * 
 * Exemplo:
 * npx ts-node backend/scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0
 */

import mongoose from 'mongoose';
import { ParcelledOrder, Parcel, Ticket } from '../src/models';
import { generateQRCode } from '../src/services/qrCodeService';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/apphub';

async function payAllParcels(parcelledOrderId: string) {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(parcelledOrderId)) {
            throw new Error('ID inválido. Use um ObjectId válido.');
        }

        // Buscar pedido parcelado
        console.log(`🔍 Buscando pedido parcelado: ${parcelledOrderId}`);
        const parcelledOrder = await ParcelledOrder.findById(parcelledOrderId)
            .populate('event', 'name')
            .lean();

        if (!parcelledOrder) {
            throw new Error('Pedido parcelado não encontrado');
        }

        console.log(`✅ Pedido encontrado: ${(parcelledOrder.event as any)?.name || 'Sem nome'}`);
        console.log(`   Status atual: ${parcelledOrder.status}`);
        console.log(`   Total de parcelas: ${parcelledOrder.installmentsCount}\n`);

        // Buscar todas as parcelas
        const parcels = await Parcel.find({ parcelledOrder: parcelledOrderId }).sort({ sequence: 1 });

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

            // Atualizar status do pedido para completed
            await ParcelledOrder.findByIdAndUpdate(parcelledOrderId, {
                status: 'completed',
            });

            console.log('✅ Status do pedido atualizado para: completed\n');

            // Buscar tickets associados ao pedido parcelado
            console.log('🎟️ Buscando tickets associados...');
            
            // O pedido parcelado tem um Order vinculado
            const { Order } = require('../src/models');
            const vinculatedOrder = await Order.findOne({
                parcelledOrder: parcelledOrderId,
            });

            let ticketsCount = 0;

            if (vinculatedOrder) {
                console.log(`✅ Order vinculado encontrado: ${vinculatedOrder._id}`);
                
                // Buscar tickets do order
                const ticketsList = await Ticket.find({
                    order: vinculatedOrder._id,
                    deletedAt: null,
                });

                ticketsCount = ticketsList.length;
                console.log(`📋 Encontrados ${ticketsCount} tickets\n`);

                // Gerar QR codes para todos os tickets
                for (const ticket of ticketsList) {
                    if (ticket.qrCode && ticket.status === 'confirmed') {
                        console.log(`   ✅ Ticket ${ticket.code} já tem QR Code - pulando`);
                        continue;
                    }

                    console.log(`   🎨 Gerando QR Code para ticket ${ticket.code}...`);
                    
                    // Gerar QR Code usando o código do ticket
                    const qrCodeDataUrl = await generateQRCode(ticket.code);
                    
                    // Atualizar ticket
                    ticket.qrCode = qrCodeDataUrl;
                    ticket.status = 'confirmed';
                    await ticket.save();
                    
                    console.log(`   ✅ QR Code gerado: ${ticket.code}`);
                }

                // Atualizar status do Order para paid
                vinculatedOrder.status = 'paid';
                await vinculatedOrder.save();

                console.log(`\n✅ Order vinculado atualizado para: paid`);
                console.log(`✅ Todos os ${ticketsCount} ingressos foram gerados!\n`);
            } else {
                console.log('⚠️ Nenhum Order vinculado encontrado');
            }

            console.log('═'.repeat(60));
            console.log('🎉 PEDIDO COMPLETAMENTE PAGO E ATIVADO!');
            console.log('═'.repeat(60));
            console.log(`\n📊 Resumo:`);
            console.log(`   Pedido ID: ${parcelledOrderId}`);
            console.log(`   Status: completed`);
            console.log(`   Parcelas pagas: ${paidCount}/${parcels.length}`);
            console.log(`   Ingressos gerados: ${ticketsCount}`);
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

// Pegar ID da linha de comando
const parcelledOrderId = process.argv[2];

if (!parcelledOrderId) {
    console.error('❌ Erro: Informe o ID do pedido parcelado');
    console.log('\nUso: npx ts-node backend/scripts/payAllParcels.ts <parcelledOrderId>');
    console.log('Exemplo: npx ts-node backend/scripts/payAllParcels.ts 6942c08ffdf39be7c0950eb0\n');
    process.exit(1);
}

// Executar
payAllParcels(parcelledOrderId)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
