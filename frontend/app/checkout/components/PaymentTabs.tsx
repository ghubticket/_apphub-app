'use client';

import { HiOutlineCreditCard, HiOutlineBanknotes } from 'react-icons/hi2';
import { SiPix } from 'react-icons/si';

interface PaymentTabsProps {
    selectedTab: 'card' | 'pix' | 'parcel';
    onTabChange: (tab: 'card' | 'pix' | 'parcel') => void;
    pixPaymentActive?: boolean;
    showInstallmentsTab?: boolean;
}

export function PaymentTabs({
    selectedTab,
    onTabChange,
    pixPaymentActive = false,
    showInstallmentsTab = false,
}: PaymentTabsProps) {
    return (
        <div className="flex flex-col md:flex-row gap-3 w-full">
            {/* CARTÃO e PIX - ocupam 50% cada quando não há parcelamento, ou dividem igualmente quando há */}
            <button
                type="button"
                onClick={() => {
                    if (!pixPaymentActive) {
                        onTabChange('card');
                    }
                }}
                disabled={pixPaymentActive}
                aria-disabled={pixPaymentActive}
                className={`flex-1 flex-column rounded-full border px-5 py-3 text-xs font-light uppercase tracking-normal transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${selectedTab === 'card'
                        ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white'
                        : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                    }`}
            >
                <span className="flex items-center justify-center gap-2">
                    <HiOutlineCreditCard className="text-base" />
                    Cartão
                </span>
            </button>
            <button
                type="button"
                onClick={() => onTabChange('pix')}
                className={`flex-1 rounded-full border px-5 py-3 text-xs font-light uppercase tracking-normal transition ${selectedTab === 'pix'
                        ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white'
                        : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                    }`}
            >
                <span className="flex items-center justify-center gap-2">
                    <SiPix className="text-base" />
                    PIX
                </span>
            </button>

            {/* PARCELAMENTO DISPONÍVEL - divide igualmente quando disponível */}
            {showInstallmentsTab && (
                <button
                    type="button"
                    onClick={() => {
                        if (!pixPaymentActive) {
                            onTabChange('parcel');
                        }
                    }}
                    disabled={pixPaymentActive}
                    aria-disabled={pixPaymentActive}
                    className={`flex-1 flex-column rounded-full border px-5 py-3 text-xs font-light uppercase tracking-normal transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${selectedTab === 'parcel'
                            ? 'border-[#1a1a1d] bg-[#1a1a1d] text-white'
                            : 'border-[#ded7ca] bg-[#faf7f0] text-[#4c4c55] hover:border-[#a38f78]'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <HiOutlineBanknotes className="text-base" />
                        <span className='flex gap-1'>
                            Parcelamento<span className="text-xs font-light">Disponível</span>
                        </span>
                    </span>
                </button>
            )}
        </div>
    );
}

