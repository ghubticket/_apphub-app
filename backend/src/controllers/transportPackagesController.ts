import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { TransportPackage, Order, Event, EventDetails, User } from '../models';
import { normalizeCPF, normalizeEmail } from '../utils/validationHelpers';
import { generateQRCode } from '../services/qrCodeService';
import { captureControllerError } from '../utils/sentryErrorHandler';

/**
 * Lista pacotes de transporte disponíveis para um evento
 * Baseado nas informações de transporte do EventDetails
 */
export const getAvailablePackages = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do evento inválido',
            });
        }

        // Buscar evento
        const event = await Event.findById(eventId).select('_id name date').lean();
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
            });
        }

        // Buscar detalhes do evento
        const eventDetails = await EventDetails.findOne({
            event: eventId,
            isActive: true,
            deletedAt: null,
        }).lean();

        if (!eventDetails || !eventDetails.transport || !eventDetails.transport.departureLocations) {
            return res.status(200).json({
                success: true,
                data: {
                    event: {
                        id: event._id,
                        name: event.name,
                        date: event.date,
                    },
                    availableDates: [],
                    departureLocations: [],
                    packageTypes: [],
                },
            });
        }

        // Extrair datas disponíveis (pode ser múltiplas datas para eventos multi-dia)
        // Por enquanto, vamos usar a data do evento principal
        const availableDates = [
            {
                date: event.date,
                label: new Date(event.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            },
        ];

        // Extrair locais de saída
        const departureLocations = eventDetails.transport.departureLocations.map((loc) => ({
            name: loc.name,
            address: loc.address,
            meetingTime: loc.meetingTime,
            departureTime: loc.departureTime,
            price: loc.price,
        }));

        // Extrair tipos de pacote (pode vir do EventDetails ou ser padrão)
        const packageTypes = eventDetails.transport.transportType
            ? [
                  {
                      id: 'standard',
                      name: eventDetails.transport.transportType,
                      description: eventDetails.transport.includes?.join(', ') || '',
                  },
              ]
            : [
                  {
                      id: 'standard',
                      name: 'TRANSPORTE IDA E VOLTA - SEM OPEN BAR',
                      description: '',
                  },
              ];

        return res.status(200).json({
            success: true,
            data: {
                event: {
                    id: event._id,
                    name: event.name,
                    date: event.date,
                },
                availableDates,
                departureLocations,
                packageTypes,
                returnTime: eventDetails.transport.returnTime,
                transportType: eventDetails.transport.transportType,
                includes: eventDetails.transport.includes || [],
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'transportPackagesController',
            action: 'getAvailablePackages',
        });
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar pacotes disponíveis',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

interface CreateTransportPackageRequest {
    eventId: string;
    eventDate: string; // Data do evento (ISO string)
    departureLocationName: string; // Nome do local de saída
    packageType: string; // Tipo de pacote
    passengerData: {
        name: string;
        phone: string;
        rg: string;
        cpf: string;
    };
    orderId?: string; // ID do pedido existente (opcional)
}

/**
 * Cria um pedido de pacote de transporte
 * Se orderId for fornecido, adiciona o pacote ao pedido existente
 * Caso contrário, cria um novo pedido
 */
export const createTransportPackage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || null;
        const {
            eventId,
            eventDate,
            departureLocationName,
            packageType,
            passengerData,
            orderId,
        } = req.body as CreateTransportPackageRequest;

        // Validações básicas
        if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do evento inválido',
            });
        }

        if (!eventDate) {
            return res.status(400).json({
                success: false,
                message: 'Data do evento é obrigatória',
            });
        }

        if (!departureLocationName) {
            return res.status(400).json({
                success: false,
                message: 'Local de saída é obrigatório',
            });
        }

        if (!packageType) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de pacote é obrigatório',
            });
        }

        if (!passengerData || !passengerData.name || !passengerData.phone || !passengerData.rg || !passengerData.cpf) {
            return res.status(400).json({
                success: false,
                message: 'Dados do passageiro são obrigatórios',
            });
        }

        // Buscar evento
        const event = await Event.findById(eventId).select('_id name date organizer').lean();
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado',
            });
        }

        // Buscar detalhes do evento para obter informações do transporte
        const eventDetails = await EventDetails.findOne({
            event: eventId,
            isActive: true,
            deletedAt: null,
        }).lean();

        if (!eventDetails || !eventDetails.transport || !eventDetails.transport.departureLocations) {
            return res.status(404).json({
                success: false,
                message: 'Pacotes de transporte não disponíveis para este evento',
            });
        }

        // Encontrar local de saída
        const departureLocation = eventDetails.transport.departureLocations.find(
            (loc) => loc.name === departureLocationName
        );

        if (!departureLocation) {
            return res.status(404).json({
                success: false,
                message: 'Local de saída não encontrado',
            });
        }

        // Calcular preço (usar preço do local ou preço padrão do pricing)
        let price = departureLocation.price || 0;

        // Se não tem preço no local, buscar no pricing
        if (!price && eventDetails.pricing && eventDetails.pricing.pricesByLocation) {
            const priceByLocation = eventDetails.pricing.pricesByLocation.find(
                (p) => p.locationName === departureLocationName
            );
            if (priceByLocation) {
                price = priceByLocation.creditCardPrice || priceByLocation.pixPrice || 0;
            }
        }

        if (price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Preço do pacote não configurado',
            });
        }

        // Buscar ou criar usuário
        let user = userId ? await User.findById(userId).lean() : null;
        // Nota: passengerData não inclui email, mas podemos buscar por outros campos se necessário

        // Normalizar CPF
        const normalizedCPF = normalizeCPF(passengerData.cpf);
        if (!normalizedCPF) {
            return res.status(400).json({
                success: false,
                message: 'CPF inválido',
            });
        }

        // Buscar ou criar pedido
        let order: any = null;
        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId).lean();
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Pedido não encontrado',
                });
            }
        } else {
            // Criar novo pedido para o pacote de transporte
            // Gerar número único do pedido
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let orderNumber = '';
            for (let i = 0; i < 10; i++) {
                orderNumber += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            // Verificar unicidade
            let exists = await Order.findOne({ orderNumber }).select('_id').lean();
            let attempts = 0;
            while (exists && attempts < 5) {
                orderNumber = '';
                for (let i = 0; i < 10; i++) {
                    orderNumber += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                exists = await Order.findOne({ orderNumber }).select('_id').lean();
                attempts++;
            }

            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutos

            order = new Order({
                orderNumber,
                customer: user?._id || null,
                event: eventId,
                tickets: [], // Pacotes de transporte não são tickets
                subtotal: price,
                discountAmount: 0,
                platformFee: 0, // Por enquanto, sem taxa para transporte
                totalAmount: price,
                totalTickets: 0, // Não é ingresso
                status: 'pending',
                expiresAt,
                customerData: {
                    name: passengerData.name,
                    email: user?.email || '',
                    phone: passengerData.phone,
                    cpf: normalizedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
                    rg: passengerData.rg,
                },
                ipAddress:
                    req.ip ||
                    req.socket?.remoteAddress ||
                    (req.headers['x-forwarded-for'] as string) ||
                    'unknown',
                cardAttempts: 0,
                isActive: true,
            });

            await order.save();
        }

        // Criar pacote de transporte
        const transportPackage = new TransportPackage({
            event: eventId,
            order: order._id,
            holder: user?._id || null,
            eventDate: new Date(eventDate),
            departureLocation: {
                name: departureLocation.name,
                address: departureLocation.address,
                meetingTime: departureLocation.meetingTime,
                departureTime: departureLocation.departureTime,
            },
            packageType,
            price,
            passengerData: {
                name: passengerData.name,
                phone: passengerData.phone,
                rg: passengerData.rg,
                cpf: normalizedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
            },
            status: 'pending',
            isActive: true,
        });

        await transportPackage.save();

        // Gerar QR Code
        const qrCode = await generateQRCode(transportPackage.code);
        transportPackage.qrCode = qrCode;
        await transportPackage.save();

        return res.status(201).json({
            success: true,
            data: {
                transportPackage: {
                    id: transportPackage._id,
                    code: transportPackage.code,
                    qrCode: transportPackage.qrCode,
                    eventDate: transportPackage.eventDate,
                    departureLocation: transportPackage.departureLocation,
                    packageType: transportPackage.packageType,
                    price: transportPackage.price,
                    status: transportPackage.status,
                },
                order: {
                    id: order._id,
                    orderNumber: order.orderNumber,
                    totalAmount: order.totalAmount,
                    status: order.status,
                },
            },
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'transportPackagesController',
            action: 'createTransportPackage',
        });
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar pacote de transporte',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Lista pacotes de transporte de um pedido
 */
export const getPackagesByOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;

        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do pedido inválido',
            });
        }

        const packages = await TransportPackage.find({
            order: orderId,
            isActive: true,
            deletedAt: null,
        })
            .populate('event', 'name date')
            .lean();

        return res.status(200).json({
            success: true,
            data: packages,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'transportPackagesController',
            action: 'getPackagesByOrder',
        });
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar pacotes',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Busca pacote por código
 */
export const getPackageByCode = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Código do pacote é obrigatório',
            });
        }

        const transportPackage = await TransportPackage.findOne({
            code: code.toUpperCase(),
            isActive: true,
            deletedAt: null,
        })
            .populate('event', 'name date location')
            .populate('order', 'orderNumber status')
            .lean();

        if (!transportPackage) {
            return res.status(404).json({
                success: false,
                message: 'Pacote não encontrado',
            });
        }

        return res.status(200).json({
            success: true,
            data: transportPackage,
        });
    } catch (error: any) {
        captureControllerError(error, req, {
            controller: 'transportPackagesController',
            action: 'getPackageByCode',
        });
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar pacote',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

