import { Router, Request, Response } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  getActiveSessions,
  invalidateSession,
  invalidateAllSessions,
  getSessionStats,
  getAllUsers,
  updateUserStatus
} from '../controllers/authController';
import { authenticate, authorize, isAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../middleware/schemas';
import { authRateLimit, refreshRateLimit, sensitiveRateLimit } from '../middleware/rateLimiting';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     description: Cria uma nova conta de usuário no sistema
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *                 description: "Nome completo do usuário"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *                 description: "Email do usuário"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *                 description: "Senha do usuário (mínimo 6 caracteres)"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, TURMA]
 *                 example: "TURMA"
 *                 description: "Tipo de usuário"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Usuário criado com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authRateLimit, validate(registerSchema), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Fazer login
 *     description: Autentica um usuário e retorna um token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *                 description: "Email do usuário"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *                 description: "Senha do usuário"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login realizado com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authRateLimit, validate(loginSchema), login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar access token
 *     description: Renova o access token usando o refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: "Refresh token válido"
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token renovado com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     expiresIn:
 *                       type: number
 *                       example: 900
 *       401:
 *         description: Refresh token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', refreshRateLimit, refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Fazer logout
 *     description: Invalida o token JWT do usuário
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout realizado com sucesso"
 *       401:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', authenticate, logout);

// Removidos: GET /auth/me e PUT /auth/profile

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Alterar senha do usuário
 *     description: Altera a senha do usuário logado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "senhaAtual123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "novaSenha123"
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "novaSenha123"
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Senha alterada com sucesso"
 *       400:
 *         description: Dados inválidos ou senha atual incorreta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/change-password', sensitiveRateLimit, authenticate, validate(changePasswordSchema), changePassword);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Listar sessões ativas do usuário
 *     description: Retorna todas as sessões ativas do usuário logado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sessões ativas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       deviceInfo:
 *                         type: object
 *                       lastActivity:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sessions', authenticate, getActiveSessions);

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     summary: Invalidar sessão específica
 *     description: Invalida uma sessão específica do usuário
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sessão a ser invalidada
 *     responses:
 *       200:
 *         description: Sessão invalidada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sessão invalidada com sucesso"
 *       404:
 *         description: Sessão não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/sessions/:sessionId', authenticate, invalidateSession);

/**
 * @swagger
 * /auth/sessions/all:
 *   delete:
 *     summary: Invalidar todas as sessões
 *     description: Invalida todas as sessões ativas do usuário
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas as sessões foram invalidadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Todas as sessões foram invalidadas com sucesso"
 *       401:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/sessions/all', authenticate, invalidateAllSessions);

/**
 * @swagger
 * /auth/stats:
 *   get:
 *     summary: Obter estatísticas de sessões (apenas ADMIN)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
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
 *                     totalSessions:
 *                       type: number
 *                     activeSessions:
 *                       type: number
 *                     totalUsers:
 *                       type: number
 *                     todayLogins:
 *                       type: number
 *       401:
 *         description: Token inválido ou expirado
 *       403:
 *         description: Acesso negado - apenas ADMIN
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/stats', authenticate, isAdmin, getSessionStats);

// Rotas de usuários foram movidas para /api/users (veja routes/users.ts)

export default router;
