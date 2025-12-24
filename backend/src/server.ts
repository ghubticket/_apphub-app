import express, { Application, Request, Response, NextFunction } from 'express';
import https from 'https';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import logger from './utils/logger';
import { connectDatabase } from './config/database';
import { setupSwagger } from './config/swagger';
import { generalRateLimit } from './middleware/rateLimiting';
import { authenticateWithCookies } from './middleware/cookies';
import { validateUserAgent } from './middleware/deviceValidation';
import { sanitizeBody } from './middleware/sanitization';
import { performanceLogger } from './middleware/performanceLogger';
import crypto from 'crypto';
// Log inicial para debug
console.log('📝 Arquivo server.ts carregado');

// IMPORTANT: Importar instrument.ts ANTES de qualquer outro código
import './instrument';
import * as Sentry from '@sentry/node';
import { getSSLOptions } from './config/ssl';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import eventsRoutes from './routes/events';
import eventDetailsRoutes from './routes/eventDetails';
import ticketTypesRoutes from './routes/ticketTypes';
import ordersRoutes from './routes/orders';
import catalogRoutes from './routes/catalog';
import ticketsRoutes from './routes/tickets';
import healthRoutes from './routes/health';
import deliveryRoutes from './routes/delivery';
import promoterCodesRoutes from './routes/promoterCodes';
import paymentRoutes from './routes/payment';
import parcelledOrdersRoutes from './routes/parcelledOrders';
import newsletterRoutes from './routes/newsletter';
import supportRoutes from './routes/support';
import transportPackagesRoutes from './routes/transportPackages';
import { startWebhookWorker } from './services/webhookProcessorService';
import { startOrderExpirationScheduler } from './services/orderExpirationService';
import { startParcelledOrderSchedulers } from './services/parcelledOrderService';
import { checkMercadoPagoConfig, checkEmailConfig } from './utils/checkEnv';

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app: Application = express();
const PORT = Number(process.env.PORT) || 3002; // Porta padrão: 3002 (3001 é usada pelo frontend)

// ====================================
// Middlewares de Segurança
// ====================================

// Sentry request handler será configurado após as rotas

// Helmet - Headers de segurança
// Configurar para permitir imagens do próprio servidor
// Confiar apenas em um hop de proxy (evita trust proxy permissivo)
app.set('trust proxy', 1);

// Gerar nonce para CSP (Content Security Policy)
// Nonce permite estilos/scripts específicos sem usar 'unsafe-inline'
app.use((req: any, _res, next) => {
    req.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Aplicar Helmet com CSP, mas desabilitar CSP para Swagger UI
app.use((req: Request, res: Response, next: NextFunction) => {
    // Desabilitar CSP apenas para Swagger UI (precisa de estilos inline)
    if (req.path?.startsWith('/api-docs')) {
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            contentSecurityPolicy: false, // Desabilitar CSP para Swagger
        })(req, res, next);
    } else {
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    defaultSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'http://localhost:3001', 'https:'],
                    scriptSrc: [
                        "'self'",
                        (req: any) => `'nonce-${req.nonce}'`, // Permitir scripts com nonce
                    ],
                    styleSrc: [
                        "'self'",
                        (req: any) => `'nonce-${req.nonce}'`, // Permitir estilos com nonce
                        // Manter 'unsafe-inline' apenas em desenvolvimento para compatibilidade
                        ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-inline'"] : []),
                    ],
                    fontSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'", 'https:'],
                    frameSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
                },
            },
        })(req, res, next);
    }
});

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
            timestamp: new Date().toISOString(),
        };
        // Log removido - usar sistema de logging apropriado em produção
    });
    next();
});

// ====================================
// Middlewares de Parsing - DEVE VIR PRIMEIRO
// ====================================
// CRÍTICO: Body parsing deve vir ANTES de qualquer outro middleware
// que possa tentar ler o body (compression, etc)

