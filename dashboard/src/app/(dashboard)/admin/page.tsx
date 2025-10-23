'use client'

import React, { useState, useEffect } from 'react'
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Avatar,
    Chip,
    Button,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material'
import {
    People,
    Computer,
    LocationOn,
    AccessTime,
    Security,
    Refresh,
    Logout,
    Warning,
    TrendingUp,
    Event,
    QrCode
} from '@mui/icons-material'
// Usando componentes do template em vez de recharts direto
import { useAuth } from '@/contexts/AuthContext'
import { getApiUrl } from '@/config/env'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
// Gráficos removidos devido a conflitos de versão
import StatsCard from '@/components/cards/StatsCard'
import ApiStatusCard from '@/components/cards/ApiStatusCard'
import SessionsTable from '@/components/tables/SessionsTable'
import { ServiceIntegrityDonutChart } from '@/components/charts/DeliveryExceptionsChart'

interface SessionData {
    _id: string
    deviceInfo: {
        userAgent: string
        ip: string
        device: string
        browser: string
        os: string
    }
    isActive: boolean
    createdAt: string
    lastActivity: string
    user: {
        _id: string
        name: string
        email: string
        role: string
    }
}

interface SessionStats {
    totalSessions: number
    activeSessions: number
    totalUsers: number
    todayLogins: number
}

const AdminPage = () => {
    const { user } = useAuth()
    const [sessions, setSessions] = useState<SessionData[]>([])
    const [stats, setStats] = useState<SessionStats>({
        totalSessions: 0,
        activeSessions: 0,
        totalUsers: 0,
        todayLogins: 0
    })
    const [loading, setLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)
    const [confirmDialog, setConfirmDialog] = useState(false)


    // Dados das APIs para monitoramento (apenas nossas APIs do backend)
    const apiServices = [
        {
            id: 'backend-api',
            name: 'Backend API',
            url: getApiUrl('/health/simple'),
            status: 'online' as const,
            description: 'API principal do sistema'
        },
        {
            id: 'database',
            name: 'Database',
            url: getApiUrl('/health/db'),
            status: 'online' as const,
            description: 'Conexão com banco de dados'
        },
        {
            id: 'auth-service',
            name: 'Auth Service',
            url: getApiUrl('/health/auth'),
            status: 'online' as const,
            description: 'Serviço de autenticação'
        }
    ]


    // ProtectedRoute já verifica se é admin

    // Carregar dados das sessões
    const loadSessions = async () => {
        try {
            setLoading(true)
            const accessToken = localStorage.getItem('apphub_access_token')

            const response = await fetch(`${getApiUrl('')}/auth/sessions`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                console.log('📊 Dados recebidos:', data)
                console.log('👥 Sessões:', data.data)
                setSessions(data.data || [])
            } else {
                const errorText = await response.text()
                console.error('❌ Erro ao carregar sessões:', response.status, errorText)
            }
        } catch (error) {
            console.error('Erro ao carregar sessões:', error)
        } finally {
            setLoading(false)
        }
    }

    // Carregar estatísticas
    const loadStats = async () => {
        try {
            const accessToken = localStorage.getItem('apphub_access_token')

            const response = await fetch(`${getApiUrl('')}/auth/stats`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                setStats(data.data || {})
            } else {
                console.error('Erro ao carregar estatísticas:', response.status, response.statusText)
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error)
        }
    }

    // Encerrar sessão específica
    const handleLogoutSession = async (sessionId: string) => {
        try {
            const response = await fetch(`${getApiUrl('')}/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            })

            if (response.ok) {
                await loadSessions()
                setConfirmDialog(false)
                setSelectedSession(null)
            }
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error)
        }
    }

    // Encerrar todas as sessões
    const handleLogoutAllSessions = async () => {
        try {
            const response = await fetch(`${getApiUrl('')}/auth/sessions/all`, {
                method: 'DELETE',
                credentials: 'include'
            })

            if (response.ok) {
                await loadSessions()
                setConfirmDialog(false)
                setSelectedSession(null)
            }
        } catch (error) {
            console.error('Erro ao encerrar todas as sessões:', error)
        }
    }

    useEffect(() => {
        loadSessions()
        loadStats()
    }, [])

    return (
        <ProtectedRoute requiredRole="ADMIN">
            <Box sx={{ p: 0 }}>
                <Typography variant="h4" sx={{ mb: 3, color: 'black' }}>
                    Contro de Acessos - 5521
                </Typography>


                {/* Cards de Estatísticas - Template Style */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Sessões Ativas"
                            subtitle="Agora"
                            stats={stats.activeSessions.toString()}
                            avatarIcon="tabler-users"
                            avatarColor="primary"
                            chipText="Online"
                            chipColor="success"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Total de Sessões"
                            subtitle="Histórico"
                            stats={stats.totalSessions.toString()}
                            avatarIcon="tabler-device-desktop"
                            avatarColor="secondary"
                            chipText="Total"
                            chipColor="info"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Usuários Únicos"
                            subtitle="Registrados"
                            stats={stats.totalUsers.toString()}
                            avatarIcon="tabler-shield-check"
                            avatarColor="success"
                            chipText="Ativos"
                            chipColor="success"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Logins Hoje"
                            subtitle="Últimas 24h"
                            stats={stats.todayLogins.toString()}
                            avatarIcon="tabler-clock"
                            avatarColor="warning"
                            chipText="Hoje"
                            chipColor="warning"
                        />
                    </Grid>
                </Grid>

                {/* Integridade dos Serviços e Gráfico */}
                <Grid container spacing={3} sx={{ mb: 4, mt: 4 }}>
                    <Grid item xs={12} md={6}>
                        <ApiStatusCard 
                            services={apiServices}
                            autoRefresh={false}
                            refreshInterval={0}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ServiceIntegrityDonutChart />
                    </Grid>
                </Grid>


            </Box>
        </ProtectedRoute>
    )
}

export default AdminPage