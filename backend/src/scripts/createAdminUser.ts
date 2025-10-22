import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script para criar usuário ADMIN padrão
 */
async function createAdminUser() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apphub');
        console.log('✅ Conectado ao MongoDB');

        // Verificar se já existe um usuário ADMIN
        const existingAdmin = await User.findOne({ role: 'ADMIN' });
        
        if (existingAdmin) {
            console.log('⚠️  Usuário ADMIN já existe:', existingAdmin.email);
            return;
        }

        // Criar usuário ADMIN padrão
        const adminUser = new User({
            name: 'Administrador',
            email: 'admin@apphub.com',
            password: 'admin123', // Será hasheado automaticamente
            role: 'ADMIN',
            phone: '(11) 99999-9999',
            cpf: '000.000.000-00',
            isActive: true
        });

        // Salvar no banco
        await adminUser.save();
        
        console.log('🎉 Usuário ADMIN criado com sucesso!');
        console.log('📧 Email:', adminUser.email);
        console.log('🔑 Senha: admin123');
        console.log('👑 Role: ADMIN');

    } catch (error) {
        console.error('❌ Erro ao criar usuário ADMIN:', error);
    } finally {
        // Fechar conexão
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

// Executar script
if (require.main === module) {
    createAdminUser();
}

export default createAdminUser;
