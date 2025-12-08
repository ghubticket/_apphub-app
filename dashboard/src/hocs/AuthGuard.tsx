// Third-party Imports
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'

// Lib Imports
import { authOptions } from '@/libs/auth'

// Type Imports
import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@core/types'

// Component Imports
import AuthRedirect from '@/components/AuthRedirect'

export default async function AuthGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const session = (await getServerSession(authOptions)) as Session | null

  // ** CRITICAL SECURITY: Verificar se usuário está autenticado
  if (!session || !session.user) {
    return <AuthRedirect lang={locale} />
  }

  // ** CRITICAL SECURITY: Apenas usuários ADMIN podem acessar o dashboard
  const userRole = session.user.role
  if (userRole !== 'ADMIN') {
    // Redirecionar para página de não autorizado ou login
    return <AuthRedirect lang={locale} />
  }

  return <>{children}</>
}
