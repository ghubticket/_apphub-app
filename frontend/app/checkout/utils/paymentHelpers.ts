import type { CardFieldKey } from '../types';
import { CARD_ERROR_CODE_MAP, CARD_ERROR_MESSAGES, CARD_FIELD_REQUIRED_MESSAGES } from './cardMessages';

export const validateCardField = (
    field: CardFieldKey,
    value: string,
    cardBrand?: string
): string | null => {
    if (!value || value.trim() === '') {
        return CARD_FIELD_REQUIRED_MESSAGES[field] || 'Campo obrigatório';
    }

    switch (field) {
        case 'cardNumber':
            const digits = value.replace(/\D/g, '');
            if (digits.length < 13 || digits.length > 19) {
                return 'Número do cartão inválido';
            }
            break;
        case 'cardExpirationMonth':
            const month = parseInt(value, 10);
            if (month < 1 || month > 12) {
                return 'Mês inválido';
            }
            break;
        case 'cardExpirationYear':
            const currentYear = new Date().getFullYear() % 100;
            const year = parseInt(value, 10);
            if (year < currentYear) {
                return 'Ano inválido';
            }
            break;
        case 'securityCode':
            const cvv = value.replace(/\D/g, '');
            if (cvv.length < 3 || cvv.length > 4) {
                return 'CVV inválido';
            }
            break;
        case 'installments':
            if (!cardBrand) {
                return 'Selecione o número do cartão primeiro';
            }
            break;
        case 'identificationNumber':
            const doc = value.replace(/\D/g, '');
            if (doc.length !== 11 && doc.length !== 14) {
                return 'CPF ou CNPJ inválido';
            }
            break;
    }

    return null;
};

export const processMercadoPagoError = (error: any): string => {
    if (!error) return 'Erro desconhecido ao processar pagamento';

    // Erros específicos do Mercado Pago
    if (error.type) {
        const errorMessage = CARD_ERROR_MESSAGES[error.type];
        if (errorMessage) return errorMessage;

        const errorCode = CARD_ERROR_CODE_MAP[error.type];
        if (errorCode) return errorCode.message || error.message || 'Erro ao processar pagamento';
    }

    // Erros de conexão SSL
    if (error.message?.includes('secure connection') || error.message?.includes('SSL')) {
        return 'O Mercado Pago exige conexão segura (HTTPS) para processar cartões. Abra o checkout em https:// e tente novamente.';
    }

    // Mensagem padrão
    return error.message || 'Não foi possível processar os dados do cartão. Verifique e tente novamente.';
};

export const extractPaymentMethodId = (
    cardNumberInput: HTMLInputElement | null,
    paymentMethods?: any[]
): string => {
    // 1. Tentar do dataset do input
    if (cardNumberInput?.dataset.paymentMethodId) {
        return cardNumberInput.dataset.paymentMethodId;
    }

    // 2. Tentar dos paymentMethods recebidos
    if (paymentMethods && paymentMethods.length > 0) {
        const firstMethod = paymentMethods[0];
        return (
            firstMethod?.payment_method_id ||
            firstMethod?.id ||
            firstMethod?.payment_method?.id ||
            ''
        );
    }

    // 3. Tentar mapear da bandeira detectada
    if (cardNumberInput) {
        const brand = cardNumberInput.dataset.cardBrand;
        if (brand) {
            const brandMap: Record<string, string> = {
                visa: 'visa',
                master: 'master',
                amex: 'amex',
                elo: 'elo',
            };
            return brandMap[brand.toLowerCase()] || '';
        }
    }

    return '';
};

export const formatPaymentData = (data: {
    cardToken: string;
    paymentMethodId: string;
    installments: string;
    issuerId?: string;
    identificationType: string;
    identificationNumber: string;
    cardholderName: string;
    cardholderEmail: string;
}): any => {
    return {
        token: data.cardToken,
        payment_method_id: data.paymentMethodId,
        installments: parseInt(data.installments, 10),
        issuer_id: data.issuerId,
        payer: {
            identification: {
                type: data.identificationType,
                number: data.identificationNumber.replace(/\D/g, ''),
            },
            email: data.cardholderEmail,
        },
        additional_info: {
            cardholder_name: data.cardholderName,
        },
    };
};

