import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth';
import * as eventDetailsController from '../controllers/eventDetailsController';

const router = express.Router();

/**
 * @swagger
 * /event-details/{eventId}:
 *   get:
 *     summary: Buscar detalhes de um evento
 *     tags: [EventDetails]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do evento
 *     responses:
 *       200:
 *         description: Detalhes do evento
 *       404:
 *         description: Detalhes não encontrados
 */
router.get('/:eventId', eventDetailsController.getEventDetails);

/**
 * @swagger
 * /event-details/{eventId}:
 *   post:
 *     summary: Criar ou atualizar detalhes de um evento (apenas ADMIN ou organizador)
 *     tags: [EventDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do evento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageIncludes:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   items:
 *                     type: array
 *                     items:
 *                       type: string
 *               transport:
 *                 type: object
 *               attractions:
 *                 type: object
 *               pricing:
 *                 type: object
 *               video:
 *                 type: object
 *               faq:
 *                 type: object
 *     responses:
 *       200:
 *         description: Detalhes salvos com sucesso
 *       403:
 *         description: Acesso negado
 */
router.post('/:eventId', authenticate, eventDetailsController.upsertEventDetails);

/**
 * @swagger
 * /event-details/{eventId}:
 *   put:
 *     summary: Atualizar detalhes de um evento (apenas ADMIN ou organizador)
 *     tags: [EventDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do evento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Detalhes atualizados com sucesso
 *       403:
 *         description: Acesso negado
 */
router.put('/:eventId', authenticate, eventDetailsController.upsertEventDetails);

/**
 * @swagger
 * /event-details/{eventId}:
 *   delete:
 *     summary: Deletar detalhes de um evento (apenas ADMIN ou organizador)
 *     tags: [EventDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do evento
 *     responses:
 *       200:
 *         description: Detalhes deletados com sucesso
 *       403:
 *         description: Acesso negado
 */
router.delete('/:eventId', authenticate, eventDetailsController.deleteEventDetails);

export default router;

