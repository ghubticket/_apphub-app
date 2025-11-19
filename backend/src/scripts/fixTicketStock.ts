/**
 * Script para corrigir soldQuantity incorreto nos tipos de ingresso
 *
 * PROBLEMA: Alguns tipos de ingresso têm soldQuantity maior que maxQuantity
 * SOLUÇÃO: Ajustar soldQuantity para não exceder maxQuantity
 *
 * Uso: ts-node src/scripts/fixTicketStock.ts
 */

import mongoose from 'mongoose';
import TicketType from '../models/TicketType';
import Ticket from '../models/Ticket';

async function fixTicketStock() {
    try {
        // Conectar ao MongoDB
        // CRÍTICO: Usar o mesmo padrão do database.ts (eventhub ao invés de apphub)
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado ao MongoDB');
        console.log(`📡 URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Ocultar credenciais
        console.log(`📊 Database: ${mongoose.connection.db?.databaseName}`);

        // DEBUG: Buscar TODOS os tipos de ingresso primeiro (sem filtro)
        const allTicketTypes = await TicketType.find({});
        console.log(`📋 Total de tipos de ingresso no banco: ${allTicketTypes.length}`);

        // Verificar quantos têm deletedAt null
        const withDeletedAtNull = allTicketTypes.filter((tt) => !tt.deletedAt);
        const withDeletedAt = allTicketTypes.filter((tt) => tt.deletedAt);
        console.log(`   - Com deletedAt null: ${withDeletedAtNull.length}`);
        console.log(`   - Com deletedAt preenchido: ${withDeletedAt.length}`);

        // Buscar tipos de ingresso não deletados
        let ticketTypes = await TicketType.find({ deletedAt: null });
        console.log(`\n📋 Tipos de ingresso não deletados: ${ticketTypes.length}`);

        // Se não encontrou nenhum, tentar buscar sem filtro de deletedAt
        if (ticketTypes.length === 0 && allTicketTypes.length > 0) {
            console.log(`⚠️  Nenhum tipo encontrado com deletedAt null, buscando todos...`);
            console.log(
                `📋 Buscando todos os tipos (incluindo deletados): ${allTicketTypes.length}`
            );

            // Mostrar alguns exemplos
            if (allTicketTypes.length > 0) {
                console.log(`\n📝 Exemplos de tipos encontrados:`);
                allTicketTypes.slice(0, 3).forEach((tt, idx) => {
                    console.log(
                        `   ${idx + 1}. ${tt.name} - deletedAt: ${tt.deletedAt || 'null'} - soldQuantity: ${tt.soldQuantity} - maxQuantity: ${tt.maxQuantity}`
                    );
                });
            }

            // Usar todos os tipos para correção (mesmo os deletados, para diagnóstico)
            ticketTypes = allTicketTypes;
        }

        let fixedCount = 0;
        let totalFixed = 0;

        for (const ticketType of ticketTypes) {
            const maxQuantity = ticketType.maxQuantity || 0;
            const currentSoldQuantity = ticketType.soldQuantity || 0;

            // Verificar se soldQuantity está incorreto
            if (currentSoldQuantity > maxQuantity) {
                console.log(`\n🔴 Problema encontrado:`);
                console.log(`   Tipo: ${ticketType.name} (${ticketType._id})`);
                console.log(`   Evento: ${ticketType.event}`);
                console.log(`   maxQuantity: ${maxQuantity}`);
                console.log(`   soldQuantity atual: ${currentSoldQuantity}`);
                console.log(`   Diferença: ${currentSoldQuantity - maxQuantity}`);

                // Contar tickets confirmados reais para este tipo de ingresso
                const confirmedTickets = await Ticket.countDocuments({
                    ticketType: ticketType._id,
                    status: 'confirmed',
                    deletedAt: null,
                });

                const paidTickets = await Ticket.countDocuments({
                    ticketType: ticketType._id,
                    status: { $in: ['confirmed', 'paid'] },
                    deletedAt: null,
                });

                console.log(`   Tickets confirmados reais: ${confirmedTickets}`);
                console.log(`   Tickets pagos reais: ${paidTickets}`);

                // Usar o valor real de tickets confirmados, mas não pode exceder maxQuantity
                const correctSoldQuantity = Math.min(confirmedTickets, maxQuantity);

                if (correctSoldQuantity !== currentSoldQuantity) {
                    console.log(`   ✅ Corrigindo soldQuantity para: ${correctSoldQuantity}`);

                    ticketType.soldQuantity = correctSoldQuantity;
                    await ticketType.save();

                    fixedCount++;
                    totalFixed += currentSoldQuantity - correctSoldQuantity;
                } else {
                    console.log(`   ⚠️  Valor já está correto baseado em tickets confirmados`);
                }
            } else if (currentSoldQuantity < 0) {
                // Corrigir valores negativos
                console.log(`\n🔴 Valor negativo encontrado:`);
                console.log(`   Tipo: ${ticketType.name} (${ticketType._id})`);
                console.log(`   soldQuantity atual: ${currentSoldQuantity}`);

                const confirmedTickets = await Ticket.countDocuments({
                    ticketType: ticketType._id,
                    status: 'confirmed',
                    deletedAt: null,
                });

                const correctSoldQuantity = Math.min(confirmedTickets, maxQuantity);
                console.log(`   ✅ Corrigindo soldQuantity para: ${correctSoldQuantity}`);

                ticketType.soldQuantity = correctSoldQuantity;
                await ticketType.save();

                fixedCount++;
            }
        }

        console.log(`\n✅ Correção concluída!`);
        console.log(`   Tipos corrigidos: ${fixedCount}`);
        console.log(`   Total de ingressos ajustados: ${totalFixed}`);

        await mongoose.disconnect();
        console.log('✅ Desconectado do MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao corrigir estoque:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Executar script
fixTicketStock();
