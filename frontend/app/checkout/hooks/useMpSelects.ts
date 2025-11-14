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
    const checkingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const clearSelects = useCallback(() => {
        const installmentsSelect = getSelectElement(SELECT_IDS.INSTALLMENTS);
        const docTypeSelect = getSelectElement(SELECT_IDS.IDENTIFICATION_TYPE);

        clearSelectOptions(installmentsSelect);
        clearSelectOptions(docTypeSelect);

        setMpSelectReady({ installments: false, docType: false });
    }, []);

    // Popular tipo de documento sempre que estiver na tab card (não depende de bandeira)
    useEffect(() => {
        if (selectedTab !== 'card') {
            setMpSelectReady((prev) => ({ ...prev, docType: false }));
            return;
        }

        // Popular tipo de documento imediatamente
        populateDocTypeSelect();
        setMpSelectReady((prev) => ({ ...prev, docType: true }));
    }, [selectedTab]);

    // Quando cardBrand é detectado (usuário preencheu o cartão), verificar e popular selects
    useEffect(() => {
        if (selectedTab !== 'card') {
            return;
        }

        // Se a bandeira mudou, limpar opções antigas
        if (cardBrand && lastCardBrandRef.current && lastCardBrandRef.current !== cardBrand) {
            clearSelects();
            // Repopular docType após limpar (não depende de bandeira)
            populateDocTypeSelect();
        }

        // Se não tem bandeira ainda, limpar selects e parar verificação
        if (!cardBrand) {
            lastCardBrandRef.current = '';
            setMpSelectReady((prev) => ({ ...prev, installments: false }));
            
            // Limpar intervalo se existir
            if (checkingIntervalRef.current) {
                clearInterval(checkingIntervalRef.current);
                checkingIntervalRef.current = null;
            }
            return;
        }

        // Bandeira detectada - atualizar ref
        lastCardBrandRef.current = cardBrand;
        
        // Garantir que docType está populado (não depende de bandeira)
        populateDocTypeSelect();

        // Verificar periodicamente se os selects foram populados pelo Mercado Pago
        if (checkingIntervalRef.current) {
            clearInterval(checkingIntervalRef.current);
        }

        let attempts = 0;
        const maxAttempts = 100; // 10 segundos (100 * 100ms)

        checkingIntervalRef.current = setInterval(() => {
            attempts += 1;

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
                    if (onSelectsReady && typeof onSelectsReady === 'function') {
                        onSelectsReady(nextState);
                    }
                }

                return nextState;
            });

            // Parar se ambos estão prontos ou atingiu max tentativas
            if ((installmentsReady && docTypeReady) || attempts >= maxAttempts) {
                if (checkingIntervalRef.current) {
                    clearInterval(checkingIntervalRef.current);
                    checkingIntervalRef.current = null;
                }
            }
        }, 100);

        return () => {
            if (checkingIntervalRef.current) {
                clearInterval(checkingIntervalRef.current);
                checkingIntervalRef.current = null;
            }
        };
        }, [cardBrand, selectedTab, clearSelects, onSelectsReady]);

    // Resetar quando tab muda
    useEffect(() => {
        if (selectedTab !== 'card') {
            lastCardBrandRef.current = '';
            setMpSelectReady({ installments: false, docType: false });
            if (checkingIntervalRef.current) {
                clearInterval(checkingIntervalRef.current);
                checkingIntervalRef.current = null;
            }
        }
    }, [selectedTab]);

    return {
        mpSelectReady,
        clearSelects,
    };
};

