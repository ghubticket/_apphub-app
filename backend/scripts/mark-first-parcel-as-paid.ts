/**
 * Script para marcar a primeira parcela (entrada) como paga
 * 
 * Uso (da raiz do projeto):
 * npx ts-node backend/scripts/mark-first-parcel-as-paid.ts [parcelledOrderId]
 * 
 * Uso (do diretório backend):
 * npx ts-node scripts/mark-first-parcel-as-paid.ts [parcelledOrderId]
 * 
 * Exemplos:
 * # Com ID específico:
 * npx ts-node scripts/mark-first-parcel-as-paid.ts 6943f2b4ab6d2f10d0cc8686
 * 
 * # Sem ID (paga entrada de TODOS os pedidos com pending_entry):
 * npx ts-node scripts/mark-first-parcel-as-paid.ts
 * 
 * Este script:
 * 1. Encontra a(s) venda(s) parcelada(s) (por ID ou TODAS com entrada não paga)
 * 2. Marca a primeira parcela (sequence === 0) como paga
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

async function markFirstParcelAsPaid(parcelledOrderId?: string) {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB\n');

        let parcelledOrders: any[] = [];

        // Se foi passado um ID, buscar apenas esse pedido
        if (parcelledOrderId) {
            if (!mongoose.Types.ObjectId.isValid(parcelledOrderId)) {
                throw new Error('ID inválido. Use um ObjectId válido.');
            }

            console.log(`🔍 Buscando pedido parcelado: ${parcelledOrderId}`);
            const order = await ParcelledOrder.findById(parcelledOrderId).lean();

            if (!order) {
                throw new Error('Pedido parcelado não encontrado');
            }

            parcelledOrders = [order];
            console.log(`✅ Pedido encontrado`);
            console.log(`   Status atual: ${order.status}\n`);
        } else {
            // Se não foi passado ID, buscar TODOS os pedidos com pending_entry
            console.log('🔍 Nenhum ID informado. Buscando TODOS os pedidos parcelados com entrada não paga...\n');
            
            parcelledOrders = await ParcelledOrder.find({
                status: 'pending_entry',
            })
            .sort({ createdAt: -1 }) // Mais recente primeiro
            .lean();

            if (parcelledOrders.length === 0) {
                console.log('✅ Nenhuma venda parcelada com entrada não paga encontrada');
                await mongoose.disconnect();
                return;
            }

            console.log(`✅ Encontrados ${parcelledOrders.length} pedido(s) com entrada não paga:\n`);
            for (const order of parcelledOrders) {
                console.log(`   - ID: ${order._id} (Criado em: ${new Date(order.createdAt).toLocaleString('pt-BR')})`);
            }
            console.log('');
        }

        let updatedCount = 0;
        let errorCount = 0;

        for (const order of parcelledOrders) {
            try {
                console.log(`\n📦 Processando pedido: ${order._id}`);
                
                // Encontrar a primeira parcela (entrada - sequence === 0)
                const entryParcel = await Parcel.findOne({
                    parcelledOrder: order._id,
                    sequence: 0,
                });

                if (!entryParcel) {
                    console.log(`   ⚠️  Venda parcelada não tem parcela de entrada (sequence 0)`);
                    errorCount++;
                    continue;
                }

                // Verificar se já está paga
                if (entryParcel.status === 'paid') {
                    const paidAtStr = entryParcel.paidAt 
                        ? new Date(entryParcel.paidAt).toLocaleString('pt-BR')
                        : 'data não disponível';
                    console.log(`   ⏭️  Entrada já está paga (paga em: ${paidAtStr})`);
                    continue;
                }

                console.log(`   💳 Marcando entrada como paga...`);
                console.log(`      Parcela ID: ${entryParcel._id}`);
                console.log(`      Valor: R$ ${entryParcel.amount.toFixed(2)}`);
                console.log(`      Status atual: ${entryParcel.status}`);

                // Marcar entrada como paga
                entryParcel.status = 'paid';
                entryParcel.paidAt = new Date();
                await entryParcel.save();

                // Atualizar status da venda parcelada para 'active'
                await ParcelledOrder.updateOne(
                    { _id: order._id },
                    { status: 'active' }
                );

                console.log(`   ✅ Entrada marcada como paga`);
                console.log(`   ✅ Status do pedido atualizado para: active`);
                updatedCount++;
            } catch (error: any) {
                console.error(`   ❌ Erro ao processar: ${error.message}`);
                errorCount++;
            }
        }

        console.log('═'.repeat(60));
        console.log('📊 Resumo:');
        console.log(`   ✅ Atualizadas: ${updatedCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);
        console.log(`   📦 Total processado: ${parcelledOrders.length}`);
        console.log('═'.repeat(60));

        if (updatedCount > 0) {
            console.log('\n✨ Pronto! Agora você pode ver as demais parcelas no frontend.');
            if (updatedCount === 1) {
                console.log('   O pedido mudou de "pending_entry" para "active".\n');
            } else {
                console.log(`   ${updatedCount} pedido(s) mudaram de "pending_entry" para "active".\n`);
            }
        } else {
            console.log('\n⚠️  Nenhum pedido foi atualizado (todos já estavam pagos ou sem entrada).\n');
        }

        await mongoose.disconnect();
        console.log('👋 Desconectado do MongoDB');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Erro fatal:', error.message);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Pegar ID da linha de comando (opcional)
const parcelledOrderId = process.argv[2] || undefined;

// Executar (pode ser com ou sem ID)
markFirstParcelAsPaid(parcelledOrderId)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
