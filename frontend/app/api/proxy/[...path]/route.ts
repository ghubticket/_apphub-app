import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy Route - Protege todas as rotas da API backend
 * Todas as requisições passam por aqui, nunca expondo a URL da API no cliente
 */

// URL da API backend (apenas server-side)
// Prioridade: API_URL (server-side) > NEXT_PUBLIC_API_URL > fallback
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

// Usar produção como fallback padrão (mais seguro que localhost)
const API_URL = API_BASE_URL || 'https://api.ghubtech.com.br/api';

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
        // CRÍTICO: path é um array, então join('/') reconstrói corretamente
        const apiPath = Array.isArray(path) ? path.join('/') : String(path);
        const apiUrl = `${API_URL}/${apiPath}`;

        // Log para debug (apenas em desenvolvimento ou quando houver erro)
        if (process.env.NODE_ENV === 'development' || apiPath.includes('fake-')) {
            console.log('[Proxy] Requisição:', {
                method,
                apiPath,
                apiUrl,
                hasBody: ['POST', 'PUT', 'PATCH'].includes(method),
            });
        }

        // Obter query parameters
        const searchParams = request.nextUrl.searchParams;
        const queryString = searchParams.toString();
        fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl;

        // Obter body se existir (para POST, PUT, PATCH)
        // CRÍTICO: Verificar ANTES de definir headers para evitar enviar Content-Type quando não há body
        const isGeneratePayment = apiPath.includes('generate-payment');
        const contentLength = request.headers.get('content-length');
        const contentType = request.headers.get('content-type') || '';
        
        let body: string | undefined;
        let hasBody = false;
        
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            // CRÍTICO: Verificar se é rota que não usa body (generate-payment)
            // Essas rotas NUNCA devem ter body lido, mesmo que venha content-length
            if (isGeneratePayment) {
                // Rota generate-payment não usa body - NUNCA tentar ler
                // Isso evita "Body has already been read" no backend
                body = undefined;
                hasBody = false;
            } else if (!contentLength || contentLength === '0') {
                // Se content-length é '0' ou não existe, não há body
                body = undefined;
                hasBody = false;
            } else {
                // Tentar ler body apenas se realmente tem conteúdo
                try {
                    const length = parseInt(contentLength, 10);
                    if (!isNaN(length) && length > 0) {
                        // Verificar se é JSON antes de tentar parse
                        if (contentType.includes('application/json')) {
                            const requestBody = await request.json();
                            body = JSON.stringify(requestBody);
                            hasBody = true;
                        } else {
                            // Para outros tipos, ler como texto
                            body = await request.text();
                            hasBody = body.length > 0;
                        }
                    } else {
                        body = undefined;
                        hasBody = false;
                    }
                } catch (error: any) {
                    // Se houver erro ao ler body (já foi lido ou outro problema), continuar sem body
                    console.warn(`[Proxy] Erro ao ler body para ${apiPath}:`, error?.message);
                    body = undefined;
                    hasBody = false;
                }
            }
        }

        // Obter headers da requisição original (exceto alguns que não devem ser repassados)
        const headers: HeadersInit = {
            'User-Agent': 'EventHub-API-Proxy/1.0',
            ...(process.env.NODE_ENV === 'development' && {
                'X-Proxy-Source': 'frontend-api-proxy-dev'
            })
        };

        // CRÍTICO: Só adicionar Content-Type se realmente tem body
        // Para rotas generate-payment, não enviar Content-Type para evitar que o backend tente ler body
        if (hasBody && body) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = body.length.toString();
        } else if (isGeneratePayment) {
            // Para generate-payment, garantir que não enviamos Content-Type
            // Isso evita que o backend tente fazer parse do body
        }

        // Repassar Authorization se existir
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Fazer requisição para a API backend (fetch padrão)
        // CRÍTICO: Aumentar timeout para 60 segundos para operações que podem demorar (criar pedido + gerar PIX)
        const timeoutMs = apiPath.includes('fake-') ? 60000 : 30000; // 60s para fake orders, 30s para outros
        
        const response = await fetch(fullUrl, {
            method,
            headers,
            body,
            // Timeout ajustado
            signal: AbortSignal.timeout(timeoutMs),
        });

        // Log da resposta para debug
        if (process.env.NODE_ENV === 'development' || apiPath.includes('fake-')) {
            console.log('[Proxy] Resposta:', {
                status: response.status,
                statusText: response.statusText,
                url: fullUrl,
                contentType: response.headers.get('content-type'),
            });
        }

        // Obter resposta
        const responseContentType = response.headers.get('content-type');
        const isJson = responseContentType?.includes('application/json');

        let data: any;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Log do conteúdo da resposta para debug (apenas se houver erro)
        if (response.status >= 400 && (process.env.NODE_ENV === 'development' || apiPath.includes('fake-'))) {
            console.error('[Proxy] Erro na resposta:', {
                status: response.status,
                data: typeof data === 'string' ? data.substring(0, 200) : data,
            });
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
            return NextResponse.json(
                { success: false, message: 'Request timeout' },
                { status: 504 }
            );
        }

        // Se for erro de conexão recusada, dar mensagem mais útil
        if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
            const isDev = process.env.NODE_ENV === 'development';
            
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

        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}

// Configurações
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

