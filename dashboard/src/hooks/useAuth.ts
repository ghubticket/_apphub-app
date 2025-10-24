'use client'

import { useAuth as useAuthContext } from '@/contexts/AuthContext'

/**
 * Hook personalizado para facilitar o uso da autenticação
 * Fornece métodos convenientes para verificar autenticação e permissões
 */
export const useAuth = () => {
  const auth = useAuthContext()

  return {
    ...auth,
    // Métodos convenientes
    isAdmin: auth.user?.role === 'ADMIN',
    isCliente: auth.user?.role === 'CLIENTE',
    isQRCode: auth.user?.role === 'QRCODE',
    canManageUsers: auth.user?.role === 'ADMIN',
    canAccessQR: auth.user?.role === 'QRCODE',

    // Helper para verificar se pode acessar uma rota
    canAccess: (route: string) => {
      switch (route) {
        case '/admin':
        case '/usuarios':
          return auth.user?.role === 'ADMIN'
        case '/qr-reader':
          return auth.user?.role === 'QRCODE'
        default:
          return auth.isAuthenticated
      }
    }
  }
}

export default useAuth
