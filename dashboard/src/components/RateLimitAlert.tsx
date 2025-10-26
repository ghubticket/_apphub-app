'use client'

import { Alert, AlertTitle } from '@mui/material'

interface RateLimitAlertProps {
    attempts: number
    maxAttempts: number
    isLocked: boolean
    remainingTime: number
    isWarning: boolean
    formatTime: (seconds: number) => string
    lastError?: string | null
    apiErrors?: string[]
    showAlert?: boolean
}

export const RateLimitAlert = ({
    attempts,
    maxAttempts,
    isLocked,
    remainingTime,
    isWarning,
    formatTime,
    lastError,
    apiErrors = [],
    showAlert = false
}: RateLimitAlertProps) => {
    // Mostrar alerta se houver tentativas ou se estiver bloqueado
    if (!showAlert && !isWarning && !isLocked) return null

    if (isLocked) {
        return (
            <Alert
                severity="error"
                className="mb-4"
            >
                <AlertTitle>
                    🔒 Conta Temporariamente Bloqueada
                </AlertTitle>
                <div className="mt-2">
                    <p className="text-sm">
                        Muitas tentativas de login falharam. Por segurança, sua conta foi temporariamente bloqueada.
                    </p>
                    {lastError && (
                        <p className="text-sm text-red-600 mt-1">
                            <strong>Último erro:</strong> {lastError}
                        </p>
                    )}
                    <p className="text-sm font-medium mt-1">
                        Tente novamente em: <span className="text-red-600">{formatTime(remainingTime)}</span>
                    </p>
                </div>
            </Alert>
        )
    }

    if (isWarning) {
        return (
            <Alert
                severity="warning"
                className="mb-4"
            >
                <AlertTitle>
                    ⚠️ Muitas Tentativas de Login
                </AlertTitle>
                <div className="mt-2">
                    <p className="text-sm">
                        Você tem <span className="font-medium">{attempts}</span> de <span className="font-medium">{maxAttempts}</span> tentativas restantes.
                    </p>
                    {lastError && (
                        <p className="text-sm text-amber-600 mt-1">
                            <strong>Último erro:</strong> {lastError}
                        </p>
                    )}
                    <p className="text-sm text-amber-600 mt-1">
                        Após {maxAttempts} tentativas falhadas, sua conta será bloqueada por 15 minutos.
                    </p>
                </div>
            </Alert>
        )
    }

    // Mostrar erro mesmo com poucas tentativas
    if (showAlert && lastError && !isLocked) {
        return (
            <Alert
                severity="error"
                className="mb-4"
            >
                <p className="text-sm">
                    Tentativa {attempts} de {maxAttempts}
                </p>
            </Alert>
        )
    }

    return null
}
