'use client';

import Link from 'next/link';
import Container from '@/components/shared/Container';
import DynamicMetadata from '@/components/seo/DynamicMetadata';
import {
    HiOutlineShieldCheck,
    HiOutlineChartBar,
    HiOutlineTicket,
    HiOutlineEnvelope,
    HiOutlineDocumentText,
    HiOutlineMagnifyingGlass,
    HiOutlineQrCode,
    HiOutlineLockClosed,
    HiOutlineCheckCircle,
    HiOutlineArrowRight,
    HiOutlineBolt,
    HiOutlineChatBubbleLeftRight,
    HiOutlineSparkles,
    HiOutlineCreditCard,
    HiOutlineUserGroup,
    HiOutlineHeart,
    HiOutlineStar,
} from 'react-icons/hi2';

export default function SobrePage() {
    return (
        <>
            <DynamicMetadata
                title="Sobre a Vicente - Seu Sistema Exclusivo de Gestão de Eventos"
                description="Vicente é mais que venda de ingressos: site exclusivo, dashboard completo, QR Code seguro e gestão total do seu evento."
                url="/sobre"
                type="website"
            />
            <main className="min-h-screen bg-white relative">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white pt-32 pb-20 md:py-32 min-h-[calc(100vh-var(--app-header-height,120px))] flex items-center">
                    <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-5"></div>
                    <Container>
                        <div className="relative z-10 max-w-4xl mx-auto text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
                                <HiOutlineBolt className="text-[#f97316] text-xl" />
                                <span className="text-sm font-semibold uppercase tracking-wider">
                                    Exclusividade Total
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                Seu Evento.
                                <br />
                                <span className="text-[#f97316]">Seu Site.</span>
                                <br />
                                <span className="text-3xl md:text-5xl">Você no Comando.</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                                A <strong className="text-white">Vicente</strong> é muito mais do que uma plataforma de <br /> {' '}
                                <span className="line-through opacity-50">venda de ingressos</span> —{' '}
                                <span className="text-[#f97316] font-semibold">ingressos é só o tchan</span>!
                                <br />
                                <span className="text-lg md:text-xl mt-2 block">
                                    Você pode ter <strong className="text-white">tudooooo isso</strong>: seu site exclusivo,
                                    dashboard completo, leitor de QR code, distribuição de VIPs, relatórios, Excel,
                                    e muito mais! É seu evento, <strong className="text-[#f97316]">você no comando</strong>!
                                    <span className="inline-block ml-2 animate-pulse">🚀</span>
                                </span>
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="https://wa.me/5511982631238?text=Olá! Quero começar a usar a Vicente! 🚀"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f97316] hover:bg-[#ea6820] text-white visited:text-white hover:text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    Começar Agora
                                    <HiOutlineArrowRight className="text-xl" />
                                </a>
                                <a
                                    href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre a plataforma! 💬"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white visited:text-white hover:text-white font-semibold rounded-full transition-all"
                                >
                                    Fale com o Vicente!
                                </a>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Exclusividade - Pilar Principal */}
                <section id="exclusividade" className="py-20 md:py-28 bg-gradient-to-b from-white to-[#faf7f0]">
                    <Container>
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center mb-4">
                                    <span className="text-6xl md:text-7xl animate-pulse">🔥</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Exclusividade: Nosso Pilar Principal
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Na Vicente, acreditamos que seu evento merece destaque exclusivo. Sem competir por
                                    atenção, sem dividir espaço, sem perder oportunidades para eventos concorrentes.
                                    <span className="inline-block ml-2 animate-bounce">💪</span>
                                    <br />
                                    <span className="text-lg mt-3 block">
                                        Quando falamos de <strong className="text-[#f97316]">exclusividade</strong>, é pra valer!
                                        Aqui você pode deixar o site do jeito que você quiser, pode imprimir suas listas,
                                        distribuir VIPs, gerar o Excel, fazer tudo do seu jeito!
                                        <span className="inline-block ml-1 animate-pulse">🚀</span>
                                    </span>
                                    <br />
                                    <span className="text-lg mt-2 block">
                                        Sério, até nossa <Link href="/404" className="text-[#f97316] hover:underline font-semibold">página 404</Link> é exclusiva!
                                        <span className="inline-block ml-1 animate-pulse">😎</span>
                                    </span>
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8 mb-12">
                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineBolt className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">Site Exclusivo <span className="text-xl">🎨</span></h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Seu próprio domínio, sua identidade visual, sua marca. Nada de marketplace genérico
                                        onde seu evento se perde entre centenas de outros. É seu role, seu jeito!
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineLockClosed className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">Sem Concorrência <span className="text-xl">🔒</span></h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Seus clientes não verão outros eventos ao pegar seus ingressos. Foco total no seu
                                        evento, maximizando conversão. Zero distrações, só o que importa!
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                    <div className="w-16 h-16 bg-[#f97316]/10 rounded-full flex items-center justify-center mb-6">
                                        <HiOutlineChartBar className="text-3xl text-[#f97316]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#1a1a1d] mb-4">Você no Comando <span className="text-xl">👑</span></h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Controle total sobre preços, estoque, cupons, design e experiência do cliente. Seu
                                        evento, suas regras. Você manda aqui!
                                    </p>
                                </div>
                            </div>

                            {/* Box Split de Pagamento */}
                            <div id="split-pagamento" className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] rounded-3xl p-8 md:p-10 text-white mb-8 border-2 border-[#f97316]/30 relative overflow-hidden">
                                <div className="absolute top-2 right-2 text-4xl md:text-5xl opacity-20 animate-pulse">💸</div>
                                <div className="absolute bottom-2 left-2 text-4xl md:text-5xl opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}>⚡</div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl md:text-4xl">💰</span>
                                        <h3 className="text-2xl md:text-3xl font-bold">
                                            Split de Pagamento Mercado Pago
                                        </h3>
                                    </div>
                                    <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-6">
                                        Receba direto na sua conta! Com split de pagamento do Mercado Pago, você{' '}
                                        <strong className="text-white">não precisa esperar muito tempo</strong> para receber.
                                        O dinheiro cai direto na sua conta, sem complicação, sem espera!
                                        <span className="inline-block ml-2 animate-bounce">🎯</span>
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>⚡</span> Recebimento Rápido
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>🔒</span> Seguro e Confiável
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 rounded-full text-sm font-semibold">
                                            <span>💳</span> PIX e Cartão
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-[#f97316] to-[#ea6820] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-5xl md:text-6xl opacity-20 animate-pulse">🎊</div>
                                <div className="absolute bottom-4 left-4 text-5xl md:text-6xl opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}>🎉</div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                                        Sem Filas. <br /> Sem Eventos Concorrentes. <br /> Sem Chamados.
                                    </h3>
                                    <p className="text-lg md:text-xl opacity-90 mb-6">
                                        A experiência que seus clientes merecem: rápida, focada e exclusiva.
                                        <span className="inline-block ml-2 animate-pulse">✨</span>
                                    </p>
                                    <a
                                        href="https://wa.me/5511982631238?text=Olá! Quero experimentar a Vicente! 🚀"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#f97316] font-semibold rounded-full hover:bg-gray-100 transition-all transform hover:scale-105"
                                    >
                                        Experimente Agora
                                        <HiOutlineArrowRight className="text-xl" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Recursos Principais */}
                <section id="recursos" className="py-20 md:py-28 bg-white">
                    <Container>
                        <div className="text-center mb-16">
                            <div className="flex justify-center gap-3 mb-4">
                                <span className="text-5xl md:text-6xl animate-pulse" style={{ animationDelay: '0.2s' }}>⚡</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                Tudo que Você Precisa em Uma Plataforma
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Recursos incríveis que fazem a diferença na gestão dos seus eventos.
                                <span className="inline-block ml-2 animate-pulse">🔥</span>
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                            {/* Segurança */}
                            <div id="seguranca" className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <HiOutlineShieldCheck className="text-3xl text-[#f97316]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-3">Segurança de Ponta</h3>
                                        <p className="text-gray-300 leading-relaxed mb-4">
                                            Proteção completa para seus dados e transações financeiras.
                                        </p>
                                    </div>
                                </div>

                                {/* Ilustração Visual - Segurança */}
                                <div className="mb-6 p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                    <h4 className="text-sm font-bold text-white mb-4 text-center">Camadas de Segurança</h4>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-400">
                                                <span className="text-green-300 text-xs">🔒</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-200">Criptografia AES-256</span>
                                                    <span className="text-xs font-bold text-green-300">100%</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-400">
                                                <span className="text-blue-300 text-xs">🛡️</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-200">Rate Limiting</span>
                                                    <span className="text-xs font-bold text-blue-300">Ativo</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-400">
                                                <span className="text-purple-300 text-xs">🔐</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-200">HTTPS Obrigatório</span>
                                                    <span className="text-xs font-bold text-purple-300">100%</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-400">
                                                <span className="text-orange-300 text-xs">👁️</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-200">Monitoramento Sentry</span>
                                                    <span className="text-xs font-bold text-orange-300">24/7</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/20 text-center">
                                        <div className="text-xs text-gray-300">
                                            <span className="font-semibold">0</span> incidentes | <span className="font-semibold">100%</span> protegido
                                        </div>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Criptografia AES-256-GCM</strong> para dados
                                            sensíveis (CPF, telefone)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Rate Limiting</strong> em múltiplas camadas para
                                            prevenir ataques
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">QR Codes Seguros</strong> com proteção anti-replay
                                            e assinatura HMAC
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Monitoramento Sentry</strong> com detecção
                                            automática de anomalias
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">HTTPS obrigatório</strong> e proteção contra
                                            fraudes
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Dashboard */}
                            <div id="dashboard" className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <HiOutlineChartBar className="text-3xl text-[#f97316]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Dashboard Completo</h3>
                                        <p className="text-gray-600 leading-relaxed mb-4">
                                            Controle total sobre seus eventos, pedidos e validações.
                                        </p>
                                    </div>
                                </div>

                                {/* Ilustração Visual - Dashboard */}
                                <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-700 mb-3 text-center">Visão Geral do Dashboard</h4>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="text-xs text-gray-500 mb-1">Eventos</div>
                                            <div className="text-lg font-bold text-[#1a1a1d]">12</div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div className="bg-[#f97316] h-1.5 rounded-full" style={{ width: '80%' }}></div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="text-xs text-gray-500 mb-1">Vendas</div>
                                            <div className="text-lg font-bold text-[#1a1a1d]">R$ 45K</div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="text-xs text-gray-500 mb-1">Validações</div>
                                            <div className="text-lg font-bold text-[#1a1a1d]">1.234</div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '90%' }}></div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="text-xs text-gray-500 mb-1">Clientes</div>
                                            <div className="text-lg font-bold text-[#1a1a1d]">856</div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center text-xs text-gray-500">
                                        Controle total em tempo real
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Gestão de Eventos</strong> completa com
                                            múltiplos tipos de ingresso
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Leitor QR Code</strong> integrado para
                                            validação rápida na entrada
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Relatórios em Tempo Real</strong> de ingressos e
                                            estatísticas
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Histórico de Validações</strong> com busca e
                                            filtros avançados
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Gestão de Usuários</strong> com diferentes
                                            níveis de permissão
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Cupons e Códigos */}
                            <div id="cupons" className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <HiOutlineTicket className="text-3xl text-[#f97316]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">
                                            Sistema de Cupons Inteligente
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed mb-4">
                                            Crie códigos promocionais personalizados para impulsionar seus eventos.
                                        </p>
                                    </div>
                                </div>

                                {/* Ilustração Visual - Cupons */}
                                <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-700 mb-3 text-center">Exemplos de Cupons</h4>

                                    <div className="space-y-2">
                                        <div className="bg-gradient-to-r from-[#f97316] to-[#ea6820] text-white p-3 rounded-lg flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-semibold opacity-90">BLACKFRIDAY</div>
                                                <div className="text-xs opacity-75">20% OFF</div>
                                            </div>
                                            <div className="text-sm font-bold">✓ Ativo</div>
                                        </div>

                                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-semibold opacity-90">VIP2024</div>
                                                <div className="text-xs opacity-75">R$ 50 OFF</div>
                                            </div>
                                            <div className="text-sm font-bold">✓ Ativo</div>
                                        </div>

                                        <div className="bg-gray-200 text-gray-600 p-3 rounded-lg flex items-center justify-between opacity-60">
                                            <div>
                                                <div className="text-xs font-semibold">SUMMER50</div>
                                                <div className="text-xs">50% OFF</div>
                                            </div>
                                            <div className="text-xs">Inativo</div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                                        <div className="text-xs text-gray-600">
                                            <span className="font-semibold">156</span> usos | <span className="font-semibold">R$ 3.240</span> em descontos
                                        </div>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Descontos Percentuais ou Fixos</strong> com
                                            controle total
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Códigos por Evento</strong> ou globais para
                                            múltiplos eventos
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Estatísticas Detalhadas</strong> de uso e
                                            conversão por código
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Ativação/Desativação</strong> instantânea de
                                            códigos
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Validação em Tempo Real</strong> no checkout
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* SEO */}
                            <div id="seo" className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <HiOutlineMagnifyingGlass className="text-3xl text-[#f97316]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-3">SEO Otimizado</h3>
                                        <p className="text-gray-300 leading-relaxed mb-4">
                                            Seu evento encontrado facilmente no Google e redes sociais.
                                        </p>
                                    </div>
                                </div>

                                {/* Ilustração Visual - SEO */}
                                <div className="mb-6 p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                    <h4 className="text-sm font-bold text-white mb-4 text-center">Otimização SEO</h4>

                                    <div className="space-y-3">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-gray-200">Google Indexação</span>
                                                <span className="text-xs font-bold text-green-300">✓ Indexado</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-gray-200">Open Graph</span>
                                                <span className="text-xs font-bold text-blue-300">✓ Configurado</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-gray-200">Structured Data</span>
                                                <span className="text-xs font-bold text-purple-300">✓ Schema.org</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-gray-200">URLs Amigáveis</span>
                                                <span className="text-xs font-bold text-orange-300">✓ SEO Friendly</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/20 text-center">
                                        <div className="text-xs text-gray-300">
                                            <span className="font-semibold">98%</span> de visibilidade | <span className="font-semibold">Google</span> otimizado
                                        </div>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Open Graph</strong> e Twitter Cards para
                                            compartilhamento perfeito
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Structured Data</strong> (Schema.org) para melhor
                                            indexação
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Metadata Dinâmica</strong> por evento e página
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">URLs Amigáveis</strong> e sitemap automático
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Canonical URLs</strong> para evitar conteúdo
                                            duplicado
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Emails Automáticos */}
                            <div id="emails" className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <HiOutlineEnvelope className="text-3xl text-[#f97316]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Emails Automáticos</h3>
                                        <p className="text-gray-600 leading-relaxed mb-4">
                                            Comunicação automática com seus clientes.
                                        </p>
                                    </div>
                                </div>

                                {/* Ilustração Visual - Emails Automáticos */}
                                <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-700 mb-3 text-center">Fluxo de Emails Automáticos</h4>

                                    <div className="space-y-3">
                                        {/* Email 1 - Confirmação */}
                                        <div className="bg-white border-l-4 border-green-500 p-3 rounded-lg shadow-sm">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-gray-700">Confirmação de Compra</div>
                                                    <div className="text-xs text-gray-500">Enviado automaticamente</div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-2">✓ Ingresso anexo | PDF gerado</div>
                                        </div>

                                        {/* Email 2 - Pagamento */}
                                        <div className="bg-white border-l-4 border-blue-500 p-3 rounded-lg shadow-sm">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-gray-700">Notificação de Pagamento</div>
                                                    <div className="text-xs text-gray-500">Status: Aprovado</div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-2">✓ Pagamento confirmado</div>
                                        </div>

                                        {/* Email 3 - Lembrete */}
                                        <div className="bg-white border-l-4 border-orange-500 p-3 rounded-lg shadow-sm">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-gray-700">Lembrete de Evento</div>
                                                    <div className="text-xs text-gray-500">24h antes do evento</div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-2">✓ Enviado automaticamente</div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                                        <div className="text-xs text-gray-600">
                                            <span className="font-semibold">98%</span> de entregabilidade | <span className="font-semibold">Resend</span>
                                        </div>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Confirmação Automática</strong> com ingressos
                                            anexos
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Notificações de Pagamento</strong> (aprovado,
                                            pendente, recusado)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Email de Boas-Vindas</strong> para novos
                                            usuários
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Templates Personalizáveis</strong> com sua marca
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">
                                            <strong className="text-[#1a1a1d]">Integração Resend</strong> para alta
                                            entregabilidade
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* PDFs Automáticos */}
                            <div id="pdfs" className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <HiOutlineDocumentText className="text-3xl text-[#f97316]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-3">PDFs Profissionais</h3>
                                        <p className="text-gray-300 leading-relaxed mb-4">
                                            Geração automática de ingressos em PDF de alta qualidade.
                                        </p>
                                    </div>
                                </div>

                                {/* Ilustração Visual - PDFs */}
                                <div className="mb-6 p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                    <h4 className="text-sm font-bold text-white mb-4 text-center">Geração de PDFs</h4>

                                    <div className="space-y-3">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📄</span>
                                                    <span className="text-xs font-semibold text-gray-200">PDF Gerado</span>
                                                </div>
                                                <span className="text-xs font-bold text-green-300">✓ Pronto</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">🔲</span>
                                                    <span className="text-xs font-semibold text-gray-200">QR Code Único</span>
                                                </div>
                                                <span className="text-xs font-bold text-blue-300">✓ Incluído</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">✉️</span>
                                                    <span className="text-xs font-semibold text-gray-200">Envio Automático</span>
                                                </div>
                                                <span className="text-xs font-bold text-purple-300">✓ Enviado</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📐</span>
                                                    <span className="text-xs font-semibold text-gray-200">Formato A4</span>
                                                </div>
                                                <span className="text-xs font-bold text-orange-300">✓ Pronto</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/20 text-center">
                                        <div className="text-xs text-gray-300">
                                            <span className="font-semibold">1.234</span> PDFs gerados | <span className="font-semibold">100%</span> automático
                                        </div>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">QR Code por Ingresso</strong> único e seguro
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Design Personalizado</strong> com informações do
                                            evento
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Envio Automático</strong> por email após
                                            pagamento
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Download no Dashboard</strong> a qualquer momento
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">Formato A4</strong> pronto para impressão
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* CRM - Gestão de Relacionamento */}
                <section id="crm" className="py-20 md:pt-0 bg-gradient-to-b from-white to-[#faf7f0]">
                    <Container>
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center gap-3 mb-4">
                                    <span className="text-5xl md:text-6xl animate-pulse" style={{ animationDelay: '0.2s' }}>📧</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    CRM Completo para Seus Clientes
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Automatize sua comunicação e mantenha seus clientes sempre próximos!
                                    <span className="inline-block ml-2 animate-pulse">🚀</span>
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Disparo WhatsApp */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineChatBubbleLeftRight className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Disparo de WhatsApp</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Envie mensagens automáticas para seus clientes via WhatsApp.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Mensagens Personalizadas</strong> com templates prontos
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Confirmação de Pedidos</strong> automática
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Lembretes de Eventos</strong> antes da data
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Campanhas Segmentadas</strong> por público
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Régua de Email */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineEnvelope className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Régua de Email</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Automatize sequências de emails para nutrir seus clientes.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Sequências Automáticas</strong> de follow-up
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Emails de Boas-Vindas</strong> para novos clientes
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Lembretes Personalizados</strong> por evento
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Análise de Engajamento</strong> e aberturas
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Aniversário Automático */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineSparkles className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">Aniversário Automático</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Surpreenda seus clientes com mensagens automáticas no aniversário!
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Disparo Automático</strong> no dia do aniversário
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Cupons Especiais</strong> de aniversariante
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Mensagens Personalizadas</strong> com nome do cliente
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Aumenta Fidelização</strong> e engajamento
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Gestão de Clientes */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineChartBar className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Gestão Completa de Clientes</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Centralize todas as informações dos seus clientes em um só lugar.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Histórico Completo</strong> de compras e interações
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Segmentação Avançada</strong> por comportamento
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Tags e Etiquetas</strong> para organização
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Relatórios Detalhados</strong> de relacionamento
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Validação QR Code */}
                <section id="qr-code" className=" bg-gradient-to-b from-[#faf7f0] to-white">
                    <Container>
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#f97316]/10 rounded-full mb-6">
                                    <HiOutlineQrCode className="text-4xl text-[#f97316]" />
                                </div>

                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    Leitor QR Code Completo
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Validação rápida, segura e offline na entrada do seu evento.
                                    <span className="inline-block ml-2 animate-pulse">⚡</span>
                                </p>
                            </div>

                            {/* Ilustração Visual - QR Code */}
                            <div className="max-w-2xl mx-auto mb-12 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 text-center">Validação QR Code em Ação</h4>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {/* QR Code 1 - Válido */}
                                    <div className="text-center">
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300 mb-2">
                                            <div className="w-16 h-16 mx-auto bg-white rounded flex items-center justify-center text-2xl">
                                                ▢
                                            </div>
                                        </div>
                                        <div className="text-xs font-semibold text-green-600">✓ Válido</div>
                                        <div className="text-xs text-gray-500">Entrada OK</div>
                                    </div>

                                    {/* QR Code 2 - Já usado */}
                                    <div className="text-center">
                                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-300 mb-2">
                                            <div className="w-16 h-16 mx-auto bg-white rounded flex items-center justify-center text-2xl">
                                                ▢
                                            </div>
                                        </div>
                                        <div className="text-xs font-semibold text-red-600">✗ Já usado</div>
                                        <div className="text-xs text-gray-500">Bloqueado</div>
                                    </div>

                                    {/* QR Code 3 - Offline */}
                                    <div className="text-center">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-300 mb-2">
                                            <div className="w-16 h-16 mx-auto bg-white rounded flex items-center justify-center text-2xl">
                                                ▢
                                            </div>
                                        </div>
                                        <div className="text-xs font-semibold text-blue-600">⚡ Offline</div>
                                        <div className="text-xs text-gray-500">Sinc. depois</div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className="text-gray-600">Validações Hoje</span>
                                        <span className="font-bold text-[#1a1a1d]">1.234</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-[#f97316] h-2 rounded-full" style={{ width: '85%' }}></div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs mt-2">
                                        <span className="text-gray-600">Taxa de Sucesso</span>
                                        <span className="font-bold text-green-600">98.5%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4 flex items-center gap-3">
                                        <HiOutlineCheckCircle className="text-[#f97316] text-2xl" />
                                        Validação Instantânea
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Escaneie QR codes em segundos. Sistema otimizado para alta velocidade mesmo em
                                        eventos com grande fluxo de pessoas.
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4 flex items-center gap-3">
                                        <HiOutlineShieldCheck className="text-[#f97316] text-2xl" />
                                        Proteção Anti-Fraude
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Detecção automática de QR codes duplicados, já utilizados ou inválidos. Sistema
                                        identifica quem passou primeiro na validação.
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4 flex items-center gap-3">
                                        <HiOutlineChartBar className="text-[#f97316] text-2xl" />
                                        Histórico Completo
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Registro de todas as validações com busca, filtros e estatísticas em tempo real.
                                        Saiba exatamente quem entrou no seu evento.
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                    <h3 className="text-xl font-bold text-[#1a1a1d] mb-4 flex items-center gap-3">
                                        <HiOutlineLockClosed className="text-[#f97316] text-2xl" />
                                        Modo Offline
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Funciona mesmo sem internet. Sincronização automática quando a conexão for
                                        restabelecida.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Seção Misteriosa - Dashboard e QR Code */}
                <section className="py-20 md:pt-10 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/5 via-transparent to-[#f97316]/5"></div>
                    <Container>
                        <div className="max-w-4xl mx-auto text-center relative z-10">
                            <div className="flex justify-center gap-3 mb-6">
                                <span className="text-5xl md:text-6xl animate-pulse" style={{ animationDelay: '0.2s' }}>💭</span>
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 md:p-12 border-2 border-gray-200 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f97316]/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#f97316]/10 rounded-full blur-3xl"></div>

                                <div className="relative z-10">
                                    <h2 className="text-2xl md:text-4xl font-bold text-[#1a1a1d] mb-6 leading-tight">
                                        Se o site já é assim...
                                        <br />
                                        <span className="text-[#f97316]">imagina O SEU DASHBOARD</span>
                                        <br />
                                        e o <span className="text-[#f97316]">SEU leitor de QR code</span>!
                                        <span className="inline-block ml-2 animate-bounce">🚀</span>
                                    </h2>

                                    <p className="text-lg md:text-xl text-gray-700 mb-6 leading-relaxed">
                                        Aqui é tudo <strong className="text-[#1a1a1d]">único</strong>, né?
                                        <span className="inline-block ml-2 animate-pulse">💎</span>
                                    </p>

                                    <div className="bg-gradient-to-r from-[#f97316] to-[#ea6820] rounded-2xl p-6 md:p-8 text-white mb-6">
                                        <p className="text-xl md:text-2xl font-bold mb-2">
                                            Fala comigo, <span className="text-white/90">Vicente</span> vai te ajudar!
                                        </p>
                                        <p className="text-base md:text-lg opacity-90">
                                            Vamos criar algo incrível juntos!
                                            <span className="inline-block ml-2 animate-bounce">💪</span>
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <a
                                            href="https://wa.me/5511982631238?text=Olá Vicente! Vamos conversar sobre a plataforma! 💬"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1a1a1d] hover:bg-[#f97316] text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg"
                                        >
                                            Vamos Conversar
                                            <HiOutlineArrowRight className="text-xl" />
                                        </a>
                                        <a
                                            href="https://wa.me/5511982631238?text=Olá! Quero começar a usar a Vicente agora! 🚀"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-[#1a1a1d] hover:bg-[#1a1a1d] hover:text-white text-[#1a1a1d] font-semibold rounded-full transition-all transform hover:scale-105"
                                        >
                                            Quero Começar Agora
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* O que vem por aí? */}
                <section className="py-20 md:py-0 md:pt-10 md:pb-16 bg-gradient-to-b from-white to-[#faf7f0]">
                    <Container>
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-16">
                                <div className="flex justify-center gap-3 mb-4">
                                    <span className="text-5xl md:text-6xl">🔮</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                    O que vem por aí?
                                </h2>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                    Estamos sempre evoluindo! Confira o que está chegando em breve...
                                    <span className="inline-block ml-2 animate-pulse">💫</span>
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Parcelamento Boleto */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl border-2 border-[#f97316]/20">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineDocumentText className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Parcelamento via Boleto</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Seus clientes poderão parcelar compras usando boleto bancário!
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Parcelamento Flexível</strong> em até 12x
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Boleto Parcelado</strong> com vencimentos automáticos
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Mais Opções</strong> para seus clientes
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* PIX Parcelado */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-[#f97316]/20">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineCreditCard className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">PIX Parcelado</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                A praticidade do PIX com a flexibilidade do parcelamento!
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">PIX em Parcelas</strong> com débito automático
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Aprovação Instantânea</strong> como PIX normal
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Mais Conversão</strong> nas suas vendas
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* App Mobile */}
                                <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border-2 border-[#f97316]/20">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <span className="text-3xl">📱</span>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1a1a1d] mb-3">App Mobile</h3>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                Seus clientes terão um app exclusivo para seus eventos!
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">App Personalizado</strong> com sua marca
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Notificações Push</strong> em tempo real
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">
                                                <strong className="text-[#1a1a1d]">Ingressos no Celular</strong> sempre à mão
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Integrações */}
                                <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl border-2 border-[#f97316]/20">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-14 h-14 bg-[#f97316]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <HiOutlineBolt className="text-3xl text-[#f97316]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-3">Mais Integrações</h3>
                                            <p className="text-gray-300 leading-relaxed mb-4">
                                                Conecte a Vicente com suas ferramentas favoritas!
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">API Completa</strong> para integrações customizadas
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Webhooks</strong> para eventos em tempo real
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <HiOutlineCheckCircle className="text-[#f97316] text-xl flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">
                                                <strong className="text-white">Zapier e Make</strong> para automações
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Clube de Benefícios e Rede de Vicenters */}
                                <div id="clube-beneficios" className="md:col-span-2 bg-gradient-to-br from-[#f97316] via-[#ea6820] to-[#f97316] text-white p-8 md:p-10 rounded-3xl shadow-xl border-2 border-white/20 relative overflow-hidden">
                                    {/* Efeitos decorativos */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                                <HiOutlineUserGroup className="text-3xl text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold mb-3">
                                                    Clube de Benefícios & Rede de Vicenters
                                                </h3>
                                                <p className="text-white/90 leading-relaxed mb-4">
                                                    Você vai ter um clube de benefícios para seus clientes, criar uma rede de vicenters e focar em fidelidade, comunidade e tudo único!
                                                </p>
                                            </div>
                                        </div>

                                        {/* Ilustração Visual - Clube de Benefícios */}
                                        <div className="mb-6 p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                            <h4 className="text-sm font-bold text-white mb-4 text-center">Rede de Vicenters em Crescimento</h4>

                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center border border-white/30">
                                                    <div className="text-2xl font-bold text-white mb-1">1.2K</div>
                                                    <div className="text-xs text-white/80">Membros</div>
                                                </div>
                                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center border border-white/30">
                                                    <div className="text-2xl font-bold text-white mb-1">856</div>
                                                    <div className="text-xs text-white/80">Ativos</div>
                                                </div>
                                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center border border-white/30">
                                                    <div className="text-2xl font-bold text-white mb-1">4.5K</div>
                                                    <div className="text-xs text-white/80">Pontos</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-white/90">Nível Bronze</span>
                                                    <span className="text-white font-bold">450 membros</span>
                                                </div>
                                                <div className="w-full bg-white/20 rounded-full h-2">
                                                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '45%' }}></div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-white/90">Nível Prata</span>
                                                    <span className="text-white font-bold">280 membros</span>
                                                </div>
                                                <div className="w-full bg-white/20 rounded-full h-2">
                                                    <div className="bg-gray-300 h-2 rounded-full" style={{ width: '28%' }}></div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-white/90">Nível Ouro</span>
                                                    <span className="text-white font-bold">126 membros</span>
                                                </div>
                                                <div className="w-full bg-white/20 rounded-full h-2">
                                                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <HiOutlineHeart className="text-2xl text-white" />
                                                    <h4 className="text-sm font-semibold text-white">
                                                        Fidelidade
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-white/80 leading-relaxed">
                                                    Programa de pontos e benefícios exclusivos para seus clientes mais fiéis.
                                                </p>
                                            </div>

                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <HiOutlineUserGroup className="text-2xl text-white" />
                                                    <h4 className="text-sm font-semibold text-white">
                                                        Comunidade
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-white/80 leading-relaxed">
                                                    Crie uma rede de vicenters conectados, compartilhando experiências e eventos.
                                                </p>
                                            </div>

                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <HiOutlineStar className="text-2xl text-white" />
                                                    <h4 className="text-sm font-semibold text-white">
                                                        Tudo Único
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-white/80 leading-relaxed">
                                                    Experiência exclusiva e personalizada para cada membro da sua rede.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-white/20">
                                            <p className="text-sm text-white/90 text-center font-semibold">
                                                <span className="inline-block animate-pulse mr-2">💎</span>
                                                Construa uma comunidade única e fidelize seus clientes!
                                                <span className="inline-block animate-pulse ml-2">🎯</span>
                                            </p>
                                        </div>
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
                                <span className="text-6xl md:text-7xl">🚀</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                Pronto para Revolucionar seus Eventos?
                            </h2>
                            <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed">
                                Junte-se a quem já descobriu que{' '}
                                <strong className="text-white">exclusividade e controle total</strong> fazem toda a
                                diferença. É sério, até nossa página 404 é exclusiva!
                                <span className="inline-block ml-2 animate-bounce">😎</span>
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href="https://wa.me/5511982631238?text=Olá! Quero criar minha conta na Vicente! 🚀"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f97316] hover:bg-[#ea6820] text-white visited:text-white hover:text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                Criar Minha Conta Agora
                                <HiOutlineArrowRight className="text-xl" />
                            </a>
                                <a
                                    href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre a plataforma! 💬"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-full transition-all"
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

