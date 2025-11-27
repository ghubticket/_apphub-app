'use client'

import React from 'react'

import { Alert, AlertTitle, Typography, Box, Backdrop, CircularProgress } from '@mui/material'

import { useRoutePermissions } from '@/hooks/useRoutePermissions'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRole?: string
  fallbackComponent?: React.ReactNode
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRole,
  fallbackComponent
}) => {
  const { canAccessCurrentRoute, userRole, status } = useRoutePermissions()

  const showOverlay = status === 'loading'

  // Overlay global enquanto verifica permissões/sessão (não empurra layout, apenas cobre)
  if (status !== 'unauthenticated') {
    return (
      <>
        {children}
        <Backdrop
          open={showOverlay}
          sx={{
            color: '#fff',
            zIndex: theme => theme.zIndex.modal + 10,
            backgroundColor: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <Box className='flex flex-col items-center gap-3'>
            <CircularProgress color='inherit' size={40} />
            <Typography variant='body2' className='tracking-[0.2em] uppercase'>
              Verificando permissões...
            </Typography>
          </Box>
        </Backdrop>
      </>
    )
  }

  // Caso não autenticado (já coberto pelo AuthGuard, mas mantemos fallback)
  if (status === 'unauthenticated') {
    return (
      <Alert severity='error' className='m-4'>
        <AlertTitle>Acesso Negado</AlertTitle>
        <Typography variant='body2'>
          Você precisa estar logado para acessar esta página.
        </Typography>
      </Alert>
    )
  }

  // Verificar role específico se fornecido
  if (requiredRole && userRole !== requiredRole) {
    return (
      fallbackComponent || (
        <Alert severity='error' className='m-4'>
          <AlertTitle>Acesso Restrito</AlertTitle>
          <Typography variant='body2'>
            Esta página é restrita para usuários com role: <strong>{requiredRole}</strong>.
            Sua role atual é: <strong>{userRole}</strong>.
          </Typography>
        </Alert>
      )
    )
  }

  // Verificar se pode acessar a rota atual
  if (!canAccessCurrentRoute()) {
    return (
      fallbackComponent || (
        <Alert severity='error' className='m-4'>
          <AlertTitle>Acesso Negado</AlertTitle>
          <Typography variant='body2'>
            Você não tem permissão para acessar esta página.
            Sua role atual é: <strong>{userRole}</strong>.
          </Typography>
        </Alert>
      )
    )
  }

  return <>{children}</>
}
