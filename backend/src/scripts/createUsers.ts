import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Interface para dados do usuário
interface UserData {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'CLIENTE' | 'QRCODE';
    phone?: string;
    cpf?: string;
}

// Lista de usuários para criar
const usersToCreate: UserData[] = [
    {
        name: 'Luiz Henrique Benicio',
        email: 'luizh.benicio@outlook.com',
        password: 'Senha123!', // Senha padrão - deve ser alterada no primeiro login
        role: 'ADMIN',
    },
    {
        name: 'Guilherme Pessoal',
        email: 'guilherme.pessoal@live.com',
        password: 'Senha123!', // Senha padrão - deve ser alterada no primeiro login
        role: 'ADMIN',
    },
    {
        name: 'Validador QR Code',
        email: 'qrcode@eventhub.com',
        password: 'QRCode123!', // Senha padrão - deve ser alterada no primeiro login
        role: 'QRCODE',
    },
];

/**
 * Conecta ao MongoDB
 */
async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';
    
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado ao MongoDB');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
}

/**
 * Cria um usuário ou atualiza se já existir
 */
async function createOrUpdateUser(userData: UserData) {
    try {
        // Verificar se usuário já existe (incluindo soft deleted)
        const existingUser = await User.findOne({ 
            email: userData.email.toLowerCase() 
        });

        if (existingUser) {
            // Se existe mas está deletado, restaurar
            if (existingUser.deletedAt) {
                existingUser.deletedAt = undefined;
                existingUser.isActive = true;
                console.log(`   ⚠️ Usuário estava deletado, restaurando...`);
            }

            // Atualizar dados
            existingUser.name = userData.name;
            existingUser.role = userData.role;
            existingUser.password = userData.password; // Senha será hasheada pelo pre-save hook
            if (userData.phone) existingUser.phone = userData.phone;
            if (userData.cpf) existingUser.cpf = userData.cpf;
            existingUser.isActive = true;

            await existingUser.save();
            console.log(`   ✅ Usuário atualizado: ${userData.email}`);
            return existingUser;
        } else {
            // Criar novo usuário
            const user = new User({
                name: userData.name,
                email: userData.email.toLowerCase(),
                password: userData.password, // Senha será hasheada pelo pre-save hook
                role: userData.role,
                phone: userData.phone,
                cpf: userData.cpf,
                isActive: true,
            });

            await user.save();
            console.log(`   ✅ Usuário criado: ${userData.email}`);
            return user;
        }
    } catch (error: any) {
        console.error(`   ❌ Erro ao criar/atualizar usuário ${userData.email}:`, error.message);
        throw error;
    }
}

/**
 * Função principal
 */
async function main() {
    console.log('🚀 Iniciando criação de usuários...\n');

    // Conectar ao banco
    await connectDB();

    console.log(`📝 Criando/atualizando ${usersToCreate.length} usuário(s)...\n`);

    const results = {
        created: 0,
        updated: 0,
        errors: 0,
    };

    for (const userData of usersToCreate) {
        try {
            const existingUser = await User.findOne({ 
                email: userData.email.toLowerCase() 
            });
            
            const wasExisting = !!existingUser && !existingUser.deletedAt;
            
            await createOrUpdateUser(userData);
            
            if (wasExisting) {
                results.updated++;
            } else {
                results.created++;
            }
        } catch (error) {
            results.errors++;
            console.error(`   ❌ Falha ao processar ${userData.email}`);
        }
    }

    console.log('\n📊 Resumo:');
    console.log(`   ✅ Criados: ${results.created}`);
    console.log(`   🔄 Atualizados: ${results.updated}`);
    console.log(`   ❌ Erros: ${results.errors}`);

    // Fechar conexão
    await mongoose.connection.close();
    console.log('\n✅ Conexão fechada');
    process.exit(0);
}

// Executar
main().catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

