/**
 * Helper para obter URL de imagem
 * Agora retorna URLs diretas do R2 ou fallback
 */

// Fallback de imagem padrão
const DEFAULT_FALLBACK_IMAGE = '/images/anita.jpg';

/**
 * Retorna a URL da imagem ou fallback
 * URLs do R2 são retornadas diretamente (sem proxy)
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
    
    // Retornar URL direta (R2, API, etc)
    return normalized;
}

/**
 * Verifica se uma URL é de uma imagem válida
 */
export function isApiImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}
