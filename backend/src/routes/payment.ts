import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting específico para pagamentos (mais restritivo)
// Em desenvolvimento, limites mais altos para facilitar testes
const isDevelopment = process.env.NODE_ENV !== 'production';
const paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDevelopment ? 100 : 10, // 100 em dev, 10 em produção
    message: 'Muitas tentativas de pagamento. Tente novamente em alguns minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /api/payments/{orderId}/pix:
 *   post:
 *     summary: Cria um pagamento PIX para um pedido (Checkout Transparente)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Pagamento PIX criado com sucesso
 *       400:
 *         description: Erro na validação ou pedido já está pago
 *       404:
 *         description: Pedido não encontrado
 */
// CRÍTICO: Rotas específicas ANTES de rotas genéricas para evitar conflitos
// Ordem: rotas com path completo > rotas com parâmetros específicos > rotas genéricas
// IMPORTANTE: Express faz match por método HTTP primeiro, então GET e POST não conflitam
// Mas ainda é melhor manter ordem específica > genérica

// Rotas específicas (path completo)
router.post('/webhook', paymentController.handleWebhook);
router.get('/order/:orderId/status', authenticate, paymentController.getOrderPaymentStatus);

// Rotas com parâmetros específicos (POST)
router.post('/:orderId/pix', 
    authenticate, 
    paymentRateLimit, 
    paymentController.createPixPayment
);

/**
 * @swagger
 * /api/payments/{orderId}/card:
 *   post:
 *     summary: Cria um pagamento com cartão para um pedido (Checkout Transparente)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - paymentMethodId
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token do cartão gerado pelo MercadoPago.js
 *               installments:
 *                 type: number
 *                 description: Número de parcelas (1-12)
 *                 default: 1
 *               paymentMethodId:
 *                 type: string
 *                 description: ID do método de pagamento (visa, master, etc.)
 *               issuerId:
 *                 type: string
 *                 description: ID do banco emissor (opcional)
 *     responses:
 *       200:
 *         description: Pagamento processado com sucesso
 *       400:
 *         description: Erro na validação ou processamento
 *       404:
 *         description: Pedido não encontrado
 */
router.post('/:orderId/card', 
    authenticate, 
    paymentRateLimit, 
    paymentController.createCardPayment
);

/**
 * @swagger
 * /api/payments/{paymentId}/status:
 *   get:
 *     summary: Busca status de um pagamento no Mercado Pago
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pagamento no Mercado Pago
 *     responses:
 *       200:
 *         description: Status do pagamento
 *       404:
 *         description: Pagamento não encontrado
 */
// CRÍTICO: Rota genérica por último (GET)
// Esta rota deve vir DEPOIS das rotas POST para evitar conflitos
router.get('/:paymentId/status', authenticate, paymentController.getPaymentStatus);

// Log de todas as rotas registradas (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
    console.log('[Payment Routes] Rotas registradas:');
    router.stack.forEach((r: any) => {
        if (r.route) {
            const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
            console.log(`  ${methods} ${r.route.path}`);
        }
    });
}

export default router;
