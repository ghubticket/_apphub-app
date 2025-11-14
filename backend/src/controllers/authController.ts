import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, Order } from '../models';
import Session from '../models/Session';
import mongoose from 'mongoose';
import { sendWelcomeEmail } from '../services/emailTemplates';

/**
 * Controller para registro de usuário
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, cpf } = req.body;

        // Verificar se o email já existe (apenas usuários não deletados)
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            deletedAt: null,
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email já cadastrado',
                errors: ['Este email já está sendo usado por outro usuário'],
            });
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
                role: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        // Enviar email de boas-vindas (não bloquear resposta se falhar)
        try {
            const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
            await sendWelcomeEmail(user.email, {
                customerName: user.name,
                customerEmail: user.email,
                customerRole: user.role,
                loginLink: `${dashboardUrl}/login`
            });
        } catch (emailError) {
            console.error('Erro ao enviar email de boas-vindas:', emailError);
            // Não falhar o registro se o email falhar
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
        console.error('Erro no registro:', error);

        // Erro de validação do Mongoose
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

        // Erro de duplicação
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email já cadastrado',
                errors: ['Este email já está sendo usado'],
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao criar usuário'],
        });
    }
};

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
            store = (global as any).__FAILED_LOGIN__ as Record<string, { count: number; until?: number; last: number }>;

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

        // Gerar access token (4 horas para desenvolvimento)
        const accessToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'access'
            },
            process.env.JWT_SECRET!,
            { expiresIn: '4h' }
        );

        // Gerar refresh token (7 dias)
        const refreshToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'refresh'
            },
            process.env.JWT_REFRESH_SECRET!,
            { expiresIn: '7d' }
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
                os: req.get('User-Agent')?.includes('Windows') ? 'Windows' : 'Other'
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
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
                sessionId: session._id
            },
        });

    } catch (error: any) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao fazer login'],
        });
    }
};

/**
 * Controller para refresh token
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
            expiresAt: { $gt: new Date() }
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

        // Atualizar última atividade da sessão
        session.lastActivity = new Date();
        await session.save();

        // Gerar novo access token
        const newAccessToken = jwt.sign(
            {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                type: 'access'
            },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        res.json({
            success: true,
            message: 'Token renovado com sucesso',
            data: {
                accessToken: newAccessToken,
                expiresIn: 900 // 15 minutos em segundos
            },
        });

    } catch (error: any) {
        console.error('Erro no refresh token:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
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
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('[checkSession] Access token válido:', {
                            expiresAt: expiresAt.toISOString(),
                            timeRemainingMs: timeRemaining,
                            timeRemainingMinutes: Math.floor(timeRemaining / 60000),
                        });
                    }
                }
            } catch (error: any) {
                // Token expirado ou inválido, tentar refresh token
                if (process.env.NODE_ENV !== 'production') {
                    console.log('[checkSession] Access token inválido/expirado, tentando refresh token');
                }
            }
        }

        // Se access token não válido, verificar refresh token
        if (!expiresAt || timeRemaining === 0) {
            const refreshToken = req.body.refreshToken || req.cookies?.apphub_refresh_token;
            const sessionId = req.body.sessionId || req.cookies?.apphub_session_id;

            if (refreshToken && sessionId) {
                try {
                    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
                    
                    if (decoded.type === 'refresh') {
                        const session = await Session.findOne({
                            _id: sessionId,
                            refreshToken,
                            isActive: true,
                            expiresAt: { $gt: new Date() }
                        });

                        if (session) {
                            // Retornar tempo restante do refresh token (sessão)
                            expiresAt = session.expiresAt;
                            timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());
                            
                            if (process.env.NODE_ENV !== 'production') {
                                console.log('[checkSession] Refresh token válido:', {
                                    expiresAt: expiresAt.toISOString(),
                                    timeRemainingMs: timeRemaining,
                                    timeRemainingMinutes: Math.floor(timeRemaining / 60000),
                                });
                            }
                        } else {
                            if (process.env.NODE_ENV !== 'production') {
                                console.log('[checkSession] Sessão não encontrada ou inativa');
                            }
                        }
                    }
                } catch (error: any) {
                    // Refresh token inválido
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('[checkSession] Refresh token inválido/expirado:', error.message);
                    }
                }
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    console.log('[checkSession] Sem refresh token ou sessionId');
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
        console.error('[checkSession] Erro ao verificar sessão:', error);
        // Retornar resposta de erro estruturada
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
                await Session.updateMany(
                    { userId, isActive: true },
                    { isActive: false }
                );
            }
        }

        res.json({
            success: true,
            message: 'Logout realizado com sucesso',
        });

    } catch (error: any) {
        console.error('Erro no logout:', error);
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
        console.error('Erro ao obter dados do usuário:', error);
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
        console.error('Erro ao atualizar perfil:', error);

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

        // Atualizar senha
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Senha alterada com sucesso',
        });

    } catch (error: any) {
        console.error('Erro ao alterar senha:', error);

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

        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao alterar senha'],
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

    } catch (error: any) {
        console.error('Erro ao obter sessões:', error);
        res.status(500).json({
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
            isActive: true
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
        console.error('Erro ao invalidar sessão:', error);
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
        console.error('Erro ao invalidar todas as sessões:', error);
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
                errors: ['Apenas administradores podem acessar esta funcionalidade']
            });
        }

        // Estatísticas de sessões
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ 
            isActive: true, 
            expiresAt: { $gt: new Date() } 
        });

        // Estatísticas de usuários
        const totalUsers = await User.countDocuments();

        // Logins de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogins = await Session.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            data: {
                totalSessions,
                activeSessions,
                totalUsers,
                todayLogins
            }
        });
    } catch (error: any) {
        console.error('Error getting session stats:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: [error.message]
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
            deletedAt: null 
        }).select('-password').lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Buscar pedidos do usuário (sem QR codes - apenas visualização)
        const orders = await Order.find({ 
            customer: userId,
            deletedAt: null 
        })
            .populate('event', 'name date location coverImage')
            .populate({
                path: 'tickets',
                select: 'code status price ticketType', // Não incluir qrCode
                match: { deletedAt: null }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: {
                user,
                orders
            }
        });

    } catch (error: any) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuário',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search = '', role = '', status = '', suspicious = '', blacklisted = '' } = req.query;
        
        // Construir filtros
        const filters: any = {};
        
        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
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
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error: any) {
        console.error('Erro ao listar usuários:', error);
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
            data: user
        });

    } catch (error: any) {
        console.error('Erro ao atualizar status do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            errors: ['Erro ao atualizar status do usuário'],
        });
    }
};
