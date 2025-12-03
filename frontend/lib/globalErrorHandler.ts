/**
 * Helper para disparar erros globais
 * Pode ser usado de qualquer lugar, incluindo interceptors do axios
 */

let globalErrorHandler: ((error: { title?: string; message?: string; errorType?: 'network' | 'server' | 'maintenance' | 'unknown' }) => void) | null = null;

/**
 * Registra o handler de erro global
 * Deve ser chamado no GlobalErrorProvider
 */
export function registerGlobalErrorHandler(
    handler: (error: { title?: string; message?: string; errorType?: 'network' | 'server' | 'maintenance' | 'unknown' }) => void
) {
    globalErrorHandler = handler;
}

/**
 * Remove o handler de erro global
 */
export function unregisterGlobalErrorHandler() {
    globalErrorHandler = null;
}

/**
 * Dispara um erro global
 * Pode ser chamado de qualquer lugar (interceptors, componentes, etc.)
 */
export function triggerGlobalError(error: {
    title?: string;
    message?: string;
    errorType?: 'network' | 'server' | 'maintenance' | 'unknown';
}) {
    if (globalErrorHandler) {
        globalErrorHandler(error);
    }
}

/**
 * Verifica se um erro do axios deve disparar o erro global
 */
export function shouldTriggerGlobalError(error: any): boolean {
    // Não disparar se não for um erro crítico
    if (!error) return false;

    // Erros de rede (sem resposta do servidor)
    if (!error.response) {
        // Erro de conexão, timeout, ou rede
        if (
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ERR_NETWORK' ||
            error.code === 'ERR_INTERNET_DISCONNECTED' ||
            error.message?.includes('Network Error') ||
            error.message?.includes('timeout')
        ) {
            return true;
        }
        return true; // Outros erros sem resposta também são críticos
    }

    // Erros 500+ do servidor
    const status = error.response?.status;
    if (status && status >= 500) {
        return true;
    }

    // Erro 503 (Service Unavailable) - servidor em manutenção
    if (status === 503) {
        return true;
    }

    // Erro 504 (Gateway Timeout) - timeout do servidor
    if (status === 504) {
        return true;
    }

    return false;
}

/**
 * Determina o tipo de erro baseado no erro do axios
 */
export function getErrorType(error: any): 'network' | 'server' | 'maintenance' | 'unknown' {
    // Erro de rede (sem resposta)
    if (!error.response) {
        return 'network';
    }

    const status = error.response?.status;

    // Manutenção
    if (status === 503) {
        return 'maintenance';
    }

    // Erros do servidor (500+)
    if (status && status >= 500) {
        return 'server';
    }

    return 'unknown';
}

