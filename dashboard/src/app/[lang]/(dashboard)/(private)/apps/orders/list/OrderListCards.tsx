'use client'

import React, { useMemo } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import { useTheme } from '@mui/material/styles'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import { useOrders } from '@/hooks/useOrders'
import CustomAvatar from '@core/components/mui/Avatar'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

// Função para formatar moeda brasileira
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

// Função para calcular porcentagem de mudança
const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
}

const OrderListCards = () => {
    // Buscar TODOS os pedidos para calcular estatísticas (sem paginação)
    // Usar um limite muito alto para garantir que todos os pedidos sejam buscados
    const { orders, loading } = useOrders({
        page: 1,
        limit: 99999, // Limite muito alto para buscar todos os pedidos
        search: undefined
    })
    const theme = useTheme()

    // Calcular estatísticas da última semana
    const stats = useMemo(() => {
        if (!orders || orders.length === 0) {
            return {
                totalOrders: 0,
                totalOrdersLastWeek: 0,
                paidOrders: 0,
                paidOrdersLastWeek: 0,
                totalRevenue: 0,
                totalRevenueLastWeek: 0,
                totalTickets: 0,
                pendingOrders: 0,
                pendingOrdersLastWeek: 0,
                cancelledOrders: 0,
                cancelledOrdersLastWeek: 0,
                ordersByDay: Array(7).fill(0),
                revenueByDay: Array(7).fill(0),
                pendingByDay: Array(7).fill(0),
                cancelledByDay: Array(7).fill(0),
            }
        }

        const now = new Date()
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        // Pedidos da última semana (últimos 7 dias)
        const ordersLastWeek = orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= lastWeek && orderDate <= now
        })

        // Pedidos da semana anterior (8-14 dias atrás)
        const ordersPreviousWeek = orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= twoWeeksAgo && orderDate < lastWeek
        })

            // Calcular pedidos por dia da semana (últimos 7 dias)
        // Criar array com os últimos 7 dias
        const ordersByDay = Array(7).fill(0)
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(lastWeek)
            targetDate.setDate(targetDate.getDate() + i)
            const dayStart = new Date(targetDate)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(targetDate)
            dayEnd.setHours(23, 59, 59, 999)
            
            ordersByDay[i] = ordersLastWeek.filter(order => {
                const orderDate = new Date(order.createdAt)
                return orderDate >= dayStart && orderDate <= dayEnd
            }).length
        }

        // Calcular receita por dia
        const revenueByDay = Array(7).fill(0)
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(lastWeek)
            targetDate.setDate(targetDate.getDate() + i)
            const dayStart = new Date(targetDate)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(targetDate)
            dayEnd.setHours(23, 59, 59, 999)
            
            revenueByDay[i] = ordersLastWeek
                .filter(order => {
                    const orderDate = new Date(order.createdAt)
                    return orderDate >= dayStart && orderDate <= dayEnd && order.status === 'paid'
                })
                .reduce((sum, o) => sum + o.totalAmount, 0)
        }

        // Total de pedidos
        const totalOrders = ordersLastWeek.length
        const totalOrdersLastWeek = ordersPreviousWeek.length

        // Pedidos pagos
        const paidOrders = ordersLastWeek.filter(o => o.status === 'paid').length
        const paidOrdersLastWeek = ordersPreviousWeek.filter(o => o.status === 'paid').length

        // Receita total
        const totalRevenue = ordersLastWeek
            .filter(o => o.status === 'paid')
            .reduce((sum, o) => sum + o.totalAmount, 0)
        
        const totalRevenueLastWeek = ordersPreviousWeek
            .filter(o => o.status === 'paid')
            .reduce((sum, o) => sum + o.totalAmount, 0)

        // Total de ingressos vendidos (APENAS CONFIRMADOS - de pedidos pagos)
        const totalTickets = ordersLastWeek
            .filter(o => o.status === 'paid')
            .reduce((sum, o) => sum + (o.totalTickets || 0), 0)

        // Pedidos pendentes
        const pendingOrders = ordersLastWeek.filter(o => o.status === 'pending').length
        const pendingOrdersLastWeek = ordersPreviousWeek.filter(o => o.status === 'pending').length

        // Pedidos cancelados
        const cancelledOrders = ordersLastWeek.filter(o => o.status === 'cancelled').length
        const cancelledOrdersLastWeek = ordersPreviousWeek.filter(o => o.status === 'cancelled').length

        // Calcular pedidos pendentes por dia
        const pendingByDay = Array(7).fill(0)
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(lastWeek)
            targetDate.setDate(targetDate.getDate() + i)
            const dayStart = new Date(targetDate)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(targetDate)
            dayEnd.setHours(23, 59, 59, 999)
            
            pendingByDay[i] = ordersLastWeek.filter(order => {
                const orderDate = new Date(order.createdAt)
                return orderDate >= dayStart && orderDate <= dayEnd && order.status === 'pending'
            }).length
        }

        // Calcular pedidos cancelados por dia
        const cancelledByDay = Array(7).fill(0)
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(lastWeek)
            targetDate.setDate(targetDate.getDate() + i)
            const dayStart = new Date(targetDate)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(targetDate)
            dayEnd.setHours(23, 59, 59, 999)
            
            cancelledByDay[i] = ordersLastWeek.filter(order => {
                const orderDate = new Date(order.createdAt)
                return orderDate >= dayStart && orderDate <= dayEnd && order.status === 'cancelled'
            }).length
        }

        return {
            totalOrders,
            totalOrdersLastWeek,
            paidOrders,
            paidOrdersLastWeek,
            totalRevenue,
            totalRevenueLastWeek,
            totalTickets,
            pendingOrders,
            pendingOrdersLastWeek,
            cancelledOrders,
            cancelledOrdersLastWeek,
            ordersByDay,
            revenueByDay,
            pendingByDay,
            cancelledByDay,
        }
    }, [orders])

    // Configurações do gráfico de barras (Order)
    const orderChartOptions: ApexOptions = {
        chart: {
            type: 'bar',
            stacked: false,
            parentHeightOffset: 0,
            toolbar: { show: false },
            sparkline: { enabled: true }
        },
        tooltip: { enabled: false },
        legend: { show: false },
        dataLabels: { enabled: false },
        colors: ['var(--mui-palette-primary-main)'],
        states: {
            hover: { filter: { type: 'none' } },
            active: { filter: { type: 'none' } }
        },
        plotOptions: {
            bar: {
                borderRadius: 3,
                horizontal: false,
                columnWidth: '32%',
                colors: {
                    backgroundBarRadius: 5,
                    backgroundBarColors: Array(7).fill('var(--mui-palette-action-selected)')
                }
            }
        },
        grid: {
            show: false,
            padding: { left: -3, right: 5, top: 15, bottom: 18 }
        },
        xaxis: {
            labels: { show: false },
            axisTicks: { show: false },
            axisBorder: { show: false }
        },
        yaxis: { show: false },
    }

    const orderChartSeries = [{ data: stats.ordersByDay }]
    const salesChartSeries = [{ data: stats.revenueByDay }]
    const pendingChartSeries = [{ data: stats.pendingByDay }]
    const cancelledChartSeries = [{ data: stats.cancelledByDay }]

    // Configurações do gráfico de barras (Pendentes) - laranja/amarelo
    const pendingChartOptions: ApexOptions = {
        ...orderChartOptions,
        colors: ['var(--mui-palette-warning-main)'],
    }

    // Configurações do gráfico de barras (Cancelados) - vermelho
    const cancelledChartOptions: ApexOptions = {
        ...orderChartOptions,
        colors: ['var(--mui-palette-error-main)'],
    }

    // Configurações do gráfico de área (Sales)
    const salesChartOptions: ApexOptions = {
        chart: {
            parentHeightOffset: 0,
            toolbar: { show: false },
            sparkline: { enabled: true }
        },
        tooltip: { enabled: false },
        dataLabels: { enabled: false },
        stroke: {
            width: 2,
            curve: 'smooth'
        },
        grid: {
            show: false,
            padding: { top: 10, bottom: 15 }
        },
        fill: {
            type: 'gradient',
            gradient: {
                opacityTo: 0,
                opacityFrom: 1,
                shadeIntensity: 1,
                stops: [0, 100],
                colorStops: [
                    [
                        {
                            offset: 0,
                            opacity: 0.4,
                            color: theme.palette.success.main
                        },
                        {
                            opacity: 0,
                            offset: 100,
                            color: 'var(--mui-palette-background-paper)'
                        }
                    ]
                ]
            }
        },
        theme: {
            monochrome: {
                enabled: true,
                shadeTo: 'light',
                shadeIntensity: 1,
                color: theme.palette.success.main
            }
        },
        xaxis: {
            labels: { show: false },
            axisTicks: { show: false },
            axisBorder: { show: false }
        },
        yaxis: { show: false }
    }

    // Calcular porcentagens
    const ordersPercentage = calculatePercentageChange(stats.totalOrders, stats.totalOrdersLastWeek)
    const revenuePercentage = calculatePercentageChange(stats.totalRevenue, stats.totalRevenueLastWeek)
    const pendingPercentage = calculatePercentageChange(stats.pendingOrders, stats.pendingOrdersLastWeek)
    const cancelledPercentage = calculatePercentageChange(stats.cancelledOrders, stats.cancelledOrdersLastWeek)

    if (loading) {
        return (
            <Grid container spacing={4}>
                {[1, 2, 3, 4, 5].map((item) => (
                    <Grid key={item} size={{ xs: 12, sm: 6, lg: 2 }}>
                        <Card>
                            <CardContent>
                                <div className='flex items-center gap-4'>
                                    <div className='w-12 h-12 bg-gray-200 rounded-lg animate-pulse' />
                                    <div>
                                        <Typography variant='h6' className='animate-pulse'>Carregando...</Typography>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        )
    }

    return (
        <Grid container spacing={4}>
            {/* Card 1: Order - Quantidade de Pedidos Realizados */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader title='Pedidos' subheader='Última Semana' className='pbe-0' />
                    <CardContent className='flex flex-col flex-1'>
                        <AppReactApexCharts 
                            type='bar' 
                            height={84} 
                            width='100%' 
                            options={orderChartOptions} 
                            series={orderChartSeries} 
                        />
                        <div className='flex items-center justify-between flex-wrap gap-x-4 gap-y-0.5 mt-2'>
                            <Typography variant='h4' color='text.primary'>
                                {stats.totalOrders}
                            </Typography>
                            <Typography 
                                variant='body2' 
                                color={ordersPercentage >= 0 ? 'success.main' : 'error.main'}
                            >
                                {ordersPercentage >= 0 ? '+' : ''}{ordersPercentage.toFixed(1)}%
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card 2: Total Sales - Pedidos Confirmados e Total em Reais */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader title='Vendas Totais' subheader='Última Semana' className='pbe-0' />
                    <AppReactApexCharts 
                        type='area' 
                        height={84} 
                        width='100%' 
                        options={salesChartOptions} 
                        series={salesChartSeries} 
                    />
                    <CardContent className='flex flex-col pbs-0 flex-1'>
                        <div className='flex items-center justify-between flex-wrap gap-x-4 gap-y-0.5'>
                            <Typography variant='h4' color='text.primary'>
                                {formatCurrency(stats.totalRevenue)}
                            </Typography>
                            <Typography 
                                variant='body2' 
                                color={revenuePercentage >= 0 ? 'success.main' : 'error.main'}
                            >
                                {revenuePercentage >= 0 ? '+' : ''}{revenuePercentage.toFixed(1)}%
                            </Typography>
                        </div>
                        <Typography variant='caption' color='text.secondary' className='mt-1'>
                            {stats.paidOrders} pedido(s) confirmado(s)
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card 4: Pedidos Pendentes */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader title='Pedidos Pendentes' subheader='Última Semana' className='pbe-0' />
                    <CardContent className='flex flex-col flex-1'>
                        <AppReactApexCharts 
                            type='bar' 
                            height={84} 
                            width='100%' 
                            options={pendingChartOptions} 
                            series={pendingChartSeries} 
                        />
                        <div className='flex items-center justify-between flex-wrap gap-x-4 gap-y-0.5 mt-2'>
                            <Typography variant='h4' color='text.primary'>
                                {stats.pendingOrders}
                            </Typography>
                            <Typography 
                                variant='body2' 
                                color={pendingPercentage >= 0 ? 'warning.main' : 'success.main'}
                            >
                                {pendingPercentage >= 0 ? '+' : ''}{pendingPercentage.toFixed(1)}%
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card 5: Pedidos Cancelados */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader title='Pedidos Cancelados' subheader='Última Semana' className='pbe-0' />
                    <CardContent className='flex flex-col flex-1'>
                        <AppReactApexCharts 
                            type='bar' 
                            height={84} 
                            width='100%' 
                            options={cancelledChartOptions} 
                            series={cancelledChartSeries} 
                        />
                        <div className='flex items-center justify-between flex-wrap gap-x-4 gap-y-0.5 mt-2'>
                            <Typography variant='h4' color='text.primary'>
                                {stats.cancelledOrders}
                            </Typography>
                            <Typography 
                                variant='body2' 
                                color={cancelledPercentage >= 0 ? 'error.main' : 'success.main'}
                            >
                                {cancelledPercentage >= 0 ? '+' : ''}{cancelledPercentage.toFixed(1)}%
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            {/* Card 3: Ingressos Vendidos - Com ícone */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent className='flex flex-col gap-y-3 items-start flex-1'>
                        <CustomAvatar variant='rounded' skin='light' size={44} color='info'>
                            <i className='tabler-ticket text-[28px]' />
                        </CustomAvatar>
                        <div className='flex flex-col gap-y-1'>
                            <Typography variant='h5'>Ingressos Vendidos</Typography>
                            <Typography color='text.disabled'>Última Semana</Typography>
                            <Typography color='text.primary' variant='h4'>{stats.totalTickets}</Typography>
                        </div>
                        <Chip 
                            label={`${stats.paidOrders} confirmados`} 
                            color='success' 
                            variant='tonal' 
                            size='small' 
                        />
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default OrderListCards
