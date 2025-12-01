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
        return '/images/anita.jpg';
    }

    // Se já for uma URL local (começa com /), retornar como está
    if (imageUrl.startsWith('/')) {
        return imageUrl;
    }

    // Se for uma URL externa que não é da nossa API, retornar como está
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Verificar se é da nossa API
        if (imageUrl.includes(API_BASE_URL) || imageUrl.includes('api.ghubtech.com.br')) {
            // Extrair o caminho após a base URL
            const url = new URL(imageUrl);
            const path = url.pathname;
            
            // Remover /api se estiver presente
            const cleanPath = path.startsWith('/api/') ? path.substring(5) : path.startsWith('/') ? path.substring(1) : path;
            
            // Retornar URL do proxy
            return `/api/images/${cleanPath}${url.search}`;
        }
        
        // Se for outra URL externa, retornar como está (mas pode querer bloquear isso)
        return imageUrl;
    }

    // Se for um caminho relativo, assumir que é da API
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
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

