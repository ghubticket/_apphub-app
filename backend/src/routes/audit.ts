import express from 'express';
import {
    listAuditLogs,
    getAuditLog,
    getEntityAuditLogs,
} from '../controllers/auditController';
import { authenticate, isAdmin } from '../middleware/auth';
import { validateUserAgent } from '../middleware/deviceValidation';

const router = express.Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Lista logs de auditoria (apenas ADMIN)
 *     description: Retorna logs de auditoria com filtros e paginação
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [Order, Ticket, Event, User, TicketType]
 *         description: Filtrar por tipo de entidade
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filtrar por ID da entidade
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, update, delete, status_change, payment_update, cancel, refund]
 *         description: Filtrar por ação
 *       - in: query
 *         name: performedBy
 *         schema:
 *           type: string
 *         description: Filtrar por ID do usuário que fez a ação
 *       - in: query
 *         name: performedByRole
 *         schema:
 *           type: string
 *           enum: [ADMIN, CLIENTE, QRCODE, SYSTEM]
 *         description: Filtrar por role do usuário
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final (ISO 8601)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de logs de auditoria
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (apenas ADMIN)
 */
router.get(
    '/',
    validateUserAgent,
    authenticate,
    isAdmin,
    listAuditLogs
);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     summary: Busca um log de auditoria específico (apenas ADMIN)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do log de auditoria
 *     responses:
 *       200:
 *         description: Log de auditoria encontrado
 *       404:
 *         description: Log não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (apenas ADMIN)
 */
router.get(
    '/:id',
    validateUserAgent,
    authenticate,
    isAdmin,
    getAuditLog
);

/**
 * @swagger
 * /api/audit-logs/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Busca logs relacionados a uma entidade específica (apenas ADMIN)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Order, Ticket, Event, User, TicketType]
 *         description: Tipo da entidade
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da entidade
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Logs da entidade
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (apenas ADMIN)
 */
router.get(
    '/entity/:entityType/:entityId',
    validateUserAgent,
    authenticate,
    isAdmin,
    getEntityAuditLogs
);

export default router;
