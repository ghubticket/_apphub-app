'use client'

import { useMemo } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import CustomAvatar from '@core/components/mui/Avatar'
import { promoterCodeService, type PromoterCodeItem } from '@/services/promoterCodeService'
import { usePromoterCodes } from '@/hooks/usePromoterCodes'

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

const PromoterCodeListCards = () => {
    // Buscar TODOS os códigos para calcular estatísticas
    const { codes, loading } = usePromoterCodes({
        page: 1,
        limit: 99999,
    })

    const stats = useMemo(() => {
        if (!codes || codes.length === 0) {
            return {
                totalCodes: 0,
                activeCodes: 0,
                inactiveCodes: 0,
                totalOrders: 0,
                totalSales: 0,
                totalDiscount: 0,
                totalCommission: 0,
            }
        }

        const activeCodes = codes.filter(c => c.isActive).length
        const inactiveCodes = codes.filter(c => !c.isActive).length

        // Buscar pedidos pagos com códigos (será feito via API depois)
        // Por enquanto, usar currentUses como aproximação
        const totalOrders = codes.reduce((sum, c) => sum + (c.currentUses || 0), 0)

        return {
            totalCodes: codes.length,
            activeCodes,
            inactiveCodes,
            totalOrders,
            totalSales: 0, // Será calculado via API
            totalDiscount: 0, // Será calculado via API
            totalCommission: 0, // Será calculado via API
        }
    }, [codes])

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Carregando estatísticas...</Typography>
                </CardContent>
            </Card>
        )
    }

    return (
        <Grid container spacing={6}>
            {/* Card: Total de Códigos */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                    <CardHeader title='Total de Códigos' subheader='Cadastrados' className='pbe-0' />
                    <CardContent className='pt-5'>
                        <div className='flex items-center gap-3'>
                            <CustomAvatar variant='rounded' skin='light' size={56} color='primary'>
                                <i className='tabler-ticket text-[32px]' />
                            </CustomAvatar>
                            <div>
                                <Typography variant='h4' color='text.primary'>
                                    {stats.totalCodes}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' className='mt-1'>
                                    {stats.activeCodes} ativos, {stats.inactiveCodes} inativos
                                </Typography>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card: Total de Vendas */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                    <CardHeader title='Total de Vendas' subheader='Pedidos com código' className='pbe-0' />
                    <CardContent className='pt-5'>
                        <div className='flex items-center gap-3'>
                            <CustomAvatar variant='rounded' skin='light' size={56} color='success'>
                                <i className='tabler-shopping-cart text-[32px]' />
                            </CustomAvatar>
                            <div>
                                <Typography variant='h4' color='text.primary'>
                                    {stats.totalOrders}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' className='mt-1'>
                                    Pedidos realizados
                                </Typography>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card: Valor Total Vendido */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                    <CardHeader title='Valor Total Vendido' subheader='Vendas brutas' className='pbe-0' />
                    <CardContent className='pt-5'>
                        <div className='flex items-center gap-3'>
                            <CustomAvatar variant='rounded' skin='light' size={56} color='info'>
                                <i className='tabler-currency-dollar text-[32px]' />
                            </CustomAvatar>
                            <div>
                                <Typography variant='h4' color='text.primary'>
                                    {formatCurrency(stats.totalSales)}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' className='mt-1'>
                                    Antes de descontos
                                </Typography>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card: Desconto Total */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                    <CardHeader title='Desconto Total' subheader='Aplicado' className='pbe-0' />
                    <CardContent className='pt-5'>
                        <div className='flex items-center gap-3'>
                            <CustomAvatar variant='rounded' skin='light' size={56} color='warning'>
                                <i className='tabler-discount text-[32px]' />
                            </CustomAvatar>
                            <div>
                                <Typography variant='h4' color='text.primary'>
                                    {formatCurrency(stats.totalDiscount)}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' className='mt-1'>
                                    Total de descontos
                                </Typography>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default PromoterCodeListCards

