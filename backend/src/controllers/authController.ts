import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';

/**
 * Controller para registro de usuário
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, phone, cpf } = req.body;

        // Verificar se o email já existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
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
            role: role || 'client',
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

        // Buscar usuário por email (incluindo senha para comparação)
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

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
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas',
                errors: ['Email ou senha incorretos'],
            });
        }

        // Atualizar último login
        user.lastLogin = new Date();
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

        // Retornar dados do usuário (sem senha) e token
        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: user.toJSON(),
                token,
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
 * Controller para logout
 */
export const logout = async (req: Request, res: Response) => {
    try {
        // Em um sistema mais robusto, você poderia:
        // 1. Adicionar o token a uma blacklist
        // 2. Invalidar o token no banco de dados
        // 3. Limpar cookies se estivesse usando

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
        const user = await User.findById(userId);
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
        const user = await User.findById(userId).select('+password');
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
