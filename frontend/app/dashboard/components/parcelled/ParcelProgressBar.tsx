'use client';

import React from 'react';
import { calculatePaymentProgress, countPaidParcels } from '../../utils/parcelHelpers';
import type { ParcelSummary } from '../../types/parcelled';

interface ParcelProgressBarProps {
    parcels: ParcelSummary[];
}

export default function ParcelProgressBar({ parcels }: ParcelProgressBarProps) {
    const progress = calculatePaymentProgress(parcels);
    const paidCount = countPaidParcels(parcels);
    const totalCount = parcels.length;
    
    return (
        <div className="space-y-2">
            {/* Texto de progresso */}
            <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#1a1a1d]">
                    <span className="text-emerald-600">{paidCount}</span>
                    <span className="text-[#6a6760]"> / {totalCount}</span>
                    <span className="text-[#6a6760] ml-1">
                        {paidCount === 1 ? 'parcela paga' : 'parcelas pagas'}
                    </span>
                </span>
                <span className="text-[#a38f78]">{Math.round(progress)}%</span>
            </div>
            
            {/* Barra de progresso */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#faf7f0] border border-[#ded7ca]">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
