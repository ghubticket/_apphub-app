'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

// Usar a mesma configuração de API que o resto da aplicação
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const WARNING_TIME_MS = 2 * 60 * 1000; // 2 minutos antes de expirar
const CHECK_INTERVAL_MS = 30 * 1000; // Verificar a cada 30 segundos

interface SessionInfo {
  expiresAt: string | null;
  timeRemaining: number;
  timeRemainingSeconds: number;
  isExpired: boolean;
}

export const useSessionExpiration = () => {
  const { accessToken, refreshToken, sessionId, isAuthenticated, logout, updateAccessToken, updateRefreshToken } = useAuth();
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
          setSessionInfo(null);
          setShowWarning(false);
          return; // Não fazer logout, apenas ignorar silenciosamente
        }
        
        
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
        // CRÍTICO: Só mostrar se realmente está próximo de expirar E não acabamos de fazer refresh
        if (info.timeRemaining > 0 && info.timeRemaining <= WARNING_TIME_MS && !warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }
        
        // CRÍTICO: Se a sessão foi renovada e agora tem mais tempo, resetar o flag
        // Isso permite que a modal apareça novamente se necessário no futuro
        if (info.timeRemaining > WARNING_TIME_MS && warningShownRef.current) {
          // Sessão foi renovada com sucesso, resetar flag para permitir avisos futuros
          warningShownRef.current = false;
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
        }
      } else {
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
        // Apenas se o backend disser explicitamente que não é autorizado,
        // fazemos logout imediato. Em outros erros (500, rede, etc),
        // escondemos o aviso e deixamos o usuário seguir.
        if (response.status === 401 || response.status === 403) {
          setShowWarning(false);
          warningShownRef.current = true;
          logout();
          return;
        }

        setShowWarning(false);
        warningShownRef.current = true;
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Atualizar tokens no contexto
        updateAccessToken(result.data.accessToken);
        
        // CRÍTICO: Atualizar refreshToken também se vier na resposta (rotação de token)
        // Isso garante que temos o refresh token mais recente para próximas renovações
        if (result.data.refreshToken) {
          updateRefreshToken(result.data.refreshToken);
        }
        
        setShowWarning(false);
        // CRÍTICO: Manter warningShownRef como true por mais tempo para evitar
        // que a modal reapareça imediatamente se o checkSession ainda detectar expiração
        // O próximo checkSession (via intervalo) vai resetar isso se a sessão estiver ok
        warningShownRef.current = true;
        
        // Não chamar checkSession imediatamente - deixar o intervalo normal fazer isso
        // Isso evita que a modal reapareça se o backend ainda não processou o refresh
        // O intervalo de 30s vai verificar naturalmente
      } else {
        // Falha lógica mas não necessariamente expirada => apenas esconder aviso
        setShowWarning(false);
        warningShownRef.current = true;
      }
    } catch (error) {
      // Em erros de rede ou exceções genéricas, não derrubamos a sessão.
      setShowWarning(false);
      warningShownRef.current = true;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, isRefreshing, logout, updateAccessToken, updateRefreshToken, checkSession]);

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

