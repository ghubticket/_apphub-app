import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as parcelledOrdersController from '../controllers/parcelledOrdersController';

const router = Router();

/**
 * @swagger
 * /api/parcelled-orders:
 *   post:
 *     summary: Cria uma venda parcelada (entrada + parcelas futuras)
 *     tags: [ParcelledOrders]
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
 *               - installmentsCount
 *               - paymentType
 *               - customerData
 *             properties:
 *               eventId:
 *                 type: string
 *               ticketTypeId:
 *                 type: string
 *               quantity:
 *                 type: number
 *               installmentsCount:
 *                 type: number
 *               paymentType:
 *                 type: string
 *                 enum: [pix, boleto]
 *               customerData:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   cpf:
 *                     type: string
 *                   phone:
 *                     type: string
 *     responses:
 *       201:
 *         description: Venda parcelada criada com sucesso
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Evento ou tipo de ingresso não encontrado
 */
router.post('/', authenticate, parcelledOrdersController.createParcelledOrder);

/**
 * @swagger
 * /api/parcelled-orders:
 *   get:
 *     summary: Lista vendas parceladas do usuário autenticado
 *     tags: [ParcelledOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vendas parceladas
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticate, parcelledOrdersController.listMyParcelledOrders);

/**
 * @swagger
 * /api/parcelled-orders/{id}:
 *   get:
 *     summary: Busca detalhes de uma venda parcelada (resumo + parcelas)
 *     tags: [ParcelledOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da venda parcelada
 *     responses:
 *       200:
 *         description: Detalhes da venda parcelada
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Venda parcelada não encontrada
 */
router.get('/:id', authenticate, parcelledOrdersController.getParcelledOrderDetails);

/**
 * @swagger
 * /api/parcelled-orders/{id}/parcels/{parcelId}/generate-payment:
 *   post:
 *     summary: Gera ou regenera o pagamento para uma parcela específica
 *     tags: [ParcelledOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da venda parcelada
 *       - in: path
 *         name: parcelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da parcela
 *     responses:
 *       200:
 *         description: Pagamento gerado com sucesso
 *       400:
 *         description: Erro de validação
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Venda parcelada ou parcela não encontrada
 */
router.post(
    '/:id/parcels/:parcelId/generate-payment',
    authenticate,
    parcelledOrdersController.generateParcelPayment
);

/**
 * @swagger
 * /api/parcelled-orders/{id}/cancel:
 *   post:
 *     summary: Cancela uma venda parcelada manualmente (admin)
 *     tags: [ParcelledOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da venda parcelada
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [entry_not_paid, overdue_installments, manual]
 *     responses:
 *       200:
 *         description: Venda parcelada cancelada com sucesso
 *       400:
 *         description: Erro de validação
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Venda parcelada não encontrada
 */
router.post('/:id/cancel', authenticate, parcelledOrdersController.cancelParcelledOrderController);

export default router;


