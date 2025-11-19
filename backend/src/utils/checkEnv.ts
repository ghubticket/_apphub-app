import { isEmailConfigured } from '../services/emailService';

/**
 * Utilitário para verificar se as variáveis de ambiente estão configuradas
 * Pode ser usado para debug ou validação na inicialização
 */
export const checkEmailConfig = () => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    const checks = {
        apiKey: {
            configured: !!apiKey?.trim(),
            value: apiKey ? `${apiKey.substring(0, 10)}...` : 'Não configurado',
        },
        fromEmail: {
            configured: !!fromEmail?.trim(),
            value: fromEmail || 'Não configurado (usará padrão)',
        },
        isConfigured: isEmailConfigured(),
    };

    // Verificação silenciosa

    return checks;
};

export const checkMercadoPagoConfig = () => {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const publicKey = process.env.MP_PUBLIC_KEY;

    const checks = {
        accessToken: {
            configured: !!accessToken,
            value: accessToken ? `${accessToken.substring(0, 20)}...` : 'Não configurado',
            isTest: accessToken?.startsWith('TEST-') || false,
            isProduction: accessToken?.startsWith('APP_USR-') || false,
        },
        publicKey: {
            configured: !!publicKey,
            value: publicKey ? `${publicKey.substring(0, 20)}...` : 'Não configurado',
            isTest: publicKey?.startsWith('TEST-') || false,
            isProduction: publicKey?.startsWith('APP_USR-') || false,
        },
    };

    // Verificação silenciosa

    return checks;
};
