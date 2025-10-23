'use client'

// MUI Imports
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'

// Third-party Imports
import classnames from 'classnames'

// Component Import
import CustomAvatar from '@core/components/mui/Avatar'

interface StatsCardProps {
  title: string
  subtitle: string
  stats: string
  avatarIcon: string
  avatarSize?: number
  avatarSkin?: 'filled' | 'light'
  avatarColor?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  chipText?: string
  chipColor?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  chipVariant?: 'filled' | 'outlined' | 'tonal'
}

const StatsCard = (props: StatsCardProps) => {
  // Props
  const { 
    stats, 
    title, 
    subtitle, 
    avatarIcon, 
    avatarColor = 'primary', 
    avatarSize = 44, 
    avatarSkin = 'light',
    chipText,
    chipColor = 'success',
    chipVariant = 'tonal'
  } = props

  return (
    <Card>
      <CardContent className='flex flex-col gap-y-3 items-start'>
        <CustomAvatar variant='rounded' skin={avatarSkin} size={avatarSize} color={avatarColor}>
          <i className={classnames(avatarIcon, 'text-[28px]')} />
        </CustomAvatar>
        <div className='flex flex-col gap-y-1'>
          <Typography variant='h5'>{title}</Typography>
          <Typography color='text.disabled'>{subtitle}</Typography>
          <Typography color='text.primary' variant='h4'>{stats}</Typography>
        </div>
        {chipText && (
          <Chip label={chipText} color={chipColor} variant={chipVariant} size='small' />
        )}
      </CardContent>
    </Card>
  )
}

export default StatsCard
