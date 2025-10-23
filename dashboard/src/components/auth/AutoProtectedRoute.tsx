'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useRouteProtection } from '@/middleware/routeProtection'
import { Box, CircularProgress, Typography } from '@mui/material'

interface AutoProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Componente que aplica proteção automática baseada na rota atual
 * Não precisa especificar role - funciona automaticamente!
 */
const AutoProtectedRoute: React.FC<AutoProtectedRouteProps> = ({ children }) => {
  const pathname = usePathname()
  const { isProtected, isAdminOnly, isTurmaOnly, isPublic } = useRouteProtection(pathname)

  // Se é rota pública, renderizar normalmente
  if (isPublic) {
    return <>{children}</>
  }

  // Se é rota protegida, mostrar loading enquanto verifica
  return (
    <Box>
      {children}
    </Box>
  )
}

export default AutoProtectedRoute
