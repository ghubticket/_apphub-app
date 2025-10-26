// Tipos para sistema de roles
export type UserRole = 'ADMIN' | 'QRCODE' | 'CLIENTE'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  lastLogin?: Date
}

export interface Permission {
  resource: string
  actions: string[]
}

export interface RoleConfig {
  role: UserRole
  label: string
  description: string
  permissions: Permission[]
  menuItems: MenuItem[]
  color: string
  icon: string
}

export interface MenuItem {
  id: string
  label: string
  icon: string
  href?: string
  children?: MenuItem[]
  permission?: string
  badge?: {
    text: string
    color: 'error' | 'warning' | 'info' | 'success'
  }
}

// Configuração de roles
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrador',
    description: 'Acesso total ao sistema',
    color: 'error',
    icon: 'tabler-crown',
    permissions: [
      { resource: 'users', actions: ['read', 'write', 'create', 'delete'] },
      { resource: 'dashboard', actions: ['read', 'write'] },
      { resource: 'reports', actions: ['read', 'write', 'create'] },
      { resource: 'settings', actions: ['read', 'write'] },
      { resource: 'qr-codes', actions: ['read', 'write', 'create', 'delete'] }
    ],
    menuItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'tabler-smart-home',
        href: '/dashboards/crm'
      },
      {
        id: 'users',
        label: 'Usuários',
        icon: 'tabler-users',
        href: '/apps/user/list'
      },
      {
        id: 'qr-codes',
        label: 'QR Codes',
        icon: 'tabler-qrcode',
        href: '/apps/qr-codes'
      },
      {
        id: 'reports',
        label: 'Relatórios',
        icon: 'tabler-chart-bar',
        href: '/apps/reports'
      },
      {
        id: 'settings',
        label: 'Configurações',
        icon: 'tabler-settings',
        href: '/pages/account-settings'
      }
    ]
  },
  QRCODE: {
    role: 'QRCODE',
    label: 'Validador QR',
    description: 'Acesso para validação de QR codes',
    color: 'info',
    icon: 'tabler-qrcode',
    permissions: [
      { resource: 'qr-codes', actions: ['read', 'write'] },
      { resource: 'dashboard', actions: ['read'] }
    ],
    menuItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'tabler-smart-home',
        href: '/dashboards/crm'
      },
      {
        id: 'qr-scanner',
        label: 'Scanner QR',
        icon: 'tabler-qrcode',
        href: '/apps/qr-scanner'
      },
      {
        id: 'validations',
        label: 'Validações',
        icon: 'tabler-check',
        href: '/apps/validations'
      }
    ]
  },
  CLIENTE: {
    role: 'CLIENTE',
    label: 'Cliente',
    description: 'Acesso limitado',
    color: 'success',
    icon: 'tabler-user',
    permissions: [
      { resource: 'profile', actions: ['read', 'write'] }
    ],
    menuItems: [
      {
        id: 'profile',
        label: 'Perfil',
        icon: 'tabler-user',
        href: '/pages/account-settings'
      }
    ]
  }
}
