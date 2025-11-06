/**
 * Script de teste para templates de email
 * 
 * Uso:
 *   ts-node src/scripts/testEmailTemplates.ts --to seu-email@exemplo.com --template ticket-confirmation
 * 
 * Templates disponíveis:
 *   - ticket-confirmation
 *   - payment-pending
 *   - payment-confirmed
 *   - order-cancelled
 */

import dotenv from 'dotenv';
import path from 'path';
import { sendTicketConfirmationEmail, sendPaymentPendingEmail, sendPaymentConfirmedEmail, sendOrderCancelledEmail } from '../services/emailTemplates';
import { isValidEmail } from '../services/emailService';

// Carregar .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed: Record<string, string> = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            // Suporta --key=value e --key value
            if (arg.includes('=')) {
                const [key, value] = arg.substring(2).split('=');
                parsed[key] = value;
            } else {
                const key = arg.substring(2);
                const value = args[i + 1] || '';
                parsed[key] = value;
                i++;
            }
        }
    }
    
    return parsed;
}

async function testTemplates() {
    const { to, template } = parseArgs();
    
    if (!to) {
        console.error('❌ Erro: Email de destino não informado');
        console.log('');
        console.log('Uso:');
        console.log('  ts-node src/scripts/testEmailTemplates.ts --to seu-email@exemplo.com --template ticket-confirmation');
        console.log('');
        console.log('Templates disponíveis:');
        console.log('  - ticket-confirmation');
        console.log('  - payment-pending');
        console.log('  - payment-confirmed');
        console.log('  - order-cancelled');
        process.exit(1);
    }

    if (!isValidEmail(to)) {
        console.error(`❌ Erro: Email inválido: ${to}`);
        process.exit(1);
    }

    const templateName = template || 'ticket-confirmation';
    console.log(`📧 Testando template: ${templateName}`);
    console.log(`   Para: ${to}`);
    console.log('');

    let result;

    switch (templateName) {
        case 'ticket-confirmation':
            result = await sendTicketConfirmationEmail(to, {
                customerName: 'João Silva',
                orderNumber: 'ORD-12345',
                eventName: 'Show de Rock Nacional',
                eventDate: '15/03/2024 às 20:00',
                eventLocation: 'Arena Fonte Nova',
                eventAddress: 'Av. Bonfim, 123 - Salvador, BA',
                totalTickets: 2,
                ticketType: 'Pista',
                downloadLink: 'https://eventhub.com/tickets/ORD-12345'
            });
            break;

        case 'payment-pending':
            result = await sendPaymentPendingEmail(to, {
                customerName: 'João Silva',
                orderNumber: 'ORD-12345',
                eventName: 'Show de Rock Nacional',
                eventDate: '15/03/2024 às 20:00',
                eventLocation: 'Arena Fonte Nova',
                totalAmount: 'R$ 240,00',
                paymentMethod: 'PIX',
                expirationMinutes: 15
            });
            break;

        case 'payment-confirmed':
            result = await sendPaymentConfirmedEmail(to, {
                customerName: 'João Silva',
                orderNumber: 'ORD-12345',
                eventName: 'Show de Rock Nacional',
                eventDate: '15/03/2024 às 20:00',
                eventLocation: 'Arena Fonte Nova',
                totalAmount: 'R$ 240,00',
                paymentMethod: 'PIX',
                paymentDate: '10/03/2024 às 14:30',
                ticketsLink: 'https://eventhub.com/tickets/ORD-12345'
            });
            break;

        case 'order-cancelled':
            result = await sendOrderCancelledEmail(to, {
                customerName: 'João Silva',
                orderNumber: 'ORD-12345',
                eventName: 'Show de Rock Nacional',
                cancelledAt: '10/03/2024 às 15:00',
                cancellationReason: 'Pagamento não realizado dentro do prazo',
                refundInfo: 'O valor será reembolsado em até 5 dias úteis na conta de origem.'
            });
            break;

        default:
            console.error(`❌ Template não encontrado: ${templateName}`);
            console.log('');
            console.log('Templates disponíveis:');
            console.log('  - ticket-confirmation');
            console.log('  - payment-pending');
            console.log('  - payment-confirmed');
            console.log('  - order-cancelled');
            process.exit(1);
    }

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
testTemplates().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

