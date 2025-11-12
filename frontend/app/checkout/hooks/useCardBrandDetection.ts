import { useEffect, useRef, useCallback, useState } from 'react';
import { getInputElement } from '../utils/cardFormHelpers';

type UseCardBrandDetectionOptions = {
    mercadoPago: any;
    selectedTab: 'card' | 'pix';
    onBrandDetected: (brand: string, paymentMethodId: string) => void;
    onBrandCleared?: () => void;
};

export const useCardBrandDetection = ({
    mercadoPago,
    selectedTab,
    onBrandDetected,
    onBrandCleared,
}: UseCardBrandDetectionOptions) => {
    const [cardBrand, setCardBrand] = useState<string>('');
    const lastDetectedBinRef = useRef<string>('');
    const lastCardBrandRef = useRef<string>('');

    const detectBrand = useCallback(
        async (digits: string) => {
            if (!mercadoPago || selectedTab !== 'card') return;

            const bin = digits.slice(0, 6);
            if (bin.length < 6) return;

            // Verificar se já estamos processando este BIN
            if (lastDetectedBinRef.current === bin) {
                return;
            }

            // Marcar como processando
            lastDetectedBinRef.current = bin;

            try {
                const response: any = await (mercadoPago as any).getPaymentMethods({ bin });

                // Extrair resultado da resposta
                let firstResult: any = null;
                if (Array.isArray(response)) {
                    firstResult = response[0];
                } else if (response?.results && Array.isArray(response.results)) {
                    firstResult = response.results[0];
                } else if (response?.data && Array.isArray(response.data)) {
                    firstResult = response.data[0];
                } else {
                    firstResult = response;
                }

                // Verificar se ainda estamos processando o mesmo BIN
                if (lastDetectedBinRef.current !== bin) {
                    return;
                }

                const detectedBrand =
                    firstResult?.name ||
                    firstResult?.payment_method_id ||
                    firstResult?.id ||
                    '';

                const paymentMethodId =
                    firstResult?.payment_method_id ||
                    firstResult?.id ||
                    firstResult?.payment_method?.id ||
                    '';

                if (detectedBrand) {
                    const cardNumberInput = getInputElement('form-checkout__cardNumber');
                    if (cardNumberInput && paymentMethodId) {
                        cardNumberInput.dataset.paymentMethodId = paymentMethodId;
                        cardNumberInput.dataset.cardBrand = detectedBrand;
                    }

                    // Se a bandeira mudou, notificar
                    if (lastCardBrandRef.current !== detectedBrand) {
                        lastCardBrandRef.current = detectedBrand;
                        setCardBrand(detectedBrand);
                        onBrandDetected(detectedBrand, paymentMethodId);
                    }
                } else {
                    // Limpar se não detectou e o campo está vazio ou com menos de 6 dígitos
                    const cardNumberInput = getInputElement('form-checkout__cardNumber');
                    if (!cardNumberInput?.value || cardNumberInput.value.replace(/\D/g, '').length < 6) {
                        lastDetectedBinRef.current = '';
                        lastCardBrandRef.current = '';
                        setCardBrand('');
                        onBrandCleared?.();
                    }
                }
            } catch (error) {
                console.error('[checkout][cardBrand] Erro ao detectar bandeira:', error);
                lastDetectedBinRef.current = '';
            }
        },
        [mercadoPago, selectedTab, onBrandDetected, onBrandCleared]
    );

    useEffect(() => {
        if (selectedTab !== 'card') {
            lastDetectedBinRef.current = '';
            lastCardBrandRef.current = '';
            setCardBrand('');
            return;
        }

        const cardNumberInput = getInputElement('form-checkout__cardNumber');
        if (!cardNumberInput) return;

        let cancelled = false;

        const handleInput = () => {
            if (cancelled) return;
            const value = cardNumberInput.value.replace(/\D/g, '');
            if (value.length >= 6) {
                void detectBrand(value);
            } else if (value.length === 0) {
                lastDetectedBinRef.current = '';
                lastCardBrandRef.current = '';
                setCardBrand('');
                onBrandCleared?.();
            }
        };

        // Verificar valor inicial (caso de refresh com campo preenchido)
        const currentValue = cardNumberInput.value.replace(/\D/g, '');
        if (currentValue.length >= 6) {
            setTimeout(() => {
                if (!cancelled) {
                    void detectBrand(currentValue);
                }
            }, 500);
        }

        cardNumberInput.addEventListener('input', handleInput);
        cardNumberInput.addEventListener('change', handleInput);
        cardNumberInput.addEventListener('blur', handleInput);

        return () => {
            cancelled = true;
            cardNumberInput.removeEventListener('input', handleInput);
            cardNumberInput.removeEventListener('change', handleInput);
            cardNumberInput.removeEventListener('blur', handleInput);
        };
    }, [mercadoPago, selectedTab, detectBrand, onBrandCleared]);

    // Resetar refs quando tab muda ou componente desmonta
    useEffect(() => {
        return () => {
            lastDetectedBinRef.current = '';
            lastCardBrandRef.current = '';
        };
    }, [selectedTab]);

    return {
        cardBrand,
        hasBrandChanged: (newBrand: string) => lastCardBrandRef.current !== newBrand && lastCardBrandRef.current !== '',
    };
};

