'use client';

import React from 'react';
import { tabs } from '../config';
import type { TabKey } from '../types';

interface DashboardTabsProps {
    activeTab: TabKey;
    onTabChange: (tab: TabKey) => void;
}

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
    return (
        <nav className="flex w-full flex-wrap gap-4 rounded-3xl border border-[#ded7ca] bg-white/40 p-3">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={`group flex flex-1 min-w-[180px] items-center gap-3 rounded-2xl px-5 py-4 text-left transition ${
                            isActive
                                ? 'bg-[#1a1a1d] text-white shadow-[0_20px_45px_-18px_rgba(12,12,24,0.45)]'
                                : 'bg-transparent text-[#4c4c55] hover:bg-white hover:text-[#1a1a1d]'
                        }`}
                    >
                        <span
                            className={`flex p-3 items-center justify-center rounded-full ${
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'bg-[#f5f1e8] text-[#a38f78]'
                            } transition`}
                        >
                            <Icon className="text-xl" />
                        </span>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold uppercase tracking-normal">
                                {tab.label}
                            </span>
                            <span
                                className={`text-xs ${
                                    isActive ? 'text-white/70' : 'text-[#7d796c]'
                                }`}
                            >
                                {tab.description}
                            </span>
                        </div>
                    </button>
                );
            })}
        </nav>
    );
}
