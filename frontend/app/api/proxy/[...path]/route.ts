import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy Route - Protege todas as rotas da API backend
 * Todas as requisições passam por aqui, nunca expondo a URL da API no cliente
 */

// URL da API backend (apenas server-side)
// Prioridade: API_URL (server-side) > NEXT_PUBLIC_API_URL > fallback
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
    console.warn('[API Proxy] No API_URL or NEXT_PUBLIC_API_URL configured. Using production fallback.');
}

// Usar produção como fallback padrão (mais seguro que localhost)
const API_URL = API_BASE_URL || 'https://api.ghubtech.com.br/api';

// Log da URL configurada (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
    console.log('[API Proxy] Configurado para:', API_URL);
}

// Métodos HTTP permitidos
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return handleRequest(request, params, 'GET');
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return handleRequest(request, params, 'POST');
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return handleRequest(request, params, 'PUT');
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return handleRequest(request, params, 'PATCH');
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return handleRequest(request, params, 'DELETE');
}

async function handleRequest(
    request: NextRequest,
    params: { path: string[] },
    method: string
) {
    // Definir fullUrl no escopo da função para estar disponível no catch
    let fullUrl: string = 'unknown';
    
    try {
        const { path } = params;

        if (!path || path.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Path is required' },
                { status: 400 }
            );
        }

        // Reconstruir o caminho da API
        const apiPath = path.join('/');
        const apiUrl = `${API_URL}/${apiPath}`;

        // Obter query parameters
        const searchParams = request.nextUrl.searchParams;
        const queryString = searchParams.toString();
        fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl;

        // Obter headers da requisição original (exceto alguns que não devem ser repassados)
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'User-Agent': 'EventHub-API-Proxy/1.0',
            ...(process.env.NODE_ENV === 'development' && {
                'X-Proxy-Source': 'frontend-api-proxy-dev'
            })
        };

        // Repassar Authorization se existir
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Obter body se existir (para POST, PUT, PATCH)
        let body: string | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                const requestBody = await request.json();
                body = JSON.stringify(requestBody);
            } catch {
                // Se não houver body JSON, tentar como texto
                body = await request.text();
            }
        }

        // Configurar para ignorar verificação SSL em desenvolvimento (apenas para localhost HTTPS)
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalhost = fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1');
        const isHttps = fullUrl.startsWith('https://');
        
        // Em desenvolvimento com localhost HTTPS, usar módulo https diretamente
        if (isDevelopment && isLocalhost && isHttps) {
            try {
                const https = await import('https');
                const url = new URL(fullUrl);
                
                const response = await new Promise<{ status: number; headers: any; data: any }>((resolve, reject) => {
                    const options = {
                        hostname: url.hostname,
                        port: url.port || 443,
                        path: url.pathname + url.search,
                        method,
                        headers: headers as Record<string, string>,
                        rejectUnauthorized: false, // Desabilitar verificação SSL apenas em dev localhost
                    };

                    const req = https.request(options, (res) => {
                        let data = '';
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        res.on('end', () => {
                            try {
                                const contentType = res.headers['content-type'] || '';
                                const parsedData = contentType.includes('application/json') ? JSON.parse(data) : data;
                                resolve({
                                    status: res.statusCode || 200,
                                    headers: res.headers,
                                    data: parsedData,
                                });
                            } catch (e) {
                                resolve({
                                    status: res.statusCode || 200,
                                    headers: res.headers,
                                    data: data,
                                });
                            }
                        });
                    });

                    req.on('error', (error) => {
                        reject(error);
                    });

                    if (body) {
                        req.write(body);
                    }
                    req.end();
                });

                return NextResponse.json(response.data, {
                    status: response.status,
                    headers: {
                        'Cache-Control': response.headers['cache-control'] || 'no-store',
                        'Content-Type': 'application/json',
                    },
                });
            } catch (httpsError: any) {
                // Se for erro de conexão recusada em desenvolvimento, dar mensagem mais clara
                if (httpsError.code === 'ECONNREFUSED' && process.env.NODE_ENV === 'development') {
                    console.error('[API Proxy] ❌ Erro de conexão:', {
                        message: 'Backend não está acessível',
                        url: fullUrl,
                        error: httpsError.code,
                        hint: 'Verifique se o backend está rodando ou configure NEXT_PUBLIC_API_URL para a URL de produção'
                    });
                } else {
                    console.error('[API Proxy] HTTPS request error:', httpsError);
                }
                // Fallback para fetch normal
            }
        }

        // Fazer requisição para a API backend (fetch padrão)
        const response = await fetch(fullUrl, {
            method,
            headers,
            body,
            // Timeout de 30 segundos
            signal: AbortSignal.timeout(30000),
        });

        // Obter resposta
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        let data: any;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Retornar resposta com status e headers apropriados
        return NextResponse.json(data, {
            status: response.status,
            headers: {
                'Cache-Control': response.headers.get('cache-control') || 'no-store',
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        // Tratar diferentes tipos de erro
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            console.error('[API Proxy] Request timeout');
            return NextResponse.json(
                { success: false, message: 'Request timeout' },
                { status: 504 }
            );
        }

        // Se for erro de conexão recusada, dar mensagem mais útil
        if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
            const isDev = process.env.NODE_ENV === 'development';
            console.error('[API Proxy] ❌ Conexão recusada:', {
                url: fullUrl,
                message: isDev 
                    ? 'Backend não está acessível. Verifique se está rodando ou configure NEXT_PUBLIC_API_URL'
                    : 'Servidor backend não está acessível',
            });
            
            return NextResponse.json(
                { 
                    success: false, 
                    message: isDev 
                        ? 'Backend não está acessível. Verifique se o servidor está rodando.'
                        : 'Servidor temporariamente indisponível',
                    error: 'ECONNREFUSED'
                },
                { status: 503 } // Service Unavailable
            );
        }

        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}

// Configurações
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

