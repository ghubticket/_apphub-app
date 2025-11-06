import express from 'express';
import { createOrder, listMyOrders, listAllOrders, getOrderById, confirmPayment, cancelOrder, getFinancialStats } from '../controllers/ordersController';
import rateLimit from 'express-rate-limit';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Criar um novo pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - ticketTypeId
 *               - quantity
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: ID do evento
 *               ticketTypeId:
 *                 type: string
 *                 description: ID do tipo de ingresso
 *               quantity:
 *                 type: number
 *                 description: Quantidade de ingressos
 *                 minimum: 1
 *                 maximum: 10
 *               customerData:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   cpf:
 *                     type: string
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Evento ou tipo de ingresso não encontrado
 */
// Rate limit específico para criação de pedidos
const createOrderRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // 20 pedidos por 15min por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas criações de pedidos. Tente novamente em alguns minutos.'
});

router.post('/', authenticate, createOrderRateLimit, createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Listar pedidos (meus pedidos ou todos se ADMIN)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos
 *       401:
 *         description: Não autenticado
 */
// Se for ADMIN, lista todos. Se não, lista apenas os do usuário
router.get('/', authenticate, (req, res, next) => {
    const userRole = (req as any).user?.role;
    if (userRole === 'ADMIN') {
        return listAllOrders(req, res);
    } else {
        return listMyOrders(req, res);
    }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancelar pedido pendente
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido cancelado
 *       400:
 *         description: Requisição inválida
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Pedido não encontrado
 */
router.post('/:id/cancel', authenticate, cancelOrder);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Buscar pedido por ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Pedido não encontrado
 */
router.get('/:id', authenticate, getOrderById);

/**
 * @swagger
 * /api/orders/{id}/confirm-payment:
 *   post:
 *     summary: Confirmar pagamento de um pedido e gerar QR codes
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentId:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pagamento confirmado e QR codes gerados
 *       400:
 *         description: Pedido já pago ou status inválido
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Pedido não encontrado
 */
router.post('/:id/confirm-payment', authenticate, confirmPayment);

/**
 * @swagger
 * /api/orders/financial/stats:
 *   get:
 *     summary: Obter estatísticas financeiras (apenas ADMIN)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas financeiras
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                       description: Total de vendas (subtotal, sem taxa)
 *                     totalFees:
 *                       type: number
 *                       description: Total de taxas da plataforma
 *                     totalRevenue:
 *                       type: number
 *                       description: Total geral (vendas + taxas)
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado - apenas ADMIN
 */
router.get('/financial/stats', authenticate, isAdmin, getFinancialStats);

export default router;

