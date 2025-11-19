'use client'

import { useEffect, useState } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import CustomAvatar from '@core/components/mui/Avatar'
import { financialService, type FinancialStats } from '@/services/financialService'

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

const FinancialPage = () => {
    const [stats, setStats] = useState<FinancialStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await financialService.getStats()

                setStats(response.data)
            } catch (e: any) {
                console.error('Erro ao buscar estatísticas financeiras:', e)
                setError(e.message || 'Erro ao carregar dados financeiros')
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    if (loading) {
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Box p={4}>
                <Typography color='error' variant='h6'>
                    Erro: {error}
                </Typography>
            </Box>
        )
    }

    return (
        <div>
            <Typography variant='h4' className='mb-6'>
                Financeiro
            </Typography>

            <Grid container spacing={6}>
                {/* Card: Total de Vendas (sem taxa) */}
                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardHeader title='Total de Vendas' subheader='Valor sem taxa da plataforma' className='pbe-0' />
                        <CardContent className='pt-5'>
                            <Box display='flex' alignItems='center' gap={3}>
                                <CustomAvatar variant='rounded' skin='light' size={56} color='primary'>
                                    <i className='tabler-currency-dollar text-[32px]' />
                                </CustomAvatar>
                                <Box>
                                    <Typography variant='h4' color='text.primary'>
                                        {stats ? formatCurrency(stats.totalSales) : 'R$ 0,00'}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='mt-0 pt-0'>
                                        Valor total das vendas de ingressos
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Card: Total de Taxas (recebível da plataforma) */}
                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardHeader title='Total de Taxas' subheader='Recebível da plataforma' className='pbe-0' />
                        <CardContent className='pt-5'>
                            <Box display='flex' alignItems='center' gap={3}>
                                <CustomAvatar variant='rounded' skin='light' size={56} color='success'>
                                    <i className='tabler-wallet text-[32px]' />
                                </CustomAvatar>
                                <Box>
                                    <Typography variant='h4' color='text.primary'>
                                        {stats ? formatCurrency(stats.totalFees) : 'R$ 0,00'}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='mt-0 pt-0'>
                                        Taxas acumuladas sobre vendas
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </div>
    )
}

export default FinancialPage

