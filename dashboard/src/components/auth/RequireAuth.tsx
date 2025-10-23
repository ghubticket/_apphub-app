'use client'

import React from 'react'
import ProtectedRoute from './ProtectedRoute'
import { UserRole } from '@/types/userTypes'

interface RequireAuthProps {
    children: React.ReactNode
    role?: UserRole
    permission?: string
}

/**
 * Componente wrapper simples para páginas que precisam de autenticação
 * Uso: <RequireAuth role="ADMIN"><MinhaPagina /></RequireAuth>
 */
const RequireAuth: React.FC<RequireAuthProps> = ({
    children,
    role,
    permission
}) => {
    return (
        <ProtectedRoute
            requiredRole={role}
            requiredPermission={permission}
        >
            {children}
        </ProtectedRoute>
    )
}

export default RequireAuth
