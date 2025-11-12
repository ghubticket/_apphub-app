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

