/**
 * Utilitário para verificar se as variáveis de ambiente estão configuradas
 * Pode ser usado para debug ou validação na inicialização
 */
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

