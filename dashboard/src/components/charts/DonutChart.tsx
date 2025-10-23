'use client'

import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'
import ApexChart from './ApexChart'

// Gráfico Donut - Horas de Estudo (baseado na versão paga)
export const StudyHoursDonutChart: React.FC = () => {
    const chartOptions = {
        chart: {
            height: 170,
            width: 150,
            type: 'donut' as const
        },
        labels: ['36h', '56h', '16h', '32h', '56h', '16h'],
        series: [23, 35, 10, 20, 35, 23],
        colors: [
            'color-mix(in sRGB, #28a745 80%, #000)',
            'color-mix(in sRGB, #28a745 90%, #000)',
            '#28a745',
            'color-mix(in sRGB, #28a745 80%, #fff)',
            'color-mix(in sRGB, #28a745 60%, #fff)',
            'color-mix(in sRGB, #28a745 40%, #fff)'
        ],
        stroke: {
            width: 0
        },
        dataLabels: {
            enabled: false,
            formatter: (val: number) => parseInt(val.toString()) + '%'
        },
        legend: {
            show: false
        },
        tooltip: {
            theme: false
        },
        grid: {
            padding: {
                top: 0
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        value: {
                            fontSize: '1.125rem',
                            fontFamily: 'Public Sans',
                            color: '#5d596c',
                            fontWeight: 500,
                            offsetY: -20,
                            formatter: (val: number) => parseInt(val.toString()) + '%'
                        },
                        name: {
                            offsetY: 20,
                            fontFamily: 'Public Sans'
                        },
                        total: {
                            show: true,
                            fontSize: '.9375rem',
                            label: 'Total',
                            color: '#a5a3ae',
                            formatter: () => '231h'
                        }
                    }
                }
            }
        }
    }

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1 }}>Horas de Estudo</Typography>
                        <Typography variant="h4" sx={{ color: '#28a745' }}>231h</Typography>
                        <Typography variant="body2" color="text.secondary">Total de horas</Typography>
                    </Box>
                    <Box sx={{ width: 120, height: 120 }}>
                        <ApexChart options={chartOptions} series={[23, 35, 10, 20, 35, 23]} type="donut" height={120} />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}

// Gráfico Donut - Vendas por Categoria
export const SalesCategoryDonutChart: React.FC = () => {
    const chartOptions = {
        chart: {
            height: 300,
            type: 'donut' as const
        },
        labels: ['Eletrônicos', 'Roupas', 'Casa', 'Esportes', 'Livros'],
        series: [35, 25, 20, 15, 5],
        colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
        stroke: {
            width: 0
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => parseInt(val.toString()) + '%'
        },
        legend: {
            position: 'bottom' as const,
            fontFamily: 'Public Sans'
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        value: {
                            fontSize: '1.5rem',
                            fontFamily: 'Public Sans',
                            color: '#5d596c',
                            fontWeight: 600,
                            offsetY: -10,
                            formatter: (val: number) => parseInt(val.toString()) + '%'
                        },
                        name: {
                            offsetY: 15,
                            fontFamily: 'Public Sans'
                        },
                        total: {
                            show: true,
                            fontSize: '1rem',
                            label: 'Total',
                            color: '#a5a3ae',
                            formatter: () => 'R$ 45.2K'
                        }
                    }
                }
            }
        },
        tooltip: {
            theme: 'light'
        }
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Vendas por Categoria</Typography>
                <ApexChart options={chartOptions} series={[35, 25, 20, 15, 5]} type="donut" height={300} />
            </CardContent>
        </Card>
    )
}

// Gráfico Donut - Status dos Tickets
export const TicketsStatusDonutChart: React.FC = () => {
    const chartOptions = {
        chart: {
            height: 300,
            type: 'donut' as const
        },
        labels: ['Novos', 'Em Andamento', 'Resolvidos', 'Fechados'],
        series: [142, 28, 164, 45],
        colors: ['#7367F0', '#ffc107', '#28a745', '#dc3545'],
        stroke: {
            width: 0
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => parseInt(val.toString()) + '%'
        },
        legend: {
            position: 'bottom' as const,
            fontFamily: 'Public Sans'
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        value: {
                            fontSize: '1.5rem',
                            fontFamily: 'Public Sans',
                            color: '#5d596c',
                            fontWeight: 600,
                            offsetY: -10,
                            formatter: (val: number) => parseInt(val.toString()) + '%'
                        },
                        name: {
                            offsetY: 15,
                            fontFamily: 'Public Sans'
                        },
                        total: {
                            show: true,
                            fontSize: '1rem',
                            label: 'Total',
                            color: '#a5a3ae',
                            formatter: () => '379'
                        }
                    }
                }
            }
        },
        tooltip: {
            theme: 'light'
        }
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Status dos Tickets</Typography>
                <ApexChart options={chartOptions} series={[142, 28, 164, 45]} type="donut" height={300} />
            </CardContent>
        </Card>
    )
}
