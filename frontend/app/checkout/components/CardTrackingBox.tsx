'use client';

import { useEffect, useState } from 'react';

type TrackingEvent = {
    timestamp: string;
    type: 'card_filled' | 'installments_fetched' | 'installments_received' | 'card_brand_detected' | 'form_mounted' | 'error' | 'info';
    message: string;
    data?: any;
};

type CardTrackingBoxProps = {
    installments?: any[];
    cardBrand?: string;
    totalAmount?: number;
};

export function CardTrackingBox({ installments, cardBrand, totalAmount }: CardTrackingBoxProps) {
    const [events, setEvents] = useState<TrackingEvent[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);

    // Adicionar evento quando parcelas mudam
    useEffect(() => {
        if (installments && installments.length > 0) {
            addEvent('installments_received', `Parcelas recebidas: ${installments.length} opções`, { installments });
        }
    }, [installments]);

    // Adicionar evento quando bandeira é detectada
    useEffect(() => {
        if (cardBrand) {
            addEvent('card_brand_detected', `Bandeira detectada: ${cardBrand}`, { cardBrand });
        }
    }, [cardBrand]);

    const addEvent = (type: TrackingEvent['type'], message: string, data?: any) => {
        const newEvent: TrackingEvent = {
            timestamp: new Date().toLocaleTimeString('pt-BR'),
            type,
            message,
            data,
        };
        setEvents((prev) => [...prev.slice(-19), newEvent]); // Manter últimos 20 eventos
    };

    // Expor função globalmente para outros componentes
    useEffect(() => {
        (window as any).__cardTracking = {
            addEvent,
            events,
        };
    }, [events]);

    return (
        <div className="mb-6 rounded-3xl border-2 border-yellow-400 bg-yellow-50 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-yellow-900">
                    🔍 Rastreamento Cartão & Parcelas
                </h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-yellow-700 hover:text-yellow-900"
                >
                    {isExpanded ? '▼ Ocultar' : '▶ Mostrar'}
                </button>
            </div>

            {isExpanded && (
                <div className="space-y-4">
                    {/* Status atual */}
                    <div className="rounded-lg bg-white p-3 border border-yellow-200">
                        <div className="text-xs font-semibold text-yellow-900 mb-2">Status Atual:</div>
                        <div className="space-y-1 text-xs">
                            <div>
                                <span className="font-medium">Bandeira:</span>{' '}
                                <span className={cardBrand ? 'text-green-600' : 'text-gray-400'}>
                                    {cardBrand || 'Não detectada'}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium">Total:</span>{' '}
                                <span className={totalAmount ? 'text-green-600' : 'text-gray-400'}>
                                    {totalAmount ? `R$ ${totalAmount.toFixed(2)}` : 'Não definido'}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium">Parcelas:</span>{' '}
                                <span className={installments && installments.length > 0 ? 'text-green-600' : 'text-gray-400'}>
                                    {installments && installments.length > 0 ? `${installments.length} opções` : 'Não carregadas'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Parcelas disponíveis */}
                    {installments && installments.length > 0 && (
                        <div className="rounded-lg bg-white p-3 border border-yellow-200">
                            <div className="text-xs font-semibold text-yellow-900 mb-2">
                                Parcelas Disponíveis ({installments.length}):
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {installments.map((inst: any, index: number) => {
                                    const installmentCount = inst.installments || inst.installment_count || index + 1;
                                    const installmentAmount = inst.installment_amount || inst.installmentAmount;
                                    const totalAmount = inst.total_amount || inst.totalAmount;
                                    const recommended = inst.recommended_message || inst.text || '';
                                    
                                    // Se tem texto completo do Mercado Pago, usar ele
                                    const displayText = recommended || (installmentAmount ? `${installmentCount}x de R$ ${installmentAmount.toFixed(2).replace('.', ',')}` : `${installmentCount}x`);
                                    
                                    return (
                                        <div key={index} className="text-xs p-2 bg-gray-50 rounded border border-gray-200">
                                            <div className="font-medium text-gray-900">
                                                {displayText}
                                            </div>
                                            {totalAmount && totalAmount !== installmentAmount * installmentCount && (
                                                <div className="text-gray-600 text-[10px]">
                                                    Total: R$ {totalAmount.toFixed(2).replace('.', ',')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Log de eventos */}
                    <div className="rounded-lg bg-white p-3 border border-yellow-200">
                        <div className="text-xs font-semibold text-yellow-900 mb-2">Log de Eventos ({events.length}):</div>
                        <div className="max-h-40 overflow-y-auto space-y-1 text-[10px] font-mono">
                            {events.length === 0 ? (
                                <div className="text-gray-400 italic">Nenhum evento registrado ainda...</div>
                            ) : (
                                events.map((event, index) => (
                                    <div
                                        key={index}
                                        className={`p-2 rounded border ${
                                            event.type === 'error'
                                                ? 'bg-red-50 border-red-200'
                                                : event.type === 'installments_received'
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-gray-500 flex-shrink-0">{event.timestamp}</span>
                                            <span
                                                className={`font-medium flex-shrink-0 ${
                                                    event.type === 'error'
                                                        ? 'text-red-600'
                                                        : event.type === 'installments_received'
                                                        ? 'text-green-600'
                                                        : 'text-blue-600'
                                                }`}
                                            >
                                                [{event.type}]
                                            </span>
                                            <span className="text-gray-700 flex-1">{event.message}</span>
                                        </div>
                                        {event.data && (
                                            <details className="mt-1 ml-16">
                                                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                                    Ver dados
                                                </summary>
                                                <pre className="mt-1 text-[9px] bg-gray-100 p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(event.data, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

