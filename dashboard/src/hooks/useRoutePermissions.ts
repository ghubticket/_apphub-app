import { useUserRole } from './useUserRole'
import { canAccessRoute, getAllowedRoutes } from '@/configs/routePermissions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const useRoutePermissions = () => {
  const { userRole, status } = useUserRole()
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
  const redirectIfUnauthorized = (fallbackRoute: string = '/dashboards/crm') => {
    useEffect(() => {
      if (status === 'authenticated' && userRole && !canAccessCurrentRoute()) {
        router.push(fallbackRoute)
      }
    }, [status, userRole, router, fallbackRoute])
  }

  // Obter todas as rotas permitidas para o usuário atual
  const getAllowedRoutesForUser = (): string[] => {
    if (!userRole) return []
    return getAllowedRoutes(userRole)
  }

  return {
    canAccess,
    canAccessCurrentRoute,
    redirectIfUnauthorized,
    getAllowedRoutesForUser,
    userRole,
    status
  }
}
