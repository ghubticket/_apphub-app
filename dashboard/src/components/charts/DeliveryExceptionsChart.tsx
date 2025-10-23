'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box, IconButton, CircularProgress, Alert } from '@mui/material'
import { MoreVert } from '@mui/icons-material'
import ApexChart from './ApexChart'
import { getApiUrl } from '@/config/env'

// Gráfico Donut - Integridade dos Serviços
export const ServiceIntegrityDonutChart: React.FC = () => {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Define os serviços de API para monitorar
    const apiServices = [
        { id: 'backend-api', name: 'Backend API', url: getApiUrl('/health/simple') },
        { id: 'database', name: 'Database', url: getApiUrl('/health/db') },
        { id: 'auth-service', name: 'Auth Service', url: getApiUrl('/health/auth') },
    ]

    // Função para verificar o status de uma única API
    const checkApiStatus = async (service: { id: string; name: string; url: string }) => {
        try {
            const response = await fetch(service.url, {
                method: 'GET',
                cache: 'no-cache'
            })
            if (response.ok) {
                const jsonResponse = await response.json()
                return { ...service, status: jsonResponse.status || 'unknown' }
            } else {
                return { ...service, status: 'offline' }
            }
        } catch (err) {
            console.error(`Error checking API status for ${service.name}:`, err)
            return { ...service, status: 'offline' }
        }
    }

    // Carregar dados da API (agora status dos serviços)
    useEffect(() => {
        const loadServiceStatusData = async () => {
            try {
                setLoading(true)
                setError(null)

                const results = await Promise.all(apiServices.map(checkApiStatus))

                const onlineCount = results.filter(s => s.status === 'online').length
                const offlineCount = results.filter(s => s.status === 'offline').length
                const warningCount = results.filter(s => s.status === 'warning').length

                const totalServices = results.length
                const onlinePercentage = totalServices > 0 ? Math.round((onlineCount / totalServices) * 100) : 0

                setData({
                    totalServices: totalServices,
                    onlineCount: onlineCount,
                    offlineCount: offlineCount,
                    warningCount: warningCount,
                    onlinePercentage: onlinePercentage,
                    categories: [
                        { name: 'Online', value: onlineCount, percentage: onlinePercentage, color: '#28a745' }, // Success
                        { name: 'Offline', value: offlineCount, percentage: Math.round((offlineCount / totalServices) * 100), color: '#dc3545' }, // Danger
                        ...(warningCount > 0 ? [{ name: 'Warning', value: warningCount, percentage: Math.round((warningCount / totalServices) * 100), color: '#ffc107' }] : []) // Warning
                    ]
                })
            } catch (err) {
                console.error('Failed to load service status data:', err)
                setError('Failed to load service status data.')
            } finally {
                setLoading(false)
            }
        }
        loadServiceStatusData()
    }, [])

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 365 }}>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="error">{error}</Alert>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="info">Nenhum dado disponível</Alert>
                </CardContent>
            </Card>
        )
    }

    const chartOptions = {
        chart: {
            height: 365,
            type: 'donut' as const
        },
        labels: data.categories.map((cat: any) => cat.name),
        series: data.categories.map((cat: any) => cat.value),
        colors: data.categories.map((cat: any) => cat.color),
        stroke: {
            width: 0
        },
        dataLabels: {
            enabled: false,
            formatter: function (val: number) {
                return parseInt(val.toString()) + '%'
            }
        },
        legend: {
            show: true,
            position: 'bottom' as const,
            offsetY: 10,
            markers: {
                size: 4,
                strokeWidth: 0
            },
            itemMargin: {
                horizontal: 15,
                vertical: 5
            },
            fontSize: '13px',
            fontFamily: 'Public Sans',
            fontWeight: 400,
            labels: {
                colors: '#a5a3ae', // labelColor
                useSeriesColors: false
            }
        },
        tooltip: {
            theme: 'light' as const
        },
        grid: {
            padding: {
                top: 15
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        value: {
                            fontSize: '38px',
                            fontFamily: 'Public Sans',
                            color: '#5d596c', // headingColor
                            fontWeight: 500,
                            offsetY: -20,
                            formatter: function (val: number) {
                                return parseInt(val.toString()) + '%'
                            }
                        },
                        name: {
                            offsetY: 30,
                            fontFamily: 'Public Sans'
                        },
                        total: {
                            show: true,
                            fontSize: '15px',
                            fontFamily: 'Public Sans',
                            color: '#a5a3ae', // labelColor
                            label: 'Online',
                            formatter: function (w: any) {
                                return `${data.onlinePercentage}%`
                            }
                        }
                    }
                }
            }
        },
        responsive: [
            {
                breakpoint: 1025,
                options: {
                    chart: {
                        height: 380
                    }
                }
            }
        ]
    }

    const chartSeries = data.categories.map((cat: any) => cat.value)

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Service Integrity Status</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total: {data.totalServices} services
                        </Typography>
                    </Box>
                    <IconButton size="small">
                        <MoreVert />
                    </IconButton>
                </Box>
                <ApexChart 
                    options={chartOptions} 
                    series={chartSeries} 
                    type="donut" 
                    height={365} 
                />
            </CardContent>
        </Card>
    )
}

export default ServiceIntegrityDonutChart
