import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth';
import {
    createTicketType,
    listTicketTypes,
    getTicketType,
    updateTicketType,
    deleteTicketType,
    updateTicketTypeStatus,
} from '../controllers/ticketTypesController';

const router = Router();

/**
 * @swagger
 * /events/{eventId}/ticket-types:
 *   post:
 *     summary: Criar tipo de ingresso para um evento (apenas ADMIN)
 *     tags: [TicketTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - lotNumber
 *               - maxQuantity
 *               - maxPerPurchase
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Pista"
 *               description:
 *                 type: string
 *                 example: "Ingresso para área de pista"
 *               price:
 *                 type: number
 *                 example: 50.00
 *               isVIP:
 *                 type: boolean
 *                 default: false
 *               lotNumber:
 *                 type: integer
 *                 example: 1
 *               maxQuantity:
 *                 type: integer
 *                 example: 200
 *               maxPerPurchase:
 *                 type: integer
 *                 example: 5
 *               salesStart:
 *                 type: string
 *                 format: date-time
 *               salesEnd:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tipo de ingresso criado com sucesso
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Evento não encontrado
 */
router.post('/:eventId/ticket-types', authenticate, isAdmin, createTicketType);

/**
 * @swagger
 * /events/{eventId}/ticket-types:
 *   get:
 *     summary: Listar tipos de ingresso de um evento
 *     tags: [TicketTypes]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Lista de tipos de ingresso
 */
router.get('/:eventId/ticket-types', listTicketTypes);

/**
 * @swagger
 * /ticket-types/{id}:
 *   get:
 *     summary: Obter tipo de ingresso por ID
 *     tags: [TicketTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tipo de ingresso
 *       404:
 *         description: Não encontrado
 */
router.get('/ticket-types/:id', getTicketType);

/**
 * @swagger
 * /ticket-types/{id}:
 *   put:
 *     summary: Atualizar tipo de ingresso (apenas ADMIN)
 *     tags: [TicketTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               isVIP:
 *                 type: boolean
 *               lotNumber:
 *                 type: integer
 *               maxQuantity:
 *                 type: integer
 *               maxPerPurchase:
 *                 type: integer
 *               salesStart:
 *                 type: string
 *                 format: date-time
 *               salesEnd:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Tipo de ingresso atualizado
 *       404:
 *         description: Não encontrado
 */
router.put('/ticket-types/:id', authenticate, isAdmin, updateTicketType);

/**
 * @swagger
 * /ticket-types/{id}/status:
 *   patch:
 *     summary: Atualizar status do tipo de ingresso (apenas ADMIN)
 *     tags: [TicketTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status atualizado
 */
router.patch('/ticket-types/:id/status', authenticate, isAdmin, updateTicketTypeStatus);

/**
 * @swagger
 * /ticket-types/{id}:
 *   delete:
 *     summary: Deletar tipo de ingresso (soft delete) (apenas ADMIN)
 *     description: Marca o tipo de ingresso como inativo e define deletedAt; não remove definitivamente.
 *     tags: [TicketTypes]
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
 *         description: Tipo de ingresso removido (soft delete)
 *       404:
 *         description: Não encontrado
 */
router.delete('/ticket-types/:id', authenticate, isAdmin, deleteTicketType);

export default router;

