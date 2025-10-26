import { UserRole } from '@/types/roles'

// Configuração centralizada de permissões de rotas
export const ROUTE_PERMISSIONS = {
  // Rotas públicas (não precisam de autenticação)
  public: [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ],

  // Rotas que qualquer usuário autenticado pode acessar
  authenticated: [
    '/dashboards/crm',
    '/pages/account-settings'
  ],

  // Rotas específicas por role
  roleBased: {
    ADMIN: [
      '/dashboards/crm',
      '/dashboards/analytics', 
      '/dashboards/ecommerce',
      '/apps/user/list',
      '/apps/user/view',
      '/apps/roles',
      '/apps/permissions',
      '/apps/admin-dashboard',
      '/pages/account-settings'
    ],
    QRCODE: [
      '/dashboards/crm',
      '/apps/qr-scanner',
      '/apps/validations',
      '/pages/account-settings'
    ],
    CLIENTE: [
      // CLIENTE não acessa dashboard admin - apenas front-end do cliente
    ]
  },

  // Rotas bloqueadas por role
  blocked: {
    ADMIN: [],
    QRCODE: [],
    CLIENTE: [
      '/dashboards',
      '/apps',
      '/admin',
      '/pages',
      '/forms',
      '/tables',
      '/charts',
      '/misc'
    ]
  }
}

// Função para verificar se uma rota é permitida para um role
export const canAccessRoute = (route: string, userRole: UserRole): boolean => {
  // Rotas públicas sempre permitidas
  if (ROUTE_PERMISSIONS.public.includes(route)) {
    return true
  }

  // Verificar se está nas rotas bloqueadas
  const blockedRoutes = ROUTE_PERMISSIONS.blocked[userRole] || []
  if (blockedRoutes.some(blockedRoute => route.startsWith(blockedRoute))) {
    return false
  }

  // Verificar se está nas rotas específicas do role
  const roleRoutes = ROUTE_PERMISSIONS.roleBased[userRole] || []
  return roleRoutes.some(allowedRoute => route.startsWith(allowedRoute))
}

// Função para obter todas as rotas permitidas para um role
export const getAllowedRoutes = (userRole: UserRole): string[] => {
  const publicRoutes = ROUTE_PERMISSIONS.public
  const roleRoutes = ROUTE_PERMISSIONS.roleBased[userRole] || []
  const authenticatedRoutes = ROUTE_PERMISSIONS.authenticated

  return [...publicRoutes, ...authenticatedRoutes, ...roleRoutes]
}