// Middleware condicional para body parsing
// Evita "Body has already been read" para rotas que não usam body
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'unknown';
    const contentLength = req.get('content-length');
    const contentType = req.get('content-type') || '';
    const path = req.path;
    const method = req.method;

    // CRÍTICO: Rota generate-payment NUNCA usa body - pular parsing completamente
    // Marcar a requisição para que nenhum parser seja aplicado
    const isGeneratePayment = path.includes('/generate-payment');

    // Verificar se o body já foi lido (pode acontecer em produção com proxies)
    // Se já foi lido, simplesmente definir body como vazio e continuar
    if ((req as any)._readableState?.ended || (req as any).readableEnded) {
        logger.warn(
            `[bodyParser] ${requestId} - Body stream já foi lido (provavelmente por proxy), pulando parsing`,
            {
                method,
                path,
                isGeneratePayment,
            }
        );
        (req as any).body = {};
        (req as any).skipBodyParsing = true;
        return next();
    }

    if (isGeneratePayment) {
        // Marcar que esta rota não deve ter body parsing
        (req as any).skipBodyParsing = true;
        (req as any).body = {};

        // Log para Sentry com contexto completo
        Sentry.addBreadcrumb({
            category: 'body-parser',
            message: 'Pulando parsing para rota generate-payment',
            level: 'info',
            data: {
                requestId,
                method,
                path,
                contentLength: contentLength || 'undefined',
                contentType: contentType || 'undefined',
                skipBodyParsing: true,
            },
        });

        logger.info(`[bodyParser] ${requestId} - Pulando parsing (generate-payment não usa body)`, {
            method,
            path,
            contentLength: contentLength || 'undefined',
            contentType: contentType || 'undefined',
        });

        return next(); // Pular TODOS os parsers
    }

    // Se content-length é '0' ou não existe, não há body - pular parsing
    // IMPORTANTE: Mesmo que venha Content-Type: application/json, se não há content-length
    // ou é zero, não tentar ler o body (axios pode enviar o header mesmo sem body)
    if (!contentLength || contentLength === '0') {
        (req as any).body = {};
        return next();
    }

    // Para métodos que não enviam body, pular parsing
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
        (req as any).body = {};
        return next();
    }

    // Aplicar express.json() apenas se realmente tem body JSON
    // Verificar se content-length é válido e não-zero ANTES de verificar content-type
    const length = parseInt(contentLength, 10);
    if (isNaN(length) || length === 0) {
        (req as any).body = {};
        return next();
    }

    // Só aplicar parser se realmente tem content-type JSON E content-length válido
    if (contentType.includes('application/json')) {
        try {
            const jsonParser = express.json({
                verify: (req: any, _res, buf) => {
                    // Apenas capturar rawBody se houver conteúdo
                    if (buf && buf.length > 0) {
                        req.rawBody = buf;
                    }
                },
            });

            // Wrapper para capturar erros de parsing e enviar ao Sentry
            return jsonParser(req, res, (err: any) => {
                if (err) {
                    const errorMessage = err?.message || '';
                    const isBodyError =
                        errorMessage.includes('already been read') ||
                        errorMessage.includes('unusable') ||
                        errorMessage.includes('has been consumed');

                    // Log erro de parsing para Sentry
                    Sentry.captureException(err, {
                        tags: {
                            component: 'body-parser',
                            parser: 'json',
                            requestId,
                            method,
                            path,
                            isBodyError: isBodyError.toString(),
                        },
                        extra: {
                            contentLength,
                            contentType,
                            bodyAlreadyRead: isBodyError,
                            skipBodyParsing: (req as any).skipBodyParsing || false,
                        },
                    });

                    logger.error(`[bodyParser] ${requestId} - Erro ao fazer parse do body JSON`, {
                        error: errorMessage,
                        stack: err.stack,
                        method,
                        path,
                        contentLength,
                        contentType,
                        isBodyError,
                    });
                }
                next(err);
            });
        } catch (parseError: any) {
            // Erro ao configurar o parser - capturar e continuar
            Sentry.captureException(parseError, {
                tags: {
                    component: 'body-parser',
                    action: 'setup',
                    requestId,
                    method,
                    path,
                },
                extra: {
                    contentLength,
                    contentType,
                },
            });

            logger.error(`[bodyParser] ${requestId} - Erro ao configurar parser JSON`, {
                error: parseError?.message,
                method,
                path,
            });

            // Continuar sem parser
            (req as any).body = {};
            return next();
        }
    }

    // Para outros casos, deixar passar (pode ser urlencoded ou nenhum parser)
    next();
});

