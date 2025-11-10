"use client";

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import AuthCard from '@/components/auth/AuthCard';
import InputField from '@/components/forms/InputField';
import Button from '@/components/shared/Button';

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
            // TODO: integrar com backend
            console.log('Enviar link de redefinição para:', email.trim());
            setIsSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main
            className="flex w-full items-center justify-center bg-gradient-to-br from-primary to-primary-dark"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-4 text-white">
                <div className="text-center">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                        Recuperar acesso
                    </span>
                    <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.25em]">
                        Esqueci minha senha
                    </h1>
                </div>

                <AuthCard
                    title="Redefinir senha"
                    description="Informe o e-mail cadastrado. Vamos enviar um link seguro para você escolher uma nova senha."
                >
                    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
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

                        <p className="text-center text-xs text-[#5b5866]">
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
            </div>
        </main>
    );
}

