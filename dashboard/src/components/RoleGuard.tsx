'use client'

import type { ReactNode } from 'react'

import { useUserRole } from '@/hooks/useUserRole'
import type { UserRole } from '@/types/roles'

interface RoleGuardProps {
  children: ReactNode
  roles?: UserRole[]
  permissions?: string[]
  fallback?: ReactNode
  requireAll?: boolean
}

export const RoleGuard = ({ 
  children, 
  roles = [], 
  permissions = [], 
  fallback = null,
  requireAll = false 
}: RoleGuardProps) => {
  const { userRole, hasPermission, canAccess, isAuthenticated } = useUserRole()

  // Se não está autenticado, não mostra nada
  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  // Verificar roles
  if (roles.length > 0) {
    const hasRequiredRole = requireAll 
      ? roles.every(role => userRole === role)
      : roles.includes(userRole as UserRole)
    
    if (!hasRequiredRole) {
      return <>{fallback}</>
    }
  }

  // Verificar permissões
  if (permissions.length > 0) {
    const hasRequiredPermission = requireAll
      ? permissions.every(permission => canAccess(permission))
      : permissions.some(permission => canAccess(permission))
    
    if (!hasRequiredPermission) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// Componente para mostrar conteúdo apenas para ADMIN
export const AdminOnly = ({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) => (
  <RoleGuard roles={['ADMIN']} fallback={fallback}>
    {children}
  </RoleGuard>
)

// Componente para mostrar conteúdo apenas para QRCODE
export const QRCodeOnly = ({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) => (
  <RoleGuard roles={['QRCODE']} fallback={fallback}>
    {children}
  </RoleGuard>
)

// Componente para mostrar conteúdo para ADMIN e QRCODE
export const AdminOrQRCode = ({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) => (
  <RoleGuard roles={['ADMIN', 'QRCODE']} fallback={fallback}>
    {children}
  </RoleGuard>
)
