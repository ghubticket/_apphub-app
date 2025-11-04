import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth';
import { getAllUsers, updateUserStatus, getUserById } from '../controllers/authController';

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Listar todos os usuários
 *     description: Retorna lista paginada de usuários (apenas ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 10
 *         description: Itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome ou email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, QRCODE, CLIENTE]
 *         description: Filtrar por role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por status ativo
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 *       401:
 *         description: Token inválido ou expirado
 *       403:
 *         description: Acesso negado - apenas ADMIN
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authenticate, isAdmin, getAllUsers);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Buscar usuário por ID com seus pedidos
 *     description: Retorna dados do usuário e lista de pedidos (apenas ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Dados do usuário e pedidos retornados com sucesso
 *       401:
 *         description: Token inválido ou expirado
 *       403:
 *         description: Acesso negado - apenas ADMIN
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:userId', authenticate, isAdmin, getUserById);

/**
 * @swagger
 * /users/{userId}/status:
 *   patch:
 *     summary: Atualizar status do usuário
 *     description: Ativar ou desativar usuário (apenas ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Status do usuário
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       401:
 *         description: Token inválido ou expirado
 *       403:
 *         description: Acesso negado - apenas ADMIN
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.patch('/:userId/status', authenticate, isAdmin, updateUserStatus);

export default router;


