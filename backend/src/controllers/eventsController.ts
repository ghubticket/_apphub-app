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
        const { name, description, date, time, location, address, city, state, price, capacity } = req.body

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
        const filters: any = {}
        if (search) {
            filters.$text = { $search: String(search) }
        }

        const skip = (Number(page) - 1) * Number(limit)
        const [events, total] = await Promise.all([
            Event.find(filters).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Event.countDocuments(filters)
        ])

        res.json({ success: true, data: { events, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } })
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erro ao listar eventos', errors: [error.message] })
    }
}

export const getEvent = async (req: Request, res: Response) => {
    try {
        const event = await Event.findById(req.params.id)
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

        const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true })
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado' })
        res.json({ success: true, message: 'Evento atualizado com sucesso', data: event })
    } catch (error: any) {
        res.status(400).json({ success: false, message: 'Erro ao atualizar evento', errors: [error.message] })
    }
}

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id)
        if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado' })
        res.json({ success: true, message: 'Evento removido com sucesso' })
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erro ao remover evento', errors: [error.message] })
    }
}


