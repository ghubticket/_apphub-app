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
    // CRÍTICO: Verificar se é rota de pagamento que chegou como GET por engano
    const apiPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path);
    const isPaymentRoute = apiPath.includes('/payments/') && (apiPath.includes('/pix') || apiPath.includes('/card'));
    
    if (isPaymentRoute) {
        console.error('[Proxy] ERRO CRÍTICO: Rota de pagamento recebida como GET!', {
            apiPath,
            requestMethod: request.method,
            requestUrl: request.url,
            hint: 'Esta rota requer POST. Verifique se o cliente está fazendo POST corretamente.',
        });
        
        return NextResponse.json(
            { 
                success: false, 
                message: 'Método HTTP incorreto. Esta rota requer POST.',
                error: `Método recebido: GET, esperado: POST`,
                path: apiPath,
                hint: 'Esta é uma rota de pagamento que requer método POST. Verifique se o cliente está fazendo POST corretamente.',
            },
            { status: 405 } // Method Not Allowed
        );
    }
    
    return handleRequest(request, params, 'GET');
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    // CRÍTICO: Validar que a requisição realmente é POST
    if (request.method !== 'POST') {
        console.error('[Proxy] ERRO CRÍTICO: Função POST chamada mas request.method não é POST:', {
            requestMethod: request.method,
            path: params.path?.join('/'),
        });
    }
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

// Tratar requisições OPTIONS (preflight CORS)
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-meli-session-id',
            'Access-Control-Max-Age': '86400',
        },
    });
}

