# 💻 Exemplos de Código - Multi-Tenant

Este documento contém exemplos práticos de implementação do sistema multi-tenant.

---

## 1. Modelo Organization

```typescript
// backend/src/models/Organization.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
    name: string;
    slug: string; // único, usado em subdomain
    domain?: string; // custom domain (opcional)
    subdomain?: string; // subdomain (opcional)
    status: 'active' | 'suspended' | 'trial';
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    settings: {
        platformFeePercentage: number;
        currency: string;
        timezone: string;
        language: string;
        logo?: string;
        primaryColor?: string;
        secondaryColor?: string;
        allowCustomDomain: boolean;
    };
    owner: mongoose.Types.ObjectId; // User que criou
    admins: mongoose.Types.ObjectId[]; // Usuários admin desta org
    createdAt: Date;
    updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
    {
        name: {
            type: String,
            required: [true, 'Nome da organização é obrigatório'],
            trim: true,
            maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
        },
        slug: {
            type: String,
            required: [true, 'Slug é obrigatório'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9-]+$/, 'Slug deve conter apenas letras, números e hífens'],
        },
        domain: {
            type: String,
            trim: true,
            lowercase: true,
        },
        subdomain: {
            type: String,
            trim: true,
            lowercase: true,
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'trial'],
            default: 'active',
        },
        plan: {
            type: String,
            enum: ['free', 'basic', 'premium', 'enterprise'],
            default: 'free',
        },
        settings: {
            platformFeePercentage: {
                type: Number,
                default: 5,
                min: 0,
                max: 100,
            },
            currency: {
                type: String,
                default: 'BRL',
            },
            timezone: {
                type: String,
                default: 'America/Sao_Paulo',
            },
            language: {
                type: String,
                default: 'pt-BR',
            },
            logo: String,
            primaryColor: String,
            secondaryColor: String,
            allowCustomDomain: {
                type: Boolean,
                default: false,
            },
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        admins: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    {
        timestamps: true,
    }
);

// Índices
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ domain: 1 });
organizationSchema.index({ subdomain: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ owner: 1 });

export default mongoose.model<IOrganization>('Organization', organizationSchema);
```

---

## 2. Middleware de Resolução de Tenant

```typescript
// backend/src/middleware/tenantResolver.ts
import { Request, Response, NextFunction } from 'express';
import Organization from '../models/Organization';
import logger from '../utils/logger';

export interface TenantRequest extends Request {
    tenant?: any;
    tenantId?: mongoose.Types.ObjectId;
}

/**
 * Resolve o tenant baseado no hostname (subdomain ou custom domain)
 */
export const resolveTenant = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const hostname = req.get('host') || '';
        const protocol = req.protocol;
        const fullHost = `${protocol}://${hostname}`;

        // Extrair subdomain (ex: guilherme.vicente.app -> guilherme)
        const parts = hostname.split('.');
        const subdomain = parts.length > 2 ? parts[0] : null;

        // Buscar organização por subdomain ou custom domain
        const organization = await Organization.findOne({
            $or: [
                { subdomain: subdomain },
                { domain: hostname },
                { slug: subdomain },
            ],
            status: 'active', // Apenas organizações ativas
        }).select('_id name slug domain subdomain settings plan status');

        if (!organization) {
            logger.warn(`Tenant não encontrado para hostname: ${hostname}`);
            return res.status(404).json({
                success: false,
                message: 'Organização não encontrada ou inativa',
            });
        }

        // Verificar se organização está suspensa
        if (organization.status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Organização suspensa. Entre em contato com o suporte.',
            });
        }

        // Adicionar tenant ao request
        req.tenant = organization;
        req.tenantId = organization._id;

        // Log para debug (remover em produção se necessário)
        logger.debug(`Tenant resolvido: ${organization.name} (${organization.slug})`);

        next();
    } catch (error: any) {
        logger.error('Erro ao resolver tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao identificar organização',
        });
    }
};

/**
 * Middleware opcional para rotas que não precisam de tenant
 * (ex: health check, webhooks globais)
 */
export const optionalTenantResolver = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const hostname = req.get('host') || '';
        const parts = hostname.split('.');
        const subdomain = parts.length > 2 ? parts[0] : null;

        const organization = await Organization.findOne({
            $or: [
                { subdomain: subdomain },
                { domain: hostname },
                { slug: subdomain },
            ],
            status: 'active',
        }).select('_id name slug domain subdomain settings plan status');

        if (organization) {
            req.tenant = organization;
            req.tenantId = organization._id;
        }

        next();
    } catch (error: any) {
        // Em caso de erro, continua sem tenant
        logger.warn('Erro ao resolver tenant (opcional):', error);
        next();
    }
};
```

---

## 3. Middleware de Isolamento

```typescript
// backend/src/middleware/tenantIsolation.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from './tenantResolver';
import logger from '../utils/logger';

