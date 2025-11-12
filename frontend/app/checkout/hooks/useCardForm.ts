import { useEffect, useRef, useCallback } from 'react';

type CardFormCallbacks = {
    onPaymentMethodsReceived?: (error: any, paymentMethods: any[]) => void;
    onFetchInstallments?: (error: any, installments: any[]) => void;
    onError?: (error: any) => void;
    onFormMounted?: (error: any) => void;
};

type UseCardFormOptions = {
    mercadoPago: any;
    publicKey: string | undefined;
    totalAmount: number;
    selectedTab: 'card' | 'pix';
    callbacks?: CardFormCallbacks;
    onCardBrandDetected?: (brand: string, paymentMethodId: string) => void;
    onInstallmentsReady?: () => void;
};

export const useCardForm = ({
    mercadoPago,
    publicKey,
    totalAmount,
    selectedTab,
    callbacks = {},
    onCardBrandDetected,
    onInstallmentsReady,
}: UseCardFormOptions) => {
    const cardFormRef = useRef<any>(null);
    const isInitializingRef = useRef(false);
    const destroyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const destroyCardForm = useCallback(() => {
        // Limpar timeout pendente se existir
        if (destroyTimeoutRef.current) {
            clearTimeout(destroyTimeoutRef.current);
            destroyTimeoutRef.current = null;
        }

        if (cardFormRef.current) {
            try {
                if (typeof cardFormRef.current.destroy === 'function') {
                    cardFormRef.current.destroy();
                }
            } catch (error) {
                console.error('[checkout][cardForm] Erro ao destruir cardForm:', error);
            }
            cardFormRef.current = null;
        }
        isInitializingRef.current = false;

        // NÃO limpar o innerHTML aqui porque:
        // 1. O formulário HTML é renderizado pelo React
        // 2. Limpar o innerHTML remove o formulário HTML, não apenas a instância do Mercado Pago
        // 3. O Mercado Pago gerencia seus próprios elementos filhos internamente
        // 4. Quando destroy() é chamado, o Mercado Pago limpa seus próprios elementos
    }, []);

    const createCardForm = useCallback(() => {
        if (!mercadoPago || !publicKey || selectedTab !== 'card') return;
        if (isInitializingRef.current) return;

        const formElement = document.getElementById('checkout-card-form');
        if (!formElement) return;

        // Verificar se já existe uma instância (evitar "Cardform already instantiated")
        if (cardFormRef.current) {
            // Se já temos uma referência válida, não precisamos recriar
            return;
        }

        // Não verificar children.length aqui porque:
        // 1. O Mercado Pago adiciona elementos filhos quando monta o formulário
        // 2. Isso causaria um loop infinito de destruição/criação
        // 3. O Mercado Pago gerencia suas próprias instâncias internamente

        isInitializingRef.current = true;

        try {
            // O Mercado Pago pode retornar uma instância existente se já houver uma
            // Isso é normal e não é um erro - apenas usamos a instância retornada
            cardFormRef.current = mercadoPago.cardForm({
                amount: totalAmount.toFixed(2),
                autoMount: true,
                form: {
                    id: 'checkout-card-form',
                    cardholderName: {
                        id: 'form-checkout__cardholderName',
                        placeholder: 'Nome completo (igual ao cartão)',
                    },
                    cardholderEmail: {
                        id: 'form-checkout__cardholderEmail',
                        placeholder: 'email@testuser.com',
                    },
                    cardNumber: {
                        id: 'form-checkout__cardNumber',
                        placeholder: 'Número do cartão',
                    },
                    cardExpirationMonth: {
                        id: 'form-checkout__cardExpirationMonth',
                        placeholder: 'MM',
                    },
                    cardExpirationYear: {
                        id: 'form-checkout__cardExpirationYear',
                        placeholder: 'AA',
                    },
                    securityCode: {
                        id: 'form-checkout__securityCode',
                        placeholder: 'CVV',
                    },
                    installments: {
                        id: 'form-checkout__installments',
                        placeholder: 'Parcelas',
                    },
                    identificationType: {
                        id: 'form-checkout__identificationType',
                    },
                    identificationNumber: {
                        id: 'form-checkout__identificationNumber',
                        placeholder: 'CPF',
                    },
                    issuer: {
                        id: 'form-checkout__issuer',
                    },
                },
                callbacks: {
                    onFormMounted: (error: any) => {
                        isInitializingRef.current = false;
                        // Se o Mercado Pago retornou uma instância existente, não há erro
                        // Apenas logamos se for um erro real
                        if (error) {
                            callbacks.onFormMounted?.(error);
                        } else {
                            // Instância criada ou reutilizada com sucesso
                            // O aviso "Cardform already instantiated" é apenas informativo
                        }
                    },
                    onPaymentMethodsReceived: (error: any, paymentMethods: any[]) => {
                        if (!error && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
                            const firstMethod = paymentMethods[0];
                            const detectedBrand =
                                firstMethod?.name ||
                                firstMethod?.payment_method_id ||
                                firstMethod?.id ||
                                '';
                            const paymentMethodId =
                                firstMethod?.payment_method_id ||
                                firstMethod?.id ||
                                firstMethod?.payment_method?.id ||
                                '';

                            if (detectedBrand && onCardBrandDetected) {
                                onCardBrandDetected(detectedBrand, paymentMethodId);
                            }
                        }
                        callbacks.onPaymentMethodsReceived?.(error, paymentMethods);
                    },
                    onFetchInstallments: (error: any, installments: any[]) => {
                        if (!error && installments && Array.isArray(installments) && installments.length > 0) {
                            onInstallmentsReady?.();
                        }
                        callbacks.onFetchInstallments?.(error, installments);
                    },
                    onError: (error: any) => {
                        callbacks.onError?.(error);
                    },
                },
            });
        } catch (error: any) {
            // Se o erro for sobre instância já existente, o Mercado Pago retorna a instância existente
            // Não é um erro crítico, apenas um aviso informativo
            if (error?.message?.includes('already instantiated') || error?.message?.includes('existing instance')) {
                // O Mercado Pago já retornou a instância existente, então cardFormRef.current já está definido
                isInitializingRef.current = false;
                return;
            }
            // Para outros erros, logamos e resetamos o estado
            console.error('[checkout][cardForm] Erro ao inicializar cardForm:', error);
            isInitializingRef.current = false;
        }
    }, [mercadoPago, publicKey, totalAmount, selectedTab, callbacks, onCardBrandDetected, onInstallmentsReady, destroyCardForm]);

    useEffect(() => {
        if (selectedTab !== 'card') {
            // Quando mudamos para PIX, destruir a instância do Mercado Pago
            destroyCardForm();
            return;
        }

        // Delay para garantir que o DOM está pronto e que não há instâncias anteriores
        const timeout = setTimeout(() => {
            // Verificar novamente antes de criar
            if (!cardFormRef.current && !isInitializingRef.current) {
                createCardForm();
            }
        }, 200);

        return () => {
            clearTimeout(timeout);
            if (destroyTimeoutRef.current) {
                clearTimeout(destroyTimeoutRef.current);
                destroyTimeoutRef.current = null;
            }
            // Só destruir se realmente mudarmos de tab ou desmontarmos o componente
            // Não destruir em re-renders normais do mesmo tab
        };
    }, [mercadoPago, publicKey, totalAmount, selectedTab, createCardForm, destroyCardForm]);

    return {
        cardFormRef,
        destroyCardForm,
        createCardForm,
    };
};

