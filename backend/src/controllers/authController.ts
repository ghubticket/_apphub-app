import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, Order, PasswordResetToken } from '../models';
import Session from '../models/Session';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailTemplates';
import { captureControllerError } from '../utils/sentryErrorHandler';
import { hashCPFForSearch, hashPhoneForSearch } from '../utils/encryption';
import { isValidCpf as isValidCpfBackend, normalizeCpf as normalizeCpfBackend } from '../utils/cpf';

/**
 * Controller para registro de usuário
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, cpf } = req.body;

        // Verificar se o email já existe (apenas usuários não deletados)
        const existingUserByEmail = await User.findOne({
            email: email.toLowerCase(),
            deletedAt: null,
        }).select('+cpfHash +phoneHash');
        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email já cadastrado',
                errors: [{ field: 'email', message: 'Este email já está cadastrado!' }],
            });
        }

        // Validar e verificar CPF único (se fornecido)
        if (cpf) {
            // Normalizar CPF para validação
            const normalizedCpf = normalizeCpfBackend(cpf);
            
            // Validar formato e dígitos verificadores
            if (!isValidCpfBackend(normalizedCpf)) {
                return res.status(400).json({
                    success: false,
                    message: 'CPF inválido',
                    errors: [{ field: 'cpf', message: 'CPF inválido. Verifique os dígitos e tente novamente.' }],
                });
            }
            
            // Verificar se CPF já está cadastrado
            const cpfHash = hashCPFForSearch(cpf);
            if (cpfHash) {
                const existingUserByCPF = await User.findOne({
                    cpfHash,
                    deletedAt: null,
                }).select('+cpfHash');
                if (existingUserByCPF) {
                    return res.status(409).json({
                        success: false,
                        message: 'CPF já cadastrado',
                        errors: [{ field: 'cpf', message: 'Este CPF já está cadastrado para outro usuário. Não é permitido ter o mesmo CPF para diferentes usuários.' }],
                    });
                }
            }
        }

        // Validar e verificar WhatsApp/Telefone único (se fornecido)
        if (phone) {
            const phoneHash = hashPhoneForSearch(phone);
            if (phoneHash) {
                const existingUserByPhone = await User.findOne({
                    phoneHash,
                    deletedAt: null,
                }).select('+phoneHash');
                if (existingUserByPhone) {
                    return res.status(409).json({
                        success: false,
                        message: 'WhatsApp/Telefone já cadastrado',
                        errors: [{ field: 'phone', message: 'Este WhatsApp/Telefone já está cadastrado para outro usuário. Não é permitido ter o mesmo número para diferentes usuários.' }],
                    });
                }
            }
        }

        // Criar novo usuário
        const user = new User({
            name,
            email: email.toLowerCase(),
            password,
            role: 'CLIENTE',
            phone,
            cpf,
        });

        // Salvar no banco de dados
        await user.save();

        // Gerar token JWT
        const token = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        // Enviar email de boas-vindas (não bloquear resposta se falhar)
        try {
            const frontendUrl = process.env.FRONTEND_URL || process.env.DASHBOARD_URL || 'http://localhost:3000';
            await sendWelcomeEmail(user.email, {
                customerName: user.name,
                customerEmail: user.email,
                customerRole: user.role,
                loginLink: `${frontendUrl}/login`,
            });
        } catch (emailError) {// Não falhar o registro se o email falhar
        }

        // Retornar dados do usuário (sem senha) e token
        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            data: {
                user: user.toJSON(),
                token,
            },
        });
    } catch (error: any) {
        // Erro de validação do Mongoose - não enviar ao Sentry (erro esperado)
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => ({
                field: err.path,
                message: err.message,
            }));

            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors,
            });
        }

        // Erro de duplicação - não enviar ao Sentry (erro esperado)
        if (error.code === 11000) {
            // Verificar qual campo causou a duplicação
            const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'email';
            let message = 'Este email já está sendo usado';
            let field = 'email';

            if (duplicateField === 'cpfHash' || duplicateField === 'cpf') {
                message = 'Este CPF já está cadastrado para outro usuário. Não é permitido ter o mesmo CPF para diferentes usuários.';
                field = 'cpf';
            } else if (duplicateField === 'phoneHash' || duplicateField === 'phone') {
                message = 'Este WhatsApp/Telefone já está cadastrado para outro usuário. Não é permitido ter o mesmo número para diferentes usuários.';
                field = 'phone';
            }

            return res.status(409).json({
                success: false,
                message: `${field === 'cpf' ? 'CPF' : field === 'phone' ? 'WhatsApp/Telefone' : 'Email'} já cadastrado`,
                errors: [{ field, message }],
            });
        }

        // Erro inesperado - enviar ao Sentry
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'register',
            statusCode: 500,
            extra: {
                email: req.body?.email,
                hasPassword: !!req.body?.password,
            },
        });

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao criar usuário'],
        });
    }
};

// Configuração de expiração do refresh token (default: 1 dia)
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 1);
const REFRESH_TOKEN_EXPIRES_MS = REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

/**
 * Controller para login
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Lockout progressivo por IP+email (in-memory)
        //  - 5 falhas em 15min => bloqueia por 15min
        //  - reseta no sucesso
        const isProduction = (process.env.NODE_ENV || 'development') === 'production';
        const clientIp = (req.ip || req.connection.remoteAddress || 'unknown').toString();
        const key = `${(email || '').toLowerCase()}|${clientIp}`;
        const now = Date.now();

        let store: Record<string, { count: number; until?: number; last: number }> | null = null;

        if (isProduction) {
            // @ts-ignore - guarda em escopo do módulo
            if (!(global as any).__FAILED_LOGIN__) {
                // Estrutura: { [key]: { count: number, until?: number, last: number } }
                (global as any).__FAILED_LOGIN__ = Object.create(null);
            }
            store = (global as any).__FAILED_LOGIN__ as Record<
                string,
                { count: number; until?: number; last: number }
            >;

            const entry = store[key];
            if (entry?.until && entry.until > now) {
                const seconds = Math.ceil((entry.until - now) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Muitas tentativas de login. Aguarde ${seconds}s e tente novamente.`,
                    errors: ['Lockout temporário por tentativas falhas'],
                });
            }
        }

        // Buscar usuário por email (incluindo senha para comparação, apenas não deletados)
        const user = await User.findOne({
            email: email.toLowerCase(),
            deletedAt: null,
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas',
                errors: ['Email ou senha incorretos'],
            });
        }

        // Verificar se a conta está ativa
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Conta inativa',
                errors: ['Sua conta foi desativada. Entre em contato com o suporte'],
            });
        }

        // Verificar senha
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            if (store) {
                // incrementa falhas e aplica lockout se necessário
                const prev = store[key] || { count: 0, last: now };
                const withinWindow = now - prev.last <= 15 * 60 * 1000;
                const count = withinWindow ? prev.count + 1 : 1;
                const until = count >= 5 ? now + 15 * 60 * 1000 : undefined;
                store[key] = { count, last: now, until } as any;
            }

            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas',
                errors: ['Email ou senha incorretos'],
            });
        }

        // Sucesso: resetar contador de falhas
        if (store && store[key]) delete store[key];

        // Atualizar último login
        user.lastLogin = new Date();
        await user.save();

        // Gerar access token (15 minutos padrão)
        const accessToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'access',
            },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        // Gerar refresh token (curto) com rotação
        const refreshToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'refresh',
            },
            process.env.JWT_REFRESH_SECRET!,
            { expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d` }
        );

        // Criar sessão no banco de dados
        const session = new Session({
            userId: user._id,
            refreshToken,
            deviceInfo: {
                userAgent: req.get('User-Agent') || 'Unknown',
                ip: req.ip || req.connection.remoteAddress || 'Unknown',
                device: req.get('User-Agent')?.includes('Mobile') ? 'Mobile' : 'Desktop',
                browser: req.get('User-Agent')?.includes('Chrome') ? 'Chrome' : 'Other',
                os: req.get('User-Agent')?.includes('Windows') ? 'Windows' : 'Other',
            },
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS), // expiração curta configurável
        });

        await session.save();

        // Retornar dados do usuário (sem senha) e tokens
        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken,
                expiresIn: 900, // 15 minutos em segundos
                sessionId: session._id,
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'login',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao fazer login'],
        });
    }
};

/**
 * Controller para refresh token (com rotação)
 */
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token não fornecido',
                errors: ['Refresh token é obrigatório'],
            });
        }

        // Verificar refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido',
                errors: ['Tipo de token incorreto'],
            });
        }

        // Buscar sessão ativa
        const session = await Session.findOne({
            refreshToken,
            isActive: true,
            expiresAt: { $gt: new Date() },
        }).populate('userId');

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token inválido',
                errors: ['Sessão não encontrada ou expirada'],
            });
        }

        const user = session.userId as any;

        // Verificar se a conta está ativa
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Conta inativa',
                errors: ['Sua conta foi desativada'],
            });
        }

        // Gerar novo refresh token (rotação) e atualizar sessão
        const newRefreshToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'refresh',
            },
            process.env.JWT_REFRESH_SECRET!,
            { expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d` }
        );

        session.lastActivity = new Date();
        session.refreshToken = newRefreshToken;
        session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);
        await session.save();

        // Gerar novo access token
        const newAccessToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'access',
            },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        res.json({
            success: true,
            message: 'Token renovado com sucesso',
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: 900, // 15 minutos em segundos
            },
        });
    } catch (error: any) {if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token inválido',
                errors: ['Token expirado ou inválido'],
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao renovar token'],
        });
    }
};

/**
 * Controller para verificar tempo restante da sessão
 */
export const checkSession = async (req: Request, res: Response) => {
    try {
        // Verificar access token primeiro
        const authHeader = req.headers.authorization;
        let accessToken: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
        } else if (req.cookies?.apphub_access_token) {
            accessToken = req.cookies.apphub_access_token;
        }

        let expiresAt: Date | null = null;
        let timeRemaining: number = 0;

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
                if (decoded.exp) {
                    expiresAt = new Date(decoded.exp * 1000);
                    timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());

                }
            } catch (error: any) {
                // Token expirado ou inválido, tentar refresh token
                if (process.env.NODE_ENV !== 'production') {}
            }
        }

        // Se access token não válido, verificar refresh token
        if (!expiresAt || timeRemaining === 0) {
            const refreshToken = req.body.refreshToken || req.cookies?.apphub_refresh_token;
            const sessionId = req.body.sessionId || req.cookies?.apphub_session_id;

            if (refreshToken && sessionId) {
                try {
                    const decoded = jwt.verify(
                        refreshToken,
                        process.env.JWT_REFRESH_SECRET!
                    ) as any;

                    if (decoded.type === 'refresh') {
                        const session = await Session.findOne({
                            _id: sessionId,
                            refreshToken,
                            isActive: true,
                            expiresAt: { $gt: new Date() },
                        });

                        if (session) {
                            // Retornar tempo restante do refresh token (sessão)
                            expiresAt = session.expiresAt;
                            timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());
                        } 
                    }
                } catch (error: any) {
                    
                }
            } 
        }

        // Sempre retornar resposta, mesmo se não houver sessão válida
        res.json({
            success: true,
            data: {
                expiresAt: expiresAt?.toISOString() || null,
                timeRemaining, // em milissegundos
                timeRemainingSeconds: Math.floor(timeRemaining / 1000),
                isExpired: timeRemaining === 0 || !expiresAt,
            },
        });
    } catch (error: any) {
        // Retornar resposta de erro estruturada
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'checkSession',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar sessão',
            errors: [error.message || 'Erro interno do servidor'],
        });
    }
};

/**
 * Controller para logout
 */
export const logout = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const { sessionId } = req.body;

        if (userId) {
            if (sessionId) {
                // Invalidar sessão específica
                await Session.findByIdAndUpdate(sessionId, { isActive: false });
            } else {
                // Invalidar todas as sessões do usuário
                await Session.updateMany({ userId, isActive: true }, { isActive: false });
            }
        }

        res.json({
            success: true,
            message: 'Logout realizado com sucesso',
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'logout',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao fazer logout'],
        });
    }
};

/**
 * Controller para obter dados do usuário logado
 */
export const getMe = async (req: Request, res: Response) => {
    try {
        // O usuário já está disponível no req.user pelo middleware de autenticação
        const user = req.user;

        res.json({
            success: true,
            data: user,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'getMe',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao obter dados do usuário'],
        });
    }
};

/**
 * Controller para atualizar perfil do usuário
 */
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { name, phone, cpf } = req.body;
        const userId = req.user._id;

        // Buscar usuário
        const user = await User.findOne({
            _id: userId,
            deletedAt: null, // Não atualizar usuários deletados
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
                errors: ['Usuário não existe'],
            });
        }

        // Atualizar campos
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (cpf !== undefined) user.cpf = cpf;

        // Salvar alterações
        await user.save();

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: user.toJSON(),
        });
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => ({
                field: err.path,
                message: err.message,
            }));

            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors,
            });
        }

        captureControllerError(error, req, {
            controller: 'authController',
            action: 'updateProfile',
            statusCode: 500,
        });

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao atualizar perfil'],
        });
    }
};

/**
 * Controller para mudar senha
 */
export const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        // Buscar usuário com senha
        const user = await User.findOne({
            _id: userId,
            deletedAt: null, // Não atualizar usuários deletados
        }).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
                errors: ['Usuário não existe'],
            });
        }

        // Verificar senha atual
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Senha atual incorreta',
                errors: ['A senha atual informada está incorreta'],
            });
        }

        // Impedir reutilização da mesma senha
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'A nova senha não pode ser igual à senha atual.',
                errors: ['Escolha uma senha diferente da anterior'],
            });
        }

        // Atualizar senha
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Senha alterada com sucesso',
        });
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => ({
                field: err.path,
                message: err.message,
            }));

            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors,
            });
        }

        captureControllerError(error, req, {
            controller: 'authController',
            action: 'changePassword',
            statusCode: 500,
        });

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao alterar senha'],
        });
    }
};

/**
 * Inicia fluxo de esqueci minha senha
 * - Não expõe se o email existe ou não
 * - Gera token de reset de senha e envia email com link
 */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body as { email: string };

        const normalizedEmail = (email || '').toLowerCase().trim();

        // Mensagem sempre genérica para não expor existência do email
        const genericResponse = () =>
            res.json({
                success: true,
                message:
                    'Se este email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
            });

        if (!normalizedEmail) {
            return genericResponse();
        }

        // Buscar usuário não deletado
        const user = await User.findOne({
            email: normalizedEmail,
            deletedAt: null,
        });

        // Mesmo se não existir, responder genérico
        if (!user) {
            return genericResponse();
        }

        // Apagar tokens antigos deste usuário
        await PasswordResetToken.deleteMany({
            userId: user._id,
        });

        // Gerar token aleatório e hash
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const EXPIRATION_MINUTES = 30;
        const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

        // Salvar token
        await PasswordResetToken.create({
            userId: user._id,
            tokenHash,
            expiresAt,
            ipAddress: (req.ip || req.connection.remoteAddress || '').toString(),
            userAgent: req.get('User-Agent') || 'Unknown',
        });

        // Construir link de reset apontando para o frontend
        const frontendUrl =
            process.env.FRONTEND_URL ||
            process.env.DASHBOARD_URL ||
            'http://localhost:3000';
        const resetLink = `${frontendUrl.replace(/\/+$/, '')}/reset-password?token=${rawToken}`;

        // Enviar email (não bloquear resposta se falhar)
        try {
            await sendPasswordResetEmail(user.email, {
                customerName: user.name,
                resetLink,
                expirationMinutes: EXPIRATION_MINUTES,
            });
        } catch (emailError) {// Mesmo que o email falhe, não revelar nada ao cliente
        }

        return genericResponse();
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'forgotPassword',
            statusCode: 500,
        });
        
        return res.json({
            success: true,
            message:
                'Se este email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
        });
    }
};

/**
 * Conclui fluxo de redefinição de senha usando token
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body as {
            token: string;
            newPassword: string;
        };

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Token de redefinição é obrigatório',
                errors: ['Token inválido ou ausente'],
            });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const resetDoc = await PasswordResetToken.findOne({
            tokenHash,
            usedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!resetDoc) {
            return res.status(400).json({
                success: false,
                message: 'Link de redefinição inválido ou expirado',
                errors: ['Token inválido ou expirado'],
            });
        }

        const user = await User.findOne({
            _id: resetDoc.userId,
            deletedAt: null,
        }).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Link de redefinição inválido ou expirado',
                errors: ['Usuário não encontrado para este token'],
            });
        }

        // Impedir reutilização da mesma senha (comparar nova senha com a atual)
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'A nova senha não pode ser igual à senha atual.',
                errors: ['Escolha uma senha diferente da anterior'],
            });
        }

        // Atualizar senha (middleware pre('save') cuida do hash)
        user.password = newPassword;
        await user.save();

        // Marcar token como usado
        resetDoc.usedAt = new Date();
        await resetDoc.save();

        // Opcional: invalidar sessões existentes do usuário por segurança
        try {
            await Session.updateMany(
                { userId: user._id, isActive: true },
                { isActive: false }
            );
        } catch (sessionError) {
            // Erro ao invalidar sessões - não bloquear reset de senha
        }

        return res.json({
            success: true,
            message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'resetPassword',
            statusCode: 500,
        });
        
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao redefinir senha'],
        });
    }
};

/**
 * Controller para listar sessões ativas do usuário
 */
export const getActiveSessions = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;

        const sessions = await Session.findActiveByUserId(String(userId));

        res.json({
            success: true,
            data: sessions,
        });
    } catch (error: any) {res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao obter sessões'],
        });
    }
};

/**
 * Controller para invalidar uma sessão específica
 */
export const invalidateSession = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;
        const { sessionId } = req.params;

        const session = await Session.findOne({
            _id: sessionId,
            userId,
            isActive: true,
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada',
                errors: ['Sessão não existe ou já foi invalidada'],
            });
        }

        session.isActive = false;
        await session.save();

        res.json({
            success: true,
            message: 'Sessão invalidada com sucesso',
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'invalidateSession',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao invalidar sessão'],
        });
    }
};

/**
 * Controller para invalidar todas as sessões do usuário
 */
export const invalidateAllSessions = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;

        await Session.invalidateAllByUserId(String(userId));

        res.json({
            success: true,
            message: 'Todas as sessões foram invalidadas com sucesso',
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'invalidateAllSessions',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao invalidar sessões'],
        });
    }
};

/**
 * Controller para obter estatísticas de sessões (apenas ADMIN)
 */
export const getSessionStats = async (req: Request, res: Response) => {
    try {
        // Verificar se é admin
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas administradores podem acessar esta funcionalidade'],
            });
        }

        // Estatísticas de sessões
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({
            isActive: true,
            expiresAt: { $gt: new Date() },
        });

        // Estatísticas de usuários
        const totalUsers = await User.countDocuments();

        // Logins de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogins = await Session.countDocuments({
            createdAt: { $gte: today },
        });

        res.json({
            success: true,
            data: {
                totalSessions,
                activeSessions,
                totalUsers,
                todayLogins,
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'getSessionStats',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: [error.message],
        });
    }
};

/**
 * Controller para listar todos os usuários (apenas ADMIN)
 */
/**
 * Controller para obter usuário por ID com seus pedidos
 */
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Buscar usuário
        const user = await User.findOne({
            _id: userId,
            deletedAt: null,
        })
            .select('-password')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
            });
        }

        // Buscar pedidos do usuário (sem QR codes - apenas visualização)
        const orders = await Order.find({
            customer: userId,
            deletedAt: null,
        })
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code status price ticketType', // Não incluir qrCode
                match: { deletedAt: null },
            })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: {
                user,
                orders,
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'getUserById',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuário',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '',
            status = '',
            suspicious = '',
            blacklisted = '',
        } = req.query;

        // Construir filtros
        const filters: any = {};

        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        if (role) {
            filters.role = role;
        }

        if (status !== '' && status !== 'all') {
            filters.isActive = status === 'true';
        }

        // Filtro para usuários suspeitos
        if (suspicious !== '' && suspicious !== 'all') {
            filters.isSuspicious = suspicious === 'true';
        }

        // Filtro para usuários na blacklist
        if (blacklisted !== '' && blacklisted !== 'all') {
            filters.isBlacklisted = blacklisted === 'true';
        }

        // Adicionar filtro para não retornar usuários deletados
        filters.deletedAt = null;

        // Calcular paginação
        const skip = (Number(page) - 1) * Number(limit);

        // Buscar usuários com paginação
        const users = await User.find(filters)
            .select('-password -refreshToken') // Excluir campos sensíveis
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Contar total de usuários
        const total = await User.countDocuments(filters);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'getAllUsers',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao listar usuários'],
        });
    }
};

/**
 * Controller para atualizar status do usuário (ativar/desativar)
 */
export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await User.findOneAndUpdate(
            {
                _id: userId,
                deletedAt: null, // Não atualizar usuários deletados
            },
            { isActive },
            { new: true }
        ).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
                errors: ['Usuário não encontrado'],
            });
        }

        res.json({
            success: true,
            message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
            data: user,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'authController',
            action: 'updateUserStatus',
            statusCode: 500,
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao atualizar status do usuário'],
        });
    }
};
