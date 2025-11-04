'use client'

import Grid from '@mui/material/Grid2'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { useEvents } from '@/hooks/useEvents'

const EventListCards = () => {
  const { events, loading, pagination } = useEvents({ limit: 100 })
  const totalEvents = pagination?.total ?? events.length

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ height: '120px' }}>
          <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', p: 3 }}>
            <Box className='flex items-center gap-4 w-full'>
              <Box
                className='w-16 h-16 rounded-lg flex items-center justify-center'
                sx={{ backgroundColor: 'primary.lightOpacity', color: 'primary.main' }}
              >
                <i className='tabler-calendar-event text-2xl' />
              </Box>
              <Box className='flex-1'>
                <Typography variant='h6' color='text.primary' className='font-medium mb-2'>
                  Total Events
                </Typography>
                <Typography variant='h3' color='text.primary' className='font-bold'>
                  {loading ? '...' : totalEvents.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default EventListCards


