import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createSupportRequest, getMySupportRequests } from '../controllers/supportController';
import { validate } from '../middleware/validation';
import { supportRequestSchema } from '../middleware/schemas';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rate limiting para criação de solicitações (5 por hora por IP)
const createSupportRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
        success: false,
        message: 'Muitas solicitações. Por favor, aguarde antes de criar uma nova solicitação.',
    },
    skip: (req) => {
        // Em desenvolvimento, pode pular rate limiting
        return process.env.NODE_ENV === 'development';
    },
});

/**
 * @swagger
 * /support/request:
 *   post:
 *     summary: Criar nova solicitação de suporte
 *     description: Permite que usuários autenticados criem solicitações de suporte
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - subject
 *               - message
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [general, payment, tickets, account, technical, refund]
 *                 example: "technical"
 *               subject:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: "Problema ao baixar ingressos"
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 example: "Não consigo baixar meus ingressos após o pagamento..."
 *     responses:
 *       201:
 *         description: Solicitação criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       429:
 *         description: Muitas solicitações
 */
router.post('/request', authenticate, createSupportRequestLimiter, validate(supportRequestSchema), createSupportRequest);

/**
 * @swagger
 * /support/requests:
 *   get:
 *     summary: Listar minhas solicitações de suporte
 *     description: Retorna todas as solicitações do usuário autenticado
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de solicitações
 *       401:
 *         description: Não autenticado
 */
router.get('/requests', authenticate, getMySupportRequests);

export default router;

