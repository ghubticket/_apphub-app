import { useState, useEffect, useCallback } from 'react'

interface RateLimitState {
  attempts: number
  isLocked: boolean
  remainingTime: number
  maxAttempts: number
  lockoutDuration: number
  lastError: string | null
  apiErrors: string[]
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 100, // Máximo 100 tentativas (desenvolvimento)
  lockoutDuration: 15 * 60 * 1000, // 15 minutos em millisegundos
  warningThreshold: 50, // Aviso após 50 tentativas
}

export const useRateLimit = () => {
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    isLocked: false,
    remainingTime: 0,
    maxAttempts: RATE_LIMIT_CONFIG.maxAttempts,
    lockoutDuration: RATE_LIMIT_CONFIG.lockoutDuration,
    lastError: null,
    apiErrors: [],
  })

  // Carregar estado do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('loginRateLimit')

    if (saved) {
      const parsed = JSON.parse(saved)
      const now = Date.now()
      
      if (parsed.lockoutEnd && now < parsed.lockoutEnd) {
        // Ainda em lockout
        setState(prev => ({
          ...prev,
          attempts: parsed.attempts,
          isLocked: true,
          remainingTime: Math.ceil((parsed.lockoutEnd - now) / 1000)
        }))
      } else if (parsed.attempts > 0) {
        // Reset após lockout expirado
        localStorage.removeItem('loginRateLimit')
        setState(prev => ({
          ...prev,
          attempts: 0,
          isLocked: false,
          remainingTime: 0
        }))
      }
    }
  }, [])

  // Timer para countdown
  useEffect(() => {
    if (state.isLocked && state.remainingTime > 0) {
      const timer = setInterval(() => {
        setState(prev => {
          if (prev.remainingTime <= 1) {
            // Lockout expirado
            localStorage.removeItem('loginRateLimit')
            
return {
              ...prev,
              isLocked: false,
              attempts: 0,
              remainingTime: 0
            }
          }

          
return {
            ...prev,
            remainingTime: prev.remainingTime - 1
          }
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [state.isLocked, state.remainingTime])

  const recordAttempt = useCallback((success: boolean, error?: string) => {
    if (success) {
      // Login bem-sucedido - reset
      localStorage.removeItem('loginRateLimit')
      setState(prev => ({
        ...prev,
        attempts: 0,
        isLocked: false,
        remainingTime: 0,
        lastError: null,
        apiErrors: []
      }))
      
return
    }

    // Login falhou - incrementar tentativas
    setState(prev => {
      const newAttempts = prev.attempts + 1
      const shouldLock = newAttempts >= RATE_LIMIT_CONFIG.maxAttempts
      
      const newApiErrors = error ? [...prev.apiErrors, error] : prev.apiErrors
      
      const newState = {
        ...prev,
        attempts: newAttempts,
        isLocked: shouldLock,
        remainingTime: shouldLock ? RATE_LIMIT_CONFIG.lockoutDuration / 1000 : 0,
        lastError: error || null,
        apiErrors: newApiErrors
      }

      // Salvar no localStorage
      if (shouldLock) {
        localStorage.setItem('loginRateLimit', JSON.stringify({
          attempts: newAttempts,
          lockoutEnd: Date.now() + RATE_LIMIT_CONFIG.lockoutDuration,
          lastError: error,
          apiErrors: newApiErrors
        }))
      } else {
        localStorage.setItem('loginRateLimit', JSON.stringify({
          attempts: newAttempts,
          lockoutEnd: null,
          lastError: error,
          apiErrors: newApiErrors
        }))
      }

      return newState
    })
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem('loginRateLimit')
    setState(prev => ({
      ...prev,
      attempts: 0,
      isLocked: false,
      remainingTime: 0
    }))
  }, [])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    
return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return {
    ...state,
    recordAttempt,
    reset,
    formatTime,
    isWarning: state.attempts >= RATE_LIMIT_CONFIG.warningThreshold && !state.isLocked,
    canAttempt: !state.isLocked && state.attempts < RATE_LIMIT_CONFIG.maxAttempts,
    showAlert: state.attempts > 0 // Mostrar alerta se houver tentativas
  }
}
