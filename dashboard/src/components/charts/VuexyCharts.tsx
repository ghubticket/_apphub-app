'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Grid } from '@mui/material'
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
        <Typography variant="h6" sx={{ mb: 2 }}>Horas de Estudo</Typography>
        <ApexChart options={chartOptions} series={[23, 35, 10, 20, 35, 23]} type="donut" height={170} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Barras Horizontais - Cursos (baseado na versão paga)
export const CoursesHorizontalBarChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 300,
      type: 'bar' as const,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        distributed: true,
        startingShape: 'rounded',
        borderRadiusApplication: 'end',
        borderRadius: 7
      }
    },
    grid: {
      strokeDashArray: 10,
      borderColor: '#d9dee3',
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      },
      padding: {
        top: -35,
        bottom: -12
      }
    },
    colors: [
      '#7367F0',
      '#00cfe8',
      '#28a745',
      '#8592a3',
      '#ea5455',
      '#ff9f43'
    ],
    fill: {
      opacity: [1, 1, 1, 1, 1, 1]
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff'],
        fontWeight: 400,
        fontSize: '13px',
        fontFamily: 'Public Sans'
      },
      formatter: (val: number, opts: any) => {
        const labels = ['UI Design', 'UX Design', 'Music', 'Animation', 'React', 'SEO']
        return labels[opts.dataPointIndex]
      },
      offsetX: 0,
      dropShadow: {
        enabled: false
      }
    },
    labels: ['UI Design', 'UX Design', 'Music', 'Animation', 'React', 'SEO'],
    series: [{
      data: [35, 20, 14, 12, 10, 9]
    }],
    xaxis: {
      categories: ['6', '5', '4', '3', '2', '1'],
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans',
          fontSize: '13px'
        },
        formatter: (val: string) => `${val}%`
      }
    },
    yaxis: {
      max: 35,
      labels: {
        style: {
          colors: ['#a5a3ae'],
          fontFamily: 'Public Sans',
          fontSize: '13px'
        }
      }
    },
    tooltip: {
      enabled: true,
      style: {
        fontSize: '12px'
      },
      onDatasetHover: {
        highlightDataSeries: false
      },
      custom: ({ series, seriesIndex, dataPointIndex }: any) => {
        return `<div class="px-3 py-2">${series[seriesIndex][dataPointIndex]}%</div>`
      }
    },
    legend: {
      show: false
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Cursos por Categoria</Typography>
        <ApexChart options={chartOptions} series={[{ data: [35, 20, 14, 12, 10, 9] }]} type="bar" height={300} />
      </CardContent>
    </Card>
  )
}

// Gráfico Radial - Progresso (baseado na versão paga)
export const ProgressRadialChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 58,
      width: 58,
      type: 'radialBar' as const
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '50%'
        },
        dataLabels: {
          show: true,
          value: {
            offsetY: -10,
            fontSize: '15px',
            fontWeight: 500,
            fontFamily: 'Public Sans',
            color: '#5d596c'
          }
        },
        track: {
          background: '#f5f5f9'
        }
      }
    },
    stroke: {
      lineCap: 'round' as const
    },
    colors: ['#7367F0'],
    grid: {
      padding: {
        top: -12,
        bottom: -17,
        left: -17,
        right: -15
      }
    },
    series: [85],
    labels: ['']
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Progresso do Curso</Typography>
        <ApexChart options={chartOptions} series={[85]} type="radialBar" height={58} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Linha - Performance ao Longo do Tempo
export const PerformanceLineChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'line' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#00cfe8'],
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    xaxis: {
      categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Pontuação',
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
    {
      name: 'Performance',
      data: [85, 90, 88, 92, 89, 94, 96]
    },
    {
      name: 'Meta',
      data: [80, 85, 82, 88, 85, 90, 92]
    }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Performance ao Longo do Tempo</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Área - Vendas Mensais
export const MonthlySalesAreaChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'area' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#28a745'],
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
    data: [30000, 35000, 40000, 38000, 42000, 45000]
  }]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Vendas Mensais</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="area" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Pizza - Distribuição de Vendas
export const SalesPieChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'pie' as const
    },
    labels: ['Eletrônicos', 'Roupas', 'Casa', 'Esportes', 'Livros'],
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
    legend: {
      position: 'bottom' as const,
      fontFamily: 'Public Sans'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val + '%'
    },
    tooltip: {
      y: {
        formatter: (val: number) => 'R$ ' + val.toLocaleString()
      }
    }
  }

  const chartSeries = [35, 25, 20, 15, 5]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Distribuição de Vendas</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="pie" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Barras Empilhadas - Vendas por Mês