/**
 * Força isolamento de dados - garante que todas as queries incluam organizationId
 */
export const enforceTenantIsolation = (
    req: TenantRequest,
    res: Response,
    next: NextFunction
): void => {
    const tenantId = req.tenantId;

    if (!tenantId) {
        logger.error('Tentativa de acesso sem tenant identificado');
        return res.status(400).json({
            success: false,
            message: 'Tenant não identificado',
        });
    }

    // Helper para adicionar filtro de tenant em queries
    req.addTenantFilter = (query: any = {}) => {
        return {
            ...query,
            organizationId: tenantId,
        };
    };

    // Helper para validar se um documento pertence ao tenant
    req.validateTenantAccess = (document: any) => {
        if (!document) {
            return false;
        }

        const docOrgId = document.organizationId?.toString() || document.organizationId;
        const tenantIdStr = tenantId.toString();

        if (docOrgId !== tenantIdStr) {
            logger.warn(
                `Tentativa de acesso a documento de outro tenant. Doc: ${docOrgId}, Tenant: ${tenantIdStr}`
            );
            return false;
        }

        return true;
    };

    next();
};

/**
 * Middleware para validar se usuário pertence à organização
 */
export const validateUserOrganization = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = (req as any).user;
        const tenantId = req.tenantId;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
            });
        }

        // Admin global pode acessar qualquer tenant
        if (user.role === 'ADMIN' && user.isGlobalAdmin) {
            return next();
        }

        // Verificar se usuário pertence à organização
        const userOrgId = user.organizationId?.toString();
        const tenantIdStr = tenantId?.toString();

        if (userOrgId !== tenantIdStr) {
            logger.warn(
                `Usuário ${user._id} tentou acessar organização ${tenantIdStr}, mas pertence a ${userOrgId}`
            );
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar esta organização',
            });
        }

        next();
    } catch (error: any) {
        logger.error('Erro ao validar organização do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar permissões',
        });
    }
};
```

---

## 4. Modificação do Modelo Event

```typescript
// backend/src/models/Event.ts (modificações)

// Adicionar ao interface
export interface IEvent extends Document {
    // ... campos existentes
    organizationId: mongoose.Types.ObjectId; // NOVO
    // ... resto dos campos
}

// Adicionar ao schema
const eventSchema = new Schema<IEvent>(
    {
        // ... campos existentes
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: [true, 'Organização é obrigatória'],
            index: true,
        },
        // ... resto dos campos
    },
    {
        timestamps: true,
    }
);

// Adicionar índices compostos
eventSchema.index({ organizationId: 1, isActive: 1 });
eventSchema.index({ organizationId: 1, date: 1 });
eventSchema.index({ organizationId: 1, status: 1 });
eventSchema.index({ organizationId: 1, organizer: 1 });
```

---

## 5. Controller Atualizado (Exemplo: Events)

```typescript
// backend/src/controllers/eventsController.ts (modificações)

export const getEvents = async (req: Request, res: Response) => {
    try {
        const tenantId = (req as any).tenantId;
        
        // ANTES:
        // const events = await Event.find({ isActive: true });
        
        // DEPOIS:
        const events = await Event.find({
            organizationId: tenantId, // Sempre filtrar por tenant
            isActive: true,
        })
            .populate('organizer', 'name email')
            .sort({ date: 1 })
            .lean();

        res.json({
            success: true,
            data: events,
        });
    } catch (error: any) {
        // ... tratamento de erro
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).user?._id;

        // Validar que o organizador pertence à mesma organização
        const organizer = await User.findById(userId);
        if (organizer.organizationId?.toString() !== tenantId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Organizador não pertence a esta organização',
            });
        }

        const event = new Event({
            ...req.body,
            organizationId: tenantId, // Sempre incluir tenantId
            organizer: userId,
        });

        await event.save();

        res.status(201).json({
            success: true,
            data: event,
        });
    } catch (error: any) {
        // ... tratamento de erro
    }
};

export const getEventById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).tenantId;

        const event = await Event.findOne({
            _id: id,
            organizationId: tenantId, // Sempre filtrar por tenant
            deletedAt: null,
        })
            .populate('organizer', 'name email')
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
            });
        }

        // Validação extra de segurança
        if (!(req as any).validateTenantAccess(event)) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
            });
        }

        res.json({
            success: true,
            data: event,
        });
    } catch (error: any) {
        // ... tratamento de erro
    }
};
```

---

## 6. Rotas Atualizadas

```typescript
// backend/src/routes/events.ts

