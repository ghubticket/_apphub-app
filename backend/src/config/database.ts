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
        // Configurações de conexão
        const options = {
            // Configurações para desenvolvimento
            maxPoolSize: 10, // Máximo de conexões simultâneas
            serverSelectionTimeoutMS: 5000, // Timeout para seleção de servidor
            socketTimeoutMS: 45000, // Timeout para operações
            bufferCommands: false, // Desabilita buffering
        };

        console.log('🔄 Conectando ao MongoDB...');
        console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Esconde credenciais no log

        await mongoose.connect(MONGODB_URI, options);

        console.log('✅ MongoDB conectado com sucesso!');
        console.log(`📊 Database: ${mongoose.connection.db?.databaseName}`);
        console.log(`🌍 Host: ${mongoose.connection.host}`);
        console.log(`🔌 Port: ${mongoose.connection.port}`);
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
        console.log('🔌 MongoDB desconectado');
    } catch (error) {
        console.error('❌ Erro ao desconectar do MongoDB:', error);
    }
};

/**
 * Eventos de conexão
 */
mongoose.connection.on('connected', () => {
    console.log('🟢 Mongoose conectado ao MongoDB');
});

mongoose.connection.on('error', (error) => {
    console.error('🔴 Erro na conexão MongoDB:', error);
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 Mongoose desconectado do MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Recebido SIGINT. Fechando conexões...');
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recebido SIGTERM. Fechando conexões...');
    await disconnectDatabase();
    process.exit(0);
});
