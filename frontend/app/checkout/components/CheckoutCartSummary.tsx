'use client';

import { HiOutlineTicket, HiOutlineTrash } from 'react-icons/hi2';
import type { CheckoutCartItem } from '../types';

type CheckoutCartSummaryProps = {
    items: CheckoutCartItem[];
    totalTickets: number;
    totalAmount: number;
    pixPaymentActive: boolean;
    onRemoveItem: (id: string) => void;
};

export function CheckoutCartSummary({
    items,
    totalTickets,
    totalAmount,
    pixPaymentActive,
    onRemoveItem,
}: CheckoutCartSummaryProps) {
    return (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] relative">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">Resumo do pedido</h2>
                    <p className="text-xs text-[#7d796c]">Revise os ingressos antes de finalizar o pagamento.</p>
                </div>
                <span className="rounded-full border border-[#ded7ca] bg-[#f5f1e8] px-3 py-1 text-xs font-semibold uppercase tracking-normal text-[#6f6b63]">
                    {totalTickets} ingresso(s)
                </span>
            </header>

            <div className="mt-6 space-y-4">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] p-5 shadow-[0_15px_35px_-30px_rgba(20,20,32,0.35)]"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-normal text-[#a38f78]">
                                    <HiOutlineTicket className="text-sm" />
                                    {item.metadata?.category ?? 'Ingresso'}
                                </span>
                                <p className="text-base font-semibold uppercase tracking-normal text-[#1a1a1d]">{item.name}</p>
                                {item.date || item.location ? (
                                    <p className="text-xs text-[#7d796c]">
                                        {item.date}
                                        {item.date && item.location ? ' • ' : ''}
                                        {item.location}
                                    </p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                disabled={pixPaymentActive}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                    pixPaymentActive
                                        ? 'border-[#ded7ca] text-[#b5aa92] opacity-60 cursor-not-allowed'
                                        : 'border-[#ded7ca] text-[#7d796c] hover:border-rose-300 hover:text-rose-500'
                                }`}
                                onClick={() => onRemoveItem(item.id)}
                                aria-label={pixPaymentActive ? 'Não é possível remover itens enquanto há um pagamento pendente' : 'Remover do carrinho'}
                                title={pixPaymentActive ? 'Não é possível remover itens enquanto há um pagamento pendente' : 'Remover do carrinho'}
                            >
                                <HiOutlineTrash className="text-sm" />
                            </button>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-[#4c4c55] md:grid-cols-2">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Quantidade</span>
                                <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">{item.quantity} ingresso(s)</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Subtotal</span>
                                <p className="mt-1 text-sm text-[#1a1a1d]">R$ {item.subtotal.toFixed(2).replace('.', ',')}</p>
                            </div>
                            {item.platformFeeValue > 0 || item.fixedFeeValue > 0 ? (
                                <div className="md:col-span-2">
                                    <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Taxas</span>
                                    <p className="mt-1 text-sm text-[#1a1a1d]">
                                        R${' '}
                                        {(item.platformFeeValue + item.fixedFeeValue)
                                            .toFixed(2)
                                            .replace('.', ',')}
                                    </p>
                                </div>
                            ) : null}
                            <div className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">
                                    Total deste ingresso
                                </span>
                                <p className="mt-1 text-sm font-semibold text-[#1a1a1d]">
                                    R$ {item.total.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="mt-6 rounded-2xl border border-[#ede5d8] bg-white px-5 py-4">
                <span className="text-xs font-semibold uppercase tracking-normal text-[#7d796c]">Total a pagar</span>
                <p className="mt-2 text-2xl font-bold text-[#1a1a1d]">R$ {totalAmount.toFixed(2).replace('.', ',')}</p>
            </footer>
        </div>
    );
}

