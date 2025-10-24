import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script para criar usuários de teste
 */
async function createTestUsers() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apphub');
        console.log('✅ Conectado ao MongoDB');

        // Usuários de teste
        const testUsers = [
            {
                name: 'Pedro Validator',
                email: 'pedro@teste.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 77777-7777',
                cpf: '456.789.123-00'
            },
            {
                name: 'Ana Validator',
                email: 'ana@teste.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 66666-6666',
                cpf: '789.123.456-00'
            }
        ];

        // Criar usuários
        for (const userData of testUsers) {
            // Verificar se já existe
            const existingUser = await User.findOne({ email: userData.email });
            
            if (existingUser) {
                console.log(`⚠️  Usuário já existe: ${userData.email}`);
                continue;
            }

            // Criar usuário
            const user = new User(userData);
            await user.save();
            
            console.log(`✅ Usuário criado: ${userData.name} (${userData.role})`);
        }

        console.log('🎉 Todos os usuários de teste foram criados!');

    } catch (error) {
        console.error('❌ Erro ao criar usuários de teste:', error);
    } finally {
        // Fechar conexão
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

// Executar script
if (require.main === module) {
    createTestUsers();
}

export default createTestUsers;
