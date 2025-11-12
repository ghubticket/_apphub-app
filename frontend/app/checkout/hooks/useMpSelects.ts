import { useEffect, useState, useCallback, useRef } from 'react';
import {
    getSelectElement,
    populateDocTypeSelect,
    checkSelectsReady,
    clearSelectOptions,
    SELECT_IDS,
} from '../utils/cardFormHelpers';

type MpSelectReady = {
    installments: boolean;
    docType: boolean;
};

type UseMpSelectsOptions = {
    cardBrand: string;
    selectedTab: 'card' | 'pix';
    onSelectsReady?: (ready: MpSelectReady) => void;
};

export const useMpSelects = ({ cardBrand, selectedTab, onSelectsReady }: UseMpSelectsOptions) => {
    const [mpSelectReady, setMpSelectReady] = useState<MpSelectReady>({
        installments: false,
        docType: false,
    });
    const lastCardBrandRef = useRef<string>('');

    const clearSelects = useCallback(() => {
        const installmentsSelect = getSelectElement(SELECT_IDS.INSTALLMENTS);
        const docTypeSelect = getSelectElement(SELECT_IDS.IDENTIFICATION_TYPE);

        clearSelectOptions(installmentsSelect);
        clearSelectOptions(docTypeSelect);

        setMpSelectReady({ installments: false, docType: false });
    }, []);

    // Popular tipo de documento quando cardBrand é detectado
    useEffect(() => {
        if (selectedTab !== 'card' || !cardBrand) {
            if (selectedTab !== 'card') {
                setMpSelectReady({ installments: false, docType: false });
            }
            return;
        }

        // Se a bandeira mudou, limpar opções antigas
        if (lastCardBrandRef.current && lastCardBrandRef.current !== cardBrand) {
            clearSelects();
        }

        lastCardBrandRef.current = cardBrand;

        // Popular tipo de documento imediatamente
        populateDocTypeSelect();
    }, [cardBrand, selectedTab, clearSelects]);

    // Verificar periodicamente se os selects foram populados
    useEffect(() => {
        if (selectedTab !== 'card' || !cardBrand) {
            return;
        }

        let attempts = 0;
        const maxAttempts = 100; // 10 segundos (100 * 100ms)

        const interval = setInterval(() => {
            attempts += 1;

            // Garantir que tipo de documento está populado
            const docTypeSelect = getSelectElement(SELECT_IDS.IDENTIFICATION_TYPE);
            if (docTypeSelect) {
                const validOptions = Array.from(docTypeSelect.options).filter(
                    (opt) => opt.value && opt.value !== '' && !opt.disabled && !opt.hidden
                );
                if (validOptions.length === 0) {
                    populateDocTypeSelect();
                }
            }

            // Verificar estado dos selects
            const { installmentsReady, docTypeReady } = checkSelectsReady();

            setMpSelectReady((prev) => {
                const nextState = {
                    installments: installmentsReady || prev.installments,
                    docType: docTypeReady || prev.docType,
                };

                // Se mudou, notificar callback
                if (
                    prev.installments !== nextState.installments ||
                    prev.docType !== nextState.docType
                ) {
                    onSelectsReady?.(nextState);
                }

                return nextState;
            });

            // Parar se ambos estão prontos ou atingiu max tentativas
            if ((installmentsReady && docTypeReady) || attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [cardBrand, selectedTab, onSelectsReady]);

    // Resetar quando tab muda
    useEffect(() => {
        if (selectedTab !== 'card') {
            lastCardBrandRef.current = '';
            setMpSelectReady({ installments: false, docType: false });
        }
    }, [selectedTab]);

    return {
        mpSelectReady,
        clearSelects,
    };
};

