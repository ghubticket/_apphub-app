import { MercadoPagoConfig, Order, Payment } from 'mercadopago';
import { isValidCpf as isValidCpfBackend, normalizeCpf as normalizeCpfBackend } from '../utils/cpf';
import { getPaymentStatusInfo } from '../utils/paymentStatusMapper';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente (garantir que está carregado antes de usar)
dotenv.config();

/**
 * Obtém e valida o token do Mercado Pago
 * Validação lazy - só valida quando realmente necessário
 */
function getAccessToken(): string {
    const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
    if (!accessToken || accessToken === '') {
        throw new Error(
            'MP_ACCESS_TOKEN não está configurado. Por favor, configure no arquivo .env antes de usar o serviço de pagamento.'
        );
    }
    return accessToken;
}

/**
 * Cria um cliente Mercado Pago configurado
 * Usado internamente pelas funções de pagamento
 */
function createMercadoPagoClient(): MercadoPagoConfig {
    const accessToken = getAccessToken();

    return new MercadoPagoConfig({
        accessToken: accessToken,
        options: {
            timeout: 10000, // 10 segundos para operações críticas
        },
    });
}

// Tempo de expiração do PIX (30 minutos em milissegundos)
const PIX_EXPIRATION_MINUTES = 30;
const PIX_EXPIRATION_MS = PIX_EXPIRATION_MINUTES * 60 * 1000;
const MP_PIX_EXPIRATION_ISO = 'PT30M';

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
        id?: string;
        title: string;
        description?: string;
        quantity: number;
        unit_price: number;
        category?: string;
        category_id?: string;
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
    cardholder?: {
        name?: string;
        email?: string;
        identification?: {
            type?: string;
            number?: string;
        };
    };
    items: Array<{
        id?: string;
        title: string;
        description?: string;
        quantity: number;
        unit_price: number;
        category?: string;
        category_id?: string;
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
    if (params.totalAmount > 100000) {
        // Limite de segurança
        errors.push('Valor do pagamento excede o limite permitido');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.customerData.email)) {
        errors.push('Email inválido');
    }

    // Validar CPF (11 dígitos) - apenas se fornecido
    const identificationType =
        'cardholder' in params && params.cardholder?.identification?.type
            ? String(params.cardholder.identification.type).toUpperCase()
            : 'CPF';
    const docNumberRaw =
        'cardholder' in params && params.cardholder?.identification?.number
            ? params.cardholder.identification.number
            : params.customerData.cpf;

    if (identificationType === 'CPF' && docNumberRaw) {
        // Só validar CPF se foi fornecido (não vazio/null/undefined)
        const docNumber = normalizeCpfBackend(docNumberRaw);
        if (docNumber && docNumber.length > 0) {
            const isProd = (process.env.NODE_ENV || 'development') === 'production';
            const isSandboxToken = (process.env.MP_ACCESS_TOKEN || '').startsWith('TEST-');

            // Em produção com token real, aplicar validação completa do dígito verificador
            // Em sandbox/dev, aceitar qualquer CPF com 11 dígitos para não bloquear testes
            if (isProd && !isSandboxToken && !isValidCpfBackend(docNumber)) {
                errors.push('CPF inválido');
            } else if (docNumber.length !== 11) {
                errors.push('CPF deve ter 11 dígitos');
            }
        }
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
export const createPixPayment = async (
    params: CreatePixPaymentParams,
    deviceId?: string
): Promise<any> => {
    try {
        // Criar cliente Mercado Pago (validação lazy do token)
        const currentClient = createMercadoPagoClient();
        const currentToken = getAccessToken();

        // Criando pagamento PIX

        // Criar instância de Order com cliente
        const currentOrder = new Order(currentClient);

        // Validar dados
        validatePaymentData(params);

        const { orderId, orderNumber, totalAmount, customerData, description, items } = params;

        // CRÍTICO: Validar que totalAmount está presente e é um número válido
        if (totalAmount === undefined || totalAmount === null || isNaN(Number(totalAmount))) {
            throw new Error(
                `totalAmount é obrigatório e deve ser um número válido. Recebido: ${totalAmount} (tipo: ${typeof totalAmount})`
            );
        }

        // Garantir que totalAmount é um número
        const numericTotalAmount = Number(totalAmount);
        if (numericTotalAmount <= 0) {
            throw new Error(`totalAmount deve ser maior que zero. Recebido: ${numericTotalAmount}`);
        }

        // Calcular data de expiração
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + PIX_EXPIRATION_MS);

        // Preparar dados do comprador
        const firstName = customerData.name.split(' ')[0] || customerData.name;
        const lastName = customerData.name.split(' ').slice(1).join(' ') || firstName;

        // OTIMIZAÇÃO: Converter email para sandbox se necessário
        // CRÍTICO: Verificar se estamos usando sandbox por múltiplos métodos:
        // 1. Variável de ambiente MP_SANDBOX=true (forçar sandbox)
        // 2. Token começa com "TEST-" (token de teste do MP)
        // 3. NODE_ENV !== 'production' (ambiente de desenvolvimento)
        let payerEmail = customerData.email;
        const forceSandbox = process.env.MP_SANDBOX === 'true' || process.env.MP_SANDBOX === '1';
        const isSandbox =
            forceSandbox ||
            currentToken.startsWith('TEST-') ||
            process.env.NODE_ENV !== 'production';

        // Log para debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('PIX Payment - Sandbox check:', {
                nodeEnv: process.env.NODE_ENV,
                currentTokenPrefix: currentToken.substring(0, 10),
            });
        }

        if (isSandbox && !payerEmail.endsWith('@testuser.com')) {
            // Extrair o nome do email original (antes do @) e adicionar @testuser.com
            const emailName = payerEmail.split('@')[0] || 'test';
            payerEmail = `${emailName}@testuser.com`;
        } else if (isSandbox && payerEmail.endsWith('@testuser.com')) {
            // Email já está no formato correto para sandbox
        } else {
            // Produção - manter email original
        }

        // Criar Order usando Orders API (modo automático)
        // Estrutura simplificada conforme documentação Orders API
        // CRÍTICO: Usar numericTotalAmount validado em vez de totalAmount direto
        // e normalizar para DUAS casas decimais (ex.: 6.300000000000001 -> 6.30)
        const normalizedAmount = Number(numericTotalAmount.toFixed(2));

        const orderData = {
            type: 'online',
            processing_mode: 'automatic',
            // Orders API aceita string em total_amount; manter como string normalizada
            total_amount: String(normalizedAmount),
            external_reference: orderId,
            payer: {
                email: payerEmail,
                first_name: firstName,
                last_name: lastName,
                // CPF é opcional - só incluir em PRODUÇÃO com token real e CPF válido
                ...(() => {
                    const digits = normalizeCpfBackend(customerData.cpf || '');
                    const isProd = (process.env.NODE_ENV || 'development') === 'production';
                    const token = getAccessToken();
                    const isSandboxToken = token.startsWith('TEST-');

                    if (
                        isProd &&
                        !isSandboxToken &&
                        digits.length === 11 &&
                        isValidCpfBackend(digits)
                    ) {
                        return {
                            identification: {
                                type: 'CPF',
                                number: digits,
                            },
                        };
                    }
                    return {};
                })(),
                phone: customerData.phone
                    ? (() => {
                          // Normalizar telefone: manter apenas dígitos e limitar a 11 (DDD + número)
                          const allDigits = customerData.phone.replace(/\D/g, '').slice(0, 11);
                          const areaCode = allDigits.substring(0, 2);
                          const phoneNumber = allDigits.substring(2);

                          // Validar telefone antes de incluir
                          // area_code deve ter 2 dígitos, number deve ter entre 8 e 9 dígitos
                          if (
                              areaCode.length === 2 &&
                              phoneNumber.length >= 8 &&
                              phoneNumber.length <= 9
                          ) {
                              return {
                                  area_code: areaCode,
                                  number: phoneNumber,
                              };
                          }
                          // Se telefone inválido, não incluir (opcional no MP)
                          return undefined;
                      })()
                    : undefined,
            },
            transactions: {
                payments: [
                    {
                        // amount também deve ser string na Orders API (alinhado com total_amount)
                        amount: String(normalizedAmount),
                        payment_method: {
                            id: 'pix',
                            type: 'bank_transfer',
                        },
                        // Orders API aceita expiration_time (ISO-8601 duration)
                        // Aqui fixamos em 30 minutos para alinhar com o comportamento oficial do MP
                        expiration_time: MP_PIX_EXPIRATION_ISO,
                    },
                ],
            },
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
                    Authorization: `Bearer ${currentToken}`,
                },
            },
        };

        if (deviceId) {
            options.requestOptions.headers['X-meli-session-id'] = deviceId;
        }

        // Log para debug - payload completo antes de enviar
        if (process.env.NODE_ENV !== 'production') {
            console.log('PIX Payment - Request headers:', {
                'X-Idempotency-Key': idempotencyKey.substring(0, 20) + '...',
                Authorization: 'Bearer ' + currentToken.substring(0, 20) + '...',
                'X-meli-session-id': deviceId || 'não fornecido',
            });
        }

        // Criar Order (modo automático processa imediatamente)
        // Usar a instância atualizada do Order com o token correto
        const response = await currentOrder.create(options);
        const orderResponse = response as any;

        // Extrair informações da primeira transação (PIX)
        // Orders API retorna: orderResponse.transactions.payments[0]
        const paymentInfo = orderResponse.transactions?.payments?.[0];

        if (!paymentInfo) {
            throw new Error('Nenhum pagamento encontrado na order');
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
            orderStatus: orderResponse.status, // Status da Order
        };
    } catch (error: any) {
        // Log detalhado do erro para debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('PIX Payment Error:', {
                message: error?.message,
                code: error?.code,
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                responseData: error?.response?.data,
                errors: error?.errors,
                requestInfo: {
                    orderId: params.orderId,
                    totalAmount: params.totalAmount,
                    customerEmail: params.customerData.email,
                    customerName: params.customerData.name,
                    hasPhone: !!params.customerData.phone,
                    hasCpf: !!params.customerData.cpf,
                },
            });
        }

        // Tratamento específico para erro de autenticação
        if (
            error.message?.includes('authorization') ||
            error.message?.includes('not present') ||
            error.code === 'unauthorized' ||
            (error.response?.data && error.response.data.code === 'unauthorized')
        ) {
            throw new Error(
                'MP_ACCESS_TOKEN não está configurado ou é inválido. Verifique o arquivo backend/.env e adicione: MP_ACCESS_TOKEN=SEU_TOKEN. Certifique-se de reiniciar o servidor após editar o .env'
            );
        }

        // Tratamento específico para erro de email em sandbox
        // NOTA: Este erro não deveria ocorrer se a conversão de email estiver funcionando corretamente
        // Mas se ocorrer, significa que a conversão falhou ou não foi aplicada
        if (error.errors && Array.isArray(error.errors)) {
            const sandboxEmailError = error.errors.find(
                (e: any) => e.code === 'invalid_email_for_sandbox'
            );
            if (sandboxEmailError) {
                // CRÍTICO: Se recebemos erro de email sandbox, significa que estamos em sandbox
                // mas a conversão não foi aplicada. Converter agora e tentar novamente.// Converter email para sandbox
                let fallbackEmail = params.customerData.email;
                if (!fallbackEmail.endsWith('@testuser.com')) {
                    const emailName = fallbackEmail.split('@')[0] || 'test';
                    fallbackEmail = `${emailName}@testuser.com`;// Tentar novamente com email convertido (recursão controlada)
                    // Atualizar params com email convertido
                    const retryParams = {
                        ...params,
                        customerData: {
                            ...params.customerData,
                            email: fallbackEmail,
                        },
                    };

                    // Tentar criar pagamento novamente com email convertido
                    // Usar um flag para evitar loop infinito
                    if (!(error as any).__retryAttempted) {
                        (error as any).__retryAttempted = true;return createPixPayment(retryParams, deviceId);
                    }
                }

                // Se já tentou ou email já está convertido, lançar erro
                throw new Error(
                    `Email inválido para ambiente de teste. Em sandbox, o email deve terminar com '@testuser.com'. Email usado: ${params.customerData.email}. Email convertido: ${fallbackEmail}`
                );
            }

            // Tratamento para outros erros específicos - incluir mais detalhes
            const errorDetails = error.errors.map((e: any) => {
                const detail: any = {
                    message: e.message || e.code || 'Erro desconhecido',
                    code: e.code,
                };
                // Incluir campo/propriedade se disponível
                if (e.field) detail.field = e.field;
                if (e.property) detail.property = e.property;
                if (e.path) detail.path = e.path;
                return detail;
            });

            const errorMessages = errorDetails
                .map((e: any) => {
                    const fieldInfo = e.field || e.property || e.path || e.parameter;
                    if (fieldInfo) {
                        return `${e.message} (campo: ${fieldInfo})`;
                    }
                    return e.message;
                })
                .join(', ');
            throw new Error(`Erro do Mercado Pago: ${errorMessages}`);
        }

        // Tratamento para outros erros do Mercado Pago
        if (error.response?.data) {
            const mpError = error.response.data;
            if (mpError.errors && Array.isArray(mpError.errors)) {
                const errorDetails = mpError.errors.map((e: any) => {
                    const detail: any = {
                        message: e.message || e.code || 'Erro desconhecido',
                        code: e.code,
                    };
                    // Incluir campo/propriedade se disponível
                    if (e.field) detail.field = e.field;
                    if (e.property) detail.property = e.property;
                    if (e.path) detail.path = e.path;
                    return detail;
                });

                const errorMessages = errorDetails
                    .map((e: any) => {
                        const fieldInfo = e.field || e.property || e.path || e.parameter;
                        if (fieldInfo) {
                            return `${e.message} (campo: ${fieldInfo})`;
                        }
                        return e.message;
                    })
                    .join(', ');
                console.log('Mercado Pago Error Details:', JSON.stringify(errorDetails, null, 2));
                throw new Error(`Erro do Mercado Pago: ${errorMessages}`);
                throw new Error(`Erro do Mercado Pago: ${errorMessages}`);
            }
            throw new Error(`Erro do Mercado Pago: ${mpError.message || JSON.stringify(mpError)}`);
        }

        throw new Error(`Erro ao criar pagamento PIX: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Helper function para obter mensagem amigável de status_detail
 * Agora usa o mapeamento centralizado do paymentStatusMapper
 */
const mapMpRejection = (statusDetail?: string, status?: string) => {
    if (!statusDetail) {
        return 'Pagamento recusado pelo emissor. Tente outro cartão ou entre em contato com o banco.';
    }
    const statusInfo = getPaymentStatusInfo(status || 'rejected', statusDetail);
    return statusInfo.userMessage;
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
        // Criar cliente Mercado Pago (validação lazy do token)
        const currentClient = createMercadoPagoClient();
        const currentToken = getAccessToken();

        // Criar instância de Order com cliente
        const currentOrder = new Order(currentClient);

        // Validar dados
        validatePaymentData(params);

        const {
            orderId,
            orderNumber,
            totalAmount,
            token,
            description,
            installments,
            paymentMethodId,
            customerData,
            issuerId,
            items,
            cardholder,
        } = params;

        // Preparar dados do comprador
        // Validar e limpar nome (remover espaços extras, garantir mínimo de caracteres)
        const fallbackName =
            cardholder?.name && cardholder.name.trim().length > 0
                ? cardholder.name.trim()
                : customerData.name.trim();

        if (fallbackName.length < 2) {
            throw new Error('Nome do cliente deve ter pelo menos 2 caracteres');
        }

        const firstName = fallbackName.split(' ')[0] || fallbackName;
        const lastName = fallbackName.split(' ').slice(1).join(' ') || firstName;

        // Garantir que firstName e lastName não estão vazios
        if (!firstName || firstName.trim().length === 0) {
            throw new Error('Nome do cliente inválido: primeiro nome não pode estar vazio');
        }
        if (!lastName || lastName.trim().length === 0) {
            // Se lastName estiver vazio, usar firstName como fallback
            const fallbackLastName = firstName;}

        const identificationType = (cardholder?.identification?.type || 'CPF').toUpperCase();
        const identificationNumberRaw = cardholder?.identification?.number || customerData.cpf;
        const identificationNumber =
            identificationType === 'CPF'
                ? normalizeCpfBackend(identificationNumberRaw || '')
                : (identificationNumberRaw || '').replace(/\D/g, '');

        // Determinar payment_type_id baseado no payment_method_id
        const paymentTypeId = paymentMethodId === 'debit_card' ? 'debit_card' : 'credit_card';

        // OTIMIZAÇÃO: Converter email para sandbox se necessário
        // CRÍTICO: Verificar se estamos usando sandbox por múltiplos sinais:
        // 1. Variável de ambiente MP_SANDBOX=true (forçar sandbox mesmo com APP_USR)
        // 2. Access token começa com "TEST-" (token de teste do MP)
        // 3. NODE_ENV !== 'production' (ambiente local/dev)
        let payerEmail = cardholder?.email || customerData.email;
        const forceSandbox = process.env.MP_SANDBOX === 'true' || process.env.MP_SANDBOX === '1';
        const isSandbox =
            forceSandbox ||
            currentToken.startsWith('TEST-') ||
            process.env.NODE_ENV !== 'production';

        if (isSandbox && !payerEmail.endsWith('@testuser.com')) {
            // Extrair o nome do email original (antes do @) e adicionar @testuser.com
            const emailName = payerEmail.split('@')[0] || 'test';
            payerEmail = `${emailName}@testuser.com`;
        }

        // Criar Order usando Orders API (modo automático)
        // Conforme documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-integration/cards
        const orderData = {
            type: 'online', // Tipo de order (online para pagamentos online)
            processing_mode: 'automatic', // Modo automático - processa imediatamente
            total_amount: String(totalAmount), // Valor total da order
            external_reference: orderId,
            payer: {
                email: payerEmail,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: identificationType,
                    number: identificationNumber,
                },
                phone: customerData.phone
                    ? (() => {
                          const phoneDigits = customerData.phone.replace(/\D/g, '');
                          const areaCode = phoneDigits.substring(0, 2);
                          const phoneNumber = phoneDigits.substring(2);

                          // Validar telefone antes de incluir
                          // area_code deve ter 2 dígitos, number deve ter pelo menos 8 dígitos
                          if (areaCode.length === 2 && phoneNumber.length >= 8) {
                              return {
                                  area_code: areaCode,
                                  number: phoneNumber,
                              };
                          }
                          // Se telefone inválido, não incluir (opcional no MP)
                          return undefined;
                      })()
                    : undefined,
            },
            transactions: {
                payments: [
                    {
                        amount: String(totalAmount),
                        payment_method: {
                            id: paymentMethodId, // Bandeira do cartão (visa, master, etc.)
                            type: paymentTypeId, // credit_card ou debit_card
                            token,
                            installments,
                        },
                    },
                ],
            },
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
                    Authorization: `Bearer ${currentToken}`,
                },
            },
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

        const paymentStatus = String(paymentInfo.status || '').toLowerCase();
        const paymentStatusDetail = paymentInfo.status_detail || paymentInfo.status_reason;
        const normalizedDetail =
            typeof paymentStatusDetail === 'string' ? paymentStatusDetail.toLowerCase() : '';
        const isProcessedAccredited =
            paymentStatus === 'processed' && normalizedDetail === 'accredited';
        const allowedStatuses = new Set(['approved', 'authorized', 'in_process', 'pending']);

        if (paymentStatus && !allowedStatuses.has(paymentStatus) && !isProcessedAccredited) {
            // Usar mapeamento centralizado para obter mensagem amigável
            const statusInfo = getPaymentStatusInfo(paymentStatus, paymentStatusDetail || '');
            const userMessage = statusInfo.userMessage;
            const detailPayload = {
                status: paymentInfo.status,
                status_detail: paymentStatusDetail,
                payment_id: paymentInfo.id,
                order_id: orderResponse.id,
            };
            const rejectionError = new Error(userMessage);
            (rejectionError as any).mpErrors = [userMessage, paymentStatusDetail].filter(Boolean);
            (rejectionError as any).mpErrorDetails = detailPayload;
            (rejectionError as any).orderResponse = orderResponse;
            (rejectionError as any).response = {
                data: {
                    message: userMessage,
                    status: paymentInfo.status,
                    status_detail: paymentStatusDetail,
                    payment_id: paymentInfo.id,
                    order_id: orderResponse.id,
                },
            };
            throw rejectionError;
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
            threeDSInfo: paymentInfo.three_ds_info,
        };
    } catch (error: any) {
        const debugPayload: Record<string, unknown> = {
            message: error?.message,
            code: error?.code,
        };
        if (error?.response?.data) {
            debugPayload.responseData = error.response.data;
        }
        if (Array.isArray(error?.errors)) {
            debugPayload.errors = error.errors;
        }
        if (error?.orderResponse) {
            debugPayload.orderResponse = error.orderResponse;
        }
        if (process.env.NODE_ENV !== 'production') {
            console.log('Card Payment Error:', JSON.stringify(debugPayload, null, 2));
        }

        if (!error?.response?.data && error?.orderResponse?.transactions?.payments?.[0]) {
            const rejectedPayment = error.orderResponse.transactions.payments[0];
            const statusDetail = rejectedPayment.status_detail || rejectedPayment.status_reason;
            const paymentStatus = rejectedPayment.status || 'rejected';
            // Usar mapeamento centralizado para obter mensagem amigável
            const statusInfo = getPaymentStatusInfo(paymentStatus, statusDetail || '');
            const userMessage = statusInfo.userMessage;
            const detailPayload = {
                status: rejectedPayment.status,
                status_detail: statusDetail,
                payment_id: rejectedPayment.id,
                order_id: error.orderResponse.id,
            };
            const mpError = new Error(userMessage);
            (mpError as any).mpErrors = [userMessage, statusDetail].filter(Boolean);
            (mpError as any).mpErrorDetails = detailPayload;
            (mpError as any).orderResponse = error.orderResponse;
            (mpError as any).response = {
                data: {
                    message: userMessage,
                    status: rejectedPayment.status,
                    status_detail: statusDetail,
                    payment_id: rejectedPayment.id,
                    order_id: error.orderResponse.id,
                },
            };
            throw mpError;
        }

        const responseData = error?.response?.data;
        const fallbackErrors = Array.isArray(error?.errors) ? error.errors : null;
        if (responseData || fallbackErrors) {
            const payloadToProcess = responseData ?? { errors: fallbackErrors };
            // Processando erro do Orders API

            const collectedMessages: string[] = [];

            const pushMessage = (value: unknown) => {
                if (typeof value === 'string' && value.trim().length > 0) {
                    collectedMessages.push(value.trim());
                }
            };

            const payloadString = (() => {
                try {
                    return JSON.stringify(responseData);
                } catch {
                    return String(responseData);
                }
            })();

            const containsIssuerRejection =
                typeof payloadString === 'string' &&
                payloadString.toLowerCase().includes('rejected_by_issuer');

            let issuerMessage: string | null = null;
            if (containsIssuerRejection) {
                const statusInfo = getPaymentStatusInfo('rejected', 'rejected_by_issuer');
                issuerMessage = statusInfo.userMessage;
                collectedMessages.push(issuerMessage);
            }

            if (Array.isArray(payloadToProcess?.errors)) {
                payloadToProcess.errors.forEach((err: any) => {
                    if (!err) return;
                    pushMessage(err.message);
                    pushMessage(err.description);
                    pushMessage(err.cause);
                    pushMessage(err.code);
                    pushMessage(err.error);
                    pushMessage(err.status_detail);
                    if (Array.isArray(err.details)) {
                        err.details.forEach(pushMessage);
                    }
                });
            }

            if (Array.isArray(payloadToProcess?.cause)) {
                payloadToProcess.cause.forEach((err: any) => {
                    if (!err) return;
                    pushMessage(err.description);
                    pushMessage(err.message);
                    pushMessage(err.code);
                    pushMessage(err.error);
                    pushMessage(err.status_detail);
                });
            }

            pushMessage(payloadToProcess?.message);
            pushMessage(payloadToProcess?.error_description);
            pushMessage(payloadToProcess?.error);
            pushMessage(payloadToProcess?.status_detail);

            let normalizedMessages = Array.from(new Set(collectedMessages.filter(Boolean)));

            if (containsIssuerRejection && issuerMessage) {
                const issuerRelated = normalizedMessages.filter(
                    (msg) =>
                        msg.toLowerCase().includes('rejected_by_issuer') || msg === issuerMessage
                );
                const remaining = normalizedMessages.filter(
                    (msg) => !issuerRelated.includes(msg) && msg !== issuerMessage
                );
                normalizedMessages = [issuerMessage, ...issuerRelated, ...remaining];
            }

            // Mensagens de erro normalizadas

            if (!normalizedMessages.length) {
                normalizedMessages.push(
                    'Algo deu errado ao processar seu cartão. Revise os dados ou tente outro cartão.'
                );
            }

            const messageForError = normalizedMessages[0];
            const mpError = new Error(messageForError);
            (mpError as any).mpErrors = normalizedMessages;
            (mpError as any).mpErrorDetails = payloadToProcess;
            (mpError as any).response = {
                data: {
                    message: messageForError,
                    errors: normalizedMessages,
                    details: payloadToProcess,
                },
            };
            throw mpError;
        }

        if (error?.message) {
            const mpError = new Error(`Erro ao criar pagamento: ${error.message}`);
            (mpError as any).mpErrors = [error.message];
            throw mpError;
        }

        const fallbackError = new Error('Erro ao criar pagamento: Erro desconhecido');
        (fallbackError as any).mpErrors = ['Erro desconhecido'];
        (fallbackError as any).response = {
            data: {
                message: 'Erro desconhecido',
                errors: ['Erro desconhecido'],
                details: error,
            },
        };
        throw fallbackError;
    }
};

// Cancela um pagamento no Mercado Pago (quando ainda não aprovado)
export const cancelPaymentById = async (paymentId: string) => {
    try {
        const currentClient = createMercadoPagoClient();
        const paymentApi = new Payment(currentClient);

        // SDK v2: cancel
        const resp = await paymentApi.cancel({ id: paymentId as any } as any);
        return resp;
    } catch (error) {
        // Tentar fallback usando status update (alguns SDKs usam update -> status: 'cancelled')
        try {
            const currentClient = createMercadoPagoClient();
            const paymentApi = new Payment(currentClient);
            const resp = await (paymentApi as any).update({ id: paymentId, status: 'cancelled' });
            return resp;
        } catch (e) {
            throw error;
        }
    }
};

// Cache de orders do Mercado Pago para evitar chamadas duplicadas
// TTL: 5 segundos (suficiente para polling, mas não muito longo)
const mpOrderCache = new Map<string, { data: any; timestamp: number }>();
const MP_ORDER_CACHE_TTL = 5000; // 5 segundos

/**
 * Busca informações de uma Order pelo ID (Orders API)
 * OTIMIZADO: Usa cache para evitar chamadas duplicadas ao Mercado Pago
 */
export const getOrderById = async (orderId: string) => {
    try {
        // Verificar cache primeiro
        const cached = mpOrderCache.get(orderId);
        if (cached && Date.now() - cached.timestamp < MP_ORDER_CACHE_TTL) {
            return cached.data;
        }

        // Buscar do Mercado Pago
        if (process.env.NODE_ENV !== 'production') {
            console.log('Fetching order from MP:', {
                orderId,
                isSandbox: getAccessToken().startsWith('TEST-'),
            });
        }
        const client = createMercadoPagoClient();
        const orderApi = new Order(client);
        const response = await orderApi.get({ id: orderId });

        // Log da estrutura da resposta para debug
        if (process.env.NODE_ENV !== 'production') {
            console.log('MP Order Response Structure:', {
                orderId: (response as any)?.id,
                status: (response as any)?.status,
                hasTransactions: !!(response as any)?.transactions,
                hasPayments: !!(response as any)?.transactions?.payments,
                paymentsCount: (response as any)?.transactions?.payments?.length || 0,
                firstPaymentKeys: (response as any)?.transactions?.payments?.[0]
                    ? Object.keys((response as any).transactions.payments[0])
                    : [],
            });
        }

        // Armazenar no cache
        mpOrderCache.set(orderId, {
            data: response as any,
            timestamp: Date.now(),
        });

        // Limpar cache expirado periodicamente (a cada 10 requisições)
        if (mpOrderCache.size > 100) {
            const now = Date.now();
            for (const [key, value] of mpOrderCache.entries()) {
                if (now - value.timestamp >= MP_ORDER_CACHE_TTL) {
                    mpOrderCache.delete(key);
                }
            }
        }

        return response as any;
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('Error fetching order:', {
                orderId,
                error: error.message,
                isSandbox: getAccessToken().startsWith('TEST-'),
            });
        }
        throw new Error(`Erro ao buscar order: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Cancela uma Order no Mercado Pago (Orders API) - útil para PIX
 */
export const cancelOrderById = async (orderId: string) => {
    try {
        const client = createMercadoPagoClient();
        const orderApi = new Order(client);
        const response = await orderApi.cancel({ id: orderId });
        return response as any;
    } catch (error: any) {throw new Error(`Erro ao cancelar order: ${error.message || 'Erro desconhecido'}`);
    }
};

/**
 * Busca informações de um pagamento pelo ID (mantido para compatibilidade)
 */
export const getPaymentById = async (paymentId: string) => {
    try {
        const client = createMercadoPagoClient();
        const paymentApi = new Payment(client);
        const response = await paymentApi.get({ id: paymentId });
        return response as any;
    } catch (error: any) {
        const mpError = error?.response?.data;
        const message = mpError?.message || error?.message || 'Erro desconhecido';
        if (
            mpError?.error === 'resource not found' ||
            String(message).toLowerCase().includes('resource not found')
        ) {
            // Payment não encontrado
            return null;
        }throw new Error(`Erro ao buscar pagamento: ${message}`);
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
export const mapPaymentMethod = (
    paymentTypeId: string,
    paymentMethodId?: string
): 'credit_card' | 'debit_card' | 'pix' | 'bank_slip' => {
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
                metadata: paymentInfo.metadata,
            };
        }

        return null;
    } catch (error: any) {throw new Error(`Erro ao processar notificação: ${error.message || 'Erro desconhecido'}`);
    }
};
