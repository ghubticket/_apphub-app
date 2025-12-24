import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as transportPackagesController from '../controllers/transportPackagesController';

const router = Router();

/**
 * @swagger
 * /transport-packages/event/{eventId}:
 *   get:
 *     summary: Lista pacotes de transporte disponíveis para um evento
 *     tags: [TransportPackages]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do evento
 *     responses:
 *       200:
 *         description: Lista de pacotes disponíveis
 *       404:
 *         description: Evento não encontrado
 */
router.get('/event/:eventId', transportPackagesController.getAvailablePackages);

/**
 * @swagger
 * /transport-packages:
 *   post:
 *     summary: Cria um pedido de pacote de transporte
 *     tags: [TransportPackages]
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
 *               - eventDate
 *               - departureLocationName
 *               - packageType
 *               - passengerData
 *             properties:
 *               eventId:
 *                 type: string
 *               eventDate:
 *                 type: string
 *                 format: date-time
 *               departureLocationName:
 *                 type: string
 *               packageType:
 *                 type: string
 *               passengerData:
 *                 type: object
 *                 required:
 *                   - name
 *                   - phone
 *                   - rg
 *                   - cpf
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   rg:
 *                     type: string
 *                   cpf:
 *                     type: string
 *               orderId:
 *                 type: string
 *                 description: ID do pedido existente (opcional)
 *     responses:
 *       201:
 *         description: Pacote criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Evento ou local não encontrado
 */
router.post('/', authenticate, transportPackagesController.createTransportPackage);

/**
 * @swagger
 * /transport-packages/order/{orderId}:
 *   get:
 *     summary: Lista pacotes de transporte de um pedido
 *     tags: [TransportPackages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Lista de pacotes
 *       404:
 *         description: Pedido não encontrado
 */
router.get('/order/:orderId', authenticate, transportPackagesController.getPackagesByOrder);

/**
 * @swagger
 * /transport-packages/code/{code}:
 *   get:
 *     summary: Busca pacote por código
 *     tags: [TransportPackages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código do pacote
 *     responses:
 *       200:
 *         description: Pacote encontrado
 *       404:
 *         description: Pacote não encontrado
 */
router.get('/code/:code', authenticate, transportPackagesController.getPackageByCode);

export default router;

