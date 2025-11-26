import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Carregar variáveis de ambiente do backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Script para criar/atualizar um usuário ADMIN para o dashboard,
 * apontando preferencialmente para o banco de DEV.
 *
 * Usa as variáveis de ambiente:
 *  - MONGODB_URI_DEV (opcional) -> string de conexão do banco de desenvolvimento
 *  - MONGODB_URI (fallback)     -> string padrão se a de DEV não estiver setada
 *  - DASHBOARD_ADMIN_NAME       -> nome do usuário (default: 'Dashboard Admin')
 *  - DASHBOARD_ADMIN_EMAIL      -> email de login (OBRIGATÓRIO)
 *  - DASHBOARD_ADMIN_PASSWORD   -> senha em texto plano (OBRIGATÓRIO; será hasheada pelo pre-save)
 */

async function connectDB() {
    const mongoUri =
        process.env.MONGODB_URI_DEV ||
        process.env.MONGODB_URI ||
        'mongodb://localhost:27017/eventhub';

    if (!mongoUri) {
        console.error('❌ MONGODB_URI_DEV ou MONGODB_URI não configurado.');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado ao MongoDB (dashboard DEV)');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
}

async function createOrUpdateDashboardAdmin() {
    const email = (process.env.DASHBOARD_ADMIN_EMAIL || '').toLowerCase().trim();
    const password = process.env.DASHBOARD_ADMIN_PASSWORD || '';
    const name = process.env.DASHBOARD_ADMIN_NAME || 'Dashboard Admin';

    if (!email || !password) {
        console.error(
            '❌ DASHBOARD_ADMIN_EMAIL e DASHBOARD_ADMIN_PASSWORD são obrigatórios para criar o usuário.'
        );
        process.exit(1);
    }

    console.log('🧑‍💻 Criando/atualizando usuário ADMIN do dashboard:');
    console.log(`   Nome : ${name}`);
    console.log(`   Email: ${email}`);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        console.log('ℹ️ Usuário já existe. Atualizando dados...');
        existingUser.name = name;
        existingUser.role = 'ADMIN';
        existingUser.password = password; // será hasheada pelo pre-save hook do modelo
        existingUser.isActive = true;
        existingUser.deletedAt = undefined as any;

        await existingUser.save();
        console.log('✅ Usuário ADMIN do dashboard atualizado com sucesso.');
    } else {
        console.log('ℹ️ Usuário não encontrado. Criando novo ADMIN...');
        const user = new User({
            name,
            email,
            password, // será hasheada pelo pre-save hook
            role: 'ADMIN',
            isActive: true,
        });

        await user.save();
        console.log('✅ Usuário ADMIN do dashboard criado com sucesso.');
    }
}

async function main() {
    try {
        await connectDB();
        await createOrUpdateDashboardAdmin();
    } catch (error) {
        console.error('❌ Erro ao criar/atualizar usuário do dashboard:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Conexão com MongoDB encerrada.');
        process.exit(0);
    }
}

main();


