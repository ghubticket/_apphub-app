/**
 * Transport HTTP para Datadog (compatível com Vercel/serverless)
 * Envia logs diretamente via HTTP API do Datadog
 */

import axios from 'axios';
import Transport from 'winston-transport';

const DD_API_KEY = process.env.DD_API_KEY;
const DD_SITE = process.env.DD_SITE || 'us5.datadoghq.com';
const DD_SERVICE = process.env.DD_SERVICE || 'eventhub-backend';
const DD_ENV = process.env.NODE_ENV || process.env.DD_ENV || 'production';
const DD_VERSION = process.env.DD_VERSION || '1.0.0';

// Buffer para acumular logs e enviar em lote
let logBuffer: any[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 segundos

/**
 * Envia logs em lote ao Datadog
 */
async function flushLogs() {
  if (logBuffer.length === 0 || !DD_API_KEY) {
    return;
  }

  const logsToSend = logBuffer.splice(0, BATCH_SIZE);
  
  try {
    const logs = logsToSend.map((log) => ({
      ddsource: 'nodejs',
      ddtags: `env:${DD_ENV},version:${DD_VERSION},service:${DD_SERVICE}`,
      hostname: process.env.VERCEL ? 'vercel' : process.env.DD_HOSTNAME || 'unknown',
      service: DD_SERVICE,
      status: log.level === 'error' ? 'error' : log.level === 'warn' ? 'warn' : 'info',
      message: log.message,
      ...log.metadata,
      timestamp: log.timestamp || Date.now(),
    }));

    await axios.post(
      `https://http-intake.logs.${DD_SITE}/api/v2/logs`,
      logs,
      {
        headers: {
          'DD-API-KEY': DD_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
  } catch (error) {
    // Em caso de erro, não bloquear a aplicação
    // Apenas logar no console (fallback)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Erro ao enviar logs ao Datadog:', error);
    }
  }

  // Se ainda houver logs no buffer, agendar próximo flush
  if (logBuffer.length > 0) {
    scheduleFlush();
  }
}

/**
 * Agenda o próximo flush
 */
function scheduleFlush() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  flushTimeout = setTimeout(flushLogs, FLUSH_INTERVAL);
}

/**
 * Transport HTTP para Winston
 * Implementa a interface correta do Winston Transport
 */
export class DatadogHttpTransport extends Transport {
  constructor(opts?: any) {
    super(opts);
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (!DD_API_KEY) {
      callback();
      return;
    }

    // Extrair metadata de forma segura
    const metadata: any = {};
    if (info.metadata) {
      Object.assign(metadata, info.metadata);
    }
    // Tentar extrair do splat se existir
    const splatKey = Symbol.for('splat');
    if (info[splatKey] && Array.isArray(info[splatKey]) && info[splatKey].length > 0) {
      Object.assign(metadata, info[splatKey][0] || {});
    }
    // Extrair outras propriedades do info
    Object.keys(info).forEach((key) => {
      if (!['level', 'message', 'timestamp', 'metadata', splatKey].includes(key)) {
        metadata[key] = info[key];
      }
    });

    logBuffer.push({
      level: info.level,
      message: info.message,
      metadata: metadata,
      timestamp: info.timestamp || Date.now(),
    });

    // Se o buffer estiver cheio, enviar imediatamente
    if (logBuffer.length >= BATCH_SIZE) {
      flushLogs();
    } else {
      scheduleFlush();
    }

    callback();
  }
}

/**
 * Envia log diretamente (para uso imediato)
 */
export async function sendLogDirectly(level: string, message: string, metadata: any = {}) {
  if (!DD_API_KEY) {
    return;
  }

  try {
    const log = {
      ddsource: 'nodejs',
      ddtags: `env:${DD_ENV},version:${DD_VERSION},service:${DD_SERVICE}`,
      hostname: process.env.VERCEL ? 'vercel' : process.env.DD_HOSTNAME || 'unknown',
      service: DD_SERVICE,
      status: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
      message: message,
      ...metadata,
      timestamp: Date.now(),
    };

    await axios.post(
      `https://http-intake.logs.${DD_SITE}/api/v2/logs`,
      [log],
      {
        headers: {
          'DD-API-KEY': DD_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
  } catch (error) {
    // Em caso de erro, não bloquear
    if (process.env.NODE_ENV !== 'production') {
      console.error('Erro ao enviar log ao Datadog:', error);
    }
  }
}

