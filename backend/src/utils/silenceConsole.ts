/**
 * Silencia console.log em produção (Sentry faz o monitoramento)
 * Em desenvolvimento, mantém os logs para facilitar debug
 * 
 * Este arquivo deve ser importado ANTES de qualquer outro código
 * Importar no início de instrument.ts
 */

// Salvar console original (caso precise para debug emergencial)
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
};

// Silenciar console apenas em PRODUÇÃO (em dev, manter logs para debug)
const isProduction = process.env.NODE_ENV === 'production';
const noop = () => {};

if (isProduction) {
    // Em produção, silenciar (Sentry faz o monitoramento)
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    // Manter console.error e console.warn mesmo em produção para erros críticos
    // console.error = noop;
    // console.warn = noop;
} else {
    // Em desenvolvimento, manter todos os logs
    // Não fazer nada - console funciona normalmente
}

// Exportar console original caso precise para debug emergencial
// Uso: import { originalConsole } from './utils/silenceConsole';
// originalConsole.error('debug emergencial');
export const originalConsoleForEmergency = originalConsole;

// Exportar flag
export const isConsoleSilenced = true;

