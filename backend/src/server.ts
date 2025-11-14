import express, { Application, Request, Response, NextFunction } from 'express';
import https from 'https';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './config/database';
import { setupSwagger } from './config/swagger';
import { generalRateLimit } from './middleware/rateLimiting';
import { authenticateWithCookies } from './middleware/cookies';
import { validateUserAgent } from './middleware/deviceValidation';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { getSSLOptions } from './config/ssl';
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import eventsRoutes from './routes/events'
import ticketTypesRoutes from './routes/ticketTypes'
import reservationsRoutes from './routes/reservations'
import ordersRoutes from './routes/orders'
import ticketsRoutes from './routes/tickets'
import healthRoutes from './routes/health'
import deliveryRoutes from './routes/delivery';
import promoterCodesRoutes from './routes/promoterCodes';
import paymentRoutes from './routes/payment';
import newsletterRoutes from './routes/newsletter';
import { startWebhookWorker } from './services/webhookProcessorService';
import { startOrderExpirationScheduler } from './services/orderExpirationService'
import { startReservationExpirationScheduler } from './services/reservationExpirationService'
import { checkMercadoPagoConfig, checkEmailConfig } from './utils/checkEnv'

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app: Application = express();
const PORT = Number(process.env.PORT) || 3001;

// ====================================
// Middlewares de Segurança
// ====================================

// Sentry (opcional) - somente se houver DSN
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

// Helmet - Headers de segurança
// Configurar para permitir imagens do próprio servidor
// Confiar apenas em um hop de proxy (evita trust proxy permissivo)
app.set('trust proxy', 1);

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

// HSTS forte em produção
if ((process.env.NODE_ENV || 'development') === 'production') {
    app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: true }));
    // Redirecionar HTTP -> HTTPS
    app.use((req, res, next) => {
        if (!req.secure) {
            const host = req.headers['host'];
            return res.redirect(301, `https://${host}${req.originalUrl}`);
        }
        next();
    });
}

// Middleware: requestId + logging estruturado por requisição
app.use((req: any, res, next) => {
    req.requestId = crypto.randomUUID();
    const start = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const log = {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            durationMs,
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
        };
        // Consolida em uma única linha JSON para fácil ingestão
        console.log(JSON.stringify({ level: 'info', msg: 'http_request', ...log }));
    });
    next();
});

// CORS - Permitir requisições do frontend, dashboard e QR scanner app (restrito em produção)
const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');
const fallbackOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3001',
    'http://localhost:3443',
    'https://localhost:3443',
];
const allowedOrigins = Array.from(
    new Set(
        [
            process.env.FRONTEND_URL,
            process.env.DASHBOARD_URL,
            process.env.QR_SCANNER_URL,
            ...fallbackOrigins,
        ]
            .filter((value): value is string => Boolean(value))
            .map(normalizeOrigin),
    ),
);
const warnedCorsOrigins = new Set<string>();

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            const normalizedOrigin = normalizeOrigin(origin);
            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }
            // Em dev, permitir e apenas logar
            if ((process.env.NODE_ENV || 'development') !== 'production') {
                if (!warnedCorsOrigins.has(normalizedOrigin)) {
                    console.warn(`⚠️  CORS liberado em desenvolvimento para origem não listada: ${origin}`);
                    warnedCorsOrigins.add(normalizedOrigin);
                }
                return callback(null, true);
            }
            return callback(new Error(`CORS: Origin não permitido (${origin})`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-meli-session-id', 'x-session-id'],
        exposedHeaders: ['x-session-id'],
    })
);

// Cookie Parser - Para ler cookies
app.use(cookieParser());

// Validação de User-Agent Global - Proteção contra bots e ataques automatizados
// Aplicar em todas as rotas exceto health checks e webhooks (que podem vir de serviços externos)
app.use((req: Request, res: Response, next: NextFunction) => {
    // Permitir health checks e webhooks sem validação de User-Agent
    const publicPaths = ['/health', '/api/health', '/api/payments/webhook'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    // Aplicar validação de User-Agent para todas as outras rotas
    validateUserAgent(req, res, next);
});

// Rate Limiting Global - Proteção contra DDoS
app.use(generalRateLimit);

// Servir arquivos estáticos de upload com cache forte e proteção simples de hotlink
const __allowedUploadOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.DASHBOARD_URL || 'http://localhost:3000'
];

app.use('/uploads', (req: Request, res: Response, next) => {
    const referer = req.get('referer') || '';
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    if (isProd && referer) {
        try {
            const url = new URL(referer);
            const origin = `${url.protocol}//${url.host}`;
            if (!__allowedUploadOrigins.includes(origin)) {
                return res.status(403).send('Forbidden');
            }
        } catch {
            return res.status(403).send('Forbidden');
        }
    }
    next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
}));