async function handleRequest(
    request: NextRequest,
    params: { path: string[] },
    method: string
) {
    // Definir fullUrl no escopo da função para estar disponível no catch
    let fullUrl: string = 'unknown';
    
    // CRÍTICO: Log do método original da requisição para debug
    const originalMethod = request.method;
    
    // Reconstruir o caminho da API para verificar se é fake order
    const apiPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path);
    const isFakeOrder = apiPath.includes('fake-');
    const isPaymentRoute = apiPath.includes('/payments/');
    
    // CRÍTICO: Se for fake order ou rota de pagamento, DEVE ser POST
    // Se chegou GET mas é rota de pagamento, corrigir para POST
    if (isFakeOrder || (isPaymentRoute && apiPath.includes('/pix') || apiPath.includes('/card'))) {
        if (originalMethod !== 'POST' && method !== 'POST') {
            console.error('[Proxy] ERRO CRÍTICO: Rota de pagamento recebida com método incorreto:', {
                expected: 'POST',
                actual: originalMethod,
                method,
                apiPath,
                url: request.url,
            });
            
            // Se estivermos na função GET mas é rota de pagamento, retornar erro
            if (method === 'GET') {
                return NextResponse.json(
                    { 
                        success: false, 
                        message: 'Método HTTP incorreto. Esta rota requer POST.',
                        error: `Método recebido: ${originalMethod}, esperado: POST`,
                        path: apiPath,
                    },
                    { status: 405 } // Method Not Allowed
                );
            }
        }
        
        // Forçar método POST para rotas de pagamento
        if (method !== 'POST') {
            console.warn('[Proxy] CORREÇÃO: Forçando POST para rota de pagamento:', {
                originalMethod,
                method,
                apiPath,
            });
        }
    }
    
    // Validar método antes de processar (após correção)
    if (method !== originalMethod && !isFakeOrder && !isPaymentRoute) {
        console.error('[Proxy] ERRO CRÍTICO: Método HTTP diferente:', {
            expected: method,
            actual: originalMethod,
            path: apiPath,
            url: request.url,
        });
    }
    
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

        // Log para debug (sempre para fake orders e pagamentos em produção também)
        if (apiPath.includes('fake-') || apiPath.includes('/payments/') || apiPath.includes('/parcelled-orders')) {
            console.log('[Proxy] Requisição recebida:', {
                method,
                originalMethod: originalMethod,
                apiPath,
                apiUrl,
                hasBody: ['POST', 'PUT', 'PATCH'].includes(method),
                requestMethod: request.method, // Método original da requisição
                requestUrl: request.url,
                contentLength: request.headers.get('content-length'),
                contentType: request.headers.get('content-type'),
            });
            
            // CRÍTICO: Se método estiver errado, logar erro imediatamente
            if (apiPath.includes('fake-') && originalMethod !== 'POST') {
                console.error('[Proxy] ERRO CRÍTICO: Fake order com método GET!', {
                    originalMethod,
                    method,
                    apiPath,
                    requestUrl: request.url,
                });
            }
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
            
            // Log do body para debug (apenas para pagamentos, limitado a 200 chars)
            if (apiPath.includes('/payments/') || apiPath.includes('/parcelled-orders')) {
                const bodyPreview = body.length > 200 ? body.substring(0, 200) + '...' : body;
                console.log('[Proxy] Body preparado:', {
                    apiPath,
                    bodyLength: body.length,
                    bodyPreview,
                });
            }
        } else if (isGeneratePayment) {
            // Para generate-payment, garantir que não enviamos Content-Type
            // Isso evita que o backend tente fazer parse do body
        } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
            // Log se método requer body mas não temos
            if (apiPath.includes('/payments/') || apiPath.includes('/parcelled-orders')) {
                console.warn('[Proxy] POST/PUT/PATCH sem body:', {
                    apiPath,
                    contentLength,
                    contentType,
                });
            }
        }

        // Repassar Authorization se existir
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // CRÍTICO: Forçar POST para rotas de pagamento mesmo se chegou GET
        // Isso corrige problemas do Next.js que pode chamar GET quando deveria ser POST
        const isPaymentEndpoint = apiPath.includes('/payments/') && (apiPath.includes('/pix') || apiPath.includes('/card'));
        const finalMethod = (isPaymentEndpoint || isFakeOrder) ? 'POST' : method;
        
        // Se tivermos que forçar POST, logar
        if (finalMethod !== method || finalMethod !== originalMethod) {
            console.warn('[Proxy] CORREÇÃO: Forçando método POST para rota de pagamento:', {
                originalMethod,
                method,
                finalMethod,
                apiPath,
                isPaymentEndpoint,
                isFakeOrder,
            });
        }
        
        // Se chegou GET mas é rota de pagamento, retornar erro explicativo
        if (originalMethod === 'GET' && isPaymentEndpoint && method === 'GET') {
            console.error('[Proxy] ERRO: Rota de pagamento recebida como GET:', {
                originalMethod,
                method,
                apiPath,
                requestUrl: request.url,
            });
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Método HTTP incorreto. Esta rota requer POST.',
                    error: `Método recebido: ${originalMethod}, esperado: POST`,
                    path: apiPath,
                    hint: 'Esta é uma rota de pagamento que requer método POST. Verifique se o cliente está fazendo POST corretamente.',
                },
                { status: 405 } // Method Not Allowed
            );
        }

        // Fazer requisição para a API backend (fetch padrão)
        // CRÍTICO: Aumentar timeout para 90 segundos para operações que podem demorar (criar pedido + gerar PIX)
        // O axios já tem timeout de 90s, mas o proxy também precisa ter timeout maior
        const timeoutMs = apiPath.includes('fake-') || apiPath.includes('/payments/') ? 90000 : 30000; // 90s para fake orders/payments, 30s para outros
        
        if (finalMethod !== method) {
            console.error('[Proxy] CORREÇÃO: Forçando método POST para fake order:', {
                originalMethod: method,
                correctedMethod: finalMethod,
                apiPath,
            });
        }
        
        // CRÍTICO: Usar AbortController para timeout compatível com todos os ambientes
        // AbortSignal.timeout() pode não estar disponível em produção
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error('[Proxy] Timeout atingido para requisição:', {
                apiPath,
                fullUrl,
                method: finalMethod,
                timeoutMs,
            });
            abortController.abort();
        }, timeoutMs);
        
        let response: Response;
        try {
            // Log antes de fazer a requisição (apenas para pagamentos)
            if (apiPath.includes('/payments/') || apiPath.includes('/parcelled-orders')) {
                console.log('[Proxy] Fazendo requisição para backend:', {
                    method: finalMethod,
                    url: fullUrl,
                    hasBody: !!body,
                    bodyLength: body?.length || 0,
                    timeoutMs,
                });
            }
            
            response = await fetch(fullUrl, {
                method: finalMethod, // Usar método corrigido se necessário
                headers,
                body,
                signal: abortController.signal,
            });
        } catch (fetchError: any) {
            // Limpar timeout se houver erro antes do timeout
            clearTimeout(timeoutId);
            
            // Se for erro de abort (timeout), relançar para ser tratado no catch externo
            if (fetchError.name === 'AbortError') {
                throw fetchError;
            }
            
            // Para outros erros, logar e relançar
            console.error('[Proxy] Erro ao fazer fetch:', {
                errorName: fetchError.name,
                errorMessage: fetchError.message,
                apiPath,
                fullUrl,
            });
            throw fetchError;
        } finally {
            clearTimeout(timeoutId);
        }

        // Log da resposta para debug (sempre para fake orders e pagamentos em produção também)
        if (apiPath.includes('fake-') || apiPath.includes('/payments/') || apiPath.includes('/parcelled-orders')) {
            console.log('[Proxy] Resposta:', {
                status: response.status,
                statusText: response.statusText,
                url: fullUrl,
                method,
                contentType: response.headers.get('content-type'),
                apiPath,
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

        // Log do conteúdo da resposta para debug (sempre para fake orders e pagamentos em produção também)
        if (response.status >= 400 && (apiPath.includes('fake-') || apiPath.includes('/payments/') || apiPath.includes('/parcelled-orders'))) {
            console.error('[Proxy] Erro na resposta:', {
                status: response.status,
                method,
                apiPath,
                url: fullUrl,
                data: typeof data === 'string' ? data.substring(0, 500) : data,
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
        if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.name === 'AbortSignal') {
            console.error('[Proxy] Timeout ou abort na requisição:', {
                errorName: error.name,
                message: error.message,
                path: fullUrl,
            });
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Request timeout - A requisição demorou muito para responder. Tente novamente.',
                    error: 'TIMEOUT'
                },
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

