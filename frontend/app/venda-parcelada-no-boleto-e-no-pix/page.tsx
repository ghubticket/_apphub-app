'use client';

import Link from 'next/link';
import Container from '@/components/shared/Container';
import DynamicMetadata from '@/components/seo/DynamicMetadata';
import {
    HiOutlineCreditCard,
    HiOutlineDocumentText,
    HiOutlineChartBar,
    HiOutlineCheckCircle,
    HiOutlineArrowRight,
    HiOutlineBolt,
    HiOutlineCalendar,
    HiOutlineBanknotes,
    HiOutlineClock,
    HiOutlineShieldCheck,
    HiOutlineXCircle,
    HiOutlineQrCode,
    HiOutlineDevicePhoneMobile,
    HiOutlineGlobeAlt,
    HiOutlineTag,
    HiOutlineCog6Tooth,
} from 'react-icons/hi2';

export default function VendaParceladaPage() {
    return (
        <>
            <DynamicMetadata
                title="Venda a Longo Prazo - Boleto/PIX Parcelado | Vicente"
                description="Precisa vender a longo prazo? Conte com a Vicente. Venda via BOLETO/PIX parcelado para portaria, eventos e qualquer negócio que precisa de vendas parceladas."
                url="/venda-parcelada-no-boleto-e-no-pix"
                type="website"
            />
            <main className="min-h-screen bg-white">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white min-h-screen flex items-center">
                    <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-5"></div>
                    <Container>
                        <div className="relative z-10 max-w-4xl mx-auto text-center py-20">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
                                <HiOutlineCalendar className="text-[#f97316] text-xl" />
                                <span className="text-sm font-semibold uppercase tracking-wider">
                                    Venda a Longo Prazo
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                Precisa vender a longo prazo?
                                <br />
                                <span className="text-[#f97316]">Conte com a Vicente</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                                Se você vende para <strong className="text-white">portaria</strong>, ou eventos que precisam de{' '}
                                <strong className="text-white">vendas parceladas</strong>, a Vicente é pra você.
                                <br />
                                <span className="text-lg md:text-xl mt-2 block">
                                    Venda via <strong className="text-white">BOLETO/PIX parcelado</strong>, controle você mesmo suas vendas e acompanhe os pagamentos mensais dos seus clientes!
                                    <span className="inline-block ml-2 animate-pulse">🚀</span>
                                </span>
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="https://wa.me/5511982631238?text=Olá! Quero vender pacotes parcelados no PIX/Boleto! 🚀"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f97316] hover:bg-[#ea6820] text-white hover:text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    Começar Agora
                                    <HiOutlineArrowRight className="text-xl text-white" />
                                </a>
                                <a
                                    href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre venda parcelada! 💬"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:text-white font-semibold rounded-full transition-all"
                                >
                                    Fale com o Vicente!
                                </a>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Seção Principal - Venda Parcelada */}
                <section className="py-20 md:py-28 bg-gradient-to-b from-white to-[#faf7f0]">
                    <Container>
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center mb-4">
                                    <span className="text-6xl md:text-7xl animate-pulse">💳</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Venda via Boleto/PIX Parcelado
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Perfeito para portaria, eventos que precisam de vendas parceladas, cursos, pacotes de viagem e qualquer venda a longo prazo.
                                    <span className="inline-block ml-2 animate-bounce">💪</span>
                                </p>
                            </div>

                            {/* Cards de Benefícios */}
                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineBanknotes className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">
                                        Valores Maiores Parcelados <span className="text-xl">💰</span>
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        Venda portaria, eventos, pacotes e serviços com valores altos parcelados no PIX ou Boleto.
                                        Seus clientes pagam em parcelas mensais, facilitando a compra.
                                    </p>
                                    
                                    {/* Ilustração Visual - Parcelamento */}
                                    <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-gray-700">Valor Total</span>
                                                <span className="text-lg font-bold text-[#1a1a1d]">R$ 12.000</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div className="bg-gradient-to-r from-[#f97316] to-[#ea6820] h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                                <span className="font-medium">Parcelado em 12x</span>
                                                <span className="font-semibold text-[#f97316]">R$ 1.000/mês</span>
                                            </div>
                                            
                                            {/* Barras de Parcelas */}
                                            <div className="grid grid-cols-6 gap-1">
                                                {[1, 2, 3, 4, 5, 6].map((num) => (
                                                    <div key={num} className="flex flex-col items-center">
                                                        <div className="w-full bg-gradient-to-t from-[#f97316] to-[#ea6820] rounded-t" style={{ height: `${20 + (num * 5)}px` }}></div>
                                                        <span className="text-[10px] text-gray-500 mt-1">{num}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-[#f97316]"></div>
                                                        <span className="text-xs text-gray-600">PIX Parcelado</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        <span className="text-xs text-gray-600">Boleto Parcelado</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineChartBar className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">
                                        Controle Total <span className="text-xl">👑</span>
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        Você controla suas vendas e acompanha os pagamentos mensais dos seus clientes.
                                        Dashboard completo com histórico de pagamentos e status de cada parcela.
                                    </p>
                                    
                                    {/* Gráfico Visual - Vendas e Pagamentos */}
                                    <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-gray-700">Vendas Totais</span>
                                                <span className="text-sm font-bold text-[#f97316]">R$ 45.000</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div className="bg-gradient-to-r from-[#f97316] to-[#ea6820] h-3 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-gray-700">Pagamentos Recebidos</span>
                                                <span className="text-sm font-bold text-green-600">R$ 30.000</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{ width: '67%' }}></div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-gray-700">Pagamentos Pendentes</span>
                                                <span className="text-sm font-bold text-orange-600">R$ 15.000</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full" style={{ width: '33%' }}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
                                                    <span className="text-gray-600">Total</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                    <span className="text-gray-600">Recebido</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                                                    <span className="text-gray-600">Pendente</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineClock className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">
                                        Eventos a Longo Prazo <span className="text-xl">📅</span>
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Ideal para eventos que acontecem meses à frente. Seus clientes podem parcelar
                                        a compra e pagar ao longo do tempo, aumentando suas vendas.
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineShieldCheck className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">
                                        Segurança e Confiabilidade <span className="text-xl">🔒</span>
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Pagamentos seguros via Mercado Pago. Acompanhe cada parcela, receba notificações
                                        de pagamento e gerencie tudo do seu dashboard.
                                    </p>
                                </div>
                            </div>

                            {/* Box Destaque - Parcelamento */}
                            <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] rounded-3xl p-8 md:p-10 text-white mb-8 border-2 border-[#f97316]/30 relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-4xl md:text-5xl opacity-20 animate-pulse">💸</div>
                                <div className="absolute bottom-2 left-2 text-4xl md:text-5xl opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}>⚡</div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl md:text-4xl">💳</span>
                                        <h3 className="text-2xl md:text-3xl font-bold">
                                            Parcelamento no PIX e Boleto
                                        </h3>
                                    </div>
                                    <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-4">
                                        Venda portaria, eventos, pacotes e serviços com{' '}
                                        <strong className="text-white">valores maiores parcelados</strong> no PIX ou Boleto.
                                        Seus clientes pagam em parcelas mensais, facilitando a compra e{' '}
                                        <strong className="text-white">aumentando suas vendas</strong>!
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>💳</span> PIX Parcelado
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>📄</span> Boleto Parcelado
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>📊</span> Controle Total
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>🔔</span> Notificações
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Como Funciona */}
                <section className="py-20 md:py-28 bg-white">
                    <Container>
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center gap-3 mb-4">
                                    <span className="text-5xl md:text-6xl">⚙️</span>
                                 
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Como Funciona
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Processo simples e eficiente para vender pacotes parcelados.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0 mb-6">
                                        <span className="text-3xl">1️⃣</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4">Configure seu Evento</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Crie seu evento, portaria, pacote ou serviço, defina o valor total e escolha as opções de parcelamento.
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0 mb-6">
                                        <span className="text-3xl">2️⃣</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4">Cliente Compra Parcelado</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Seu cliente escolhe pagar via PIX ou Boleto parcelado. O sistema gera as parcelas automaticamente.
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0 mb-6">
                                        <span className="text-3xl">3️⃣</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4">Acompanhe os Pagamentos</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Acompanhe cada parcela paga no seu dashboard. Receba notificações quando os pagamentos forem confirmados.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Benefícios Detalhados */}
                <section className="pb-20 md:pb-28 bg-gradient-to-b from-white to-[#faf7f0]">
                    <Container>
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center gap-3 mb-4">
                                    <span className="text-5xl md:text-6xl ">💎</span>
                                
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Benefícios para Vendas a Longo Prazo
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Recursos perfeitos para portaria, eventos com vendas parceladas, cursos, pacotes e qualquer negócio que precisa vender a longo prazo.
                                    <span className="inline-block ml-2 animate-pulse">🔥</span>
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Dashboard de Pagamentos */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineChartBar className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Dashboard de Pagamentos</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Acompanhe todos os pagamentos em tempo real.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Histórico Completo</strong> de todas as parcelas
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Status de Cada Parcela</strong> (paga, pendente, vencida)
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Relatórios Detalhados</strong> de recebimentos
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Exportação para Excel</strong> para análise
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Notificações Automáticas */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineBolt className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Notificações Automáticas</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Receba alertas quando os pagamentos forem confirmados.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Email Automático</strong> quando parcela for paga
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">WhatsApp</strong> com confirmação de pagamento
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Lembretes de Vencimento</strong> para clientes
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Dashboard em Tempo Real</strong> com atualizações instantâneas
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Controle de Vendas */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineDocumentText className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Controle Total de Vendas</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Gerencie todas as suas vendas parceladas em um só lugar.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Gestão de Clientes</strong> com histórico completo
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Filtros Avançados</strong> por status, data, cliente
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Busca Rápida</strong> de pedidos e clientes
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Relatórios Personalizados</strong> para análise
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Segurança */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineShieldCheck className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Segurança Total</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Pagamentos seguros e protegidos via Mercado Pago.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Mercado Pago</strong> como gateway de pagamento
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Criptografia</strong> de dados sensíveis
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Proteção Anti-Fraude</strong> em todas as transações
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Compliance</strong> com LGPD e normas de segurança
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Cancelamentos Automáticos */}
                <section className="py-20 md:py-28 bg-white">
                    <Container>
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-gradient-to-br from-red-50 via-orange-50 to-red-50 rounded-3xl p-8 md:p-12 border-2 border-red-200/50 relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                            <HiOutlineXCircle className="text-3xl text-red-600" />
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-bold text-[#1a1a1d]">
                                            Cancelamentos Automáticos
                                        </h3>
                                    </div>
                                    <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                                        <strong className="text-red-600">Proteção automática para não pagamentos!</strong> O sistema cancela automaticamente pedidos quando parcelas pendentes não forem pagas dentro do prazo estipulado.
                                    </p>
                                    
                                    {/* Ilustração Visual - Cancelamento Automático */}
                                    <div className="mb-8 p-5 bg-white/90 backdrop-blur-sm rounded-xl border-2 border-red-200">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4 text-center">Fluxo de Cancelamento Automático</h4>
                                            
                                            {/* Timeline Visual */}
                                            <div className="space-y-4">
                                                {/* Parcela 1 - Paga */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                        <span className="text-green-600 text-xs font-bold">1</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold text-gray-700">Parcela 1</span>
                                                            <span className="text-xs font-bold text-green-600">✓ Paga</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Parcela 2 - Paga */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                        <span className="text-green-600 text-xs font-bold">2</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold text-gray-700">Parcela 2</span>
                                                            <span className="text-xs font-bold text-green-600">✓ Paga</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Parcela 3 - Vencida/Não Paga */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                                        <span className="text-red-600 text-xs font-bold">3</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold text-gray-700">Parcela 3</span>
                                                            <span className="text-xs font-bold text-red-600">✗ Vencida</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div className="bg-red-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Linha de Cancelamento */}
                                                <div className="flex items-center gap-3 pt-2 border-t-2 border-dashed border-red-300">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                                                        <HiOutlineXCircle className="text-white text-sm" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-red-700">Cancelamento Automático</span>
                                                                <span className="text-xs text-red-600">Vaga Liberada</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-center gap-4 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                    <span className="text-gray-600">Paga</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                    <span className="text-gray-600">Vencida</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-200 border-2 border-red-500"></div>
                                                    <span className="text-gray-600">Cancelado</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-red-100">
                                            <div className="flex items-start gap-3 mb-3">
                                                <HiOutlineCheckCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-[#1a1a1d] mb-2">Cancelamento Automático</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Quando uma parcela não for paga no prazo, o sistema cancela automaticamente o pedido, liberando a vaga.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-red-100">
                                            <div className="flex items-start gap-3 mb-3">
                                                <HiOutlineCheckCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-[#1a1a1d] mb-2">Notificações Inteligentes</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Cliente recebe lembretes antes do vencimento e notificação de cancelamento se não pagar.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-red-100">
                                            <div className="flex items-start gap-3 mb-3">
                                                <HiOutlineCheckCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-[#1a1a1d] mb-2">Controle Total</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Você define as regras de cancelamento e acompanha tudo no dashboard em tempo real.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-red-100">
                                            <div className="flex items-start gap-3 mb-3">
                                                <HiOutlineCheckCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-[#1a1a1d] mb-2">Liberação Automática</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Vagas são liberadas automaticamente para novos clientes quando há cancelamento.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-red-200">
                                        <p className="text-base text-gray-700 text-center">
                                            <strong className="text-red-600">Proteja seus eventos!</strong> Com cancelamentos automáticos, você não perde vendas por parcelas não pagas e mantém o controle total do seu negócio.
                                            <span className="inline-block ml-2 animate-bounce">💪</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Aplicativo QR Code */}
                <section className="pb-20 md:pb-28 bg-gradient-to-b from-white to-[#faf7f0]">
                    <Container>
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center gap-3 mb-4">
                                    <span className="text-5xl md:text-6xl">📱</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Aplicativo de QR Code para Eventos Maiores
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Check-in e checkout rápidos e eficientes para eventos de grande porte.
                                    <span className="inline-block ml-2 animate-pulse">🚀</span>
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                {/* Check-in */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineQrCode className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Check-in Rápido</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Validação instantânea de ingressos na entrada do evento.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Escaneamento Instantâneo</strong> de QR codes
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Validação Offline</strong> funciona sem internet
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Proteção Anti-Fraude</strong> detecta códigos duplicados
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Histórico Completo</strong> de todas as validações
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Checkout */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineDevicePhoneMobile className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Checkout Inteligente</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Controle de saída e entrada em eventos maiores.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Controle de Entrada e Saída</strong> completo
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Relatórios em Tempo Real</strong> de ocupação
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Múltiplos Pontos de Acesso</strong> simultâneos
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Sincronização Automática</strong> entre dispositivos
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Box Destaque - App QR Code */}
                            <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] rounded-3xl p-8 md:p-10 text-white border-2 border-[#f97316]/30 relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-4xl md:text-5xl opacity-20 animate-pulse">📱</div>
                                <div className="absolute bottom-2 left-2 text-4xl md:text-5xl opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}>⚡</div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl md:text-4xl">📲</span>
                                        <h3 className="text-2xl md:text-3xl font-bold">
                                            App Exclusivo para Eventos Maiores
                                        </h3>
                                    </div>
                                    <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-4">
                                        Perfeito para eventos de grande porte! Nosso aplicativo de QR code permite{' '}
                                        <strong className="text-white">check-in e checkout rápidos</strong>, mesmo em eventos com milhares de pessoas.
                                        Funciona offline, sincroniza automaticamente e oferece{' '}
                                        <strong className="text-white">controle total</strong> sobre a entrada e saída dos participantes.
                                        <span className="inline-block ml-2 animate-bounce">🎯</span>
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>📱</span> App Mobile
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>⚡</span> Offline
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>🔒</span> Seguro
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>📊</span> Relatórios
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Landing Pages de Eventos */}
                <section className="py-20 md:py-28 bg-white">
                    <Container>
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center gap-3 mb-4">
                                    <span className="text-5xl md:text-6xl">🎨</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Você Pode Criar Landing Pages de Eventos
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Diferentes tipos de pacotes, preços personalizados, você quem comanda tudo!
                                    <span className="inline-block ml-2 animate-pulse">🚀</span>
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8 mb-12">
                                {/* Tipos de Pacotes */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 rounded-3xl shadow-xl">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineTag className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Diferentes Tipos de Pacotes</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Crie quantos pacotes quiser para seu evento.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Pacotes Básicos, Intermediários e VIP</strong>
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Pacotes Personalizados</strong> com benefícios únicos
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Descrições Detalhadas</strong> para cada pacote
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Imagens e Galerias</strong> por pacote
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Preços Personalizados */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineCreditCard className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Preços Personalizados</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Defina os preços que quiser para cada pacote.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Valores Flexíveis</strong> por pacote
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Descontos e Promoções</strong> personalizados
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Preços Parcelados</strong> configuráveis
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Atualização em Tempo Real</strong> de preços
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Controle Total */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineCog6Tooth className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Você Quem Comanda</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Controle total sobre sua landing page.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Design Personalizado</strong> do seu jeito
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Edição Livre</strong> de conteúdo e imagens
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Gestão de Estoque</strong> por pacote
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Ativação/Desativação</strong> instantânea
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Box Destaque - Landing Pages */}
                            <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] rounded-3xl p-8 md:p-10 text-white border-2 border-[#f97316]/30 relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-4xl md:text-5xl opacity-20 animate-pulse">🎨</div>
                                <div className="absolute bottom-2 left-2 text-4xl md:text-5xl opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}>🌐</div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <HiOutlineGlobeAlt className="text-3xl md:text-4xl text-[#f97316]" />
                                        <h3 className="text-2xl md:text-3xl font-bold">
                                            Landing Pages Exclusivas para Seus Eventos
                                        </h3>
                                    </div>
                                    <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-4">
                                        <strong className="text-white">Você pode criar landing pages incríveis</strong> para seus eventos! 
                                        Crie diferentes tipos de pacotes, defina preços personalizados, adicione imagens, descrições e muito mais.
                                        <br />
                                        <br />
                                        <strong className="text-white">Você quem comanda tudo!</strong> Controle total sobre design, conteúdo, 
                                        preços, pacotes e estoque. Sua landing page, suas regras, seu jeito!
                                        <span className="inline-block ml-2 animate-bounce">🎯</span>
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>🎨</span> Design Personalizado
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>📦</span> Múltiplos Pacotes
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>💰</span> Preços Flexíveis
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>👑</span> Você no Comando
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* CTA Final */}
                <section className="py-20 md:py-28 bg-gradient-to-r from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white">
                    <Container>
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="flex justify-center gap-3 mb-6">
                                <span className="text-6xl md:text-7xl">✈️</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                Pronto para Vender Pacotes Parcelados?
                            </h2>
                            <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed">
                                Precisa vender a longo prazo? <strong className="text-white">Conte com a Vicente!</strong>
                                <br />
                                Se você vende para portaria, ou eventos que precisam de vendas parceladas, a Vicente é pra você.
                                <br />
                                Controle total, acompanhamento mensal e muito mais!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="https://wa.me/5511982631238?text=Olá! Quero vender pacotes parcelados no PIX/Boleto! 🚀"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f97316] hover:bg-[#ea6820] text-white hover:text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    Começar Agora
                                    <HiOutlineArrowRight className="text-xl text-white" />
                                </a>
                                <a
                                    href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre venda parcelada! 💬"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:text-white font-semibold rounded-full transition-all"
                                >
                                    Fale com o Vicente!
                                </a>
                            </div>
                            <p className="mt-8 text-gray-400 text-sm">
                                Sem compromisso. Sem cartão de crédito. Comece grátis.
                                <span className="inline-block ml-2 animate-pulse">✨</span>
                            </p>
                        </div>
                    </Container>
                </section>
            </main>
        </>
    );
}

