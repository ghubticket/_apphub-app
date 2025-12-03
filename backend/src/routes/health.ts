import express from 'express';
import { connectDatabase } from '../config/database';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import * as Sentry from '@sentry/node';

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

// Rota de teste do Sentry (APENAS PARA DESENVOLVIMENTO/TESTE)
// ATENÇÃO: Remover ou proteger em produção!
// Opcional: Adicionar verificação de ambiente para desabilitar em produção
router.get('/test-sentry', (req, res) => {
    // Opcional: Desabilitar em produção
    // if (process.env.NODE_ENV === 'production') {
    //     return res.status(404).json({ success: false, message: 'Rota não encontrada' });
    // }
    
    try {
        // Forçar um erro para testar o Sentry
        throw new Error('Teste de erro do Sentry - Esta é uma rota de teste');
    } catch (error: any) {
        // Capturar erro no Sentry
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(error, {
                tags: {
                    test: 'true',
                    route: '/api/health/test-sentry',
                },
                extra: {
                    message: 'Este é um teste intencional do Sentry',
                    timestamp: new Date().toISOString(),
                },
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro de teste do Sentry capturado',
            error: 'Este erro foi enviado ao Sentry para teste',
        });
    }
});

export default router;
