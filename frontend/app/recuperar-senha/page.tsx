"use client";

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import AuthCard from '@/components/auth/AuthCard';
import InputField from '@/components/forms/InputField';
import Button from '@/components/shared/Button';
import PageContainer from '@/components/shared/PageContainer';
import api from '@/lib/api';
import { useEmailSuggestions } from '@/hooks/useEmailSuggestions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function RecuperarSenhaPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const validateEmail = (value: string) => {
        if (!value.trim()) return 'Informe o e-mail cadastrado.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return 'Informe um e-mail válido.';
        return '';
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
        if (error) {
            const message = validateEmail(event.target.value);
            setError(message);
        }
    };

    const handleBlur = () => {
        const message = validateEmail(email);
        setError(message);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const message = validateEmail(email);
        setError(message);
        if (message) return;

        setIsSubmitting(true);
        setIsSuccess(false);

        try {
            // Chamar endpoint de esqueci minha senha
            await api.post('/auth/forgot-password', {
                email: email.trim(),
            });
            setIsSuccess(true);
        } catch (err: any) {
            // Mesmo em caso de erro, manter mensagem genérica para não expor existência de email
            setIsSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const emailSuggestions = useEmailSuggestions(email);

    if (isSubmitting) {
        return (
            <PageContainer bgColor="bg-[#faf7f0]" paddingBottom="pb-12">
                <LoadingSpinner
                    message="Enviando e-mail..."
                    submessage="Aguarde enquanto processamos sua solicitação"
                    fullscreen={false}
                />
            </PageContainer>
        );
    }

    return (
        <PageContainer bgColor="bg-[#faf7f0]" paddingBottom="pb-12">
            <AuthCard
                title="Redefinir senha"
                description="Vamos enviar um link seguro para você escolher uma nova senha. Ele expira em 30 minutos por segurança."
                className="border-[#ded7ca] bg-white/80"
            >
                <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                    <div className="space-y-1">
                        <InputField
                            label="E-mail"
                            type="email"
                            placeholder="seu@email.com"
                            startIcon={<HiOutlineEnvelope className="h-5 w-5" />}
                            autoComplete="email"
                            value={email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={error}
                        />
                        {emailSuggestions.length > 0 && (
                            <div className="mt-1 overflow-hidden rounded-xl border border-[#e1dbcf] bg-white shadow-sm">
                                {emailSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        className="block w-full px-3 py-2 text-left text-xs text-[#6f6b63] hover:bg-[#f5f1e8]"
                                        onClick={() => {
                                            setEmail(suggestion);
                                            setError('');
                                            setIsSuccess(false);
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {isSuccess ? (
                        <div className="rounded-xl border border-[#c1f1ce] bg-[#e9fbef] p-4 text-xs text-[#256b3f]">
                            <p>
                                Tudo certo! Se o e-mail estiver cadastrado, você receberá um link de redefinição em
                                instantes. Ele expira em 30 minutos por segurança.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[#e1dbcf] bg-white/60 p-4 text-xs text-[#5b5866]">
                            <p>
                                A redefinição expira em 30 minutos por segurança. Se você não receber o e-mail,
                                lembre-se de verificar a pasta de spam ou promoções.
                            </p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60"
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
                    </Button>

                    <p className="text-center text-xs text-[#6f6b63]">
                        Lembrou sua senha?{' '}
                        <Link
                            href="/login"
                            className="font-semibold text-[#f97316] underline-offset-4 hover:underline"
                        >
                            Voltar para o login
                        </Link>
                    </p>
                </form>
            </AuthCard>
        </PageContainer>
    );
}

