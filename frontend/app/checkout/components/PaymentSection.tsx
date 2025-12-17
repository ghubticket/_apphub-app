'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { SiPix } from 'react-icons/si';
import { PaymentTabs } from './PaymentTabs';
import { useCardPayment } from '../hooks/useCardPayment';
import { usePixPayment } from '../hooks/usePixPayment';
import type { UsePixPaymentReturn } from '../hooks/usePixPayment';
import { clearCartItems } from '@/lib/cart';
import { storageHelpers } from '../utils/storageHelpers';
import { getMercadoPagoDeviceId } from '../utils/deviceIdHelper';
import { 
    createParcelledOrder as createParcelledOrderAction,
    getPaymentStatus as getPaymentStatusAction 
} from '@/app/api/payments/actions';

const CardPaymentFormBrick = dynamic(
    () => import('./CardPaymentFormBrick').then((mod) => ({ default: mod.CardPaymentFormBrick })),
    {
        loading: () => <div className="mt-6 text-sm text-[#7d796c]">Carregando formulário de pagamento...</div>,
        ssr: false, // Desabilitar SSR para evitar problemas com Mercado Pago SDK
    }
);

const PixPaymentSection = dynamic(
    () => import('./PixPaymentSection').then((mod) => ({ default: mod.PixPaymentSection })),
    {
        loading: () => <div className="mt-6 text-sm text-[#7d796c]">Carregando seção PIX...</div>,
        ssr: false,
    }
);

type EntryParcelQrCode = {
    qrCode: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    parcelledOrderId: string;
    amount: number;
    expiresAt?: string | null;
};

interface PaymentSectionProps {
    selectedTab: 'card' | 'pix' | 'parcel';
    onTabChange: (tab: 'card' | 'pix' | 'parcel') => void;
    pixPaymentActive?: boolean;
    orderId: string | null;
    orderExpiresAt?: string | Date | null;
    totalAmount: number;
    customerEmail: string;
    onCancelOrder?: () => void;
    orderNumber?: string;
    pixPayment?: UsePixPaymentReturn; // Passar o hook do CheckoutLayout
    installmentsAvailable?: boolean;
    minInstallments?: number | null;
    maxInstallments?: number | null;
    primaryEventId?: string | null;
    primaryTicketTypeId?: string | null;
    primaryQuantity?: number | null;
    customerName?: string;
    customerCpf?: string;
    customerPhone?: string;
    entryParcelQrCode?: EntryParcelQrCode | null;
    onEntryParcelQrCodeChange?: (data: EntryParcelQrCode | null) => void;
}