export const StackedBarChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'bar' as const,
      stacked: true,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545'],
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
    legend: {
      position: 'top' as const,
      fontFamily: 'Public Sans'
    },
    grid: {
      borderColor: '#d9dee3'
    },
    tooltip: {
      theme: 'light'
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
export const PerformanceRadarChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'radar' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745'],
    xaxis: {
      categories: ['Vendas', 'Marketing', 'Produtividade', 'Satisfação', 'Qualidade', 'Inovação'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      show: false
    },
    grid: {
      borderColor: '#d9dee3'
    },
    legend: {
      fontFamily: 'Public Sans'
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
export const CustomerSatisfactionGauge: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'radialBar' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#28a745'],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: '70%'
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#5d596c',
            fontFamily: 'Public Sans',
            offsetY: -10
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#5d596c',
            fontFamily: 'Public Sans',
            offsetY: 10,
            formatter: (val: number) => val + '%'
          }
        }
      }
    },
    stroke: {
      lineCap: 'round' as const
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
export const ActivityHeatmapChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'heatmap' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#28a745'],
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff'],
        fontSize: '12px',
        fontFamily: 'Public Sans'
      }
    },
    xaxis: {
      categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    tooltip: {
      theme: 'light'
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
export const SalesTreemapChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'treemap' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff'],
        fontFamily: 'Public Sans'
      }
    },
    tooltip: {
      theme: 'light'
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

// Gráfico de Barras Horizontais - Vendas por Região
export const RegionalSalesHorizontalChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'bar' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 7,
        borderRadiusApplication: 'end'
      }
    },
    xaxis: {
      categories: ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Região',
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

// Gráfico de Linha com Múltiplas Séries - Comparativo
export const ComparativeLineChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'line' as const,
      toolbar: {
        show: false
      }
    },
    colors: ['#7367F0', '#28a745', '#ffc107', '#dc3545'],
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    xaxis: {
      categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
      labels: {
        style: {
          colors: '#a5a3ae',
          fontFamily: 'Public Sans'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Valor (R$)',
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
    { name: 'Vendas 2023', data: [30000, 35000, 40000, 38000, 42000, 45000, 48000] },
    { name: 'Vendas 2024', data: [32000, 37000, 42000, 40000, 44000, 47000, 50000] },
    { name: 'Meta 2024', data: [35000, 40000, 45000, 43000, 47000, 50000, 53000] },
    { name: 'Crescimento', data: [28000, 32000, 36000, 34000, 38000, 41000, 44000] }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Comparativo de Vendas</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
      </CardContent>
    </Card>
  )
}

// Gráfico de Área Empilhada - Receita vs Despesas
export const RevenueExpensesStackedAreaChart: React.FC = () => {
  const chartOptions = {
    chart: {
      height: 350,
      type: 'area' as const,
      stacked: true,
      toolbar: {
        show: false
      }
    },
    colors: ['#28a745', '#dc3545', '#ffc107'],
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
        text: 'Valor (R$)',
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
    { name: 'Receita', data: [30000, 35000, 40000, 38000, 42000, 45000] },
    { name: 'Despesas', data: [20000, 22000, 25000, 23000, 26000, 28000] },
    { name: 'Lucro', data: [10000, 13000, 15000, 15000, 16000, 17000] }
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Receita vs Despesas (Empilhado)</Typography>
        <ApexChart options={chartOptions} series={chartSeries} type="area" height={350} />
      </CardContent>
    </Card>
  )
}

// Componente principal com todos os gráficos da versão paga
export const VuexyChartsDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>Dashboard Vuexy - Versão Paga Completa</Typography>
      
      <Grid container spacing={3}>
        {/* Gráficos Básicos */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ mb: 2 }}>Gráficos Básicos</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <StudyHoursDonutChart />
        </Grid>
        <Grid item xs={12} md={8}>
          <CoursesHorizontalBarChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <ProgressRadialChart />
        </Grid>
        <Grid item xs={12} md={8}>
          <PerformanceLineChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <MonthlySalesAreaChart />
        </Grid>

        {/* Gráficos Avançados */}
        <Grid item xs={12} sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Gráficos Avançados</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <SalesPieChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <StackedBarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <PerformanceRadarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <CustomerSatisfactionGauge />
        </Grid>
        <Grid item xs={12} md={8}>
          <ActivityHeatmapChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <SalesTreemapChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <RegionalSalesHorizontalChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <ComparativeLineChart />
        </Grid>
        <Grid item xs={12}>
          <RevenueExpensesStackedAreaChart />
        </Grid>
      </Grid>
    </Box>
  )
}
