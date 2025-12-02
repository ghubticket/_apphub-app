/**
 * Helper para obter Device ID do Mercado Pago
 * O Device ID é necessário para processar pagamentos com cartão
 */

declare global {
    interface Window {
        MP_DEVICE_SESSION_ID?: string;
        MercadoPago?: any;
    }
}

/**
 * Obtém o Device ID do Mercado Pago SDK
 * Tenta várias fontes em ordem de prioridade:
 * 1. window.MP_DEVICE_SESSION_ID (definido pelo SDK após inicialização)
 * 2. Buscar no DOM (o SDK pode injetar em um elemento)
 * 3. localStorage (cache)
 * 4. Gera um novo ID e salva
 */
export function getMercadoPagoDeviceId(): string {
    if (typeof window === 'undefined') {
        // Fallback para SSR
        return 'ssr-device-id';
    }

    // 1. Tentar obter do SDK do Mercado Pago (mais confiável)
    // O SDK React do Mercado Pago define isso após inicialização
    if (window.MP_DEVICE_SESSION_ID) {
        const deviceId = window.MP_DEVICE_SESSION_ID;
        localStorage.setItem('mp-device-session-id', deviceId);
        return deviceId;
    }

    // 2. Tentar buscar em elementos do DOM onde o SDK pode ter injetado
    // O SDK pode criar elementos com data attributes contendo o deviceId
    try {
        const mpElements = document.querySelectorAll('[data-mp-device-id], [data-device-id], [id*="mp-device"]');
        for (const element of Array.from(mpElements)) {
            const deviceId = element.getAttribute('data-mp-device-id') || 
                           element.getAttribute('data-device-id') ||
                           element.id;
            if (deviceId && deviceId.length > 10) {
                localStorage.setItem('mp-device-session-id', deviceId);
                return deviceId;
            }
        }
    } catch (error) {
        // Ignorar erros ao buscar no DOM
    }

    // 3. Tentar obter do localStorage (cache de sessões anteriores)
    const cachedDeviceId = localStorage.getItem('mp-device-session-id');
    if (cachedDeviceId && cachedDeviceId.length > 10 && !cachedDeviceId.startsWith('mp-')) {
        // Se o cached não é um fallback gerado, usar ele
        return cachedDeviceId;
    }

    // 4. Tentar obter do objeto MercadoPago se disponível
    if (window.MercadoPago) {
        try {
            // Tentar diferentes formas de acessar o deviceId
            const mp = window.MercadoPago as any;
            if (mp.getDeviceId && typeof mp.getDeviceId === 'function') {
                const deviceId = mp.getDeviceId();
                if (deviceId) {
                    localStorage.setItem('mp-device-session-id', deviceId);
                    return deviceId;
                }
            }
            
            // Tentar acessar diretamente
            if (mp.deviceId) {
                localStorage.setItem('mp-device-session-id', mp.deviceId);
                return mp.deviceId;
            }
        } catch (error) {
        }
    }

    // 5. Gerar um novo Device ID baseado em características do navegador
    // Este é um fallback caso o SDK não tenha gerado ainda
    // IMPORTANTE: Este ID será substituído quando o SDK gerar o real
    const generateDeviceId = (): string => {
        // Usar características do navegador para gerar um ID único e consistente
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px "Arial"';
            ctx.fillText('MP-DEVICE-ID', 2, 2);
        }
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL(),
        ].join('|');

        // Gerar hash simples do fingerprint
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        const deviceId = `mp-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
        localStorage.setItem('mp-device-session-id', deviceId);
        // Em produção, usar log info ao invés de warn (fallback é aceitável)
        const isDevelopment = typeof window !== 'undefined' && (
            process.env.NODE_ENV !== 'production' || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1'
        );
        if (isDevelopment) {
        } else {
        }
        return deviceId;
    };

    return generateDeviceId();
}

/**
 * Aguarda o Device ID do SDK do Mercado Pago estar disponível
 * Retorna um Promise que resolve quando o Device ID estiver disponível
 */
export function waitForMercadoPagoDeviceId(timeout: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('window is not available'));
            return;
        }

        // Função auxiliar para verificar se o deviceId veio do SDK (não é fallback)
        const isRealDeviceId = (deviceId: string): boolean => {
            // DeviceId do SDK geralmente não começa com 'mp-' (nosso prefixo de fallback)
            // E não é o SSR fallback
            return !!deviceId && 
                   deviceId !== 'ssr-device-id' && 
                   !deviceId.startsWith('mp-') &&
                   deviceId.length > 10;
        };

        // Verificar se já está disponível diretamente do SDK
        if (window.MP_DEVICE_SESSION_ID && isRealDeviceId(window.MP_DEVICE_SESSION_ID)) {
            const deviceId = window.MP_DEVICE_SESSION_ID;
            localStorage.setItem('mp-device-session-id', deviceId);
            resolve(deviceId);
            return;
        }

        // Verificar se já está disponível no cache (mas não é fallback)
        const cachedDeviceId = localStorage.getItem('mp-device-session-id');
        if (cachedDeviceId && isRealDeviceId(cachedDeviceId)) {
            resolve(cachedDeviceId);
            return;
        }

        // Aguardar o SDK definir window.MP_DEVICE_SESSION_ID
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            // Verificar se o SDK definiu o deviceId
            if (window.MP_DEVICE_SESSION_ID && isRealDeviceId(window.MP_DEVICE_SESSION_ID)) {
                const deviceId = window.MP_DEVICE_SESSION_ID;
                localStorage.setItem('mp-device-session-id', deviceId);
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                resolve(deviceId);
                return;
            }

            // Timeout - usar fallback
            if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                const fallbackDeviceId = getMercadoPagoDeviceId();
                // Em produção, usar log info (fallback é aceitável e funciona)
                const isDevelopment = typeof window !== 'undefined' && (
                    process.env.NODE_ENV !== 'production' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1'
                );
                if (isDevelopment) {
                } else {
                }
                resolve(fallbackDeviceId);
            }
        }, 100);

        const timeoutId = setTimeout(() => {
            clearInterval(checkInterval);
            const fallbackDeviceId = getMercadoPagoDeviceId();
            // Em produção, usar log info (fallback é aceitável e funciona)
            const isDevelopment = typeof window !== 'undefined' && (
                process.env.NODE_ENV !== 'production' || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
            );
            if (isDevelopment) {
            } else {
            }
            resolve(fallbackDeviceId);
        }, timeout);
    });
}

