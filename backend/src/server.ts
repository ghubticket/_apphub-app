import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app: Application = express();
const PORT = process.env.PORT || 3001;

// ====================================
// Middlewares de Segurança
// ====================================

// Helmet - Headers de segurança
app.use(helmet());

// CORS - Permitir requisições do frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate Limiting Global - Proteção contra DDoS básico
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por janela
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ====================================
// Middlewares de Parsing
// ====================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================================
// Rotas
// ====================================

// Rota raiz
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'EventHub API está rodando! 🎉',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Health Check
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
  console.log('   1. Configure o MongoDB Atlas no arquivo .env');
  console.log('   2. Acesse http://localhost:3001 para testar');
  console.log('   3. Swagger estará em http://localhost:3001/api-docs (em breve)');
  console.log('');
});

export default app;

