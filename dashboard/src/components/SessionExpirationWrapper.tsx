'use client'

import SessionExpirationModal from './SessionExpirationModal'
import { useSessionExpiration } from '@/hooks/useSessionExpiration'

export default function SessionExpirationWrapper({ children }: { children: React.ReactNode }) {
    const { showModal, timeRemaining, extendSession, logout } = useSessionExpiration()

    return (
        <>
            {children}
            <SessionExpirationModal
                open={showModal}
                timeRemaining={timeRemaining}
                onExtend={extendSession}
                onLogout={logout}
            />
        </>
    )
}

