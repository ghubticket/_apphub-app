/**
 * Silencia TODOS os console.log (desenvolvimento e produção)
 * 
 * Sentry faz todo o monitoramento - não precisamos de logs no console
 * 
 * Este arquivo deve ser importado ANTES de qualquer outro código
 * Importar no início de instrument.ts
 */

// Silenciar console em TODOS os ambientes (Sentry faz o monitoramento)
const noop = () => {};

// Salvar console original (caso precise para debug emergencial)
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
};

// Substituir por funções vazias - SEMPRE (desenvolvimento e produção)
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;

// Exportar console original caso precise para debug emergencial
// Uso: import { originalConsole } from './utils/silenceConsole';
// originalConsole.error('debug emergencial');
export const originalConsoleForEmergency = originalConsole;

// Exportar flag
export const isConsoleSilenced = true;

