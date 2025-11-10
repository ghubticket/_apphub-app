'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import AuthCard from '@/components/auth/AuthCard';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';

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
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false,
    });

    const [errors, setErrors] = useState<Record<LoginFormFields, string>>({
        email: '',
        password: '',
    });

    const handleChange = (field: LoginFormFields) => (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
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

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fieldErrors = {
            email: validators.email(formData.email),
            password: validators.password(formData.password),
        };
        setErrors(fieldErrors);

        const hasErrors = Object.values(fieldErrors).some(Boolean);
        if (hasErrors) return;

        // TODO: integrar com backend
        console.log('Formulário válido. Enviar dados:', formData);
    };

    return (
        <main
            className="flex w-full items-center justify-center bg-slate-200"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 text-[#1a1a1d]">
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
                            className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d]"
                        >
                            Entrar
                        </Button>

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