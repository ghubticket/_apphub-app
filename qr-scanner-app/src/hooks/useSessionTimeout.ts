import { useEffect, useState, useCallback } from 'react';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
const WARNING_TIME_MS = 5 * 60 * 1000; // Aviso 5 minutos antes

interface UseSessionTimeoutOptions {
  onTimeout: () => void;
  onWarning?: (timeRemaining: number) => void;
  timeoutMs?: number;
  warningMs?: number;
  enabled?: boolean;
}

export const useSessionTimeout = ({
  onTimeout,
  onWarning,
  timeoutMs = SESSION_TIMEOUT_MS,
  warningMs = WARNING_TIME_MS,
  enabled = true,
}: UseSessionTimeoutOptions) => {
  const [timeRemaining, setTimeRemaining] = useState(timeoutMs);
  const [showWarning, setShowWarning] = useState(false);
  const [isActive, setIsActive] = useState(enabled);

  const resetTimer = useCallback(() => {
    setTimeRemaining(timeoutMs);
    setShowWarning(false);
    setIsActive(true);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled || !isActive) {
      setTimeRemaining(timeoutMs);
      setShowWarning(false);
      return;
    }

    // Resetar timer em qualquer interação do usuário
    const handleActivity = () => {
      resetTimer();
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Atualizar timer a cada segundo
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;

        // Mostrar aviso quando faltar pouco tempo
        if (newTime <= warningMs && !showWarning) {
          setShowWarning(true);
          if (onWarning) {
            onWarning(newTime);
          }
        }

        // Fazer logout quando tempo acabar
        if (newTime <= 0) {
          setIsActive(false);
          onTimeout();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, isActive, resetTimer, warningMs, showWarning, onTimeout, onWarning, timeoutMs]);

  return {
    timeRemaining,
    showWarning,
    resetTimer,
    minutesRemaining: Math.floor(timeRemaining / 60000),
    secondsRemaining: Math.floor((timeRemaining % 60000) / 1000),
  };
};

