'use client'

// MUI Imports
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'

// Component Import
import CustomAvatar from '@core/components/mui/Avatar'

interface InfoCardProps {
  title: string
  subtitle?: string
  icon: string
  iconColor?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  children?: React.ReactNode
}

const InfoCard = (props: InfoCardProps) => {
  const { 
    title, 
    subtitle, 
    icon, 
    iconColor = 'primary',
    children 
  } = props

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CustomAvatar 
            variant='rounded' 
            skin='light' 
            size={40} 
            color={iconColor}
            sx={{ mr: 2 }}
          >
            <i className={icon} />
          </CustomAvatar>
          <Box>
            <Typography variant='h6'>{title}</Typography>
            {subtitle && (
              <Typography variant='body2' color='text.secondary'>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {children}
      </CardContent>
    </Card>
  )
}

export default InfoCard
