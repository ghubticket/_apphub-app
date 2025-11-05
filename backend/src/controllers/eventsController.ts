import { Request, Response } from 'express'
import Event from '../models/Event'
import TicketType from '../models/TicketType'
import Ticket from '../models/Ticket'
import { Order } from '../models'
import { generateQRCode } from '../services/qrCodeService'
import User from '../models/User'

// Helpers to build public URL for uploaded files
function fileUrl(req: Request, filename?: string | null) {
    if (!filename) return undefined
    const base = `${req.protocol}://${req.get('host')}`
    return `${base}/uploads/events/${filename}`
}

// Sanitizar endereço: remover caracteres perigosos e limitar tamanho
function sanitizeAddress(address: string): string {
    if (!address) return ''
    // Remover caracteres de controle e caracteres perigosos
    let sanitized = address
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
        .replace(/[<>]/g, '') // Remove < e > (prevenção XSS básica)
        .trim()

    // Remover múltiplos espaços
    sanitized = sanitized.replace(/\s+/g, ' ')

    // Limitar a 300 caracteres (já validado pelo schema, mas garantindo aqui também)
    if (sanitized.length > 300) {
        sanitized = sanitized.substring(0, 300).trim()
    }

    return sanitized
}

type UploadedFileLite = { filename: string }
type FilesMap = { [field: string]: UploadedFileLite[] } | undefined

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { name, description, date, time, location, address, city, state, price, capacity, ticketFee, platformFeePercentage } = req.body

        const filesMap = req.files as FilesMap
        const cover = filesMap?.cover?.[0]?.filename || null
        const square = filesMap?.square?.[0]?.filename || null

        // Converter date string (YYYY-MM-DD) para Date
        // Criar data no início do dia local para evitar problemas de timezone na validação
        let eventDate: Date | null = null
        if (date) {
            if (typeof date === 'string') {
                // Se for string YYYY-MM-DD, criar data no início do dia local
                const [year, month, day] = date.split('-').map(Number)
                eventDate = new Date(year, month - 1, day, 0, 0, 0, 0)
            } else {
                eventDate = new Date(date)
            }
        }

        const event = await Event.create({
            name,
            description,
            date: eventDate,
            time,
            location,
            address: sanitizeAddress(address),
            city,
            state,
            price: price ? Number(price) : 0,
            capacity: capacity ? Number(capacity) : 100,
            ticketFee: ticketFee !== undefined ? Number(ticketFee) : 0, // DEPRECATED: manter por compatibilidade
            platformFeePercentage: (() => {
                if (platformFeePercentage === undefined || platformFeePercentage === null || platformFeePercentage === '') return 0
                const num = Number(platformFeePercentage)
                if (isNaN(num)) throw new Error('Taxa percentual deve ser um número válido')
                if (num < 0) throw new Error('Taxa percentual não pode ser negativa')
                if (num > 100) throw new Error('Taxa percentual não pode ser maior que 100%')
                return num
            })(),
            organizer: req.user?._id,
            coverImage: fileUrl(req, cover),
            squareImage: fileUrl(req, square)
        })

        res.status(201).json({ success: true, message: 'Evento criado com sucesso', data: event })
    } catch (error: any) {
        console.error('Erro ao criar evento:', error)
        const errorMessage = error.errors ? Object.values(error.errors).map((e: any) => e.message).join(', ') : error.message
        res.status(400).json({ success: false, message: 'Erro ao criar evento', errors: [errorMessage] })
    }
}

export const listEvents = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query
        const filters: any = { deletedAt: null } // Filtrar apenas eventos não deletados

        if (search) {
            filters.$or = [
                { name: { $regex: String(search), $options: 'i' } },
                { location: { $regex: String(search), $options: 'i' } },
                { city: { $regex: String(search), $options: 'i' } }
            ]
        }

        const skip = (Number(page) - 1) * Number(limit)

        const [events, total] = await Promise.all([
            Event.find(filters).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Event.countDocuments(filters)
        ])

        res.json({
            success: true,
            data: {
                events,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            }
        })
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erro ao listar eventos', errors: [error.message] })
    }
}

export const getEvent = async (req: Request, res: Response) => {
    try {
        const event = await Event.findOne({
            _id: req.params.id,
            deletedAt: null, // Não mostrar eventos deletados
        })
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado' })
        res.json({ success: true, data: event })
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erro ao obter evento', errors: [error.message] })
    }
}

