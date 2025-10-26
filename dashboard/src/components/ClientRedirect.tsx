import React, { useEffect } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useRouter } from 'next/navigation'
import { Box, Typography, Alert, AlertTitle } from '@mui/material'

interface ClientRedirectProps {
  frontendUrl?: string
}

export const ClientRedirect: React.FC<ClientRedirectProps> = ({ 
  frontendUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3002' 
}) => {
  const { userRole, isAuthenticated } = useUserRole()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && userRole === 'CLIENTE') {
      // Redirecionar para o front-end do cliente
      window.location.href = frontendUrl
    }
  }, [isAuthenticated, userRole, frontendUrl])

  if (!isAuthenticated) {
    return (
      <Box className="flex items-center justify-center min-h-[400px]">
        <Typography>Verificando permissões...</Typography>
      </Box>
    )
  }

  if (userRole === 'CLIENTE') {
    return (
      <Box className="flex items-center justify-center min-h-[400px]">
        <Alert severity="info" className="max-w-md">
          <AlertTitle>Redirecionando...</AlertTitle>
          <Typography variant="body2">
            Você será redirecionado para a área do cliente em alguns segundos.
          </Typography>
        </Alert>
      </Box>
    )
  }

  return null
}
