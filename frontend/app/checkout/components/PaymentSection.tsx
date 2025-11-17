'use client';

import dynamic from 'next/dynamic';
import { SiPix } from 'react-icons/si';
import { PaymentTabs } from './PaymentTabs';
import { useCardPayment } from '../hooks/useCardPayment';
import { clearCartItems } from '@/lib/cart';
import { storageHelpers } from '../utils/storageHelpers';

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

interface PaymentSectionProps {
    selectedTab: 'card' | 'pix';
    onTabChange: (tab: 'card' | 'pix') => void;
    pixPaymentActive?: boolean;
    orderId: string | null;
    totalAmount: number;
    customerEmail: string;
    onCancelOrder?: () => void;
}

export function PaymentSection({ 
    selectedTab, 
    onTabChange, 
    pixPaymentActive = false,
    orderId,
    totalAmount,
    customerEmail,
    onCancelOrder,
}: PaymentSectionProps) {
    const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    
    // Hook para gerenciar pagamento com cartão
    const cardPayment = useCardPayment(orderId);

    // Handler para quando Brick estiver pronto
    const handleBrickReady = () => {
        cardPayment.handleBrickReady();
    };

    return (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] relative">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        Formas de pagamento
                    </h2>
                    <p className="text-xs text-[#7d796c]">
                        Utilize cartão de crédito ou gere um PIX instantâneo via Mercado Pago.
                    </p>
                </div>
            </header>

            {!MP_PUBLIC_KEY ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Configure a variável{' '}
                    <span className="rounded bg-[#f5f1e8] px-1 font-mono text-xs">NEXT_PUBLIC_MP_PUBLIC_KEY</span> para
                    habilitar o checkout do Mercado Pago.
                </div>
            ) : null}

            <PaymentTabs selectedTab={selectedTab} onTabChange={onTabChange} pixPaymentActive={pixPaymentActive} />

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
            ) : (
                <div className="mt-6">
                    {/* PixPaymentSection será integrado quando as regras forem passadas */}
                    <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3 text-xs text-[#7d796c]">
                        Formulário PIX será implementado aqui
                    </div>
                </div>
            )}

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

