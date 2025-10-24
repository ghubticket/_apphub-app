// User Types for AppHub Dashboard
export type UserRole = 'ADMIN' | 'CLIENTE' | 'QRCODE'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
  expiresIn: number
}

export interface RolePermissions {
  canViewDashboard: boolean
  canManageEvents: boolean
  canManageTickets: boolean
  canManageUsers: boolean
  canViewReports: boolean
  canReadQRCodes: boolean
  canAccessFrontend: boolean
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canViewDashboard: true,
    canManageEvents: true,
    canManageTickets: true,
    canManageUsers: true,
    canViewReports: true,
    canReadQRCodes: true,
    canAccessFrontend: true
  },
  CLIENTE: {
    canViewDashboard: false,
    canManageEvents: false,
    canManageTickets: false,
    canManageUsers: false,
    canViewReports: false,
    canReadQRCodes: false,
    canAccessFrontend: true
  },
  QRCODE: {
    canViewDashboard: false,
    canManageEvents: false,
    canManageTickets: false,
    canManageUsers: false,
    canViewReports: false,
    canReadQRCodes: true,
    canAccessFrontend: false
  }
}