// Aplicar urlencoded APENAS para requisições que realmente precisam
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'unknown';
    const path = req.path;

    // Se foi marcado para pular parsing, não aplicar urlencoded
    if ((req as any).skipBodyParsing) {
        Sentry.addBreadcrumb({
            category: 'body-parser',
            message: 'Pulando urlencoded parser (skipBodyParsing=true)',
            level: 'info',
            data: {
                requestId,
                path,
            },
        });
        return next();
    }

    const contentType = req.get('content-type') || '';
    const contentLength = req.get('content-length');

    // Se content-length é '0' ou não existe, não aplicar
    if (!contentLength || contentLength === '0') {
        return next();
    }

    // Só aplicar urlencoded se realmente tem content-type urlencoded E content-length não-zero
    if (contentType.includes('application/x-www-form-urlencoded')) {
        const length = parseInt(contentLength, 10);
        if (!isNaN(length) && length > 0) {
            // Wrapper para capturar erros de parsing
            const urlencodedParser = express.urlencoded({ extended: true });
            return urlencodedParser(req, res, (err: any) => {
                if (err) {
                    Sentry.captureException(err, {
                        tags: {
                            component: 'body-parser',
                            parser: 'urlencoded',
                            requestId,
                        },
                        extra: {
                            method: req.method,
                            path,
                            contentLength,
                            contentType,
                        },
                    });

                    logger.error(`[bodyParser] ${requestId} - Erro ao fazer parse urlencoded`, {
                        error: err.message,
                        method: req.method,
                        path,
                        contentLength,
                        contentType,
                    });
                }
                next(err);
            });
        }
    }

    next();
});

// Middleware de Performance - Deve vir após requestId mas antes das rotas
app.use(performanceLogger);

// CORS - Permitir requisições do frontend, dashboard e QR scanner app (restrito em produção)
const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

// Gera variações com e sem "www." para o mesmo domínio em produção,
// para evitar erros de CORS quando o usuário acessa com ou sem "www".
const expandOriginVariants = (origin: string): string[] => {
    try {
        const url = new URL(origin);

        // Não gerar variantes para localhost ou IPs
        if (url.hostname === 'localhost' || /^[\d.]+$/.test(url.hostname)) {
            return [normalizeOrigin(origin)];
        }

        const variants = new Set<string>();
        variants.add(normalizeOrigin(origin));

        if (url.hostname.startsWith('www.')) {
            const noWwwHost = url.hostname.replace(/^www\./, '');
            variants.add(
                normalizeOrigin(`${url.protocol}//${noWwwHost}${url.port ? `:${url.port}` : ''}`)
            );
        } else {
            const wwwHost = `www.${url.hostname}`;
            variants.add(
                normalizeOrigin(`${url.protocol}//${wwwHost}${url.port ? `:${url.port}` : ''}`)
            );
        }

        return Array.from(variants);
    } catch {
        // Se der erro ao fazer parse da URL, retorna apenas o origin normalizado
        return [normalizeOrigin(origin)];
    }
};

const fallbackOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:3001', // Frontend
    'https://localhost:3001', // Frontend
    'http://localhost:3002', // Backend API
    'https://localhost:3002', // Backend API
    'http://localhost:3443', // HTTPS alternativo
];
const rawOrigins = [
    process.env.FRONTEND_URL,
    process.env.DASHBOARD_URL,
    process.env.QR_SCANNER_URL,
    ...fallbackOrigins,
].filter((value): value is string => Boolean(value));

const allowedOrigins = Array.from(
    new Set(
        rawOrigins.flatMap((origin) => {
            // Em produção, gerar variações com/sem www.; em dev manter simples
            if ((process.env.NODE_ENV || 'development') === 'production') {
                return expandOriginVariants(origin);
            }
            return [normalizeOrigin(origin)];
        })
    )
);
const warnedCorsOrigins = new Set<string>();

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                // Sem origin (ex: requisições do mesmo domínio, mobile apps)
                return callback(null, true);
            }
            
            const normalizedOrigin = normalizeOrigin(origin);
            
            // Log para debug em produção
            if ((process.env.NODE_ENV || 'development') === 'production') {
                logger.debug(`[CORS] Verificando origin: ${origin} -> ${normalizedOrigin}`);
            }
            
            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            // Permitir domínio principal vicente.app (com e sem www, com ou sem porta)
            const vicenteAppRegex = /^https:\/\/(www\.)?vicente\.app(:[0-9]+)?$/;
            if (vicenteAppRegex.test(normalizedOrigin)) {
                if (!warnedCorsOrigins.has(normalizedOrigin)) {
                    warnedCorsOrigins.add(normalizedOrigin);
                    logger.info(`[CORS] Permitindo origin vicente.app: ${normalizedOrigin} (original: ${origin})`);
                }
                return callback(null, true);
            }

            // Permitir prévias do Vercel do frontend oficial em produção
            // Ex.: https://apphub-app-front-xxxx-ghrenriques-projects.vercel.app
            const vercelPreviewRegex =
                /^https:\/\/apphub-app-front-[a-zA-Z0-9-]+-ghrenriques-projects\.vercel\.app$/;
            if (
                (process.env.NODE_ENV || 'development') === 'production' &&
                vercelPreviewRegex.test(normalizedOrigin)
            ) {
                if (!warnedCorsOrigins.has(normalizedOrigin)) {
                    warnedCorsOrigins.add(normalizedOrigin);
                    logger.warn(`[CORS] Permitindo origin Vercel preview: ${normalizedOrigin}`);
                }
                return callback(null, true);
            }
            // Em dev, permitir
            if ((process.env.NODE_ENV || 'development') !== 'production') {
                return callback(null, true);
            }
            return callback(new Error(`CORS: Origin não permitido (${origin})`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'X-Requested-With',
            'X-meli-session-id',
            'x-session-id',
        ],
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
    if (publicPaths.some((path) => req.path.startsWith(path))) {
        return next();
    }
    // Aplicar validação de User-Agent para todas as outras rotas
    validateUserAgent(req, res, next);
});

