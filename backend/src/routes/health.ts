import express from 'express';
import { connectDatabase } from '../config/database';
import rateLimit from 'express-rate-limit';

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
        console.error('Database connection check failed:', error);
        return false;
    }
}

export default router;
