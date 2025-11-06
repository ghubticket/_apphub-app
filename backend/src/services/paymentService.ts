import { MercadoPagoConfig, Order, Payment } from 'mercadopago';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente (garantir que está carregado antes de usar)
dotenv.config();

// Validar se o Access Token está configurado
const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
if (!accessToken || accessToken === '') {
    console.error('❌ ERRO CRÍTICO: MP_ACCESS_TOKEN não está configurado no .env');
    console.error('   Por favor, adicione MP_ACCESS_TOKEN=SEU_TOKEN no arquivo backend/.env');
    console.error('   Para obter o token, consulte: backend/COMO_CONFIGURAR_CREDENCIAIS.md');
    throw new Error('MP_ACCESS_TOKEN não está configurado. Por favor, configure no arquivo .env antes de iniciar o servidor.');
}

// Log de debug (apenas início do token para segurança)
if (process.env.NODE_ENV !== 'production') {
    console.log('✅ MP_ACCESS_TOKEN carregado:', accessToken.substring(0, 20) + '...');
    console.log('✅ Tamanho do token:', accessToken.length, 'caracteres');
}

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
        timeout: 10000 // 10 segundos para operações críticas
    }
});

// Verificar se o cliente foi criado corretamente
if (process.env.NODE_ENV !== 'production') {
    try {
        // Tentar acessar o token do cliente (se o SDK permitir)
        console.log('✅ Cliente Mercado Pago configurado');
    } catch (e) {
        console.warn('⚠️ Aviso ao verificar cliente:', e);
    }
}

// Usar Orders API (modelo mais recente) - Modo automático
const order = new Order(client);

// Mantém Payment para compatibilidade com getPaymentById e webhooks
const payment = new Payment(client);

// Tempo de expiração do PIX (30 minutos em milissegundos)
const PIX_EXPIRATION_MINUTES = 30;
const PIX_EXPIRATION_MS = PIX_EXPIRATION_MINUTES * 60 * 1000;

export interface CreatePixPaymentParams {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    customerData: {
        name: string;
        email: string;
        cpf: string;
        phone?: string;
        address?: {
            street_name?: string;
            street_number?: string;
            zip_code?: string;
            city?: string;
            state?: string;
        };
    };
    description: string;
    items: Array<{
        title: string;
        description?: string;
        quantity: number;
        unit_price: number;
        category?: string;
    }>;
    deviceId?: string; // Device ID do frontend (X-meli-session-id)
}

export interface CreateCardPaymentParams {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    token: string; // Token gerado pelo frontend (MercadoPago.js)
    description: string;
    installments: number;
    paymentMethodId: string; // 'visa', 'master', etc.
    customerData: {
        email: string;
        name: string;
        cpf: string;
        phone?: string;
        address?: {
            street_name?: string;
            street_number?: string;
            zip_code?: string;
            city?: string;
            state?: string;
        };
    };
    items: Array<{
        title: string;
        description?: string;
        quantity: number;
        unit_price: number;
        category?: string;
    }>;
    issuerId?: string; // ID do banco emissor (para cartão)
    deviceId?: string; // Device ID do frontend (X-meli-session-id)
}

/**
 * Validações de segurança para pagamento
 */
const validatePaymentData = (params: CreatePixPaymentParams | CreateCardPaymentParams) => {
    const errors: string[] = [];

    // Validar valor
    if (params.totalAmount <= 0) {
        errors.push('Valor do pagamento deve ser maior que zero');
    }
    if (params.totalAmount > 100000) { // Limite de segurança
        errors.push('Valor do pagamento excede o limite permitido');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.customerData.email)) {
        errors.push('Email inválido');
    }

    // Validar CPF (11 dígitos)
    const cpf = params.customerData.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
        errors.push('CPF inválido');
    }

    // Validar nome
    if (!params.customerData.name || params.customerData.name.trim().length < 3) {
        errors.push('Nome deve ter pelo menos 3 caracteres');
    }

    // Validações específicas para cartão
    if ('token' in params) {
        if (!params.token || params.token.length < 10) {
            errors.push('Token do cartão inválido');
        }
        if (params.installments < 1 || params.installments > 12) {
            errors.push('Número de parcelas inválido (1-12)');
        }
        if (!params.paymentMethodId) {
            errors.push('Método de pagamento inválido');
        }
    }

    if (errors.length > 0) {
        throw new Error(`Validação falhou: ${errors.join(', ')}`);
    }
};