export const updateEvent = async (req: Request, res: Response) => {
    try {
        const updates: any = { ...req.body }
        const filesMap = req.files as FilesMap
        const cover = filesMap?.cover?.[0]?.filename || null
        const square = filesMap?.square?.[0]?.filename || null
        if (cover) updates.coverImage = fileUrl(req, cover)
        if (square) updates.squareImage = fileUrl(req, square)
        // Sanitizar endereço se estiver sendo atualizado
        if (updates.address) {
            updates.address = sanitizeAddress(updates.address)
        }
        // Converter e validar platformFeePercentage se fornecido
        if (updates.platformFeePercentage !== undefined && updates.platformFeePercentage !== null && updates.platformFeePercentage !== '') {
            const num = Number(updates.platformFeePercentage)
            if (isNaN(num)) {
                return res.status(400).json({
                    success: false,
                    message: 'Taxa percentual deve ser um número válido',
                    errors: ['Taxa percentual inválida']
                })
            }
            if (num < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Taxa percentual não pode ser negativa',
                    errors: ['Taxa percentual inválida']
                })
            }
            if (num > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Taxa percentual não pode ser maior que 100%',
                    errors: ['Taxa percentual inválida']
                })
            }
            updates.platformFeePercentage = num
        }

        const event = await Event.findOneAndUpdate(
            {
                _id: req.params.id,
                deletedAt: null, // Não atualizar eventos deletados
            },
            updates,
            { new: true }
        )
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado' })
        res.json({ success: true, message: 'Evento atualizado com sucesso', data: event })
    } catch (error: any) {
        res.status(400).json({ success: false, message: 'Erro ao atualizar evento', errors: [error.message] })
    }
}

export const updateEventStatus = async (req: Request, res: Response) => {
    try {
        const { isActive } = req.body
        const event = await Event.findOneAndUpdate(
            {
                _id: req.params.id,
                deletedAt: null, // Não atualizar eventos deletados
            },
            { isActive },
            { new: true }
        )
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado' })
        res.json({ success: true, message: 'Status do evento atualizado com sucesso', data: event })
    } catch (error: any) {
        res.status(400).json({ success: false, message: 'Erro ao atualizar status do evento', errors: [error.message] })
    }
}

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const event = await Event.findOne({
            _id: req.params.id,
            deletedAt: null, // Não deletar eventos já deletados
        })
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Evento não encontrado'
            })
        }

        // Verificar se há ingressos vendidos
        // TODO: Implementar verificação quando o modelo Ticket estiver completo
        // const soldTickets = await Ticket.countDocuments({ event: req.params.id, status: { $ne: 'cancelled' } });
        // if (soldTickets > 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Não é possível deletar evento com ingressos vendidos',
        //     });
        // }

        // Soft delete: desativar e marcar data de exclusão
        event.isActive = false;
        event.deletedAt = new Date();
        await event.save();

        res.json({
            success: true,
            message: 'Evento removido com sucesso (soft delete)'
        })
    } catch (error: any) {
        console.error('Erro ao deletar evento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao remover evento',
            errors: [error.message]
        })
    }
}

// Estatísticas de ingressos por evento (capacidade, vendidos, disponíveis, pendentes, cancelados, VIPs)
export const getEventTicketStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const event = await Event.findOne({ _id: id, deletedAt: null })
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado' })

        const ticketTypes = await TicketType.find({ event: id, deletedAt: null, isActive: true })
        const capacityTotal = ticketTypes.reduce((sum, tt) => sum + (tt.maxQuantity || 0), 0)

        // Separar tipos VIP e não-VIP
        const vipTypeIds = ticketTypes.filter(tt => tt.isVIP).map(tt => tt._id)
        const normalTypeIds = ticketTypes.filter(tt => !tt.isVIP).map(tt => tt._id)

        // Ingressos Vendidos: apenas CONFIRMADOS/USED de tipos NÃO-VIP
        const soldTotal = normalTypeIds.length
            ? await Ticket.countDocuments({
                event: id,
                ticketType: { $in: normalTypeIds },
                status: { $in: ['confirmed', 'used'] },
                deletedAt: null
            })
            : 0

        // VIPs distribuídos: tickets CONFIRMADOS/USED dos tipos VIP
        const vipsDistributed = vipTypeIds.length
            ? await Ticket.countDocuments({
                event: id,
                ticketType: { $in: vipTypeIds },
                status: { $in: ['confirmed', 'used'] },
                deletedAt: null
            })
            : 0

        // Contar tickets por status diretamente
        const [pendingCount, cancelledCount] = await Promise.all([
            Ticket.countDocuments({ event: id, status: 'pending', deletedAt: null }),
            Ticket.countDocuments({ event: id, status: 'cancelled', deletedAt: null }),
        ])

        // Disponíveis = capacidade - (confirmados não-VIP + VIPs distribuídos)
        const confirmedAll = soldTotal + vipsDistributed
        const availableTotal = Math.max(0, capacityTotal - confirmedAll)

        // Receita total e por dia (últimos 7 dias), excluindo VIP (vip_free)
        const now = new Date()
        const start7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
        start7.setHours(0, 0, 0, 0)

        const paidOrders = await Order.find({
            event: id,
            status: 'paid',
            paymentMethod: { $ne: 'vip_free' },
            deletedAt: null,
            createdAt: { $gte: start7 }
        }).select('subtotal platformFee totalAmount createdAt').lean()

        let totalRevenue = 0
        const revenueByDay = Array(7).fill(0)
        for (const o of paidOrders) {
            // Usar subtotal (sem taxa) para receita do evento
            const subtotal = Number(o.subtotal || 0)
            totalRevenue += subtotal
            const d = new Date(o.createdAt as any)
            d.setHours(0, 0, 0, 0)
            const diffDays = Math.round((d.getTime() - start7.getTime()) / (24 * 60 * 60 * 1000))
            if (diffDays >= 0 && diffDays < 7) {
                revenueByDay[diffDays] += subtotal
            }
        }

        return res.json({
            success: true,
            data: {
                capacityTotal,
                soldTotal,
                availableTotal,
                pendingCount,
                cancelledCount,
                vipsDistributed,
                totalRevenue,
                revenueByDay,
            }
        })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas', errors: [error.message] })
    }
}

