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
    'dash.ghubtech.com.br', // Dashboard também pode servir imagens
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
 * Converte uma URL de imagem para usar o proxy do frontend
 * PROTEÇÃO: Oculta a URL real do dashboard, sempre usa /api/images/...
 * 
 * @param imageUrl - URL completa da imagem do dashboard ou caminho relativo
 * @returns URL do proxy do frontend (/api/images/...) ou fallback
 * 
 * @example
 * // URL do dashboard: https://dash.ghubtech.com.br/api/images/uploads/events/image.jpg
 * // Retorna: /api/images/uploads/events/image.jpg (protegido)
 */
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
    // Retornar fallback se não houver URL
    if (!imageUrl) return DEFAULT_FALLBACK_IMAGE;
    
    // Normalizar e validar
    const normalized = imageUrl.trim();
    if (!normalized) return DEFAULT_FALLBACK_IMAGE;
    
    // Se já for uma URL do proxy do frontend, retornar como está
    if (normalized.startsWith('/api/images/')) {
        return normalized;
    }
    
    // Se for uma URL completa (http:// ou https://), extrair o caminho para o proxy
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        try {
            const url = new URL(normalized);
            let path = url.pathname;
            
            // Se a URL já tiver /api/images/ no caminho (do dashboard), extrair apenas o path após isso
            if (path.startsWith('/api/images/')) {
                // Remover /api/images/ do início
                const imagePath = path.substring(12); // '/api/images/'.length = 12
                return `/api/images/${imagePath}`;
            }
            
            // Se for /uploads/..., adicionar ao proxy
            if (path.startsWith('/uploads/')) {
                return `/api/images${path}`;
            }
            
            // Se começar com /, usar como está no proxy
            if (path.startsWith('/')) {
                return `/api/images${path}`;
            }
            
            // Caso contrário, adicionar /api/images/ antes
            return `/api/images/${path}`;
        } catch (error) {
            // Se falhar ao parsear, tratar como caminho relativo
        }
    }
    
    // Se for uma URL local (começa com /), adicionar ao proxy
    if (normalized.startsWith('/')) {
        // Se já começar com /api/images/, retornar como está
        if (normalized.startsWith('/api/images/')) {
            return normalized;
        }
        // Caso contrário, adicionar /api/images/ antes
        return `/api/images${normalized}`;
    }
    
    // Se for um caminho relativo (sem / no início), adicionar ao proxy
    return `/api/images/${normalized}`;
}

