'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import type { OrderSummary } from '../types';

interface TicketModalProps {
    order: OrderSummary;
    slideIndex: number;
    onClose: () => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    onScroll: () => void;
    isMobile: boolean;
}

export default function TicketModal({
    order,
    slideIndex,
    onClose,
    scrollRef,
    onScroll,
    isMobile,
}: TicketModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = setTimeout(() => {
            onClose();
        }, 250);
    }, [onClose]);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClose]);

    const handleOverlayClick = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) {
                handleClose();
            }
        },
        [handleClose],
    );

    const eventName = order.event?.name ?? 'Evento não informado';
    const eventDate = order.event?.date
        ? new Date(order.event.date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          })
        : 'Data a definir';
    const eventLocation = order.event?.location || order.event?.address || '';
    
    // Obter tipo de ingresso e informações de transporte do primeiro ticket
    const firstTicket = order.tickets[0];
    const ticketTypeName = firstTicket?.ticketType?.name || 'Ingresso';
    const isTransport = firstTicket?.ticketType?.isTransport || false;
    
    // Obter informações de transporte (prioridade: metadata > ticketType)
    const transportOption = order.metadata?.transportOption;
    const transportInfo = transportOption || 
        (isTransport && firstTicket?.ticketType?.transportOptions?.[0] ? {
            date: firstTicket.ticketType.transportOptions[0].date,
            attraction: firstTicket.ticketType.transportOptions[0].attraction,
            departureLocation: firstTicket.ticketType.transportOptions[0].departureLocations?.[0] || 'A confirmar'
        } : null);

    const formatCurrency = (value?: number) =>
        typeof value === 'number'
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
            : undefined;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm transition-opacity duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onMouseDown={handleOverlayClick}
        >
            <div
                className={`relative flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-[#ded7ca] bg-white p-6 text-[#1a1a1d] shadow-[0_40px_80px_-40px_rgba(18,18,24,0.45)] transition-all duration-300 md:p-10 ${
                    isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
                }`}
            >
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ded7ca] bg-white text-[#4c4c55] transition hover:border-[#a38f78] hover:text-[#1a1a1d]"
                    aria-label="Fechar modal de ingressos"
                >
                    ✕
                </button>

                {isMobile ? (
                    <>
                        <p className="text-xs text-center pt-1 font-semibold uppercase tracking-[0.25em] text-[#a38f78]">
                            Ingresso {slideIndex + 1} de {order.tickets.length}
                        </p>

                        <div
                            ref={scrollRef}
                            onScroll={onScroll}
                            className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6"
                        >
                            {order.tickets.map((ticket, index) => {
                                const ticketConfirmed = ticket.status === 'confirmed';
                                const ticketUsed = ticket.status === 'used';
                                const ticketPrice = formatCurrency(ticket.price);
                                const currentTicketType = ticket.ticketType?.name || ticketTypeName;

                                return (
                                    <div
                                        key={ticket._id ?? ticket.code ?? index}
                                        className="flex min-w-full snap-center flex-col items-center gap-6 text-center"
                                    >
                                        <div className="rounded-3xl border border-[#ded7ca] bg-white p-4 shadow-[0_20px_45px_-25px_rgba(20,20,32,0.25)]">
                                            {ticketConfirmed && ticket.qrCode ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={ticket.qrCode}
                                                    alt={`QR Code do ingresso ${ticket.code ?? ''}`}
                                                    className="h-64 w-64 object-contain"
                                                />
                                            ) : ticketUsed ? (
                                                <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-[#ded7ca] bg-[#f5f1e8]/70 px-6 text-center text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[#a22d2d]">
                                                    QR Code já utilizado
                                                </div>
                                            ) : (
                                                <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-[#ded7ca] bg-[#f5f1e8]/70 px-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#7d796c]">
                                                    Aguardando confirmação do pagamento
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Informações do ingresso */}
                                        <div className="w-full space-y-2 px-4">
                                            <p className="text-sm font-semibold text-[#1a1a1d]">
                                                Tipo: {currentTicketType}
                                            </p>
                                            {ticket.code && (
                                                <p className="text-xs text-[#6a6760]">
                                                    Código: {ticket.code}
                                                </p>
                                            )}
                                            {transportInfo && (
                                                <div className="mt-3 rounded-lg border border-[#ded7ca] bg-[#f5f1e8]/50 p-3 text-left space-y-1">
                                                    <p className="text-xs font-semibold text-[#1a1a1d]">Informações de Transporte:</p>
                                                    {transportInfo.attraction && (
                                                        <p className="text-xs text-[#6a6760]">
                                                            <span className="font-medium">Atração:</span> {transportInfo.attraction}
                                                        </p>
                                                    )}
                                                    {transportInfo.date && (
                                                        <p className="text-xs text-[#6a6760]">
                                                            <span className="font-medium">Data:</span> {transportInfo.date}
                                                        </p>
                                                    )}
                                                    {transportInfo.departureLocation && (
                                                        <p className="text-xs text-[#6a6760]">
                                                            <span className="font-medium">Local de saída:</span> {transportInfo.departureLocation}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="rounded-3xl border mt-5 border-amber-200 bg-amber-50 p-8 text-center text-amber-700">
                        <HiOutlineExclamationTriangle className="mx-auto mb-4 text-3xl" />
                        <h3 className="text-lg font-semibold uppercase">
                            Disponível apenas no mobile
                        </h3>
                        <p className="mt-3 text-sm font-medium tracking-normal text-[#8a6942]">
                            Para sua segurança, seus ingressos estão disponíveis somente na versão mobile.
                            <br />
                            Acesse pelo seu celular para visualizar o QR Code.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
