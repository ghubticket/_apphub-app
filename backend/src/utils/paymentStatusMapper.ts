/**
 * Mapeamento completo de status e status_detail do Mercado Pago
 * Baseado na documentação oficial:
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-management/status/transaction-status
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/payment-management/status/order-status
 */

export interface PaymentStatusInfo {
    status: string;
    statusDetail: string;
    userMessage: string; // Mensagem amigável para o usuário
    adminMessage: string; // Mensagem detalhada para admin
    color: 'success' | 'warning' | 'error' | 'info' | 'secondary';
    requiresAction: boolean; // Se requer ação do usuário
    canRetry: boolean; // Se pode tentar novamente
    internalStatus: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'processing' | 'failed';
}

/**
 * Mapeamento completo de status de transação do Mercado Pago
 */
const TRANSACTION_STATUS_MAP: Record<
    string,
    Record<string, Omit<PaymentStatusInfo, 'status' | 'statusDetail'>>
> = {
    // Status: created
    created: {
        created: {
            userMessage: 'Pagamento criado. Aguardando processamento...',
            adminMessage: 'Transação criada com sucesso, mas ainda não foi processada.',
            color: 'info',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'pending',
        },
    },

    // Status legado: approved (alguns webhooks/payment API ainda utilizam)
    approved: {
        accredited: {
            userMessage: 'Pagamento aprovado! Seu ingresso foi confirmado.',
            adminMessage: 'Transação aprovada e valor creditado (status legado approved/accredited).',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid',
        },
        // Fallback genérico quando não há detail específico
        approved: {
            userMessage: 'Pagamento aprovado! Seu ingresso foi confirmado.',
            adminMessage: 'Transação aprovada (status legado approved).',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid',
        },
        unknown: {
            userMessage: 'Pagamento aprovado! Seu ingresso foi confirmado.',
            adminMessage: 'Transação aprovada com detail desconhecido (status legado approved).',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid',
        },
    },

    // Status: processed
    processed: {
        accredited: {
            userMessage: 'Pagamento aprovado! Seu ingresso foi confirmado.',
            adminMessage: 'Transação processada com sucesso e valor creditado.',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid',
        },
        partially_refunded: {
            userMessage: 'Pagamento aprovado com reembolso parcial.',
            adminMessage: 'Transação processada com sucesso, mas parte do valor foi reembolsada.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid',
        },
    },

    // Status: processing
    processing: {
        in_process: {
            userMessage: 'Pagamento em processamento. Aguarde alguns instantes...',
            adminMessage: 'Transação está em processamento e ainda não foi concluída.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
        pending_review_manual: {
            userMessage: 'Pagamento em análise. Aguarde a confirmação...',
            adminMessage: 'Transação aguardando revisão manual antes de prosseguir.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
    },

    // Status: action_required
    action_required: {
        waiting_payment: {
            userMessage: 'Aguardando pagamento. Complete o pagamento para confirmar seu ingresso.',
            adminMessage: 'Transação requer ação adicional e está aguardando o pagamento.',
            color: 'warning',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'pending',
        },
        waiting_capture: {
            userMessage: 'Pagamento autorizado. Aguardando confirmação...',
            adminMessage: 'Pagamento foi autorizado, mas ainda não foi capturado.',
            color: 'warning',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'processing',
        },
        waiting_transfer: {
            userMessage: 'Pagamento iniciado. Aguardando transferência...',
            adminMessage: 'Pagamento foi iniciado, mas valores ainda não foram transferidos.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
    },

    // Status: charged_back
    charged_back: {
        in_process: {
            userMessage: 'Pagamento contestado. Valor está sendo revertido.',
            adminMessage: 'Transação foi contestada e o valor está sendo revertido.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
        settled: {
            userMessage: 'Pagamento contestado e liquidado.',
            adminMessage: 'Transação foi contestada e o valor foi liquidado.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
        reimbursed: {
            userMessage: 'Pagamento contestado. Valor foi reembolsado.',
            adminMessage: 'Transação foi contestada e o valor foi reembolsado ao comprador.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
    },

    // Status: expired
    expired: {
        expired: {
            userMessage: 'Tempo de pagamento expirado. Você pode tentar novamente.',
            adminMessage: 'Transação expirou por não ter sido concluída no tempo limite.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'cancelled',
        },
    },

    // Status: refunded
    refunded: {
        refunded: {
            userMessage: 'Pagamento reembolsado. O valor foi devolvido.',
            adminMessage: 'Order foi reembolsada e o valor foi devolvido integralmente ao pagador.',
            color: 'secondary',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
    },

    // Status: pending (API antiga)
    pending: {
        pending_waiting_payment: {
            userMessage: 'Aguardando pagamento. Complete o pagamento para confirmar seu ingresso.',
            adminMessage: 'Pagamento offline pendente, aguardando que o usuário realize o pagamento.',
            color: 'warning',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'pending',
        },
        pending_waiting_transfer: {
            userMessage: 'Aguardando transferência bancária. Complete o pagamento para confirmar seu ingresso.',
            adminMessage: 'Pagamento por transferência bancária pendente, aguardando confirmação.',
            color: 'warning',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'pending',
        },
        pending_challenge: {
            userMessage: 'Autenticação 3D Secure pendente. Complete a verificação.',
            adminMessage: 'Pagamento com cartão de crédito aguardando confirmação por desafio 3DS.',
            color: 'warning',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'pending',
        },
        pending: {
            userMessage: 'Pagamento pendente. Aguarde a confirmação...',
            adminMessage: 'Pagamento está pendente e aguardando processamento.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'pending',
        },
    },

    // Status: in_process (API antiga)
    in_process: {
        pending_contingency: {
            userMessage: 'Pagamento em processamento. Você será notificado por e-mail quando for confirmado.',
            adminMessage: 'Pagamento está sendo processado offline e será confirmado em até 2 dias úteis.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
        pending_review_manual: {
            userMessage: 'Pagamento em análise. Você será notificado por e-mail quando for confirmado.',
            adminMessage: 'Pagamento está aguardando revisão manual e será confirmado em até 2 dias úteis.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
        offline_process: {
            userMessage: 'Pagamento em processamento offline. Aguarde a confirmação...',
            adminMessage: 'Pagamento está sendo processado de forma offline devido à falta de processamento online.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
        in_process: {
            userMessage: 'Pagamento em processamento. Aguarde alguns instantes...',
            adminMessage: 'Pagamento está em processamento e ainda não foi concluído.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
    },

    // Status: authorized (API antiga)
    authorized: {
        pending_capture: {
            userMessage: 'Pagamento autorizado. Aguardando confirmação...',
            adminMessage: 'Pagamento foi autorizado e aguarda captura.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
        authorized: {
            userMessage: 'Pagamento autorizado. Aguardando confirmação...',
            adminMessage: 'Pagamento foi autorizado e está aguardando captura.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
    },

    // Status: cancelled (API antiga)
    cancelled: {
        expired: {
            userMessage: 'Tempo de pagamento expirado. Você pode tentar novamente.',
            adminMessage: 'Pagamento foi cancelado após ficar pendente por 30 dias.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'cancelled',
        },
        by_collector: {
            userMessage: 'Pagamento cancelado pelo vendedor.',
            adminMessage: 'Pagamento foi cancelado pelo collector (vendedor).',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'cancelled',
        },
        by_payer: {
            userMessage: 'Pagamento cancelado.',
            adminMessage: 'Pagamento foi cancelado pelo pagador.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'cancelled',
        },
        cancelled: {
            userMessage: 'Pagamento cancelado.',
            adminMessage: 'Pagamento foi cancelado.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'cancelled',
        },
    },

    // Status: rejected (API antiga - usado principalmente em webhooks)
    rejected: {
        cc_rejected_insufficient_amount: {
            userMessage: 'Saldo insuficiente. Verifique seu saldo ou use outro cartão.',
            adminMessage: 'O cartão possui saldo insuficiente para realizar o pagamento.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_bad_filled_card_number: {
            userMessage: 'Número do cartão inválido. Verifique os dígitos informados.',
            adminMessage: 'O número do cartão informado está incorreto ou inválido.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_bad_filled_date: {
            userMessage: 'Data de validade incorreta. Verifique a data do cartão.',
            adminMessage: 'A data de validade do cartão informada está incorreta.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_bad_filled_security_code: {
            userMessage: 'Código de segurança incorreto. Confira os dígitos no verso do cartão.',
            adminMessage: 'O código de segurança (CVV) do cartão informado está incorreto.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_bad_filled_other: {
            userMessage: 'Dados do cartão incorretos. Confira número, data e código de segurança.',
            adminMessage: 'Os dados do cartão informados estão incorretos ou incompletos.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_call_for_authorize: {
            userMessage: 'Transação necessita autorização do banco. Entre em contato com seu banco.',
            adminMessage: 'É necessário autorizar o pagamento do valor ao Mercado Pago. Contate o banco emissor.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_card_disabled: {
            userMessage: 'Cartão desabilitado. Ative-o junto ao banco emissor ou use outro cartão.',
            adminMessage: 'O cartão está desabilitado. O telefone para ativação está no verso do cartão.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_card_error: {
            userMessage: 'Não foi possível processar o pagamento com este cartão. Tente novamente ou use outro cartão.',
            adminMessage: 'Ocorreu um erro ao processar o pagamento com o cartão informado.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_blacklist: {
            userMessage: 'Pagamento recusado por segurança. Utilize outro cartão ou método de pagamento.',
            adminMessage: 'O pagamento foi recusado por questões de segurança do sistema.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_high_risk: {
            userMessage: 'Seu pagamento foi recusado. Escolha outra forma de pagamento. Recomendamos meios de pagamento em dinheiro.',
            adminMessage: 'O pagamento foi recusado pela análise de risco do sistema antifraude.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed',
        },
        cc_rejected_invalid_installments: {
            userMessage: 'Quantidade de parcelas inválida para este cartão. Escolha outra opção.',
            adminMessage: 'O cartão não processa pagamentos na quantidade de parcelas selecionada.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_duplicated_payment: {
            userMessage: 'Você já efetuou um pagamento com esse valor. Caso precise pagar novamente, utilize outro cartão.',
            adminMessage: 'Foi detectado um pagamento duplicado para esta compra. Verifique lançamentos anteriores.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_max_attempts: {
            userMessage: 'Você atingiu o limite de tentativas permitido. Escolha outro cartão ou outra forma de pagamento.',
            adminMessage: 'O número máximo de tentativas de pagamento foi excedido para este cartão.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed',
        },
        cc_rejected_other_reason: {
            userMessage: 'O cartão não processa o pagamento. Tente outro cartão ou entre em contato com o banco.',
            adminMessage: 'O pagamento foi recusado pelo emissor do cartão por motivo não especificado.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_3ds_mandatory: {
            userMessage: 'É necessário concluir a verificação 3D Secure para este cartão. Complete a autenticação.',
            adminMessage: 'O pagamento requer verificação 3D Secure obrigatória que não foi concluída.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_3ds_challenge: {
            userMessage: 'Verificação 3D Secure não concluída. Tente novamente e finalize a autenticação.',
            adminMessage: 'O desafio 3D Secure não foi superado corretamente.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_issuer_unavailable: {
            userMessage: 'Emissor do cartão indisponível no momento. Tente novamente em alguns minutos.',
            adminMessage: 'O banco emissor do cartão está temporariamente indisponível.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_amount_rate_limit_exceeded: {
            userMessage: 'Limite de transações excedido. Tente novamente mais tarde ou com outro cartão.',
            adminMessage: 'O pagamento foi rejeitado porque superou o limite (CAP - Capacidade Máxima Permitida) do meio de pagamento.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_high_risk_fraud: {
            userMessage: 'Pagamento recusado por suspeita de fraude. Utilize outro cartão ou método de pagamento.',
            adminMessage: 'O pagamento foi recusado devido à detecção de possível fraude pelo sistema antifraude.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed',
        },
        rejected_by_bank: {
            userMessage: 'Operação recusada pelo banco. Contate o banco ou tente outro cartão.',
            adminMessage: 'A transferência bancária foi rejeitada devido a um erro com o banco.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        rejected_by_issuer: {
            userMessage: 'Transação recusada pelo emissor do cartão. Contate o banco ou tente outro cartão.',
            adminMessage: 'O pagamento foi recusado pelo banco emissor do cartão.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        rejected_by_regulations: {
            userMessage: 'Pagamento recusado devido a regulamentações. Entre em contato com o banco.',
            adminMessage: 'O pagamento foi recusado devido a políticas e regulamentações do emissor.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        rejected_insufficient_data: {
            userMessage: 'Pagamento recusado. Complete os dados do titular e tente novamente.',
            adminMessage: 'O pagamento foi rejeitado devido à falta de todas as informações obrigatórias necessárias no envio.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        insufficient_amount: {
            userMessage: 'Pagamento recusado por valores insuficientes. Verifique seu saldo ou use outro cartão.',
            adminMessage: 'O pagamento foi rejeitado por valores insuficientes no cartão ou conta.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        cc_rejected_card_type_not_allowed: {
            userMessage: 'O pagamento foi rejeitado porque o usuário não tem a função crédito habilitada em seu cartão múltiplo (débito e crédito).',
            adminMessage: 'Cartão múltiplo sem função crédito habilitada.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        rejected: {
            userMessage: 'Pagamento recusado. Tente novamente ou entre em contato com o suporte.',
            adminMessage: 'O pagamento foi recusado pelo sistema ou emissor.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
    },

    // Status: failed
    failed: {
        bad_filled_card_data: {
            userMessage: 'Dados do cartão incorretos. Verifique e tente novamente.',
            adminMessage:
                'Transação falhou devido a dados do cartão preenchidos incorretamente (número, CVV, validade, etc.).',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        invalid_card_token: {
            userMessage: 'Token do cartão inválido. Tente novamente.',
            adminMessage: 'Transação falhou devido a token de cartão inválido.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        high_risk: {
            userMessage: 'Pagamento recusado por segurança. Entre em contato com o suporte.',
            adminMessage: 'Transação falhou devido a alto risco detectado pelo sistema antifraude.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed',
        },
        rejected_by_issuer: {
            userMessage:
                'Pagamento recusado pelo banco.  Verifique com seu banco ou tente outro cartão.',
            adminMessage: 'Transação falhou devido à rejeição pelo emissor do cartão.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        required_call_for_authorize: {
            userMessage: 'Autorização necessária. Entre em contato com seu banco.',
            adminMessage:
                'Transação falhou porque é necessária uma chamada para autorização pelo emissor.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        max_attempts_exceeded: {
            userMessage: 'Número máximo de tentativas excedido. Tente novamente mais tarde.',
            adminMessage: 'Transação falhou devido ao número máximo de tentativas excedido.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed',
        },
        card_disabled: {
            userMessage: 'Cartão desativado. Use outro cartão ou entre em contato com seu banco.',
            adminMessage: 'Transação falhou devido ao cartão estar desativado ou bloqueado.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        insufficient_amount: {
            userMessage: 'Saldo insuficiente. Verifique seu saldo ou use outro cartão.',
            adminMessage: 'Transação falhou devido a saldo ou limite insuficiente.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        amount_limit_exceeded: {
            userMessage: 'Limite de valor excedido. Tente um valor menor ou use outro cartão.',
            adminMessage:
                'Transação falhou devido ao limite de valor excedido pelo emissor ou sistema.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        processing_error: {
            userMessage:
                'Erro ao processar pagamento. Tente novamente ou entre em contato com o suporte.',
            adminMessage:
                'Transação falhou devido a erro de processamento no sistema. Verifique logs e x-request-id.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        invalid_installments: {
            userMessage: 'Número de parcelas inválido. Escolha outra opção de parcelamento.',
            adminMessage: 'Transação falhou devido a número de parcelas inválido ou não aceito.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        pending_challenge: {
            userMessage: 'Autenticação 3D Secure pendente. Complete a verificação.',
            adminMessage:
                'Transação falhou devido a desafio 3DS pendente (autenticação não concluída).',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        '3ds_challenge_expired': {
            userMessage: 'Tempo de autenticação 3D Secure expirado. Tente novamente.',
            adminMessage: 'Transação falhou devido à expiração do desafio 3DS.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        '3ds_challenge_failed': {
            userMessage: 'Autenticação 3D Secure falhou. Tente novamente.',
            adminMessage: 'Transação falhou devido à falha na autenticação 3DS.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
        in_review: {
            userMessage: 'Pagamento em análise. O status está sendo verificado.',
            adminMessage: 'Transação falhou e seu status é desconhecido ou contém informações sensíveis.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing',
        },
        failed: {
            userMessage: 'Pagamento falhou. Tente novamente ou entre em contato com o suporte.',
            adminMessage: 'Transação falhou sem motivo específico identificado.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
    },
};

/**
 * Mapeamento de status de Order (quando usar Orders API)
 */
const ORDER_STATUS_MAP: Record<
    string,
    Record<string, Omit<PaymentStatusInfo, 'status' | 'statusDetail'>>
> = {
    opened: {
        opened: {
            userMessage: 'Pedido criado. Aguardando pagamento...',
            adminMessage: 'Order foi criada e está aberta, aguardando pagamento.',
            color: 'info',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'pending',
        },
    },
    closed: {
        closed: {
            userMessage: 'Pedido finalizado.',
            adminMessage: 'Order foi fechada e finalizada.',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid',
        },
    },
    charged_back: {
        in_process: {
            userMessage: 'Pagamento contestado. Valor está sendo revertido.',
            adminMessage: 'Order sofreu contestação e está em processo de avaliação.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
        settled: {
            userMessage: 'Pagamento contestado e liquidado.',
            adminMessage: 'Order sofreu contestação e a transação foi liquidada.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
        reimbursed: {
            userMessage: 'Pagamento contestado. Valor foi reembolsado.',
            adminMessage: 'Order sofreu contestação e o valor foi reembolsado após estorno.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
    },
    expired: {
        expired: {
            userMessage: 'Tempo de pagamento expirado. Você pode tentar novamente.',
            adminMessage: 'Order expirou por não ter sido concluída no tempo limite.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'cancelled',
        },
    },
    failed: {
        failed: {
            userMessage: 'Pagamento falhou. Tente novamente ou entre em contato com o suporte.',
            adminMessage: 'Order falhou e a transação não foi bem-sucedida.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed',
        },
    },
    refunded: {
        refunded: {
            userMessage: 'Pagamento reembolsado. O valor foi devolvido.',
            adminMessage: 'Order foi reembolsada e o valor foi devolvido integralmente.',
            color: 'secondary',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded',
        },
    },
};

/**
 * Obtém informações completas sobre um status de pagamento
 * 
 * Esta função tenta encontrar o mapeamento mais específico possível:
 * 1. Procura por status + status_detail exatos
 * 2. Procura por status_detail em qualquer status (para casos onde status_detail é mais específico)
 * 3. Procura apenas pelo status (fallback)
 * 4. Retorna mensagem padrão se nada for encontrado
 */
export const getPaymentStatusInfo = (status: string, statusDetail: string): PaymentStatusInfo => {
    // Normalizar status e statusDetail
    const normalizedStatus = status?.toLowerCase() || 'unknown';
    const normalizedDetail = statusDetail?.toLowerCase() || 'unknown';

    // 1. Tentar encontrar no mapeamento de transação com status + detail exatos
    const transactionInfo = TRANSACTION_STATUS_MAP[normalizedStatus]?.[normalizedDetail];

    if (transactionInfo) {
        return {
            status: normalizedStatus,
            statusDetail: normalizedDetail,
            ...transactionInfo,
        };
    }

    // 2. Tentar encontrar no mapeamento de order com status + detail exatos
    const orderInfo = ORDER_STATUS_MAP[normalizedStatus]?.[normalizedDetail];

    if (orderInfo) {
        return {
            status: normalizedStatus,
            statusDetail: normalizedDetail,
            ...orderInfo,
        };
    }

    // 3. Se status_detail está preenchido, tentar encontrar em qualquer status
    // Isso é útil para status_detail que são específicos (ex: cc_rejected_*)
    if (normalizedDetail && normalizedDetail !== 'unknown' && normalizedDetail !== normalizedStatus) {
        // Procurar em todos os status do TRANSACTION_STATUS_MAP
        for (const [statusKey, statusMap] of Object.entries(TRANSACTION_STATUS_MAP)) {
            if (statusMap[normalizedDetail]) {
                return {
                    status: normalizedStatus,
                    statusDetail: normalizedDetail,
                    ...statusMap[normalizedDetail],
                };
            }
        }

        // Procurar em todos os status do ORDER_STATUS_MAP
        for (const [statusKey, statusMap] of Object.entries(ORDER_STATUS_MAP)) {
            if (statusMap[normalizedDetail]) {
                return {
                    status: normalizedStatus,
                    statusDetail: normalizedDetail,
                    ...statusMap[normalizedDetail],
                };
            }
        }
    }

    // 4. Tentar encontrar apenas pelo status (sem detail específico)
    // Procurar primeiro valor do mapeamento do status
    if (TRANSACTION_STATUS_MAP[normalizedStatus]) {
        const firstEntry = Object.entries(TRANSACTION_STATUS_MAP[normalizedStatus])[0];
        if (firstEntry) {
            return {
                status: normalizedStatus,
                statusDetail: normalizedDetail,
                ...firstEntry[1],
            };
        }
    }

    if (ORDER_STATUS_MAP[normalizedStatus]) {
        const firstEntry = Object.entries(ORDER_STATUS_MAP[normalizedStatus])[0];
        if (firstEntry) {
            return {
                status: normalizedStatus,
                statusDetail: normalizedDetail,
                ...firstEntry[1],
            };
        }
    }

    // 5. Status desconhecido - retornar padrão com mensagem amigável
    return {
        status: normalizedStatus,
        statusDetail: normalizedDetail,
        userMessage: `Status: ${status}${statusDetail && statusDetail !== 'unknown' ? ` - ${statusDetail}` : ''}. Entre em contato com o suporte se necessário.`,
        adminMessage: `Status desconhecido: ${status}${statusDetail && statusDetail !== 'unknown' ? ` / ${statusDetail}` : ''}. Verificar documentação do Mercado Pago.`,
        color: 'warning',
        requiresAction: true,
        canRetry: true,
        internalStatus: 'pending',
    };
};

/**
 * Mapeia status do Mercado Pago para status interno do sistema
 */
export const mapPaymentStatus = (
    mpStatus: string,
    statusDetail?: string
): 'pending' | 'paid' | 'cancelled' | 'refunded' | 'processing' | 'failed' => {
    const info = getPaymentStatusInfo(mpStatus, statusDetail || '');
    return info.internalStatus;
};

/**
 * Verifica se o status requer ação do usuário
 */
export const requiresUserAction = (status: string, statusDetail: string): boolean => {
    const info = getPaymentStatusInfo(status, statusDetail);
    return info.requiresAction;
};

/**
 * Verifica se pode tentar novamente
 */
export const canRetryPayment = (status: string, statusDetail: string): boolean => {
    const info = getPaymentStatusInfo(status, statusDetail);
    return info.canRetry;
};
