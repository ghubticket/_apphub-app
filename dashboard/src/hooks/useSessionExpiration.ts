'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

// Evento customizado para quando o token expira em uma requisição
export const TOKEN_EXPIRED_EVENT = 'token-expired'

// Tempo de expiração: 1 hora (3600 segundos)
const SESSION_DURATION_MS = 60 * 60 * 1000 // 1 hora em milissegundos
// Tempo antes de expirar para mostrar o modal: 5 minutos
const WARNING_TIME_MS = 5 * 60 * 1000 // 5 minutos em milissegundos
// Tempo do timer do modal: 2 minutos
const MODAL_TIMER_MS = 2 * 60 * 1000 // 2 minutos em milissegundos

interface UseSessionExpirationReturn {
    showModal: boolean
    timeRemaining: number
    extendSession: () => Promise<void>
    logout: () => Promise<void>
}

export function useSessionExpiration(): UseSessionExpirationReturn {
    const { data: session, update } = useSession()
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(MODAL_TIMER_MS)
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)

    // Inicializar tempo de sessão quando a sessão for carregada
    useEffect(() => {
        if (session?.user && !sessionStartTime) {
            // Usar o tempo atual como início da sessão
            setSessionStartTime(Date.now())
        }
    }, [session, sessionStartTime])

    // Listener para eventos de token expirado de requisições
    useEffect(() => {
        const handleTokenExpired = () => {
            if (!showModal) {
                setShowModal(true)
                setTimeRemaining(MODAL_TIMER_MS)
            }
        }

        window.addEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired)
        return () => window.removeEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired)
    }, [showModal])

    // Verificar expiração e mostrar modal
    useEffect(() => {
        if (!session?.user || !sessionStartTime) return

        const checkExpiration = () => {
            const now = Date.now()
            const elapsed = now - sessionStartTime
            const timeUntilExpiration = SESSION_DURATION_MS - elapsed
            const timeUntilWarning = timeUntilExpiration - WARNING_TIME_MS

            // Se passou o tempo de aviso, mostrar modal
            if (timeUntilWarning <= 0 && !showModal) {
                setShowModal(true)
                setTimeRemaining(MODAL_TIMER_MS)
            }

            // Se expirou completamente, fazer logout
            if (timeUntilExpiration <= 0) {
                setShowModal(false)
                signOut({ redirect: true, callbackUrl: '/login' })
            }
        }

        // Verificar a cada 10 segundos
        const interval = setInterval(checkExpiration, 10000)
        checkExpiration() // Verificar imediatamente

        return () => clearInterval(interval)
    }, [session, sessionStartTime, showModal])

    const handleLogout = useCallback(async () => {
        setShowModal(false)
        await signOut({ redirect: true, callbackUrl: '/login' })
    }, [])

    // Timer do modal (countdown)
    useEffect(() => {
        if (!showModal) return

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1000) {
                    // Tempo esgotou, fazer logout
                    handleLogout()
                    return 0
                }
                return prev - 1000
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [showModal, handleLogout])

    const extendSession = useCallback(async () => {
        try {
            // Fechar o modal primeiro
            setShowModal(false)
            
            // Tentar renovar o token chamando update() que vai trigger o jwt callback
            // O jwt callback vai chamar o endpoint /auth/refresh para renovar o token
            await update()
            
            // Resetar o tempo de início da sessão para o tempo atual
            // Isso efetivamente "renova" a sessão do ponto de vista do cliente
            setSessionStartTime(Date.now())
            
            // Resetar o timer do modal para evitar que ele continue contando
            setTimeRemaining(MODAL_TIMER_MS)
            
        } catch (error) {
            console.error('Erro ao renovar sessão:', error)
            // Se falhar, fazer logout
            await handleLogout()
        }
    }, [update, handleLogout])

    const logout = useCallback(async () => {
        await handleLogout()
    }, [handleLogout])

    return {
        showModal,
        timeRemaining,
        extendSession,
        logout
    }
}

