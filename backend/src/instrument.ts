/**
 * Sentry Instrumentation
 * Este arquivo deve ser importado ANTES de qualquer outro código
 * para garantir que o Sentry capture todos os erros desde o início
 */

import * as Sentry from '@sentry/node';

// Inicializar Sentry apenas se DSN estiver configurado
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        
        // Performance Monitoring
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1), // 10% das transações
        
        // Setting this option to true will send default PII data to Sentry
        // For example, automatic IP address collection on events
        sendDefaultPii: true,
        
        // Integrações
        integrations: [
            // Captura erros HTTP e tracing
            Sentry.httpIntegration({ tracing: true }),
            // Captura erros de promises rejeitadas
            Sentry.onUncaughtExceptionIntegration({
                exitEvenIfOtherHandlersAreRegistered: false,
            }),
            Sentry.onUnhandledRejectionIntegration({ mode: 'warn' }),
        ],
        
        // Filtros - não enviar tudo, apenas erros importantes
        beforeSend(event, hint) {
            // Filtrar erros de rate limiting (não são erros reais)
            if (event.message?.includes('Rate limit') || event.message?.includes('Too many requests')) {
                return null; // Não enviar ao Sentry
            }
            
            // Filtrar erros 404 (não são erros críticos)
            if (event.tags?.statusCode === 404) {
                return null;
            }
            
            return event;
        },
        
        // Ignorar certos tipos de erros
        ignoreErrors: [
            'ECONNREFUSED', // Conexão recusada (pode ser temporário)
            'ETIMEDOUT', // Timeout (pode ser temporário)
            'ENOTFOUND', // DNS não encontrado
        ],
    });
}
