'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import {
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineIdentification,
    HiOutlineUser,
    HiOutlineLockClosed,
} from 'react-icons/hi2';
import AuthCard from '@/components/auth/AuthCard';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';

type SignupField = 'name' | 'email' | 'password' | 'confirmPassword' | 'phone' | 'cpf';

const validators: Record<SignupField, (value: string, data?: Record<SignupField, string>) => string> = {
    name: (value) => {
        if (!value.trim()) return 'Informe seu nome completo.';
        if (value.trim().length < 3) return 'Nome deve ter ao menos 3 caracteres.';
        return '';
    },
    email: (value) => {
        if (!value.trim()) return 'Informe seu e-mail.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return 'Informe um e-mail válido.';
        return '';
    },
    password: (value) => {
        if (!value.trim()) return 'Crie uma senha.';
        if (value.length < 6) return 'Senha deve ter no mínimo 6 caracteres.';
        if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use letras e números na senha.';
        return '';
    },
    confirmPassword: (value, data) => {
        if (!value.trim()) return 'Confirme sua senha.';
        if (value !== data?.password) return 'As senhas não coincidem.';
        return '';
    },
    phone: (value) => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) return 'Informe um telefone válido.';
        return '';
    },
    cpf: (value) => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 11) return 'CPF deve ter 11 dígitos.';
        return '';
    },
};

export default function CadastroPage() {
    const [formData, setFormData] = useState<Record<SignupField, string>>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        cpf: '',
    });

    const [errors, setErrors] = useState<Record<SignupField, string>>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        cpf: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: SignupField) => (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            const message = validators[field](value, { ...formData, [field]: value });
            setErrors((prev) => ({ ...prev, [field]: message }));
        }
    };

    const handleBlur = (field: SignupField) => () => {
        const message = validators[field](formData[field], formData);
        setErrors((prev) => ({ ...prev, [field]: message }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fieldErrors = {
            name: validators.name(formData.name),
            email: validators.email(formData.email),
            password: validators.password(formData.password),
            confirmPassword: validators.confirmPassword(formData.confirmPassword, formData),
            phone: validators.phone(formData.phone),
            cpf: validators.cpf(formData.cpf),
        };
        setErrors(fieldErrors);

        const hasErrors = Object.values(fieldErrors).some(Boolean);
        if (hasErrors) return;

        setIsSubmitting(true);
        try {
            // TODO: integrar com cadastro no backend
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
                phone: formData.phone.replace(/\D/g, '') || undefined,
                cpf: formData.cpf.replace(/\D/g, '') || undefined,
                role: 'CLIENTE',
            };
            console.log('Enviar cadastro', payload);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main
            className="flex w-full items-center justify-center bg-gradient-to-br from-primary to-primary-dark pt-10 pb-24"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 text-white">
                <div className="text-center">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                        Crie sua conta
                    </span>
                </div>

                <AuthCard
                    title="Nova Conta"
                    description="Para liberar acessos, precisamos de algumas informações básicas. Seus dados são protegidos e usados apenas para sua experiência dentro da 5521."
                    className="max-w-3xl p-10"
                    bodyClassName="space-y-6"
                >
                    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                        <div className="grid gap-5 md:grid-cols-2">
                            <InputField
                                label="Nome completo"
                                placeholder="Seu nome"
                                startIcon={<HiOutlineUser className="h-5 w-5" />}
                                value={formData.name}
                                onChange={handleChange('name')}
                                onBlur={handleBlur('name')}
                                error={errors.name}
                            />

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

                            <InputField
                                label="Telefone"
                                placeholder="(21) 99999-9999"
                                startIcon={<HiOutlinePhone className="h-5 w-5" />}
                                value={formData.phone}
                                onChange={handleChange('phone')}
                                onBlur={handleBlur('phone')}
                                hint="Opcional"
                                error={errors.phone}
                            />

                            <InputField
                                label="CPF"
                                placeholder="000.000.000-00"
                                startIcon={<HiOutlineIdentification className="h-5 w-5" />}
                                value={formData.cpf}
                                onChange={handleChange('cpf')}
                                onBlur={handleBlur('cpf')}
                                hint="Opcional"
                                error={errors.cpf}
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <PasswordField
                                label="Senha"
                                placeholder="Crie uma senha forte"
                                startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange('password')}
                                onBlur={handleBlur('password')}
                                error={errors.password}
                            />

                            <PasswordField
                                label="Confirmar senha"
                                placeholder="Repita sua senha"
                                startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={handleChange('confirmPassword')}
                                onBlur={handleBlur('confirmPassword')}
                                error={errors.confirmPassword}
                            />
                        </div>

                        <div className="rounded-xl border border-[#e1dbcf] bg-white/70 p-4 text-xs text-[#5b5866]">
                            <p className="leading-relaxed">
                                Ao criar a conta você concorda com os termos de uso e políticas de privacidade da 5521. <br />
                                Usamos os dados para personalizar sua experiência, emitir comprovantes fiscais e garantir
                                segurança nos acessos.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60"
                        >
                            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
                        </Button>

                        <p className="text-center text-xs text-[#5b5866]">
                            Já possui uma conta?{' '}
                            <Link href="/login" className="font-semibold text-[#f97316] underline-offset-4 hover:underline">
                                Acessar agora
                            </Link>
                        </p>
                    </form>
                </AuthCard>
            </div>
        </main>
    );
}