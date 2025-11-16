'use client';

import { useEffect, useState, useMemo } from 'react';

interface OrderExpiredModalProps {
    onCreateNew: () => void; // Criar novo pedido
    onClose: () => void; // Fechar modal sem ação
}

/**
 * Modal que aparece quando pedido expirou após F5
 * Usuário precisa confirmar para criar um novo pedido
 */
export function OrderExpiredModal({ onCreateNew, onClose }: OrderExpiredModalProps) {
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Ícone de aviso */}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                    <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                {/* Título */}
                <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
                    Pedido Expirado
                </h2>

                {/* Mensagem */}
                <p className="mb-6 text-center text-gray-600">
                    Seu pedido anterior expirou e foi cancelado. O carrinho foi limpo.
                </p>

                <p className="mb-6 text-center text-sm text-gray-500">
                    Deseja criar um novo pedido com os itens do carrinho?
                </p>

                {/* Botões */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={onCreateNew}
                        className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-rose-700"
                    >
                        Criar Novo Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}

