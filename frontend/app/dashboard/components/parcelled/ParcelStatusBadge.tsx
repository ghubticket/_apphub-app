'use client';

import React from 'react';
import { parcelStatusConfig } from '../../config/parcelled';
import type { ParcelStatus } from '../../types/parcelled';

interface ParcelStatusBadgeProps {
    status: ParcelStatus;
    size?: 'sm' | 'md';
}

export default function ParcelStatusBadge({ status, size = 'sm' }: ParcelStatusBadgeProps) {
    const config = parcelStatusConfig[status];
    
    const sizeClasses = size === 'sm' 
        ? 'text-[0.65rem] px-2 py-0.5' 
        : 'text-xs px-3 py-1';
    
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-normal ${config.badgeClass} ${sizeClasses}`}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
}
