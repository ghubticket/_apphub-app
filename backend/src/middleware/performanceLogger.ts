import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
    startTime: number;
    responseTime: number;
}

// Armazenar métricas por request
const metricsMap = new WeakMap<Request, PerformanceMetrics>();

/**
 * Middleware de logging de performance
 * Registra tempo de resposta e adiciona headers de performance
 * 
 * Nota: Medição de queries MongoDB é feita via plugin do Mongoose
 * que deve ser aplicado aos schemas individualmente se necessário
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
    // Verificar se deve logar (apenas em dev ou se variável de ambiente estiver habilitada)
    const shouldLog = 
        process.env.NODE_ENV === 'development' || 
        process.env.ENABLE_PERFORMANCE_LOGGING === 'true';
    
    if (!shouldLog) {
        return next();
    }
    
    const startTime = Date.now();
    
    // Inicializar métricas
    const metrics: PerformanceMetrics = {
        startTime,
        responseTime: 0,
    };
    metricsMap.set(req, metrics);
    
    // Flag para garantir que headers só sejam definidos uma vez
    let headersAdded = false;
    
    // Função para adicionar headers de performance
    const addPerformanceHeaders = () => {
        if (!headersAdded && !res.headersSent) {
            try {
                const endTime = Date.now();
                metrics.responseTime = endTime - startTime;
                res.setHeader('X-Response-Time', `${metrics.responseTime}ms`);
                headersAdded = true;
            } catch (error) {
                // Ignorar erro se headers já foram enviados
                headersAdded = true; // Marcar como adicionado para evitar novas tentativas
            }
        }
    };
    
    // Interceptar métodos de resposta do Express
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;
    
    res.json = function(body?: any) {
        addPerformanceHeaders();
        return originalJson.call(this, body);
    };
    
    res.send = function(body?: any) {
        addPerformanceHeaders();
        return originalSend.call(this, body);
    };
    
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
        addPerformanceHeaders();
        return originalEnd.call(this, chunk, encoding, cb);
    };
    
    // Interceptar fim da resposta para logging
    res.on('finish', () => {
        const endTime = Date.now();
        metrics.responseTime = endTime - startTime;
        
        // Logar se for lento (> 1s)
        if (metrics.responseTime > 1000) {
            const logData = {
                method: req.method,
                path: req.originalUrl || req.url,
                status: res.statusCode,
                responseTime: `${metrics.responseTime}ms`,
            };
            console.warn('[Performance] ⚠️ Endpoint lento detectado:', logData);
        }
    });
    
    next();
};

/**
 * Função auxiliar para obter métricas de uma requisição
 */
export const getPerformanceMetrics = (req: Request): PerformanceMetrics | null => {
    return metricsMap.get(req) || null;
};

