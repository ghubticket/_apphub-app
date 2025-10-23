'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/userTypes'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredPermission?: string
  fallbackPath?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/login'
}) => {
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('ProtectedRoute - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user)
    
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login')
        router.push(fallbackPath)
        return
      }

      if (requiredRole && user?.role !== requiredRole) {
        console.log('Role mismatch, redirecting to unauthorized')
        router.push('/unauthorized')
        return
      }

      if (requiredPermission && !hasPermission(requiredPermission as any)) {
        console.log('Permission denied, redirecting to unauthorized')
        router.push('/unauthorized')
        return
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, requiredPermission, router, fallbackPath, hasPermission])

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Verificando permissões...
        </Typography>
      </Box>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          Acesso Negado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Você não tem permissão para acessar esta página.
        </Typography>
      </Box>
    )
  }

  if (requiredPermission && !hasPermission(requiredPermission as any)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          Acesso Negado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Você não tem permissão para acessar esta página.
        </Typography>
      </Box>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