/**
 * Distribuir VIP (cortesia) para um usuário já cadastrado
 * Regras:
 * - Apenas ADMIN
 * - Evento deve possuir um TicketType VIP ativo
 * - Quantidade distribuída não pode exceder o disponível (maxQuantity - soldQuantity)
 * - Usuário deve existir e estar ativo
 */
export const distributeVip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { email, quantity = 1, ticketTypeId } = req.body as { email?: string; quantity?: number; ticketTypeId?: string }

        if (!email) return res.status(400).json({ success: false, message: 'E-mail é obrigatório' })
        const qty = Math.max(1, Number(quantity) || 1)

        const event = await Event.findOne({ _id: id, deletedAt: null, isActive: true })
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado ou inativo' })

        let ticketType = await TicketType.findOne({ event: id, isVIP: true, isActive: true, deletedAt: null, ...(ticketTypeId ? { _id: ticketTypeId } : {}) })
        if (!ticketType) return res.status(400).json({ success: false, message: 'Evento não possui ingresso VIP ativo' })

        const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i'), deletedAt: null, isActive: true })
        if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado ou inativo' })

        const remaining = (ticketType.maxQuantity || 0) - (ticketType.soldQuantity || 0)
        if (remaining < qty) {
            return res.status(400).json({ success: false, message: `Quantidade indisponível. Restam ${remaining} VIP(s)` })
        }

        // Verificar se o usuário já tem um pedido para este evento
        let order = await Order.findOne({
            customer: user._id,
            event: event._id,
            deletedAt: null,
            status: { $in: ['pending', 'paid'] } // Apenas pedidos ativos
        })

        // Se não tiver pedido existente, criar um novo
        if (!order) {
            // Gerar orderNumber único antes de criar o pedido
            const generateOrderNumber = async (): Promise<string> => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                let orderNumber = ''
                let exists = true

                while (exists) {
                    orderNumber = ''
                    for (let i = 0; i < 10; i++) {
                        orderNumber += chars.charAt(Math.floor(Math.random() * chars.length))
                    }
                    const existing = await Order.findOne({ orderNumber, deletedAt: null })
                    exists = !!existing
                }

                return orderNumber
            }

            const orderNumber = await generateOrderNumber()
            order = new Order({
                orderNumber,
                customer: user._id,
                event: event._id,
                tickets: [],
                subtotal: 0, // VIP não tem valor
                platformFee: 0, // VIP não paga taxa
                totalAmount: 0,
                totalTickets: qty,
                status: 'paid',
                paymentMethod: 'vip_free',
                paidAt: new Date(),
                customerData: { name: user.name, email: user.email, phone: user.phone, cpf: user.cpf },
                isActive: true,
            })
            await order.save()
        } else {
            // Se já tem pedido, apenas adicionar os tickets VIP ao pedido existente
            // Sem alterar status ou método de pagamento do pedido original
            order.totalTickets = (order.totalTickets || 0) + qty
            await order.save()
        }

        const createdTickets: any[] = []
        for (let i = 0; i < qty; i++) {
            const ticket = new Ticket({
                event: event._id,
                ticketType: ticketType._id,
                order: order._id,
                holder: user._id,
                price: 0,
                status: 'confirmed',
                qrCode: '',
                isActive: true,
            })
            await ticket.save()
            const qr = await generateQRCode(ticket.code)
            ticket.qrCode = qr
            await ticket.save()
            createdTickets.push(ticket)
        }

        // Adicionar novos tickets ao pedido (se já existir, fazer push; se não, criar array)
        const existingTicketIds = order.tickets ? order.tickets.map((t: any) => t._id || t) : []
        const newTicketIds = createdTickets.map(t => t._id)
        order.tickets = [...existingTicketIds, ...newTicketIds]
        await order.save()

        ticketType.soldQuantity = (ticketType.soldQuantity || 0) + qty
        await ticketType.save()

        return res.status(201).json({
            success: true,
            message: 'VIP distribuído com sucesso',
            data: {
                orderId: order._id,
                tickets: createdTickets.map(t => ({ _id: t._id, code: t.code, qrCode: t.qrCode })),
                remaining: (ticketType.maxQuantity || 0) - (ticketType.soldQuantity || 0),
            }
        })
    } catch (error: any) {
        console.error('Erro ao distribuir VIP:', error)
        return res.status(500).json({ success: false, message: 'Erro ao distribuir VIP', errors: [error.message] })
    }
}


