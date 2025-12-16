'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HiOutlineTicket, HiOutlineShoppingCart, HiOutlineMinusSmall, HiOutlinePlusSmall, HiOutlineLockClosed, HiOutlineInformationCircle } from 'react-icons/hi2';
import { addCartItem } from '@/lib/cart';
import type { TicketProduct } from '@/types/ticket';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

type EventSelectionSummaryProps = {
    tickets?: TicketProduct[];
    loading?: boolean;
    eventId?: string;
};

export default function EventSelectionSummary({ tickets = [], loading = false, eventId }: EventSelectionSummaryProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isReady, user } = useAuth();
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [isCreatingVipOrder, setIsCreatingVipOrder] = useState<Record<string, boolean>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [appliedPromoterCode, setAppliedPromoterCode] = useState<string | null>(null);
    const [hasVipTickets, setHasVipTickets] = useState<Record<string, boolean>>({});
    const [isCheckingVipTickets, setIsCheckingVipTickets] = useState(true); // Estado para controlar verificação de VIP
    const [expandedTooltips, setExpandedTooltips] = useState<Record<string, boolean>>({}); // Estado para controlar tooltips expandidos no mobile

    // Ler código de desconto do sessionStorage ou da URL
    useEffect(() => {
        if (typeof window === 'undefined' || !eventId) return;
        
        // Primeiro, tentar ler da URL (mais recente)
        const urlCode = searchParams.get('cd');
        if (urlCode) {
            setAppliedPromoterCode(urlCode.toUpperCase().trim());
            return;
        }
        
        // Se não houver na URL, tentar ler do sessionStorage
        const storageKey = `promoter_code_${eventId}`;
        const savedCode = window.sessionStorage.getItem(storageKey);
        if (savedCode) {
            setAppliedPromoterCode(savedCode);
        }
    }, [searchParams, eventId]);

    // Verificar se usuário já tem VIP para os tickets deste evento
    useEffect(() => {
        const checkVipTickets = async () => {
            // CRÍTICO: Marcar como verificando ANTES de qualquer coisa
            setIsCheckingVipTickets(true);
            
            if (!isReady || !isAuthenticated || !user || !eventId || tickets.length === 0) {
                // Se não está autenticado, limpar estado e marcar como verificado
                if (!isReady || !isAuthenticated) {
                    setHasVipTickets({});
                }
                setIsCheckingVipTickets(false);
                return;
            }

            try {
                const response = await api.get('/orders', {
                    params: {
                        limit: 100, // Buscar todos os pedidos recentes
                    },
                });

                const orders = response.data?.data?.orders || [];
                const vipTicketsMap: Record<string, boolean> = {};

                // Verificar cada ticket VIP
                tickets.forEach((ticket) => {
                    if (!ticket.isVip || !ticket.ticketTypeId) return;

                    // Contar quantos tickets VIP deste tipo o usuário já tem
                    let vipCount = 0;
                    
                    orders.forEach((order: any) => {
                        // Verificar se é pedido VIP pago
                        if (order.status !== 'paid' || order.paymentMethod !== 'vip_free') {
                            return;
                        }
                        
                        // Verificar se é do mesmo evento
                        const orderEventId = String(order.event?._id || order.event || '');
                        const ticketEventId = String(ticket.eventId || '');
                        if (orderEventId !== ticketEventId) {
                            return;
                        }
                        
                        // Contar tickets VIP confirmados/usados deste tipo
                        const orderTickets = order.tickets || [];
                        orderTickets.forEach((t: any) => {
                            const tTicketTypeId = String(t.ticketType?._id || t.ticketType || t.ticketTypeId || '');
                            const ticketTypeIdStr = String(ticket.ticketTypeId || '');
                            
                            if (tTicketTypeId === ticketTypeIdStr && 
                                (t.status === 'confirmed' || t.status === 'used')) {
                                vipCount++;
                            }
                        });
                    });

                    // CRÍTICO: Verificar se já atingiu o limite maxPerCPF
                    // Se maxPerCPF está configurado e já tem >= maxPerCPF, bloquear
                    // Se não tem maxPerCPF mas já tem pelo menos 1, também bloquear
                    const maxPerCPF = ticket.maxPerCPF || 1; // Se não tem limite, assume 1
                    const hasReachedLimit = vipCount >= maxPerCPF;

                    if (hasReachedLimit) {
                        vipTicketsMap[ticket.id] = true;
                    }
                });

                // CRÍTICO: Atualizar estado apenas se houver mudanças
                setHasVipTickets((prev) => {
                    // Verificar se há diferenças
                    const hasChanges = Object.keys(vipTicketsMap).some(
                        (key) => vipTicketsMap[key] !== prev[key]
                    ) || Object.keys(prev).some(
                        (key) => !vipTicketsMap[key] && prev[key]
                    );

                    return hasChanges ? vipTicketsMap : prev;
                });
            } catch (error) {
                // Erro silencioso - não bloquear interface
            } finally {
                // CRÍTICO: Sempre marcar como verificado, mesmo em caso de erro
                setIsCheckingVipTickets(false);
            }
        };

        checkVipTickets();
    }, [isReady, isAuthenticated, user, eventId, tickets]);

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }),
        [],
    );

    const resolveMaxAllowed = useCallback((ticket: TicketProduct) => {
        const limits = [ticket.maxPerOrder, ticket.stock]
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
        if (!limits.length) return undefined;
        return Math.min(...limits);
    }, []);

    const getQuantityForTicket = useCallback(
        (ticket: TicketProduct) => {
            if (ticket.isVip) return 1;
            const stored = quantities[ticket.id];
            const baseQuantity = typeof stored === 'number' && stored >= 0 ? stored : 0;
            const maxAllowed = resolveMaxAllowed(ticket);
            if (maxAllowed !== undefined) {
                return Math.min(baseQuantity, maxAllowed);
            }
            return baseQuantity;
        },
        [quantities, resolveMaxAllowed],
    );

    const updateQuantity = useCallback(
        (ticket: TicketProduct, delta: number) => {
            if (ticket.isVip) return;
            const maxAllowed = resolveMaxAllowed(ticket);
            const current = quantities[ticket.id] ?? 0;
            if (delta > 0 && maxAllowed !== undefined && current >= maxAllowed) {
                return;
            }
            setQuantities((prev) => {
                const prevValue = prev[ticket.id] ?? 0;
                const next = prevValue + delta;
                if (next < 0) {
                    return { ...prev, [ticket.id]: 0 };
                }
                if (maxAllowed !== undefined && next > maxAllowed) {
                    return { ...prev, [ticket.id]: maxAllowed };
                }
                return { ...prev, [ticket.id]: next };
            });
        },
        [resolveMaxAllowed, quantities],
    );

    const handleCreateVipOrder = useCallback(
        async (ticket: TicketProduct) => {
            // CRÍTICO: Verificar se já tem VIP antes de tentar criar
            if (hasVipTickets[ticket.id]) {
                return;
            }

            if (!isReady || !isAuthenticated || !user) {
                return;
            }

            if (isCreatingVipOrder[ticket.id]) {
                return;
            }

            setIsCreatingVipOrder((prev) => ({ ...prev, [ticket.id]: true }));

            try {
                if (!ticket.eventId || !ticket.ticketTypeId) {
                    throw new Error('Dados do ingresso incompletos');
                }

                const orderPayload = {
                    eventId: ticket.eventId,
                    ticketTypeId: ticket.ticketTypeId,
                    quantity: 1,
                    customerData: {
                        name: user.name || '',
                        email: user.email,
                        cpf: user.cpf || undefined,
                        phone: user.phone || undefined,
                    },
                };

                const response = await api.post('/orders', orderPayload);
                
                // CRÍTICO: Verificar se a resposta é de sucesso
                if (!response.data?.success) {
                    throw new Error(response.data?.message || 'Erro ao criar pedido');
                }

                const orderData = response.data?.data?.order;
                const isVIP = response.data?.data?.isVIP;

                // CRÍTICO: Só redirecionar se for VIP e tiver dados do pedido
                if (orderData && isVIP === true) {
                    // NÃO atualizar o estado aqui - deixar o useEffect detectar quando voltar à página
                    // Redirecionar apenas para VIPs criados com sucesso
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 1000);
                } else {
                    throw new Error('Resposta inválida do servidor');
                }
            } catch (error: any) {
                // CRÍTICO: Se o backend rejeitou (ex: limite excedido), marcar como tendo VIP
                // Isso garante que o botão desapareça mesmo se houver erro
                const status = error?.response?.status;
                const errorMessage = error?.response?.data?.message || '';
                const errorErrors = error?.response?.data?.errors || [];
                
                // Verificar se é erro de limite excedido ou VIP já solicitado
                const isLimitError = status === 400 && (
                    errorMessage.includes('Limite') || 
                    errorMessage.includes('VIP') ||
                    errorMessage.includes('cortesia') ||
                    errorErrors.some((e: string) => e.includes('Limite') || e.includes('VIP') || e.includes('cortesia'))
                );

                if (isLimitError) {
                    // Marcar como tendo VIP para esconder o botão
                    setHasVipTickets((prev) => ({
                        ...prev,
                        [ticket.id]: true,
                    }));
                }
            } finally {
                setIsCreatingVipOrder((prev) => {
                    const newState = { ...prev };
                    delete newState[ticket.id];
                    return newState;
                });
            }
        },
        [isReady, isAuthenticated, user, router, isCreatingVipOrder, hasVipTickets],
    );

    // Calcular subtotal baseado nas quantidades selecionadas
    const { totalTickets, totalAmount } = useMemo(() => {
        let totalTicketsCalc = 0;
        let totalAmountCalc = 0;

        tickets.forEach((ticket) => {
            const quantity = getQuantityForTicket(ticket);
            if (quantity > 0 && !ticket.isVip) {
                totalTicketsCalc += quantity;
                totalAmountCalc += quantity * ticket.price;
            }
        });

        return { totalTickets: totalTicketsCalc, totalAmount: totalAmountCalc };
    }, [tickets, getQuantityForTicket]);

    const formattedTotal = useMemo(
        () => currencyFormatter.format(totalAmount),
        [totalAmount, currencyFormatter],
    );

    const handleProceed = useCallback(async () => {
        if (isProcessing) return;

        setIsProcessing(true);

        try {
            // Adicionar todos os ingressos não-VIP com quantidade > 0 ao carrinho
            for (const ticket of tickets) {
                const quantity = getQuantityForTicket(ticket);

                if (quantity > 0 && !ticket.isVip) {
                    const itemId = ticket.ticketTypeId ?? ticket.id;
                    const maxAllowed = resolveMaxAllowed(ticket);

                    addCartItem({
                        id: itemId,
                        ticketTypeId: itemId,
                        eventId: ticket.eventId,
                        name: ticket.name,
                        price: ticket.price,
                        quantity,
                        date: ticket.eventDate,
                        location: ticket.location,
                        image: ticket.image,
                        maxQuantity: maxAllowed,
                        ticketFee: ticket.ticketFee,
                        platformFeePercentage: ticket.platformFeePercentage,
                        allowInstallments: ticket.allowInstallments ?? false,
                        minInstallments: ticket.minInstallments ?? null,
                        maxInstallments: ticket.maxInstallments ?? null,
                        metadata: {
                            eventName: ticket.eventName,
                            category: ticket.category,
                            allowInstallments: ticket.allowInstallments ?? false,
                            minInstallments: ticket.minInstallments ?? null,
                            maxInstallments: ticket.maxInstallments ?? null,
                        },
                    });
                }
            }

            // Redirecionar para checkout
            router.push('/checkout');
        } finally {
            setIsProcessing(false);
        }
    }, [tickets, getQuantityForTicket, resolveMaxAllowed, router, isProcessing]);

    const hasSelectedTickets = totalTickets > 0;

    return (
        <aside className="rounded-3xl border border-[#ded7ca] bg-white/95 p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
            <header className="flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f5f1e8] text-[#1a1a1d]">
                        <HiOutlineTicket className="text-xl" />
                    </span>
                    <div>
                        <h2 className="text-[1rem] font-semibold uppercase tracking-normal text-[#1a1a1d]">
                            Ingressos Disponíveis
                        </h2>
                        <p className="text-[0.9rem] text-[#7d796c]">
                            Selecione o setor e a quantidade
                        </p>
                    </div>
                </div>

            </header>

            <div className="mt-6 space-y-3">
                {/* Ingressos disponíveis para seleção */}
                {loading ? (
                    <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-4 text-center text-[0.90rem] text-[#7d796c]">
                        Carregando ingressos...
                    </div>
                ) : tickets.length > 0 ? (
                    tickets.map((ticket) => {
                        const quantity = getQuantityForTicket(ticket);
                        const maxAllowed = resolveMaxAllowed(ticket);
                        const isSoldOut = ticket.stock !== undefined && ticket.stock <= 0;
                        const maxReached = maxAllowed !== undefined && quantity >= maxAllowed;
                        const availableStock = ticket.stock ?? undefined;

                        const isTooltipExpanded = expandedTooltips[ticket.id] || false;
                        
                        return (
                            <div
                                key={ticket.id}
                                className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-3"
                            >
                                <div className="flex flex-col md:flex-row justify-between gap-3">
                                    <div className='flex gap-3'>
                                        {/* Tooltip com informações do ingresso */}
                                        <div className="relative inline-flex items-center group mt-0.5 mb-0.5">
                                            <HiOutlineInformationCircle 
                                                className="text-[1rem] text-[#a38f78] cursor-pointer md:cursor-help hover:text-[#1a1a1d] transition-colors"
                                                onClick={(e: any) => {
                                                    e.stopPropagation();
                                                    setExpandedTooltips((prev) => ({
                                                        ...prev,
                                                        [ticket.id]: !prev[ticket.id],
                                                    }));
                                                }}
                                            />
                                            <div className="absolute top-full left-0 mt-1 hidden md:group-hover:block z-50 pointer-events-none">
                                                <div className="bg-[#1a1a1d] text-white text-[0.7rem] rounded-lg px-3 py-2 shadow-xl min-w-[300px] max-w-[400px] whitespace-normal">
                                                    <div className="space-y-1.5">
                                                        {ticket.description && (
                                                            <p className="font-medium leading-snug">{ticket.description}</p>
                                                        )}
                                                        {availableStock !== undefined && (
                                                            <p className="text-[#e5e5e5] text-[0.65rem]">
                                                                Disponível: {availableStock} {availableStock === 1 ? 'ingresso' : 'ingressos'}
                                                            </p>
                                                        )}
                                                        {maxAllowed !== undefined && (
                                                            <p className="text-[#e5e5e5] text-[0.65rem]">
                                                                Máximo por pedido: {maxAllowed}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {/* Seta do tooltip */}
                                                    <div className="absolute bottom-full left-3 -mb-1">
                                                        <div className="border-4 border-transparent border-b-[#1a1a1d]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-[1rem] font-semibold text-[#1a1a1d] truncate">
                                                {ticket.name}
                                            </p>

                                            <p className="text-[0.85rem]  text-[#1a1a1d]">
                                                Valor Unitario: {currencyFormatter.format(ticket.price)}
                                            </p>

                                        </div>
                                    </div>

                                    {/* Seletor de quantidade - apenas se NÃO for VIP ou se NÃO tiver VIP já */}
                                    {!ticket.isVip || !hasVipTickets[ticket.id] ? (
                                        <div className='flex gap-2 items-center'>
                                            <div className="flex items-center rounded-[100rem] bg-white px-[0.8rem] py-[0.5rem]">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(ticket, -1)}
                                                    disabled={quantity <= 0}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <HiOutlineMinusSmall className="text-sm" />
                                                </button>
                                                <span className="min-w-[24px] text-center text-[0.75rem] font-semibold text-[#1a1a1d]">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(ticket, 1)}
                                                    disabled={isSoldOut || maxReached}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ded7ca] text-[#4c4c55] transition hover:border-[#a38f78] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <HiOutlinePlusSmall className="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                
                                {/* Tooltip mobile - só aparece quando clicado no ícone, expandido em 100% */}
                                {isTooltipExpanded && (
                                    <div 
                                        className="mt-3 md:hidden cursor-pointer -mx-4"
                                        onClick={() => {
                                            setExpandedTooltips((prev) => ({
                                                ...prev,
                                                [ticket.id]: false,
                                            }));
                                        }}
                                    >
                                        <div className="bg-[#1a1a1d] text-white text-[0.7rem] py-2.5 transition-all rounded-none px-4">
                                            <div className="space-y-1.5">
                                                {ticket.description && (
                                                    <p className="font-medium leading-snug">{ticket.description}</p>
                                                )}
                                                {availableStock !== undefined && (
                                                    <p className="text-[#e5e5e5] text-[0.65rem]">
                                                        Disponível: {availableStock} {availableStock === 1 ? 'ingresso' : 'ingressos'}
                                                    </p>
                                                )}
                                                {maxAllowed !== undefined && (
                                                    <p className="text-[#e5e5e5] text-[0.65rem]">
                                                        Máximo por pedido: {maxAllowed}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Alerta VIP com limite por CPF */}
                                {ticket.isVip && ticket.maxPerCPF && !hasVipTickets[ticket.id] && (
                                    <div className="mt-3 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 px-3 py-2.5">
                                        <p className="text-[0.75rem] font-medium text-[#f97316]">
                                            ⚠️ Limite de <strong>{ticket.maxPerCPF} ingresso{ticket.maxPerCPF > 1 ? 's' : ''} por CPF</strong>
                                        </p>
                                    </div>
                                )}
                                
                                {/* Alerta se já tem VIP */}
                                {ticket.isVip && hasVipTickets[ticket.id] && (
                                    <p className="text-[0.75rem] pl-7 pt-1 font-medium text-[#f97316]">
                                       ✅ Ingresso Vip Já Solicitado!
                                </p>
                                )}
                                
                                {/* Botão VIP - criar pedido direto - APENAS se NÃO tem VIP E verificação concluída */}
                                {ticket.isVip && quantity > 0 && !hasVipTickets[ticket.id] && !isCheckingVipTickets && isReady && isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => handleCreateVipOrder(ticket)}
                                        disabled={isCreatingVipOrder[ticket.id]}
                                        className="mt-3 w-full rounded-full bg-[#1f5d3d] px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-normal text-white transition hover:bg-[#2b6b47] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingVipOrder[ticket.id] ? (
                                            'Gerando sua Cortesia...'
                                        ) : (
                                            'Pegar minha Cortesia'
                                        )}
                                    </button>
                                )}
                                
                                {/* Mensagem se não está autenticado e é VIP */}
                                {ticket.isVip && quantity > 0 && !hasVipTickets[ticket.id] && (!isReady || !isAuthenticated) && (
                                    <div className="mt-3 w-full rounded-full bg-gray-400 px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-normal text-white text-center">
                                        <HiOutlineLockClosed className="mr-1 inline text-sm" />
                                        Login necessário
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-[#ede5d8] bg-[#faf7f0] px-4 py-6 text-center">
                        <p className="text-[0.90rem] font-light text-[#4c4c55]">
                            Vendas não Iniciadas!
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-6 border-t border-[#e2ddd1] pt-4 text-xs text-[#4c4c55]">
                {/* Mensagem de cupom aplicado */}
                {appliedPromoterCode && (
                    <div className="mb-3 rounded-lg bg-green-50 border border-green-300 px-3 py-2.5">
                        <p className="text-sm font-semibold text-green-700">
                            CUPOM aplicado: <span className="uppercase font-bold text-green-800">{appliedPromoterCode}</span>
                        </p>
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-base uppercase tracking-normal text-[#7d796c]">
                        Subtotal
                    </span>
                    <span className="text-base font-semibold text-[#1a1a1d]">{formattedTotal}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleProceed}
                disabled={!hasSelectedTickets || isProcessing}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-normal transition ${hasSelectedTickets && !isProcessing
                    ? 'bg-[#1a1a1d] text-white hover:bg-[#f97316] hover:text-white'
                    : 'cursor-not-allowed bg-[#f3f3f5] text-[#b5b1aa]'
                    }`}
            >
                <HiOutlineShoppingCart className="text-sm" />
                {isProcessing ? 'Processando...' : 'Prosseguir'}
            </button>
        </aside>
    );
}


