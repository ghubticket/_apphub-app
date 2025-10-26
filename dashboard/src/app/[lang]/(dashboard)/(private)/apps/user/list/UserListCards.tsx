'use client'

import React from 'react'
import { Card, CardContent, Typography, Box, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useUsers } from '@/hooks/useUsers'

const UserListCards = () => {
  const { users, loading } = useUsers({ limit: 100 }) // Buscar todos para estatísticas

  if (loading) {
    return (
      <Grid container spacing={6}>
        {[1, 2, 3, 4].map((item) => (
          <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Box className='flex items-center gap-4'>
                  <Box className='w-12 h-12 bg-gray-200 rounded-lg animate-pulse' />
                  <Box>
                    <Typography variant='h6' className='animate-pulse'>Carregando...</Typography>
                    <Typography variant='body2' color='text.secondary'>Aguarde...</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  // Calcular estatísticas
  const totalUsers = users?.length || 0
  const activeUsers = users?.filter(user => user.isActive).length || 0
  const inactiveUsers = users?.filter(user => !user.isActive).length || 0
  const adminUsers = users?.filter(user => user.role === 'ADMIN').length || 0

  const cards = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: 'tabler-users',
      color: 'primary'
    },
    {
      title: 'Active Users',
      value: activeUsers,
      icon: 'tabler-user-check',
      color: 'success'
    },
    {
      title: 'Inactive Users',
      value: inactiveUsers,
      icon: 'tabler-user-x',
      color: 'error'
    },
    {
      title: 'Admin Users',
      value: adminUsers,
      icon: 'tabler-crown',
      color: 'warning'
    }
  ]

  return (
    <Grid container spacing={4}>
      {cards.map((card, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '120px' }}>
            <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', p: 3 }}>
              <Box className='flex items-center gap-4 w-full'>
                <Box 
                  className={`w-16 h-16 rounded-lg flex items-center justify-center`}
                  sx={{ 
                    backgroundColor: `${card.color}.lightOpacity`,
                    color: `${card.color}.main`
                  }}
                >
                  <i className={`${card.icon} text-2xl`} />
                </Box>
                <Box className='flex-1'>
                  <Typography variant='h6' color='text.primary' className='font-medium mb-2'>
                    {card.title}
                  </Typography>
                  <Typography variant='h3' color='text.primary' className='font-bold'>
                    {card.value.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default UserListCards