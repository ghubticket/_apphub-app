export const SELECT_IDS = {
    INSTALLMENTS: 'form-checkout__installments',
    IDENTIFICATION_TYPE: 'form-checkout__identificationType',
    CARD_NUMBER: 'form-checkout__cardNumber',
} as const;

export const getSelectElement = (id: string): HTMLSelectElement | null => {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id) as HTMLSelectElement | null;
};

export const getInputElement = (id: string): HTMLInputElement | null => {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id) as HTMLInputElement | null;
};

export const getValidSelectOptions = (select: HTMLSelectElement | null): HTMLOptionElement[] => {
    if (!select) return [];
    return Array.from(select.options).filter(
        (opt) => opt.value && opt.value !== '' && !opt.disabled && !opt.hidden
    );
};

export const hasValidOptions = (select: HTMLSelectElement | null): boolean => {
    return getValidSelectOptions(select).length > 0;
};

export const clearSelectOptions = (select: HTMLSelectElement | null): void => {
    if (!select) return;
    while (select.options.length > 0) {
        select.remove(0);
    }
    select.value = '';
};

export const populateDocTypeSelect = (): boolean => {
    const docTypeSelect = getSelectElement(SELECT_IDS.IDENTIFICATION_TYPE);
    if (!docTypeSelect) return false;

    // Se já tem opções válidas, não precisa popular novamente
    if (hasValidOptions(docTypeSelect)) {
        return true;
    }

    // Popular com opções padrão (CPF e CNPJ)
    const docTypeOptions = [
        { value: 'CPF', text: 'CPF' },
        { value: 'CNPJ', text: 'CNPJ' },
    ];

    // Limpar opções existentes
    clearSelectOptions(docTypeSelect);

    // Adicionar novas opções
    docTypeOptions.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        docTypeSelect.appendChild(optionElement);
    });

    // Selecionar CPF por padrão
    docTypeSelect.value = 'CPF';
    docTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
};

export const checkSelectsReady = (): {
    installmentsReady: boolean;
    docTypeReady: boolean;
} => {
    const installmentsSelect = getSelectElement(SELECT_IDS.INSTALLMENTS);
    const docTypeSelect = getSelectElement(SELECT_IDS.IDENTIFICATION_TYPE);

    const installmentsReady = hasValidOptions(installmentsSelect);
    const docTypeReady = hasValidOptions(docTypeSelect);

    return { installmentsReady, docTypeReady };
};

/**
 * Popula o select de parcelas manualmente usando a API do Mercado Pago
 */
export const populateInstallmentsSelect = async (
    mercadoPago: any,
    bin: string,
    totalAmount: number
): Promise<boolean> => {
    if (!mercadoPago || !bin || bin.length < 6 || totalAmount <= 0) {
        return false;
    }

    try {
        // Buscar métodos de pagamento usando o BIN
        const response: any = await (mercadoPago as any).getPaymentMethods({ bin });

        // Extrair resultado da resposta
        let paymentMethod: any = null;
        if (Array.isArray(response)) {
            paymentMethod = response[0];
        } else if (response?.results && Array.isArray(response.results)) {
            paymentMethod = response.results[0];
        } else if (response?.data && Array.isArray(response.data)) {
            paymentMethod = response.data[0];
        } else {
            paymentMethod = response;
        }

        if (!paymentMethod) {
            return false;
        }

        const paymentMethodId =
            paymentMethod.payment_method_id ||
            paymentMethod.id ||
            paymentMethod.payment_method?.id ||
            '';

        if (!paymentMethodId) {
            return false;
        }

        // Buscar opções de parcelamento usando getPaymentMethods com amount
        // O Mercado Pago retorna payer_costs dentro do payment_method quando passamos amount
        let payerCosts: any[] = [];
        
        try {
            // Tentar buscar com amount para obter parcelas
            const installmentsResponse: any = await (mercadoPago as any).getPaymentMethods({
                bin,
                amount: totalAmount.toFixed(2),
            });

            // Extrair payer_costs da resposta
            let paymentMethodWithCosts: any = null;
            if (Array.isArray(installmentsResponse)) {
                paymentMethodWithCosts = installmentsResponse[0];
            } else if (installmentsResponse?.results && Array.isArray(installmentsResponse.results)) {
                paymentMethodWithCosts = installmentsResponse.results[0];
            } else if (installmentsResponse?.data && Array.isArray(installmentsResponse.data)) {
                paymentMethodWithCosts = installmentsResponse.data[0];
            } else {
                paymentMethodWithCosts = installmentsResponse;
            }

            if (paymentMethodWithCosts?.payer_costs && Array.isArray(paymentMethodWithCosts.payer_costs)) {
                payerCosts = paymentMethodWithCosts.payer_costs;
            } else if (paymentMethodWithCosts?.financing_deals && Array.isArray(paymentMethodWithCosts.financing_deals)) {
                // Alternativa: usar financing_deals
                payerCosts = paymentMethodWithCosts.financing_deals;
            }
        } catch (error) {
            // Se falhar, tentar criar parcelas básicas
            if ((window as any).__cardTracking?.addEvent) {
                (window as any).__cardTracking.addEvent('info', 'Não foi possível buscar parcelas via API, criando opções básicas', {
                    error,
                    timestamp: new Date().toISOString(),
                });
            }
            
            // Criar opção básica de 1x
            payerCosts = [{
                installments: 1,
                installment_amount: totalAmount,
                total_amount: totalAmount,
            }];
        }

        if (!payerCosts || payerCosts.length === 0) {
            return false;
        }

        // Obter select de parcelas
        const installmentsSelect = getSelectElement(SELECT_IDS.INSTALLMENTS);
        if (!installmentsSelect) {
            return false;
        }

        // Limpar opções existentes (exceto a primeira placeholder)
        while (installmentsSelect.options.length > 1) {
            installmentsSelect.remove(1);
        }

        // Popular com opções de parcelamento
        payerCosts.forEach((cost: any) => {
            const installments = cost.installments || cost.installment_count || 1;
            const installmentAmount = cost.installment_amount || 0;
            const totalAmount = cost.total_amount || installmentAmount * installments;
            const recommendedMessage = cost.recommended_message || '';

            // Criar texto da opção
            let optionText = '';
            if (recommendedMessage) {
                optionText = recommendedMessage;
            } else if (installmentAmount > 0) {
                optionText = `${installments}x de R$ ${installmentAmount.toFixed(2).replace('.', ',')}`;
                if (totalAmount !== installmentAmount * installments) {
                    optionText += ` (R$ ${totalAmount.toFixed(2).replace('.', ',')})`;
                }
            } else {
                optionText = `${installments}x`;
            }

            // Criar e adicionar opção
            const option = document.createElement('option');
            option.value = installments.toString();
            option.textContent = optionText;
            installmentsSelect.appendChild(option);
        });

        // Disparar evento change para notificar outros componentes
        installmentsSelect.dispatchEvent(new Event('change', { bubbles: true }));

        if ((window as any).__cardTracking?.addEvent) {
            (window as any).__cardTracking.addEvent('installments_fetched', `Parcelas populadas manualmente: ${payerCosts.length} opções`, {
                count: payerCosts.length,
                bin,
                paymentMethodId,
                timestamp: new Date().toISOString(),
            });
        }

        return true;
    } catch (error) {
        if ((window as any).__cardTracking?.addEvent) {
            (window as any).__cardTracking.addEvent('error', `Erro ao popular parcelas manualmente: ${error}`, {
                error,
                bin,
                timestamp: new Date().toISOString(),
            });
        }
        return false;
    }
};
