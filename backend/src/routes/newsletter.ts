import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { subscribeToNewsletter } from '../controllers/newsletterController';
import { validate } from '../middleware/validation';
import { newsletterSubscriptionSchema } from '../middleware/schemas';

const router = Router();

const subscribeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Muitas tentativas. Tente novamente em instantes.',
    },
});

/**
 * @swagger
 * /novidades:
 *   post:
 *     summary: Inscrever email para receber novidades
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "contato@exemplo.com"
 *               name:
 *                 type: string
 *                 example: "Maria Silva"
 *               source:
 *                 type: string
 *                 example: "footer"
 *     responses:
 *       201:
 *         description: Inscrição realizada com sucesso
 *       200:
 *         description: Email já estava inscrito
 *       400:
 *         description: Dados inválidos
 */
router.post('/', subscribeLimiter, validate(newsletterSubscriptionSchema), subscribeToNewsletter);

export default router;
