'use client'

import React from 'react'
import { Box, Typography, Grid } from '@mui/material'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ApiStatusCard from '@/components/cards/ApiStatusCard'
import { DeliveryExceptionsChart } from '@/components/charts/DeliveryExceptionsChart'
import { getApiUrl } from '@/config/env'

const DashboardPage = () => {
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

    return (
        <ProtectedRoute>
            <Box sx={{ p: 0 }}>
                <Typography variant="h4" sx={{ mb: 3, color: 'black' }}>
                    Dashboard Principal - 5521
                </Typography>

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
                        <DeliveryExceptionsChart />
                    </Grid>
                </Grid>
            </Box>
        </ProtectedRoute>
    )
}

export default DashboardPage