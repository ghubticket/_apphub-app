import swaggerJsdoc from 'swagger-jsdoc';
import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EventHub API',
            version: '1.0.0',
            description:
                'API para sistema de vendas de ingressos e controle de acesso para eventos de pagode',
            contact: {
                name: 'EventHub Team',
                email: 'contato@eventhub.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:3001/api',
                description: 'Servidor de Desenvolvimento (/api)',
            },
            {
                url: 'http://localhost:3001',
                description: 'Servidor de Desenvolvimento (root)',
            },
            {
                url: 'https://api-eventhub.railway.app',
                description: 'Servidor de Produção',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'Erro na requisição',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                        message: {
                            type: 'string',
                            example: 'Operação realizada com sucesso',
                        },
                        data: {
                            type: 'object',
                        },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011',
                        },
                        name: {
                            type: 'string',
                            example: 'João Silva',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'joao@email.com',
                        },
                        role: {
                            type: 'string',
                            enum: ['client', 'organizer', 'validator'],
                            example: 'client',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                    },
                },
                Event: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011',
                        },
                        name: {
                            type: 'string',
                            example: 'Pagode da Quebrada 2024',
                        },
                        description: {
                            type: 'string',
                            example: 'O maior evento de pagode da cidade',
                        },
                        date: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-12-31T20:00:00Z',
                        },
                        location: {
                            type: 'string',
                            example: 'Arena da Quebrada - São Paulo/SP',
                        },
                        price: {
                            type: 'number',
                            example: 50.0,
                        },
                        capacity: {
                            type: 'number',
                            example: 1000,
                        },
                        soldTickets: {
                            type: 'number',
                            example: 150,
                        },
                        status: {
                            type: 'string',
                            enum: ['draft', 'published', 'cancelled', 'finished'],
                            example: 'published',
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Auth',
                description: 'Endpoints de autenticação (login, registro, logout)',
            },
            {
                name: 'Users',
                description: 'Gerenciamento de usuários',
            },
            {
                name: 'Events',
                description: 'Gerenciamento de eventos',
            },
            {
                name: 'Tickets',
                description: 'Venda e validação de ingressos',
            },
            {
                name: 'Health',
                description: 'Monitoramento da API',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Caminhos para os arquivos com documentação
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
    // Configuração do Swagger UI
    const swaggerUiOptions = {
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; }
    `,
        customSiteTitle: 'EventHub API Documentation',
        customfavIcon: '/favicon.ico',
    };

    // Rota para a documentação
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

    // Rota para o JSON da documentação
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });

    // Swagger configurado
};
