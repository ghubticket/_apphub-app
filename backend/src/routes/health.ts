import express from 'express';
import { connectDatabase } from '../config/database';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

const router = express.Router();

// Rate limiting específico para health checks (mais permissivo, mas ainda limitado)
// Health checks são públicos mas não devem ser abusados
const healthCheckRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // máximo 60 requisições por minuto por IP
    message: {
        success: false,
        message: 'Muitas requisições de health check. Aguarde um momento.',
        errors: ['Rate limit excedido para health check'],
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Contar todas as requisições
});

// Aplicar rate limiting em todos os health checks
router.use(healthCheckRateLimit);

// Health check geral
// SEGURANÇA: Remove informações sensíveis (uptime) que podem ser usadas por atacantes
router.get('/', async (req, res) => {
    try {
        // Verificar conexão com banco
        const dbStatus = await checkDatabaseConnection();

        res.status(200).json({
            status: 'online',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus,
                api: 'online',
            },
            // REMOVIDO: uptime - pode revelar quando o servidor foi reiniciado
        });
    } catch (error) {
        res.status(503).json({
            status: 'offline',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable',
        });
    }
});

// Health check simples (sem verificação de banco)
router.get('/simple', (req, res) => {
    res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'API is running',
    });
});

// Health check do banco de dados
router.get('/db', async (req, res) => {
    try {
        const dbStatus = await checkDatabaseConnection();

        res.status(200).json({
            status: 'online',
            service: 'database',
            timestamp: new Date().toISOString(),
            connected: dbStatus,
        });
    } catch (error) {
        res.status(503).json({
            status: 'offline',
            service: 'database',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
        });
    }
});

// Health check da autenticação
// SEGURANÇA: Remove detalhes de features que podem ser usados para fingerprinting
router.get('/auth', async (req, res) => {
    try {
        res.status(200).json({
            status: 'online',
            service: 'authentication',
            timestamp: new Date().toISOString(),
            // REMOVIDO: features - não expor detalhes de implementação
        });
    } catch (error) {
        res.status(503).json({
            status: 'offline',
            service: 'authentication',
            timestamp: new Date().toISOString(),
            error: 'Auth service unavailable',
        });
    }
});

// Função para verificar conexão com banco
async function checkDatabaseConnection(): Promise<boolean> {
    try {
        // Aqui você pode implementar uma verificação real do banco
        // Por exemplo, fazer uma query simples
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Database connection check failed:', { error: errorMessage });
        return false;
    }
}

// Endpoint de teste para logs do Datadog
router.get('/test-logs', (req, res) => {
    try {
        // Teste 1: Log de info
        logger.info('🔍 Test log - Datadog connection', {
            timestamp: new Date().toISOString(),
            service: 'eventhub-backend',
            test: true,
            level: 'info',
            message: 'Este é um log de teste para verificar se o Datadog está recebendo logs',
        });

        // Teste 2: Log de warning
        logger.warn('⚠️ Test warning log', {
            timestamp: new Date().toISOString(),
            service: 'eventhub-backend',
            test: true,
            level: 'warn',
            message: 'Este é um log de aviso de teste',
        });

        // Teste 3: Log de erro (simulado)
        logger.error('❌ Test error log', {
            timestamp: new Date().toISOString(),
            service: 'eventhub-backend',
            test: true,
            level: 'error',
            message: 'Este é um log de erro de teste (não é um erro real)',
            simulated: true,
        });

        // Teste 4: Log com metadata complexa
        logger.info('📊 Test log with complex metadata', {
            timestamp: new Date().toISOString(),
            service: 'eventhub-backend',
            test: true,
            orderId: 'test-123',
            customerId: 'test-456',
            amount: 100.50,
            paymentMethod: 'test',
            metadata: {
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                path: req.path,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Logs de teste enviados ao Datadog!',
            timestamp: new Date().toISOString(),
            instructions: {
                step1: 'Acesse: https://us5.datadoghq.com/logs',
                step2: 'Filtre por: service:eventhub-backend',
                step3: 'Ou filtre por: test:true',
                step4: 'Você deve ver 4 logs de teste',
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Erro ao gerar logs de teste:', { error: errorMessage });
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar logs de teste',
            error: errorMessage,
        });
    }
});

export default router;
