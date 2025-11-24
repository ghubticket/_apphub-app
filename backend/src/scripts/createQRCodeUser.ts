'use strict';

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

dotenv.config({ path: path.join(__dirname, '../../.env') });

type ParsedArgs = Record<string, string>;

function parseArgs(): ParsedArgs {
    const rawArgs = process.argv.slice(2);
    const parsed: ParsedArgs = {};

    for (let i = 0; i < rawArgs.length; i += 1) {
        const current = rawArgs[i];
        if (!current.startsWith('--')) continue;

        const key = current.replace(/^--/, '');
        const next = rawArgs[i + 1];

        if (next && !next.startsWith('--')) {
            parsed[key] = next;
            i += 1;
        } else {
            parsed[key] = 'true';
        }
    }

    return parsed;
}

async function connectDatabase() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';
    try {
        await mongoose.connect(mongoUri);
    } catch (error) {
        console.error('❌ Não foi possível conectar ao MongoDB:', error);
        process.exit(1);
    }
}

async function upsertQRCodeUser({
    name,
    email,
    password,
}: {
    name: string;
    email: string;
    password: string;
}) {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');

    if (existingUser) {
        existingUser.name = name;
        existingUser.role = 'QRCODE';
        existingUser.password = password;
        existingUser.isActive = true;
        existingUser.deletedAt = undefined;

        await existingUser.save();
        console.log(`🔄 Usuário QR CODE atualizado: ${normalizedEmail}`);
    } else {
        const user = new User({
            name,
            email: normalizedEmail,
            password,
            role: 'QRCODE',
            isActive: true,
        });

        await user.save();
        console.log(`✅ Usuário QR CODE criado: ${normalizedEmail}`);
    }
}

function printUsage() {
    console.log(`
Uso: npm run create-qrcode-user -- --email qrcode@dominio.com --password SenhaForte123! [--name "Nome do Validador"]

Argumentos:
  --email      (obrigatório) Email do usuário do QR code scanner
  --password   (obrigatório) Senha que será definida
  --name       (opcional)    Nome completo. Padrão: "Validador QR Code"
`);
}

async function main() {
    const args = parseArgs();
    const email = args.email || args.e;
    const password = args.password || args.p;
    const name = args.name || args.n || 'Validador QR Code';

    if (!email || !password) {
        console.error('❌ É necessário informar --email e --password.');
        printUsage();
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('❌ Senha deve ter pelo menos 8 caracteres.');
        process.exit(1);
    }

    await connectDatabase();

    try {
        await upsertQRCodeUser({ name, email, password });
        console.log('🎉 Operação concluída com sucesso.');
    } catch (error: any) {
        console.error('❌ Erro ao criar/atualizar usuário do QR code:', error?.message || error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexão encerrada.');
    }
}

main().catch((error) => {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
});

