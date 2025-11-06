import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth';
import { getAllUsers, updateUserStatus, getUserById } from '../controllers/authController';
import { toggleSuspicious, toggleBlacklist } from '../controllers/usersController';

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
 *       - in: query
 *         name: suspicious
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *         description: Filtrar por usuários suspeitos (true) ou não suspeitos (false)
 *       - in: query
 *         name: blacklisted
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *         description: Filtrar por usuários na blacklist (true) ou não bloqueados (false)
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

/**
 * @swagger
 * /users/{userId}/suspicious:
 *   patch:
 *     summary: Marcar/desmarcar usuário como suspeito
 *     description: Atualiza flag de suspeito do usuário (apenas ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               isSuspicious:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status atualizado
 *       403:
 *         description: Acesso negado
 */
router.patch('/:userId/suspicious', authenticate, isAdmin, toggleSuspicious);

/**
 * @swagger
 * /users/{userId}/blacklist:
 *   patch:
 *     summary: Adicionar/remover usuário da blacklist
 *     description: Bloqueia ou desbloqueia usuário (apenas ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               isBlacklisted:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Blacklist atualizada
 *       403:
 *         description: Acesso negado
 */
router.patch('/:userId/blacklist', authenticate, isAdmin, toggleBlacklist);

export default router;


