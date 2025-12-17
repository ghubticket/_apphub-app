'use client';

import React, { useState } from 'react';
import { HiQuestionMarkCircle, HiClock, HiMail, HiOutlineChevronDown } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { APP_CONFIG } from '@/lib/config';
import api from '@/lib/api';

interface RequestsSectionProps {
    userName?: string;
    userEmail?: string;
}

export default function RequestsSection({ userName, userEmail }: RequestsSectionProps) {
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        category: 'general',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleWhatsAppClick = (phone: string, name: string) => {
        const message = `Olá! Preciso de ajuda com minha conta. Meu nome é: ${userName || 'Usuário'}\nEmail: ${userEmail || 'Não informado'}`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitMessage(null);
        setFieldErrors({});

        try {
            const response = await api.post('/support/request', {
                category: formData.category,
                subject: formData.subject.trim(),
                message: formData.message.trim(),
            });

            if (response.data.success) {
                setSubmitMessage({
                    type: 'success',
                    text:
                        response.data.message ||
                        'Solicitação enviada com sucesso! Nossa equipe entrará em contato em breve.',
                });
                setFormData({ subject: '', message: '', category: 'general' });
                setFieldErrors({});
            } else {
                throw new Error(response.data.message || 'Erro ao enviar solicitação');
            }
        } catch (error: any) {
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const errors: Record<string, string> = {};
                error.response.data.errors.forEach((err: any) => {
                    if (err.field && err.message) {
                        errors[err.field] = err.message;
                    }
                });
                setFieldErrors(errors);
            }

            const errorMessage =
                error.response?.data?.message ||
                (error.response?.data?.errors && error.response.data.errors.length > 0
                    ? 'Por favor, corrija os erros abaixo'
                    : null) ||
                error.message ||
                'Erro ao enviar solicitação. Tente novamente ou entre em contato pelo WhatsApp.';

            if (errorMessage) {
                setSubmitMessage({
                    type: 'error',
                    text: errorMessage,
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
        if (fieldErrors[field]) {
            setFieldErrors({ ...fieldErrors, [field]: '' });
        }
    };

    const faqItems = [
        {
            question: 'Como faço para baixar meus ingressos?',
            answer: 'Acesse a aba "Meus Pedidos" e clique no pedido desejado. Os ingressos estarão disponíveis para download após a confirmação do pagamento.',
        },
        {
            question: 'E se eu não receber o email com os ingressos?',
            answer: 'Verifique sua caixa de spam. Se ainda não encontrar, entre em contato conosco pelo WhatsApp ou use o formulário acima.',
        },
        {
            question: 'Como cancelo um pedido?',
            answer: 'Pedidos pendentes de pagamento podem ser cancelados na página do pedido. Pedidos já pagos devem ser cancelados através do suporte.',
        },
        {
            question: 'Posso transferir meus ingressos?',
            answer: 'Sim! Entre em contato com nosso suporte para realizar a transferência. Algumas condições podem se aplicar.',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Canais de Atendimento - WhatsApp */}
            <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-6">
                <h2 className="mb-4 text-xl font-bold text-[#1a1a1d]">Canais de Atendimento</h2>
                <p className="mb-6 text-sm text-[#6a6760]">
                    Escolha o melhor canal para falar conosco. Nossa equipe está pronta para ajudar!
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                    {APP_CONFIG.contact.whatsapp?.map((contact, index) => (
                        <button
                            key={index}
                            onClick={() => handleWhatsAppClick(contact.phone, contact.name)}
                            className="group flex items-center gap-4 rounded-xl border border-[#ded7ca] bg-white p-5 text-left transition hover:border-[#f97316] hover:shadow-lg"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white transition group-hover:scale-110">
                                <FaWhatsapp className="text-2xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-[#1a1a1d]">{contact.name}</h3>
                                <p className="text-sm text-[#6a6760]">{contact.role}</p>
                            </div>
                            <HiOutlineChevronDown className="h-5 w-5 rotate-[-90deg] text-[#a38f78] transition group-hover:text-[#f97316]" />
                        </button>
                    ))}
                </div>

                {/* Horários de Atendimento */}
                <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#faf7f0] p-4">
                    <HiClock className="mt-0.5 h-5 w-5 text-[#f97316]" />
                    <div>
                        <h3 className="font-semibold text-[#1a1a1d]">Horários de Atendimento</h3>
                        <p className="mt-1 text-sm text-[#6a6760]">
                            {APP_CONFIG.contact.supportHours?.weekdays}
                        </p>
                        <p className="text-sm text-[#6a6760]">
                            {APP_CONFIG.contact.supportHours?.weekends}
                        </p>
                    </div>
                </div>
            </div>

            {/* Formulário de Solicitação */}
            <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-6">
                <div className="mb-6 flex items-center gap-3">
                    <HiMail className="h-6 w-6 text-[#f97316]" />
                    <h2 className="text-xl font-bold text-[#1a1a1d]">Enviar Solicitação</h2>
                </div>
                <p className="mb-6 text-sm text-[#6a6760]">
                    Preencha o formulário abaixo e nossa equipe entrará em contato o mais breve
                    possível.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="category"
                            className="mb-2 block text-sm font-semibold text-[#1a1a1d]"
                        >
                            Categoria
                        </label>
                        <select
                            id="category"
                            value={formData.category}
                            onChange={(e) => handleFieldChange('category', e.target.value)}
                            className={`w-full rounded-xl border bg-white px-4 py-3 text-[#1a1a1d] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 ${
                                fieldErrors.category
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-[#ded7ca] focus:border-[#f97316]'
                            }`}
                            required
                        >
                            <option value="general">Geral</option>
                            <option value="payment">Pagamento</option>
                            <option value="tickets">Ingressos</option>
                            <option value="account">Conta</option>
                            <option value="technical">Problema Técnico</option>
                            <option value="refund">Reembolso</option>
                        </select>
                        {fieldErrors.category && (
                            <p className="mt-1 text-sm text-rose-600">{fieldErrors.category}</p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="subject"
                            className="mb-2 block text-sm font-semibold text-[#1a1a1d]"
                        >
                            Assunto
                        </label>
                        <input
                            type="text"
                            id="subject"
                            value={formData.subject}
                            onChange={(e) => handleFieldChange('subject', e.target.value)}
                            placeholder="Ex: Problema com download dos ingressos"
                            className={`w-full rounded-xl border bg-white px-4 py-3 text-[#1a1a1d] placeholder:text-[#a38f78] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 ${
                                fieldErrors.subject
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-[#ded7ca] focus:border-[#f97316]'
                            }`}
                            required
                        />
                        {fieldErrors.subject && (
                            <p className="mt-1 text-sm text-rose-600">{fieldErrors.subject}</p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="message"
                            className="mb-2 block text-sm font-semibold text-[#1a1a1d]"
                        >
                            Mensagem
                        </label>
                        <textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => handleFieldChange('message', e.target.value)}
                            placeholder="Descreva sua solicitação ou problema em detalhes..."
                            rows={6}
                            className={`w-full rounded-xl border bg-white px-4 py-3 text-[#1a1a1d] placeholder:text-[#a38f78] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 ${
                                fieldErrors.message
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-[#ded7ca] focus:border-[#f97316]'
                            }`}
                            required
                        />
                        {fieldErrors.message && (
                            <p className="mt-1 text-sm text-rose-600">{fieldErrors.message}</p>
                        )}
                    </div>

                    {submitMessage && (
                        <div
                            className={`rounded-xl p-4 ${
                                submitMessage.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                            }`}
                        >
                            {submitMessage.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-[#1a1a1d] px-6 py-3 text-sm font-semibold uppercase text-white transition hover:bg-[#f97316] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                    </button>
                </form>
            </div>

            {/* FAQ */}
            <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-6">
                <div className="mb-6 flex items-center gap-3">
                    <HiQuestionMarkCircle className="h-6 w-6 text-[#f97316]" />
                    <h2 className="text-xl font-bold text-[#1a1a1d]">Perguntas Frequentes</h2>
                </div>

                <div className="space-y-3">
                    {faqItems.map((faq, index) => (
                        <div
                            key={index}
                            className="rounded-xl border border-[#ded7ca] bg-white transition hover:shadow-md"
                        >
                            <button
                                type="button"
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                className="flex w-full items-center justify-between p-4 text-left"
                            >
                                <span className="font-semibold text-[#1a1a1d]">{faq.question}</span>
                                <HiOutlineChevronDown
                                    className={`h-5 w-5 text-[#a38f78] transition ${
                                        expandedFaq === index ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            {expandedFaq === index && (
                                <div className="border-t border-[#ded7ca] p-4 text-sm text-[#6a6760]">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Informações Adicionais */}
            <div className="rounded-2xl border border-[#ded7ca] bg-white/70 p-6">
                <h3 className="mb-4 font-semibold text-[#1a1a1d]">Outros Canais</h3>
                <div className="space-y-3">
                    <a
                        href={`mailto:${APP_CONFIG.contact.supportEmail}`}
                        className="flex items-center gap-3 text-[#6a6760] transition hover:text-[#f97316]"
                    >
                        <HiMail className="h-5 w-5" />
                        <span className="text-sm">{APP_CONFIG.contact.supportEmail}</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
