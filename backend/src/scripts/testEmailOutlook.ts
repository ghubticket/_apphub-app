import dotenv from 'dotenv';
import path from 'path';
import { sendEmail, isEmailConfigured } from '../services/emailService';
import { checkEmailConfig } from '../utils/checkEnv';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Script para testar envio de email para Outlook
 * 
 * Uso: npm run test-email-outlook
 * ou: ts-node src/scripts/testEmailOutlook.ts --to=seu-email@outlook.com
 */
async function main() {
    const args = process.argv.slice(2);
    let testEmail: string | undefined;

    // Parse argumentos
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--to' && args[i + 1]) {
            testEmail = args[++i];
        } else if (args[i].startsWith('--to=')) {
            testEmail = args[i].split('=')[1];
        }
    }

    // Se não informado, usar emails padrão
    const emailsToTest = testEmail 
        ? [testEmail]
        : [
            'luizh.benicio@outlook.com',
            'guilherme.pessoal@live.com'
        ];

    console.log('📧 Testando envio de emails para Outlook...\n');

    // Verificar configuração
    const emailConfig = checkEmailConfig();
    if (!emailConfig.isConfigured) {
        console.error('❌ Email não configurado. Verifique RESEND_API_KEY no .env');
        process.exit(1);
    }

    console.log('✅ Configuração do Resend:');
    console.log(`   API Key: ${emailConfig.apiKey.configured ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`   From Email: ${emailConfig.fromEmail.value}\n`);

    // Testar cada email
    for (const email of emailsToTest) {
        console.log(`\n📨 Testando envio para: ${email}`);
        console.log('─'.repeat(50));

        const testHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🧪 Teste de Email - EventHub</h1>
                    </div>
                    <div class="content">
                        <h2>Olá!</h2>
                        <p>Este é um email de teste do sistema EventHub.</p>
                        <p><strong>Se você está recebendo este email, o sistema está funcionando!</strong></p>
                        <p>Data/Hora do envio: ${new Date().toLocaleString('pt-BR')}</p>
                        <p>Remetente: ${emailConfig.fromEmail.value}</p>
                    </div>
                    <div class="footer">
                        <p>Este é um email de teste automático.</p>
                        <p>Se você não solicitou este teste, pode ignorar este email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const testText = `
Teste de Email - EventHub

Olá!

Este é um email de teste do sistema EventHub.

Se você está recebendo este email, o sistema está funcionando!

Data/Hora do envio: ${new Date().toLocaleString('pt-BR')}
Remetente: ${emailConfig.fromEmail.value}

---
Este é um email de teste automático.
Se você não solicitou este teste, pode ignorar este email.
        `;

        try {
            const result = await sendEmail({
                to: email,
                subject: '🧪 Teste de Email - EventHub',
                html: testHtml,
                text: testText,
            });

            if (result.success) {
                console.log(`✅ Email enviado com sucesso!`);
                console.log(`   Message ID: ${result.messageId}`);
                console.log(`   ⚠️ IMPORTANTE: Verifique a pasta de SPAM/Lixo Eletrônico!`);
                console.log(`   ⚠️ Outlook.com pode bloquear emails de domínios não verificados.`);
            } else {
                console.error(`❌ Erro ao enviar email:`);
                console.error(`   ${result.error}`);
            }
        } catch (error: any) {
            console.error(`❌ Erro ao enviar email:`, error.message);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 DIAGNÓSTICO:');
    console.log('='.repeat(50));
    console.log('\n⚠️ PROBLEMAS COMUNS COM OUTLOOK.COM:');
    console.log('1. Outlook bloqueia emails de domínios não verificados (como resend.dev)');
    console.log('2. Emails podem ir para SPAM/Lixo Eletrônico');
    console.log('3. Outlook tem políticas anti-spam muito restritivas');
    console.log('\n✅ SOLUÇÕES:');
    console.log('1. Verifique a pasta de SPAM/Lixo Eletrônico no Outlook');
    console.log('2. Adicione o remetente à lista de contatos confiáveis');
    console.log('3. Configure um domínio próprio no Resend (recomendado para produção)');
    console.log('4. Verifique os logs do Resend em: https://resend.com/emails');
    console.log('\n📚 Para configurar domínio próprio:');
    console.log('   1. Acesse: https://resend.com/domains');
    console.log('   2. Adicione seu domínio');
    console.log('   3. Configure os registros DNS (SPF, DKIM, DMARC)');
    console.log('   4. Atualize RESEND_FROM_EMAIL no .env');
    console.log('\n');
}

main().catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

