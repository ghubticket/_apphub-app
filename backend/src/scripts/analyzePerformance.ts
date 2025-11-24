import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

// Detectar URL da API automaticamente
// Prioridade: API_URL > NEXT_PUBLIC_API_URL > Detecção automática
const getDefaultAPIUrl = () => {
    // Se estiver em Railway ou produção, usar a URL do ambiente
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
        return process.env.API_URL || 'https://apphub-app-production.up.railway.app/api';
    }
    
    // Em desenvolvimento local, verificar se HTTPS está disponível
    const httpsPort = Number(process.env.HTTPS_PORT) || 3443;
    const httpPort = Number(process.env.PORT) || 3001;
    
    // Tentar HTTPS primeiro (porta 3443), depois HTTP (porta 3001)
    return `https://localhost:${httpsPort}/api`;
};

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || getDefaultAPIUrl();

// Log da URL sendo usada
console.log(`\n🔧 API Base URL: ${API_BASE_URL}\n`);

interface PerformanceTest {
    name: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
}

interface TestResult {
    name: string;
    endpoint: string;
    success: boolean;
    statusCode?: number;
    responseTime: number;
    dbTime?: string;
    processingTime?: string;
    error?: string;
}

const tests: PerformanceTest[] = [
    {
        name: 'Health Check',
        endpoint: '/health',
        method: 'GET',
    },
    {
        name: 'List Events',
        endpoint: '/events?page=1&limit=10',
        method: 'GET',
    },
    {
        name: 'List Events (with search)',
        endpoint: '/events?page=1&limit=10&search=test',
        method: 'GET',
    },
    {
        name: 'Get Event Ticket Types',
        endpoint: '/events/691e352aee78fd88cffaac83/ticket-types',
        method: 'GET',
    },
    {
        name: 'Get Catalog (Optimized)',
        endpoint: '/catalog?limitEvents=10&onlyWithAvailability=true',
        method: 'GET',
    },
];

// Função para fazer login e obter token JWT (para testes que requerem autenticação)
async function loginAndGetToken(
    email: string = 'admin@exemplo.com',
    password: string = 'SenhaForte123!'
): Promise<string | null> {
    const baseUrl = (global as any).API_BASE_URL_FALLBACK || API_BASE_URL;
    try {
        const response = await axios.post(
            `${baseUrl}/auth/login`,
            { email, password },
            {
                validateStatus: () => true,
                httpsAgent: baseUrl.startsWith('https://localhost')
                    ? new https.Agent({ rejectUnauthorized: false })
                    : undefined,
            }
        );
        
        if (response.status === 200) {
            // Tentar obter token do header Authorization ou do cookie
            const authHeader = response.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                return authHeader.substring(7);
            }
            
            // Ou tentar obter do cookie
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                // Procurar pelo cookie de access token
                for (const cookie of cookies) {
                    if (cookie.includes('apphub_access_token=')) {
                        const match = cookie.match(/apphub_access_token=([^;]+)/);
                        if (match) {
                            return match[1];
                        }
                    }
                }
            }
            
            // Ou tentar obter do body da resposta
            if (response.data?.data?.accessToken) {
                return response.data.data.accessToken;
            }
            if (response.data?.accessToken) {
                return response.data.accessToken;
            }
        }
        return null;
    } catch {
        return null;
    }
}

// Teste de criação de pedido (CRÍTICO - requer dados válidos do banco)
const createOrderTest: PerformanceTest = {
    name: 'Create Order (CRITICAL)',
    endpoint: '/orders',
    method: 'POST',
    data: {
        eventId: '691e352aee78fd88cffaac83', // ID do evento de teste
        ticketTypeId: '', // Será preenchido dinamicamente
        quantity: 1,
        customerData: {
            // customerData é opcional quando há usuário autenticado
            // Os dados do usuário serão usados automaticamente
        },
    },
};

