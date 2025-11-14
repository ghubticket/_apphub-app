'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { IsolatedCardPaymentBrick } from './IsolatedCardPaymentBrick';

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
    onStatusDismiss?: () => void;
    onStartNewOrder?: () => void;
    onNavigateToOrders?: () => void;
    amount: number;
    publicKey: string;
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
    onStatusDismiss,
    onStartNewOrder,
    onNavigateToOrders,
    amount,
    publicKey,
}: CardPaymentFormBrickProps) {
    // O Brick isolado gerencia sua própria montagem persistente
    // Este componente apenas gerencia overlay e comunicação

    // Overlay APENAS para sucesso - erros são mostrados inline
    const showOverlay = status === 'success';
    const processing = status === 'processing';
    const success = status === 'success';
    const overlayMessage =
        statusMessage ||
        (success
            ? 'Pagamento aprovado com sucesso! Seus ingressos estão disponíveis.'
            : 'Não foi possível processar o pagamento. Tente novamente.');
    const errorMessages = statusDetails.length
        ? statusDetails
        : statusMessage
            ? [statusMessage]
            : [];

    const [overlayMounted, setOverlayMounted] = useState(false);
    const [overlayEntering, setOverlayEntering] = useState(false);

    useEffect(() => {
        if (showOverlay) {
            setOverlayMounted(true);
            const frame = requestAnimationFrame(() => setOverlayEntering(true));
            return () => cancelAnimationFrame(frame);
        }
        setOverlayEntering(false);
        const timeout = setTimeout(() => {
            setOverlayMounted(false);
        }, 250);
        return () => clearTimeout(timeout);
    }, [showOverlay]);

    const overlayActiveClass = overlayEntering
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 translate-y-3 pointer-events-none';

    // Handler para quando o Brick estiver pronto
    const handleReady = useCallback(() => {
        // Silencioso - Brick isolado gerencia seus próprios logs
    }, []);

    // Handler para erros do Brick
    const handleError = useCallback((param: any) => {
        // Log apenas erros críticos
        if (param?.type === 'critical') {
            console.error('[CardPaymentFormBrick] ⚠️ ERRO CRÍTICO NO BRICK:', param?.cause || param?.message);
        }
    }, []);

    // Handler para submit do Brick
    const handleBrickSubmit = useCallback(
        async (param: any) => {
            console.log('[CardPaymentFormBrick] 📤 handleBrickSubmit chamado com:', {
                hasToken: !!param.token,
                payment_method_id: param.payment_method_id,
                paymentMethodId: param.paymentMethodId,
                issuer_id: param.issuer_id,
                issuerId: param.issuerId,
                installments: param.installments,
                installments_count: param.installments_count,
                hasPayer: !!param.payer,
            });

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

                    console.log('[CardPaymentFormBrick] 💾 Armazenando dados no form:', {
                        token: brickData.token ? `${brickData.token.substring(0, 10)}...` : 'N/A',
                        installments: brickData.installments,
                        paymentMethodId: brickData.paymentMethodId,
                        issuerId: brickData.issuerId,
                    });

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

                    console.log('[CardPaymentFormBrick] ✅ Chamando onSubmit do form...');
                    onSubmit(syntheticEvent);
                } else {
                    console.error('[CardPaymentFormBrick] ❌ Form não encontrado!');
                }
            } else {
                console.error('[CardPaymentFormBrick] ❌ Token não encontrado no param!');
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

    // Mostrar loading apenas se checkout não está pronto
    if (!isCheckoutReady) {
        return (
            <div className="mt-6 flex h-[700px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#635BF5] mx-auto" />
                    <p className="text-sm text-gray-600">Carregando formulário de pagamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6">
            <form id="checkout-card-form" className="relative space-y-4" onSubmit={onSubmit} aria-busy={processing}>
                {/* Brick isolado - montado uma única vez, apenas ocultado/mostrado */}
                <IsolatedCardPaymentBrick
                    publicKey={publicKey}
                    amount={amount}
                    isVisible={true}
                    onSubmit={handleBrickSubmit}
                    onReady={handleReady}
                    onError={handleError}
                />
            </form>

            {/* Overlay de status - APENAS para sucesso (erros são mostrados inline) */}
            {overlayMounted && success ? (
                <>
                    <div
                        className={`pointer-events-none absolute inset-0 z-0 rounded-3xl transition-opacity duration-300 ${success && overlayEntering ? 'bg-green-50/90 opacity-100' : 'opacity-0'
                            }`}
                        aria-hidden="true"
                        style={{ minHeight: '600px' }}
                    />
                    <div
                        className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 rounded-3xl border px-6 py-10 text-center shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] backdrop-blur-sm transition-all duration-300 ease-out ${success ? 'border-green-200 bg-white/95' : 'border-[#ded7ca] bg-white/95'
                            } ${overlayActiveClass}`}
                        style={{ minHeight: '600px' }}
                    >
                        {success ? (
                            <div className="flex w-full max-w-md flex-col items-center gap-6">
                                <div className="w-full px-6 py-6 text-center text-sm leading-relaxed text-green-700">
                                    <h1 className="text-2xl font-bold uppercase text-green-600">
                                        Pagamento aprovado
                                    </h1>
                                    <div className="mt-4 space-y-2 text-sm leading-relaxed">
                                        {errorMessages.length > 0 ? (
                                            errorMessages.map((msg, index) => {
                                                const hasHTML = /<[^>]+>/.test(msg);
                                                if (hasHTML) {
                                                    return <p key={`${msg}-${index}`} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg }} />;
                                                }
                                                return <p key={`${msg}-${index}`} className="leading-relaxed">{msg}</p>;
                                            })
                                        ) : (
                                            <p className="leading-relaxed">{overlayMessage}</p>
                                        )}
                                    </div>
                                    {redirectCountdown !== null ? (
                                        <p className="mt-4 text-sm font-semibold text-green-600">
                                            Redirecionaremos você em {redirectCountdown}s para ver seus pedidos.
                                        </p>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={onNavigateToOrders}
                                    className="rounded-full border border-[#1a1a1d] px-6 py-3 text-[0.85rem] font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                >
                                    Ver meus pedidos
                                </button>
                            </div>
                        ) : null}
                        {/* Erros são mostrados inline (sem overlay) - ver componente de mensagem de erro abaixo */}
                    </div>
                </>
            ) : null}
        </div>
    );
}

