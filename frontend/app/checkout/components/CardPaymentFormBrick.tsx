'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { IsolatedCardPaymentBrick } from './IsolatedCardPaymentBrick';
import PaymentSuccessModal from '@/components/shared/PaymentSuccessModal';
import PaymentErrorModal from './PaymentErrorModal';

type PaymentStatusState = 'idle' | 'processing' | 'success' | 'error';

type CardPaymentFormBrickProps = {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    isCheckoutReady: boolean;
    isProcessing: boolean;
    status: PaymentStatusState;
    statusMessage: string;
    statusDetails: string[];
    isBlocked: boolean;
    redirectCountdown: number | null;
    maxAttemptsReached?: boolean;
    onStatusDismiss?: () => void;
    onStartNewOrder?: () => void;
    onNavigateTodashboard?: () => void;
    onCancelOrder?: () => void;
    onReady?: () => void;
    amount: number;
    publicKey: string;
    orderNumber?: string;
    validateCustomerData?: () => boolean;
};

export function CardPaymentFormBrick({
    onSubmit,
    isCheckoutReady,
    isProcessing,
    status,
    statusMessage,
    statusDetails,
    isBlocked,
    redirectCountdown,
    maxAttemptsReached = false,
    onStatusDismiss,
    onStartNewOrder,
    onNavigateTodashboard,
    onCancelOrder,
    onReady,
    amount,
    publicKey,
    orderNumber,
    validateCustomerData,
}: CardPaymentFormBrickProps) {
    // O Brick isolado gerencia sua própria montagem persistente
    // Este componente apenas gerencia overlay e comunicação

    // Status para modais
    const success = status === 'success';
    const error = status === 'error';
    const successMessages = success && statusDetails.length
        ? statusDetails
        : success && statusMessage
            ? [statusMessage]
            : [];
    const errorMessages = error && statusDetails.length
        ? statusDetails
        : error && statusMessage
            ? [statusMessage]
            : [];
    const overlayMessage =
        statusMessage ||
        (success
            ? 'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.'
            : 'Não foi possível processar o pagamento. Tente novamente.');


    // Handler para quando o Brick estiver pronto
    const handleReady = useCallback(() => {
        // Notificar componente pai que Brick está pronto
        if (onReady) {
            onReady();
        }
    }, [onReady]);

    // Handler para erros do Brick
    const handleError = useCallback((param: any) => {
        // Log apenas erros críticos
        if (param?.type === 'critical') {
        } else {
        }
    }, []);

    // Interceptar botão do brick para validar dados do comprador ANTES do brick validar
    useEffect(() => {
        if (!isCheckoutReady || !validateCustomerData) {
            return;
        }

        let interceptedButtons = new Set<HTMLButtonElement>();
        let observer: MutationObserver | null = null;

        // Função para encontrar e interceptar o botão do brick
        const interceptBrickButton = (button: HTMLButtonElement) => {
            // Se já foi interceptado, ignorar
            if (interceptedButtons.has(button)) {
                return;
            }

            // Marcar como interceptado
            interceptedButtons.add(button);
            button.setAttribute('data-intercepted', 'true');

            // Adicionar listener que intercepta o clique ANTES do brick processar
            const interceptClick = (e: MouseEvent) => {
                // Validar dados do comprador ANTES de permitir o submit do brick
                // A função validateCustomerData já dispara a validação nos campos
                const isValid = validateCustomerData();
                if (!isValid) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    // Mostrar erro e fazer scroll até o formulário de dados do comprador
                    const customerForm = document.getElementById('customer-data-form');
                    if (customerForm) {
                        customerForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    return false;
                }

                // Se válido, permitir que o brick continue normalmente
                return true;
            };

            // Adicionar listener com capture=true para interceptar ANTES do brick
            button.addEventListener('click', interceptClick, true);
        };

        // Função para procurar botões do brick
        const findAndInterceptButtons = () => {
            // Procurar o botão dentro do container do brick
            const brickContainer = document.getElementById('mp-brick-persistent-container') || 
                                   document.querySelector('[id*="mp-brick"]') ||
                                   document.querySelector('[class*="mercadopago"]') ||
                                   document.querySelector('[class*="mp-"]');

            if (brickContainer) {
                // Procurar por botões de submit dentro do container
                const buttons = brickContainer.querySelectorAll('button[type="submit"], button[class*="submit"], button[class*="pay"], button[class*="pagar"]');
                buttons.forEach((btn) => {
                    if (btn instanceof HTMLButtonElement && !btn.hasAttribute('data-intercepted')) {
                        // Verificar se o texto do botão indica que é o botão de pagar
                        const buttonText = btn.textContent?.toLowerCase() || '';
                        if (buttonText.includes('pagar') || buttonText.includes('pay') || buttonText.includes('continuar')) {
                            interceptBrickButton(btn);
                        }
                    }
                });
            }

            // Fallback: procurar em todo o documento por botões que possam ser do brick
            const allSubmitButtons = document.querySelectorAll('button[type="submit"]');
            allSubmitButtons.forEach((btn) => {
                if (btn instanceof HTMLButtonElement && 
                    !btn.hasAttribute('data-intercepted') &&
                    !interceptedButtons.has(btn)) {
                    const buttonText = btn.textContent?.toLowerCase() || '';
                    // Verificar se está próximo ao container do brick ou tem características do MP
                    const isNearBrick = brickContainer && (
                        brickContainer.contains(btn) || 
                        btn.closest('[class*="mercadopago"]') ||
                        btn.closest('[class*="mp-"]')
                    );
                    
                    if (isNearBrick && (buttonText.includes('pagar') || buttonText.includes('pay'))) {
                        interceptBrickButton(btn);
                    }
                }
            });
        };

        // Tentar interceptar imediatamente
        findAndInterceptButtons();

        // Usar MutationObserver para detectar quando o botão é adicionado ao DOM
        const brickContainer = document.getElementById('mp-brick-persistent-container') || 
                               document.querySelector('[id*="mp-brick"]') ||
                               document.body;

        if (brickContainer) {
            observer = new MutationObserver(() => {
                findAndInterceptButtons();
            });

            observer.observe(brickContainer, {
                childList: true,
                subtree: true,
                attributes: false,
            });
        }

        // Também tentar periodicamente (fallback caso o observer não capture)
        const interval = setInterval(() => {
            findAndInterceptButtons();
        }, 1000);

        // Cleanup
        return () => {
            if (observer) {
                observer.disconnect();
            }
            clearInterval(interval);
            interceptedButtons.forEach((btn) => {
                btn.removeAttribute('data-intercepted');
            });
            interceptedButtons.clear();
        };
    }, [isCheckoutReady, validateCustomerData]);

    // Handler para submit do Brick
    const handleBrickSubmit = useCallback(
        async (param: any) => {
            // Validar dados do comprador antes de processar o pagamento
            // A função validateCustomerData já dispara a validação nos campos
            if (validateCustomerData) {
                const isValid = validateCustomerData();
                if (!isValid) {
                    // Mostrar erro e fazer scroll até o formulário de dados do comprador
                    const customerForm = document.getElementById('customer-data-form');
                    if (customerForm) {
                        customerForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }
            }

            if (param.token) {
                // Armazenar token e dados do Brick no form
                const form = document.getElementById('checkout-card-form') as HTMLFormElement;
                if (form) {
                    const brickData = {
                        token: param.token,
                        installments: param.installments || param.installments_count || 1,
                        paymentMethodId: param.payment_method_id || param.paymentMethodId || '',
                        issuerId: param.issuer_id || param.issuerId || '',
                        cardholder: param.payer ? {
                            name: param.payer.name || '',
                            email: param.payer.email || '',
                            identification: param.payer.identification ? {
                                type: param.payer.identification.type || 'CPF',
                                number: param.payer.identification.number || '',
                            } : undefined,
                        } : undefined,
                    };


                    (form as any).__brickData = brickData;

                    const syntheticEvent = {
                        preventDefault: () => { },
                        stopPropagation: () => { },
                        nativeEvent: new Event('submit') as any,
                        bubbles: true,
                        cancelable: true,
                        defaultPrevented: false,
                        eventPhase: 0,
                        isTrusted: false,
                        timeStamp: Date.now(),
                        type: 'submit',
                        target: form,
                        currentTarget: form,
                    } as unknown as FormEvent<HTMLFormElement>;

                    onSubmit(syntheticEvent);
                } else {
                }
            } else {
            }
        },
        [onSubmit, validateCustomerData],
    );


    // Early return DEPOIS de todos os hooks
    if (!publicKey) {
        return (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Chave pública do Mercado Pago não configurada.
            </div>
        );
    }

    const isProcessingOverlay = isProcessing && !success && !error;

    return (
        <div className="mt-6 relative">
            {/* Mostrar loading apenas se checkout não está pronto, mas SEMPRE renderizar o form para manter o wrapper */}
            {!isCheckoutReady ? (
                <div className="flex h-[700px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="text-center">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#635BF5] mx-auto" />
                        <p className="text-sm text-gray-600">Carregando formulário de pagamento...</p>
                    </div>
                </div>
            ) : null}
            
            <form
                id="checkout-card-form"
                className={`relative space-y-4 ${!isCheckoutReady ? 'hidden' : ''}`}
                onSubmit={onSubmit}
                aria-busy={isProcessing}
                autoComplete="off"
            >
                {/* Brick isolado - montado uma única vez, apenas ocultado/mostrado */}
                {/* CRÍTICO: Sempre renderizar o Brick mesmo quando não está pronto para permitir montagem inicial */}
                {/* O Brick gerencia sua própria visibilidade internamente */}
                <IsolatedCardPaymentBrick
                    publicKey={publicKey}
                    amount={amount}
                    isVisible={isCheckoutReady}
                    onSubmit={handleBrickSubmit}
                    onReady={handleReady}
                    onError={handleError}
                />

                {/* Overlay de processamento próprio da aplicação */}
                {isProcessingOverlay && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#635BF5]" />
                        <p className="text-sm font-medium text-gray-800">
                            {statusMessage || 'Estamos processando seu pagamento...'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Isso pode levar alguns segundos. Não feche esta página.
                        </p>
                    </div>
                )}
            </form>

            {/* Modais padronizadas de sucesso e erro */}
            <PaymentSuccessModal
                isOpen={success}
                onClose={onNavigateTodashboard || (() => {})}
                orderNumber={orderNumber}
                message={successMessages.length > 0 ? successMessages[0] : overlayMessage}
                redirectCountdown={redirectCountdown}
            />
            <PaymentErrorModal
                isOpen={error}
                onClose={onStatusDismiss || (() => {})}
                onRetry={onStatusDismiss}
                onCancel={onCancelOrder}
                onStartNewOrder={onStartNewOrder}
                message={errorMessages[0] || overlayMessage}
                errorDetails={errorMessages}
                maxAttemptsReached={maxAttemptsReached}
                orderNumber={orderNumber}
            />
        </div>
    );
}

