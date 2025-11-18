'use client';

import Container from '@/components/shared/Container';

export default function TermosPage() {
    return (
        <main
            className="bg-[#faf7f0]"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}>
            <Container className="py-12">

                <header className="mb-10 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a38f78]">
                        Documentos Legais
                    </span>
                    <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-[#1a1a1d]">
                        Termos de Uso
                    </h1>
                    <p className="text-sm text-[#6f6b63]">
                        Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </header>

                <div className="space-y-8 rounded-3xl border border-[#ded7ca] bg-white/40 p-8 md:p-12">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            1. Aceitação dos Termos
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Ao acessar e utilizar a plataforma 5521, você concorda em cumprir e estar vinculado a estes Termos de Uso.
                            Se você não concorda com qualquer parte destes termos, não deve utilizar nossos serviços. A 5521 reserva-se
                            o direito de modificar estes termos a qualquer momento, e tais modificações entrarão em vigor imediatamente
                            após sua publicação.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            2. Descrição do Serviço
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            A 5521 é uma plataforma digital que oferece serviços de venda de ingressos para eventos, experiências e
                            atividades diversas. Através de nossa plataforma, você pode visualizar eventos disponíveis, adquirir ingressos,
                            gerenciar seus pedidos e acessar informações sobre seus ingressos adquiridos.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            3. Cadastro e Conta do Usuário
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Para realizar compras em nossa plataforma, você precisará criar uma conta fornecendo informações precisas,
                                completas e atualizadas, incluindo:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>Nome completo</li>
                                <li>E-mail válido</li>
                                <li>CPF (Cadastro de Pessoa Física)</li>
                                <li>Telefone de contato</li>
                                <li>Senha segura</li>
                            </ul>
                            <p>
                                Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades
                                que ocorram em sua conta. A 5521 não se responsabiliza por perdas ou danos decorrentes do uso não autorizado
                                de sua conta.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            4. Compra de Ingressos
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Ao adquirir ingressos através da plataforma 5521, você concorda com as seguintes condições:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Preços e Taxas:</strong> Os preços dos ingressos incluem taxas de serviço e processamento quando
                                    aplicáveis. Todos os valores são exibidos em Reais (R$) e incluem impostos quando cabíveis.
                                </li>
                                <li>
                                    <strong>Disponibilidade:</strong> A disponibilidade de ingressos está sujeita a confirmação. A 5521 não
                                    garante a disponibilidade de ingressos até a confirmação do pagamento.
                                </li>
                                <li>
                                    <strong>Limites de Compra:</strong> Podem ser aplicados limites de quantidade por CPF, por evento ou por
                                    tipo de ingresso. Tais limites são definidos pelo organizador do evento e serão informados durante o
                                    processo de compra.
                                </li>
                                <li>
                                    <strong>Ingressos VIP:</strong> Ingressos VIP podem ter condições especiais, incluindo limite por CPF,
                                    necessidade de autenticação e outras restrições específicas.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            5. Pagamento
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                A 5521 aceita os seguintes métodos de pagamento:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>Cartão de Crédito</li>
                                <li>Cartão de Débito</li>
                                <li>PIX</li>
                                <li>Boleto Bancário</li>
                            </ul>
                            <p>
                                Os pagamentos são processados de forma segura através do Mercado Pago. A confirmação do pagamento pode levar
                                alguns minutos, dependendo do método escolhido. Em caso de pagamento via PIX ou boleto, o ingresso será
                                confirmado após a confirmação do pagamento pelo banco.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            6. Cancelamento e Reembolso
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                As políticas de cancelamento e reembolso variam conforme o evento e são definidas pelo organizador.
                                Regras gerais:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>
                                    <strong>Cancelamento pelo Organizador:</strong> Se um evento for cancelado pelo organizador, você terá
                                    direito ao reembolso integral do valor pago, conforme as condições estabelecidas.
                                </li>
                                <li>
                                    <strong>Cancelamento pelo Cliente:</strong> O cancelamento de ingressos pelo cliente está sujeito às
                                    políticas específicas de cada evento, que serão informadas no momento da compra.
                                </li>
                                <li>
                                    <strong>Reembolso:</strong> Os reembolsos serão processados no mesmo método de pagamento utilizado na
                                    compra, podendo levar até 10 dias úteis para serem creditados.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            7. Uso dos Ingressos
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                Ao adquirir ingressos, você concorda em:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>Utilizar os ingressos apenas para o evento especificado</li>
                                <li>Não revender, reproduzir ou falsificar ingressos</li>
                                <li>Apresentar identificação válida quando solicitado no evento</li>
                                <li>Respeitar as regras e regulamentos do local do evento</li>
                                <li>Não utilizar os ingressos para fins comerciais não autorizados</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            8. Códigos Promocionais e Descontos
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Códigos promocionais e descontos oferecidos pela 5521 ou por parceiros estão sujeitos a termos e condições
                            específicos. Cada código pode ter restrições de uso, validade e aplicabilidade. A 5521 reserva-se o direito de
                            cancelar ou modificar códigos promocionais a qualquer momento, sem aviso prévio.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            9. Propriedade Intelectual
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Todo o conteúdo da plataforma 5521, incluindo textos, gráficos, logotipos, ícones, imagens, clipes de áudio,
                            downloads digitais e compilações de dados, é propriedade da 5521 ou de seus fornecedores de conteúdo e está
                            protegido por leis de direitos autorais brasileiras e internacionais. Você não pode reproduzir, distribuir,
                            modificar ou criar trabalhos derivados sem autorização prévia por escrito.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            10. Limitação de Responsabilidade
                        </h2>
                        <div className="space-y-3 text-sm leading-relaxed text-[#4c4c55]">
                            <p>
                                A 5521 atua como intermediária na venda de ingressos. Nossa responsabilidade limita-se a:
                            </p>
                            <ul className="ml-6 list-disc space-y-2">
                                <li>Processar pagamentos de forma segura</li>
                                <li>Fornecer ingressos válidos conforme adquiridos</li>
                                <li>Manter a segurança e privacidade dos dados do cliente</li>
                            </ul>
                            <p>
                                A 5521 não se responsabiliza por cancelamentos, alterações ou problemas relacionados ao evento em si,
                                incluindo mas não limitado a: mudanças de data, local, cancelamento do evento, qualidade do evento ou
                                comportamento de outros participantes.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            11. Modificações do Serviço
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            A 5521 reserva-se o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer
                            momento, com ou sem aviso prévio. Não seremos responsáveis perante você ou qualquer terceiro por qualquer
                            modificação, suspensão ou descontinuação do serviço.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            12. Lei Aplicável e Foro
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada a
                            estes termos será resolvida no foro da comarca de São Paulo, Estado de São Paulo, renunciando as partes a
                            qualquer outro, por mais privilegiado que seja.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#1a1a1d]">
                            13. Contato
                        </h2>
                        <p className="text-sm leading-relaxed text-[#4c4c55]">
                            Para questões relacionadas a estes Termos de Uso, entre em contato conosco através do e-mail:
                            <a href="mailto:contato@5521.com.br" className="font-medium text-[#f97316] underline-offset-4 hover:underline ml-1">
                                contato@5521.com.br
                            </a>
                        </p>
                    </section>
                </div>
            </Container>
        </main>
    );
}

