import { useEffect } from 'react'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { useUserRole } from './useUserRole'
import { canAccessRoute, getAllowedRoutes } from '@/configs/routePermissions'

export const useRoutePermissions = () => {
  const { userRole } = useUserRole()
  const { status } = useSession()
  const router = useRouter()

  // Verificar se pode acessar uma rota específica
  const canAccess = (route: string): boolean => {
    if (status === 'loading' || !userRole) return false
    
return canAccessRoute(route, userRole)
  }

  // Verificar se pode acessar a rota atual
  const canAccessCurrentRoute = (): boolean => {
    if (typeof window === 'undefined') return true
    const currentPath = window.location.pathname

    
return canAccess(currentPath)
  }

  // Redirecionar se não tiver permissão
  const useRedirectIfUnauthorized = (fallbackRoute: string = '/dashboards/crm') => {
    useEffect(() => {
      if (status === 'authenticated' && userRole && !canAccessCurrentRoute()) {
        router.push(fallbackRoute)
      }
    }, [fallbackRoute])
  }

  // Obter todas as rotas permitidas para o usuário atual
  const getAllowedRoutesForUser = (): string[] => {
    if (!userRole) return []
    
return getAllowedRoutes(userRole)
  }

  return {
    canAccess,
    canAccessCurrentRoute,
    useRedirectIfUnauthorized,
    getAllowedRoutesForUser,
    userRole,
    status
  }
}
