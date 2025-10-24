const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function resetAndCreateTestUsers() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apphub');
        console.log('✅ Conectado ao MongoDB');

        // DELETAR TODOS OS USUÁRIOS EXISTENTES
        console.log('🗑️  Deletando todos os usuários existentes...');
        await User.deleteMany({});
        console.log('✅ Todos os usuários foram deletados');

        // CRIAR USUÁRIOS DE TESTE
        console.log('👥 Criando usuários de teste...');

        const testUsers = [
            // 1 ADMIN
            {
                name: 'Administrador',
                email: 'admin@apphub.com',
                password: 'admin123',
                role: 'ADMIN',
                phone: '(11) 99999-9999',
                cpf: '000.000.000-00',
                isActive: true
            },
            
            // 5 QRCODE
            {
                name: 'Pedro Validator',
                email: 'pedro@qrcode.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 11111-1111',
                cpf: '111.111.111-11',
                isActive: true
            },
            {
                name: 'Ana Scanner',
                email: 'ana@qrcode.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 22222-2222',
                cpf: '222.222.222-22',
                isActive: true
            },
            {
                name: 'Carlos Reader',
                email: 'carlos@qrcode.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 33333-3333',
                cpf: '333.333.333-33',
                isActive: true
            },
            {
                name: 'Maria Checker',
                email: 'maria@qrcode.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 44444-4444',
                cpf: '444.444.444-44',
                isActive: true
            },
            {
                name: 'João Verifier',
                email: 'joao@qrcode.com',
                password: '123456',
                role: 'QRCODE',
                phone: '(11) 55555-5555',
                cpf: '555.555.555-55',
                isActive: true
            },

            // 15 CLIENTE
            {
                name: 'Alice Silva',
                email: 'alice@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 66666-6666',
                cpf: '666.666.666-66',
                isActive: true
            },
            {
                name: 'Bruno Santos',
                email: 'bruno@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 77777-7777',
                cpf: '777.777.777-77',
                isActive: true
            },
            {
                name: 'Carla Oliveira',
                email: 'carla@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 88888-8888',
                cpf: '888.888.888-88',
                isActive: true
            },
            {
                name: 'Diego Costa',
                email: 'diego@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 99999-0000',
                cpf: '999.999.999-99',
                isActive: true
            },
            {
                name: 'Elena Ferreira',
                email: 'elena@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 00000-1111',
                cpf: '000.111.222-33',
                isActive: true
            },
            {
                name: 'Felipe Lima',
                email: 'felipe@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 11111-2222',
                cpf: '111.222.333-44',
                isActive: true
            },
            {
                name: 'Gabriela Rocha',
                email: 'gabriela@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 22222-3333',
                cpf: '222.333.444-55',
                isActive: true
            },
            {
                name: 'Henrique Alves',
                email: 'henrique@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 33333-4444',
                cpf: '333.444.555-66',
                isActive: true
            },
            {
                name: 'Isabela Pereira',
                email: 'isabela@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 44444-5555',
                cpf: '444.555.666-77',
                isActive: true
            },
            {
                name: 'Julio Martins',
                email: 'julio@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 55555-6666',
                cpf: '555.666.777-88',
                isActive: true
            },
            {
                name: 'Larissa Souza',
                email: 'larissa@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 66666-7777',
                cpf: '666.777.888-99',
                isActive: true
            },
            {
                name: 'Marcos Torres',
                email: 'marcos@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 77777-8888',
                cpf: '777.888.999-00',
                isActive: true
            },
            {
                name: 'Natália Dias',
                email: 'natalia@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 88888-9999',
                cpf: '888.999.000-11',
                isActive: true
            },
            {
                name: 'Otávio Ramos',
                email: 'otavio@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 99999-1111',
                cpf: '999.000.111-22',
                isActive: true
            },
            {
                name: 'Patricia Nunes',
                email: 'patricia@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 00000-2222',
                cpf: '000.111.222-33',
                isActive: true
            },
            {
                name: 'Rafael Gomes',
                email: 'rafael@cliente.com',
                password: '123456',
                role: 'CLIENTE',
                phone: '(11) 11111-3333',
                cpf: '111.222.333-44',
                isActive: true
            }
        ];

        // Criar usuários
        for (const userData of testUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`✅ Usuário criado: ${userData.name} (${userData.role}) - ${userData.email}`);
        }

        console.log('\n🎉 RESET E CRIAÇÃO CONCLUÍDOS!');
        console.log('📊 RESUMO:');
        console.log('👑 ADMIN: 1 usuário');
        console.log('📱 QRCODE: 5 usuários');
        console.log('👤 CLIENTE: 15 usuários');
        console.log('📧 Total: 21 usuários criados');
        
        console.log('\n🔑 CREDENCIAIS DE TESTE:');
        console.log('👑 ADMIN: admin@apphub.com / admin123');
        console.log('📱 QRCODE: pedro@qrcode.com / 123456');
        console.log('👤 CLIENTE: alice@cliente.com / 123456');

    } catch (error) {
        console.error('❌ Erro ao resetar e criar usuários:', error);
    } finally {
        // Fechar conexão
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

// Executar script
resetAndCreateTestUsers();
