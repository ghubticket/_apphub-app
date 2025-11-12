'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/auth/AuthCard';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { sanitizeInput } from '@/utils/sanitize';

type LoginFormFields = 'email' | 'password';

const validators: Record<LoginFormFields, (value: string) => string> = {
    email: (value) => {
        if (!value.trim()) return 'Informe seu e-mail.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return 'Informe um e-mail válido.';
        return '';
    },
    password: (value) => {
        if (!value.trim()) return 'Informe sua senha.';
        if (value.trim().length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
        return '';
    },
};

export default function LoginPage() {
    const router = useRouter();
    const { login: authLogin, isAuthenticated, isReady } = useAuth();
    useEffect(() => {
        if (isReady && isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isReady, isAuthenticated, router]);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: true,
    });

    const [errors, setErrors] = useState<Record<LoginFormFields, string>>({
        email: '',
        password: '',
    });
    const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: LoginFormFields) => (event: ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value;
        const value = field === 'email' ? sanitizeInput(rawValue) : rawValue;
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formMessage) setFormMessage(null);
    };

    const handleRememberToggle = (event: ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, remember: event.target.checked }));
    };

    const validateField = (field: LoginFormFields, value: string) => {
        const message = validators[field](value);
        setErrors((prev) => ({ ...prev, [field]: message }));
        return message;
    };

    const handleBlur = (field: LoginFormFields) => () => {
        validateField(field, formData[field]);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fieldErrors = {
            email: validators.email(formData.email),
            password: validators.password(formData.password),
        };
        setErrors(fieldErrors);

        const hasErrors = Object.values(fieldErrors).some(Boolean);
        if (hasErrors) return;

        setIsSubmitting(true);
        setFormMessage(null);

        try {
            const payload = {
                email: formData.email.trim(),
                password: formData.password,
            };

            const response = await api.post('/auth/login', payload);
            const { accessToken, refreshToken, user, sessionId } = response.data?.data ?? {};
            if (!accessToken || !refreshToken) {
                throw new Error('Tokens não recebidos do servidor.');
            }

            authLogin(
                {
                    user,
                    accessToken,
                    refreshToken,
                    sessionId,
                },
                formData.remember
            );

            setFormMessage({
                type: 'success',
                text: 'Login realizado com sucesso. Redirecionando...',
            });

            setTimeout(() => {
                router.replace('/');
            }, 600);
        } catch (error: any) {
            const status = error?.response?.status;
            const messageResponse = error?.response?.data?.message;
            const apiErrors: string[] | undefined = error?.response?.data?.errors;

            if (status === 401 || status === 403) {
                const invalidMessage = 'E-mail ou senha incorretos.';
                setErrors((prev) => ({
                    ...prev,
                    email: invalidMessage,
                    password: invalidMessage,
                }));
                setFormMessage({
                    type: 'error',
                    text: invalidMessage,
                });
            } else if (status === 429) {
                setFormMessage({
                    type: 'error',
                    text: messageResponse || 'Muitas tentativas. Tente novamente em instantes.',
                });
            } else {
                setFormMessage({
                    type: 'error',
                    text:
                        messageResponse ||
                        apiErrors?.[0] ||
                        (error instanceof Error ? error.message : '') ||
                        'Não foi possível realizar o login. Tente novamente.',
                });
            }
            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.error('Erro no login', error?.response || error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main
            className="flex w-full items-center justify-center bg-slate-200"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 text-[#1a1a1d]">
                <div className="text-center text-black">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em]">
                        Olá, seja bem-vindo de volta.
                    </span>
                    <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.25em]">
                        Bem-vindo à 5521
                    </h1>
                </div>

                <AuthCard title="Entrar" description="Use seus dados de acesso para continuar.">
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        <InputField
                            label="E-mail"
                            type="email"
                            placeholder="seu@email.com"
                            startIcon={<HiOutlineEnvelope className="h-5 w-5" />}
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange('email')}
                            onBlur={handleBlur('email')}
                            error={errors.email}
                        />

                        <PasswordField
                            label="Senha"
                            placeholder="Digite sua senha"
                            startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange('password')}
                            onBlur={handleBlur('password')}
                            error={errors.password}
                        />

                        <div className="flex items-center justify-between text-xs text-[#5b5866]">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border border-[#cfc9bd] text-[#f97316] focus:ring-[#f97316]/40"
                                    checked={formData.remember}
                                    onChange={handleRememberToggle}
                                />
                                Lembrar-me
                            </label>
                            <Link
                                href="/recuperar-senha"
                                className="font-semibold text-[#f97316] underline-offset-4 hover:underline"
                            >
                                Esqueci minha senha
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60"
                        >
                            {isSubmitting ? 'Entrando...' : 'Entrar'}
                        </Button>

                        {formMessage && (
                            <div
                                className={`rounded-xl border ${
                                    formMessage.type === 'error'
                                        ? 'border-[#f2c4c4] bg-[#fbecec] text-[#a22d2d]'
                                        : 'border-[#c1f1ce] bg-[#e9fbef] text-[#256b3f]'
                                } p-4 text-sm text-center`}
                            >
                                {formMessage.text}
                            </div>
                        )}

                        <p className="text-center text-xs text-[#5b5866]">
                            Ainda não tem uma conta?{' '}
                            <Link href="/cadastro" className="font-semibold text-[#f97316] underline-offset-4 hover:underline">
                                Criar conta
                            </Link>
                        </p>
                    </form>
                </AuthCard>
            </div>
        </main>
    );
}