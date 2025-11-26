'use client';

import { HiOutlineCreditCard } from 'react-icons/hi2';
import { SiPix } from 'react-icons/si';

interface PaymentTabsProps {
    selectedTab: 'card' | 'pix';
    onTabChange: (tab: 'card' | 'pix') => void;
    pixPaymentActive?: boolean;
}

export function PaymentTabs({ selectedTab, onTabChange, pixPaymentActive = false }: PaymentTabsProps) {
    return (
        <div className="mt-6 flex gap-3">
            <button
                type="button"
                onClick={() => {
                    if (!pixPaymentActive) {
                        onTabChange('card');
                    }
                }}
                disabled={pixPaymentActive}
                aria-disabled={pixPaymentActive}
                className={`flex-1 flex-row md:flex-col rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-normal transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${
                    selectedTab === 'card'
                        ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white md:shadow-[0_20px_45px_-20px_rgba(20,20,32,0.45)]'
                        : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                }`}
            >
                <span className="flex md:flex-row flex-col items-center justify-center gap-2">
                    <HiOutlineCreditCard className="text-base" />
                    Via Cartão
                </span>
            </button>
            <button
                type="button"
                onClick={() => onTabChange('pix')}
                className={`flex-1 rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-normal transition ${
                    selectedTab === 'pix'
                        ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white md:shadow-[0_20px_45px_-20px_rgba(20,20,32,0.45)]'
                        : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                }`}
            >
                <span className="flex md:flex-row flex-col items-center justify-center gap-2">
                    <SiPix className="text-base" />
                    via PIX
                </span>
            </button>
        </div>
    );
}

