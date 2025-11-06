import { Router } from 'express'
import { authenticate, isAdmin } from '../middleware/auth'
import { eventImageUpload, validatePngMagicBytes } from '../middleware/upload'
import { createEvent, listEvents, getEvent, updateEvent, updateEventStatus, deleteEvent, getEventTicketStats, distributeVip } from '../controllers/eventsController'
import { sanitizeBody } from '../middleware/sanitization'

const router = Router()

// Upload fields: cover (1200x500), square (300x300)
const uploadFields = eventImageUpload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'square', maxCount: 1 }
])

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Listar eventos
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de eventos
 */
router.get('/', listEvents)

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Obter evento por ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Evento }
 *       404: { description: Não encontrado }
 */
router.get('/:id', getEvent)

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Criar evento (apenas ADMIN)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               date: { type: string, format: date-time }
 *               time: { type: string, example: '20:00' }
 *               location: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string, example: 'SP' }
 *               cover: { type: string, format: binary, description: 'PNG até 10MB (1200x500)' }
 *               square: { type: string, format: binary, description: 'PNG até 10MB (300x300)' }
 *     responses:
 *       201: { description: Criado }
 */
router.post('/', authenticate, isAdmin, sanitizeBody, uploadFields, validatePngMagicBytes, createEvent)

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Atualizar evento (apenas ADMIN)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               date: { type: string, format: date-time }
 *               time: { type: string }
 *               location: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               cover: { type: string, format: binary }
 *               square: { type: string, format: binary }
 *     responses:
 *       200: { description: Atualizado }
 */
router.put('/:id', authenticate, isAdmin, sanitizeBody, uploadFields, validatePngMagicBytes, updateEvent)

/**
 * @swagger
 * /events/{id}/status:
 *   patch:
 *     summary: Atualizar status do evento (apenas ADMIN)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
 *       200: { description: Status atualizado }
 *       404: { description: Evento não encontrado }
 */
router.patch('/:id/status', authenticate, isAdmin, updateEventStatus)

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Remover evento (soft delete) (apenas ADMIN)
 *     description: Marca o evento como inativo e define deletedAt; não remove definitivamente.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Removido (soft delete) }
 */
router.delete('/:id', authenticate, isAdmin, deleteEvent)

// Estatísticas de ingressos do evento
router.get('/:id/tickets/stats', authenticate, getEventTicketStats)

/**
 * @swagger
 * /events/{id}/vip/distribute:
 *   post:
 *     summary: Distribuir VIP (cortesia) para usuário existente (apenas ADMIN)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *               quantity: { type: integer, default: 1, minimum: 1 }
 *     responses:
 *       201: { description: VIP distribuído }
 *       400: { description: Dados inválidos }
 *       404: { description: Usuário/Evento/Tipo VIP não encontrado }
 */
router.post('/:id/vip/distribute', authenticate, isAdmin, distributeVip)

export default router


