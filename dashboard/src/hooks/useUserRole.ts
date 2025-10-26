import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { UserRole, ROLE_CONFIGS, User } from '@/types/roles'

export const useUserRole = () => {
  const { data: session, status } = useSession()

  const user = useMemo(() => {
    if (!session?.user) return null
    return session.user as User
  }, [session])

  const userRole = useMemo(() => {
    return user?.role || null
  }, [user])

  const roleConfig = useMemo(() => {
    if (!userRole) return null
    return ROLE_CONFIGS[userRole]
  }, [userRole])

  const hasPermission = (resource: string, action: string) => {
    if (!roleConfig) return false
    
    const permission = roleConfig.permissions.find(p => p.resource === resource)
    if (!permission) return false
    
    return permission.actions.includes(action)
  }

  const hasRole = (role: UserRole) => {
    return userRole === role
  }

  const isAdmin = () => {
    return hasRole('ADMIN')
  }

  const isQRCode = () => {
    return hasRole('QRCODE')
  }

  const isClient = () => {
    return hasRole('CLIENTE')
  }

  const canAccess = (permission: string) => {
    if (!roleConfig) return false
    
    // Verificar se tem permissão específica
    const hasSpecificPermission = roleConfig.permissions.some(p => 
      p.actions.includes(permission)
    )
    
    if (hasSpecificPermission) return true
    
    // Verificar se é admin (tem acesso a tudo)
    return isAdmin()
  }

  return {
    user,
    userRole,
    roleConfig,
    hasPermission,
    hasRole,
    isAdmin,
    isQRCode,
    isClient,
    canAccess,
    isLoading: status === 'loading',
    isAuthenticated: !!user
  }
}
