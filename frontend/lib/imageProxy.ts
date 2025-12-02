/**
 * Helper para gerar URLs de imagens através do proxy da API
 * Protege a URL da API backend
 */

// Prioridade: API_URL (server-side) > NEXT_PUBLIC_API_URL > fallback
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

// Fallback de imagem padrão
const DEFAULT_FALLBACK_IMAGE = '/images/anita.jpg';

// Domínios reconhecidos da API (para detecção)
const API_DOMAINS = [
    'api.ghubtech.com.br',
    'localhost:3443',
    'localhost:3001',
    '127.0.0.1:3443',
    '127.0.0.1:3001'
];

/**
 * Verifica se uma URL é de uma imagem da nossa API
 */
export function isApiImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Verificar se contém a API_BASE_URL configurada
    if (url.includes(API_BASE_URL)) return true;
    
    // Verificar se contém algum dos domínios conhecidos
    if (API_DOMAINS.some(domain => url.includes(domain))) return true;
    
    // URLs relativas (sem protocolo e sem /) são consideradas da API
    return !url.startsWith('http') && !url.startsWith('/');
}

/**
 * Extrai o caminho de uma URL de imagem da API
 */
function extractImagePath(url: string): string | null {
    try {
        const urlObj = new URL(url);
        let path = urlObj.pathname;
        
        // Remover /api se estiver presente no caminho
        if (path.startsWith('/api/')) {
            path = path.substring(5);
        } else if (path.startsWith('/')) {
            path = path.substring(1);
        }
        
        // Adicionar query string se existir
        return path ? `${path}${urlObj.search}` : null;
    } catch (error) {
        // Fallback: tentar extrair com regex
        const uploadsMatch = url.match(/\/(uploads\/.+)$/);
        if (uploadsMatch) return uploadsMatch[1];
        
        const pathMatch = url.match(/https?:\/\/[^\/]+(\/.+)$/);
        if (pathMatch) {
            let path = pathMatch[1];
            if (path.startsWith('/api/')) {
                path = path.substring(5);
            } else if (path.startsWith('/')) {
                path = path.substring(1);
            }
            return path || null;
        }
        
        return null;
    }
}

/**
 * Converte uma URL de imagem da API para usar o proxy do Next.js
 * 
 * @param imageUrl - URL completa da imagem da API ou caminho relativo
 * @returns URL do proxy do Next.js ou URL original se não for da API
 * 
 * @example
 * // URL da API: https://api.ghubtech.com.br/api/uploads/events/image.jpg
 * // Retorna: /api/images/uploads/events/image.jpg
 */
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
    // Retornar fallback se não houver URL
    if (!imageUrl) return DEFAULT_FALLBACK_IMAGE;
    
    // Normalizar e validar
    const normalized = imageUrl.trim();
    if (!normalized) return DEFAULT_FALLBACK_IMAGE;
    
    // Se já for uma URL do proxy, retornar como está
    if (normalized.startsWith('/api/images/')) {
        return normalized;
    }
    
    // Se for outra URL local, retornar como está
    if (normalized.startsWith('/')) {
        return normalized;
    }
    
    // Se for uma URL completa (http:// ou https://)
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        // Verificar se é da nossa API
        if (isApiImageUrl(normalized)) {
            const path = extractImagePath(normalized);
            
            if (!path) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[getProxiedImageUrl] Failed to extract path from URL:', normalized);
                }
                return DEFAULT_FALLBACK_IMAGE;
            }
            
            return `/api/images/${path}`;
        }
        
        // Se for outra URL externa, retornar como está
        return normalized;
    }
    
    // Se for um caminho relativo (assumir que é da API)
    const cleanPath = normalized.startsWith('/') ? normalized.substring(1) : normalized;
    return `/api/images/${cleanPath}`;
}

