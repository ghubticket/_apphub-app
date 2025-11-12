export const CARD_ERROR_MESSAGES: Record<string, string> = {
    '205': 'Informe o número do cartão.',
    '208': 'Informe o mês de validade do cartão.',
    '209': 'Informe o ano de validade do cartão.',
    '212': 'Informe o código de segurança (CVV).',
    '214': 'Informe o nome exatamente como aparece no cartão.',
    '221': 'Informe o CPF do titular do cartão.',
    '324': 'Informe um CPF válido do titular do cartão.',
    '224': 'Informe o código de segurança (CVV).',
    'E301': 'Número do cartão inválido.',
    'E302': 'Código de segurança inválido.',
};

import type { CardFieldKey } from '../types';

export const CARD_FIELD_REQUIRED_MESSAGES: Record<CardFieldKey, string> = {
    cardNumber: 'Informe o número do cartão.',
    cardExpirationMonth: 'Informe o mês de validade do cartão (01-12).',
    cardExpirationYear: 'Informe o ano de validade do cartão.',
    securityCode: 'Informe o código de segurança (CVV).',
    cardholderName: 'Informe o nome exatamente como aparece no cartão.',
    cardholderEmail: 'Informe um e-mail válido para o recibo.',
    installments: 'Selecione o número de parcelas.',
    identificationNumber: 'Informe o documento do titular do cartão.',
};

export const CARD_ERROR_CODE_MAP: Record<string, { field: CardFieldKey; message: string }> = {
    '205': { field: 'cardNumber', message: CARD_ERROR_MESSAGES['205'] },
    'E301': { field: 'cardNumber', message: CARD_ERROR_MESSAGES['E301'] },
    '208': { field: 'cardExpirationMonth', message: CARD_ERROR_MESSAGES['208'] },
    '209': { field: 'cardExpirationYear', message: CARD_ERROR_MESSAGES['209'] },
    '212': { field: 'securityCode', message: CARD_ERROR_MESSAGES['212'] },
    '224': { field: 'securityCode', message: CARD_ERROR_MESSAGES['224'] },
    '214': { field: 'cardholderName', message: CARD_ERROR_MESSAGES['214'] },
    '221': { field: 'identificationNumber', message: CARD_ERROR_MESSAGES['221'] },
    '324': { field: 'identificationNumber', message: CARD_ERROR_MESSAGES['324'] },
    'E302': { field: 'securityCode', message: CARD_ERROR_MESSAGES['E302'] },
};
