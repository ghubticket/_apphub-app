'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box, Chip, IconButton, Tooltip } from '@mui/material'
import { CheckCircle, Error, Warning, Refresh, MoreVert } from '@mui/icons-material'

interface ApiService {
    id: string
    name: string
    url: string
    status: 'online' | 'offline' | 'warning' | 'checking'
    responseTime?: number
    lastCheck?: Date
    description?: string
}

interface ApiStatusCardProps {
    services: ApiService[]
    onRefresh?: () => void
    autoRefresh?: boolean
    refreshInterval?: number
}

const ApiStatusCard: React.FC<ApiStatusCardProps> = ({
    services,
    onRefresh,
    autoRefresh = true,
    refreshInterval = 30000 // 30 segundos
}) => {
    const [apiServices, setApiServices] = useState<ApiService[]>(services)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Função para verificar status da API
    const checkApiStatus = async (service: ApiService): Promise<ApiService> => {
        const startTime = Date.now()

        try {
            const response = await fetch(service.url, {
                method: 'GET', // Usar GET em vez de HEAD
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const responseTime = Date.now() - startTime

            if (response.ok) {
                return {
                    ...service,
                    status: 'online',
                    responseTime,
                    lastCheck: new Date()
                }
            } else {
                return {
                    ...service,
                    status: 'offline',
                    lastCheck: new Date()
                }
            }
        } catch (error) {
            console.warn(`API ${service.name} check failed:`, error)
            return {
                ...service,
                status: 'offline',
                lastCheck: new Date()
            }
        }
    }

    // Função para atualizar todos os serviços
    const refreshAllServices = async () => {
        setIsRefreshing(true)

        const updatedServices = await Promise.all(
            apiServices.map(service => checkApiStatus(service))
        )

        setApiServices(updatedServices)
        setIsRefreshing(false)

        if (onRefresh) {
            onRefresh()
        }
    }

    // Auto refresh - DESABILITADO para evitar rate limiting
    useEffect(() => {
        // if (!autoRefresh) return
        // const interval = setInterval(refreshAllServices, refreshInterval)
        // return () => clearInterval(interval)
    }, [autoRefresh, refreshInterval])

    // Verificar status inicial - DESABILITADO para evitar rate limiting
    useEffect(() => {
        // refreshAllServices()
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'success'
            case 'offline': return 'error'
            case 'warning': return 'warning'
            case 'checking': return 'info'
            default: return 'default'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'online': return <CheckCircle sx={{ color: 'white' }} />
            case 'offline': return <Error sx={{ color: 'white' }} />
            case 'warning': return <Warning sx={{ color: 'white' }} />
            case 'checking': return <Refresh sx={{ color: 'white' }} />
            default: return <Error sx={{ color: 'white' }} />
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'online': return 'Online'
            case 'offline': return 'Offline'
            case 'warning': return 'Atenção'
            case 'checking': return 'Verificando...'
            default: return 'Desconhecido'
        }
    }

    const onlineCount = apiServices.filter(s => s.status === 'online').length
    const totalCount = apiServices.length
    const overallStatus = onlineCount === totalCount ? 'online' :
        onlineCount > 0 ? 'warning' : 'offline'

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                            Integridade dos Serviços
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {onlineCount}/{totalCount} serviços online
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            icon={getStatusIcon(overallStatus)}
                            label={getStatusText(overallStatus)}
                            color={getStatusColor(overallStatus)}
                            variant="outlined"
                        />
                        <Tooltip title="Atualizar Status">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={refreshAllServices}
                                    disabled={isRefreshing}
                                >
                                    <Refresh className={isRefreshing ? 'animate-spin' : ''} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {apiServices.map((service) => (
                        <Box
                            key={service.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 2,
                                border: '1px solid',
                                borderColor: getStatusColor(service.status) === 'success' ? 'success.main' :
                                    getStatusColor(service.status) === 'error' ? 'error.main' :
                                        getStatusColor(service.status) === 'warning' ? 'warning.main' : 'grey.300',
                                borderRadius: 1,
                                backgroundColor: getStatusColor(service.status) === 'success' ? 'success.light' :
                                    getStatusColor(service.status) === 'error' ? 'error.light' :
                                        getStatusColor(service.status) === 'warning' ? 'warning.light' : 'grey.50'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {getStatusIcon(service.status)}
                                <Box>
                                    <Typography variant="body1" fontWeight="medium" sx={{ color: 'white' }}>
                                        {service.name}
                                    </Typography>
                                    {service.description && (
                                        <Typography variant="caption" sx={{ color: 'white' }}>
                                            {service.description}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {service.responseTime && (
                                    <Typography variant="caption" sx={{ color: 'white' }}>
                                        {service.responseTime}ms
                                    </Typography>
                                )}
                                <Chip
                                    label={getStatusText(service.status)}
                                    color={getStatusColor(service.status)}
                                    size="small"
                                    sx={{ color: 'white' }}
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>

                {apiServices.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Nenhum serviço configurado
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}

export default ApiStatusCard
