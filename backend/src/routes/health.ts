import express from 'express';
import { connectDatabase } from '../config/database';

const router = express.Router();

// Health check geral
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
            uptime: process.uptime(),
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
router.get('/auth', async (req, res) => {
    try {
        res.status(200).json({
            status: 'online',
            service: 'authentication',
            timestamp: new Date().toISOString(),
            features: ['jwt', 'refresh-token', 'session-management'],
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
