/**
 * Script para limpar registros deletados permanentemente após um período
 * Execute periodicamente (ex: diariamente via cron job)
 * 
 * Configuração recomendada:
 * - Eventos deletados: 90 dias
 * - Tipos de ingressos deletados: 90 dias
 * 
 * Execute: npm run cleanup-deleted
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event';
import TicketType from '../models/TicketType';
import { User } from '../models';

dotenv.config();

// Configuração: dias para manter registros deletados antes de limpar permanentemente
const DAYS_TO_KEEP_DELETED = parseInt(process.env.DAYS_TO_KEEP_DELETED || '90', 10);

const cleanupDeletedRecords = async () => {
    try {
        // Conectar ao banco de dados
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP_DELETED);
        console.log(`\n📅 Data de corte: ${cutoffDate.toISOString()}`);
        console.log(`📊 Mantendo registros deletados por ${DAYS_TO_KEEP_DELETED} dias\n`);

        // Limpar eventos deletados
        const eventsResult = await Event.deleteMany({
            deletedAt: { $ne: null, $lt: cutoffDate },
        });
        console.log(`🗑️  Eventos deletados permanentemente: ${eventsResult.deletedCount}`);

        // Limpar tipos de ingressos deletados
        const ticketTypesResult = await TicketType.deleteMany({
            deletedAt: { $ne: null, $lt: cutoffDate },
        });
        console.log(`🗑️  Tipos de ingressos deletados permanentemente: ${ticketTypesResult.deletedCount}`);

        // Limpar usuários deletados
        const usersResult = await User.deleteMany({
            deletedAt: { $ne: null, $lt: cutoffDate },
        });
        console.log(`🗑️  Usuários deletados permanentemente: ${usersResult.deletedCount}`);

        // Estatísticas
        const totalDeleted = eventsResult.deletedCount + ticketTypesResult.deletedCount + usersResult.deletedCount;
        console.log(`\n📊 Total de registros removidos: ${totalDeleted}`);

        if (totalDeleted > 0) {
            console.log('\n✅ Limpeza concluída com sucesso!');
        } else {
            console.log('\nℹ️  Nenhum registro antigo para remover');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao limpar registros deletados:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Executar
cleanupDeletedRecords();

