'use client';

import Container from '@/components/shared/Container';
import { APP_NAME, PRIVACY_EMAIL, DPO_EMAIL, COMPANY_NAME, LGPD_LAW } from '@/lib/config';

export default function PrivacidadePage() {
    return (
        <main
            className="bg-[#faf7f0]"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            <Container className="py-12">
                <header className="mb-10 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        Documentos Legais
                    </span>
                    <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-[#1a1a1d]">
                        Política de Privacidade
                    </h1>
                    <p className="text-sm text-[#6f6b63]">
                        Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </header>

                <div className="space-y-8 rounded-3xl border border-[#ded7ca] bg-white/40 p-8 md:p-12">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            1. Introdução
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            A {COMPANY_NAME} está comprometida em proteger a privacidade e os dados pessoais de nossos usuários, em conformidade
                            com a {LGPD_LAW}. Esta Política de Privacidade descreve como
                            coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossa plataforma
                            de venda de ingressos.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            2. Dados Coletados
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Coletamos os seguintes tipos de dados pessoais:
                            </p>
                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-[#1a1a1d] mb-2">2.1. Dados de Identificação:</h3>
                                    <ul className="ml-6 list-disc space-y-1">
                                        <li>Nome completo</li>
                                        <li>CPF (Cadastro de Pessoa Física)</li>
                                        <li>Data de nascimento (quando necessário)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#1a1a1d] mb-2">2.2. Dados de Contato:</h3>
                                    <ul className="ml-6 list-disc space-y-1">
                                        <li>Endereço de e-mail</li>
                                        <li>Número de telefone</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#1a1a1d] mb-2">2.3. Dados de Pagamento:</h3>
                                    <ul className="ml-6 list-disc space-y-1">
                                        <li>Informações de cartão de crédito/débito (processadas pelo Mercado Pago)</li>
                                        <li>Histórico de transações</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#1a1a1d] mb-2">2.4. Dados de Navegação:</h3>
                                    <ul className="ml-6 list-disc space-y-1">
                                        <li>Endereço IP</li>
                                        <li>Cookies e tecnologias similares</li>
                                        <li>Dados de navegação e interação com a plataforma</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            3. Finalidade do Uso dos Dados
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Utilizamos seus dados pessoais para as seguintes finalidades:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Processamento de Pedidos:</strong> Para processar suas compras de ingressos, confirmar
                                    pagamentos e entregar seus ingressos.
                                </li>
                                <li>
                                    <strong>Comunicação:</strong> Para enviar confirmações de pedidos, atualizações sobre eventos,
                                    informações sobre seus ingressos e comunicações relacionadas ao serviço.
                                </li>
                                <li>
                                    <strong>Validação e Segurança:</strong> Para validar sua identidade, prevenir fraudes e garantir
                                    a segurança de transações.
                                </li>
                                <li>
                                    <strong>Limites de Compra:</strong> Para verificar e aplicar limites de compra por CPF ou e-mail,
                                    conforme estabelecido pelos organizadores dos eventos.
                                </li>
                                <li>
                                    <strong>Melhoria do Serviço:</strong> Para analisar o uso da plataforma, melhorar nossos serviços
                                    e desenvolver novas funcionalidades.
                                </li>
                                <li>
                                    <strong>Cumprimento Legal:</strong> Para cumprir obrigações legais e regulatórias aplicáveis.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            4. Base Legal para Tratamento
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                O tratamento de seus dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Execução de Contrato:</strong> Para cumprir o contrato de compra e venda de ingressos.
                                </li>
                                <li>
                                    <strong>Consentimento:</strong> Quando você fornece consentimento explícito para determinados tratamentos.
                                </li>
                                <li>
                                    <strong>Cumprimento de Obrigação Legal:</strong> Para atender a obrigações legais e regulatórias.
                                </li>
                                <li>
                                    <strong>Legítimo Interesse:</strong> Para melhorar nossos serviços e prevenir fraudes, sempre
                                    respeitando seus direitos e liberdades fundamentais.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            5. Compartilhamento de Dados
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Podemos compartilhar seus dados pessoais nas seguintes situações:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Organizadores de Eventos:</strong> Compartilhamos informações necessárias (nome, CPF, e-mail)
                                    com os organizadores dos eventos para validação de ingressos e gestão do evento.
                                </li>
                                <li>
                                    <strong>Processadores de Pagamento:</strong> Compartilhamos dados de pagamento com o Mercado Pago para
                                    processamento seguro de transações.
                                </li>
                                <li>
                                    <strong>Prestadores de Serviços:</strong> Podemos compartilhar dados com prestadores de serviços que
                                    nos auxiliam na operação da plataforma (hospedagem, e-mail, análise de dados), sempre sob rigorosos
                                    acordos de confidencialidade.
                                </li>
                                <li>
                                    <strong>Autoridades Legais:</strong> Quando exigido por lei, ordem judicial ou autoridade competente.
                                </li>
                            </ul>
                            <p>
                                Não vendemos, alugamos ou comercializamos seus dados pessoais para terceiros para fins de marketing.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            6. Segurança dos Dados
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso
                                não autorizado, alteração, divulgação ou destruição, incluindo:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>Criptografia de dados sensíveis</li>
                                <li>Controles de acesso restritos</li>
                                <li>Monitoramento contínuo de segurança</li>
                                <li>Backups regulares</li>
                                <li>Treinamento de equipe em proteção de dados</li>
                            </ul>
                            <p>
                                Apesar de nossos esforços, nenhum método de transmissão pela internet ou armazenamento eletrônico é 100%
                                seguro. Portanto, não podemos garantir segurança absoluta.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            7. Retenção de Dados
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta política,
                            salvo quando a retenção for exigida ou permitida por lei. Dados de transações financeiras são mantidos conforme
                            exigências legais e regulatórias. Quando os dados não forem mais necessários, serão excluídos ou anonimizados de
                            forma segura.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            8. Seus Direitos (LGPD)
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Conforme a LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Confirmação e Acesso:</strong> Direito de saber se tratamos seus dados e acessar seus dados
                                    pessoais.
                                </li>
                                <li>
                                    <strong>Correção:</strong> Direito de solicitar a correção de dados incompletos, inexatos ou desatualizados.
                                </li>
                                <li>
                                    <strong>Anonimização, Bloqueio ou Eliminação:</strong> Direito de solicitar a anonimização, bloqueio ou
                                    eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.
                                </li>
                                <li>
                                    <strong>Portabilidade:</strong> Direito de solicitar a portabilidade de seus dados para outro fornecedor
                                    de serviço.
                                </li>
                                <li>
                                    <strong>Eliminação:</strong> Direito de solicitar a eliminação de dados tratados com base em consentimento.
                                </li>
                                <li>
                                    <strong>Informação:</strong> Direito de obter informações sobre entidades públicas e privadas com as quais
                                    compartilhamos dados.
                                </li>
                                <li>
                                    <strong>Revogação do Consentimento:</strong> Direito de revogar seu consentimento a qualquer momento.
                                </li>
                            </ul>
                            <p>
                                Para exercer seus direitos, entre em contato conosco através do e-mail:
                                <a href={`mailto:${PRIVACY_EMAIL}`} className="font-medium text-[#f97316] underline-offset-4 hover:underline ml-1">
                                    {PRIVACY_EMAIL}
                                </a>
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            9. Cookies e Tecnologias Similares
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Utilizamos cookies e tecnologias similares para melhorar sua experiência na plataforma, incluindo:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Cookies Essenciais:</strong> Necessários para o funcionamento da plataforma (autenticação,
                                    carrinho de compras).
                                </li>
                                <li>
                                    <strong>Cookies de Análise:</strong> Para entender como você utiliza nossa plataforma e melhorar nossos
                                    serviços.
                                </li>
                                <li>
                                    <strong>Cookies de Preferências:</strong> Para lembrar suas preferências e personalizar sua experiência.
                                </li>
                            </ul>
                            <p>
                                Você pode gerenciar suas preferências de cookies através das configurações do seu navegador. Note que a
                                desativação de cookies essenciais pode afetar o funcionamento da plataforma.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            10. Dados de Menores
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Nossos serviços são destinados a pessoas com 18 anos ou mais. Não coletamos intencionalmente dados pessoais de
                            menores de 18 anos sem o consentimento dos pais ou responsáveis legais. Se tomarmos conhecimento de que coletamos
                            dados de um menor sem o consentimento adequado, tomaremos medidas para excluir essas informações.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            11. Alterações nesta Política
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas práticas ou por
                            motivos legais, operacionais ou regulatórios. Notificaremos você sobre alterações significativas através de e-mail
                            ou aviso em nossa plataforma. A data da última atualização está indicada no topo desta página.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            12. Encarregado de Proteção de Dados (DPO)
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Para questões relacionadas à proteção de dados pessoais, você pode entrar em contato com nosso Encarregado de
                            Proteção de Dados através do e-mail:
                            <a href={`mailto:${DPO_EMAIL}`} className="font-medium text-[#f97316] underline-offset-4 hover:underline ml-1">
                                {DPO_EMAIL}
                            </a>
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            13. Contato
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Para questões relacionadas a esta Política de Privacidade ou ao tratamento de seus dados pessoais, entre em
                            contato conosco através do e-mail:
                            <a href={`mailto:${PRIVACY_EMAIL}`} className="font-medium text-[#f97316] underline-offset-4 hover:underline ml-1">
                                {PRIVACY_EMAIL}
                            </a>
                        </p>
                    </section>
                </div>
            </Container>
        </main>
    );
}

