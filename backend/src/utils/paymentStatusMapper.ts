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
const TRANSACTION_STATUS_MAP: Record<string, Record<string, Omit<PaymentStatusInfo, 'status' | 'statusDetail'>>> = {
    // Status: created
    created: {
        created: {
            userMessage: 'Pagamento criado. Aguardando processamento...',
            adminMessage: 'Transação criada com sucesso, mas ainda não foi processada.',
            color: 'info',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'pending'
        }
    },

    // Status: processed
    processed: {
        accredited: {
            userMessage: 'Pagamento aprovado! Seu ingresso foi confirmado.',
            adminMessage: 'Transação processada com sucesso e valor creditado.',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid'
        },
        partially_refunded: {
            userMessage: 'Pagamento aprovado com reembolso parcial.',
            adminMessage: 'Transação processada com sucesso, mas parte do valor foi reembolsada.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid'
        }
    },

    // Status: processing
    processing: {
        in_process: {
            userMessage: 'Pagamento em processamento. Aguarde alguns instantes...',
            adminMessage: 'Transação está em processamento e ainda não foi concluída.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing'
        },
        pending_review_manual: {
            userMessage: 'Pagamento em análise. Aguarde a confirmação...',
            adminMessage: 'Transação aguardando revisão manual antes de prosseguir.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing'
        }
    },

    // Status: action_required
    action_required: {
        waiting_payment: {
            userMessage: 'Aguardando pagamento. Complete o pagamento para confirmar seu ingresso.',
            adminMessage: 'Transação requer ação adicional e está aguardando o pagamento.',
            color: 'warning',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'pending'
        },
        waiting_capture: {
            userMessage: 'Pagamento autorizado. Aguardando confirmação...',
            adminMessage: 'Pagamento foi autorizado, mas ainda não foi capturado.',
            color: 'warning',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'processing'
        },
        waiting_transfer: {
            userMessage: 'Pagamento iniciado. Aguardando transferência...',
            adminMessage: 'Pagamento foi iniciado, mas valores ainda não foram transferidos.',
            color: 'warning',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'processing'
        }
    },

    // Status: charged_back
    charged_back: {
        in_process: {
            userMessage: 'Pagamento contestado. Valor está sendo revertido.',
            adminMessage: 'Transação foi contestada e o valor está sendo revertido.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        },
        settled: {
            userMessage: 'Pagamento contestado e liquidado.',
            adminMessage: 'Transação foi contestada e o valor foi liquidado.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        },
        reimbursed: {
            userMessage: 'Pagamento contestado. Valor foi reembolsado.',
            adminMessage: 'Transação foi contestada e o valor foi reembolsado ao comprador.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        }
    },

    // Status: expired
    expired: {
        expired: {
            userMessage: 'Tempo de pagamento expirado. Você pode tentar novamente.',
            adminMessage: 'Transação expirou por não ter sido concluída no tempo limite.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'cancelled'
        }
    },

    // Status: refunded
    refunded: {
        refunded: {
            userMessage: 'Pagamento reembolsado. O valor foi devolvido.',
            adminMessage: 'Order foi reembolsada e o valor foi devolvido integralmente ao pagador.',
            color: 'secondary',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        }
    },

    // Status: failed
    failed: {
        bad_filled_card_data: {
            userMessage: 'Dados do cartão incorretos. Verifique e tente novamente.',
            adminMessage: 'Transação falhou devido a dados do cartão preenchidos incorretamente (número, CVV, validade, etc.).',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        invalid_card_token: {
            userMessage: 'Token do cartão inválido. Tente novamente.',
            adminMessage: 'Transação falhou devido a token de cartão inválido.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        high_risk: {
            userMessage: 'Pagamento recusado por segurança. Entre em contato com o suporte.',
            adminMessage: 'Transação falhou devido a alto risco detectado pelo sistema antifraude.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed'
        },
        rejected_by_issuer: {
            userMessage: 'Pagamento recusado pelo banco. Verifique com seu banco ou tente outro cartão.',
            adminMessage: 'Transação falhou devido à rejeição pelo emissor do cartão.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        required_call_for_authorize: {
            userMessage: 'Autorização necessária. Entre em contato com seu banco.',
            adminMessage: 'Transação falhou porque é necessária uma chamada para autorização pelo emissor.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        max_attempts_exceeded: {
            userMessage: 'Número máximo de tentativas excedido. Tente novamente mais tarde.',
            adminMessage: 'Transação falhou devido ao número máximo de tentativas excedido.',
            color: 'error',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'failed'
        },
        card_disabled: {
            userMessage: 'Cartão desativado. Use outro cartão ou entre em contato com seu banco.',
            adminMessage: 'Transação falhou devido ao cartão estar desativado ou bloqueado.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        insufficient_amount: {
            userMessage: 'Saldo insuficiente. Verifique seu saldo ou use outro cartão.',
            adminMessage: 'Transação falhou devido a saldo ou limite insuficiente.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        amount_limit_exceeded: {
            userMessage: 'Limite de valor excedido. Tente um valor menor ou use outro cartão.',
            adminMessage: 'Transação falhou devido ao limite de valor excedido pelo emissor ou sistema.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        processing_error: {
            userMessage: 'Erro ao processar pagamento. Tente novamente ou entre em contato com o suporte.',
            adminMessage: 'Transação falhou devido a erro de processamento no sistema. Verifique logs e x-request-id.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        invalid_installments: {
            userMessage: 'Número de parcelas inválido. Escolha outra opção de parcelamento.',
            adminMessage: 'Transação falhou devido a número de parcelas inválido ou não aceito.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        pending_challenge: {
            userMessage: 'Autenticação 3D Secure pendente. Complete a verificação.',
            adminMessage: 'Transação falhou devido a desafio 3DS pendente (autenticação não concluída).',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        '3ds_challenge_expired': {
            userMessage: 'Tempo de autenticação 3D Secure expirado. Tente novamente.',
            adminMessage: 'Transação falhou devido à expiração do desafio 3DS.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        },
        '3ds_challenge_failed': {
            userMessage: 'Autenticação 3D Secure falhou. Tente novamente.',
            adminMessage: 'Transação falhou devido à falha na autenticação 3DS.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        }
    }
};

/**
 * Mapeamento de status de Order (quando usar Orders API)
 */
const ORDER_STATUS_MAP: Record<string, Record<string, Omit<PaymentStatusInfo, 'status' | 'statusDetail'>>> = {
    opened: {
        opened: {
            userMessage: 'Pedido criado. Aguardando pagamento...',
            adminMessage: 'Order foi criada e está aberta, aguardando pagamento.',
            color: 'info',
            requiresAction: true,
            canRetry: false,
            internalStatus: 'pending'
        }
    },
    closed: {
        closed: {
            userMessage: 'Pedido finalizado.',
            adminMessage: 'Order foi fechada e finalizada.',
            color: 'success',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'paid'
        }
    },
    charged_back: {
        in_process: {
            userMessage: 'Pagamento contestado. Valor está sendo revertido.',
            adminMessage: 'Order sofreu contestação e está em processo de avaliação.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        },
        settled: {
            userMessage: 'Pagamento contestado e liquidado.',
            adminMessage: 'Order sofreu contestação e a transação foi liquidada.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        },
        reimbursed: {
            userMessage: 'Pagamento contestado. Valor foi reembolsado.',
            adminMessage: 'Order sofreu contestação e o valor foi reembolsado após estorno.',
            color: 'error',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        }
    },
    expired: {
        expired: {
            userMessage: 'Tempo de pagamento expirado. Você pode tentar novamente.',
            adminMessage: 'Order expirou por não ter sido concluída no tempo limite.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'cancelled'
        }
    },
    failed: {
        failed: {
            userMessage: 'Pagamento falhou. Tente novamente ou entre em contato com o suporte.',
            adminMessage: 'Order falhou e a transação não foi bem-sucedida.',
            color: 'error',
            requiresAction: true,
            canRetry: true,
            internalStatus: 'failed'
        }
    },
    refunded: {
        refunded: {
            userMessage: 'Pagamento reembolsado. O valor foi devolvido.',
            adminMessage: 'Order foi reembolsada e o valor foi devolvido integralmente.',
            color: 'secondary',
            requiresAction: false,
            canRetry: false,
            internalStatus: 'refunded'
        }
    }
};

/**
 * Obtém informações completas sobre um status de pagamento
 */
export const getPaymentStatusInfo = (status: string, statusDetail: string): PaymentStatusInfo => {
    // Normalizar status e statusDetail
    const normalizedStatus = status?.toLowerCase() || 'unknown';
    const normalizedDetail = statusDetail?.toLowerCase() || 'unknown';

    // Tentar encontrar no mapeamento de transação
    const transactionInfo = TRANSACTION_STATUS_MAP[normalizedStatus]?.[normalizedDetail];

    if (transactionInfo) {
        return {
            status: normalizedStatus,
            statusDetail: normalizedDetail,
            ...transactionInfo
        };
    }

    // Tentar encontrar no mapeamento de order
    const orderInfo = ORDER_STATUS_MAP[normalizedStatus]?.[normalizedDetail];

    if (orderInfo) {
        return {
            status: normalizedStatus,
            statusDetail: normalizedDetail,
            ...orderInfo
        };
    }

    // Status desconhecido - retornar padrão
    return {
        status: normalizedStatus,
        statusDetail: normalizedDetail,
        userMessage: `Status: ${status} - ${statusDetail}. Entre em contato com o suporte se necessário.`,
        adminMessage: `Status desconhecido: ${status} / ${statusDetail}. Verificar documentação do Mercado Pago.`,
        color: 'warning',
        requiresAction: true,
        canRetry: true,
        internalStatus: 'pending'
    };
};

/**
 * Mapeia status do Mercado Pago para status interno do sistema
 */
export const mapPaymentStatus = (mpStatus: string, statusDetail?: string): 'pending' | 'paid' | 'cancelled' | 'refunded' | 'processing' | 'failed' => {
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

