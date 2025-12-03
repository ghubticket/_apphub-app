import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

// Carregar variáveis de ambiente
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

/**
 * Conecta ao MongoDB
 */
export const connectDatabase = async (): Promise<void> => {
    try {
        // Validar se MONGODB_URI está configurado
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
            throw new Error('MONGODB_URI não está configurado');
        }

        // Configurações de conexão
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000, // Aumentado para 30 segundos
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000, // Timeout de conexão inicial
            bufferCommands: false,
        };

        await mongoose.connect(MONGODB_URI, options);
    } catch (error: any) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        
        // Capturar erro de conexão no Sentry
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(error, {
                tags: {
                    component: 'database',
                    action: 'connectDatabase',
                    errorType: 'database_connection_failed',
                },
                extra: {
                    hasMongoUri: !!process.env.MONGODB_URI,
                    errorName: error?.name,
                    errorMessage: error?.message,
                },
                level: 'fatal', // Erro fatal - servidor não pode iniciar
            });
        }
        
        process.exit(1); // Encerra o processo se não conseguir conectar
    }
};

/**
 * Desconecta do MongoDB
 */
export const disconnectDatabase = async (): Promise<void> => {
    try {
        await mongoose.disconnect();
    } catch (error) {
        // Silencioso
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});
