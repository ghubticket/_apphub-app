import { Request, Response } from 'express'
import Event from '../models/Event'

// Helpers to build public URL for uploaded files
function fileUrl(req: Request, filename?: string | null) {
    if (!filename) return undefined
    const base = `${req.protocol}://${req.get('host')}`
    return `${base}/uploads/events/${filename}`
}

type UploadedFileLite = { filename: string }
type FilesMap = { [field: string]: UploadedFileLite[] } | undefined

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { name, description, date, time, location, address, city, state, price, capacity, ticketFee } = req.body

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
            address,
            city,
            state,
            price: price ? Number(price) : 0,
            capacity: capacity ? Number(capacity) : 100,
            ticketFee: ticketFee !== undefined ? Number(ticketFee) : 0,
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


