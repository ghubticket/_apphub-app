'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineTruck, HiOutlineMusicalNote, HiOutlineCurrencyDollar, HiOutlineVideoCamera, HiOutlineQuestionMarkCircle, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChevronDown } from 'react-icons/hi2';

// Estilos para scrollbar customizada
const scrollbarStyles = `
    .event-tabs-scroll {
        scroll-behavior: smooth;
    }
    .event-tabs-scroll::-webkit-scrollbar {
        height: 4px;
    }
    .event-tabs-scroll::-webkit-scrollbar-track {
        background: transparent;
    }
    .event-tabs-scroll::-webkit-scrollbar-thumb {
        background-color: #ded7ca;
        border-radius: 2px;
        transition: background-color 0.2s ease;
    }
    .event-tabs-scroll::-webkit-scrollbar-thumb:hover {
        background-color: #7d796c;
    }
    @media (max-width: 640px) {
        .event-tabs-scroll::-webkit-scrollbar {
            height: 3px;
        }
    }
`;

interface TransportInfo {
    departureLocations?: Array<{
        name: string;
        address: string;
        meetingTime: string;
        departureTime: string;
        price?: number;
    }>;
    returnTime?: string;
    transportType?: string;
    includes?: string[];
}

interface Attraction {
    name: string;
    date?: string;
    stage?: string;
    order?: number;
}

interface PriceByLocation {
    locationName: string;
    pixPrice?: number;
    creditCardPrice?: number;
    installments?: number;
    description?: string;
}

interface FAQ {
    question: string;
    answer: string;
    order?: number;
}

