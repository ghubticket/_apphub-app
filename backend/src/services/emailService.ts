import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar cliente Resend
let resendClient: Resend | null = null;

/**
 * Inicializa o cliente Resend
 * Retorna null se a API key não estiver configurada
 */
const getResendClient = (): Resend | null => {
    if (resendClient) {
        return resendClient;
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
        console.warn('⚠️ RESEND_API_KEY não configurada. Emails não serão enviados.');
        return null;
    }

    try {
        resendClient = new Resend(apiKey);
        console.log('✅ Cliente Resend inicializado com sucesso');
        return resendClient;
    } catch (error) {
        console.error('❌ Erro ao inicializar Resend:', error);
        return null;
    }
};

/**
 * Interface para anexos de email
 */
export interface EmailAttachment {
    filename: string;
    content: string | Buffer;
    contentType: string;
}

/**
 * Interface para dados de email
 */
export interface EmailData {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    attachments?: EmailAttachment[];
}

/**
 * Envia um email usando Resend
 *
 * @param emailData Dados do email
 * @returns Promise com resultado do envio
 */
export const sendEmail = async (
    emailData: EmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const client = getResendClient();

    if (!client) {
        return {
            success: false,
            error: 'Resend não configurado. Verifique RESEND_API_KEY no .env',
        };
    }

    // Email padrão (pode ser configurado via env)
    // Usa domínio de teste do Resend se não configurado
    const defaultFrom = process.env.RESEND_FROM_EMAIL || 'EventHub <onboarding@resend.dev>';
    const from = emailData.from || defaultFrom;

    try {
        const result = await client.emails.send({
            from,
            to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            replyTo: emailData.replyTo,
            attachments: emailData.attachments?.map((att) => ({
                filename: att.filename,
                content:
                    att.content instanceof Buffer ? att.content.toString('base64') : att.content,
                contentType: att.contentType,
            })),
        });

        if (result.error) {
            console.error('❌ Erro ao enviar email:', result.error);
            return {
                success: false,
                error: result.error.message || 'Erro desconhecido ao enviar email',
            };
        }

        const messageId = result.data?.id;
        console.log(`✅ Email enviado com sucesso. ID: ${messageId}`);

        // Log detalhado para debug (apenas em dev)
        if (process.env.NODE_ENV !== 'production') {
            console.log(
                `   📧 Para: ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}`
            );
            console.log(`   📨 De: ${from}`);
            console.log(`   📋 Assunto: ${emailData.subject}`);
            console.log(`   🔗 Ver logs: https://resend.com/emails/${messageId}`);
        }

        return {
            success: true,
            messageId: messageId,
        };
    } catch (error: any) {
        console.error('❌ Erro ao enviar email:', error);
        return {
            success: false,
            error: error?.message || 'Erro desconhecido ao enviar email',
        };
    }
};

/**
 * Verifica se o serviço de email está configurado
 */
export const isEmailConfigured = (): boolean => {
    return !!process.env.RESEND_API_KEY?.trim();
};

/**
 * Valida formato de email
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
