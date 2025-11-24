import { Router } from 'express';
import { getCatalog } from '../controllers/catalogController';

const router = Router();

/**
 * @swagger
 * /catalog:
 *   get:
 *     summary: Obter catálogo completo otimizado (eventos + ticket types)
 *     description: Retorna eventos com seus ticket types em uma única query otimizada usando aggregation pipeline
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: limitEvents
 *         schema: { type: integer, default: 12 }
 *         description: Limite de eventos a retornar
 *       - in: query
 *         name: limitTicketsPerEvent
 *         schema: { type: integer }
 *         description: Limite de tickets por evento (opcional)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca por nome, localização ou cidade
 *       - in: query
 *         name: onlyWithAvailability
 *         schema: { type: boolean, default: false }
 *         description: Apenas tickets com disponibilidade
 *     responses:
 *       200:
 *         description: Catálogo completo
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
 *                     catalog:
 *                       type: array
 *                       items:
 *                         type: object
 *                     meta:
 *                       type: object
 */
router.get('/', getCatalog);

export default router;

