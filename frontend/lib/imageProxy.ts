/**
 * Helper para obter URL de imagem
 * Normaliza URLs para usar HTTP local em desenvolvimento
 */

// Fallback de imagem padrão
const DEFAULT_FALLBACK_IMAGE = '/images/anita.jpg';

// URL da API em desenvolvimento
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Normaliza URLs de imagens do backend para usar HTTP local
 * Converte https://localhost:3443 para http://localhost:3001
 */
function normalizeImageUrl(url: string): string {
    // Converter https://localhost:3443 para http://localhost:3001
    if (url.includes('https://localhost:3443') || url.includes('http://localhost:3443')) {
        return url.replace(/https?:\/\/localhost:3443/, 'http://localhost:3001');
    }
    
    // Se for uma URL relativa que começa com /uploads, adicionar a URL da API
    if (url.startsWith('/uploads/')) {
        const apiUrl = API_BASE_URL.replace('/api', '');
        return `${apiUrl}${url}`;
    }
    
    // Se for apenas o caminho sem /, adicionar /uploads/events/ se necessário
    if (!url.startsWith('http') && !url.startsWith('/') && url.includes('.')) {
        const apiUrl = API_BASE_URL.replace('/api', '');
        return `${apiUrl}/uploads/events/${url}`;
    }
    
    return url;
}

/**
 * Retorna a URL da imagem ou fallback
 * URLs do R2 são retornadas diretamente (sem proxy)
 * URLs do backend são normalizadas para usar HTTP local
 * 
 * @param imageUrl - URL completa da imagem (R2, API, etc) ou null/undefined
 * @returns URL da imagem ou fallback
 */
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
    // Retornar fallback se não houver URL
    if (!imageUrl) return DEFAULT_FALLBACK_IMAGE;
    
    // Normalizar e validar
    const normalized = imageUrl.trim();
    if (!normalized) return DEFAULT_FALLBACK_IMAGE;
    
    // Normalizar URLs do backend para HTTP local
    const normalizedUrl = normalizeImageUrl(normalized);
    
    // Retornar URL normalizada
    return normalizedUrl;
}

/**
 * Verifica se uma URL é de uma imagem válida
 */
export function isApiImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}
