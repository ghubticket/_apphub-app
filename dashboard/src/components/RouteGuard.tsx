'use client'

import React from 'react'
import { useRoutePermissions } from '@/hooks/useRoutePermissions'
import { Alert, AlertTitle, Typography, Box } from '@mui/material'

interface RouteGuardProps {
    children: React.ReactNode
    requiredRole?: string
    fallbackRoute?: string
    fallbackComponent?: React.ReactNode
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
    children,
    requiredRole,
    fallbackRoute = '/dashboards/crm',
    fallbackComponent
}) => {
    const { canAccessCurrentRoute, userRole, status } = useRoutePermissions()

    if (status === 'loading') {
        return (
            <Box className="flex items-center justify-center min-h-[400px]">
                <Typography>Verificando permissões...</Typography>
            </Box>
        )
    }

    if (status === 'unauthenticated') {
        return (
            <Alert severity="error" className="m-4">
                <AlertTitle>Acesso Negado</AlertTitle>
                <Typography variant="body2">
                    Você precisa estar logado para acessar esta página.
                </Typography>
            </Alert>
        )
    }

    // Verificar role específico se fornecido
    if (requiredRole && userRole !== requiredRole) {
        return fallbackComponent || (
            <Alert severity="error" className="m-4">
                <AlertTitle>Acesso Restrito</AlertTitle>
                <Typography variant="body2">
                    Esta página é restrita para usuários com role: <strong>{requiredRole}</strong>.
                    Sua role atual é: <strong>{userRole}</strong>.
                </Typography>
            </Alert>
        )
    }

    // Verificar se pode acessar a rota atual
    if (!canAccessCurrentRoute()) {
        return fallbackComponent || (
            <Alert severity="error" className="m-4">
                <AlertTitle>Acesso Negado</AlertTitle>
                <Typography variant="body2">
                    Você não tem permissão para acessar esta página.
                    Sua role atual é: <strong>{userRole}</strong>.
                </Typography>
            </Alert>
        )
    }

    return <>{children}</>
}
