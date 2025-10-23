'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Grid } from '@mui/material'
import ApexChart from './ApexChart'

// Gráfico de Vendas Diárias (Sparkline)
export const DailySalesChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 105,
      type: 'area' as const,
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: true
      }
    },
    markers: {
      colors: 'transparent',
      strokeColors: 'transparent'
    },
    grid: {
      show: false
    },
    colors: ['#28a745'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        gradientToColors: ['#fff'],
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      width: 2,
      curve: 'smooth' as const
    },
    xaxis: {
      show: true,
      lines: {
        show: false
      },
      labels: {
        show: false
      },
      stroke: {
        width: 0
      },
      axisBorder: {
        show: false
      }
    },
    yaxis: {
      stroke: {
        width: 0
      },
      show: false
    },
    tooltip: {
      enabled: false
    }
  }

  const chartSeries = [{
    data: [500, 160, 930, 670, 800, 950, 1200]
  }]

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Vendas Diárias</Typography>
            <Typography variant="h4" sx={{ color: '#28a745' }}>R$ 2.350</Typography>
            <Typography variant="body2" color="text.secondary">+12.5% vs ontem</Typography>
          </Box>
          <Box sx={{ width: 120, height: 60 }}>
            <ApexChart options={chartOptions} series={chartSeries} type="area" height={60} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// Gráfico de Receitas Semanais
export const WeeklyEarningsChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 200,
      type: 'line' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0'],
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    xaxis: {
      categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    grid: {
      borderColor: '#d9dee3'
    },
    tooltip: {
      theme: 'light'
    }
  }

  const chartSeries = [{
    name: 'Receitas',
    data: [120, 180, 150, 200, 250, 300, 280]
  }]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Receitas Semanais</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="line" height={200} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Suporte (Donut)
export const SupportTrackerChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 200,
      type: 'donut' as const,
      toolbar: {
        show: false
      }
    },
    labels: ['Novos', 'Abertos', 'Resolvidos'],
    colors: ['#7367F0', '#00cfe8', '#28a745'],
    dataLabels: {
      enabled: false
    },
    legend: {
      position: 'bottom' as const,
      fontFamily: 'Public Sans'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%'
        }
      }
    }
  }

  const chartSeries = [142, 28, 164]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Tickets de Suporte</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="donut" height={200} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Vendas por País
export const SalesByCountryChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 300,
      type: 'bar' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
    xaxis: {
      categories: ['Brasil', 'EUA', 'Argentina', 'Chile', 'México'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Vendas (R$)',
        style: {
          color: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      },
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    grid: {
      borderColor: '#d9dee3'
    },
    tooltip: {
      theme: 'light'
    }
  }

  const chartSeries = [{
    name: 'Vendas',
    data: [45000, 38000, 32000, 28000, 25000]
  }]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Vendas por País</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="bar" height={300} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Performance Mensal
export const MonthlyPerformanceChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 300,
      type: 'area' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745'],
    stroke: {
      curve: 'smooth' as const,
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
      categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Performance (%)',
        style: {
          color: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      },
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    grid: {
      borderColor: '#d9dee3'
    },
    legend: {
      position: 'top' as const,
      fontFamily: 'Public Sans'
    },
    tooltip: {
      theme: 'light'
    }
  }

  const chartSeries = [
    { name: 'Meta', data: [80, 85, 90, 88, 92, 95] },
    { name: 'Realizado', data: [75, 82, 88, 85, 89, 93] }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Performance Mensal</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="area" height={300} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Distribuição de Vendas
export const SalesDistributionChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 300,
      type: 'pie' as const,
      toolbar: {
        show: false
      }
    },
    labels: ['Online', 'Loja Física', 'App Mobile', 'Marketplace'],
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545'],
    legend: {
      position: 'bottom' as const,
      fontFamily: 'Public Sans'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val + '%'
    },
    tooltip: {
      theme: 'light'
    }
  }

  const chartSeries = [45, 30, 15, 10]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Distribuição de Vendas</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="pie" height={300} />
      </CardContent>
    </Card>
  )
}

// Componente principal da Home
export const HomeDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>Dashboard Principal - 5521</Typography>
      
      <Grid container spacing={3}>
        {/* Cards de Resumo */}
        <Grid item xs={12} md={3}>
          <DailySalesChart />
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Total de Usuários</Typography>
              <Typography variant="h4" sx={{ color: '#7367F0' }}>2.847</Typography>
              <Typography variant="body2" color="text.secondary">+18.2% vs mês passado</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Receita Total</Typography>
              <Typography variant="h4" sx={{ color: '#28a745' }}>R$ 45.2K</Typography>
              <Typography variant="body2" color="text.secondary">+12.5% vs mês passado</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Taxa de Conversão</Typography>
              <Typography variant="h4" sx={{ color: '#ffc107' }}>3.2%</Typography>
              <Typography variant="body2" color="text.secondary">+0.4% vs mês passado</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráficos Principais */}
        <Grid item xs={12} md={8}>
          <WeeklyEarningsChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <SupportTrackerChart />
        </Grid>

        {/* Gráficos Secundários */}
        <Grid item xs={12} md={6}>
          <SalesByCountryChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <MonthlyPerformanceChart />
        </Grid>

        {/* Gráfico de Distribuição */}
        <Grid item xs={12} md={6}>
          <SalesDistributionChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Atividades Recentes</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, bgcolor: '#28a745', borderRadius: '50%' }} />
                  <Typography variant="body2">Novo usuário cadastrado</Typography>
                  <Typography variant="caption" color="text.secondary">2 min atrás</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, bgcolor: '#7367F0', borderRadius: '50%' }} />
                  <Typography variant="body2">Venda realizada</Typography>
                  <Typography variant="caption" color="text.secondary">5 min atrás</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, bgcolor: '#ffc107', borderRadius: '50%' }} />
                  <Typography variant="body2">Ticket de suporte aberto</Typography>
                  <Typography variant="caption" color="text.secondary">10 min atrás</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
