'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Grid } from '@mui/material'
import ApexChart from './ApexChart'

// Gráfico de Linha - Vendas ao longo do tempo
export const SalesLineChart: React.FC = () => {
    const chartOptions = {
        chart: {
            type: 'line' as const,
            height: 350,
            toolbar: { show: false }
        },
        colors: ['#7367F0'],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']
        },
        yaxis: {
            title: { text: 'Vendas (R$)' }
        },
        grid: {
            borderColor: '#e7eef7'
        }
    }

    const chartSeries = [{
        name: 'Vendas',
        data: [12000, 15000, 18000, 22000, 19000, 25000, 28000]
    }]

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Vendas Mensais</Typography>
                <ApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
            </CardContent>
        </Card>
    )
}

// Gráfico de Barras - Produtos mais vendidos
export const ProductsBarChart: React.FC = () => {
    const chartOptions = {
        chart: {
            type: 'bar' as const,
            height: 350,
            toolbar: { show: false }
        },
        colors: ['#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
        xaxis: {
            categories: ['Produto A', 'Produto B', 'Produto C', 'Produto D', 'Produto E']
        },
        yaxis: {
            title: { text: 'Quantidade Vendida' }
        },
        grid: {
            borderColor: '#e7eef7'
        }
    }

    const chartSeries = [{
        name: 'Vendas',
        data: [45, 38, 52, 29, 41]
    }]

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Produtos Mais Vendidos</Typography>
                <ApexChart options={chartOptions} series={chartSeries} type="bar" height={350} />
            </CardContent>
        </Card>
    )
}

// Gráfico de Pizza - Distribuição de Categorias
export const CategoriesPieChart: React.FC = () => {
    const chartOptions = {
        chart: {
            type: 'pie' as const,
            height: 350
        },
        labels: ['Eletrônicos', 'Roupas', 'Casa', 'Esportes', 'Livros'],
        colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
        legend: {
            position: 'bottom' as const
        }
    }

    const chartSeries = [35, 25, 20, 15, 5]

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Distribuição por Categoria</Typography>
                <ApexChart options={chartOptions} series={chartSeries} type="pie" height={350} />
            </CardContent>
        </Card>
    )
}

// Gráfico de Área - Receita vs Despesas
export const RevenueAreaChart: React.FC = () => {
    const chartOptions = {
        chart: {
            type: 'area' as const,
            height: 350,
            toolbar: { show: false }
        },
        colors: ['#28a745', '#dc3545'],
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3
            }
        },
        xaxis: {
            categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
        },
        yaxis: {
            title: { text: 'Valor (R$)' }
        },
        grid: {
            borderColor: '#e7eef7'
        }
    }

    const chartSeries = [
        {
            name: 'Receita',
            data: [30000, 35000, 40000, 38000, 42000, 45000]
        },
        {
            name: 'Despesas',
            data: [20000, 22000, 25000, 23000, 26000, 28000]
        }
    ]

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Receita vs Despesas</Typography>
                <ApexChart options={chartOptions} series={chartSeries} type="area" height={350} />
            </CardContent>
        </Card>
    )
}

// Gráfico de Donut - Status dos Pedidos
export const OrdersDonutChart: React.FC = () => {
    const chartOptions = {
        chart: {
            type: 'donut' as const,
            height: 350
        },
        labels: ['Entregues', 'Em Trânsito', 'Pendentes', 'Cancelados'],
        colors: ['#28a745', '#ffc107', '#17a2b8', '#dc3545'],
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            formatter: () => '150'
                        }
                    }
                }
            }
        },
        legend: {
            position: 'bottom' as const
        }
    }

    const chartSeries = [85, 35, 20, 10]

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Status dos Pedidos</Typography>
                <ApexChart options={chartOptions} series={chartSeries} type="donut" height={350} />
            </CardContent>
        </Card>
    )
}