/**
 * Cria um pagamento PIX no Mercado Pago usando Orders API (Checkout Transparente)
 * Retorna QR Code e informações de expiração
 * 
 * Modo: AUTOMÁTICO (processing_mode: 'automatic')
 * 
 * Implementa recomendações do Mercado Pago para melhorar taxa de aprovação:
 * - Additional info completo (comprador, produtos, indústria)
 * - Device ID para rastreamento de segurança
 */
export const createPixPayment = async (params: CreatePixPaymentParams, deviceId?: string) => {
    try {
        // Re-validar token (pode ter mudado após inicialização)
        const currentToken = process.env.MP_ACCESS_TOKEN?.trim() || accessToken;
        
        // Validar se o Access Token está configurado
        if (!currentToken || currentToken === '') {
            throw new Error('MP_ACCESS_TOKEN não está configurado. Por favor, adicione MP_ACCESS_TOKEN no arquivo .env');
        }
        
        // Log de debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 Criando pagamento PIX com token:', currentToken.substring(0, 20) + '...');
        }
        
        // Recriar cliente com token atualizado (garantir que o token está sendo usado)
        const currentClient = new MercadoPagoConfig({
            accessToken: currentToken,
            options: {
                timeout: 10000
            }
        });
        
        // Verificar se o cliente foi criado corretamente
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 DEBUG - Token passado para cliente:', currentToken.substring(0, 30) + '...');
            console.log('🔍 DEBUG - Token no cliente após criação:', currentClient.accessToken ? currentClient.accessToken.substring(0, 30) + '...' : 'NÃO TEM TOKEN');
            console.log('🔍 DEBUG - Token completo tem', currentToken.length, 'caracteres');
        }
        
        // Criar instância de Order com cliente atualizado
        const currentOrder = new Order(currentClient);

        // Validar dados
        validatePaymentData(params);

        const { orderId, orderNumber, totalAmount, customerData, description, items } = params;

        // Calcular data de expiração
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + PIX_EXPIRATION_MS);

        // Preparar dados do comprador
        const firstName = customerData.name.split(' ')[0] || customerData.name;
        const lastName = customerData.name.split(' ').slice(1).join(' ') || firstName;

        // Criar Order usando Orders API (modo automático)
        // Estrutura simplificada conforme documentação Orders API
        const orderData = {
            type: 'online',
            processing_mode: 'automatic',
            total_amount: String(totalAmount),
            external_reference: orderId,
            payer: {
                email: customerData.email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: 'CPF',
                    number: customerData.cpf.replace(/\D/g, '')
                },
                phone: customerData.phone ? {
                    area_code: customerData.phone.replace(/\D/g, '').substring(0, 2),
                    number: customerData.phone.replace(/\D/g, '').substring(2)
                } : undefined
            },
            transactions: {
                payments: [
                    {
                        amount: String(totalAmount),
                        payment_method: {
                            id: 'pix',
                            type: 'bank_transfer'
                        }
                    }
                ]
            }
        };

        // Criar opções com Device ID e Idempotency Key
        // X-Idempotency-Key é obrigatório conforme documentação
        const idempotencyKey = `${orderId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        const options: any = {
            body: orderData as any,
            requestOptions: {
                headers: {
                    'X-Idempotency-Key': idempotencyKey,
                    // Garantir que o token está no header (o SDK deveria fazer isso, mas vamos forçar)
                    'Authorization': `Bearer ${currentToken}`
                }
            }
        };

        if (deviceId) {
            options.requestOptions.headers['X-meli-session-id'] = deviceId;
        }
        
        // Log para debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 DEBUG - Headers da requisição:', {
                'X-Idempotency-Key': idempotencyKey.substring(0, 20) + '...',
                'Authorization': 'Bearer ' + currentToken.substring(0, 20) + '...',
                'X-meli-session-id': deviceId || 'não fornecido'
            });
        }

        // Criar Order (modo automático processa imediatamente)
        // Usar a instância atualizada do Order com o token correto
        const response = await currentOrder.create(options);
        const orderResponse = response as any;

        // Log para debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 DEBUG - Resposta completa do Mercado Pago:', JSON.stringify(orderResponse, null, 2));
        }

        // Extrair informações da primeira transação (PIX)
        // Orders API retorna: orderResponse.transactions.payments[0]
        const paymentInfo = orderResponse.transactions?.payments?.[0];

        if (!paymentInfo) {
            throw new Error('Nenhum pagamento encontrado na order');
        }

        // Log detalhado do paymentInfo para debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 DEBUG - Payment Info:', JSON.stringify(paymentInfo, null, 2));
            console.log('🔍 DEBUG - payment_method:', JSON.stringify(paymentInfo.payment_method, null, 2));
        }

        // Extrair QR Code - na Orders API, está em payment_method
        const qrCode = paymentInfo.payment_method?.qr_code;
        const qrCodeBase64 = paymentInfo.payment_method?.qr_code_base64;
        const ticketUrl = paymentInfo.payment_method?.ticket_url;

        return {
            orderId: orderResponse.id, // ID da Order
            paymentId: paymentInfo.id, // ID do Payment
            status: paymentInfo.status,
            statusDetail: paymentInfo.status_detail,
            qrCode: qrCode,
            qrCodeBase64: qrCodeBase64,
            ticketUrl: ticketUrl,
            expiresAt: paymentInfo.date_of_expiration,
            expirationMinutes: PIX_EXPIRATION_MINUTES,
            orderStatus: orderResponse.status // Status da Order
        };
    } catch (error: any) {
        console.error('Erro ao criar pagamento PIX (Orders API):', error);
        
        // Log detalhado para debug
        if (process.env.NODE_ENV !== 'production') {
            console.error('🔍 DEBUG - Token configurado:', accessToken ? 'SIM' : 'NÃO');
            console.error('🔍 DEBUG - Token (primeiros 20 chars):', accessToken?.substring(0, 20) || 'N/A');
            console.error('🔍 DEBUG - Erro completo:', JSON.stringify(error, null, 2));
        }
        
        // Tratamento específico para erro de autenticação
        if (error.message?.includes('authorization') || 
            error.message?.includes('not present') ||
            error.code === 'unauthorized' ||
            (error.response?.data && error.response.data.code === 'unauthorized')) {
            
            console.error('❌ Erro de autenticação com Mercado Pago');
            console.error('   Verifique se o MP_ACCESS_TOKEN está correto no arquivo .env');
            console.error('   Certifique-se de que o servidor foi reiniciado após editar o .env');
            
            throw new Error('MP_ACCESS_TOKEN não está configurado ou é inválido. Verifique o arquivo backend/.env e adicione: MP_ACCESS_TOKEN=SEU_TOKEN. Certifique-se de reiniciar o servidor após editar o .env');
        }
        
        // Tratamento específico para erro de email em sandbox
        if (error.errors && Array.isArray(error.errors)) {
            const sandboxEmailError = error.errors.find((e: any) => e.code === 'invalid_email_for_sandbox');
            if (sandboxEmailError) {
                throw new Error(`Email inválido para ambiente de teste. Em sandbox, o email deve terminar com '@testuser.com'. Email usado: ${params.customerData.email}`);
            }
            
            // Tratamento para outros erros específicos
            const errorMessages = error.errors.map((e: any) => e.message || e.code).join(', ');
            throw new Error(`Erro do Mercado Pago: ${errorMessages}`);
        }
        
        // Tratamento para outros erros do Mercado Pago
        if (error.response?.data) {
            const mpError = error.response.data;
            if (mpError.errors && Array.isArray(mpError.errors)) {
                const errorMessages = mpError.errors.map((e: any) => e.message || e.code).join(', ');
                throw new Error(`Erro do Mercado Pago: ${errorMessages}`);
            }
            throw new Error(`Erro do Mercado Pago: ${mpError.message || JSON.stringify(mpError)}`);
        }
        
        throw new Error(`Erro ao criar pagamento PIX: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Cria um pagamento com cartão de crédito/débito usando Orders API (Checkout Transparente)
 * Recebe o token gerado pelo frontend via MercadoPago.js
 * 
 * Modo: AUTOMÁTICO (processing_mode: 'automatic')
 * 
 * Implementa recomendações do Mercado Pago para melhorar taxa de aprovação:
 * - Additional info completo (comprador, produtos, indústria)
 * - Device ID para rastreamento de segurança
 * - 3D Secure automático
 */