// Rate Limiting Global - Proteção contra DDoS
app.use(generalRateLimit);

// Compressão de Respostas - Reduz tamanho de JSON e outros conteúdos
// OTIMIZAÇÃO: Comprime respostas para reduzir tráfego de rede
app.use(
    compression({
        filter: (req: Request, res: Response) => {
            // Comprimir apenas se o cliente suporta
            if (req.headers['x-no-compression']) {
                return false;
            }
            // Usar compressão padrão do compression
            return compression.filter(req, res);
        },
        level: 6, // Nível de compressão (0-9, 6 é um bom equilíbrio)
        threshold: 1024, // Comprimir apenas respostas maiores que 1KB
    })
);

// Servir arquivos estáticos de upload com cache forte e proteção simples de hotlink
const __allowedUploadOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.DASHBOARD_URL || 'http://localhost:3000',
];

app.use('/uploads', (req: Request, res: Response, next) => {
    const referer = req.get('referer') || '';
    const userAgent = req.get('user-agent') || '';
    const isProd = (process.env.NODE_ENV || 'development') === 'production';

    // Permitir requisições de proxies (dashboard e frontend)
    // Os proxies enviam User-Agent específico
    const isProxyRequest =
        userAgent.includes('EventHub-Image-Proxy') ||
        userAgent.includes('EventHub-Dashboard-Proxy') ||
        userAgent.includes('Image-Proxy');

    // Se for requisição de proxy, permitir sempre
    if (isProxyRequest) {
        return next();
    }

    // Em produção, verificar Referer apenas se existir
    // Se não houver Referer, permitir (pode ser requisição direta ou de proxy)
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

app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        },
    })
);

// ====================================
// Middlewares de Parsing (já movido para cima)
// ====================================
// O body parsing já foi movido para ANTES de todos os outros middlewares
// para garantir que seja o primeiro a processar e evitar "Body has already been read"

// Sanitização Global - Proteção XSS
// Aplicar em todas as rotas exceto webhooks (que precisam do body raw para assinatura)
app.use((req: Request, res: Response, next: NextFunction) => {
    // Excluir webhooks e rotas que precisam do body raw
    const excludedPaths = ['/api/payments/webhook'];
    if (excludedPaths.some((path) => req.path.startsWith(path))) {
        return next();
    }
    sanitizeBody(req, res, next);
});

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
// Rotas de detalhes de eventos
app.use('/api/event-details', eventDetailsRoutes);
// Rotas de tipos de ingresso (nested em events e standalone)
app.use('/api/events', ticketTypesRoutes);
app.use('/api', ticketTypesRoutes);
// Rotas de catálogo otimizado
app.use('/api/catalog', catalogRoutes);
// Rotas de pedidos
app.use('/api/orders', ordersRoutes);
// Rotas de ingressos
app.use('/api/tickets', ticketsRoutes);
// Rotas de códigos de promotor
app.use('/api/promoters', promoterCodesRoutes);
// Rotas de pagamento
app.use('/api/payments', paymentRoutes);
// Rotas de vendas parceladas
app.use('/api/parcelled-orders', parcelledOrdersRoutes);
// Rotas de novidades/newsletter
app.use('/api/novidades', newsletterRoutes);
// Rotas de suporte
app.use('/api/support', supportRoutes);
// Rotas de pacotes de transporte
app.use('/api/transport-packages', transportPackagesRoutes);

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
// Middleware de Erro - Captura erros não tratados
// ====================================
// Deve estar DEPOIS de todas as rotas e ANTES do handler 404

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    // Se já foi respondido, passar para o próximo
    if (res.headersSent) {
        return next(error);
    }

    // Capturar erro no Sentry se for erro inesperado (500+)
    const statusCode = error?.statusCode || error?.status || 500;
    if (statusCode >= 500 && process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            tags: {
                component: 'express',
                statusCode: statusCode.toString(),
            },
            extra: {
                method: req.method,
                path: req.path,
                url: req.originalUrl || req.url,
            },
        });
    }

    // Responder com erro
    res.status(statusCode).json({
        success: false,
        message: error?.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV !== 'production' && { stack: error?.stack }),
    });
});

