'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Configuração de proteção de rotas
const ROUTE_PROTECTION = {
  // Rotas que precisam de autenticação (qualquer usuário logado)
  authenticated: [
    '/dashboard',
    '/admin',
    '/usuarios', 
    '/configuracoes',
    '/qr-reader'
  ],
  
  // Rotas que só ADMIN pode acessar
  adminOnly: [
    '/admin',
    '/usuarios',
    '/configuracoes'
  ],
  
  // Rotas que só TURMA pode acessar
  turmaOnly: [
    '/qr-reader'
  ],
  
  // Rotas públicas (não precisam de autenticação)
  public: [
    '/',
    '/login',
    '/about',
    '/home'
  ]
}

/**
 * Hook para proteção automática de rotas
 * Usa o pathname atual para verificar permissões
 */
export const useRouteProtection = (pathname: string) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Aguardar carregamento da autenticação
    if (isLoading) return

    // Verificar se é rota pública
    if (ROUTE_PROTECTION.public.includes(pathname)) {
      return // Permitir acesso
    }

    // Verificar se está autenticado
    if (!isAuthenticated) {
      console.log('🔒 Usuário não autenticado, redirecionando para login')
      router.push('/login')
      return
    }

    // Verificar permissões por role
    if (ROUTE_PROTECTION.adminOnly.includes(pathname) && user?.role !== 'ADMIN') {
      console.log('🚫 Acesso negado: apenas ADMIN pode acessar', pathname)
      router.push('/unauthorized')
      return
    }

    if (ROUTE_PROTECTION.turmaOnly.includes(pathname) && user?.role !== 'TURMA') {
      console.log('🚫 Acesso negado: apenas TURMA pode acessar', pathname)
      router.push('/unauthorized')
      return
    }

    console.log('✅ Acesso permitido para', pathname)
  }, [pathname, isAuthenticated, isLoading, user, router])

  return {
    isProtected: ROUTE_PROTECTION.authenticated.includes(pathname),
    isAdminOnly: ROUTE_PROTECTION.adminOnly.includes(pathname),
    isTurmaOnly: ROUTE_PROTECTION.turmaOnly.includes(pathname),
    isPublic: ROUTE_PROTECTION.public.includes(pathname)
  }
}

export default ROUTE_PROTECTION
