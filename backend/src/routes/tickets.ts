import express from 'express';
import { getTicketByCode, validateTicket, listMyTickets, listEventTickets } from '../controllers/ticketsController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/tickets/my:
 *   get:
 *     summary: Listar ingressos do usuário autenticado
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ingressos
 *       401:
 *         description: Não autenticado
 */
router.get('/my', authenticate, listMyTickets);

/**
 * @swagger
 * /api/tickets/code/{code}:
 *   get:
 *     summary: Buscar ingresso por código (QR Code)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           length: 12
 *     responses:
 *       200:
 *         description: Ingresso encontrado
 *       400:
 *         description: Código inválido
 *       404:
 *         description: Ingresso não encontrado
 */
router.get('/code/:code', getTicketByCode);

/**
 * @swagger
 * /api/tickets/code/{code}/validate:
 *   post:
 *     summary: Validar ingresso (marcar como usado)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           length: 12
 *     responses:
 *       200:
 *         description: Ingresso validado com sucesso
 *       400:
 *         description: Ingresso inválido ou já usado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (apenas QRCODE pode validar)
 */
router.post('/code/:code/validate', authenticate, validateTicket);

/**
 * @swagger
 * /api/tickets/event/{eventId}:
 *   get:
 *     summary: Listar ingressos de um evento (apenas ADMIN)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de ingressos do evento
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (apenas ADMIN)
 */
router.get('/event/:eventId', authenticate, isAdmin, listEventTickets);

export default router;