// ====================================
// Tratamento de Erros 404
// ====================================

app.use((req: Request, res: Response) => {
    // Log detalhado para debug (apenas para rotas de pagamento com fake-)
    if (req.path.includes('fake-') || req.path.includes('/payments/')) {
        console.error('[Server 404] Rota não encontrada:', {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl,
            url: req.url,
            headers: {
                'content-type': req.headers['content-type'],
                'authorization': req.headers.authorization ? 'present' : 'missing',
            },
        });
    }
    
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
        // Logs básicos para garantir que apareçam
        console.log('🔌 Iniciando servidor...');
        logger.info('🔌 Iniciando servidor...');
        
        // Conectar ao banco de dados
        console.log('📦 Conectando ao banco de dados...');
        logger.info('📦 Conectando ao banco de dados...');
        await connectDatabase();
        console.log('✅ Banco de dados conectado com sucesso');
        logger.info('✅ Banco de dados conectado com sucesso');

        // Verificar configuração do Mercado Pago
        console.log('🔍 Verificando configurações...');
        logger.info('🔍 Verificando configurações...');
        checkMercadoPagoConfig();
        checkEmailConfig();
        console.log('✅ Configurações verificadas');
        logger.info('✅ Configurações verificadas');

        // Verificar se SSL está disponível
        // No Railway, sempre usar HTTP na porta PORT (Railway faz proxy HTTPS automaticamente)
        const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID;
        const sslOptions = isRailway ? null : getSSLOptions();
        const httpsPort = Number(process.env.HTTPS_PORT) || 3443;
        const useHttps = sslOptions !== null && !isRailway;

        // Iniciar servidor
        console.log(`🔧 Configurando servidor (HTTPS: ${useHttps}, Porta: ${useHttps ? httpsPort : PORT})...`);
        if (useHttps) {
            // Servidor HTTPS
            const httpsServer = https.createServer(sslOptions!, app);
            httpsServer.listen(httpsPort, '0.0.0.0', () => {
                console.log(`🚀 Servidor HTTPS rodando na porta ${httpsPort}`);
                console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`🚀 Servidor HTTPS rodando na porta ${httpsPort}`);
                logger.info(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            });
        } else {
            // Servidor HTTP (fallback)
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
                console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
                console.log(`🌐 API disponível em: http://localhost:${PORT}/api`);
                logger.info(`🚀 Servidor HTTP rodando na porta ${PORT}`);
                logger.info(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`🌐 API disponível em: http://localhost:${PORT}/api`);
            });
        }

        // Iniciar job de expiração de pedidos pendentes
        if (process.env.ORDER_EXPIRATION_ENABLED !== 'false') {
            startOrderExpirationScheduler();
        }

        // Iniciar schedulers de vendas parceladas (gerar PIX futuros + regras de atraso/cancelamento)
        if (process.env.PARCELLED_SCHEDULERS_ENABLED !== 'false') {
            startParcelledOrderSchedulers();
        }

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
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Log do erro no console para debug (usar console.error para garantir que apareça)
        console.error('❌ Erro ao iniciar servidor:', errorMessage);
        if (errorStack) {
            console.error('Stack trace:', errorStack);
        }
        logger.error('❌ Erro ao iniciar servidor:', errorMessage);
        if (errorStack) {
            logger.error('Stack trace:', errorStack);
        }

        // Capturar erro fatal de inicialização no Sentry
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
                tags: {
                    component: 'server',
                    action: 'startServer',
                    errorType: 'server_startup_failed',
                },
                level: 'fatal',
            });
        }

        // Aguardar um pouco antes de sair para que os logs sejam exibidos
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }
};

// Iniciar aplicação
startServer();

export default app;
