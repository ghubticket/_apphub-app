/**
 * Script de teste para verificar envio de emails via Resend
 * 
 * Uso:
 *   ts-node src/scripts/testEmail.ts --to seu-email@exemplo.com
 * 
 * Ou com variáveis de ambiente:
 *   TO_EMAIL=seu-email@exemplo.com ts-node src/scripts/testEmail.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { sendEmail, isValidEmail } from '../services/emailService';

// Carregar .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testEmail() {
    // Obter email de destino
    const toEmail = process.env.TO_EMAIL || process.argv.find(arg => arg.startsWith('--to='))?.split('=')[1];
    
    if (!toEmail) {
        console.error('❌ Erro: Email de destino não informado');
        console.log('');
        console.log('Uso:');
        console.log('  ts-node src/scripts/testEmail.ts --to=seu-email@exemplo.com');
        console.log('  ou');
        console.log('  TO_EMAIL=seu-email@exemplo.com ts-node src/scripts/testEmail.ts');
        process.exit(1);
    }

    if (!isValidEmail(toEmail)) {
        console.error(`❌ Erro: Email inválido: ${toEmail}`);
        process.exit(1);
    }

    console.log('📧 Testando envio de email...');
    console.log(`   Para: ${toEmail}`);
    console.log('');

    const result = await sendEmail({
        to: toEmail,
        subject: 'Teste de Email - EventHub',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        background: #667eea;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Email de Teste</h1>
                </div>
                <div class="content">
                    <h2>Olá!</h2>
                    <p>Este é um email de teste do sistema EventHub.</p>
                    <p>Se você recebeu este email, significa que a integração com Resend está funcionando corretamente! ✅</p>
                    <p><strong>Detalhes do teste:</strong></p>
                    <ul>
                        <li>Serviço: Resend</li>
                        <li>Data: ${new Date().toLocaleString('pt-BR')}</li>
                        <li>Status: Funcionando</li>
                    </ul>
                    <p>Próximos passos:</p>
                    <ol>
                        <li>Criar templates de email para diferentes eventos</li>
                        <li>Implementar envio automático após pagamento</li>
                        <li>Adicionar anexos (PDFs com QR codes)</li>
                    </ol>
                </div>
            </body>
            </html>
        `,
        text: `
            Email de Teste - EventHub
            
            Olá!
            
            Este é um email de teste do sistema EventHub.
            Se você recebeu este email, significa que a integração com Resend está funcionando corretamente!
            
            Detalhes do teste:
            - Serviço: Resend
            - Data: ${new Date().toLocaleString('pt-BR')}
            - Status: Funcionando
            
            Próximos passos:
            1. Criar templates de email para diferentes eventos
            2. Implementar envio automático após pagamento
            3. Adicionar anexos (PDFs com QR codes)
        `
    });

    if (result.success) {
        console.log('✅ Email enviado com sucesso!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log('');
        console.log('💡 Verifique sua caixa de entrada (e spam)');
    } else {
        console.error('❌ Erro ao enviar email:');
        console.error(`   ${result.error}`);
        process.exit(1);
    }
}

// Executar teste
testEmail().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

