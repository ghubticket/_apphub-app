import express from 'express'
import { authenticate } from '../middleware/auth'
import { isAdmin } from '../middleware/auth'

const router = express.Router()

// Dados mockados de exceções de entrega (baseados na versão paga)
const getDeliveryExceptionsData = () => {
    return {
        success: true,
        data: {
            totalExceptions: 100,
            averageExceptions: 30,
            categories: [
                {
                    name: 'Incorrect address',
                    value: 13,
                    percentage: 13,
                    color: '#28a745'
                },
                {
                    name: 'Weather conditions',
                    value: 25,
                    percentage: 25,
                    color: 'color-mix(in sRGB, #28a745 80%, #fff)'
                },
                {
                    name: 'Federal Holidays',
                    value: 22,
                    percentage: 22,
                    color: 'color-mix(in sRGB, #28a745 60%, #fff)'
                },
                {
                    name: 'Damage during transit',
                    value: 40,
                    percentage: 40,
                    color: 'color-mix(in sRGB, #28a745 40%, #fff)'
                }
            ]
        }
    }
}

// Rota para obter dados de exceções de entrega
router.get('/exceptions', authenticate, isAdmin, (req, res) => {
    try {
        const data = getDeliveryExceptionsData()
        res.json(data)
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter dados de exceções de entrega',
            error: (error as Error).message
        })
    }
})

export default router
