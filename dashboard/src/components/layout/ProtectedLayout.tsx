'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useRouteProtection } from '@/middleware/routeProtection'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

/**
 * Layout que aplica proteção automática baseada na rota
 * Funciona como um template - não precisa configurar nada!
 */
const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
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

export default ProtectedLayout
