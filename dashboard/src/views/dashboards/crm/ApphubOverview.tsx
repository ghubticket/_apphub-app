'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

// Component Imports
import CardStatVertical from '@/components/card-statistics/Vertical'
import DistributedBarChartOrder from '@views/dashboards/crm/DistributedBarChartOrder'
import LineAreaYearlySalesChart from '@views/dashboards/crm/LineAreaYearlySalesChart'
import BarChartRevenueGrowth from '@views/dashboards/crm/BarChartRevenueGrowth'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from 'next/link'

// Service Imports
import { financialService, type FinancialStats } from '@/services/financialService'
import { orderService } from '@/services/orderService'
import { userService } from '@/services/userService'
import { eventService } from '@/services/eventService'

type OverviewState = {
    financial: FinancialStats | null
    totalOrders: number
    totalPaidOrders: number
    totalUsers: number
    totalEvents: number
}

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
})

const ApphubOverview = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<OverviewState>({
        financial: null,
        totalOrders: 0,
        totalPaidOrders: 0,
        totalUsers: 0,
        totalEvents: 0
    })

    useEffect(() => {
        let cancelled = false

        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                const [financialRes, ordersAll, ordersPaid, usersStats, eventsRes] = await Promise.all([
                    financialService.getStats().catch(() => null),
                    orderService
                        .list({ page: 1, limit: 1 })
                        .catch(() => null),
                    orderService
                        .list({ page: 1, limit: 1, status: 'paid' })
                        .catch(() => null),
                    userService
                        .getStats()
                        .catch(() => null),
                    eventService
                        .list({ page: 1, limit: 1 })
                        .catch(() => null)
                ])

                if (cancelled) return

                const financial = financialRes?.data || null

                const totalOrders =
                    (Array.isArray(ordersAll?.data)
                        ? (ordersAll?.data as any[]).length
                        : (ordersAll?.data as any)?.pagination?.total) || 0

                const totalPaidOrders =
                    (Array.isArray(ordersPaid?.data)
                        ? (ordersPaid?.data as any[]).length
                        : (ordersPaid?.data as any)?.pagination?.total) || 0

                const totalUsers = usersStats?.data?.totalUsers || 0
                const totalEvents = eventsRes?.data?.pagination?.total ?? eventsRes?.data?.events?.length ?? 0

                setData({
                    financial,
                    totalOrders,
                    totalPaidOrders,
                    totalUsers,
                    totalEvents
                })
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.message || 'Erro ao carregar dados do dashboard')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            cancelled = true
        }
    }, [])

    const { financial, totalOrders, totalPaidOrders, totalUsers, totalEvents } = data

    return (
        <Grid container spacing={6}>
            {/* Cards de resumo principais */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 as any }}>
                <CardStatVertical
                    title='Total de Pedidos'
                    subtitle='Todos os status'
                    stats={loading ? '...' : totalOrders.toLocaleString('pt-BR')}
                    avatarColor='primary'
                    avatarIcon='tabler-receipt-2'
                    avatarSkin='light'
                    avatarSize={44}
                    chipText=''
                    chipColor='primary'
                    chipVariant='outlined'
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 as any }}>
                <CardStatVertical
                    title='Pedidos Pagos'
                    subtitle='Confirmados'
                    stats={loading ? '...' : totalPaidOrders.toLocaleString('pt-BR')}
                    avatarColor='success'
                    avatarIcon='tabler-badge-check'
                    avatarSkin='light'
                    avatarSize={44}
                    chipText=''
                    chipColor='primary'
                    chipVariant='outlined'
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 as any }}>
                <CardStatVertical
                    title='Receita Total'
                    subtitle='Bruto (vendas + taxas)'
                    stats={loading || !financial ? '...' : currency.format(financial.totalRevenue || 0)}
                    avatarColor='warning'
                    avatarIcon='tabler-currency-real'
                    avatarSkin='light'
                    avatarSize={44}
                    chipText=''
                    chipColor='primary'
                    chipVariant='outlined'
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 as any }}>
                <CardStatVertical
                    title='Clientes'
                    subtitle='Total de usuários'
                    stats={loading ? '...' : totalUsers.toLocaleString('pt-BR')}
                    avatarColor='info'
                    avatarIcon='tabler-users-group'
                    avatarSkin='light'
                    avatarSize={44}
                    chipText=''
                    chipColor='primary'
                    chipVariant='outlined'
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 as any }}>
                <CardStatVertical
                    title='Eventos'
                    subtitle='Cadastrados'
                    stats={loading ? '...' : totalEvents.toLocaleString('pt-BR')}
                    avatarColor='secondary'
                    avatarIcon='tabler-calendar-event'
                    avatarSkin='light'
                    avatarSize={44}
                    chipText=''
                    chipColor='primary'
                    chipVariant='outlined'
                />
            </Grid>

            {/* Ações rápidas */}
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                    <CardContent className='flex flex-col gap-3'>
                        <Typography variant='h6'>Cadastrar evento</Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Crie um novo evento e configure local, data, ingressos e estoque.
                        </Typography>
                        <Button
                            component={Link}
                            href='/en/apps/events/create'
                            variant='contained'
                            startIcon={<i className='tabler-calendar-plus' />}
                        >
                            Novo evento
                        </Button>
                    </CardContent>
                </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                    <CardContent className='flex flex-col gap-3'>
                        <Typography variant='h6'>Distribuir VIP</Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Envie cortesias VIP por e-mail para convidados selecionados.
                        </Typography>
                        <Button
                            component={Link}
                            href='/en/apps/events/list'
                            variant='outlined'
                            startIcon={<i className='tabler-ticket' />}
                        >
                            Escolher evento
                        </Button>
                    </CardContent>
                </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                    <CardContent className='flex flex-col gap-3'>
                        <Typography variant='h6'>Cadastrar código</Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Crie códigos de promotor ou campanhas para acompanhar vendas.
                        </Typography>
                        <Button
                            component={Link}
                            href='/en/apps/promoters/create'
                            variant='outlined'
                            startIcon={<i className='tabler-discount-2' />}
                        >
                            Novo código
                        </Button>
                    </CardContent>
                </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                    <CardContent className='flex flex-col gap-3'>
                        <Typography variant='h6'>Usuários suspeitos</Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Veja tentativas de fraude e gerencie bloqueios de clientes.
                        </Typography>
                        <Button
                            component={Link}
                            href='/en/apps/user/view?suspicious=true'
                            variant='outlined'
                            color='error'
                            startIcon={<i className='tabler-user-exclamation' />}
                        >
                            Revisar usuários
                        </Button>
                    </CardContent>
                </Card>
            </Grid>

            {error && (
                <Grid size={12}>
                    <Typography color='error' variant='body2'>
                        {error}
                    </Typography>
                </Grid>
            )}
        </Grid>
    )
}

export default ApphubOverview