async function runTest(test: PerformanceTest, authToken?: string): Promise<TestResult> {
    const startTime = Date.now();
    try {
        // Usar fallback HTTP se disponível
        const baseUrl = (global as any).API_BASE_URL_FALLBACK || API_BASE_URL;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...test.headers,
        };
        
        // Adicionar token de autenticação se fornecido
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const config: any = {
            method: test.method,
            url: `${baseUrl}${test.endpoint}`,
            headers,
            validateStatus: () => true, // Não lançar erro para status codes
            // Ignorar erros de certificado SSL em desenvolvimento local
            httpsAgent: baseUrl.startsWith('https://localhost') 
                ? new https.Agent({ rejectUnauthorized: false })
                : undefined,
        };

        if (test.data) {
            config.data = test.data;
        }

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        const dbTime = response.headers['x-db-time'];
        const processingTime = response.headers['x-processing-time'];

        return {
            name: test.name,
            endpoint: test.endpoint,
            success: response.status >= 200 && response.status < 300,
            statusCode: response.status,
            responseTime,
            dbTime,
            processingTime,
        };
    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        return {
            name: test.name,
            endpoint: test.endpoint,
            success: false,
            responseTime,
            error: error.message || 'Unknown error',
        };
    }
}

async function checkAPIConnection(): Promise<boolean> {
    try {
        const response = await axios.get(`${API_BASE_URL}/health`, {
            timeout: 5000,
            validateStatus: () => true,
            // Ignorar erros de certificado SSL em desenvolvimento local
            httpsAgent: API_BASE_URL.startsWith('https://localhost') 
                ? new https.Agent({ rejectUnauthorized: false })
                : undefined,
        });
        return response.status < 500; // Considera sucesso se não for erro de servidor
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return false;
        }
        // Se falhar com HTTPS local, tentar HTTP como fallback
        if (API_BASE_URL.startsWith('https://localhost')) {
            const httpUrl = API_BASE_URL.replace('https://', 'http://').replace(':3443', ':3001');
            try {
                const fallbackResponse = await axios.get(`${httpUrl}/health`, {
                    timeout: 5000,
                    validateStatus: () => true,
                });
                if (fallbackResponse.status < 500) {
                    console.log(`\n⚠️  HTTPS não disponível, usando HTTP: ${httpUrl}\n`);
                    // Atualizar API_BASE_URL para HTTP
                    (global as any).API_BASE_URL_FALLBACK = httpUrl;
                    return true;
                }
            } catch {
                // Ignorar erro do fallback
            }
        }
        return false;
    }
}

