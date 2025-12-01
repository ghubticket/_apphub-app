'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

// Usar a mesma configuração de API que o resto da aplicação
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3443/api';
const WARNING_TIME_MS = 2 * 60 * 1000; // 2 minutos antes de expirar
const CHECK_INTERVAL_MS = 30 * 1000; // Verificar a cada 30 segundos

interface SessionInfo {
  expiresAt: string | null;
  timeRemaining: number;
  timeRemainingSeconds: number;
  isExpired: boolean;
}

export const useSessionExpiration = () => {
  const { accessToken, refreshToken, sessionId, isAuthenticated, logout, updateAccessToken } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const checkSession = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setSessionInfo(null);
      setShowWarning(false);
      return;
    }

    try {
      // A API_URL já inclui /api, então usar apenas /auth/check-session
      const response = await fetch(`${API_URL}/auth/check-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          refreshToken: refreshToken || undefined,
          sessionId: sessionId || undefined,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        // Tentar ler a mensagem de erro do backend
        let errorMessage = 'Erro ao verificar sessão';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Se não conseguir ler JSON, usar mensagem padrão
        }
        // Se for 404, a rota não existe - não é um erro crítico, apenas logar e ignorar
        if (response.status === 404) {
          console.warn(`[useSessionExpiration] Rota não encontrada (404): ${API_URL}/auth/check-session - Esta funcionalidade pode não estar disponível`);
          setSessionInfo(null);
          setShowWarning(false);
          return; // Não fazer logout, apenas ignorar silenciosamente
        }
        
        console.error(`[useSessionExpiration] Erro HTTP ${response.status}:`, errorMessage);
        
        // Se for 401 (não autorizado), assumir que expirou
        if (response.status === 401) {
          setSessionInfo(null);
          setShowWarning(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const info = result.data as SessionInfo;
        setSessionInfo(info);

        // Mostrar aviso se faltar menos de 2 minutos e ainda não mostrou
        if (info.timeRemaining > 0 && info.timeRemaining <= WARNING_TIME_MS && !warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }

        // Se expirou, fazer logout
        if (info.isExpired || info.timeRemaining === 0) {
          setShowWarning(false);
          logout();
        }
      } else {
        // Resposta sem sucesso, assumir que expirou
        setSessionInfo(null);
        setShowWarning(false);
      }
    } catch (error: any) {
      // Erro "Failed to fetch" geralmente indica problema de rede/CORS/servidor offline
      // Não é crítico para o funcionamento do checkout, apenas logar em modo debug
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        // Silenciar erro de rede - não é crítico para checkout
        // O usuário ainda pode usar o checkout normalmente
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useSessionExpiration] ⚠️ Erro de rede ao verificar sessão (não crítico):', error.message);
        }
      } else {
        console.error('[useSessionExpiration] Erro ao verificar sessão:', error);
      }
      // Se erro de rede ou outro, não fazer logout automaticamente
      // Apenas limpar estado local
      setSessionInfo(null);
      setShowWarning(false);
    }
  }, [accessToken, refreshToken, sessionId, isAuthenticated, logout]);

  const refreshSession = useCallback(async () => {
    if (!refreshToken || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // A API_URL já inclui /api, então usar apenas /auth/refresh
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao renovar sessão');
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Atualizar token no contexto
        updateAccessToken(result.data.accessToken);
        setShowWarning(false);
        warningShownRef.current = false;
        // Verificar novamente após renovar
        setTimeout(() => {
          checkSession();
        }, 1000);
      } else {
        throw new Error('Falha ao renovar sessão');
      }
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
      setShowWarning(false);
      logout();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, isRefreshing, logout, updateAccessToken, checkSession]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    warningShownRef.current = true; // Não mostrar novamente até próxima verificação
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSessionInfo(null);
      setShowWarning(false);
      warningShownRef.current = false;
      return;
    }

    // Verificar imediatamente
    checkSession();

    // Configurar intervalo para verificar periodicamente
    intervalRef.current = setInterval(() => {
      checkSession();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkSession]);

  return {
    sessionInfo,
    showWarning,
    isRefreshing,
    refreshSession,
    dismissWarning,
  };
};

