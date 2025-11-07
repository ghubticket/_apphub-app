/**
 * Utilitários para detecção de dispositivo móvel e validação de segurança
 */

/**
 * Detecta se o dispositivo é móvel baseado no User-Agent
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Padrões comuns de dispositivos móveis
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
    /Tablet/i,
  ];
  
  return mobilePatterns.some(pattern => pattern.test(userAgent));
};

/**
 * Detecta se é um tablet (pode ser considerado válido para validação)
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  return /iPad|Android|Tablet/i.test(userAgent) && !/Mobile/i.test(userAgent);
};

/**
 * Verifica se o dispositivo tem câmera disponível
 */
export const hasCamera = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return false;
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
};

/**
 * Valida se o ambiente é seguro (HTTPS ou localhost)
 */
export const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // HTTPS ou localhost são considerados seguros
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('trycloudflare.com') ||
    window.location.hostname.includes('ngrok')
  );
};

/**
 * Obtém informações do dispositivo para logging/auditoria
 */
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'unknown',
      platform: 'unknown',
      isMobile: false,
      isTablet: false,
      language: 'unknown',
    };
  }
  
  return {
    userAgent: navigator.userAgent || 'unknown',
    platform: navigator.platform || 'unknown',
    isMobile: isMobileDevice(),
    isTablet: isTablet(),
    language: navigator.language || 'unknown',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Valida se o acesso é permitido (apenas mobile/tablet)
 * Retorna mensagem de erro se não for permitido
 */
export const validateDeviceAccess = (): { allowed: boolean; message?: string } => {
  const isMobile = isMobileDevice();
  const isTabletDevice = isTablet();
  
  // Permitir mobile e tablets
  if (isMobile || isTabletDevice) {
    return { allowed: true };
  }
  
  // Bloquear desktop
  return {
    allowed: false,
    message: 'Este aplicativo é exclusivo para dispositivos móveis e tablets. Por favor, acesse de um celular ou tablet.',
  };
};

