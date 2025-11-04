import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
    createReservation,
    validateReservation,
    releaseReservation,
    releaseSessionReservations,
    getAvailableQuantity,
    listMyReservations,
} from '../controllers/reservationsController';

const router = Router();

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Criar reserva temporária de ingressos (15 minutos)
 *     tags: [Reservations]
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
 *               ticketTypeId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Reserva criada com sucesso
 *       400:
 *         description: Erro de validação ou estoque insuficiente
 */
router.post('/', optionalAuth, createReservation);

/**
 * @swagger
 * /reservations/available:
 *   get:
 *     summary: Obter quantidade disponível considerando reservas ativas
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: ticketTypeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quantidade disponível
 */
router.get('/available', getAvailableQuantity);

/**
 * @swagger
 * /reservations/my:
 *   get:
 *     summary: Listar reservas ativas do usuário/sessão
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reservas ativas
 */
router.get('/my', optionalAuth, listMyReservations);

/**
 * @swagger
 * /reservations/{id}/validate:
 *   get:
 *     summary: Validar se uma reserva ainda é válida
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reserva válida
 *       400:
 *         description: Reserva inválida ou expirada
 */
router.get('/:id/validate', validateReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Liberar uma reserva específica
 *     tags: [Reservations]
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
 *         description: Reserva liberada
 */
router.delete('/:id', optionalAuth, releaseReservation);

/**
 * @swagger
 * /reservations/session/release:
 *   delete:
 *     summary: Liberar todas as reservas da sessão atual
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservas liberadas
 */
router.delete('/session/release', optionalAuth, releaseSessionReservations);

export default router;

