import express from 'express';
import {
    createPromoterCode,
    listPromoterCodes,
    getPromoterCodeById,
    updatePromoterCode,
    togglePromoterCode,
    deletePromoterCode,
    validatePromoterCode,
    getPromoterCodeStats,
} from '../controllers/promoterCodesController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/promoters:
 *   post:
 *     summary: Criar código de promotor (apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, cpf, email, whatsapp, discountType, discountValue]
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               cpf:
 *                 type: string
 *               email:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 */
router.post('/', authenticate, isAdmin, createPromoterCode);

/**
 * @swagger
 * /api/promoters:
 *   get:
 *     summary: Listar códigos de promotor (apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
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
 *       - in: query
 *         name: eventId
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 */
router.get('/', authenticate, isAdmin, listPromoterCodes);

/**
 * @swagger
 * /api/promoters/validate:
 *   get:
 *     summary: Validar código de promotor para evento (público)
 *     tags: [PromoterCodes]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 */
router.get('/validate', validatePromoterCode);

/**
 * @swagger
 * /api/promoters/{id}:
 *   get:
 *     summary: Buscar código por ID (apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, isAdmin, getPromoterCodeById);

/**
 * @swagger
 * /api/promoters/{id}:
 *   put:
 *     summary: Atualizar código (apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, isAdmin, updatePromoterCode);

/**
 * @swagger
 * /api/promoters/{id}/toggle:
 *   post:
 *     summary: Desativar/Ativar código (apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/toggle', authenticate, isAdmin, togglePromoterCode);

/**
 * @swagger
 * /api/promoters/{id}:
 *   delete:
 *     summary: Deletar código (soft delete, apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, isAdmin, deletePromoterCode);

/**
 * @swagger
 * /api/promoters/{id}/stats:
 *   get:
 *     summary: Estatísticas do código (apenas ADMIN)
 *     tags: [PromoterCodes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/stats', authenticate, isAdmin, getPromoterCodeStats);

export default router;
