/**
 * Logger estruturado com Winston
 * Integração com Datadog para monitoramento em produção
 */

import winston from 'winston';
import { format } from 'winston';

// Configurações do Datadog
const DD_API_KEY = process.env.DD_API_KEY;
const DD_SITE = process.env.DD_SITE || 'datadoghq.com';
const DD_SERVICE = process.env.DD_SERVICE || 'eventhub-backend';
const DD_ENV = process.env.NODE_ENV || 'development';
const DD_VERSION = process.env.DD_VERSION || '1.0.0';
const DD_SOURCE = 'nodejs';

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

// Console transport (sempre ativo)
transports.push(
  new winston.transports.Console({
    format: DD_ENV === 'production' ? customFormat : consoleFormat,
    level: process.env.LOG_LEVEL || (DD_ENV === 'production' ? 'info' : 'debug'),
  })
);

// File transport para produção (opcional)
if (DD_ENV === 'production' && process.env.LOG_FILE_PATH) {
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

// Datadog transport (apenas se API key estiver configurada)
// Para Vercel/serverless, usar HTTP API direta (mais confiável)
if (DD_API_KEY && DD_ENV === 'production') {
  // Sempre usar HTTP transport para garantir compatibilidade com Vercel
  try {
    const { DatadogHttpTransport } = require('./datadogHttpTransport');
    transports.push(
      new DatadogHttpTransport({
        level: 'info', // Enviar apenas info e acima para o Datadog
      })
    );
  } catch (error) {
    // Fallback: tentar datadog-winston se HTTP transport falhar
    try {
      const DatadogWinston = require('datadog-winston');
      transports.push(
        new DatadogWinston({
          apiKey: DD_API_KEY,
          hostname: process.env.DD_HOSTNAME || (process.env.VERCEL ? 'vercel' : require('os').hostname()),
          service: DD_SERVICE,
          ddsource: DD_SOURCE,
          ddtags: `env:${DD_ENV},version:${DD_VERSION}`,
          level: 'info',
        })
      );
    } catch (winstonError) {
      // Se ambos falharem, apenas logar aviso
      console.warn('⚠️ Datadog transport não disponível. Logs não serão enviados ao Datadog.');
    }
  }
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (DD_ENV === 'production' ? 'info' : 'debug'),
  format: customFormat,
  defaultMeta: {
    service: DD_SERVICE,
    env: DD_ENV,
    version: DD_VERSION,
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
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
    // Enviar diretamente ao Datadog também (para garantir em Vercel)
    if (DD_API_KEY && DD_ENV === 'production') {
      try {
        const { sendLogDirectly } = require('./datadogHttpTransport');
        sendLogDirectly('error', message, meta).catch(() => {
          // Ignorar erros silenciosamente
        });
      } catch {
        // Ignorar se não conseguir importar
      }
    }
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
    if (DD_API_KEY && DD_ENV === 'production') {
      try {
        const { sendLogDirectly } = require('./datadogHttpTransport');
        sendLogDirectly('warn', message, meta).catch(() => {});
      } catch {}
    }
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
    if (DD_API_KEY && DD_ENV === 'production') {
      try {
        const { sendLogDirectly } = require('./datadogHttpTransport');
        sendLogDirectly('info', message, meta).catch(() => {});
      } catch {}
    }
  },
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  verbose: (message: string, meta?: any) => logger.verbose(message, meta),
};

