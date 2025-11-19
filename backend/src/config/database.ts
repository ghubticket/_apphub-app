import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
        };

        await mongoose.connect(MONGODB_URI, options);
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
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
