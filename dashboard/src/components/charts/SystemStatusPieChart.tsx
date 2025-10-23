'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Grid, IconButton } from '@mui/material'
import { MoreVert } from '@mui/icons-material'
import ApexChart from './ApexChart'

interface SystemStatusPieChartProps {
  data: {
    online: number
    offline: number
    warning: number
  }
  title?: string
  subtitle?: string
}

const SystemStatusPieChart: React.FC<SystemStatusPieChartProps> = ({
  data,
  title = "Reasons for delivery exceptions",
  subtitle = "Distribuição em tempo real"
}) => {
  const total = data.online + data.offline + data.warning
  const operationalPercentage = total > 0 ? Math.round((data.online / total) * 100) : 0
  
  const chartOptions = {
    chart: {
      type: 'donut' as const,
      height: 350,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    labels: ['Online', 'Offline', 'Warning'],
    colors: ['#28a745', '#dc3545', '#ffc107'],
    dataLabels: {
      enabled: false
    },
    legend: {
      show: false // Desabilitar legenda do ApexCharts
    },
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: 'light',
      style: {
        fontSize: '14px',
        fontFamily: 'Helvetica, Arial, sans-serif'
      },
      y: {
        formatter: function (val: number) {
          return val + " APIs"
        }
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: false
            },
            value: {
              show: false
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Operational',
              fontSize: '14px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 400,
              color: '#333',
              offsetY: 20,
              formatter: function (w: any) {
                return operationalPercentage + "%"
              }
            }
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          }
        }
      }
    ]
  }

  const chartSeries = [data.online, data.offline, data.warning]

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
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
          height={350}
        />

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#28a745',
                  borderRadius: '50%',
                  mx: 'auto',
                  mb: 1
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Online
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {data.online}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  mx: 'auto',
                  mb: 1
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Offline
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {data.offline}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#ffc107',
                  borderRadius: '50%',
                  mx: 'auto',
                  mb: 1
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Warning
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {data.warning}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default SystemStatusPieChart
