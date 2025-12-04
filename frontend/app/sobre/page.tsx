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
} from 'react-icons/hi2';

export default function SobrePage() {
    return (
        <>
            <DynamicMetadata
                title="Sobre a Vicente - Seu Sistema Exclusivo de Gestão de Eventos"
                description="Conheça a Vicente: muito mais do que venda de ingressos! Plataforma completa de gestão de eventos exclusiva onde você está no comando. Sem concorrência, sem filas, sem eventos concorrentes. Dashboard completo, leitor QR code, segurança de ponta, cupons personalizados, SEO otimizado e muito mais."
                url="/sobre"
                type="website"
            />
            <main className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white py-20 md:py-32">
                <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-5"></div>
                <Container>
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        {/* Emoji animado no topo */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="text-8xl md:text-9xl animate-bounce">
                                    🚀
                                </div>
                                <div className="absolute -top-2 -right-2 text-4xl md:text-5xl animate-pulse" style={{ animationDelay: '0.2s' }}>
                                    ✨
                                </div>
                                <div className="absolute -bottom-2 -left-2 text-4xl md:text-5xl animate-pulse" style={{ animationDelay: '0.4s' }}>
                                    🎯
                                </div>
                            </div>
                        </div>
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
                            A <strong className="text-white">Vicente</strong> é muito mais do que uma plataforma de{' '}
                            <span className="line-through opacity-50">venda de ingressos</span> —{' '}
                            <span className="text-[#f97316] font-semibold">ingressos é só o tchan</span>! 
                            <span className="inline-block ml-2 animate-bounce">🎯</span>
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
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f97316] hover:bg-[#ea6820] text-white font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                Começar Agora
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
                    </div>
                </Container>
            </section>

            {/* Exclusividade - Pilar Principal */}
            <section className="py-20 md:py-28 bg-gradient-to-b from-white to-[#faf7f0]">
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
                        <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] rounded-3xl p-8 md:p-10 text-white mb-8 border-2 border-[#f97316]/30 relative overflow-hidden">
                            <div className="absolute top-2 right-2 text-4xl md:text-5xl opacity-20 animate-pulse">💸</div>
                            <div className="absolute bottom-2 left-2 text-4xl md:text-5xl opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}>⚡</div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl md:text-4xl">💰</span>
                                    <h3 className="text-2xl md:text-3xl font-bold">
                                        Split de Pagamento Mercado Pago
                                    </h3>
                                </div>
                                <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-4">
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
                                    Sem Filas. Sem Eventos Concorrentes. Sem Chamados.
                                    <span className="inline-block ml-2 animate-bounce">🚀</span>
                                </h3>
                                <p className="text-lg md:text-xl opacity-90 mb-6">
                                    A experiência que seus clientes merecem: rápida, focada e exclusiva.
                                    <span className="inline-block ml-2 animate-pulse">✨</span>
                                </p>
                                <a
                                    href="https://wa.me/5511982631238?text=Olá! Quero experimentar a Vicente! 🚀"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#f97316] font-semibold rounded-full hover:bg-gray-100 transition-all transform hover:scale-105"
                                >
                                    Experimente Agora
                                    <HiOutlineArrowRight />
                                </a>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Recursos Principais */}
            <section className="py-20 md:py-28 bg-white">
                <Container>
                    <div className="text-center mb-16">
                        <div className="flex justify-center gap-3 mb-4">
                            <span className="text-5xl md:text-6xl animate-bounce">💎</span>
                            <span className="text-5xl md:text-6xl animate-pulse" style={{ animationDelay: '0.2s' }}>⚡</span>
                            <span className="text-5xl md:text-6xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎯</span>
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
                        <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
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
                        <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
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
                        <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
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
                        <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
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
                        <div className="bg-gradient-to-br from-[#faf7f0] to-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
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
                        <div className="bg-gradient-to-br from-[#1a1a1d] to-[#2a2a2d] text-white p-8 md:p-10 rounded-3xl shadow-xl">
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

            {/* Validação QR Code */}
            <section className="py-20 md:py-28 bg-gradient-to-b from-[#faf7f0] to-white">
                <Container>
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#f97316]/10 rounded-full mb-6">
                                <HiOutlineQrCode className="text-4xl text-[#f97316]" />
                            </div>
                            <div className="flex justify-center mb-4">
                                <span className="text-6xl md:text-7xl animate-bounce">📱</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1d] mb-6">
                                Leitor QR Code Completo
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Validação rápida, segura e offline na entrada do seu evento. 
                                <span className="inline-block ml-2 animate-pulse">⚡</span>
                            </p>
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
            <section className="py-20 md:py-28 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/5 via-transparent to-[#f97316]/5"></div>
                <Container>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <div className="flex justify-center gap-3 mb-6">
                            <span className="text-5xl md:text-6xl animate-bounce">🤔</span>
                            <span className="text-5xl md:text-6xl animate-pulse" style={{ animationDelay: '0.2s' }}>💭</span>
                            <span className="text-5xl md:text-6xl animate-bounce" style={{ animationDelay: '0.4s' }}>✨</span>
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

            {/* CTA Final */}
            <section className="py-20 md:py-28 bg-gradient-to-r from-[#1a1a1d] via-[#2a2a2d] to-[#1a1a1d] text-white">
                <Container>
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="flex justify-center gap-3 mb-6">
                            <span className="text-6xl md:text-7xl animate-bounce">🚀</span>
                            <span className="text-6xl md:text-7xl animate-pulse" style={{ animationDelay: '0.2s' }}>💫</span>
                            <span className="text-6xl md:text-7xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎊</span>
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
                                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-[#f97316] hover:bg-[#ea6820] text-white font-bold text-lg rounded-full transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
                            >
                                Criar Minha Conta Agora
                                <HiOutlineArrowRight className="text-2xl" />
                            </a>
                            <a
                                href="https://wa.me/5511982631238?text=Olá Vicente! Quero saber mais sobre a plataforma! 💬"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-bold text-lg rounded-full transition-all"
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

