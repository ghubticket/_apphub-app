import express from 'express';
import { createOrder, listMyOrders, listAllOrders, getOrderById } from '../controllers/ordersController';
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
router.post('/', authenticate, createOrder);

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

export default router;

