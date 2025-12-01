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
        
        // Log inicial para debug
        console.log('[Image Proxy] Request received:', {
            path,
            pathLength: path?.length,
            requestUrl: request.url,
            method: request.method,
        });
        
        if (!path || path.length === 0) {
            console.error('[Image Proxy] Path is empty or invalid');
            return new NextResponse('Path is required', { status: 400 });
        }

        // Reconstruir o caminho da imagem
        const imagePath = path.join('/');
        
        // URL da API backend (usar variável de ambiente)
        // Prioridade: API_URL (server-side) > NEXT_PUBLIC_API_URL > fallback
        let apiBaseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';
        
        // SEMPRE remover /api do final do apiBaseUrl, pois as imagens estão diretamente em /uploads/
        // As imagens não estão em /api/uploads/, estão em /uploads/
        if (apiBaseUrl.endsWith('/api')) {
            apiBaseUrl = apiBaseUrl.replace(/\/api$/, '');
        } else if (apiBaseUrl.endsWith('/api/')) {
            apiBaseUrl = apiBaseUrl.replace(/\/api\/$/, '');
        }
        
        // Construir URL completa da imagem
        // Garantir que não haja dupla barra
        const cleanBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        const cleanImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        
        // Construir a URL - o Next.js já decodifica os segmentos do path
        // Não precisamos codificar novamente, apenas juntar
        const imageUrl = `${cleanBaseUrl}${cleanImagePath}`;
        
        // Log para debug (sempre, para ajudar a debugar em produção)
        console.log('[Image Proxy] Fetching image:', {
            imagePath,
            originalApiBaseUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api',
            cleanedApiBaseUrl: cleanBaseUrl,
            imageUrl,
            env: {
                NODE_ENV: process.env.NODE_ENV,
                API_URL: process.env.API_URL ? 'set' : 'not set',
                NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ? 'set' : 'not set',
            }
        });

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
            let response = await fetch(imageUrl, fetchOptions);

            // Se falhar com 404, tentar com /api/uploads/ como fallback
            if (!response.ok && response.status === 404) {
                // Tentar com /api/uploads/ se o caminho começar com uploads/
                if (imagePath.startsWith('uploads/')) {
                    const fallbackUrl = `${cleanBaseUrl}/api/${imagePath}`;
                    console.log('[Image Proxy] Trying fallback URL:', fallbackUrl);
                    const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
                    if (fallbackResponse.ok) {
                        response = fallbackResponse;
                        console.log('[Image Proxy] Fallback URL succeeded');
                    }
                }
            }

            if (!response.ok) {
                // Tentar ler o corpo da resposta para debug
                // IMPORTANTE: Não podemos ler o body duas vezes, então precisamos clonar a resposta
                const responseClone = response.clone();
                const errorText = await responseClone.text().catch(() => 'Unable to read error response');
                
                // Verificar se a resposta é HTML (pode ser uma página de erro do Next.js)
                const contentType = response.headers.get('content-type') || '';
                const isHtml = contentType.includes('text/html') || errorText.trim().startsWith('<!');
                
                console.error(`[Image Proxy] Failed to fetch image: ${imageUrl}`, {
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                    isHtml,
                    headers: Object.fromEntries(response.headers.entries()),
                    imagePath,
                    cleanBaseUrl,
                    userAgent: request.headers.get('user-agent'),
                    errorBody: isHtml ? 'HTML response (likely Next.js error page)' : errorText.substring(0, 200),
                });
                
                // Se for 404, retornar 404, caso contrário retornar 500
                const errorStatus = response.status === 404 ? 404 : 500;
                return new NextResponse('Image not found', { 
                    status: errorStatus,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                });
            }

            // Obter o tipo de conteúdo da imagem
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            
            // Verificar se realmente é uma imagem
            if (!contentType.startsWith('image/')) {
                const bodyText = await response.text().catch(() => 'Unable to read response');
                console.error(`[Image Proxy] Response is not an image: ${imageUrl}`, {
                    contentType,
                    bodyPreview: bodyText.substring(0, 200),
                });
                return new NextResponse('Invalid image response', { 
                    status: 500,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                });
            }
            
            const imageBuffer = await response.arrayBuffer();
            
            // Verificar se o buffer não está vazio
            if (imageBuffer.byteLength === 0) {
                console.error(`[Image Proxy] Empty image buffer: ${imageUrl}`);
                return new NextResponse('Empty image', { 
                    status: 500,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                });
            }

            // Log de sucesso
            console.log('[Image Proxy] Image fetched successfully:', {
                imageUrl,
                contentType,
                size: imageBuffer.byteLength,
                imagePath
            });

            // Retornar a imagem com headers de cache e segurança
            return new NextResponse(imageBuffer, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable', // Cache de 1 ano
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'Access-Control-Allow-Origin': '*', // Permitir CORS para imagens
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers': 'Content-Type',
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
export const runtime = 'nodejs';