export const createCardPayment = async (params: CreateCardPaymentParams, deviceId?: string) => {
    try {
        // Re-validar token (pode ter mudado após inicialização)
        const currentToken = process.env.MP_ACCESS_TOKEN?.trim() || accessToken;
        
        // Validar se o Access Token está configurado
        if (!currentToken || currentToken === '') {
            throw new Error('MP_ACCESS_TOKEN não está configurado. Por favor, adicione MP_ACCESS_TOKEN no arquivo .env');
        }
        
        // Recriar cliente com token atualizado (garantir que o token está sendo usado)
        const currentClient = new MercadoPagoConfig({
            accessToken: currentToken,
            options: {
                timeout: 10000
            }
        });
        
        // Criar instância de Order com cliente atualizado
        const currentOrder = new Order(currentClient);
        
        // Validar dados
        validatePaymentData(params);

        const { orderId, orderNumber, totalAmount, token, description, installments, paymentMethodId, customerData, issuerId, items } = params;

        // Preparar dados do comprador
        const firstName = customerData.name.split(' ')[0] || customerData.name;
        const lastName = customerData.name.split(' ').slice(1).join(' ') || firstName;

        // Determinar payment_type_id baseado no payment_method_id
        const paymentTypeId = paymentMethodId === 'debit_card' ? 'debit_card' : 'credit_card';

        // Criar Order usando Orders API (modo automático)
        // Conforme documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-integration/cards
        const orderData = {
            type: 'online', // Tipo de order (online para pagamentos online)
            processing_mode: 'automatic', // Modo automático - processa imediatamente
            total_amount: String(totalAmount), // Valor total da order
            external_reference: orderId,
            payer: {
                email: customerData.email
            },
            transactions: {
                payments: [
                    {
                        amount: String(totalAmount),
                        payment_method: {
                            id: paymentMethodId, // Bandeira do cartão (visa, master, etc.)
                            type: paymentTypeId, // credit_card ou debit_card
                            token: token,
                            installments: installments
                        },
                        payer: {
                            email: customerData.email,
                            first_name: firstName,
                            last_name: lastName,
                            identification: {
                                type: 'CPF',
                                number: customerData.cpf.replace(/\D/g, '')
                            },
                            phone: customerData.phone ? {
                                area_code: customerData.phone.replace(/\D/g, '').substring(0, 2),
                                number: customerData.phone.replace(/\D/g, '').substring(2)
                            } : undefined
                        },
                        additional_info: {
                            items: items.map(item => ({
                                id: item.title.substring(0, 50),
                                title: item.title,
                                description: item.description || item.title,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                category: item.category || 'tickets',
                                category_id: 'tickets'
                            })),
                            payer: {
                                first_name: firstName,
                                last_name: lastName,
                                phone: customerData.phone ? {
                                    area_code: customerData.phone.replace(/\D/g, '').substring(0, 2),
                                    number: customerData.phone.replace(/\D/g, '').substring(2)
                                } : undefined,
                                address: customerData.address ? {
                                    zip_code: customerData.address.zip_code?.replace(/\D/g, ''),
                                    street_name: customerData.address.street_name,
                                    street_number: customerData.address.street_number
                                } : undefined,
                                registration_date: new Date().toISOString().split('T')[0]
                            },
                            shipments: {
                                receiver_address: customerData.address ? {
                                    zip_code: customerData.address.zip_code?.replace(/\D/g, ''),
                                    street_name: customerData.address.street_name,
                                    street_number: customerData.address.street_number,
                                    city_name: customerData.address.city,
                                    state_name: customerData.address.state
                                } : undefined
                            }
                        }
                        // issuer_id pode ser adicionado no payment_method se necessário
                    }
                ]
            },
            metadata: {
                order_id: orderId,
                order_number: orderNumber
            }
        };

        // Criar opções com Device ID e Idempotency Key
        // X-Idempotency-Key é obrigatório conforme documentação
        const idempotencyKey = `${orderId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        const options: any = {
            body: orderData as any,
            requestOptions: {
                headers: {
                    'X-Idempotency-Key': idempotencyKey,
                    // Garantir que o token está no header (mesmo que o SDK deva fazer isso)
                    'Authorization': `Bearer ${currentToken}`
                }
            }
        };

        if (deviceId) {
            options.requestOptions.headers['X-meli-session-id'] = deviceId;
        }

        // Criar Order (modo automático processa imediatamente)
        // Usar a instância atualizada do Order com o token correto
        const response = await currentOrder.create(options);
        const orderResponse = response as any;

        // Extrair informações da primeira transação (cartão)
        // Orders API retorna: orderResponse.transactions.payments[0]
        const paymentInfo = orderResponse.transactions?.payments?.[0];

        if (!paymentInfo) {
            throw new Error('Nenhum pagamento encontrado na order');
        }

        return {
            orderId: orderResponse.id, // ID da Order
            paymentId: paymentInfo.id, // ID do Payment
            status: paymentInfo.status,
            statusDetail: paymentInfo.status_detail,
            transactionAmount: paymentInfo.transaction_amount || totalAmount,
            dateApproved: paymentInfo.date_approved,
            dateCreated: paymentInfo.date_created || orderResponse.date_created,
            paymentMethodId: paymentInfo.payment_method_id || paymentMethodId,
            paymentTypeId: paymentInfo.payment_type_id || paymentTypeId,
            installments: paymentInfo.installments || installments,
            orderStatus: orderResponse.status, // Status da Order
            // Informações de 3D Secure se aplicável
            threeDSInfo: paymentInfo.three_ds_info
        };
    } catch (error: any) {
        console.error('Erro ao criar pagamento com cartão (Orders API):', error);
        throw new Error(`Erro ao criar pagamento: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Busca informações de uma Order pelo ID (Orders API)
 */
export const getOrderById = async (orderId: string) => {
    try {
        const response = await order.get({ id: orderId });
        return response as any;
    } catch (error: any) {
        console.error('Erro ao buscar order:', error);
        throw new Error(`Erro ao buscar order: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Busca informações de um pagamento pelo ID (mantido para compatibilidade)
 */
export const getPaymentById = async (paymentId: string) => {
    try {
        const response = await payment.get({ id: paymentId });
        return response as any;
    } catch (error: any) {
        console.error('Erro ao buscar pagamento:', error);
        throw new Error(`Erro ao buscar pagamento: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Verifica se um pagamento PIX expirou
 */
export const isPixPaymentExpired = (expiresAt: string | Date): boolean => {
    const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return expirationDate < new Date();
};

// Importar mapeador de status (mantido para compatibilidade)
export { mapPaymentStatus } from '../utils/paymentStatusMapper';

/**
 * Mapeia método de pagamento do Mercado Pago
 */
export const mapPaymentMethod = (paymentTypeId: string, paymentMethodId?: string): 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' => {
    if (paymentTypeId === 'credit_card') return 'credit_card';
    if (paymentTypeId === 'debit_card') return 'debit_card';
    if (paymentTypeId === 'bank_transfer' && paymentMethodId === 'pix') return 'pix';
    if (paymentTypeId === 'ticket') return 'bank_slip';
    
    return 'credit_card'; // Default
};

/**
 * Processa notificação de webhook do Mercado Pago
 * Retorna informações do pagamento atualizado
 */
export const processWebhookNotification = async (data: any) => {
    try {
        const { type, data: notificationData } = data;

        if (type === 'payment') {
            const paymentId = notificationData.id;
            const paymentInfo = await getPaymentById(paymentId);

            return {
                paymentId: paymentInfo.id,
                status: paymentInfo.status,
                statusDetail: paymentInfo.status_detail,
                paymentMethodId: paymentInfo.payment_method_id,
                paymentTypeId: paymentInfo.payment_type_id,
                transactionAmount: paymentInfo.transaction_amount,
                dateApproved: paymentInfo.date_approved,
                dateCreated: paymentInfo.date_created,
                externalReference: paymentInfo.external_reference,
                metadata: paymentInfo.metadata
            };
        }

        return null;
    } catch (error: any) {
        console.error('Erro ao processar notificação:', error);
        throw new Error(`Erro ao processar notificação: ${error.message || 'Erro desconhecido'}`);
    }
};