import express from 'express';
import { resolveTenant, optionalTenantResolver } from '../middleware/tenantResolver';
import { enforceTenantIsolation, validateUserOrganization } from '../middleware/tenantIsolation';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/authorization';
import * as eventsController from '../controllers/eventsController';

const router = express.Router();

// Aplicar middleware de tenant em todas as rotas
router.use(resolveTenant);
router.use(enforceTenantIsolation);

// Rotas públicas (catalog) - tenant opcional
router.get('/catalog', optionalTenantResolver, eventsController.getPublicEvents);

// Rotas autenticadas
router.get('/', authenticate, validateUserOrganization, eventsController.getEvents);
router.get('/:id', authenticate, validateUserOrganization, eventsController.getEventById);
router.post('/', authenticate, validateUserOrganization, isAdmin, eventsController.createEvent);
router.patch('/:id', authenticate, validateUserOrganization, isAdmin, eventsController.updateEvent);
router.delete('/:id', authenticate, validateUserOrganization, isAdmin, eventsController.deleteEvent);

export default router;
```

---

## 7. Server.ts Atualizado

```typescript
// backend/src/server.ts (modificações)

// Importar middlewares
import { resolveTenant, optionalTenantResolver } from './middleware/tenantResolver';
import { enforceTenantIsolation } from './middleware/tenantIsolation';

// Aplicar em rotas específicas
app.use('/api/events', resolveTenant, enforceTenantIsolation, eventsRoutes);
app.use('/api/orders', resolveTenant, enforceTenantIsolation, ordersRoutes);
app.use('/api/tickets', resolveTenant, enforceTenantIsolation, ticketsRoutes);

// Rotas que não precisam de tenant
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks podem ser globais
```

---

## 8. Script de Migração

```typescript
// backend/scripts/migrateToMultiTenant.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../src/models/Organization';
import Event from '../src/models/Event';
import Order from '../src/models/Order';
import Ticket from '../src/models/Ticket';
import TicketType from '../src/models/TicketType';
import User from '../src/models/User';
import { connectDatabase } from '../src/config/database';

dotenv.config();

