/**
 * FUNÇÕES DE TESTE - APENAS PARA DESENVOLVIMENTO
 * Use estas funções no console do browser para testar a modal de erro global
 * 
 * Exemplo:
 *   window.testGlobalError('network')
 *   window.testGlobalError('server')
 *   window.testGlobalError('maintenance')
 */

import { triggerGlobalError } from './globalErrorHandler';

/**
 * Testa a modal de erro global
 * @param type - Tipo de erro: 'network' | 'server' | 'maintenance' | 'unknown'
 */
export function testGlobalError(type: 'network' | 'server' | 'maintenance' | 'unknown' = 'network') {
    const messages = {
        network: {
            title: 'Problema de Conexão',
            message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
            errorType: 'network' as const,
        },
        server: {
            title: 'Serviço Indisponível',
            message: 'Estamos enfrentando uma instabilidade técnica. Nossa equipe já foi notificada e está trabalhando para resolver. Por favor, tente novamente em alguns minutos.',
            errorType: 'server' as const,
        },
        maintenance: {
            title: 'Em Manutenção',
            message: 'Estamos realizando uma manutenção programada. O serviço voltará em breve. Agradecemos sua compreensão.',
            errorType: 'maintenance' as const,
        },
        unknown: {
            title: 'Erro Inesperado',
            message: 'Ocorreu um erro inesperado. Nossa equipe foi notificada. Por favor, tente novamente em alguns instantes.',
            errorType: 'unknown' as const,
        },
    };

    const errorConfig = messages[type];
    triggerGlobalError(errorConfig);
    
    return errorConfig;
}

/**
 * Testa erro de conexão simulando um timeout
 */
export function testConnectionTimeout() {
    triggerGlobalError({
        errorType: 'network',
        title: 'Problema de Conexão',
        message: 'O servidor demorou muito para responder. Verifique sua conexão com a internet e tente novamente.',
    });
}

/**
 * Testa erro 500 do servidor
 */
export function testServerError() {
    triggerGlobalError({
        errorType: 'server',
        title: 'Serviço Indisponível',
        message: 'Ocorreu um erro interno no servidor. Nossa equipe já foi notificada e está trabalhando para resolver. Por favor, tente novamente em alguns minutos.',
    });
}

// Expor funções no window apenas em desenvolvimento
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    (window as any).testGlobalError = testGlobalError;
    (window as any).testConnectionTimeout = testConnectionTimeout;
    (window as any).testServerError = testServerError;
}

