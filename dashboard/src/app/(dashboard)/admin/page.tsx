'use client'

import React from 'react'
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Divider,
    Paper
} from '@mui/material'
import {
  Event,
  ConfirmationNumber as Ticket,
  People,
  TrendingUp,
  QrCode,
  Settings,
  BarChart
} from '@mui/icons-material'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
// Logo import removed - using image directly

const AdminDashboard: React.FC = () => {
    const { user } = useAuth()

    const stats = [
        {
            title: 'Eventos Ativos',
            value: '12',
            icon: <Event />,
            color: 'primary',
            change: '+2 esta semana'
        },
        {
            title: 'Ingressos Vendidos',
            value: '1,247',
            icon: <Ticket />,
            color: 'success',
            change: '+15% vs mês passado'
        },
        {
            title: 'Usuários Ativos',
            value: '3,891',
            icon: <People />,
            color: 'info',
            change: '+8% vs mês passado'
        },
        {
            title: 'Receita Total',
            value: 'R$ 45.230',
            icon: <TrendingUp />,
            color: 'warning',
            change: '+23% vs mês passado'
        }
    ]

    const recentEvents = [
        {
            id: 1,
            name: 'Festival de Música 2024',
            date: '2024-03-15',
            tickets: 150,
            sold: 89,
            status: 'active'
        },
        {
            id: 2,
            name: 'Workshop de Tecnologia',
            date: '2024-03-20',
            tickets: 50,
            sold: 50,
            status: 'soldout'
        },
        {
            id: 3,
            name: 'Conferência de Negócios',
            date: '2024-03-25',
            tickets: 200,
            sold: 45,
            status: 'active'
        }
    ]

    const quickActions = [
        {
            title: 'Criar Evento',
            description: 'Adicionar novo evento',
            icon: <Event />,
            color: 'primary'
        },
        {
            title: 'Gerenciar Ingressos',
            description: 'Configurar tipos e preços',
            icon: <Ticket />,
            color: 'success'
        },
        {
            title: 'Relatórios',
            description: 'Ver analytics e vendas',
            icon: <BarChart />,
            color: 'info'
        },
        {
            title: 'Configurações',
            description: 'Ajustar sistema',
            icon: <Settings />,
            color: 'warning'
        }
    ]

    return (
        <ProtectedRoute requiredRole="ADMIN">
            <Box className="ts-vertical-layout-content" sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <img src="/images/5521.png" alt="5521 Logo" className="h-12 w-auto brightness-0 invert" />
                        <Box sx={{ ml: 2 }}>
                            <Typography variant="h4" gutterBottom>
                                👑 Dashboard Administrativo
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Bem-vindo, {user?.name}! Gerencie seus eventos e acompanhe as métricas.
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {stats.map((stat, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card className="ts-card-root">
                                <CardContent className="ts-card-content">
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar sx={{ bgcolor: `${stat.color}.main`, mr: 2 }}>
                                            {stat.icon}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h4" component="div">
                                                {stat.value}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {stat.title}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Chip
                                        label={stat.change}
                                        color={stat.color as any}
                                        size="small"
                                        variant="outlined"
                                    />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={3}>
                    {/* Recent Events */}
                    <Grid item xs={12} md={8}>
                        <Card className="ts-card-root">
                            <CardContent className="ts-card-content">
                                <Typography variant="h6" gutterBottom>
                                    Eventos Recentes
                                </Typography>
                                <List>
                                    {recentEvents.map((event, index) => (
                                        <React.Fragment key={event.id}>
                                            <ListItem>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                        <Event />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={event.name}
                                                    secondary={
                                                        <Box>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {event.date} • {event.sold}/{event.tickets} ingressos vendidos
                                                            </Typography>
                                                            <Chip
                                                                label={event.status === 'active' ? 'Ativo' : 'Esgotado'}
                                                                color={event.status === 'active' ? 'success' : 'error'}
                                                                size="small"
                                                                sx={{ mt: 0.5 }}
                                                            />
                                                        </Box>
                                                    }
                                                />
                                                <Button size="small" variant="outlined">
                                                    Ver Detalhes
                                                </Button>
                                            </ListItem>
                                            {index < recentEvents.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Quick Actions */}
                    <Grid item xs={12} md={4}>
                        <Card className="ts-card-root">
                            <CardContent className="ts-card-content">
                                <Typography variant="h6" gutterBottom>
                                    Ações Rápidas
                                </Typography>
                                <Grid container spacing={2}>
                                    {quickActions.map((action, index) => (
                                        <Grid item xs={12} key={index}>
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    }
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Avatar sx={{ bgcolor: `${action.color}.main`, mr: 2, width: 40, height: 40 }}>
                                                        {action.icon}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {action.title}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {action.description}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* System Status */}
                <Card className="ts-card-root" sx={{ mt: 3 }}>
                    <CardContent className="ts-card-content">
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <img src="/images/5521.png" alt="5521 Logo" className="h-8 w-auto brightness-0 invert" />
                            <Typography variant="h6" sx={{ ml: 2 }}>
                                Status do Sistema
                            </Typography>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <QrCode sx={{ mr: 1, color: 'success.main' }} />
                                    <Typography variant="body2">
                                        Scanner QR: <Chip label="Online" color="success" size="small" />
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Event sx={{ mr: 1, color: 'success.main' }} />
                                    <Typography variant="body2">
                                        API Backend: <Chip label="Online" color="success" size="small" />
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <People sx={{ mr: 1, color: 'success.main' }} />
                                    <Typography variant="body2">
                                        Usuários: <Chip label="3,891 ativos" color="info" size="small" />
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Box>
        </ProtectedRoute>
    )
}

export default AdminDashboard
