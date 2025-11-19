const STATUS_DETAIL_MESSAGES: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Pagamento recusado por saldo ou limite insuficiente.',
    cc_rejected_bad_filled_security_code:
        'Código de segurança incorreto. Confira os dígitos no verso do cartão.',
    cc_rejected_bad_filled_date: 'Data de validade incorreta.',
    cc_rejected_bad_filled_card_number: 'Número do cartão inválido. Reveja os dígitos informados.',
    cc_rejected_bad_filled_other: 'Dados do cartão incorretos. Confira número, data e código.',
    cc_rejected_issuer_unavailable:
        'Emissor indisponível no momento. Tente novamente em alguns minutos.',
    cc_rejected_call_for_authorize:
        'Transação necessita autorização do banco emissor. Entre em contato com o banco.',
    required_call_for_authorize:
        'Transação necessita autorização do banco emissor. Entre em contato com o banco.',
    cc_rejected_card_disabled:
        'Cartão desabilitado. Ative-o junto ao banco emissor antes de tentar novamente.',
    cc_rejected_card_error: 'O emissor não pôde processar o pagamento agora.',
    cc_rejected_blacklist: 'Pagamento recusado por segurança. Utilize outro cartão.',
    cc_rejected_high_risk:
        'Pagamento recusado pela análise de risco. Utilize outro cartão ou método.',
    cc_rejected_invalid_installments: 'Quantidade de parcelas inválida para este cartão.',
    cc_rejected_duplicated_payment:
        'Pagamento duplicado para esta compra. Verifique lançamentos anteriores.',
    cc_rejected_max_attempts: 'Número máximo de tentativas excedido. Tente novamente mais tarde.',
    cc_rejected_other_reason: 'Pagamento recusado pelo emissor do cartão.',
    cc_rejected_3ds_mandatory: 'É necessário concluir a verificação 3D Secure para este cartão.',
    cc_rejected_3ds_challenge:
        'Verificação 3D Secure não concluída. Tente novamente e finalize a autenticação.',
    rejected_by_bank: 'Transação recusada pelo emissor do cartão. Contate o banco.',
    rejected_by_issuer: 'Transação recusada pelo emissor do cartão. Contate o banco.',
    rejected_by_regulations:
        'Pagamento recusado por políticas do emissor. Entre em contato com o banco.',
    rejected_insufficient_data:
        'Pagamento recusado. Complete os dados do titular e tente novamente.',
    insufficient_amount: 'Pagamento recusado por saldo insuficiente.',
    cc_amount_rate_limit_exceeded:
        'Limite de transações excedido. Tente novamente mais tarde ou com outro cartão.',
    cc_rejected_high_risk_fraud:
        'Pagamento recusado por suspeita de fraude. Utilize outro cartão ou método.',
};

const DEFAULT_REJECTION_MESSAGE =
    'Pagamento recusado pelo emissor. Tente outro cartão ou entre em contato com o banco.';

export const mapMpStatusDetailToMessage = (statusDetail?: string): string => {
    if (!statusDetail) {
        return DEFAULT_REJECTION_MESSAGE;
    }
    const normalized = statusDetail.toLowerCase();
    return STATUS_DETAIL_MESSAGES[normalized] || DEFAULT_REJECTION_MESSAGE;
};