async function runPerformanceAnalysis() {
    console.log('🚀 Iniciando análise de performance...\n');
    
    // Usar fallback HTTP se disponível
    const baseUrl = (global as any).API_BASE_URL_FALLBACK || API_BASE_URL;
    console.log(`API Base URL: ${baseUrl}\n`);

    // Verificar se a API está acessível
    console.log('🔍 Verificando conexão com a API...');
    const isAPIAvailable = await checkAPIConnection();
    
    if (!isAPIAvailable) {
        console.log('\n❌ ERRO: API não está acessível!\n');
        console.log('📋 Para executar os testes, você precisa:');
        console.log('   1. Iniciar a API em outro terminal:');
        console.log('      npm run dev');
        console.log('   2. Ou se estiver testando a API em produção:');
        console.log('      API_URL="https://apphub-app-production.up.railway.app/api" npm run analyze-performance');
        console.log('   3. Ou especificar a URL manualmente:');
        console.log('      API_URL="https://localhost:3443/api" npm run analyze-performance\n');
        console.log('💡 Dica: Deixe a API rodando e execute este script em outro terminal.\n');
        process.exit(1);
    }
    
    console.log('✅ API está acessível!\n');

    const results: TestResult[] = [];

    // Executar testes básicos
    for (const test of tests) {
        console.log(`⏳ Executando: ${test.name}...`);
        const result = await runTest(test);
        results.push(result);
        
        if (result.success) {
            console.log(`✅ ${result.name}: ${result.responseTime}ms (DB: ${result.dbTime || 'N/A'}, Processing: ${result.processingTime || 'N/A'})`);
        } else {
            console.log(`❌ ${result.name}: Falhou - ${result.error || `Status ${result.statusCode}`}`);
        }
        
        // Pequeno delay entre testes
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Executar teste de criação de pedido (CRÍTICO)
    console.log(`\n🔥 TESTE CRÍTICO: ${createOrderTest.name}...`);
    console.log('   Buscando evento e ticket type disponíveis...');
    
    try {
        // Primeiro, buscar eventos disponíveis
        const eventsResponse = await axios.get(
            `${baseUrl}/events?page=1&limit=10&onlyActive=true`,
            {
                validateStatus: () => true,
                httpsAgent: baseUrl.startsWith('https://localhost')
                    ? new https.Agent({ rejectUnauthorized: false })
                    : undefined,
            }
        );
        
        let eventId: string | null = null;
        let ticketTypeId: string | null = null;
        
        if (eventsResponse.status === 200) {
            const events = Array.isArray(eventsResponse.data?.data?.events)
                ? eventsResponse.data.data.events
                : Array.isArray(eventsResponse.data?.events)
                  ? eventsResponse.data.events
                  : Array.isArray(eventsResponse.data?.data)
                    ? eventsResponse.data.data
                    : Array.isArray(eventsResponse.data)
                      ? eventsResponse.data
                      : [];
            
            // Tentar encontrar um evento com ticket types disponíveis
            for (const event of events) {
                const currentEventId = event._id || event.id;
                if (!currentEventId) continue;
                
                console.log(`   🔍 Verificando evento: ${event.name || currentEventId}...`);
                
                const ticketTypesResponse = await axios.get(
                    `${baseUrl}/events/${currentEventId}/ticket-types`,
                    {
                        validateStatus: () => true,
                        httpsAgent: baseUrl.startsWith('https://localhost')
                            ? new https.Agent({ rejectUnauthorized: false })
                            : undefined,
                    }
                );
                
                if (ticketTypesResponse.status === 200) {
                    const ticketTypes = Array.isArray(ticketTypesResponse.data?.data)
                        ? ticketTypesResponse.data.data
                        : Array.isArray(ticketTypesResponse.data)
                          ? ticketTypesResponse.data
                          : [];
                    
                    console.log(`   📋 Ticket types encontrados: ${ticketTypes.length}`);
                    
                    if (ticketTypes.length === 0) {
                        console.log(`   ⚠️  Nenhum ticket type retornado pela API`);
                        continue;
                    }
                    
                    // Encontrar um ticket type ativo com disponibilidade
                    const availableTicketType = ticketTypes.find((tt: any) => {
                        if (!tt.isActive || tt.deletedAt) return false;
                        
                        // Calcular disponibilidade: maxQuantity - soldQuantity
                        const maxQty = tt.maxQuantity || 0;
                        const soldQty = tt.soldQuantity || 0;
                        const availableQty = tt.availableQuantity !== undefined 
                            ? tt.availableQuantity 
                            : maxQty - soldQty;
                        
                        const hasAvailability = availableQty > 0 || (maxQty > soldQty);
                        
                        if (hasAvailability) {
                            console.log(`   ✅ Ticket type disponível: ${tt.name} - ${availableQty} disponíveis (max: ${maxQty}, vendidos: ${soldQty})`);
                        }
                        
                        return hasAvailability;
                    });
                    
                    if (availableTicketType) {
                        eventId = currentEventId;
                        ticketTypeId = availableTicketType._id || availableTicketType.id;
                        console.log(`   ✅ Evento encontrado: ${event.name || eventId}`);
                        console.log(`   ✅ TicketType encontrado: ${availableTicketType.name || ticketTypeId}`);
                        break;
                    } else {
                        console.log(`   ⚠️  Nenhum ticket type disponível encontrado para este evento`);
                    }
                } else {
                    // Mostrar detalhes do erro
                    const errorMsg = ticketTypesResponse.data?.message || ticketTypesResponse.data?.error || 'Erro desconhecido';
                    console.log(`   ❌ Erro ao buscar ticket types: Status ${ticketTypesResponse.status}`);
                    console.log(`   💡 Mensagem: ${errorMsg}`);
                    if (ticketTypesResponse.data?.errors) {
                        console.log(`   💡 Detalhes:`, JSON.stringify(ticketTypesResponse.data.errors, null, 2));
                    }
                    // Continuar para o próximo evento
                    continue;
                }
            }
        }
        
        if (eventId && ticketTypeId) {
            createOrderTest.data.eventId = eventId;
            createOrderTest.data.ticketTypeId = ticketTypeId;
            
            // Fazer login para obter token de autenticação
            console.log(`   🔐 Fazendo login para autenticação...`);
            const authToken = await loginAndGetToken();
            
            if (!authToken) {
                console.log(`   ⚠️  Não foi possível fazer login. Pulando teste de criação de pedido.`);
                console.log(`   💡 Certifique-se de que existe um usuário admin@exemplo.com com senha SenhaForte123!`);
            } else {
                console.log(`   ✅ Autenticado com sucesso`);
                console.log(`⏳ Executando: ${createOrderTest.name}...`);
                const orderResult = await runTest(createOrderTest, authToken);
                results.push(orderResult);
                
                if (orderResult.success) {
                    const status = orderResult.responseTime > 1000 ? '⚠️ LENTO' : orderResult.responseTime > 500 ? '⚡ MÉDIO' : '✅ RÁPIDO';
                    console.log(`${status} ${orderResult.name}: ${orderResult.responseTime}ms (DB: ${orderResult.dbTime || 'N/A'}, Processing: ${orderResult.processingTime || 'N/A'})`);
                } else {
                    console.log(`❌ ${orderResult.name}: Falhou - ${orderResult.error || `Status ${orderResult.statusCode}`}`);
                    if (orderResult.statusCode === 400) {
                        console.log(`   💡 Dica: Verifique se os dados do pedido estão corretos (eventId, ticketTypeId, customerData)`);
                    } else if (orderResult.statusCode === 401) {
                        console.log(`   💡 Dica: Verifique se o login foi bem-sucedido e o token é válido`);
                    }
                }
            }
        } else {
            console.log(`   ⚠️  Nenhum evento com ticket types disponíveis encontrado.`);
            console.log(`   💡 Para executar o teste crítico:`);
            console.log(`      1. Execute: npm run populate-test-data-dev`);
            console.log(`      2. Ou crie um evento e ticket types manualmente no banco`);
        }
    } catch (error: any) {
        console.log(`   ❌ Erro ao buscar dados: ${error.message}`);
        console.log(`   💡 Verifique se há dados de teste no banco ou execute: npm run populate-test-data-dev`);
    }

    // Gerar relatório
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE PERFORMANCE');
    console.log('='.repeat(60) + '\n');

    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);

    if (successfulTests.length > 0) {
        console.log('✅ Testes Bem-Sucedidos:');
        console.log('-'.repeat(60));
        successfulTests.forEach(test => {
            const status = test.responseTime > 1000 ? '⚠️ LENTO' : test.responseTime > 500 ? '⚡ MÉDIO' : '✅ RÁPIDO';
            console.log(`${status} ${test.name.padEnd(30)} ${test.responseTime.toString().padStart(6)}ms | DB: ${test.dbTime || 'N/A'} | Processing: ${test.processingTime || 'N/A'}`);
        });
        console.log('');

        const avgResponseTime = successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length;
        const maxResponseTime = Math.max(...successfulTests.map(t => t.responseTime));
        const minResponseTime = Math.min(...successfulTests.map(t => t.responseTime));

        console.log('📈 Estatísticas:');
        console.log(`   Média: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Mínimo: ${minResponseTime}ms`);
        console.log(`   Máximo: ${maxResponseTime}ms`);
        console.log('');
    }

    if (failedTests.length > 0) {
        console.log('❌ Testes Falhados:');
        console.log('-'.repeat(60));
        failedTests.forEach(test => {
            console.log(`   ${test.name}: ${test.error || `Status ${test.statusCode}`}`);
        });
        console.log('');
    }

    // Identificar endpoints lentos
    const slowTests = successfulTests.filter(t => t.responseTime > 1000);
    if (slowTests.length > 0) {
        console.log('⚠️ Endpoints Lentos (> 1s):');
        console.log('-'.repeat(60));
        slowTests.forEach(test => {
            console.log(`   ${test.name}: ${test.responseTime}ms`);
        });
        console.log('');
    }

    // Explicação dos resultados
    console.log('📖 EXPLICAÇÃO DOS RESULTADOS:');
    console.log('-'.repeat(60));
    console.log('✅ RÁPIDO: < 500ms - Performance excelente, sem necessidade de otimização');
    console.log('⚡ MÉDIO: 500ms - 1s - Performance aceitável, considerar cache se necessário');
    console.log('⚠️ LENTO: > 1s - Requer investigação e otimização');
    console.log('');
    console.log('📊 Métricas:');
    console.log('   • DB Time: Tempo gasto em queries MongoDB');
    console.log('   • Processing Time: Tempo de processamento da lógica');
    console.log('   • Response Time: Tempo total da requisição');
    console.log('');

    // Recomendações
    console.log('💡 Recomendações:');
    console.log('-'.repeat(60));
    if (slowTests.length > 0) {
        console.log('   • ⚠️  Investigar endpoints lentos para otimização');
    }
    if (successfulTests.some(t => t.responseTime > 500)) {
        console.log('   • 💾 Considerar implementar cache para endpoints médios');
    }
    if (failedTests.length > 0) {
        console.log('   • 🔧 Corrigir endpoints que estão falhando');
    }
    
    // Análise específica do teste crítico
    const orderTest = results.find(r => r.name.includes('Create Order'));
    if (orderTest) {
        console.log('');
        console.log('🔥 ANÁLISE DO TESTE CRÍTICO (Criação de Pedidos):');
        console.log('-'.repeat(60));
        if (orderTest.success) {
            if (orderTest.responseTime > 2000) {
                console.log('   ⚠️  CRÍTICO: Criação de pedidos está MUITO LENTA (> 2s)');
                console.log('      • Verificar queries paralelas (Event, TicketType, User)');
                console.log('      • Otimizar validação de limites (countPurchasedTicketsByCPFOrEmail)');
                console.log('      • Verificar se batch insert de tickets está funcionando');
                console.log('      • Considerar executar cancelPreviousPendingOrders em background');
            } else if (orderTest.responseTime > 1000) {
                console.log('   ⚠️  ATENÇÃO: Criação de pedidos está lenta (> 1s)');
                console.log('      • Verificar se índices estão sendo usados');
                console.log('      • Considerar cache para validações repetidas');
            } else if (orderTest.responseTime > 500) {
                console.log('   ✅ BOM: Criação de pedidos em tempo aceitável');
                console.log('      • Pode melhorar com cache e otimizações adicionais');
            } else {
                console.log('   ✅ EXCELENTE: Criação de pedidos está rápida!');
            }
        } else {
            console.log('   ❌ ERRO: Teste de criação de pedidos falhou');
            console.log(`      • Motivo: ${orderTest.error || `Status ${orderTest.statusCode}`}`);
            console.log('      • Verificar se há dados de teste no banco (evento e ticket types)');
        }
    } else {
        console.log('');
        console.log('⚠️  TESTE CRÍTICO NÃO EXECUTADO:');
        console.log('   • Verificar se há dados de teste no banco');
        console.log('   • Executar: npm run populate-test-data-dev');
    }
    
    console.log('');
    console.log('   • 📚 Verificar índices no MongoDB para queries lentas');
    console.log('   • 🚀 Considerar usar .lean() em queries de leitura');
    console.log('');

    console.log('='.repeat(60));
}

// Executar análise
runPerformanceAnalysis().catch(error => {
    console.error('❌ Erro ao executar análise de performance:', error);
    process.exit(1);
});