interface EventDetails {
    about?: {
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    packageIncludes?: {
        title?: string;
        items?: string[];
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    transport?: TransportInfo & {
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    attractions?: {
        title?: string;
        items?: Attraction[];
        groupedByDate?: boolean;
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    pricing?: {
        title?: string;
        pricesByLocation?: PriceByLocation[];
        generalInfo?: string;
        pixDiscount?: number;
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    video?: {
        url: string;
        thumbnail?: string;
        title?: string;
        description?: string;
    };
    faq?: {
        title?: string;
        items?: FAQ[];
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
}

interface EventDetailsTabsProps {
    eventDetails: EventDetails | null;
    loading?: boolean;
}

type TabId = 'about' | 'includes' | 'transport' | 'attractions' | 'pricing' | 'video' | 'faq';

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'about', label: 'Sobre o Evento', icon: HiOutlineDocumentText },
    { id: 'includes', label: 'Incluso no Pacote', icon: HiOutlineCheckCircle },
    { id: 'transport', label: 'Transporte', icon: HiOutlineTruck },
    { id: 'attractions', label: 'Atrações', icon: HiOutlineMusicalNote },
    { id: 'pricing', label: 'Tabela de Preços', icon: HiOutlineCurrencyDollar },
    { id: 'video', label: 'Vídeo do Evento', icon: HiOutlineVideoCamera },
    { id: 'faq', label: 'Dúvidas Frequentes', icon: HiOutlineQuestionMarkCircle },
];

export default function EventDetailsTabs({ eventDetails, loading = false }: EventDetailsTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('about');
    const [scrollIndex, setScrollIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Detectar se é mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Filtrar abas que têm conteúdo
    const availableTabs = useMemo(() => {
        if (!eventDetails) return [];

        return tabs.filter(tab => {
            switch (tab.id) {
                case 'about':
                    // Verificar se tem richText preenchido
                    return !!(eventDetails.about?.richText && eventDetails.about.richText.trim() !== '' && eventDetails.about.richText.trim() !== '<p></p>');
                case 'includes':
                    // Verificar se tem richText ou items
                    return !!(eventDetails.packageIncludes?.richText && eventDetails.packageIncludes.richText.trim() !== '' && eventDetails.packageIncludes.richText.trim() !== '<p></p>') ||
                        (eventDetails.packageIncludes?.items && eventDetails.packageIncludes.items.length > 0);
                case 'transport':
                    // Verificar se tem richText ou departureLocations
                    return !!(eventDetails.transport?.richText && eventDetails.transport.richText.trim() !== '' && eventDetails.transport.richText.trim() !== '<p></p>') ||
                        (eventDetails.transport?.departureLocations && eventDetails.transport.departureLocations.length > 0);
                case 'attractions':
                    // Verificar se tem richText ou items
                    return !!(eventDetails.attractions?.richText && eventDetails.attractions.richText.trim() !== '' && eventDetails.attractions.richText.trim() !== '<p></p>') ||
                        (eventDetails.attractions?.items && eventDetails.attractions.items.length > 0);
                case 'pricing':
                    // Verificar se tem richText ou pricesByLocation
                    return !!(eventDetails.pricing?.richText && eventDetails.pricing.richText.trim() !== '' && eventDetails.pricing.richText.trim() !== '<p></p>') ||
                        (eventDetails.pricing?.pricesByLocation && eventDetails.pricing.pricesByLocation.length > 0);
                case 'video':
                    return !!(eventDetails.video && eventDetails.video.url);
                case 'faq':
                    // Verificar se tem richText ou items
                    return !!(eventDetails.faq?.richText && eventDetails.faq.richText.trim() !== '' && eventDetails.faq.richText.trim() !== '<p></p>') ||
                        (eventDetails.faq?.items && eventDetails.faq.items.length > 0);
                default:
                    return false;
            }
        });
    }, [eventDetails]);

    // Definir primeira aba disponível como ativa
    useMemo(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id);
        }
    }, [availableTabs, activeTab]);

    // Funções para navegar no carrossel (apenas mobile)
    const tabsPerView = 2; // Mostrar 2 abas por vez no mobile
    const canScrollLeft = !isMobile ? false : scrollIndex > 0;
    const canScrollRight = !isMobile ? false : scrollIndex < availableTabs.length - tabsPerView;
    const isAtEnd = !isMobile ? false : scrollIndex >= availableTabs.length - tabsPerView; // Está nas últimas abas
    
    // Largura dinâmica das abas
    const tabWidth = isMobile 
        ? `${100 / tabsPerView}%` // Mobile: largura fixa baseada em tabsPerView
        : availableTabs.length > 0 
            ? `${100 / availableTabs.length}%` // Desktop: largura dinâmica baseada na quantidade de abas
            : 'auto';

    const scrollLeft = () => {
        setScrollIndex(prevIndex => {
            const maxIndex = Math.max(0, availableTabs.length - tabsPerView);

            // Se está no final (últimas abas), volta para o início
            if (prevIndex >= maxIndex) {
                if (availableTabs[0]) {
                    setActiveTab(availableTabs[0].id);
                }
                return 0;
            }
            // Caso contrário, volta uma posição
            else if (prevIndex > 0) {
                const newIndex = prevIndex - 1;
                // Ativa a aba que ficou na primeira posição
                if (availableTabs[newIndex]) {
                    setActiveTab(availableTabs[newIndex].id);
                }
                return newIndex;
            }
            // Já está no início, mantém
            return prevIndex;
        });
    };

    const scrollRight = () => {
        if (canScrollRight) {
            setScrollIndex(Math.min(availableTabs.length - tabsPerView, scrollIndex + 1));
        }
    };

    // Ajustar scroll quando a aba ativa mudar - navegação bidirecional (apenas mobile)
    useEffect(() => {
        if (!isMobile) return; // Desktop: não altera posição ao clicar
        
        const activeIndex = availableTabs.findIndex(tab => tab.id === activeTab);
        if (activeIndex !== -1) {
            const maxIndex = Math.max(0, availableTabs.length - tabsPerView);

            // Usa a forma funcional do setState para acessar o valor atual
            setScrollIndex(prevIndex => {
                const currentFirstVisible = prevIndex;
                const currentLastVisible = prevIndex + tabsPerView - 1;

                // Se a aba clicada está à esquerda da primeira visível, coloca na primeira posição
                if (activeIndex < currentFirstVisible) {
                    return activeIndex;
                }
                // Se a aba clicada está à direita da última visível, coloca na última posição
                else if (activeIndex > currentLastVisible) {
                    return Math.min(activeIndex - tabsPerView + 1, maxIndex);
                }
                // Se a aba clicada já está visível, sempre vai para a primeira posição
                else {
                    return activeIndex;
                }
            });
        }
    }, [activeTab, availableTabs, tabsPerView, isMobile]);

    if (loading) {
        return (
            <div className="rounded-3xl border border-[#ded7ca] bg-white/95 p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)]">
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7d796c] border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!eventDetails || availableTabs.length === 0) {
        return null; // Não renderizar se não houver detalhes
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    const formatTime = (time: string) => {
        return time.length === 5 ? time : time;
    };

    const getVideoEmbedUrl = (url: string): string | null => {
        if (!url) return null;
        
        // Se já é um código iframe embed, extrair o src
        const iframeMatch = url.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (iframeMatch) {
            return iframeMatch[1];
        }
        
        // Se já é uma URL de embed direta
        if (url.includes('/embed/') || url.includes('player.vimeo.com')) {
            return url;
        }
        
        // YouTube
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const youtubeMatch = url.match(youtubeRegex);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        }

        // Vimeo
        const vimeoRegex = /vimeo\.com\/(\d+)/;
        const vimeoMatch = url.match(vimeoRegex);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }

        // Se não conseguir converter, retorna null para mostrar o link
        return null;
    };
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'about':
                if (!eventDetails.about) return null;
                return (
                    <div className="space-y-4">
                        <div
                            className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
                                prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                            dangerouslySetInnerHTML={{
                                __html: eventDetails.about.richText || ''
                            }}
                        />
                    </div>
                );

            case 'includes':
                if (!eventDetails.packageIncludes) return null;
                return (
                    <div className="space-y-4">
                        {eventDetails.packageIncludes.title && (
                            <h3 className="text-xl font-semibold text-[#1a1a1d] mb-4">
                                {eventDetails.packageIncludes.title}
                            </h3>
                        )}
                        {eventDetails.packageIncludes.richText ? (
                            <div
                                className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
                                    prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                    prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                    prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                    prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                    prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                    prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: eventDetails.packageIncludes.richText
                                }}
                            />
                        ) : (
                            <ul className="space-y-3">
                                {eventDetails.packageIncludes.items?.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <span className="text-[#7d796c] mt-1">•</span>
                                        <span className="text-[#1a1a1d] flex-1">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );

            case 'transport':
                if (!eventDetails.transport) return null;
                return (
                    <div className="space-y-6">
                        {eventDetails.transport.richText ? (
                            <div
                                className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
                                    prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                    prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                    prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                    prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                    prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                    prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: eventDetails.transport.richText
                                }}
                            />
                        ) : (
                            <>
                                {eventDetails.transport.transportType && (
                                    <div className="mb-4">
                                        <p className="text-lg font-semibold text-[#1a1a1d]">
                                            {eventDetails.transport.transportType}
                                        </p>
                                    </div>
                                )}

                                {eventDetails.transport.departureLocations && eventDetails.transport.departureLocations.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-[#1a1a1d]">Locais e Horários de Embarque</h3>
                                        {eventDetails.transport.departureLocations.map((location, index) => (
                                            <div key={index} className="border border-[#ded7ca] rounded-lg p-4 bg-[#f5f1e8]/50">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                                    <h4 className="font-semibold text-[#1a1a1d]">{location.name}</h4>
                                                    {location.price && (
                                                        <span className="text-lg font-bold text-[#7d796c]">
                                                            {formatPrice(location.price)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-[#7d796c] mb-2">{location.address}</p>
                                                <div className="flex flex-wrap gap-4 text-sm text-[#1a1a1d]">
                                                    <span>
                                                        <strong>Concentração:</strong> {formatTime(location.meetingTime)}
                                                    </span>
                                                    <span>
                                                        <strong>Saída:</strong> {formatTime(location.departureTime)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {eventDetails.transport.returnTime && (
                                    <div className="mt-4 p-4 bg-[#f5f1e8] rounded-lg">
                                        <p className="text-sm text-[#1a1a1d]">
                                            <strong>Retorno:</strong> {eventDetails.transport.returnTime}
                                        </p>
                                    </div>
                                )}

                                {eventDetails.transport.includes && eventDetails.transport.includes.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-[#1a1a1d] mb-2">Inclui:</h4>
                                        <ul className="space-y-2">
                                            {eventDetails.transport.includes.map((item, index) => (
                                                <li key={index} className="flex items-center gap-2 text-[#1a1a1d]">
                                                    <span className="text-green-600">✓</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );

            case 'attractions':
                if (!eventDetails.attractions) return null;
                return (
                    <div className="space-y-6">
                        {eventDetails.attractions.title && (
                            <h3 className="text-xl font-semibold text-[#1a1a1d] mb-4">
                                {eventDetails.attractions.title}
                            </h3>
                        )}
                        {eventDetails.attractions.richText ? (
                            <div
                                className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
                                    prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                    prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                    prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                    prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                    prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                    prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: eventDetails.attractions.richText
                                }}
                            />
                        ) : (
                            (() => {
                                const attractions = eventDetails.attractions.items || [];
                                const groupedAttractions = eventDetails.attractions.groupedByDate
                                    ? attractions.reduce((acc, attraction) => {
                                        const date = attraction.date || 'Sem data';
                                        if (!acc[date]) acc[date] = [];
                                        acc[date].push(attraction);
                                        return acc;
                                    }, {} as Record<string, Attraction[]>)
                                    : { 'Todas': attractions };

                                return (
                                    <>
                                        {Object.entries(groupedAttractions).map(([date, items]) => (
                                            <div key={date} className="space-y-3">
                                                {date !== 'Todas' && (
                                                    <h4 className="text-lg font-semibold text-[#1a1a1d] border-b border-[#ded7ca] pb-2">
                                                        {date}
                                                    </h4>
                                                )}
                                                <div className="space-y-2">
                                                    {items.map((attraction, index) => (
                                                        <div key={index} className="flex items-start gap-3 p-3 bg-[#f5f1e8]/50 rounded-lg">
                                                            <HiOutlineMusicalNote className="text-[#7d796c] mt-1 flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-[#1a1a1d]">{attraction.name}</p>
                                                                {attraction.stage && (
                                                                    <p className="text-sm text-[#7d796c]">{attraction.stage}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                );
                            })()
                        )}
                    </div>
                );

            case 'pricing':
                if (!eventDetails.pricing) return null;
                return (
                    <div className="space-y-6">
                        {eventDetails.pricing.title && (
                            <h3 className="text-xl font-semibold text-[#1a1a1d] mb-4">
                                {eventDetails.pricing.title}
                            </h3>
                        )}
                        {eventDetails.pricing.richText ? (
                            <div
                                className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
                                    prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                    prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                    prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                    prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                    prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                    prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: eventDetails.pricing.richText
                                }}
                            />
                        ) : (
                            <>
                                {eventDetails.pricing.pricesByLocation?.map((price, index) => (
                                    <div key={index} className="border border-[#ded7ca] rounded-lg p-4 bg-[#f5f1e8]/50">
                                        <h4 className="font-semibold text-[#1a1a1d] mb-3">{price.locationName}</h4>
                                        <div className="space-y-2">
                                            {price.pixPrice && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#1a1a1d]">PIX:</span>
                                                    <span className="font-bold text-lg text-green-600">
                                                        {formatPrice(price.pixPrice)}
                                                    </span>
                                                </div>
                                            )}
                                            {price.creditCardPrice && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#1a1a1d]">
                                                        Cartão de Crédito{price.installments ? ` (até ${price.installments}x sem juros)` : ''}:
                                                    </span>
                                                    <span className="font-bold text-lg text-[#1a1a1d]">
                                                        {formatPrice(price.creditCardPrice)}
                                                    </span>
                                                </div>
                                            )}
                                            {price.description && (
                                                <p className="text-sm text-[#7d796c] mt-2">{price.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {eventDetails.pricing.generalInfo && (
                                    <div className="mt-4 p-4 bg-[#f5f1e8] rounded-lg">
                                        <p className="text-sm text-[#1a1a1d]">{eventDetails.pricing.generalInfo}</p>
                                    </div>
                                )}
                                {eventDetails.pricing.pixDiscount && (
                                    <div className="mt-2 text-sm text-green-600 font-semibold">
                                        💸 {eventDetails.pricing.pixDiscount}% de desconto no PIX já calculado
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );

            case 'video':
                if (!eventDetails.video) return null;
                const embedUrl = getVideoEmbedUrl(eventDetails.video.url);
                return (
                    <div className="space-y-4">
                        {eventDetails.video.title && (
                            <h3 className="text-xl font-semibold text-[#1a1a1d] mb-4">
                                {eventDetails.video.title}
                            </h3>
                        )}
                        {embedUrl ? (
                            <div className="relative w-full pb-[56.25%] h-0 overflow-hidden rounded-lg">
                                <iframe
                                    src={embedUrl}
                                    className="absolute top-0 left-0 w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={eventDetails.video.title || 'Vídeo do evento'}
                                />
                            </div>
                        ) : (
                            <div className="p-4 bg-[#f5f1e8] rounded-lg">
                                <p className="text-[#1a1a1d]">
                                    <a
                                        href={eventDetails.video.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Assistir vídeo
                                    </a>
                                </p>
                            </div>
                        )}
                        {eventDetails.video.description && (
                            <p className="text-sm text-[#7d796c] mt-4">{eventDetails.video.description}</p>
                        )}
                    </div>
                );

            case 'faq':
                if (!eventDetails.faq) return null;
                const faqItems = eventDetails.faq.items || [];
                const sortedFaqs = [...faqItems].sort((a, b) => (a.order || 0) - (b.order || 0));
                
                const toggleFaq = (index: number) => {
                    // Se clicar na mesma pergunta que está aberta, fecha. Caso contrário, abre e fecha as outras
                    setExpandedFaqIndex(prevIndex => prevIndex === index ? null : index);
                };
                
                return (
                    <div className="space-y-4">
                        {eventDetails.faq.title && (
                            <h3 className="text-xl font-semibold text-[#1a1a1d] mb-4">
                                {eventDetails.faq.title}
                            </h3>
                        )}
                        {eventDetails.faq.richText ? (
                            <div
                                className="text-sm text-[#4c4c55] prose prose-sm max-w-none 
                                    prose-headings:text-[#1a1a1d] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
                                    prose-p:text-[#4c4c55] prose-p:mb-3 prose-p:leading-relaxed
                                    prose-strong:text-[#1a1a1d] prose-strong:font-semibold
                                    prose-ul:text-[#4c4c55] prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-3 prose-ul:space-y-1
                                    prose-ol:text-[#4c4c55] prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-3 prose-ol:space-y-1
                                    prose-li:text-[#4c4c55] prose-li:leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: eventDetails.faq.richText
                                }}
                            />
                        ) : (
                            <div className="space-y-3">
                                {sortedFaqs.map((faq, index) => {
                                    const isExpanded = expandedFaqIndex === index;
                                    return (
                                        <div 
                                            key={index} 
                                            className="border border-[#ded7ca] rounded-lg overflow-hidden bg-[#f5f1e8]/50 transition-all"
                                        >
                                            <button
                                                onClick={() => toggleFaq(index)}
                                                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#f5f1e8]/70 transition-colors"
                                            >
                                                <div className="flex items-start gap-2 flex-1">
                                                    <HiOutlineQuestionMarkCircle className="text-[#7d796c] mt-1 flex-shrink-0 w-5 h-5" />
                                                    <h4 className="font-semibold text-[#1a1a1d] flex-1">
                                                        {faq.question}
                                                    </h4>
                                                </div>
                                                <HiOutlineChevronDown 
                                                    className={`text-[#7d796c] flex-shrink-0 w-5 h-5 transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                            <div 
                                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                                    isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                                }`}
                                            >
                                                <div className="px-4 pt-6 pb-4 pl-11">
                                                    <p className="text-[#1a1a1d] leading-relaxed whitespace-pre-line">
                                                        {faq.answer}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
            <div className="w-full max-w-full rounded-3xl border border-[#ded7ca] bg-white/95 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] overflow-hidden">
                {/* Tabs Navigation */}
                <div className={`border-b border-[#ded7ca] bg-[#f5f1e8]/30 w-full relative ${isMobile ? 'overflow-hidden' : 'overflow-x-auto'}`} style={{ height: '3.5rem' }}>
                    {isMobile ? (
                        // MOBILE: Carrossel com scroll
                        <>
                            <div
                                className="absolute inset-0 overflow-hidden"
                            >
                                <div
                                    ref={scrollContainerRef}
                                    className="tabs-container flex transition-transform duration-300 ease-in-out h-full"
                                    style={{
                                        transform: `translateX(-${scrollIndex * (100 / tabsPerView)}%)`,
                                        width: '100%',
                                        height: '100%'
                                    }}
                                >
                                    {availableTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`
                                                    flex items-center justify-center gap-1.5 px-2 py-0 text-xs font-medium transition-colors
                                                    whitespace-nowrap border-b-2 flex-shrink-0 h-full
                                                    ${isActive
                                                        ? 'border-[#7d796c] text-[#1a1a1d] bg-white'
                                                        : 'border-transparent text-[#7d796c] hover:text-[#1a1a1d] hover:bg-white/50'
                                                    }
                                                `}
                                                style={{ 
                                                    width: `${100 / tabsPerView}%`,
                                                    minWidth: 0,
                                                    flexShrink: 0
                                                }}
                                            >
                                                <Icon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-center leading-tight truncate">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Botão Esquerda - Mobile */}
                            {(canScrollLeft || isAtEnd) && (
                                <button
                                    onClick={scrollLeft}
                                    className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-r from-[#f5f1e8]/50 to-transparent hover:from-[#f5f1e8]/70 transition-all"
                                    aria-label={isAtEnd ? "Voltar ao início" : "Anterior"}
                                >
                                    <HiOutlineChevronLeft className="w-4 h-4 text-[#7d796c] hover:text-[#1a1a1d]" />
                                </button>
                            )}

                            {/* Botão Direita - Mobile */}
                            {canScrollRight && (
                                <button
                                    onClick={scrollRight}
                                    className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-l from-[#f5f1e8]/50 to-transparent hover:from-[#f5f1e8]/70 transition-all"
                                    aria-label="Próximo"
                                >
                                    <HiOutlineChevronRight className="w-4 h-4 text-[#7d796c] hover:text-[#1a1a1d]" />
                                </button>
                            )}
                        </>
                    ) : (
                        // DESKTOP: Mostrar todas as abas sem carrossel
                        <div className="flex h-full w-full">
                            {availableTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors
                                            whitespace-nowrap border-b-2 flex-shrink-0 h-full
                                            min-w-0
                                            ${isActive
                                                ? 'border-[#7d796c] text-[#1a1a1d] bg-white'
                                                : 'border-transparent text-[#7d796c] hover:text-[#1a1a1d] hover:bg-white/50'
                                            }
                                        `}
                                        style={{ width: tabWidth }}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-center leading-tight">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>
        </>
    );
}

