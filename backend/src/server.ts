import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './config/database';
import { setupSwagger } from './config/swagger';
import { generalRateLimit } from './middleware/rateLimiting';
import { authenticateWithCookies } from './middleware/cookies';
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import eventsRoutes from './routes/events'
import ticketTypesRoutes from './routes/ticketTypes'
import reservationsRoutes from './routes/reservations'
import ordersRoutes from './routes/orders'
import ticketsRoutes from './routes/tickets'
import healthRoutes from './routes/health'
import deliveryRoutes from './routes/delivery';
import { startOrderExpirationScheduler } from './services/orderExpirationService'

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app: Application = express();
const PORT = process.env.PORT || 3001;

// ====================================
// Middlewares de Segurança
// ====================================

// Helmet - Headers de segurança
// Configurar para permitir imagens do próprio servidor
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "http://localhost:3001", "https:"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
}));

// CORS - Permitir requisições do frontend e dashboard
app.use(
    cors({
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            process.env.DASHBOARD_URL || 'http://localhost:3000'
        ],
        credentials: true,
    })
);

// Cookie Parser - Para ler cookies
app.use(cookieParser());

// Rate Limiting Global - Proteção contra DDoS
app.use(generalRateLimit);

// Servir arquivos estáticos de upload
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ====================================
// Middlewares de Parsing
// ====================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================================
// Swagger Documentation
// ====================================

setupSwagger(app);

// ====================================
// Middleware de Autenticação
// ====================================

// Cookie authentication middleware
app.use(authenticateWithCookies);

// ====================================
// Rotas
// ====================================

// Rotas de autenticação
app.use('/api/auth', authRoutes);
// Rotas de usuários
app.use('/api/users', usersRoutes);
// Rotas de eventos
app.use('/api/events', eventsRoutes);
// Rotas de tipos de ingresso (nested em events e standalone)
app.use('/api/events', ticketTypesRoutes);
app.use('/api', ticketTypesRoutes);
// Rotas de reservas temporárias
app.use('/api/reservations', reservationsRoutes);
// Rotas de pedidos
app.use('/api/orders', ordersRoutes);
// Rotas de ingressos
app.use('/api/tickets', ticketsRoutes);

// Rotas de health check
app.use('/api/health', healthRoutes);
app.use('/api/delivery', deliveryRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Página inicial da API
 *     description: Retorna informações básicas sobre a API EventHub
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Informações da API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "EventHub API está rodando! 🎉"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'EventHub API está rodando! 🎉',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check da API
 *     description: Verifica se a API está funcionando corretamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API funcionando normalmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// ====================================
// Tratamento de Erros 404
// ====================================

app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        path: req.path,
    });
});

// ====================================
// Iniciar Servidor
// ====================================

const startServer = async () => {
    try {
        // Conectar ao banco de dados
        await connectDatabase();

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('');
            console.log('🚀 ========================================');
            console.log(`🚀  EventHub API está rodando!`);
            console.log('🚀 ========================================');
            console.log(`📡  Porta: ${PORT}`);
            console.log(`🌍  URL: http://localhost:${PORT}`);
            console.log(`📚  Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log('🚀 ========================================');
            console.log('');
            console.log('💡 Próximos passos:');
            console.log('   1. Acesse http://localhost:3001 para testar');
            console.log('   2. 📚 Swagger: http://localhost:3001/api-docs');
            console.log('   3. 🔐 Auth: http://localhost:3001/auth/login');
            console.log('   4. Endpoints de eventos em /api/events');
            console.log('');
        });

        // Iniciar job de expiração de pedidos pendentes
        if (process.env.ORDER_EXPIRATION_ENABLED !== 'false') {
            startOrderExpirationScheduler();
        }
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

// Iniciar aplicação
startServer();

export default app;

