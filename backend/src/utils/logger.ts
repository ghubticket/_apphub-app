/**
 * Logger estruturado com Winston
 * Logs locais apenas - monitoramento de erros via Sentry
 */

import winston from 'winston';
import { format } from 'winston';

// Configurações do Logger
const SERVICE_NAME = process.env.SERVICE_NAME || 'eventhub-backend';
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

// Formato customizado para logs estruturados
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    // Adicionar metadata se existir
    const metaKeys = Object.keys(metadata).filter(key => 
      key !== 'timestamp' && key !== 'level' && key !== 'message' && key !== 'service'
    );
    
    if (metaKeys.length > 0) {
      const meta = metaKeys.reduce((acc, key) => {
        acc[key] = metadata[key];
        return acc;
      }, {} as Record<string, any>);
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// Formato para console (mais legível em desenvolvimento)
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} ${level} ${message}`;
    
    const metaKeys = Object.keys(metadata).filter(key => 
      key !== 'timestamp' && key !== 'level' && key !== 'message' && key !== 'service'
    );
    
    if (metaKeys.length > 0) {
      const meta = metaKeys.reduce((acc, key) => {
        acc[key] = metadata[key];
        return acc;
      }, {} as Record<string, any>);
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Transports
const transports: winston.transport[] = [];

// Console transport - Habilitar apenas se explicitamente solicitado ou em desenvolvimento
// Em produção, usar apenas se ENABLE_CONSOLE_LOGS estiver definido
if (NODE_ENV === 'development' || process.env.ENABLE_CONSOLE_LOGS === 'true') {
  transports.push(
    new winston.transports.Console({
      format: NODE_ENV === 'development' ? consoleFormat : customFormat,
      level: NODE_ENV === 'development' ? 'debug' : 'info',
    })
  );
}

// File transport para produção (opcional)
if (NODE_ENV === 'production' && process.env.LOG_FILE_PATH) {
  transports.push(
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH,
      format: customFormat,
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// CRÍTICO: Sempre ter pelo menos um transporte para evitar o erro do Winston
// Se não há transportes configurados, usar um console silencioso em produção
// ou console normal em desenvolvimento
if (transports.length === 0) {
  transports.push(
    new winston.transports.Console({
      format: NODE_ENV === 'development' ? consoleFormat : customFormat,
      level: NODE_ENV === 'production' ? 'warn' : 'debug', // Em produção, apenas warnings e erros
      silent: NODE_ENV === 'production' && process.env.ENABLE_CONSOLE_LOGS !== 'true', // Silenciar em produção se não habilitado
    })
  );
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
  format: customFormat,
  defaultMeta: {
    service: SERVICE_NAME,
    env: NODE_ENV,
    version: APP_VERSION,
  },
  transports,
  // Não lançar exceções em produção
  exceptionHandlers: transports,
  rejectionHandlers: transports,
});

// Helper para adicionar contexto aos logs
export const createLogger = (context?: string) => {
  if (!context) return logger;
  
  return logger.child({
    context,
  });
};

// Exportar logger padrão
export default logger;

// Exportar métodos específicos para facilitar migração
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  verbose: (message: string, meta?: any) => logger.verbose(message, meta),
};