export function PaymentSection({
    selectedTab,
    onTabChange,
    pixPaymentActive = false,
    orderId,
    orderExpiresAt,
    totalAmount,
    customerEmail,
    onCancelOrder,
    orderNumber,
    pixPayment: externalPixPayment,
    installmentsAvailable = false,
    minInstallments,
    maxInstallments,
    primaryEventId,
    primaryTicketTypeId,
    primaryQuantity,
    customerName,
    customerCpf,
    customerPhone,
    entryParcelQrCode,
    onEntryParcelQrCodeChange,
}: PaymentSectionProps) {
    const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    // Log removido para reduzir ruído - só logar em caso de erro

    // Hook para gerenciar pagamento com cartão
    const cardPayment = useCardPayment(orderId);

    // Hook para gerenciar pagamento PIX (passar expiresAt do pedido)
    // Se o hook foi passado como prop, usar ele; caso contrário, criar um novo
    // IMPORTANTE: O hook interno é criado sempre (regra dos hooks), mas só é usado se não houver hook externo
    const internalPixPayment = usePixPayment(orderId, orderExpiresAt);
    const pixPayment = externalPixPayment || internalPixPayment;

    // Estado local para fluxo de parcelamento manual
    const [selectedInstallments, setSelectedInstallments] = useState<number | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [cancellationAccepted, setCancellationAccepted] = useState(false);
    const [installmentError, setInstallmentError] = useState<string | null>(null);
    const [installmentLoading, setInstallmentLoading] = useState(false);

    const [pixCodeCopied, setPixCodeCopied] = useState(false);

    // Ref para o botão de finalizar parcelamento (para scroll automático no mobile)
    const finalizeButtonRef = useRef<HTMLButtonElement>(null);

    // Scroll automático para o botão de finalizar no mobile quando a aba de parcelamento for selecionada
    useEffect(() => {
        if (selectedTab === 'parcel' && finalizeButtonRef.current) {
            // Pequeno delay para garantir que o DOM foi atualizado
            setTimeout(() => {
                finalizeButtonRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'end' 
                });
            }, 300);
        }
    }, [selectedTab]);

    // Scroll automático quando houver erro de validação
    useEffect(() => {
        if (installmentError && finalizeButtonRef.current) {
            setTimeout(() => {
                finalizeButtonRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);
        }
    }, [installmentError]);

    // Handler para quando Brick estiver pronto
    const handleBrickReady = () => {
        cardPayment.handleBrickReady();
    };

    // Resolver range de parcelas:
    // - Se backend mandou min/max, usamos exatamente esse range.
    // - Se só mandou min, usamos min..12 como padrão.
    // - Se não mandou nada mas parcelamento está ativo (fallback), usamos 2..12.
    let resolvedMinInstallments: number | null =
        typeof minInstallments === 'number' && minInstallments > 0 ? minInstallments : null;
    let resolvedMaxInstallments: number | null =
        typeof maxInstallments === 'number' && maxInstallments > 0 ? maxInstallments : null;

    if (installmentsAvailable) {
        if (resolvedMinInstallments === null && resolvedMaxInstallments === null) {
            // Nenhuma info do backend: fallback mais amplo
            resolvedMinInstallments = 2;
            resolvedMaxInstallments = 12;
        } else {
            if (resolvedMinInstallments === null && resolvedMaxInstallments !== null) {
                // Só max definido: começar em 1x
                resolvedMinInstallments = 1;
            }
            if (resolvedMaxInstallments === null && resolvedMinInstallments !== null) {
                // Só min definido: ir até 12 como padrão
                resolvedMaxInstallments = Math.max(resolvedMinInstallments, 12);
            }
        }
    }

    const canShowInstallmentsOptions =
        installmentsAvailable && resolvedMinInstallments !== null && resolvedMaxInstallments !== null && totalAmount > 0;

    const isParcelSubmitDisabled =
        installmentLoading ||
        !installmentsAvailable ||
        !canShowInstallmentsOptions ||
        !selectedInstallments ||
        !termsAccepted ||
        !cancellationAccepted;

    // Travar / ocultar abas quando já existe um PIX ativo (à vista ou entrada de parcelamento),
    // para evitar que o usuário tente mudar de método no meio do fluxo.
    const hasActivePixLikePayment = !!pixPayment.pixResult || !!entryParcelQrCode;

    const handleCreateParcelledOrder = async () => {
        if (!canShowInstallmentsOptions) return;

        if (!selectedInstallments) {
            setInstallmentError('Escolha em quantas parcelas deseja dividir seu pacote.');
            return;
        }

        if (!termsAccepted || !cancellationAccepted) {
            setInstallmentError('Para continuar, é necessário aceitar os termos de parcelamento e cancelamento.');
            return;
        }

        if (!primaryEventId || !primaryTicketTypeId || !primaryQuantity) {
            setInstallmentError('Não foi possível identificar o pacote selecionado. Atualize a página e tente novamente.');
            return;
        }

        if (!customerName || !customerEmail || !customerCpf) {
            setInstallmentError('Preencha nome, e-mail e CPF antes de finalizar o parcelamento.');
            // Scroll até a seção de dados do comprador no mobile
            setTimeout(() => {
                const customerFormElement = document.getElementById('customer-data-form');
                if (customerFormElement) {
                    customerFormElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 100);
            return;
        }

        try {
            setInstallmentLoading(true);
            setInstallmentError(null);

            // Obter deviceId do Mercado Pago (necessário para PIX em produção)
            const deviceId = getMercadoPagoDeviceId();

            const payload = {
                eventId: primaryEventId,
                ticketTypeId: primaryTicketTypeId,
                quantity: primaryQuantity,
                installmentsCount: selectedInstallments,
                paymentType: 'pix' as const,
                customerData: {
                    name: customerName,
                    email: customerEmail,
                    cpf: customerCpf,
                    phone: customerPhone,
                },
                deviceId, // Incluir deviceId para melhorar rastreamento no Mercado Pago
            };

            // Log detalhado do payload antes de enviar
            console.log('[PaymentSection] Criando pedido parcelado - Payload:', {
                eventId: primaryEventId,
                ticketTypeId: primaryTicketTypeId,
                quantity: primaryQuantity,
                installmentsCount: selectedInstallments,
                customerEmail: customerEmail,
                customerName: customerName,
                hasDeviceId: !!deviceId,
                deviceId: deviceId?.substring(0, 20) + '...', // Log parcial por segurança
            });

            // Obter token de autenticação
            const token = localStorage.getItem('accessToken') || 
                        sessionStorage.getItem('accessToken') || 
                        localStorage.getItem('token') || 
                        null;
            
            // Usar Server Action para criar pedido parcelado (nunca expõe URL da API)
            const response = await createParcelledOrderAction(
                payload,
                token ? { 'Authorization': `Bearer ${token}` } : {}
            );

            // Log da resposta
            console.log('[PaymentSection] Resposta do backend:', {
                success: response?.success,
                hasParcelledOrder: !!response?.data?.parcelledOrder,
                hasParcels: !!response?.data?.parcels,
                hasEntryPixPayment: !!response?.data?.entryPixPayment,
                parcelledOrderId: response?.data?.parcelledOrder?._id || response?.data?.parcelledOrder?.id,
            });

            if (!response?.success || !response?.data?.parcelledOrder) {
                throw new Error(response?.message || 'Erro ao criar venda parcelada. Tente novamente.');
            }

            const { parcelledOrder, parcels, entryPixPayment } = response.data;

            // Buscar a parcela de entrada (sequence 0) que deve ter o QR code
            const entryParcel = Array.isArray(parcels)
                ? parcels.find((p: any) => p.sequence === 0)
                : null;

            if (entryParcel && entryParcel.qrCode) {
                // Log do QR code gerado
                console.log('[PaymentSection] QR Code da entrada gerado com sucesso:', {
                    hasQrCode: !!entryParcel.qrCode,
                    hasQrCodeBase64: !!entryParcel.qrCodeBase64,
                    paymentId: entryParcel.paymentId,
                    amount: entryParcel.amount,
                    expiresAt: entryPixPayment?.expiresAt,
                });

                // Usar expiresAt da resposta do backend (já vem do createPixPayment)
                // Se não vier na resposta, tentar buscar via API como fallback
                let expiresAt: string | null = entryPixPayment?.expiresAt || null;
                
                // Fallback: buscar via API se não veio na resposta
                if (!expiresAt && entryParcel.paymentId) {
                    try {
                        console.log('[PaymentSection] Buscando expiração do PIX via API...', {
                            paymentId: entryParcel.paymentId,
                        });
                        // Obter token de autenticação
                        const token = localStorage.getItem('accessToken') || 
                                    sessionStorage.getItem('accessToken') || 
                                    localStorage.getItem('token') || 
                                    null;
                        
                        // Usar Server Action para buscar status (nunca expõe URL da API)
                        const paymentStatusResp = await getPaymentStatusAction(
                            entryParcel.paymentId,
                            token ? { 'Authorization': `Bearer ${token}` } : {}
                        );
                        expiresAt = paymentStatusResp?.data?.expiresAt || null;
                        console.log('[PaymentSection] Expiração obtida:', { expiresAt });
                    } catch (error) {
                        // Log do erro ao buscar expiração
                        console.error('[PaymentSection] Erro ao buscar expiração do PIX:', {
                            error: error instanceof Error ? error.message : String(error),
                            paymentId: entryParcel.paymentId,
                            response: (error as any)?.response?.data,
                        });
                    }
                }

                // Exibir QR code da entrada (experiência visual igual ao PIX, mas mantendo na aba de parcelamento)
                const qrData: EntryParcelQrCode = {
                    qrCode: entryParcel.qrCode,
                    qrCodeBase64: entryParcel.qrCodeBase64,
                    ticketUrl: entryParcel.ticketUrl,
                    parcelledOrderId: parcelledOrder._id || parcelledOrder.id,
                    amount: entryParcel.amount,
                    expiresAt: expiresAt,
                };

                if (onEntryParcelQrCodeChange) {
                    onEntryParcelQrCodeChange(qrData);
                }
            } else {
                // Log de aviso: QR code não foi gerado
                console.warn('[PaymentSection] Pedido parcelado criado mas QR code não foi gerado:', {
                    hasEntryParcel: !!entryParcel,
                    entryParcelStatus: entryParcel?.status,
                    hasQrCode: !!entryParcel?.qrCode,
                    hasPaymentId: !!entryParcel?.paymentId,
                    parcelledOrderId: parcelledOrder?._id || parcelledOrder?.id,
                });

                // Se não houver QR code, redirecionar para o dashboard
                if (typeof window !== 'undefined') {
                    storageHelpers.clearActiveOrderId();
                    storageHelpers.clearTimerStartTime();
                    clearCartItems();
                    (window as any).__ALLOW_NAVIGATION__ = true;
                    window.onbeforeunload = null;

                    setTimeout(() => {
                        window.location.replace('/dashboard');
                    }, 80);
                }
            }
        } catch (error: any) {
            // Log detalhado do erro
            console.error('[PaymentSection] Erro ao criar pedido parcelado:', {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                responseStatus: error?.response?.status,
                responseData: error?.response?.data,
                responseErrors: error?.response?.data?.errors,
                requestPayload: {
                    eventId: primaryEventId,
                    ticketTypeId: primaryTicketTypeId,
                    quantity: primaryQuantity,
                    installmentsCount: selectedInstallments,
                    customerEmail: customerEmail,
                },
            });

            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Não foi possível criar o parcelamento. Tente novamente.';
            setInstallmentError(message);
        } finally {
            setInstallmentLoading(false);
        }
    };

    const isDevEnv = process.env.NODE_ENV !== 'production';

    return (
        <div className="rounded-2xl border border-[#ded7ca] bg-white p-6  relative">
            <header className="flex items-center justify-between pb-5">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        Pague via Cartão ou PIX
                    </h2>
                </div>
            </header>

            {!MP_PUBLIC_KEY ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Configure a variável{' '}
                    <span className="rounded bg-[#f5f1e8] px-1 font-mono text-xs">NEXT_PUBLIC_MP_PUBLIC_KEY</span> para
                    habilitar o checkout do Mercado Pago.
                </div>
            ) : null}

            {!hasActivePixLikePayment && (
                <PaymentTabs
                    selectedTab={selectedTab}
                    onTabChange={onTabChange}
                    pixPaymentActive={pixPaymentActive || hasActivePixLikePayment}
                    showInstallmentsTab={installmentsAvailable}
                />
            )}

            {/* Formulários de pagamento */}
            {selectedTab === 'card' ? (
                <div className="mt-6">
                    {MP_PUBLIC_KEY && orderId ? (
                        <CardPaymentFormBrick
                            onSubmit={cardPayment.handleFormSubmit}
                            isCheckoutReady={cardPayment.isCheckoutReady}
                            isProcessing={cardPayment.isProcessing}
                            status={cardPayment.status}
                            statusMessage={cardPayment.statusMessage}
                            statusDetails={cardPayment.statusDetails}
                            isBlocked={!orderId || totalAmount <= 0}
                            redirectCountdown={cardPayment.redirectCountdown}
                            onStatusDismiss={cardPayment.dismissStatus}
                            maxAttemptsReached={cardPayment.maxAttemptsReached}
                            onStartNewOrder={onCancelOrder} // Usar mesmo handler que cancela e vai para home
                            orderNumber={orderNumber}
                            onNavigateTodashboard={() => {
                                // CRÍTICO: Limpar todo o estado do checkout antes de redirecionar
                                // Isso garante que não haja dados residuais após o pagamento aprovado
                                if (typeof window !== 'undefined') {
                                    // Limpar pedido ativo do storage
                                    storageHelpers.clearActiveOrderId();

                                    // Limpar timer do checkout
                                    storageHelpers.clearTimerStartTime();

                                    // Limpar carrinho (já que o pagamento foi aprovado)
                                    clearCartItems();

                                    // Definir flag global para permitir navegação sem alerta
                                    // Isso garante que o useNavigationGuard não mostre o alerta durante o redirecionamento
                                    (window as any).__ALLOW_NAVIGATION__ = true;

                                    // Limpar onbeforeunload
                                    window.onbeforeunload = null;

                                    // Pequeno delay para garantir que a flag foi definida e o React atualizou
                                    setTimeout(() => {
                                        // Usar window.location.replace para forçar navegação completa
                                        // Isso remove automaticamente todos os event listeners
                                        window.location.replace('/dashboard');
                                    }, 50);
                                }
                            }}
                            onCancelOrder={onCancelOrder}
                            amount={totalAmount}
                            publicKey={MP_PUBLIC_KEY}
                            onReady={handleBrickReady}
                        />
                    ) : (
                        <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                            {!orderId ? 'Aguardando criação do pedido...' : 'Configurando formulário de pagamento...'}
                        </div>
                    )}
                </div>
            ) : selectedTab === 'pix' ? (
                <div className="mt-0">
                    {orderId ? (
                        <PixPaymentSection
                            pixResult={pixPayment.pixResult}
                            pixExpirationDescription={pixPayment.pixExpirationDescription || ''}
                            pixGenerationDeadlineMinutes={pixPayment.pixGenerationDeadlineMinutes}
                            isCheckoutReady={pixPayment.isCheckoutReady}
                            isProcessing={pixPayment.isProcessing}
                            pixPaymentActive={pixPaymentActive}
                            pixCopySuccess={pixPayment.pixCopySuccess}
                            onCopyCode={pixPayment.handleCopyCode}
                            onSubmit={pixPayment.handleFormSubmit}
                            pixStatus={pixPayment.status}
                            pixStatusMessage={pixPayment.statusMessage}
                            redirectCountdown={pixPayment.redirectCountdown}
                            onNavigateToOrders={pixPayment.onNavigateToOrders}
                            orderNumber={orderNumber}
                        />
                    ) : (
                        <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                            Aguardando criação do pedido...
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-5">
                    {entryParcelQrCode ? (
                        // Fluxo de parcelamento: QR Code da entrada mostrado na própria aba de parcelamento,
                        // mas com o mesmo layout visual do PIX.
                        <div className="space-y-4 rounded-2xl border border-[#ded7ca] bg-white p-5">
                            {/* Topo: Ícone + Instruções */}
                            <div className="flex text-center items-center flex-col gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f1e8] text-[#a38f78]">
                                    <SiPix className="text-xl" />
                                </div>
                                <div>
                                    <p className="pb-1 text-sm font-semibold text-[#1a1a1d]">
                                        Escaneie o QR Code ou copie o código PIX da entrada abaixo.
                                    </p>
                                    <p className="text-xs text-[#7d796c]">
                                        O pagamento é processado pelo Mercado Pago, com toda a segurança da plataforma.
                                    </p>
                                </div>
                            </div>

                            {/* QR Code e Código copia-e-cola */}
                            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                <div className="flex-1 flex justify-center">
                                    {entryParcelQrCode.qrCodeBase64 ? (
                                        <img
                                            src={`data:image/png;base64,${entryParcelQrCode.qrCodeBase64}`}
                                            alt="QR Code PIX - Entrada"
                                            className="mx-auto flex-1 rounded-2xl border border-[#ded7ca] bg-white p-3"
                                        />
                                    ) : null}
                                </div>

                                <div className="flex-1 flex flex-col justify-center space-y-3 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3">
                                    <p className="text-center text-xs font-semibold uppercase tracking-normal text-[#7d796c]">
                                        Código copia e cola da entrada
                                    </p>
                                    <p className="mt-1 break-all text-center text-sm text-[#1a1a1d]">
                                        {entryParcelQrCode.qrCode}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(entryParcelQrCode.qrCode);
                                                setPixCodeCopied(true);
                                                setTimeout(() => setPixCodeCopied(false), 2000);
                                            } catch (err) {
                                                // Fallback para navegadores antigos
                                                const textArea = document.createElement('textarea');
                                                textArea.value = entryParcelQrCode.qrCode;
                                                document.body.appendChild(textArea);
                                                textArea.select();
                                                document.execCommand('copy');
                                                document.body.removeChild(textArea);
                                                setPixCodeCopied(true);
                                                setTimeout(() => setPixCodeCopied(false), 2000);
                                            }
                                        }}
                                        className="inline-flex w-full items-center justify-center rounded-full border border-[#1a1a1d] px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#1a1a1d] transition hover:border-[#f97316] hover:text-[#f97316]"
                                    >
                                        {pixCodeCopied ? '✓ Código copiado!' : 'Copiar código'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl text-center border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                                <p>
                                    <strong>Importante:</strong> Após o pagamento da entrada, você receberá um e-mail de
                                    confirmação e poderá acompanhar todas as parcelas e vencimentos no seu painel de
                                    cliente.
                                </p>
                            </div>

                            {/* Box verde de status - movido para baixo */}
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-[#b6f0d2] bg-[#f1fff6] px-4 py-3 text-center md:text-left">
                                <div className="flex-shrink-0">
                                    <div className="relative h-5 w-5">
                                        <div className="absolute inset-0 animate-spin rounded-full border-2 border-[#1f5d3d] border-t-transparent"></div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm  pb-2 text-center font-semibold text-[#1f5d3d]">
                                        Seu pedido parcelado está criado  e aguardando pagamento da entrada via PIX.
                                        {pixPayment.pixExpirationDescription ? (
                                            <span className="font-normal">
                                                {' '}
                                                (Pagar até:{' '}
                                                {pixPayment.pixExpirationDescription.replace(
                                                    'Você pode pagar até: ',
                                                    '',
                                                )}
                                                )
                                            </span>
                                        ) : null}
                                    </p>
                                    <p className=" text-center mt-1 text-sm text-[#2b6b47]">
                                        Assim que a entrada de{' '}
                                        <strong>
                                            R$ {entryParcelQrCode.amount.toFixed(2).replace('.', ',')}
                                        </strong>{' '}
                                        for compensada, as demais parcelas serão <br /> liberadas automaticamente, e seu pedido será confirmado.
                                    </p>
                                    <p className="text-center mt-1 text-sm text-[#2b6b47]">
                                        Atualizado em tempo real...
                                    </p>
                                </div>
                            </div>

                            {/* Timer de expiração dinâmico - abaixo do box verde */}
                            {entryParcelQrCode.expiresAt && (
                                <div className="mt-2">
                                    <PixExpirationTimer expiresAt={entryParcelQrCode.expiresAt} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="">
                            <div className="rounded-2xl mt-4 border border-[#ede5d8] bg-[#faf7f0] px-4 py-4 text-sm text-[#4c4c55]">
                                <p className="text-xs text-[#46433b]">
                                    Nesta opção você paga uma entrada agora e o restante em parcelas futuras geradas via PIX.
                                    O QR Code de acesso ao seu pacote só é liberado após o pagamento de todas as parcelas.
                                </p>
                            </div>

                            {canShowInstallmentsOptions && (
                                <div className="rounded-2xl my-4 border border-[#ede5d8] bg-white px-4 py-4">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-normal text-[#7d796c]">
                                        Parcelas Disponíveis para esse Pacote
                                    </p>

                                    {/* Mobile: SELECT compacto e legível */}
                                    <div className="block sm:hidden space-y-2">
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-full border border-[#ded7ca] bg-[#faf7f0] px-4 py-2.5 pr-10 text-[0.78rem] font-semibold uppercase tracking-normal text-[#4c4c55] focus:border-[#1a1a1d] focus:outline-none"
                                                value={selectedInstallments ?? ''}
                                                onChange={(e) => {
                                                    const value = Number(e.target.value);
                                                    if (!Number.isNaN(value)) {
                                                        setSelectedInstallments(value);
                                                    }
                                                }}
                                            >
                                                <option value="" disabled>
                                                    Vai pagar em quantas parcelas?
                                                </option>
                                                {Array.from(
                                                    {
                                                        length:
                                                            (resolvedMaxInstallments as number) -
                                                            (resolvedMinInstallments as number) +
                                                            1,
                                                    },
                                                    (_, idx) => (resolvedMinInstallments as number) + idx,
                                                ).map((qty) => (
                                                    <option key={qty} value={qty}>
                                                        {qty}x de R$ {(totalAmount / qty).toFixed(2).replace('.', ',')}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.65rem] text-[#7d796c]">
                                                ▼
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[#a38f78]">
                                            Valores simulados com os juros da plataforma.
                                        </p>
                                    </div>

                                    {/* Desktop: botões pill em grid preenchendo a largura */}
                                    <div className="hidden sm:block">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2">
                                            {Array.from(
                                                {
                                                    length:
                                                        (resolvedMaxInstallments as number) -
                                                        (resolvedMinInstallments as number) +
                                                        1,
                                                },
                                                (_, idx) => (resolvedMinInstallments as number) + idx,
                                            ).map((qty) => {
                                                const isActive = selectedInstallments === qty;
                                                return (
                                                    <button
                                                        key={qty}
                                                        type="button"
                                                        onClick={() => setSelectedInstallments(qty)}
                                                        className={`w-full rounded-full border px-4 py-2 text-sm font-light uppercase tracking-normal text-center transition ${
                                                            isActive
                                                                ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white'
                                                                : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#1a1a1d] hover:bg-[#1a1a1d] hover:text-white'
                                                        }`}
                                                    >
                                                        {qty}x de{' '}
                                                        <strong className="font-bold">
                                                            R$ {(
                                                                totalAmount / qty
                                                            ).toFixed(2).replace('.', ',')}
                                                        </strong>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 rounded-2xl border border-[#ede5d8] bg-white px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">
                                    Termos de compromisso e cancelamento
                                </p>
                                <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl bg-[#faf7f0] px-4 py-3 text-[11px] text-[#4c4c55]">
                                    <p>
                                        Ao escolher parcelar seu pacote, você declara estar ciente de que o valor total será
                                        dividido em parcelas com vencimentos futuros, geradas via PIX, e que todas as parcelas
                                        precisam ser pagas até a data de vencimento para manter seu acesso.
                                    </p>
                                    <p>
                                        O não pagamento de uma ou mais parcelas dentro do prazo poderá resultar na suspensão ou
                                        cancelamento automático do seu pacote, sem devolução dos valores já pagos, conforme
                                        política de cancelamento do organizador.
                                    </p>
                                    <p>
                                        O QR Code e/ou credenciais de acesso ao evento apenas serão liberados após a quitação de
                                        todas as parcelas do pacote. Enquanto houver parcelas em aberto, o acesso pode permanecer
                                        bloqueado.
                                    </p>
                                    <p>
                                        Ao seguir com o parcelamento, você autoriza o envio de lembretes de vencimento e
                                        comunicações relacionadas às suas parcelas por e-mail e outros canais informados no
                                        cadastro.
                                    </p>
                                </div>

                                <div className="space-y-2 text-[11px] text-[#4c4c55]">
                                    <label className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-3 w-3 rounded border-[#c4b8a4]"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                        />
                                        <span>
                                            Confirmo que li e concordo com os termos de parcelamento e cancelamento acima.
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-3 w-3 rounded border-[#c4b8a4]"
                                            checked={cancellationAccepted}
                                            onChange={(e) => setCancellationAccepted(e.target.checked)}
                                        />
                                        <span>
                                            Estou ciente de que o não pagamento das parcelas poderá cancelar meu pacote sem
                                            reembolso dos valores já pagos.
                                        </span>
                                    </label>
                                </div>

                                {installmentError && (
                                    <p className="mt-1 text-[11px] text-[#b3261e]">{installmentError}</p>
                                )}

                                <button
                                    ref={finalizeButtonRef}
                                    type="button"
                                    onClick={handleCreateParcelledOrder}
                                    className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-[#111114] disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isParcelSubmitDisabled}
                                >
                                    {installmentLoading ? 'Criando parcelamento...' : 'Finalizar parcelamento via PIX'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Total a pagar - clean e flat */}
            <div className="mt-6 border-t border-[#ede5d8] pt-6">
                <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium uppercase tracking-normal text-[#7d796c]">Total a pagar</span>
                    <p className="text-2xl font-bold text-[#1a1a1d]">
                        R$ {totalAmount.toFixed(2).replace('.', ',')}
                    </p>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                <div className="flex items-center gap-3">
                    <span className="mt-0.5 text-[#a38f78]">
                        <SiPix className="text-base" />
                    </span>
                    <p>
                        Pagamentos processados pelo Mercado Pago (Checkout Transparente). Ambiente seguro, com antifraude
                        e 3D Secure quando necessário.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Componente para exibir timer de expiração do PIX
function PixExpirationTimer({ expiresAt }: { expiresAt: string }) {
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const expirationDate = new Date(expiresAt);
            const now = new Date();
            const diff = expirationDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining(0);
                setIsExpired(true);
                return;
            }

            setIsExpired(false);
            setTimeRemaining(Math.floor(diff / 1000)); // segundos restantes
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    if (timeRemaining === null) {
        return (
            <p className="text-xs text-emerald-600">
                ⏰ Carregando tempo restante...
            </p>
        );
    }

    if (isExpired || timeRemaining <= 0) {
        return (
            <p className="text-xs font-semibold text-red-600">
                ⚠️ Código PIX expirado
            </p>
        );
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;

    return (
        <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2">
            <p className="text-xs text-center font-semibold text-emerald-800">
                ⏰ Você tem:{' '}
                {hours > 0 && (
                    <span className="text-emerald-900">
                        {hours}h {displayMinutes.toString().padStart(2, '0')}min {seconds.toString().padStart(2, '0')}s
                    </span>
                )}
                {hours === 0 && (
                    <span className="text-emerald-900">
                        {displayMinutes}min {seconds.toString().padStart(2, '0')}s
                    </span>
                )}
                {' '}para pagar
            </p>
        </div>
    );
}


