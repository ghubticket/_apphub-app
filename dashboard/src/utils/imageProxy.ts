/**
 * Helper para gerar URLs de imagens através do proxy da API
 * Protege a URL da API backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

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
    // Se não houver URL, retornar fallback
    if (!imageUrl) {
        return '';
    }

    // Normalizar a string (trim)
    const normalized = imageUrl.trim();
    if (!normalized) {
        return '';
    }

    // Se já for uma URL local que começa com /, verificar se já é do proxy
    if (normalized.startsWith('/')) {
        // Se já for do proxy, retornar como está
        if (normalized.startsWith('/api/images/')) {
            return normalized;
        }
        // Se for outra URL local (ex: /images/...), retornar como está
        return normalized;
    }

    // Se for uma URL externa (http:// ou https://)
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        // Verificar se é da nossa API (incluindo localhost para desenvolvimento)
        const isApiUrl = normalized.includes(API_BASE_URL) || 
                        normalized.includes('api.ghubtech.com.br') ||
                        normalized.includes('localhost:3443') ||
                        normalized.includes('localhost:3001');
        
        if (isApiUrl) {
            // Extrair o caminho após a base URL
            try {
                const url = new URL(normalized);
                let path = url.pathname;
                
                // Remover /api se estiver presente no caminho
                if (path.startsWith('/api/')) {
                    path = path.substring(5); // Remove '/api/'
                } else if (path.startsWith('/')) {
                    // Se começa com / mas não tem /api/, apenas remover a barra inicial
                    path = path.substring(1);
                }
                
                // Garantir que o caminho não esteja vazio
                if (!path) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[getProxiedImageUrl] Empty path after processing:', normalized);
                    }
                    return '';
                }
                
                // Retornar URL do proxy (sempre começa com /)
                return `/api/images/${path}${url.search}`;
            } catch (error) {
                // Se falhar ao parsear URL, tentar extrair manualmente
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[getProxiedImageUrl] Failed to parse URL, trying regex:', normalized, error);
                }
                
                // Tentar extrair caminho que começa com /uploads/
                const uploadsMatch = normalized.match(/\/(uploads\/.+)$/);
                if (uploadsMatch) {
                    return `/api/images/${uploadsMatch[1]}`;
                }
                
                // Tentar extrair qualquer caminho após o domínio
                const pathMatch = normalized.match(/https?:\/\/[^\/]+(\/.+)$/);
                if (pathMatch) {
                    let extractedPath = pathMatch[1];
                    // Remover /api/ se presente
                    if (extractedPath.startsWith('/api/')) {
                        extractedPath = extractedPath.substring(5);
                    } else if (extractedPath.startsWith('/')) {
                        extractedPath = extractedPath.substring(1);
                    }
                    return `/api/images/${extractedPath}`;
                }
                
                // Se não conseguir extrair, retornar vazio
                if (process.env.NODE_ENV === 'development') {
                    console.error('[getProxiedImageUrl] Could not extract path from URL:', normalized);
                }
                return '';
            }
        }
        
        // Se for outra URL externa, retornar como está (mas pode querer bloquear isso)
        return normalized;
    }

    // Se for um caminho relativo (sem / e sem http), assumir que é da API
    // Garantir que não comece com / para evitar duplicação
    const cleanPath = normalized.startsWith('/') ? normalized.substring(1) : normalized;
    // Garantir que a URL do proxy sempre comece com /
    return `/api/images/${cleanPath}`;
}

/**
 * Verifica se uma URL é de uma imagem da nossa API
 */
export function isApiImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    return url.includes(API_BASE_URL) || 
           url.includes('api.ghubtech.com.br') ||
           (!url.startsWith('http') && !url.startsWith('/'));
}

