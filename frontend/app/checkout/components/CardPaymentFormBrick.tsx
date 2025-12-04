'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
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

    // Handler para submit do Brick
    const handleBrickSubmit = useCallback(
        async (param: any) => {

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
        [onSubmit],
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