async function migrateToMultiTenant() {
    try {
        console.log('🔄 Iniciando migração para multi-tenant...');

        // Conectar ao banco
        await connectDatabase();
        console.log('✅ Conectado ao banco de dados');

        // 1. Criar organização padrão "Vicente"
        let defaultOrg = await Organization.findOne({ slug: 'vicente' });

        if (!defaultOrg) {
            console.log('📦 Criando organização padrão "Vicente"...');
            
            // Buscar primeiro admin para ser owner
            const firstAdmin = await User.findOne({ role: 'ADMIN' });
            
            if (!firstAdmin) {
                throw new Error('Nenhum usuário ADMIN encontrado. Crie um admin primeiro.');
            }

            defaultOrg = await Organization.create({
                name: 'Vicente',
                slug: 'vicente',
                subdomain: 'vicente',
                domain: 'vicente.app',
                status: 'active',
                plan: 'enterprise',
                owner: firstAdmin._id,
                admins: [firstAdmin._id],
                settings: {
                    platformFeePercentage: 5,
                    currency: 'BRL',
                    timezone: 'America/Sao_Paulo',
                    language: 'pt-BR',
                    allowCustomDomain: true,
                },
            });

            console.log(`✅ Organização padrão criada: ${defaultOrg._id}`);
        } else {
            console.log(`✅ Organização padrão já existe: ${defaultOrg._id}`);
        }

        // 2. Atualizar todos os modelos com organizationId
        console.log('📝 Atualizando modelos...');

        // Events
        const eventsUpdated = await Event.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: defaultOrg._id } }
        );
        console.log(`✅ ${eventsUpdated.modifiedCount} eventos atualizados`);

        // Orders
        const ordersUpdated = await Order.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: defaultOrg._id } }
        );
        console.log(`✅ ${ordersUpdated.modifiedCount} pedidos atualizados`);

        // Tickets
        const ticketsUpdated = await Ticket.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: defaultOrg._id } }
        );
        console.log(`✅ ${ticketsUpdated.modifiedCount} tickets atualizados`);

        // TicketTypes
        const ticketTypesUpdated = await TicketType.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: defaultOrg._id } }
        );
        console.log(`✅ ${ticketTypesUpdated.modifiedCount} tipos de ingresso atualizados`);

        // Users (opcional - alguns podem ser globais)
        const usersUpdated = await User.updateMany(
            {
                organizationId: { $exists: false },
                role: { $ne: 'ADMIN' }, // Não atualizar admins globais
            },
            { $set: { organizationId: defaultOrg._id } }
        );
        console.log(`✅ ${usersUpdated.modifiedCount} usuários atualizados`);

        console.log('✅ Migração concluída com sucesso!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

// Executar
migrateToMultiTenant();
```

---

## 9. Frontend - Detectar Tenant

```typescript
// frontend/lib/tenant.ts

export function getTenantFromHostname(): string | null {
    if (typeof window === 'undefined') return null;

    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // Subdomain: guilherme.vicente.app -> guilherme
    if (parts.length > 2) {
        return parts[0];
    }

    // Custom domain: guilherme.com.br -> buscar no backend
    return null;
}

export function getApiUrl(): string {
    const tenant = getTenantFromHostname();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.vicente.app';

    if (tenant) {
        // Usar subdomain na API
        return baseUrl.replace('api.', `${tenant}.api.`);
    }

    return baseUrl;
}
```

---

## 10. Frontend - API Client Atualizado

```typescript
// frontend/lib/apiClient.ts (modificações)

import { getTenantFromHostname } from './tenant';

const apiClient = axios.create({
    baseURL: getApiUrl(),
});

// Adicionar header de tenant (opcional, se usar header ao invés de subdomain)
apiClient.interceptors.request.use((config) => {
    const tenant = getTenantFromHostname();
    if (tenant) {
        config.headers['X-Tenant-ID'] = tenant;
    }
    return config;
});
```

---

## 11. Testes de Isolamento

```typescript
// backend/tests/tenantIsolation.test.ts

import request from 'supertest';
import app from '../src/server';
import Organization from '../src/models/Organization';
import Event from '../src/models/Event';
import User from '../src/models/User';

describe('Tenant Isolation', () => {
    let tenant1: any;
    let tenant2: any;
    let user1: any;
    let user2: any;

    beforeAll(async () => {
        // Criar dois tenants
        tenant1 = await Organization.create({
            name: 'Tenant 1',
            slug: 'tenant1',
            subdomain: 'tenant1',
            status: 'active',
            plan: 'basic',
            owner: new mongoose.Types.ObjectId(),
            settings: { platformFeePercentage: 5, currency: 'BRL', timezone: 'America/Sao_Paulo', language: 'pt-BR' },
        });

        tenant2 = await Organization.create({
            name: 'Tenant 2',
            slug: 'tenant2',
            subdomain: 'tenant2',
            status: 'active',
            plan: 'basic',
            owner: new mongoose.Types.ObjectId(),
            settings: { platformFeePercentage: 5, currency: 'BRL', timezone: 'America/Sao_Paulo', language: 'pt-BR' },
        });

        // Criar usuários
        user1 = await User.create({
            name: 'User 1',
            email: 'user1@tenant1.com',
            password: 'hashed',
            organizationId: tenant1._id,
            role: 'ADMIN',
        });

        user2 = await User.create({
            name: 'User 2',
            email: 'user2@tenant2.com',
            password: 'hashed',
            organizationId: tenant2._id,
            role: 'ADMIN',
        });
    });

    it('should not return events from other tenants', async () => {
        // Criar eventos em cada tenant
        await Event.create({
            name: 'Event Tenant 1',
            organizationId: tenant1._id,
            organizer: user1._id,
            // ... outros campos
        });

        await Event.create({
            name: 'Event Tenant 2',
            organizationId: tenant2._id,
            organizer: user2._id,
            // ... outros campos
        });

        // Fazer requisição como tenant1
        const response = await request(app)
            .get('/api/events')
            .set('Host', 'tenant1.vicente.app')
            .set('Authorization', `Bearer ${token1}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Event Tenant 1');
    });

    it('should prevent access to other tenant events', async () => {
        const event = await Event.create({
            name: 'Event Tenant 2',
            organizationId: tenant2._id,
            // ... outros campos
        });

        // Tentar acessar como tenant1
        const response = await request(app)
            .get(`/api/events/${event._id}`)
            .set('Host', 'tenant1.vicente.app')
            .set('Authorization', `Bearer ${token1}`);

        expect(response.status).toBe(404);
    });
});
```

---

## 📝 Notas Importantes

1. **Sempre filtrar por `organizationId`** em todas as queries
2. **Validar acesso** antes de retornar dados
3. **Índices compostos** são essenciais para performance
4. **Testes de isolamento** devem ser executados regularmente
5. **Logs** devem incluir `tenantId` para debugging

---

**Próximo passo:** Implementar Etapa 1 do plano (Modelo Organization)

