'use client'

import React from 'react'
import { Box, Typography, Grid } from '@mui/material'
import RequireAuth from '@/components/auth/RequireAuth'
import ApiStatusCard from '@/components/cards/ApiStatusCard'
import { ServiceIntegrityDonutChart } from '@/components/charts/DeliveryExceptionsChart'
import { getApiUrl } from '@/config/env'

const DashboardPage = () => {
    return (
        <RequireAuth>
            <Box>
                <Typography variant="h4" gutterBottom>
                    Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Visão geral do sistema
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <ApiStatusCard
                            services={[
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
                            ]}
                            autoRefresh={false}
                            refreshInterval={0}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ServiceIntegrityDonutChart />
                    </Grid>
                </Grid>
            </Box>
        </RequireAuth>
    )
}

export default DashboardPage