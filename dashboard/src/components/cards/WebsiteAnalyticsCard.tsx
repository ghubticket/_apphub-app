'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Grid } from '@mui/material'
import SwiperCard from '../swiper/SwiperCard'

interface AnalyticsData {
  title: string
  subtitle: string
  metrics: {
    label: string
    value: string
  }[]
}

interface WebsiteAnalyticsCardProps {
  data: AnalyticsData[]
  className?: string
}

const WebsiteAnalyticsCard: React.FC<WebsiteAnalyticsCardProps> = ({
  data,
  className = ''
}) => {
  return (
    <Card className={`swiper-card-advance-bg ${className}`} sx={{ height: '100%' }}>
      <CardContent>
        <SwiperCard>
          {data.map((slide, index) => (
            <Box key={index} sx={{ p: 2 }}>
              <Typography variant="h5" sx={{ color: 'white', mb: 1 }}>
                {slide.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'white', mb: 3 }}>
                {slide.subtitle}
              </Typography>
              
              <Grid container spacing={2}>
                {slide.metrics.map((metric, metricIndex) => (
                  <Grid item xs={6} key={metricIndex}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: 'white', 
                          mr: 1, 
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {metric.value}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {metric.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </SwiperCard>
      </CardContent>
    </Card>
  )
}

export default WebsiteAnalyticsCard
