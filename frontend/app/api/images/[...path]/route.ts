import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route para fazer proxy de imagens da API backend
 * Protege a URL da API e permite cache/otimização
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const { path } = params;
        
        if (!path || path.length === 0) {
            return new NextResponse('Path is required', { status: 400 });
        }

        // Reconstruir o caminho da imagem
        const imagePath = path.join('/');
        
        // URL da API backend (usar variável de ambiente)
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.ghubtech.com.br/api';
        
        // Construir URL completa da imagem
        const imageUrl = `${apiBaseUrl}/${imagePath}`;

        // Buscar a imagem da API
        const response = await fetch(imageUrl, {
            method: 'GET',
            headers: {
                'Accept': 'image/*',
            },
            // Timeout de 10 segundos
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error(`[Image Proxy] Failed to fetch image: ${imageUrl}`, response.status);
            return new NextResponse('Image not found', { status: response.status });
        }

        // Obter o tipo de conteúdo da imagem
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const imageBuffer = await response.arrayBuffer();

        // Retornar a imagem com headers de cache e segurança
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache de 1 ano
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
            },
        });
    } catch (error: any) {
        console.error('[Image Proxy] Error:', error);
        
        // Retornar erro 500 ou 404 dependendo do tipo de erro
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return new NextResponse('Request timeout', { status: 504 });
        }
        
        return new NextResponse('Internal server error', { status: 500 });
    }
}

// Configurar para permitir parâmetros dinâmicos
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