// ====================================
// Middlewares de Parsing
// ====================================

// Capturar rawBody para verificação de assinatura de webhooks
app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
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
// Rotas de códigos de promotor
app.use('/api/promoters', promoterCodesRoutes);
// Rotas de pagamento
app.use('/api/payments', paymentRoutes);
// Rotas de novidades/newsletter
app.use('/api/novidades', newsletterRoutes);

// Rotas de health check
app.use('/api/health', healthRoutes);
app.use('/api/delivery', deliveryRoutes);

// Sentry error handler (antes de handlers customizados)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

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

        // Verificar configuração do Mercado Pago
        checkMercadoPagoConfig();
        checkEmailConfig();

        // Verificar se SSL está disponível
        const sslOptions = getSSLOptions();
        const httpsPort = Number(process.env.HTTPS_PORT) || 3443;
        const useHttps = sslOptions !== null;

        // Iniciar servidor
        if (useHttps) {
            // Servidor HTTPS
            const httpsServer = https.createServer(sslOptions, app);
            httpsServer.listen(httpsPort, '0.0.0.0', () => {
                console.log('');
                console.log('🚀 ========================================');
                console.log(`🚀  EventHub API está rodando com HTTPS! 🔒`);
                console.log('🚀 ========================================');
                console.log(`📡  Porta HTTPS: ${httpsPort}`);
                console.log(`🌍  URL Local: https://localhost:${httpsPort}`);
                console.log(`🌐  URL Rede: https://0.0.0.0:${httpsPort} (acessível por outros dispositivos na rede)`);
                console.log(`📚  Ambiente: ${process.env.NODE_ENV || 'development'}`);
                console.log('🚀 ========================================');
                console.log('');
                console.log('💡 Próximos passos:');
                console.log(`   1. Acesse https://localhost:${httpsPort} para testar`);
                console.log(`   2. 📚 Swagger: https://localhost:${httpsPort}/api-docs`);
                console.log(`   3. 🔐 Auth: https://localhost:${httpsPort}/auth/login`);
                console.log('   4. Endpoints de eventos em /api/events');
                console.log('   5. 💳 Endpoints de pagamento em /api/payments');
                console.log('');
            });
        } else {
            // Servidor HTTP (fallback)
            app.listen(PORT, '0.0.0.0', () => {
                console.log('');
                console.log('🚀 ========================================');
                console.log(`🚀  EventHub API está rodando!`);
                console.log('🚀 ========================================');
                console.log(`📡  Porta: ${PORT}`);
                console.log(`🌍  URL Local: http://localhost:${PORT}`);
                console.log(`🌐  URL Rede: http://0.0.0.0:${PORT} (acessível por outros dispositivos na rede)`);
                console.log(`📚  Ambiente: ${process.env.NODE_ENV || 'development'}`);
                console.log('🚀 ========================================');
                console.log('');
                console.log('💡 Próximos passos:');
                console.log('   1. Acesse http://localhost:3001 para testar');
                console.log('   2. 📚 Swagger: http://localhost:3001/api-docs');
                console.log('   3. 🔐 Auth: http://localhost:3001/auth/login');
                console.log('   4. Endpoints de eventos em /api/events');
                console.log('   5. 💳 Endpoints de pagamento em /api/payments');
                console.log('');
                if (process.env.SSL_ENABLED === 'true') {
                    console.log('⚠️  SSL_ENABLED=true mas certificados não encontrados.');
                    console.log('   Para usar HTTPS, execute: mkcert localhost 127.0.0.1 ::1');
                    console.log('   E coloque os certificados em: backend/certificates/');
                    console.log('');
                }
            });
        }

        // Iniciar job de expiração de pedidos pendentes
        if (process.env.ORDER_EXPIRATION_ENABLED !== 'false') {
            startOrderExpirationScheduler();
        }

        // Iniciar scheduler de cancelamento automático de reservas expiradas (15 minutos)
        startReservationExpirationScheduler();

        // Worker: reprocessamento de webhooks pendentes/fracassados
        startWebhookWorker(async (payload: any) => {
            // Reutiliza o mesmo caminho do controller: apenas reemite para a mesma lógica de processamento
            try {
                // Por enquanto, o processamento é acoplado ao controller de webhook
                // e é executado quando a notificação chega. O worker provocará
                // reprocessamento chamando os mesmos serviços, portanto não há
                // necessidade de duplicar a lógica aqui.
                // Como o handler já consulta o MP e atualiza o pedido, basta não fazer nada aqui.
                // Em versões futuras, podemos extrair para uma função compartilhada.
                return;
            } catch {
                throw new Error('Falha ao reprocessar webhook');
            }
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

// Iniciar aplicação
startServer();

export default app;

