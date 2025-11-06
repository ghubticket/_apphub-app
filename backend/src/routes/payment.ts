import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting específico para pagamentos (mais restritivo)
const paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 requisições por 15 minutos
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
router.post('/:orderId/pix', authenticate, paymentRateLimit, paymentController.createPixPayment);

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
router.post('/:orderId/card', authenticate, paymentRateLimit, paymentController.createCardPayment);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Webhook do Mercado Pago para receber notificações de pagamento
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 */
router.post('/webhook', paymentController.handleWebhook);

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
router.get('/:paymentId/status', authenticate, paymentController.getPaymentStatus);

/**
 * @swagger
 * /api/payments/order/{orderId}/status:
 *   get:
 *     summary: Busca status de pagamento de um pedido
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
 *         description: Status do pagamento do pedido
 *       404:
 *         description: Pedido não encontrado
 */
router.get('/order/:orderId/status', authenticate, paymentController.getOrderPaymentStatus);

export default router;
