import { Request, Response } from 'express';
import EventDetails, { IEventDetails } from '../models/EventDetails';
import Event from '../models/Event';
import { captureControllerError } from '../utils/sentryErrorHandler';
import logger from '../utils/logger';

/**
 * Buscar detalhes de um evento
 * GET /api/event-details/:eventId
 */
export const getEventDetails = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'ID do evento é obrigatório',
                errors: ['ID do evento não fornecido'],
            });
        }

        // Verificar se o evento existe e está ativo
        const event = await Event.findOne({
            _id: eventId,
            deletedAt: null,
            isActive: true,
        }).lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
                errors: ['Evento não encontrado ou inativo'],
            });
        }

        // Buscar detalhes do evento
        const eventDetails = await EventDetails.findOne({
            event: eventId,
            isActive: true,
            deletedAt: null,
        }).lean();

        if (!eventDetails) {
            return res.status(404).json({
                success: false,
                message: 'Detalhes do evento não encontrados',
                errors: ['Detalhes não configurados para este evento'],
            });
        }

        res.json({
            success: true,
            data: eventDetails,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'eventDetailsController',
            action: 'getEventDetails',
            statusCode: 500,
        });

        logger.error('Erro ao buscar detalhes do evento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar detalhes do evento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Criar ou atualizar detalhes de um evento
 * POST /api/event-details
 * PUT /api/event-details/:eventId
 */
export const upsertEventDetails = async (req: Request, res: Response) => {
    try {
        const eventId = req.params.eventId || req.body.event;
        const userId = (req as any).user?._id;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'ID do evento é obrigatório',
                errors: ['ID do evento não fornecido'],
            });
        }

        // Verificar se o evento existe
        const event = await Event.findOne({
            _id: eventId,
            deletedAt: null,
        }).lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
                errors: ['Evento não encontrado'],
            });
        }

        // Verificar se o usuário é organizador do evento ou admin
        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOrganizer = event.organizer?.toString() === userId?.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para editar este evento',
                errors: ['Acesso negado'],
            });
        }

        // Preparar dados para atualização
        const updateData: any = {
            event: eventId,
            isActive: true,
        };

        // Sobre o Evento (descrição principal)
        if (req.body.about !== undefined) {
            if (req.body.about === null) {
                updateData.about = null;
            } else {
                updateData.about = {
                    richText: req.body.about.richText || undefined, // Conteúdo HTML do editor
                };
            }
        }

        // Incluso no Pacote
        if (req.body.packageIncludes !== undefined) {
            if (req.body.packageIncludes === null) {
                updateData.packageIncludes = null;
            } else {
                updateData.packageIncludes = {
                    title: req.body.packageIncludes.title?.trim() || undefined,
                    items: Array.isArray(req.body.packageIncludes.items)
                        ? req.body.packageIncludes.items
                              .filter((item: any) => item && typeof item === 'string')
                              .map((item: string) => item.trim())
                              .filter((item: string) => item.length > 0)
                              .slice(0, 50) // Limitar a 50 itens
                        : [],
                    richText: req.body.packageIncludes.richText || undefined, // Conteúdo HTML do editor
                };
            }
        }

        // Transporte
        if (req.body.transport !== undefined) {
            if (req.body.transport === null) {
                updateData.transport = null;
            } else {
                const transport = req.body.transport;
                updateData.transport = {
                    departureLocations: Array.isArray(transport.departureLocations)
                        ? transport.departureLocations
                              .filter((loc: any) => loc && loc.name && loc.address)
                              .map((loc: any) => ({
                                  name: String(loc.name).trim().substring(0, 200),
                                  address: String(loc.address).trim().substring(0, 500),
                                  meetingTime: String(loc.meetingTime || '').trim().substring(0, 5),
                                  departureTime: String(loc.departureTime || '').trim().substring(0, 5),
                                  price: loc.price ? Math.max(0, Number(loc.price)) : undefined,
                              }))
                              .slice(0, 20) // Limitar a 20 locais
                        : [],
                    returnTime: transport.returnTime?.trim().substring(0, 200) || undefined,
                    transportType: transport.transportType?.trim().substring(0, 200) || undefined,
                    includes: Array.isArray(transport.includes)
                        ? transport.includes
                              .filter((item: any) => item && typeof item === 'string')
                              .map((item: string) => item.trim().substring(0, 200))
                              .filter((item: string) => item.length > 0)
                              .slice(0, 20) // Limitar a 20 itens
                        : undefined,
                    richText: transport.richText || undefined, // Conteúdo HTML do editor
                };
            }
        }

        // Atrações
        if (req.body.attractions !== undefined) {
            if (req.body.attractions === null) {
                updateData.attractions = null;
            } else {
                const attractions = req.body.attractions;
                updateData.attractions = {
                    title: attractions.title?.trim().substring(0, 200) || undefined,
                    items: Array.isArray(attractions.items)
                        ? attractions.items
                              .filter((item: any) => item && item.name)
                              .map((item: any) => ({
                                  name: String(item.name).trim().substring(0, 200),
                                  date: item.date?.trim().substring(0, 50) || undefined,
                                  stage: item.stage?.trim().substring(0, 100) || undefined,
                                  order: item.order ? Math.max(0, Number(item.order)) : undefined,
                              }))
                              .slice(0, 100) // Limitar a 100 atrações
                        : [],
                    groupedByDate: Boolean(attractions.groupedByDate),
                    richText: attractions.richText || undefined, // Conteúdo HTML do editor
                };
            }
        }

        // Tabela de Preços
        if (req.body.pricing !== undefined) {
            if (req.body.pricing === null) {
                updateData.pricing = null;
            } else {
                const pricing = req.body.pricing;
                updateData.pricing = {
                    title: pricing.title?.trim().substring(0, 200) || undefined,
                    pricesByLocation: Array.isArray(pricing.pricesByLocation)
                        ? pricing.pricesByLocation
                              .filter((item: any) => item && item.locationName)
                              .map((item: any) => ({
                                  locationName: String(item.locationName).trim().substring(0, 200),
                                  pixPrice: item.pixPrice ? Math.max(0, Number(item.pixPrice)) : undefined,
                                  creditCardPrice: item.creditCardPrice
                                      ? Math.max(0, Number(item.creditCardPrice))
                                      : undefined,
                                  installments: item.installments
                                      ? Math.max(1, Math.min(24, Number(item.installments)))
                                      : undefined,
                                  description: item.description?.trim().substring(0, 500) || undefined,
                              }))
                              .slice(0, 50) // Limitar a 50 locais
                        : [],
                    generalInfo: pricing.generalInfo?.trim().substring(0, 1000) || undefined,
                    pixDiscount: pricing.pixDiscount
                        ? Math.max(0, Math.min(100, Number(pricing.pixDiscount)))
                        : undefined,
                    richText: pricing.richText || undefined, // Conteúdo HTML do editor
                };
            }
        }

        // Vídeo
        if (req.body.video !== undefined) {
            if (req.body.video === null) {
                updateData.video = null;
            } else {
                const video = req.body.video;
                
                // Se for código embed/iframe, salvar diretamente sem validar URL
                if (video.url && (video.url.includes('<iframe') || video.url.includes('iframe'))) {
                    updateData.video = {
                        url: String(video.url).trim(), // Salvar o código iframe completo
                        thumbnail: video.thumbnail?.trim().substring(0, 500) || undefined,
                        title: video.title?.trim().substring(0, 200) || undefined,
                        description: video.description?.trim().substring(0, 1000) || undefined,
                    };
                } else if (video.url) {
                    // Validar URL do vídeo apenas se não for iframe
                    const videoUrlPattern =
                        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|facebook\.com\/watch)/;
                    if (!videoUrlPattern.test(video.url)) {
                        return res.status(400).json({
                            success: false,
                            message: 'URL do vídeo inválida',
                            errors: ['URL deve ser do YouTube, Vimeo, Dailymotion ou Facebook, ou código iframe'],
                        });
                    }

                    updateData.video = {
                        url: String(video.url).trim(),
                        thumbnail: video.thumbnail?.trim().substring(0, 500) || undefined,
                        title: video.title?.trim().substring(0, 200) || undefined,
                        description: video.description?.trim().substring(0, 1000) || undefined,
                    };
                }
            }
        }

        // FAQ
        if (req.body.faq !== undefined) {
            if (req.body.faq === null) {
                updateData.faq = null;
            } else {
                const faq = req.body.faq;
                updateData.faq = {
                    title: faq.title?.trim().substring(0, 200) || undefined,
                    items: Array.isArray(faq.items)
                        ? faq.items
                              .filter((item: any) => item && item.question && item.answer)
                              .map((item: any) => ({
                                  question: String(item.question).trim().substring(0, 500),
                                  answer: String(item.answer).trim().substring(0, 5000),
                                  order: item.order ? Math.max(0, Number(item.order)) : undefined,
                              }))
                              .slice(0, 50) // Limitar a 50 FAQs
                        : [],
                };
            }
        }

        // Usar findOneAndUpdate com upsert para criar ou atualizar
        const eventDetails = await EventDetails.findOneAndUpdate(
            { event: eventId },
            updateData,
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );

        res.json({
            success: true,
            message: 'Detalhes do evento salvos com sucesso',
            data: eventDetails,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'eventDetailsController',
            action: 'upsertEventDetails',
            statusCode: 500,
        });

        logger.error('Erro ao salvar detalhes do evento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar detalhes do evento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

/**
 * Deletar detalhes de um evento (soft delete)
 * DELETE /api/event-details/:eventId
 */
export const deleteEventDetails = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = (req as any).user?._id;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'ID do evento é obrigatório',
                errors: ['ID do evento não fornecido'],
            });
        }

        // Verificar se o evento existe
        const event = await Event.findOne({
            _id: eventId,
            deletedAt: null,
        }).lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
                errors: ['Evento não encontrado'],
            });
        }

        // Verificar permissões
        const isAdmin = (req as any).user?.role === 'ADMIN';
        const isOrganizer = event.organizer?.toString() === userId?.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para deletar este evento',
                errors: ['Acesso negado'],
            });
        }

        // Soft delete
        const eventDetails = await EventDetails.findOneAndUpdate(
            { event: eventId },
            {
                isActive: false,
                deletedAt: new Date(),
            },
            { new: true }
        );

        if (!eventDetails) {
            return res.status(404).json({
                success: false,
                message: 'Detalhes do evento não encontrados',
                errors: ['Detalhes não encontrados'],
            });
        }

        res.json({
            success: true,
            message: 'Detalhes do evento deletados com sucesso',
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'eventDetailsController',
            action: 'deleteEventDetails',
            statusCode: 500,
        });

        logger.error('Erro ao deletar detalhes do evento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar detalhes do evento',
            errors: [error.message || 'Erro desconhecido'],
        });
    }
};

