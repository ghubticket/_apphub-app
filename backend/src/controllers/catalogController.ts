import { Request, Response } from 'express';
import { Event, TicketType } from '../models';
import { cacheCatalog, generateCacheKey } from '../services/cacheService';
import { captureControllerError } from '../utils/sentryErrorHandler';

/**
 * Endpoint otimizado para retornar catálogo completo (eventos + ticket types)
 * Usa aggregation pipeline para juntar tudo em uma única query
 * 
 * @route GET /api/catalog
 * @query limitEvents - Limite de eventos (padrão: 12)
 * @query limitTicketsPerEvent - Limite de tickets por evento (opcional)
 * @query search - Busca por nome, localização ou cidade
 * @query onlyWithAvailability - Apenas tickets com disponibilidade (padrão: false)
 */
export const getCatalog = async (req: Request, res: Response) => {
    try {
        const {
            limitEvents = 12,
            limitTicketsPerEvent,
            search = '',
            onlyWithAvailability,
        } = req.query;

        // Converter onlyWithAvailability para boolean
        const onlyWithAvailabilityBool = 
            String(onlyWithAvailability) === 'true' || 
            String(onlyWithAvailability) === '1';

        // Tentar obter do cache primeiro
        const cacheKey = generateCacheKey({
            limitEvents: Number(limitEvents),
            limitTicketsPerEvent: limitTicketsPerEvent ? Number(limitTicketsPerEvent) : undefined,
            search: String(search),
            onlyWithAvailability: onlyWithAvailabilityBool,
        });
        
        const cachedCatalog = cacheCatalog.get(cacheKey);
        if (cachedCatalog) {
            return res.json({
                success: true,
                data: {
                    catalog: cachedCatalog,
                    meta: {
                        limitEvents: Number(limitEvents),
                        limitTicketsPerEvent: limitTicketsPerEvent ? Number(limitTicketsPerEvent) : null,
                        search: search || null,
                        onlyWithAvailability: onlyWithAvailabilityBool,
                        totalEvents: cachedCatalog.length,
                        cached: true,
                    },
                },
            });
        }

        // Construir filtros base para eventos
        const eventFilters: any = {
            deletedAt: null,
            isActive: { $ne: false },
            status: { $nin: ['cancelled', 'finished'] },
        };

        // Adicionar busca se fornecida
        if (search) {
            eventFilters.$or = [
                { name: { $regex: String(search), $options: 'i' } },
                { location: { $regex: String(search), $options: 'i' } },
                { city: { $regex: String(search), $options: 'i' } },
            ];
        }

        // Pipeline de agregação para juntar eventos e ticket types
        const pipeline: any[] = [
            // Match eventos que atendem aos filtros
            {
                $match: eventFilters,
            },
            // Ordenar por data de criação (mais recentes primeiro)
            {
                $sort: { createdAt: -1 },
            },
            // Limitar quantidade de eventos
            {
                $limit: Number(limitEvents),
            },
            // Lookup para buscar ticket types
            {
                $lookup: {
                    from: 'tickettypes',
                    let: { eventId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$event', '$$eventId'] },
                                        { $eq: ['$deletedAt', null] },
                                        { $ne: ['$isActive', false] },
                                    ],
                                },
                            },
                        },
                        // Calcular disponibilidade
                        {
                            $addFields: {
                                availableQuantity: {
                                    $subtract: ['$maxQuantity', '$soldQuantity'],
                                },
                            },
                        },
                        // Filtrar por disponibilidade se solicitado
                        ...(onlyWithAvailabilityBool
                            ? [
                                  {
                                      $match: {
                                          availableQuantity: { $gt: 0 },
                                      },
                                  },
                              ]
                            : []),
                        // Ordenar por lotNumber
                        {
                            $sort: { lotNumber: 1 },
                        },
                        // Limitar tickets por evento se especificado
                        ...(limitTicketsPerEvent
                            ? [{ $limit: Number(limitTicketsPerEvent) }]
                            : []),
                    ],
                    as: 'ticketTypes',
                },
            },
            // Filtrar eventos que não têm tickets (se onlyWithAvailability)
            ...(onlyWithAvailabilityBool
                ? [
                      {
                          $match: {
                              'ticketTypes.0': { $exists: true },
                          },
                      },
                  ]
                : []),
            // Projetar apenas campos necessários
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    date: 1,
                    location: 1,
                    city: 1,
                    state: 1,
                    coverImage: 1,
                    squareImage: 1,
                    status: 1,
                    isActive: 1,
                    ticketFee: 1,
                    platformFeePercentage: 1,
                    createdAt: 1,
                    ticketTypes: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        price: 1,
                        lotNumber: 1,
                        maxQuantity: 1,
                        soldQuantity: 1,
                        maxPerPurchase: 1,
                        isVIP: 1,
                        isActive: 1,
                        salesStart: 1,
                        salesEnd: 1,
                        availableQuantity: 1,
                    },
                },
            },
        ];

        const catalog = await Event.aggregate(pipeline);

        // Armazenar no cache (3 minutos)
        cacheCatalog.set(cacheKey, catalog, 3 * 60 * 1000);

        res.json({
            success: true,
            data: {
                catalog,
                meta: {
                    limitEvents: Number(limitEvents),
                    limitTicketsPerEvent: limitTicketsPerEvent ? Number(limitTicketsPerEvent) : null,
                    search: search || null,
                    onlyWithAvailability: onlyWithAvailabilityBool,
                    totalEvents: catalog.length,
                    cached: false,
                },
            },
        });
    } catch (error: any) {
        console.error('[getCatalog] ❌ Erro:', error);
        
        captureControllerError(error, req, {
            controller: 'catalogController',
            action: 'getCatalog',
            statusCode: 500,
            extra: {
                search: req.query?.search,
                limitEvents: req.query?.limitEvents,
            },
        });
        
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar catálogo',
            errors: [error.message],
        });
    }
};

