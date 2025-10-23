'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material'
import { MoreVert } from '@mui/icons-material'

interface ModernStatsCardProps {
  title: string
  subtitle?: string
  value: string | number
  change?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
  }
  icon?: React.ReactNode
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  onMenuClick?: () => void
  children?: React.ReactNode
}

const ModernStatsCard: React.FC<ModernStatsCardProps> = ({
  title,
  subtitle,
  value,
  change,
  icon,
  color = 'primary',
  onMenuClick,
  children
}) => {
  const getChangeColor = () => {
    if (!change) return 'default'
    switch (change.type) {
      case 'positive': return 'success'
      case 'negative': return 'error'
      default: return 'default'
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {onMenuClick && (
            <IconButton size="small" onClick={onMenuClick}>
              <MoreVert />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ mr: 1 }}>
            {value}
          </Typography>
          {change && (
            <Chip
              label={change.value}
              color={getChangeColor()}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {icon && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {icon}
          </Box>
        )}

        {children}
      </CardContent>
    </Card>
  )
}

export default ModernStatsCard