// Gráfico de Barras Horizontais - Vendas por Região
export const HorizontalBarChart: React.FC = () => {
  const chartOptions = {
    chart: {
      type: 'bar' as const,
      height: 350,
      toolbar: { show: false },
      horizontal: true
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545'],
    xaxis: {
      categories: ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']
    },
    yaxis: {
      title: { text: 'Região' }
    },
    grid: {
      borderColor: '#e7eef7'
    }
  }

  const chartSeries = [{
    name: 'Vendas (R$)',
    data: [45000, 38000, 52000, 29000, 31000]
  }]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Vendas por Região</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="bar" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Barras Empilhadas - Vendas por Mês e Categoria
export const StackedBarChart: React.FC = () => {
  const chartOptions = {
    chart: {
      type: 'bar' as const,
      height: 350,
      toolbar: { show: false },
      stacked: true
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545'],
    xaxis: {
      categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
    },
    yaxis: {
      title: { text: 'Vendas (R$)' }
    },
    legend: {
      position: 'top' as const
    },
    grid: {
      borderColor: '#e7eef7'
    }
  }

  const chartSeries = [
    { name: 'Eletrônicos', data: [20, 30, 25, 35, 40, 45] },
    { name: 'Roupas', data: [15, 20, 18, 25, 30, 35] },
    { name: 'Casa', data: [10, 15, 12, 18, 22, 25] },
    { name: 'Esportes', data: [5, 8, 6, 10, 12, 15] }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Vendas por Categoria (Empilhado)</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="bar" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Radar - Performance por Métrica
export const RadarChart: React.FC = () => {
  const chartOptions = {
    chart: {
      type: 'radar' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#7367F0', '#28a745'],
    xaxis: {
      categories: ['Vendas', 'Marketing', 'Produtividade', 'Satisfação', 'Qualidade', 'Inovação']
    },
    yaxis: {
      show: false
    },
    grid: {
      borderColor: '#e7eef7'
    }
  }

  const chartSeries = [
    { name: '2023', data: [80, 70, 90, 85, 75, 88] },
    { name: '2024', data: [85, 75, 95, 90, 80, 92] }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Performance por Métrica</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="radar" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Gauge - Satisfação do Cliente
export const GaugeChart: React.FC = () => {
  const chartOptions = {
    chart: {
      type: 'radialBar' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#28a745'],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        dataLabels: {
          name: {
            show: true,
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333'
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333',
            formatter: (val: number) => val + '%'
          }
        }
      }
    },
    labels: ['Satisfação']
  }

  const chartSeries = [85]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Satisfação do Cliente</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="radialBar" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Heatmap - Atividade por Dia/Hora
export const HeatmapChart: React.FC = () => {
  const chartOptions = {
    chart: {
      type: 'heatmap' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#28a745'],
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff']
      }
    },
    xaxis: {
      categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
    },
    yaxis: {
      categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    }
  }

  const chartSeries = [
    { name: 'Seg', data: [20, 15, 45, 60, 55, 30] },
    { name: 'Ter', data: [25, 20, 50, 65, 60, 35] },
    { name: 'Qua', data: [30, 25, 55, 70, 65, 40] },
    { name: 'Qui', data: [35, 30, 60, 75, 70, 45] },
    { name: 'Sex', data: [40, 35, 65, 80, 75, 50] },
    { name: 'Sáb', data: [15, 10, 30, 40, 35, 20] },
    { name: 'Dom', data: [10, 5, 20, 25, 20, 15] }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Atividade por Dia/Hora</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="heatmap" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Treemap - Distribuição de Vendas
export const TreemapChart: React.FC = () => {
  const chartOptions = {
    chart: {
      type: 'treemap' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff']
      }
    }
  }

  const chartSeries = [
    {
      data: [
        { x: 'Eletrônicos', y: 45000 },
        { x: 'Roupas', y: 38000 },
        { x: 'Casa', y: 32000 },
        { x: 'Esportes', y: 28000 },
        { x: 'Livros', y: 22000 },
        { x: 'Beleza', y: 18000 }
      ]
    }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Distribuição de Vendas (Treemap)</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="treemap" height={350} />
      </CardContent>
    </Card>
  )
}

// Componente principal com todos os gráficos
export const MockChartsDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>Dashboard de Exemplo - ApexCharts</Typography>
      
      <Grid container spacing={3}>
        {/* Gráficos Básicos */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ mb: 2 }}>Gráficos Básicos</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <SalesLineChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProductsBarChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <CategoriesPieChart />
        </Grid>
        <Grid item xs={12} md={8}>
          <RevenueAreaChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <OrdersDonutChart />
        </Grid>

        {/* Gráficos Avançados */}
        <Grid item xs={12} sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Gráficos Avançados</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <HorizontalBarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <StackedBarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <RadarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <GaugeChart />
        </Grid>
        <Grid item xs={12} md={8}>
          <HeatmapChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <TreemapChart />
        </Grid>
      </Grid>
    </Box>
  )
}
