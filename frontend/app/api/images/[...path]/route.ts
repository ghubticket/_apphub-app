import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route para fazer proxy de imagens da API backend
 * Protege a URL da API e permite cache/otimização
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
    try {
        // Next.js 15 pode passar params como Promise, então precisamos fazer await se necessário
        const resolvedParams = params instanceof Promise ? await params : params;
        const { path } = resolvedParams;
        
        if (!path || path.length === 0) {
            return new NextResponse('Path is required', { status: 400 });
        }
        

        // Reconstruir o caminho da imagem
        const imagePath = path.join('/');
        
        // PROTEÇÃO: As imagens SEMPRE estão no dashboard
        // O proxy busca do dashboard mas expõe apenas /api/images/... no frontend
        const DASHBOARD_BASE_URL = 'https://dash.ghubtech.com.br';
        
        // Construir URL completa da imagem no dashboard
        // O caminho já vem como uploads/events/... ou api/images/uploads/events/...
        let cleanImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        
        // Se o caminho já começar com /api/images/, usar como está
        // Caso contrário, adicionar /api/images/ antes
        if (!cleanImagePath.startsWith('/api/images/')) {
            // Se começar com /uploads/, adicionar /api/images antes
            if (cleanImagePath.startsWith('/uploads/')) {
                cleanImagePath = `/api/images${cleanImagePath}`;
            } else {
                // Caso contrário, adicionar /api/images/ antes
                cleanImagePath = `/api/images/${cleanImagePath.substring(1)}`;
            }
        }
        
        // Construir URL completa no dashboard
        const imageUrl = `${DASHBOARD_BASE_URL}${cleanImagePath}`;
        
        // Log para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
            console.log('[Image Proxy] Fetching image from dashboard:', {
                originalPath: imagePath,
                finalImageUrl: imageUrl,
                proxyPath: `/api/images/${imagePath}`,
            });
        }

        // Configurar para ignorar verificação SSL em desenvolvimento (apenas para localhost HTTPS)
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalhost = imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1');
        const isHttps = imageUrl.startsWith('https://');
        
        // Buscar a imagem da API
        // NÃO enviar Referer - o backend permite requisições sem Referer
        // O backend só verifica Referer em produção E se ele existir
        // Se não houver Referer, o backend permite (não bloqueia)
        // Isso evita problemas com a lista de origens permitidas
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Accept': 'image/*',
                'User-Agent': 'EventHub-Image-Proxy/1.0',
                ...(process.env.NODE_ENV === 'development' && {
                    'X-Proxy-Source': 'frontend-dev'
                })
            },
            // Timeout de 10 segundos
            signal: AbortSignal.timeout(10000),
        };

        // Em desenvolvimento com localhost HTTPS, usar módulo https diretamente
        if (isDevelopment && isLocalhost && isHttps) {
            try {
                const https = await import('https');
                const url = new URL(imageUrl);
                
                const response = await new Promise<{ status: number; headers: any; data: Buffer }>((resolve, reject) => {
                    const options = {
                        hostname: url.hostname,
                        port: url.port || 443,
                        path: url.pathname + url.search,
                        method: 'GET',
                        headers: { 
                            'Accept': 'image/*',
                            'User-Agent': 'EventHub-Image-Proxy/1.0',
                            'X-Proxy-Source': 'frontend-dev-https',
                        },
                        rejectUnauthorized: false, // Desabilitar verificação SSL apenas em dev localhost
                    };

                    const req = https.request(options, (res) => {
                        const chunks: Buffer[] = [];
                        res.on('data', (chunk) => {
                            chunks.push(chunk);
                        });
                        res.on('end', () => {
                            resolve({
                                status: res.statusCode || 200,
                                headers: res.headers,
                                data: Buffer.concat(chunks),
                            });
                        });
                    });

                    req.on('error', (error) => {
                        reject(error);
                    });

                    req.end();
                });

                if (response.status >= 200 && response.status < 300) {
                    const contentType = response.headers['content-type'] || 'image/jpeg';
                    // Converter Buffer para Uint8Array para NextResponse
                    const uint8Array = new Uint8Array(response.data);
                    return new NextResponse(uint8Array, {
                        status: 200,
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=31536000, immutable',
                            'X-Content-Type-Options': 'nosniff',
                            'X-Frame-Options': 'DENY',
                        },
                    });
                } else {
                    console.error(`[Image Proxy] Failed to fetch image: ${imageUrl}`, response.status);
                    return new NextResponse('Image not found', { status: response.status });
                }
            } catch (httpsError: any) {
                console.error('[Image Proxy] HTTPS request error:', httpsError);
                // Fallback para fetch normal
            }
        }

        // Fazer requisição para a API backend (fetch padrão)
        try {
            const response = await fetch(imageUrl, fetchOptions);

            if (!response.ok) {
                console.error(`[Image Proxy] Failed to fetch image: ${imageUrl}`, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    imagePath,
                    imageUrl,
                });
                return new NextResponse('Image not found', { status: response.status });
            }

            // Obter o tipo de conteúdo da imagem
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            const imageBuffer = await response.arrayBuffer();

            // Log de sucesso (apenas em desenvolvimento)
            if (process.env.NODE_ENV === 'development') {
                console.log('[Image Proxy] Image fetched successfully:', {
                    imageUrl,
                    contentType,
                    size: imageBuffer.byteLength,
                    imagePath
                });
            }

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
        } catch (fetchError: any) {
            console.error('[Image Proxy] Fetch error:', {
                imageUrl,
                error: fetchError.message,
                name: fetchError.name,
                stack: fetchError.stack
            });
            throw fetchError; // Re-throw para ser capturado pelo catch externo
        }
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

