import { useState, useEffect, useCallback } from 'react'

import { useRouter } from 'next/navigation'

import { signOut } from 'next-auth/react'

interface SessionTimeoutConfig {
  warningTime: number // Tempo para mostrar aviso (em ms)
  maxInactiveTime: number // Tempo máximo de inatividade (em ms)
  refreshInterval: number // Intervalo para verificar inatividade (em ms)
}

const SESSION_CONFIG: SessionTimeoutConfig = {
  warningTime: 4 * 60 * 1000, // 4 minutos - aviso
  maxInactiveTime: 5 * 60 * 1000, // 5 minutos - logout
  refreshInterval: 30 * 1000, // 30 segundos - verificação
}

export const useSessionTimeout = () => {
  const [isWarning, setIsWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const router = useRouter()

  // Atualizar atividade do usuário
  const updateActivity = useCallback(() => {
    setIsActive(true)
    setIsWarning(false)
    setTimeLeft(0)
    
    // Salvar timestamp da última atividade
    localStorage.setItem('lastActivity', Date.now().toString())
  }, [])

  // Verificar inatividade
  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('lastActivity')

    if (!lastActivity) {
      updateActivity()
      
return
    }

    const now = Date.now()
    const timeSinceActivity = now - parseInt(lastActivity)
    
    // Se passou do tempo máximo, fazer logout
    if (timeSinceActivity >= SESSION_CONFIG.maxInactiveTime) {
      handleLogout()
      
return
    }

    // Se está próximo do timeout, mostrar aviso
    if (timeSinceActivity >= SESSION_CONFIG.warningTime) {
      setIsWarning(true)
      const remainingTime = SESSION_CONFIG.maxInactiveTime - timeSinceActivity

      setTimeLeft(Math.ceil(remainingTime / 1000))
    } else {
      setIsWarning(false)
      setTimeLeft(0)
    }
  }, [updateActivity])

  // Fazer logout
  const handleLogout = useCallback(async () => {
    try {
      // Limpar dados locais
      localStorage.removeItem('lastActivity')
      localStorage.removeItem('loginRateLimit')
      
      // Fazer logout do NextAuth
      await signOut({ 
        redirect: false,
        callbackUrl: '/login'
      })
      
      // Redirect para login
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)

      // Forçar redirect mesmo com erro
      router.push('/login')
    }
  }, [router])

  // Estender sessão (quando usuário clica em "Continuar")
  const extendSession = useCallback(() => {
    updateActivity()
  }, [updateActivity])

  // Configurar listeners de atividade
  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    const handleActivity = () => {
      updateActivity()
    }

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [updateActivity])

  // Verificar inatividade periodicamente
  useEffect(() => {
    const interval = setInterval(checkInactivity, SESSION_CONFIG.refreshInterval)
    
    // Verificar imediatamente
    checkInactivity()

    return () => clearInterval(interval)
  }, [checkInactivity])

  // Formatar tempo restante
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    
return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return {
    isWarning,
    timeLeft,
    isActive,
    extendSession,
    formatTime,
    handleLogout
  }
}
