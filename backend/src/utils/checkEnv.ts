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
        isConfigured: isEmailConfigured()
    };

    if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Verificação de Configuração do Resend (Email):');
        console.log('  API Key:', checks.apiKey.configured ? '✅ Configurada' : '❌ Não configurada');
        if (checks.apiKey.configured) {
            console.log('    Valor:', checks.apiKey.value);
        }
        console.log('  From Email:', checks.fromEmail.configured ? '✅ Configurado' : '⚠️ Usando padrão');
        if (checks.fromEmail.configured) {
            console.log('    Valor:', checks.fromEmail.value);
        }
        console.log('  Status:', checks.isConfigured ? '✅ Email habilitado' : '❌ Email desabilitado');
    }

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
            isProduction: accessToken?.startsWith('APP_USR-') || false
        },
        publicKey: {
            configured: !!publicKey,
            value: publicKey ? `${publicKey.substring(0, 20)}...` : 'Não configurado',
            isTest: publicKey?.startsWith('TEST-') || false,
            isProduction: publicKey?.startsWith('APP_USR-') || false
        }
    };

    if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Verificação de Configuração do Mercado Pago:');
        console.log('  Access Token:', checks.accessToken.configured ? '✅ Configurado' : '❌ Não configurado');
        if (checks.accessToken.configured) {
            console.log('    Tipo:', checks.accessToken.isTest ? '🧪 Teste (Sandbox)' : checks.accessToken.isProduction ? '🚀 Produção' : '⚠️ Tipo desconhecido');
            console.log('    Valor:', checks.accessToken.value);
        }
        console.log('  Public Key:', checks.publicKey.configured ? '✅ Configurado' : '❌ Não configurado');
        if (checks.publicKey.configured) {
            console.log('    Tipo:', checks.publicKey.isTest ? '🧪 Teste (Sandbox)' : checks.publicKey.isProduction ? '🚀 Produção' : '⚠️ Tipo desconhecido');
            console.log('    Valor:', checks.publicKey.value);
        }
    }

    return checks;
};

