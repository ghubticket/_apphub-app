import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Middleware para validar dados de entrada usando Joi
 */
export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Retorna todos os erros, não apenas o primeiro
            stripUnknown: true, // Remove campos não definidos no schema
            allowUnknown: false, // Não permite campos desconhecidos
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors,
            });
        }

        // Substituir req.body com os dados validados
        req.body = value;
        next();
    };
};

/**
 * Middleware para validar parâmetros de query
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false,
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            return res.status(400).json({
                success: false,
                message: 'Parâmetros de query inválidos',
                errors,
            });
        }

        req.query = value;
        next();
    };
};

/**
 * Middleware para validar parâmetros de URL
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false,
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            return res.status(400).json({
                success: false,
                message: 'Parâmetros de URL inválidos',
                errors,
            });
        }

        req.params = value;
        next();
    };
};
